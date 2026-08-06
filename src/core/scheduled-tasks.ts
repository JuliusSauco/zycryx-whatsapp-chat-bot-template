import {ENV} from './env.js';
import {
    cleanExpiredChatMemories,
    cleanExpiredCommandResourceReservations,
    clearGroupExpiration,
    deleteReport,
    listExpiredGroups,
    listPendingReports,
    updateBankLoanStatuses,
} from '../services/runtime-tasks.service.js';
import {logDebug, logError, logInfo} from '../lib/logger.js';
import {pickRandom} from '../utils/random.js';
import {getMainConnection} from './runtime-state.js';

let started = false;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function startScheduledTasks(): void {
    if (started) return;
    started = true;

    setInterval(handleExpiredGroups, 60_000).unref?.();
    setInterval(forwardPendingReports, 120_000).unref?.();
    setInterval(cleanExpiredChatMemory, 300_000).unref?.();
    setInterval(cleanExpiredResourceReservations, 300_000).unref?.();
    setInterval(refreshLoans, 300_000).unref?.();
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

        const rows = await listPendingReports(10);
        if (!rows.length) return;

        for (const row of rows) {
            const header = row.tipo === 'sugerencia' ? '*SUGERENCIA*' : '*REPORTE*';
            const label = row.tipo === 'sugerencia' ? '*Sugerencia:*' : '*Mensaje:*';
            const txt = `${header}\n\n*Usuario:* wa.me/${row.sender_id.split('@')[0]}\n${label} ${row.mensaje}`;
            await conn.sendMessage(modGroupId, {text: txt});
            await deleteReport(row.id);
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
