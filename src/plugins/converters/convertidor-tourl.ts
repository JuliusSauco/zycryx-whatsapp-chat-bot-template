import {logError} from '../../lib/logger.js';
import uploadFile, {
    catbox,
    filechan,
    gofile,
    krakenfiles,
    pixeldrain,
    quax,
    RESTfulAPI,
    telegraph,
    uguu
} from '../../lib/uploadFile.js';
import uploadImage from '../../lib/uploadImage.js';
import FormData from "form-data";
import {definePlugin} from '../../core/define-plugin.js';
import {ENV} from '../../core/env.js';
import {httpJson, type HttpRequestOptions} from '../../lib/http-client.js';

type UploadService = (media: Buffer) => Promise<string | string[]>;

interface SkyUploadResponse {
    ok?: boolean;
    file?: {
        url?: string;
    };
    url?: string;
}

const isUploadServiceKey = (option: string, services: Record<string, UploadService>): option is keyof typeof services => option in services;
const normalizeLink = (link: string | string[]) => Array.isArray(link) ? link.join('\n') : link;

export default definePlugin({
    help: ['tourl <opcional servicio>'],
    tags: ['convertidor'],
    command: /^(upload|tourl)$/i,
    register: true,
    async execute(m, {args, usedPrefix, command}) {
    const q = m.quoted ? m.quoted : m;
    const mime = (q.msg || q).mimetype || "";

    if (!mime) throw `*\`⚠️ ¿𝐘 𝐋𝐀 𝐈𝐌𝐀𝐆𝐄𝐍/𝐕𝐈𝐃𝐄𝐎?\`*

*• Ejemplo de Uso de ${usedPrefix + command}:*

➔ Responde a una imagen, sticker o video corto con el comando: *${usedPrefix + command}*

Subirá automáticamente el archivo a servidores como *qu.ax*, *catbox*, *cdn-skyultraplus*, etc.

🌐 *\`¿Quieres elegir un servidor específico?\`*
> Puedes usar:

➔ *${usedPrefix + command} quax*  
➔ *${usedPrefix + command} catbox*  
➔ *${usedPrefix + command} sky*
➔ *${usedPrefix + command} uguu*  
➔ *${usedPrefix + command} restfulapi*  
➔ *${usedPrefix + command} gofile*  
➔ *${usedPrefix + command} telegraph*  

📝 *Notas:*
- *El archivo debe ser una imagen, sticker o video corto.*  
- *Enlaces de qu.ax y catbox no expiran.*
- *El CDN de SkyUltraPlus no tiene caducidad y es más rápido (pagando) obtener mas información aqui:* https://cdn.skyultraplus.com`;

    const media = await q.download();
    if (!media) throw "❌ No se pudo descargar el archivo.";
    const option = (args[0] || "").toLowerCase();
    const services: Record<string, UploadService> = {quax, restfulapi: RESTfulAPI, catbox, uguu, filechan, pixeldrain, gofile, krakenfiles, telegraph};
    try {
        if (option === "sky") {
            if (!ENV.SKYULTRA_API_KEY) throw new Error('SKYULTRA_API_KEY no configurado')
            let ext = mime.split("/")[1] || "jpg";
            if (ext === "jpeg") ext = "jpg";
            const form = new FormData();
            form.append("name", "archivo_bot");
            form.append("file", media, {
                filename: `upload.${ext}`,
                contentType: mime,
            });

            const json = await httpJson<SkyUploadResponse>("https://cdn.skyultraplus.com/upload.php", {
                method: "POST",
                headers: {
                    ...form.getHeaders(),
                    "X-API-KEY": ENV.SKYULTRA_API_KEY,
                },
                body: form as unknown as HttpRequestOptions['body'],
            });
            if (!json.ok) throw `error: ${JSON.stringify(json)}`;
            const link = json.file?.url || json.url;
            if (!link) throw new Error('SkyUltra no devolvió URL')
            return m.reply(link);
        }

        if (option && isUploadServiceKey(option, services)) {
            const link = await services[option](media);
            return m.reply(normalizeLink(link));
        }

        const isTele = /image\/(png|jpe?g|gif)|video\/mp4/.test(mime);
        const link = await (isTele ? uploadImage : uploadFile)(media);
        return m.reply(link);
    } catch (e: unknown) {
        logError(e);
        throw '❌ Error al subir el archivo. Intenta con otra opción:\n' + Object.keys(services).concat(["skyultra"]).map((v) => `➔ ${usedPrefix}${command} ${v}`).join('\n');
    }
    }
});
