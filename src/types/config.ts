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
    welcomeConfigId?: number | null;
    welcome: boolean;
    detect: boolean;
    antifake: boolean;
    antilink: boolean;
    antilink2: boolean;
    virusTotal: boolean;
    autoresponder: boolean;
    autoresponderMode?: AccessMode | null;
    autoresponderTrigger?: AutoresponderTrigger | null;
    gamesAccessMode?: AccessMode | null;
    toolsAccessMode?: AccessMode | null;
    rpgAccessMode?: AccessMode | null;
    downloadsAccessMode?: AccessMode | null;
    searchAccessMode?: AccessMode | null;
    stickersAccessMode?: AccessMode | null;
    convertersAccessMode?: AccessMode | null;
    funAccessMode?: AccessMode | null;
    modohorny: boolean;
    nsfwAccessMode?: AccessMode | null;
    audios: boolean;
    nsfw_horario?: string | null;
    antiStatus: boolean;
    modoadmin: boolean;
    photowelcome: boolean;
    welcomeRegisteredBy?: string | null;
    welcomeHidetag: boolean;
    welcomeHidetagMode?: GreetingHidetagMode | null;
    welcomeGroupPhoto: boolean;
    bye: boolean;
    byeConfigId?: number | null;
    byeRegisteredBy?: string | null;
    byeHidetag: boolean;
    byeHidetagMode?: GreetingHidetagMode | null;
    byeGroupPhoto: boolean;
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
    autoAcceptMode?: AutoAcceptMode | null;
    botAccessMode?: AccessMode | null;
    messageLogging: boolean;
    // allow custom welcome/bye texts
    swelcome?: string | null;
    sbye?: string | null;
}

export type AutoAcceptMode =
    | 'off'
    | 'on'
    | 'on_hidetag_admin'
    | 'on_hidetag_all'
    | 'off_hidetag_admin'
    | 'off_hidetag_all';

export type GreetingHidetagMode = 'off' | 'admin' | 'all';

export type AccessMode = 'all' | 'admin' | 'superadmin' | 'owner';
export type AutoresponderTrigger = 'mention' | 'all';

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
    roleDescription?: string | null;
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
