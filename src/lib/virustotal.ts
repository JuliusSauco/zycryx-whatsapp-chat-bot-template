import crypto from 'crypto';
import fetch from 'node-fetch';
import FormData from 'form-data';
import {ENV} from '../core/env.js';

const VIRUSTOTAL_API_BASE = 'https://www.virustotal.com/api/v3';
const DIRECT_UPLOAD_LIMIT_BYTES = 32 * 1024 * 1024;
const ABSOLUTE_UPLOAD_LIMIT_BYTES = 650 * 1024 * 1024;

export type VirusTotalStats = {
    harmless?: number;
    malicious?: number;
    suspicious?: number;
    undetected?: number;
    timeout?: number;
    confirmedTimeout?: number;
    failure?: number;
    typeUnsupported?: number;
};

export type VirusTotalScanSummary = {
    analysisId: string;
    sha256: string;
    status: string;
    stats: VirusTotalStats;
    permalink: string;
};

export type VirusTotalUrlScanSummary = {
    analysisId: string;
    url: string;
    urlId: string;
    status: string;
    stats: VirusTotalStats;
    permalink: string;
};

type VirusTotalResponse<T> = {
    data?: T;
    error?: {
        code?: string;
        message?: string;
    };
};

type UploadResponseData = {
    id?: string;
};

type UploadUrlResponseData = string | {
    link?: string;
};

type AnalysisResponseData = {
    id?: string;
    attributes?: {
        status?: string;
        stats?: VirusTotalStats;
    };
};

function getVirusTotalHeaders(): Record<string, string> {
    return {'x-apikey': ENV.VIRUSTOTAL_API_KEY};
}

async function parseVirusTotalResponse<T>(response: Awaited<ReturnType<typeof fetch>>): Promise<VirusTotalResponse<T>> {
    const json = await response.json().catch(() => ({})) as VirusTotalResponse<T>;
    if (!response.ok) {
        const detail = json.error?.message || json.error?.code || response.statusText;
        throw new Error(`VirusTotal HTTP ${response.status}: ${detail}`);
    }
    return json;
}

async function getLargeFileUploadUrl(): Promise<string> {
    const response = await fetch(`${VIRUSTOTAL_API_BASE}/files/upload_url`, {
        method: 'GET',
        headers: getVirusTotalHeaders(),
    });
    const json = await parseVirusTotalResponse<UploadUrlResponseData>(response);
    const uploadUrl = typeof json.data === 'string' ? json.data : json.data?.link;
    if (!uploadUrl) throw new Error('VirusTotal no devolvio URL para archivos grandes');
    return uploadUrl;
}

async function uploadFile(buffer: Buffer, filename: string, mimetype: string): Promise<string> {
    const uploadUrl = buffer.length > DIRECT_UPLOAD_LIMIT_BYTES
        ? await getLargeFileUploadUrl()
        : `${VIRUSTOTAL_API_BASE}/files`;

    const form = new FormData();
    form.append('file', buffer, {
        filename,
        contentType: mimetype || 'application/octet-stream',
        knownLength: buffer.length,
    });

    const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            ...form.getHeaders(),
            ...getVirusTotalHeaders(),
        },
        body: form as never,
    });
    const json = await parseVirusTotalResponse<UploadResponseData>(response);
    const analysisId = json.data?.id;
    if (!analysisId) throw new Error('VirusTotal no devolvio analysis_id');
    return analysisId;
}

async function submitUrl(url: string): Promise<string> {
    const body = new URLSearchParams({url});
    const response = await fetch(`${VIRUSTOTAL_API_BASE}/urls`, {
        method: 'POST',
        headers: {
            ...getVirusTotalHeaders(),
            'content-type': 'application/x-www-form-urlencoded',
        },
        body,
    });
    const json = await parseVirusTotalResponse<UploadResponseData>(response);
    const analysisId = json.data?.id;
    if (!analysisId) throw new Error('VirusTotal no devolvio analysis_id para la URL');
    return analysisId;
}

