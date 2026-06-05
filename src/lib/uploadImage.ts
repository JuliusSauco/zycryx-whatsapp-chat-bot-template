import {Blob, FormData} from 'formdata-node'
import {fileTypeFromBuffer} from 'file-type'
import {httpJson, type HttpRequestOptions} from './http-client.js'

type FetchBody = HttpRequestOptions['body'];

interface QuaxUploadResponse {
    success?: boolean;
    files?: Array<{url?: string}>;
}

export default async (buffer: Buffer): Promise<string> => {
    const result = await fileTypeFromBuffer(buffer)
    const {ext, mime} = result || {ext: 'bin', mime: 'application/octet-stream'}
    const form = new FormData()
    const blob = new Blob([buffer], {type: mime})
    form.append('files[]', blob, 'tmp.' + ext)
    const json = await httpJson<QuaxUploadResponse>('https://qu.ax/upload.php', {method: 'POST', body: form as unknown as FetchBody})
    const url = json.files?.[0]?.url
    if (json.success && url) {
        return url
    } else {
        throw new Error('Failed to upload the file to qu.ax')
    }
}
