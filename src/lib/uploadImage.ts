import fetch from 'node-fetch'
import {Blob, FormData} from 'formdata-node'
import {fileTypeFromBuffer} from 'file-type'

type FetchBody = NonNullable<Parameters<typeof fetch>[1]>['body'];

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
    const res = await fetch('https://qu.ax/upload.php', {method: 'POST', body: form as unknown as FetchBody})
    const json = await res.json() as QuaxUploadResponse
    const url = json.files?.[0]?.url
    if (json.success && url) {
        return url
    } else {
        throw new Error('Failed to upload the file to qu.ax')
    }
}
