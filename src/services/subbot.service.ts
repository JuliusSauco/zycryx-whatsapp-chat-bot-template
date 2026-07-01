import {logError} from '../lib/logger.js';
import type {SubbotBooleanFlag, SubbotConfig, SubbotTypeCounts} from '../domain/subbots.js';
import {cleanSubbotId, DEFAULT_SUBBOT_CONFIG} from '../domain/subbots.js';
import {getCachedSubbotConfig, invalidateSubbotConfig, setCachedSubbotConfig} from '../lib/db-cache.js';
import {repositories} from './data-source.js';

export async function getSubbotConfig(botId: string): Promise<SubbotConfig> {
    const cleanId = cleanSubbotId(botId);
    const cached = getCachedSubbotConfig<SubbotConfig>(cleanId);
    if (cached) return cached;

    try {
        const config = await repositories.subbots.findConfig(cleanId);
        const resolved = config ?? {...DEFAULT_SUBBOT_CONFIG};
        setCachedSubbotConfig(cleanId, resolved);
        return resolved;
    } catch (err) {
        logError('Error obteniendo configuracion del subbot:', err);
        return {...DEFAULT_SUBBOT_CONFIG};
    }
}

export async function listSubbotConfigs(tipo?: string | null): Promise<SubbotConfig[]> {
    return repositories.subbots.listConfigs(tipo);
}

export async function countSubbotsByType(): Promise<SubbotTypeCounts> {
    return repositories.subbots.countByType();
}

export function updateSubbotTipo(botId: string, tipo: string): void {
    const cleanId = cleanSubbotId(botId);
    repositories.subbots.updateTipo(cleanId, tipo)
        .then(() => invalidateSubbotConfig(cleanId))
        .catch(logError);
}

export async function setSubbotBooleanFlag(botId: string, flag: SubbotBooleanFlag, value: boolean): Promise<void> {
    const cleanId = cleanSubbotId(botId);
    await repositories.subbots.setBooleanFlag(cleanId, flag, value);
    invalidateSubbotConfig(cleanId);
}

export async function setSubbotName(botId: string, name: string): Promise<void> {
    const cleanId = cleanSubbotId(botId);
    await repositories.subbots.setName(cleanId, name);
    invalidateSubbotConfig(cleanId);
}

export async function setSubbotLogoUrl(botId: string, logoUrl: string): Promise<void> {
    const cleanId = cleanSubbotId(botId);
    await repositories.subbots.setLogoUrl(cleanId, logoUrl);
    invalidateSubbotConfig(cleanId);
}

export async function setSubbotMode(botId: string, mode: string): Promise<void> {
    const cleanId = cleanSubbotId(botId);
    await repositories.subbots.setMode(cleanId, mode);
    invalidateSubbotConfig(cleanId);
}

export async function setSubbotPrefix(botId: string, prefix: string[]): Promise<void> {
    const cleanId = cleanSubbotId(botId);
    await repositories.subbots.setPrefix(cleanId, prefix);
    invalidateSubbotConfig(cleanId);
}

export async function setSubbotOwners(botId: string, owners: string[]): Promise<void> {
    const cleanId = cleanSubbotId(botId);
    await repositories.subbots.setOwners(cleanId, owners);
    invalidateSubbotConfig(cleanId);
}
