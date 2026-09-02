import {ENV} from './env.js';
import {
    cleanExpiredChatMemories,
    cleanExpiredCommandResourceReservations,
    clearGroupExpiration,
    claimPendingReports,
    listExpiredGroups,
    markReportDelivered,
    markReportFailed,
    claimDailyGroupReminders,
    markDailyGroupReminderFailed,
    markDailyGroupReminderSent,
    renewStoreSubscriptions,
    updateBankLoanStatuses,
    billDueRoleplayContracts,
    cleanExpiredRoleplayActions,
} from '../services/runtime-tasks.service.js';
import {logDebug, logError, logInfo} from '../lib/logger.js';
import {pickRandom} from '../utils/random.js';
import {getMainConnection, getSubbotConnections} from './runtime-state.js';
import {hostname} from 'node:os';
import {getApplicationShutdownSignal} from './application-lifecycle.js';
import {getBogotaReminderWindow} from '../domain/daily-reminders.js';
import {getBotInstanceIdentity} from './bot-instance-identity.js';
import {renderMessage} from '../services/content.service.js';
import {createDailyReminderContent} from '../services/daily-reminder.service.js';

let started = false;
const timers = new Set<NodeJS.Timeout>();
const activeRuns = new Set<Promise<void>>();
const reportWorkerId = `${hostname()}:${process.pid}:reports`;

const delay = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const timer = setTimeout(() => {
        signal.removeEventListener('abort', abort);
        resolve();
    }, ms);
    const abort = () => {
        clearTimeout(timer);
        signal.removeEventListener('abort', abort);
        reject(signal.reason);
    };
    signal.addEventListener('abort', abort, {once: true});
});

export function startScheduledTasks(): void {
    if (started) return;
    started = true;

    scheduleNonOverlapping('expired-groups', 60_000, handleExpiredGroups);
    scheduleNonOverlapping('pending-reports', 120_000, forwardPendingReports);
    scheduleNonOverlapping('chat-memory', 300_000, cleanExpiredChatMemory);
    scheduleNonOverlapping('resource-reservations', 300_000, cleanExpiredResourceReservations);
    scheduleNonOverlapping('loan-status', 300_000, refreshLoans);
    scheduleNonOverlapping('store-subscriptions', 300_000, renewSubscriptions);
    scheduleNonOverlapping('roleplay-billing', 60_000, billRoleplayContracts);
    scheduleNonOverlapping('roleplay-actions', 300_000, cleanRoleplayActions);
    scheduleNonOverlapping('daily-group-reminders', 60_000, sendDailyGroupReminders);
}

async function billRoleplayContracts(): Promise<void> {
    const events = await billDueRoleplayContracts();
    if (!events.length) return;
    const connections = [getMainConnection(), ...getSubbotConnections()].filter(connection => Boolean(connection));
    for (const event of events) {
        const buyerTag = `@${event.buyerId.split('@')[0]}`;
        const beneficiaryTag = `@${event.beneficiaryId.split('@')[0]}`;
        const key = event.kind === 'charged'
            ? 'roleplay.billingCharged'
            : event.kind === 'released'
                ? 'roleplay.billingReleased'
            : event.kind === 'completed'
                ? 'roleplay.billingCompleted'
                : 'roleplay.billingInsufficient';
        const text = renderMessage(key, {
            buyer: buyerTag,
            beneficiary: beneficiaryTag,
            price: event.hourlyPriceCoins,
            hours: event.releasedHours,
        });
        for (const conn of connections) {
            if (!conn) continue;
            try {
                await conn.sendMessage(event.groupId, {
                    text,
                    mentions: [event.buyerId, event.beneficiaryId],
                });
                break;
            } catch (error) {
                logDebug(`[ROLEPLAY] La conexión no pudo notificar ${event.contractId}: ${String(error)}`);
            }
        }
    }
}

async function cleanRoleplayActions(): Promise<void> {
    const deleted = await cleanExpiredRoleplayActions();
    if (deleted) logDebug(`[ROLEPLAY] Mensajes de acción vencidos eliminados: ${deleted}`);
}

async function renewSubscriptions(): Promise<void> {
    const result = await renewStoreSubscriptions();
    if (result.paid || result.deactivated) {
        logInfo(`[STORE] Renovaciones: ${result.paid} pagadas, ${result.deactivated} desactivadas.`);
    }
}

async function sendDailyGroupReminders(): Promise<void> {
    const window = getBogotaReminderWindow(new Date());
    if (!window.shouldRun) return;
    const connections = [getMainConnection(), ...getSubbotConnections()].filter(connection => Boolean(connection));
    for (const conn of connections) {
        if (!conn || getApplicationShutdownSignal().aborted) return;
        const identity = getBotInstanceIdentity(conn);
        if (!identity?.botJid) continue;
        const groups = await claimDailyGroupReminders(identity.instanceId, window.activityDay);
        for (const groupId of groups) {
            try {
                const metadata = await conn.groupMetadata(groupId);
                const sent = await conn.sendMessage(groupId, createDailyReminderContent(metadata.subject));
                await markDailyGroupReminderSent(groupId, window.activityDay, sent?.key?.id ?? null);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                await markDailyGroupReminderFailed(groupId, window.activityDay, message);
                logError(`[REMINDER] Falló el recordatorio de ${groupId}:`, error);
            }
        }
    }
}

