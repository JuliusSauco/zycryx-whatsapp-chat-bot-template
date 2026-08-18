import {timingSafeEqual} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createServer, type IncomingMessage, type Server, type ServerResponse} from 'node:http';
import {fileURLToPath} from 'node:url';
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
import {getRuntimeConsoleEntries} from '../lib/runtime-console.js';
import {getMainLinkState, startMainLink, type MainLinkMethod} from './main-linking.js';

let server: Server | null = null;
const consoleAssets = {
    html: fileURLToPath(new URL('../../resources/web-console/index.html', import.meta.url)),
    css: fileURLToPath(new URL('../../resources/web-console/styles.css', import.meta.url)),
    js: fileURLToPath(new URL('../../resources/web-console/app.js', import.meta.url)),
} as const;

export async function startHealthServer(): Promise<void> {
    if (server) return;
    server = createServer((request, response) => {
        setSecurityHeaders(response);
        void handleRequest(request, response).catch(error =>
            sendJson(response, 500, {status: 'error', error: error instanceof Error ? error.message : String(error)}));
    });
    await new Promise<void>((resolve, reject) => {
        server!.once('error', reject);
        server!.listen(ENV.HEALTH_PORT, ENV.HEALTH_HOST, () => resolve());
    });
    logInfo(`[HEALTH] Endpoint activo en http://${ENV.HEALTH_HOST}:${ENV.HEALTH_PORT}.`);
}

