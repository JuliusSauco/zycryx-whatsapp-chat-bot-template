import type {SubbotConfig} from '../types/config.js';
import {getCachedSubbotConfig, invalidateSubbotConfig, setCachedSubbotConfig} from '../lib/db-cache.js';
import {repositories} from './data-source.js';

const defaultConfig: SubbotConfig = {
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

export async function getSubbotConfig(botId: string): Promise<SubbotConfig> {
    const cleanId = botId.replace(/:\d+/, '');
    const cached = getCachedSubbotConfig<SubbotConfig>(cleanId);
    if (cached) return cached;

    try {
        const config = await repositories.subbots.findConfig(cleanId);
        const resolved = config ?? {...defaultConfig};
        setCachedSubbotConfig(cleanId, resolved);
        return resolved;
    } catch (err) {
        console.error('Error obteniendo configuracion del subbot:', err);
        return {...defaultConfig};
    }
}

export async function listSubbotConfigs(tipo?: string | null): Promise<SubbotConfig[]> {
    return repositories.subbots.listConfigs(tipo);
}

export async function countSubbotsByType(): Promise<{total: number; oficiales: number; subbots: number}> {
    return repositories.subbots.countByType();
}

export function updateSubbotTipo(botId: string, tipo: string): void {
    const cleanId = botId.replace(/:\d+/, '');
    repositories.subbots.updateTipo(cleanId, tipo)
        .then(() => invalidateSubbotConfig(cleanId))
        .catch(console.error);
}

export async function setSubbotBooleanFlag(botId: string, flag: string, value: boolean): Promise<void> {
    const cleanId = botId.replace(/:\d+/, '');
    await repositories.subbots.setBooleanFlag(cleanId, flag, value);
    invalidateSubbotConfig(cleanId);
}

export async function setSubbotName(botId: string, name: string): Promise<void> {
    const cleanId = botId.replace(/:\d+/, '');
    await repositories.subbots.setName(cleanId, name);
    invalidateSubbotConfig(cleanId);
}

export async function setSubbotLogoUrl(botId: string, logoUrl: string): Promise<void> {
    const cleanId = botId.replace(/:\d+/, '');
    await repositories.subbots.setLogoUrl(cleanId, logoUrl);
    invalidateSubbotConfig(cleanId);
}

export async function setSubbotMode(botId: string, mode: string): Promise<void> {
    const cleanId = botId.replace(/:\d+/, '');
    await repositories.subbots.setMode(cleanId, mode);
    invalidateSubbotConfig(cleanId);
}

export async function setSubbotPrefix(botId: string, prefix: string[]): Promise<void> {
    const cleanId = botId.replace(/:\d+/, '');
    await repositories.subbots.setPrefix(cleanId, prefix);
    invalidateSubbotConfig(cleanId);
}

export async function setSubbotOwners(botId: string, owners: string[]): Promise<void> {
    const cleanId = botId.replace(/:\d+/, '');
    await repositories.subbots.setOwners(cleanId, owners);
    invalidateSubbotConfig(cleanId);
}
