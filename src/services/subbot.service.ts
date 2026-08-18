import {logError} from '../lib/logger.js';
import type {BotInstanceType, SubbotBooleanFlag, SubbotConfig, SubbotTypeCounts} from '../domain/subbots.js';
import {cleanSubbotId, DEFAULT_SUBBOT_CONFIG} from '../domain/subbots.js';
import {DISTRIBUTED_DB_CACHE, getCachedSubbotConfig, invalidateSubbotConfig, setCachedSubbotConfig} from '../lib/db-cache.js';
import {getRedisJson, setRedisJson} from '../lib/redis-runtime.js';
import {repositories} from './data-source.js';

export async function getSubbotConfig(botId: string): Promise<SubbotConfig> {
    const cleanId = cleanSubbotId(botId);
    const cached = getCachedSubbotConfig<SubbotConfig>(cleanId);
    if (cached) return cached;

    const distributed = await getRedisJson<SubbotConfig>(DISTRIBUTED_DB_CACHE.subbot, cleanId);
    if (distributed.value) {
        setCachedSubbotConfig(cleanId, distributed.value);
        return distributed.value;
    }

    try {
        const config = await repositories.subbots.findConfig(cleanId);
        const resolved = config ?? {...DEFAULT_SUBBOT_CONFIG};
        setCachedSubbotConfig(cleanId, resolved);
        await setRedisJson(DISTRIBUTED_DB_CACHE.subbot, cleanId, resolved);
        return resolved;
    } catch (err) {
        logError('Error obteniendo configuracion del subbot:', err);
        return {...DEFAULT_SUBBOT_CONFIG};
    }
}

export function findBotInstanceIdByJid(botJid: string): Promise<string | null> {
    return repositories.subbots.findInstanceIdByJid(cleanSubbotId(botJid));
}

export function findBotJidByInstanceId(botId: string): Promise<string | null> {
    return repositories.subbots.findBotJidByInstanceId(cleanSubbotId(botId));
}

export async function listSubbotConfigs(instanceType?: BotInstanceType | null): Promise<SubbotConfig[]> {
    return repositories.subbots.listConfigs(instanceType);
}

export async function countSubbotsByType(): Promise<SubbotTypeCounts> {
    return repositories.subbots.countByType();
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
