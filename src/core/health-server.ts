import {createServer, type Server} from 'node:http';
import {ENV} from './env.js';
import {db} from '../lib/postgres.js';
import {getBackgroundTaskQueueStats} from '../lib/background-task-queue.js';
import {getMessageQueueStats} from './message-dispatch.js';
import {getAuthStateStats} from '../services/baileys-auth-state.service.js';
import {getMainConnection, getSubbotConnections} from './runtime-state.js';
import {logInfo} from '../lib/logger.js';
import {getApplicationPhase} from './application-lifecycle.js';
import {getCacheInvalidationListenerStatus} from '../lib/cache-invalidation-listener.js';
import {getBotInstanceIdentity} from './bot-instance-identity.js';

let server: Server | null = null;

export async function startHealthServer(): Promise<void> {
    if (server) return;
    server = createServer((request, response) => {
        response.setHeader('content-type', 'application/json; charset=utf-8');
        response.setHeader('cache-control', 'no-store');
        void handleRequest(request, response).catch(error =>
            send(response, 500, {status: 'error', error: error instanceof Error ? error.message : String(error)}));
    });
    await new Promise<void>((resolve, reject) => {
        server!.once('error', reject);
        server!.listen(ENV.HEALTH_PORT, ENV.HEALTH_HOST, () => resolve());
    });
    logInfo(`[HEALTH] Endpoint activo en http://${ENV.HEALTH_HOST}:${ENV.HEALTH_PORT}.`);
}

async function handleRequest(
    request: import('node:http').IncomingMessage,
    response: import('node:http').ServerResponse,
): Promise<void> {
        if (request.method !== 'GET') return send(response, 405, {error: 'method-not-allowed'});
        if (request.url === '/health/live') return send(response, 200, {status: 'live', uptimeSeconds: process.uptime()});
        if (request.url === '/health/ready') {
            try {
                await db.query('SELECT 1');
                const readiness = readinessStatus();
                if (!readiness.ready) return send(response, 503, {status: 'not-ready', reasons: readiness.reasons, ...runtimeMetrics()});
                return send(response, 200, {status: 'ready', ...runtimeMetrics()});
            } catch (error) {
                return send(response, 503, {status: 'not-ready', error: error instanceof Error ? error.message : String(error)});
            }
        }
        if (request.url === '/metrics') {
            if (ENV.HEALTH_METRICS_TOKEN && request.headers.authorization !== `Bearer ${ENV.HEALTH_METRICS_TOKEN}`) {
                return send(response, 401, {error: 'unauthorized'});
            }
            const [leases, outbox] = await Promise.all([
                db.query<{count: string}>(`SELECT count(*)::text AS count FROM bot_sessions.auth_sessions WHERE lease_expires_at >= statement_timestamp()`),
                db.query<{count: string}>(`SELECT count(*)::text AS count FROM bot_runtime.report_deliveries WHERE status IN ('pending', 'processing')`),
            ]).catch(() => [{rows: [{count: '-1'}]}, {rows: [{count: '-1'}]}] as const);
            return send(response, 200, {
                ...runtimeMetrics(),
                database: {
                    poolTotal: db.totalCount,
                    poolIdle: db.idleCount,
                    poolWaiting: db.waitingCount,
                    activeLeases: Number(leases.rows[0]?.count ?? -1),
                    pendingOutbox: Number(outbox.rows[0]?.count ?? -1),
                },
            });
        }
        return send(response, 404, {error: 'not-found'});
}

export async function stopHealthServer(): Promise<void> {
    const active = server;
    server = null;
    if (!active) return;
    await new Promise<void>((resolve, reject) => active.close(error => error ? reject(error) : resolve()));
}

function runtimeMetrics() {
    const listener = getCacheInvalidationListenerStatus();
    const main = getMainConnection();
    const subbots = getSubbotConnections();
    return {
        messages: getMessageQueueStats(),
        background: getBackgroundTaskQueueStats(),
        auth: getAuthStateStats(),
        lifecycle: {phase: getApplicationPhase()},
        cacheInvalidation: listener,
        sessions: {
            mainConnected: Boolean(main && getBotInstanceIdentity(main)?.botJid),
            subbotsConnected: subbots.filter(socket => Boolean(getBotInstanceIdentity(socket)?.botJid)).length,
        },
    };
}

function readinessStatus(): {ready: boolean; reasons: string[]} {
    const metrics = runtimeMetrics();
    const reasons: string[] = [];
    if (metrics.lifecycle.phase !== 'running') reasons.push(`lifecycle:${metrics.lifecycle.phase}`);
    if (!metrics.cacheInvalidation.connected) reasons.push('cache-listener-disconnected');
    if (!metrics.sessions.mainConnected && metrics.sessions.subbotsConnected === 0) reasons.push('no-connected-bot');
    if (metrics.messages.pending >= Math.floor(metrics.messages.capacity * 0.9)) reasons.push('message-queue-saturated');
    if (metrics.background.pending >= Math.floor(metrics.background.capacity * 0.9)) reasons.push('background-queue-saturated');
    return {ready: reasons.length === 0, reasons};
}

function send(response: import('node:http').ServerResponse, status: number, body: unknown): void {
    response.statusCode = status;
    response.end(JSON.stringify(body));
}
