export type BotInstanceType = 'main' | 'subbot';
export type SubbotMode = 'public' | 'private';
export type SubbotBooleanFlag = 'anti_private' | 'anti_call' | 'privacy' | 'prestar';

export interface SubbotConfig {
    id?: string;
    instanceType?: BotInstanceType;
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
    main: number;
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
};

export function cleanSubbotId(botId: string): string {
    return botId.replace(/:\d+/, '');
}
