import {ENV} from './env.js';
import {
    cleanExpiredChatMemories,
    cleanExpiredCommandResourceReservations,
    clearGroupExpiration,
    claimPendingReports,
    listExpiredGroups,
    markReportDelivered,
    markReportFailed,
    updateBankLoanStatuses,
} from '../services/runtime-tasks.service.js';
import {logDebug, logError, logInfo} from '../lib/logger.js';
import {pickRandom} from '../utils/random.js';
import {getMainConnection} from './runtime-state.js';
import {hostname} from 'node:os';

let started = false;
const timers = new Set<NodeJS.Timeout>();
const reportWorkerId = `${hostname()}:${process.pid}:reports`;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function startScheduledTasks(): void {
    if (started) return;
    started = true;

    scheduleNonOverlapping('expired-groups', 60_000, handleExpiredGroups);
    scheduleNonOverlapping('pending-reports', 120_000, forwardPendingReports);
    scheduleNonOverlapping('chat-memory', 300_000, cleanExpiredChatMemory);
    scheduleNonOverlapping('resource-reservations', 300_000, cleanExpiredResourceReservations);
    scheduleNonOverlapping('loan-status', 300_000, refreshLoans);
}

export function stopScheduledTasks(): void {
    for (const timer of timers) clearInterval(timer);
    timers.clear();
    started = false;
}

function scheduleNonOverlapping(name: string, intervalMs: number, task: () => Promise<void>): void {
    let running = false;
    const timer = setInterval(() => {
        if (running) {
            logDebug(`[SCHEDULER] Se omitió ${name}: la ejecución anterior sigue activa.`);
            return;
        }
        running = true;
        void task().catch(error => logError(`[SCHEDULER] Error en ${name}:`, error)).finally(() => {
            running = false;
        });
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
        const conn = getMainConnection();
        if (!conn || typeof conn.groupLeave !== 'function') return;

        const rows = await listExpiredGroups(Date.now());

        for (const {group_id} of rows) {
            try {
                await conn.sendMessage(group_id, {
                    text: pickRandom([
                        `*${conn.user?.name}*, me voy del grupo. Fue un gusto estar aqui.`,
                        'El tiempo configurado para este grupo finalizo. Me retiro.',
                        `*${conn.user?.name}*, saliendo automaticamente por expiracion del grupo.`
                    ])
                });
                await delay(3000);
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
