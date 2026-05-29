export interface BotInfo {
    wm: string;
    vs: string;
    packname: string;
    author: string;
    apis: string;
    apikey: string;
    fgmods: { url: string; key: string };
    neoxr: { url: string; key: string };
    img2: string | Buffer;
    img4: Buffer;
    yt: string;
    tiktok: string;
    md: string;
    fb: string;
    ig: string;
    nn: string;
    nn2: string;
    nn3: string;
    nn4: string;
    nn5: string;
    nn6: string;
    nna: string;
    nna2: string;
}

export interface SubbotConfig {
    id?: string;
    tipo?: string | null;
    name?: string | null;
    logo_url?: string | null;
    prefix: string[];
    mode: string;
    owners: string[];
    anti_private: boolean;
    anti_call: boolean;
    privacy?: boolean | null;
    prestar?: boolean | null;
}

export interface GroupSettings {
    group_id?: string;
    welcome: boolean;
    detect: boolean;
    antifake: boolean;
    antilink: boolean;
    antilink2: boolean;
    modohorny: boolean;
    audios: boolean;
    nsfw_horario?: string | null;
    antiStatus: boolean;
    modoadmin: boolean;
    photowelcome: boolean;
    photobye: boolean;
    autolevelup: boolean;
    sWelcome?: string | null;
    sBye?: string | null;
    sPromote?: string | null;
    sDemote?: string | null;
    sAutorespond?: string | null;
    banned: boolean;
    expired: number;
    memory_ttl: number;
    primary_bot?: string | null;
    // allow custom welcome/bye texts
    swelcome?: string | null;
    sbye?: string | null;
}

export interface Usuario {
    id: string;
    nombre?: string | null;
    registered: boolean;
    num?: string | null;
    lid?: string | null;
    banned: boolean;
    warn_pv: boolean;
    warn: number;
    warn_antiporn: number;
    warn_estado: number;
    edad?: number | null;
    money: number;
    limite: number;
    exp: number;
    banco: number;
    level: number;
    role: string;
    reg_time?: Date | null;
    serial_number?: string | null;
    sticker_packname?: string | null;
    sticker_author?: string | null;
    ry_time: number;
    lastwork: number;
    lastmiming: number;
    lastclaim: number;
    dailystreak: number;
    lastcofre: number;
    lastrob: number;
    lastslut: number;
    timevot: number;
    wait: number;
    crime: number;
    marry?: string | null;
    marry_request?: string | null;
    razon_ban?: string | null;
    avisos_ban: number;
    gender?: string | null;
    birthday?: string | null;
}
