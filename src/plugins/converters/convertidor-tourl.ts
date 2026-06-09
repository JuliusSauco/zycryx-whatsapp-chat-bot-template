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
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {ENV} from '../../core/env.js';

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

export default defineSdkPlugin({
    help: ['tourl <opcional servicio>'],
    tags: ['convertidor'],
    command: /^(upload|tourl)$/i,
    register: true,
    async execute(m, {sdk}) {
    const q = m.quoted ? m.quoted : m;
    const mime = (q.msg || q).mimetype || "";

    if (!mime) throw sdk.content.renderMessage('converters.toUrl.missingMedia', {command: sdk.usedPrefix + sdk.command});

    const media = await q.download();
    if (!media) throw sdk.content.message('converters.toUrl.downloadError');
    const option = (sdk.args[0] || "").toLowerCase();
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

            const json = await sdk.http.json<SkyUploadResponse>("https://cdn.skyultraplus.com/upload.php", {
                method: "POST",
                headers: {
                    ...form.getHeaders(),
                    "X-API-KEY": ENV.SKYULTRA_API_KEY,
                },
                body: form as never,
            });
            if (!json.ok) throw `error: ${JSON.stringify(json)}`;
            const link = json.file?.url || json.url;
            if (!link) throw new Error('SkyUltra no devolvió URL')
            return sdk.reply.text(link);
        }

        if (option && isUploadServiceKey(option, services)) {
            const link = await services[option](media);
            return sdk.reply.text(normalizeLink(link));
        }

        const isTele = /image\/(png|jpe?g|gif)|video\/mp4/.test(mime);
        const link = await (isTele ? uploadImage : uploadFile)(media);
        return sdk.reply.text(link);
    } catch (e: unknown) {
        logError(e);
        throw sdk.content.renderMessage('converters.toUrl.uploadError', {
            services: Object.keys(services).concat(["sky"]).map((value) => `➔ ${sdk.usedPrefix}${sdk.command} ${value}`).join('\n'),
        });
    }
    }
});