export function stopScheduledTasks(): void {
    for (const timer of timers) clearInterval(timer);
    timers.clear();
    started = false;
}

export async function drainScheduledTasks(timeoutMs = 10_000): Promise<boolean> {
    const snapshot = [...activeRuns];
    if (!snapshot.length) return true;
    let timeout: NodeJS.Timeout | undefined;
    const completed = await Promise.race([
        Promise.allSettled(snapshot).then(() => true),
        new Promise<boolean>(resolve => { timeout = setTimeout(() => resolve(false), timeoutMs); }),
    ]);
    if (timeout) clearTimeout(timeout);
    return completed;
}

function scheduleNonOverlapping(name: string, intervalMs: number, task: () => Promise<void>): void {
    let running = false;
    const timer = setInterval(() => {
        if (running) {
            logDebug(`[SCHEDULER] Se omitió ${name}: la ejecución anterior sigue activa.`);
            return;
        }
        running = true;
        const run = task().catch(error => logError(`[SCHEDULER] Error en ${name}:`, error)).finally(() => {
            running = false;
            activeRuns.delete(run);
        });
        activeRuns.add(run);
    }, intervalMs);
    timer.unref?.();
    timers.add(timer);
}

async function refreshLoans(): Promise<void> {
    try {
        const updated = await updateBankLoanStatuses();
        if (updated) logInfo(`[BANK] Préstamos actualizados por vencimiento: ${updated}`);
    } catch (err) {
        logError('[BANK] Error actualizando préstamos:', err);
    }
}

async function cleanExpiredResourceReservations(): Promise<void> {
    try {
        const released = await cleanExpiredCommandResourceReservations();
        if (released) logInfo(`[RESOURCES] Reservas vencidas liberadas: ${released}`);
    } catch (err) {
        logError('[RESOURCES] Error liberando reservas vencidas:', err);
    }
}

async function handleExpiredGroups(): Promise<void> {
    try {
        const signal = getApplicationShutdownSignal();
        const conn = getMainConnection();
        if (!conn || typeof conn.groupLeave !== 'function') return;

        const rows = await listExpiredGroups(Date.now());

        for (const {group_id} of rows) {
            if (signal.aborted) return;
            try {
                await conn.sendMessage(group_id, {
                    text: pickRandom([
                        `*${conn.user?.name}*, me voy del grupo. Fue un gusto estar aqui.`,
                        'El tiempo configurado para este grupo finalizo. Me retiro.',
                        `*${conn.user?.name}*, saliendo automaticamente por expiracion del grupo.`
                    ])
                });
                await delay(3000, signal);
                await conn.groupLeave(group_id);
                await clearGroupExpiration(group_id);
                logInfo(`[AUTO-LEAVE] Bot salio automaticamente del grupo: ${group_id}`);
            } catch (err) {
                logError('[AUTO-LEAVE] Error procesando grupo expirado:', err);
            }
        }
    } catch (err) {
        logError('[AUTO-LEAVE] Error general:', err);
    }
}

async function forwardPendingReports(): Promise<void> {
    const modGroupId = ENV.BOT_MOD_GROUP_ID;
    if (!modGroupId) return;

    try {
        const conn = getMainConnection();
        if (!conn || typeof conn.sendMessage !== 'function') return;

        try {
            await conn.groupMetadata(modGroupId);
        } catch {
            return;
        }

        const rows = await claimPendingReports(10, reportWorkerId, 120);
        if (!rows.length) return;

        for (const row of rows) {
            if (getApplicationShutdownSignal().aborted) return;
            try {
                const header = row.tipo === 'sugerencia' ? '*SUGERENCIA*' : '*REPORTE*';
                const label = row.tipo === 'sugerencia' ? '*Sugerencia:*' : '*Mensaje:*';
                const txt = `${header}\n\n*Usuario:* wa.me/${row.sender_id.split('@')[0]}\n${label} ${row.mensaje}`;
                const sent = await conn.sendMessage(modGroupId, {text: txt});
                await markReportDelivered(row.id, reportWorkerId, sent?.key?.id ?? null);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                await markReportFailed(row.id, reportWorkerId, message);
                logError(`[REPORT] Falló entrega ${row.id}, intento ${row.attempt_count ?? 1}:`, error);
            }
        }
    } catch (err) {
        logError('[REPORT/SUGGE SYSTEM ERROR]', err);
    }
}

async function cleanExpiredChatMemory(): Promise<void> {
    try {
        const deleted = await cleanExpiredChatMemories();
        for (const chatId of deleted) {
            logDebug(`[MEMORY] Memoria del grupo ${chatId} eliminada automaticamente`);
        }
    } catch (err) {
        logError('Error limpiando memorias expiradas:', err);
    }
}
