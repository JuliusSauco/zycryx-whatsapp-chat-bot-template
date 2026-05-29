import {eq} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {reportes} from '../../db/schema.js';
import type {ReportRepository} from '../../ports/repositories.js';

export const reportsRepository: ReportRepository = {
    async create({senderId, senderName, message, type}) {
        await orm.insert(reportes)
            .values({
                senderId,
                senderName,
                mensaje: message,
                tipo: type,
            });
    },

    async listPending(limit) {
        const rows = await orm.select()
            .from(reportes)
            .where(eq(reportes.enviado, false))
            .orderBy(reportes.fecha)
            .limit(limit);

        return rows.map(row => ({
            id: row.id,
            sender_id: row.senderId,
            sender_name: row.senderName,
            mensaje: row.mensaje,
            tipo: row.tipo ?? 'reporte',
            fecha: row.fecha ?? undefined,
        }));
    },

    async deleteById(id) {
        await orm.delete(reportes).where(eq(reportes.id, id));
    },
};
