import chalk from 'chalk';
import type {GroupMetadata} from '@whiskeysockets/baileys';
import {logDebug, logInfo, logWarn} from '../lib/logger.js';
import {registerGroupAdmins} from '../services/group-role.service.js';

export async function syncStartupGroupAdmins(groupEntries: Array<[string, GroupMetadata]>): Promise<void> {
    if (!groupEntries.length) return;

    let syncedGroups = 0;
    let syncedAdmins = 0;

    for (const [groupId, metadata] of groupEntries) {
        try {
            const registeredAdmins = await registerGroupAdmins(groupId, metadata);
            syncedGroups += 1;
            syncedAdmins += registeredAdmins;
            logDebug(chalk.green(`[ROLES] ${registeredAdmins} admins sincronizados para "${metadata.subject || groupId}" al iniciar`));
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            logWarn(chalk.yellow(`[ROLES] No se pudieron sincronizar admins de ${metadata.subject || groupId}: ${message}`));
        }
    }

    logInfo(chalk.cyan(`[ROLES] Sincronizacion inicial completada: ${syncedAdmins} admins revisados en ${syncedGroups} grupos`));
}
