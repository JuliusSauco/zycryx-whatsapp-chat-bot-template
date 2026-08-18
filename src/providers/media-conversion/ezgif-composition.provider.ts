import {FormData} from 'formdata-node';
import axios from 'axios';
interface OverlayFields {
    file: Buffer | Uint8Array;
    filename: string;
    overlay: { file: Buffer; filename: string };
    x?: number;
    y?: number;
}

interface RenderFileEntry {
    data: Buffer;
    name: string;
    delay?: number;
}

interface RenderFields {
    type: string;
    files: RenderFileEntry[];
    delay?: number;
    dfrom?: number;
    dto?: number;
    'fader-delay'?: number;
    'fader-frames'?: number;
    loop?: number;

    [key: string]: unknown;
}

interface MultipartFormData {
    append(name: string, value: unknown, options?: {filename?: string}): void;
}

interface ResponseWithRedirect {
    request?: {
        res?: {
            responseUrl?: string;
        };
    };
}

const appendMultipart = (form: FormData, name: string, value: unknown, filename: string): void => {
    (form as unknown as MultipartFormData).append(name, value, {filename});
};

const getRedirectUrl = (response: unknown): string => String((response as ResponseWithRedirect)?.request?.res?.responseUrl || '');

const throwAxiosError = (error: unknown): never => {
    if (axios.isAxiosError(error) && error.response) {
        const data = typeof error.response.data === 'string' && error.response.data.length
            ? error.response.data
            : "Try again. If it continues, report to the creator.";
        throw new Error(JSON.stringify({
            statusCode: error.response.status,
            data,
        }, null, 4));
    }
    throw new Error("Oops, something unknown happened! :(");
};
async function overlay(fields: OverlayFields): Promise<string> {
    let form = new FormData();
    let form_over = new FormData();
    appendMultipart(form, 'new-image', fields.file, fields.filename);

    let link = await axios({
        method: 'post',
        url: 'https://ezgif.com/overlay',
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        data: form
    }).catch(throwAxiosError);

    let redir = getRedirectUrl(link);
    if (!redir) throw new Error(`Oops! Something unknown happened!`);
    let id = redir.split('/')[redir.split('/').length - 1];

    appendMultipart(form_over, 'new-overlay', Buffer.from(fields.overlay.file), `${fields.overlay.filename}`);
    form_over.append('overlay', 'Upload image!');

    let link_over = await axios({
        method: 'post',
        url: redir,
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        data: form_over
    }).catch(throwAxiosError);

    let redir_over = getRedirectUrl(link_over);
    if (!redir_over) throw new Error(`Oops! Something unknown happened!`);
    let id_over = redir_over.split('/')[redir_over.split('/').length - 1];

    let image = await axios({
        method: 'post',
        url: `${redir_over}?ajax=true`,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: new URLSearchParams({
            file: id,
            'overlay-file': id_over,
            posX: String(fields.x || 0),
            posY: String(fields.y || 0)
        })
    }).catch(throwAxiosError);

    let img_url = `https:${(image?.data?.toString()?.split('<img src="')?.[1]?.split('" style="width:')?.[0])?.replace('https:', '')}`;
    if (img_url.includes('undefined')) throw new Error(`Something unknown happened here... please report to the creator`);

    return img_url;
}

const linksRender: Record<string, string> = {
    "gif": "https://ezgif.com/maker",
    "webp": "https://ezgif.com/webp-maker",
    "apng": "https://ezgif.com/apng-maker",
    "avif": "https://ezgif.com/avif-maker"
};

async function render(fields: RenderFields): Promise<string> {
    let type = linksRender?.[fields?.type];
    let form = new FormData();
    if (!type) throw new Error(`Invalid rendering type "${fields?.type}"`);
    const default_: Record<string, unknown> & {'delays[]': number[]; 'files[]': string[]} = {
        delay: 20,
        dfrom: 1,
        dto: 5,
        'fader-delay': 6,
        'fader-frames': 10,
        loop: 0,
        'delays[]': [] as number[],
        'files[]': [] as string[]
    };
    const merged = {
        ...default_,
        ...fields
    } as Record<string, unknown> & {'delays[]': number[]; 'files[]': string[]};

    for (let i = 0; i < fields.files.length; i++) {
        if (!fields.files[i].data) throw new Error(`File buffer not provided for files[${i}]`);
        if (!fields.files[i].name) throw new Error(`File name not provided for files[${i}]`);
        appendMultipart(form, 'files[]', fields.files[i].data, fields.files[i].name);
        merged['delays[]'].push(fields.files[i].delay ?? Number(merged.delay || 0));
    }

    delete merged.type;
    delete merged.files;

    form.append('msort', '1');
    form.append('upload', 'Upload and make a GIF!');

    let link = await axios({
        method: 'post',
        url: type,
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        data: form
    }).catch(throwAxiosError);

    let redir = getRedirectUrl(link);
    let html = await axios.get(redir);
    merged.file = redir.split('/')[redir.split('/').length - 1];
    html.data.toString().split('(drag and drop frames to change order)')[1].split('<p class="options"><strong>Toggle a range of frames:</strong>')[0].split('<span class="frame-tools">').slice(0, -1).map((i: string) => i.split('value="')[1].split('" name="files[]"')[0]).forEach((e: string) => {
        merged['files[]'].push(e)
    });
    let image = await axios({
        method: 'post',
        url: `${redir}?ajax=true`,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: new URLSearchParams(merged as Record<string, string>)
    }).catch(throwAxiosError);

    let img_url = `https:${(image?.data?.toString()?.split('<img src="')?.[1]?.split('" style="width')?.[0])?.replace('https:', '')}`;
    if (img_url.includes('undefined')) throw new Error(`Something unknown happened here... please report to the creator`);
    return img_url;
}

export {overlay, render};
