import {orm} from '../../db/client.js';
import {reportDeliveries, reportes, usuarios} from '../../db/schema.js';
import type {ReportRepository} from '../../ports/repositories.js';
import {db} from '../../lib/postgres.js';

export const reportsRepository: ReportRepository = {
    async create({senderId, senderName, message, type}) {
        await orm.transaction(async tx => {
            await tx.insert(usuarios).values({id: senderId, nombre: senderName}).onConflictDoNothing();
            const [report] = await tx.insert(reportes).values({
                senderId,
                senderName,
                mensaje: message,
                tipo: type,
            }).returning({id: reportes.id});
            if (!report) throw new Error('No se pudo crear el reporte.');
            await tx.insert(reportDeliveries).values({reportId: report.id});
        });
    },

    async claimPending(limit, workerId, leaseSeconds) {
        const result = await db.query<{
            id: number;
            sender_id: string;
            sender_name: string | null;
            mensaje: string;
            tipo: string;
            fecha: Date;
            attempt_count: number;
        }>(
            `WITH candidates AS (
                SELECT delivery.report_id
                FROM bot_runtime.report_deliveries AS delivery
                WHERE (delivery.status = 'pending' AND delivery.next_attempt_at <= statement_timestamp())
                   OR (delivery.status = 'processing' AND delivery.locked_until < statement_timestamp())
                ORDER BY delivery.next_attempt_at, delivery.report_id
                FOR UPDATE SKIP LOCKED
                LIMIT $1
             ), claimed AS (
                UPDATE bot_runtime.report_deliveries AS delivery
                SET status = 'processing',
                    attempt_count = delivery.attempt_count + 1,
                    locked_by = $2,
                    locked_until = statement_timestamp() + make_interval(secs => $3),
                    updated_at = statement_timestamp()
                FROM candidates
                WHERE delivery.report_id = candidates.report_id
                RETURNING delivery.report_id, delivery.attempt_count
             )
             SELECT report.id, report.sender_id, report.sender_name, report.mensaje,
                    report.tipo, report.fecha, claimed.attempt_count
             FROM claimed
             JOIN bot_runtime.reports AS report ON report.id = claimed.report_id
             ORDER BY report.fecha`,
            [limit, workerId, leaseSeconds],
        );
        return result.rows;
    },

    async markDelivered(id, workerId, deliveredMessageId) {
        await db.query(
            `UPDATE bot_runtime.report_deliveries
             SET status = 'sent', delivered_message_id = $3, sent_at = statement_timestamp(),
                 locked_by = NULL, locked_until = NULL, last_error = NULL, updated_at = statement_timestamp()
             WHERE report_id = $1 AND status = 'processing' AND locked_by = $2`,
            [id, workerId, deliveredMessageId],
        );
    },

    async markFailed(id, workerId, error) {
        await db.query(
            `UPDATE bot_runtime.report_deliveries
             SET status = CASE WHEN attempt_count >= 8 THEN 'dead' ELSE 'pending' END,
                 next_attempt_at = statement_timestamp() + make_interval(secs => LEAST(3600, (2 ^ LEAST(attempt_count, 10))::integer * 30)),
                 locked_by = NULL, locked_until = NULL, last_error = LEFT($3, 2000), updated_at = statement_timestamp()
             WHERE report_id = $1 AND status = 'processing' AND locked_by = $2`,
            [id, workerId, error],
        );
    },
};