async function getAnalysis(analysisId: string): Promise<AnalysisResponseData> {
    const response = await fetch(`${VIRUSTOTAL_API_BASE}/analyses/${encodeURIComponent(analysisId)}`, {
        method: 'GET',
        headers: getVirusTotalHeaders(),
    });
    const json = await parseVirusTotalResponse<AnalysisResponseData>(response);
    if (!json.data) throw new Error('VirusTotal no devolvio datos del analisis');
    return json.data;
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function getVirusTotalMaxFileBytes(): number {
    const configuredMb = Number.isFinite(ENV.VIRUSTOTAL_MAX_FILE_MB) ? ENV.VIRUSTOTAL_MAX_FILE_MB : 32;
    return Math.min(Math.max(configuredMb, 1) * 1024 * 1024, ABSOLUTE_UPLOAD_LIMIT_BYTES);
}

export function isVirusTotalConfigured(): boolean {
    return ENV.VIRUSTOTAL_ENABLED && !!ENV.VIRUSTOTAL_API_KEY;
}

export async function scanFileWithVirusTotal(buffer: Buffer, filename: string, mimetype: string): Promise<VirusTotalScanSummary> {
    if (!isVirusTotalConfigured()) throw new Error('VIRUSTOTAL_API_KEY no configurado');
    if (buffer.length > getVirusTotalMaxFileBytes()) {
        throw new Error(`Archivo excede el limite configurado de ${ENV.VIRUSTOTAL_MAX_FILE_MB} MB`);
    }

    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const analysisId = await uploadFile(buffer, filename, mimetype);

    let latest = await getAnalysis(analysisId);
    const attempts = Math.max(1, ENV.VIRUSTOTAL_POLL_ATTEMPTS);
    const intervalMs = Math.max(1000, ENV.VIRUSTOTAL_POLL_INTERVAL_MS);

    for (let attempt = 1; attempt < attempts && latest.attributes?.status !== 'completed'; attempt++) {
        await delay(intervalMs);
        latest = await getAnalysis(analysisId);
    }

    return {
        analysisId,
        sha256,
        status: latest.attributes?.status || 'unknown',
        stats: latest.attributes?.stats || {},
        permalink: `https://www.virustotal.com/gui/file/${sha256}`,
    };
}

export async function scanUrlWithVirusTotal(url: string): Promise<VirusTotalUrlScanSummary> {
    if (!isVirusTotalConfigured()) throw new Error('VIRUSTOTAL_API_KEY no configurado');

    const normalizedUrl = normalizeUrlForScan(url);
    const analysisId = await submitUrl(normalizedUrl);

    let latest = await getAnalysis(analysisId);
    const attempts = Math.max(1, ENV.VIRUSTOTAL_POLL_ATTEMPTS);
    const intervalMs = Math.max(1000, ENV.VIRUSTOTAL_POLL_INTERVAL_MS);

    for (let attempt = 1; attempt < attempts && latest.attributes?.status !== 'completed'; attempt++) {
        await delay(intervalMs);
        latest = await getAnalysis(analysisId);
    }

    const urlId = getVirusTotalUrlId(normalizedUrl);
    return {
        analysisId,
        url: normalizedUrl,
        urlId,
        status: latest.attributes?.status || 'unknown',
        stats: latest.attributes?.stats || {},
        permalink: `https://www.virustotal.com/gui/url/${urlId}`,
    };
}

export function formatVirusTotalSummary(summary: VirusTotalScanSummary, filename: string, sizeBytes: number): string {
    const stats = summary.stats;
    const malicious = stats.malicious || 0;
    const suspicious = stats.suspicious || 0;
    const harmless = stats.harmless || 0;
    const undetected = stats.undetected || 0;
    const unsupported = stats.typeUnsupported || 0;
    const timeouts = (stats.timeout || 0) + (stats.confirmedTimeout || 0);
    const total = malicious + suspicious + harmless + undetected + unsupported + timeouts + (stats.failure || 0);
    const verdict = malicious > 0
        ? 'ALERTA: detecciones maliciosas'
        : suspicious > 0
            ? 'Precaucion: detecciones sospechosas'
            : summary.status === 'completed'
                ? 'Sin detecciones maliciosas'
                : 'Analisis en proceso';

    return [
        '*🛡️🔎 Analisis de VirusTotal*',
        '',
        `Archivo: ${filename}`,
        `Tamano: ${formatBytes(sizeBytes)}`,
        `Estado: ${summary.status}`,
        `Veredicto: ${verdict}`,
        '',
        `Malicioso: ${malicious}`,
        `Sospechoso: ${suspicious}`,
        `Inofensivo: ${harmless}`,
        `Sin detectar: ${undetected}`,
        `Motores evaluados: ${total}`,
        '',
        `SHA-256: ${summary.sha256}`,
        `Reporte: ${summary.permalink}`,
    ].join('\n');
}

export function formatVirusTotalUrlSummary(summary: VirusTotalUrlScanSummary): string {
    const stats = summary.stats;
    const malicious = stats.malicious || 0;
    const suspicious = stats.suspicious || 0;
    const harmless = stats.harmless || 0;
    const undetected = stats.undetected || 0;
    const unsupported = stats.typeUnsupported || 0;
    const timeouts = (stats.timeout || 0) + (stats.confirmedTimeout || 0);
    const total = malicious + suspicious + harmless + undetected + unsupported + timeouts + (stats.failure || 0);
    const verdict = malicious > 0
        ? 'ALERTA: enlace malicioso'
        : suspicious > 0
            ? 'Precaucion: enlace sospechoso'
            : summary.status === 'completed'
                ? 'Sin detecciones maliciosas'
                : 'Analisis en proceso';

    return [
        '*🔗🛡️ Analisis de enlace en VirusTotal*',
        '',
        `URL: ${summary.url}`,
        `Estado: ${summary.status}`,
        `Veredicto: ${verdict}`,
        '',
        `Malicioso: ${malicious}`,
        `Sospechoso: ${suspicious}`,
        `Inofensivo: ${harmless}`,
        `Sin detectar: ${undetected}`,
        `Motores evaluados: ${total}`,
        '',
        `Reporte: ${summary.permalink}`,
    ].join('\n');
}

export function normalizeUrlForScan(url: string): string {
    const cleanUrl = url.trim().replace(/[)\].,!?;:]+$/g, '');
    if (/^https?:\/\//i.test(cleanUrl)) return cleanUrl;
    return `https://${cleanUrl}`;
}

export function getVirusTotalUrlId(url: string): string {
    return Buffer.from(url).toString('base64url').replace(/=+$/g, '');
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB'];
    let value = bytes / 1024;
    let unit = units[0];
    for (let index = 1; value >= 1024 && index < units.length; index++) {
        value /= 1024;
        unit = units[index];
    }
    return `${value.toFixed(value >= 10 ? 1 : 2)} ${unit}`;
}
