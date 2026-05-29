import fetch from 'node-fetch'
import {Blob, FormData} from 'formdata-node'
import {fileTypeFromBuffer} from 'file-type'

export default async (buffer: Buffer): Promise<string> => {
    const result = await fileTypeFromBuffer(buffer)
    const {ext, mime} = result || {ext: 'bin', mime: 'application/octet-stream'}
    const form = new FormData()
    const blob = new Blob([buffer], {type: mime})
    form.append('files[]', blob, 'tmp.' + ext)
    const res = await fetch('https://qu.ax/upload.php', {method: 'POST', body: form as any})
    const json = await res.json() as any
    if (json && json.success) {
        return json.files[0].url
    } else {
        throw new Error('Failed to upload the file to qu.ax')
    }
}
