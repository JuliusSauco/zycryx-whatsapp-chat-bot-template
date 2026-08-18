import assert from 'node:assert/strict';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL es obligatorio para el test de integración.');

const {reportsRepository} = await import('../src/adapters/drizzle/report.repository.js');
const {db} = await import('../src/lib/postgres.js');

const suffix = `${Date.now()}-${process.pid}`;
const senderId = `integration-outbox-${suffix}`;
const workerId = `integration-worker-${suffix}`;

try {
    await reportsRepository.create({
        senderId,
        senderName: 'Integration Outbox',
        message: 'delivery-success',
        type: 'integration',
    });

    const [delivery] = await reportsRepository.claimPending(1, workerId, 30);
    assert.ok(delivery, 'El reporte recién creado debe poder reclamarse.');
    assert.equal(delivery.mensaje, 'delivery-success');
    assert.equal(delivery.attempt_count, 1);

    await reportsRepository.markDelivered(delivery.id, workerId, 'wamid.integration');
    const sent = await db.query<{
        status: string;
        delivered_message_id: string | null;
        sent_at: Date | null;
    }>(
        `SELECT delivery.status, delivery.delivered_message_id, delivery.sent_at
         FROM bot_runtime.report_deliveries AS delivery
         WHERE delivery.report_id = $1`,
        [delivery.id],
    );
    assert.equal(sent.rows[0]?.status, 'sent');
    assert.equal(sent.rows[0]?.delivered_message_id, 'wamid.integration');
    assert.ok(sent.rows[0]?.sent_at);

    await reportsRepository.create({
        senderId,
        senderName: 'Integration Outbox',
        message: 'delivery-retry',
        type: 'integration',
    });

    const [retryDelivery] = await reportsRepository.claimPending(1, workerId, 30);
    assert.ok(retryDelivery, 'El segundo reporte debe poder reclamarse.');
    assert.equal(retryDelivery.mensaje, 'delivery-retry');
    await reportsRepository.markFailed(retryDelivery.id, workerId, 'fallo de integración');

    const retry = await db.query<{
        status: string;
        last_error: string | null;
        next_attempt_at: Date;
    }>(
        `SELECT delivery.status, delivery.last_error, delivery.next_attempt_at
         FROM bot_runtime.report_deliveries AS delivery
         WHERE delivery.report_id = $1`,
        [retryDelivery.id],
    );
    assert.equal(retry.rows[0]?.status, 'pending');
    assert.equal(retry.rows[0]?.last_error, 'fallo de integración');
    assert.ok((retry.rows[0]?.next_attempt_at.getTime() ?? 0) > Date.now());
} finally {
    await db.query(`DELETE FROM bot_identity.users WHERE id = $1`, [senderId]);
    await db.end();
}

console.log('report-outbox.integration.test.ts OK');
