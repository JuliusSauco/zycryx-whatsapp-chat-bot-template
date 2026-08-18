import {createHmac} from 'node:crypto';
import {ENV} from '../../core/env.js';
import {httpJson} from '../../lib/http-client.js';

export interface AcrMusicResult {
    title?: string;
    artists?: Array<{name: string}>;
    album?: {name?: string};
    genres?: Array<{name: string}>;
    release_date?: string;
}

export interface AcrIdentifyResult {
    status: {code: number; msg: string};
    metadata?: {music?: AcrMusicResult[]};
}

export function isAcrCloudConfigured(): boolean {
    return Boolean(ENV.ACR_HOST && ENV.ACR_ACCESS_KEY && ENV.ACR_ACCESS_SECRET);
}

export async function identifyMusic(sample: Buffer): Promise<AcrIdentifyResult> {
    if (!isAcrCloudConfigured()) throw new Error('ACRCloud no está configurado.');
    const method = 'POST';
    const uri = '/v1/identify';
    const dataType = 'audio';
    const signatureVersion = '1';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const stringToSign = [method, uri, ENV.ACR_ACCESS_KEY, dataType, signatureVersion, timestamp].join('\n');
    const signature = createHmac('sha1', ENV.ACR_ACCESS_SECRET).update(stringToSign).digest('base64');
    const form = new FormData();
    form.set('sample', new Blob([Uint8Array.from(sample)]), 'sample.bin');
    form.set('access_key', ENV.ACR_ACCESS_KEY);
    form.set('data_type', dataType);
    form.set('signature_version', signatureVersion);
    form.set('signature', signature);
    form.set('sample_bytes', String(sample.byteLength));
    form.set('timestamp', timestamp);
    const host = ENV.ACR_HOST.startsWith('http') ? ENV.ACR_HOST : `https://${ENV.ACR_HOST}`;
    return httpJson<AcrIdentifyResult>(`${host}${uri}`, {method, body: form, timeoutMs: 20_000});
}