async function handleRequest(
    request: IncomingMessage,
    response: ServerResponse,
): Promise<void> {
        if (request.method !== 'GET' && request.method !== 'POST') {
            return sendJson(response, 405, {error: 'method-not-allowed'});
        }
        const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

        if (url.pathname === '/') {
            if (request.method !== 'GET') return sendJson(response, 405, {error: 'method-not-allowed'});
            response.statusCode = 302;
            response.setHeader('location', '/console');
            response.end();
            return;
        }
        if (url.pathname === '/console') return request.method === 'GET'
            ? sendAsset(response, consoleAssets.html, 'text/html; charset=utf-8')
            : sendJson(response, 405, {error: 'method-not-allowed'});
        if (url.pathname === '/console/styles.css') return request.method === 'GET'
            ? sendAsset(response, consoleAssets.css, 'text/css; charset=utf-8')
            : sendJson(response, 405, {error: 'method-not-allowed'});
        if (url.pathname === '/console/app.js') return request.method === 'GET'
            ? sendAsset(response, consoleAssets.js, 'text/javascript; charset=utf-8')
            : sendJson(response, 405, {error: 'method-not-allowed'});

        if (url.pathname === '/health/live') return request.method === 'GET'
            ? sendJson(response, 200, {status: 'live', uptimeSeconds: process.uptime()})
            : sendJson(response, 405, {error: 'method-not-allowed'});
        if (url.pathname === '/health/ready') {
            if (request.method !== 'GET') return sendJson(response, 405, {error: 'method-not-allowed'});
            try {
                await db.query('SELECT 1');
                const readiness = readinessStatus();
                if (!readiness.ready) return sendJson(response, 503, {status: 'not-ready', reasons: readiness.reasons, ...runtimeMetrics()});
                return sendJson(response, 200, {status: 'ready', ...runtimeMetrics()});
            } catch (error) {
                return sendJson(response, 503, {status: 'not-ready', error: error instanceof Error ? error.message : String(error)});
            }
        }
        if (url.pathname === '/metrics') {
            if (request.method !== 'GET') return sendJson(response, 405, {error: 'method-not-allowed'});
            if (ENV.HEALTH_METRICS_TOKEN && request.headers.authorization !== `Bearer ${ENV.HEALTH_METRICS_TOKEN}`) {
                return sendJson(response, 401, {error: 'unauthorized'});
            }
            const [leases, outbox] = await Promise.all([
                db.query<{count: string}>(`SELECT count(*)::text AS count FROM bot_sessions.auth_sessions WHERE lease_expires_at >= statement_timestamp()`),
                db.query<{count: string}>(`SELECT count(*)::text AS count FROM bot_runtime.report_deliveries WHERE status IN ('pending', 'processing')`),
            ]).catch(() => [{rows: [{count: '-1'}]}, {rows: [{count: '-1'}]}] as const);
            return sendJson(response, 200, {
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

        if (url.pathname.startsWith('/api/console/')) {
            if (!ENV.CONSOLE_VIEW_TOKEN) return sendJson(response, 503, {error: 'console-disabled'});
            if (!isAuthorized(request, ENV.CONSOLE_VIEW_TOKEN)) return sendJson(response, 401, {error: 'unauthorized'});
            if (url.pathname === '/api/console/status') {
                if (request.method !== 'GET') return sendJson(response, 405, {error: 'method-not-allowed'});
                let database: 'ok' | 'unavailable' = 'ok';
                try {
                    await db.query('SELECT 1');
                } catch {
                    database = 'unavailable';
                }
                const readiness = readinessStatus();
                return sendJson(response, 200, {
                    botName: ENV.BOT_DISPLAY_NAME,
                    ready: readiness.ready && database === 'ok',
                    reasons: readiness.reasons,
                    database,
                    uptimeSeconds: process.uptime(),
                    metrics: runtimeMetrics(),
                    linking: getMainLinkState(),
                });
            }
            if (url.pathname === '/api/console/logs') {
                if (request.method !== 'GET') return sendJson(response, 405, {error: 'method-not-allowed'});
                const rawAfter = Number.parseInt(url.searchParams.get('after') || '0', 10);
                const after = Number.isSafeInteger(rawAfter) && rawAfter >= 0 ? rawAfter : 0;
                return sendJson(response, 200, {entries: getRuntimeConsoleEntries(after)});
            }
            if (url.pathname === '/api/console/link/start') {
                if (request.method !== 'POST') return sendJson(response, 405, {error: 'method-not-allowed'});
                let body: Record<string, unknown>;
                try {
                    body = await readJsonBody(request);
                } catch (error) {
                    return sendJson(response, 400, {error: 'invalid-body', message: error instanceof Error ? error.message : 'Solicitud inválida.'});
                }
                const method = body.method === 'qr' || body.method === 'code' ? body.method as MainLinkMethod : null;
                if (!method) return sendJson(response, 400, {error: 'invalid-method', message: 'Selecciona QR o código.'});
                const phone = method === 'code' ? normalizeInternationalPhone(body.phone) : null;
                if (method === 'code' && !phone) {
                    return sendJson(response, 400, {error: 'invalid-phone', message: 'Escribe el número internacional con código de país (8 a 15 dígitos).'});
                }
                try {
                    await startMainLink({method, phone, replaceSession: body.replaceSession === true});
                    return sendJson(response, 202, {linking: getMainLinkState()});
                } catch (error) {
                    return sendJson(response, 409, {
                        error: 'linking-conflict',
                        message: error instanceof Error ? error.message : String(error),
                        linking: getMainLinkState(),
                    });
                }
            }
        }
        return sendJson(response, 404, {error: 'not-found'});
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of request) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.length;
        if (size > 4_096) throw new Error('El cuerpo de la solicitud es demasiado grande.');
        chunks.push(buffer);
    }
    if (!chunks.length) return {};
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('JSON inválido.');
    return parsed as Record<string, unknown>;
}

function normalizeInternationalPhone(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const digits = value.replace(/\D/g, '');
    return /^\d{8,15}$/.test(digits) ? digits : null;
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

function setSecurityHeaders(response: ServerResponse): void {
    response.setHeader('cache-control', 'no-store');
    response.setHeader('content-security-policy', "default-src 'self'; style-src 'self' https://cdn.jsdelivr.net; script-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self' https://cdn.jsdelivr.net; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    response.setHeader('referrer-policy', 'no-referrer');
    response.setHeader('x-content-type-options', 'nosniff');
    response.setHeader('x-frame-options', 'DENY');
}

function isAuthorized(request: IncomingMessage, expectedToken: string): boolean {
    const header = request.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return false;
    const provided = Buffer.from(header.slice(7));
    const expected = Buffer.from(expectedToken);
    return provided.length === expected.length && timingSafeEqual(provided, expected);
}

async function sendAsset(response: ServerResponse, path: string, contentType: string): Promise<void> {
    const content = await readFile(path);
    response.statusCode = 200;
    response.setHeader('content-type', contentType);
    response.end(content);
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
    response.statusCode = status;
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(JSON.stringify(body));
}
