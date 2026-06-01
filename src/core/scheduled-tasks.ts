import {ENV} from './env.js';
import {
    cleanExpiredChatMemories,
    clearGroupExpiration,
    deleteReport,
    listExpiredGroups,
    listPendingReports,
} from '../services/runtime-tasks.service.js';

let started = false;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const pickRandom = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

export function startScheduledTasks(): void {
    if (started) return;
    started = true;

    setInterval(handleExpiredGroups, 60_000).unref?.();
    setInterval(forwardPendingReports, 120_000).unref?.();
    setInterval(cleanExpiredChatMemory, 300_000).unref?.();
}

async function handleExpiredGroups(): Promise<void> {
    try {
        const conn = globalThis.conn;
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
                console.log(`[AUTO-LEAVE] Bot salio automaticamente del grupo: ${group_id}`);
            } catch (err) {
                console.error('[AUTO-LEAVE] Error procesando grupo expirado:', err);
            }
        }
    } catch (err) {
        console.error('[AUTO-LEAVE] Error general:', err);
    }
}

async function forwardPendingReports(): Promise<void> {
    const modGroupId = ENV.BOT_MOD_GROUP_ID;
    if (!modGroupId) return;

    try {
        const conn = globalThis.conn;
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
        console.error('[REPORT/SUGGE SYSTEM ERROR]', err);
    }
}

async function cleanExpiredChatMemory(): Promise<void> {
    try {
        const deleted = await cleanExpiredChatMemories();
        for (const chatId of deleted) {
            console.log(`[MEMORY] Memoria del grupo ${chatId} eliminada automaticamente`);
        }
    } catch (err) {
        console.error('Error limpiando memorias expiradas:', err);
    }
}
