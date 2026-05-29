import fetch from 'node-fetch'
import {Blob, FormData} from 'formdata-node'
import {fileTypeFromBuffer} from 'file-type'

const fileIO = async (buffer: Buffer): Promise<string> => {
    const result = await fileTypeFromBuffer(buffer) || {} as { ext?: string; mime?: string }
    const {ext, mime} = result
    const form = new FormData()
    const blob = new Blob([buffer], {type: mime})
    form.append('file', blob, 'tmp.' + ext)
    const res = await fetch('https://file.io/?expires=1d', {
        method: 'POST',
        body: form as any,
    })
    const json = await res.json() as any
    if (!json.success) throw json
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
    const res = await fetch('https://storage.restfulapi.my.id/upload', {
        method: 'POST',
        body: form as any,
    })
    let json: any = await res.text()
    try {
        json = JSON.parse(json)
        if (!Array.isArray(inp)) return json.files[0].url
        return json.files.map((res: any) => res.url)
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
    const res = await fetch('https://qu.ax/upload.php', {
        method: 'POST',
        body: form as any,
    })
    const json = await res.json() as any
    if (!json?.success) throw '❌ Error al subir a qu.ax'
    return json.files[0].url
}

const catbox = async (buffer: Buffer): Promise<string> => {
    const result = await fileTypeFromBuffer(buffer) || {} as { ext?: string }
    const {ext} = result
    const form = new FormData()
    const blob = new Blob([buffer])
    form.append('reqtype', 'fileupload')
    form.append('fileToUpload', blob, 'file.' + ext)
    const res = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: form as any,
    })
    const url = await res.text()
    if (!url.startsWith('https://')) throw new Error('❌ Error al subir a catbox')
    return url
}

const uguu = async (buffer: Buffer): Promise<string> => {
    const result = await fileTypeFromBuffer(buffer) || {} as { ext?: string }
    const {ext} = result
    const form = new FormData()
    form.append('file', new Blob([buffer]), 'file.' + ext)
    const res = await fetch('https://uguu.se/api.php?d=upload-tool', {method: 'POST', body: form as any})
    const url = await res.text()
    if (!url.startsWith('https://')) throw '❌ Error al subir a uguu'
    return url
}

const filechan = async (buffer: Buffer): Promise<string> => {
    const result = await fileTypeFromBuffer(buffer) || {} as { ext?: string }
    const {ext} = result
    const form = new FormData()
    form.append('file', new Blob([buffer]), 'file.' + ext)
    const res = await fetch('https://api.filechan.org/upload', {method: 'POST', body: form as any})
    const json = await res.json() as any
    if (!json?.success || !json?.files?.length) throw '❌ Error al subir a filechan'
    return json.files[0].url
}

const pixeldrain = async (buffer: Buffer): Promise<string> => {
    const form = new FormData()
    form.append('file', new Blob([buffer]))
    const res = await fetch('https://pixeldrain.com/api/file', {method: 'POST', body: form as any})
    const json = await res.json() as any
    if (!json?.success || !json?.id) throw '❌ Error al subir a pixeldrain'
    return `https://pixeldrain.com/u/${json.id}`
}

const gofile = async (buffer: Buffer): Promise<string> => {
    const getServer = await fetch('https://api.gofile.io/getServer')
    const {data} = await getServer.json() as any
    const form = new FormData()
    form.append('file', new Blob([buffer]))
    const res = await fetch(`https://${data.server}.gofile.io/uploadFile`, {method: 'POST', body: form as any})
    const json = await res.json() as any
    if (!json?.status || json.status !== 'ok') throw '❌ Error al subir a Gofile'
    return json.data.downloadPage
}

const krakenfiles = async (buffer: Buffer): Promise<string> => {
    const result = await fileTypeFromBuffer(buffer) || {} as { ext?: string }
    const {ext} = result
    const form = new FormData()
    form.append('file', new Blob([buffer]), 'file.' + ext)
    const res = await fetch('https://api.krakenfiles.com/v2/file/upload', {method: 'POST', body: form as any})
    const json = await res.json() as any
    if (!json?.success) throw '❌ Error al subir a KrakenFiles'
    return json.data.url
}

const telegraph = async (buffer: Buffer): Promise<string> => {
    const result = await fileTypeFromBuffer(buffer) || {} as { ext?: string }
    const {ext} = result
    const form = new FormData()
    form.append('file', new Blob([buffer]), 'file.' + ext)
    const res = await fetch('https://telegra.ph/upload', {method: 'POST', body: form as any})
    const json = await res.json() as any
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
            console.log(`[UPLOAD OK]`, result)
            return result
        } catch (e) {
            console.log(`[UPLOAD FAIL]`, e)
            err = e
        }
    }
    if (err) throw err
    throw new Error('All upload services failed')
}
