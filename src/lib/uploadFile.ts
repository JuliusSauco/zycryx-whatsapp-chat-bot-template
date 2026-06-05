import {logError, logInfo, logWarn} from './logger.js';
import {Blob, FormData} from 'formdata-node'
import {fileTypeFromBuffer} from 'file-type'
import {httpJson, httpText} from './http-client.js'
import type {RequestInit} from 'node-fetch'

type FetchBody = RequestInit['body'];
type UploadFileItem = {url?: string; src?: string};

interface FileIoResponse {
    success?: boolean;
    link?: string;
}

interface RestfulApiResponse {
    files?: UploadFileItem[];
}

interface QuaxUploadResponse {
    success?: boolean;
    files?: UploadFileItem[];
}

interface GenericUploadResponse {
    success?: boolean;
    files?: UploadFileItem[];
    id?: string;
    status?: string;
    data?: {
        server?: string;
        downloadPage?: string;
        url?: string;
    };
}

const fileIO = async (buffer: Buffer): Promise<string> => {
    const result = await fileTypeFromBuffer(buffer) || {} as { ext?: string; mime?: string }
    const {ext, mime} = result
    const form = new FormData()
    const blob = new Blob([buffer], {type: mime})
    form.append('file', blob, 'tmp.' + ext)
    const json = await httpJson<FileIoResponse>('https://file.io/?expires=1d', {
        method: 'POST',
        body: form as unknown as FetchBody,
    })
    if (!json.success || !json.link) throw json
    return json.link
}

const RESTfulAPI = async (inp: Buffer | Buffer[]): Promise<string | string[]> => {
    const form = new FormData()
    let buffers = inp
    if (!Array.isArray(inp)) buffers = [inp]
    const mime = (await fileTypeFromBuffer((buffers as Buffer[])[0]))?.mime || 'application/octet-stream'
    for (const buffer of buffers as Buffer[]) {
        const blob = new Blob([buffer], {type: mime})
        form.append('file', blob)
    }
    let json: unknown = await httpText('https://storage.restfulapi.my.id/upload', {
        method: 'POST',
        body: form as unknown as FetchBody,
    })
    try {
        const parsed = JSON.parse(String(json)) as RestfulApiResponse
        if (!Array.isArray(inp)) return parsed.files?.[0]?.url || ''
        return (parsed.files || []).map((res) => res.url || '')
    } catch (e) {
        throw json
    }
}

const quax = async (buffer: Buffer): Promise<string> => {
    const result = await fileTypeFromBuffer(buffer)
    const {ext, mime} = result || {ext: 'bin', mime: 'application/octet-stream'}
    const form = new FormData()
    const blob = new Blob([buffer], {type: mime})
    form.append('files[]', blob, 'file.' + ext)
    const json = await httpJson<QuaxUploadResponse>('https://qu.ax/upload.php', {
        method: 'POST',
        body: form as unknown as FetchBody,
    })
    if (!json?.success) throw '❌ Error al subir a qu.ax'
    return json.files?.[0]?.url || ''
}

const catbox = async (buffer: Buffer): Promise<string> => {
    const result = await fileTypeFromBuffer(buffer) || {} as { ext?: string }
    const {ext} = result
    const form = new FormData()
    const blob = new Blob([buffer])
    form.append('reqtype', 'fileupload')
    form.append('fileToUpload', blob, 'file.' + ext)
    const url = await httpText('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: form as unknown as FetchBody,
    })
    if (!url.startsWith('https://')) throw new Error('❌ Error al subir a catbox')
    return url
}

const uguu = async (buffer: Buffer): Promise<string> => {
    const result = await fileTypeFromBuffer(buffer) || {} as { ext?: string }
    const {ext} = result
    const form = new FormData()
    form.append('file', new Blob([buffer]), 'file.' + ext)
    const url = await httpText('https://uguu.se/api.php?d=upload-tool', {method: 'POST', body: form as unknown as FetchBody})
    if (!url.startsWith('https://')) throw '❌ Error al subir a uguu'
    return url
}

const filechan = async (buffer: Buffer): Promise<string> => {
    const result = await fileTypeFromBuffer(buffer) || {} as { ext?: string }
    const {ext} = result
    const form = new FormData()
    form.append('file', new Blob([buffer]), 'file.' + ext)
    const json = await httpJson<GenericUploadResponse>('https://api.filechan.org/upload', {method: 'POST', body: form as unknown as FetchBody})
    if (!json?.success || !json?.files?.length) throw '❌ Error al subir a filechan'
    return json.files[0].url || ''
}

const pixeldrain = async (buffer: Buffer): Promise<string> => {
    const form = new FormData()
    form.append('file', new Blob([buffer]))
    const json = await httpJson<GenericUploadResponse>('https://pixeldrain.com/api/file', {method: 'POST', body: form as unknown as FetchBody})
    if (!json?.success || !json?.id) throw '❌ Error al subir a pixeldrain'
    return `https://pixeldrain.com/u/${json.id}`
}

const gofile = async (buffer: Buffer): Promise<string> => {
    const {data} = await httpJson<GenericUploadResponse>('https://api.gofile.io/getServer')
    if (!data?.server) throw '❌ Error al obtener servidor de Gofile'
    const form = new FormData()
    form.append('file', new Blob([buffer]))
    const json = await httpJson<GenericUploadResponse>(`https://${data.server}.gofile.io/uploadFile`, {method: 'POST', body: form as unknown as FetchBody})
    if (!json?.status || json.status !== 'ok') throw '❌ Error al subir a Gofile'
    return json.data?.downloadPage || ''
}

const krakenfiles = async (buffer: Buffer): Promise<string> => {
    const result = await fileTypeFromBuffer(buffer) || {} as { ext?: string }
    const {ext} = result
    const form = new FormData()
    form.append('file', new Blob([buffer]), 'file.' + ext)
    const json = await httpJson<GenericUploadResponse>('https://api.krakenfiles.com/v2/file/upload', {method: 'POST', body: form as unknown as FetchBody})
    if (!json?.success) throw '❌ Error al subir a KrakenFiles'
    return json.data?.url || ''
}

const telegraph = async (buffer: Buffer): Promise<string> => {
    const result = await fileTypeFromBuffer(buffer) || {} as { ext?: string }
    const {ext} = result
    const form = new FormData()
    form.append('file', new Blob([buffer]), 'file.' + ext)
    const json = await httpJson<UploadFileItem[]>('https://telegra.ph/upload', {method: 'POST', body: form as unknown as FetchBody})
    if (!Array.isArray(json)) throw '❌ Error al subir a Telegraph'
    return 'https://telegra.ph' + json[0].src
}

export {quax, RESTfulAPI, catbox, uguu, filechan, pixeldrain, gofile, krakenfiles, telegraph}

type UploadFn = (buffer: Buffer) => Promise<string>;

export default async function (inp: Buffer): Promise<string> {
    const servicios: UploadFn[] = [quax, RESTfulAPI as UploadFn, catbox, uguu, filechan, pixeldrain, gofile, krakenfiles, telegraph]
    let err: unknown = null
    for (const upload of servicios) {
        try {
            const result = await upload(inp)
            logInfo(`[UPLOAD OK]`, result)
            return result
        } catch (e) {
            logInfo(`[UPLOAD FAIL]`, e)
            err = e
        }
    }
    if (err) throw err
    throw new Error('All upload services failed')
}
