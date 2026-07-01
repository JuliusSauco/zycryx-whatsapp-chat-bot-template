export type SubbotType = 'oficial' | 'subbot' | 'null' | string;
export type SubbotMode = 'public' | 'private' | string;
export type SubbotBooleanFlag = 'anti_private' | 'anti_call' | 'privacy' | 'prestar';

export interface SubbotConfig {
    id?: string;
    tipo?: SubbotType | null;
    name?: string | null;
    logo_url?: string | null;
    prefix: string[];
    mode: SubbotMode;
    owners: string[];
    anti_private: boolean;
    anti_call: boolean;
    privacy?: boolean | null;
    prestar?: boolean | null;
}

export interface SubbotTypeCounts {
    total: number;
    oficiales: number;
    subbots: number;
}

export const DEFAULT_SUBBOT_CONFIG: SubbotConfig = {
    prefix: ['/', '.', '#'],
    mode: 'public',
    anti_private: true,
    anti_call: false,
    owners: [],
    name: null,
    logo_url: null,
    privacy: null,
    prestar: null,
    tipo: null,
};

export function cleanSubbotId(botId: string): string {
    return botId.replace(/:\d+/, '');
}
