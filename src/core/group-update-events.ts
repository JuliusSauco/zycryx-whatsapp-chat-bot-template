import './config.js';
import chalk from 'chalk';
import {logError} from '../lib/logger.js';
import {getSubbotConfig} from '../services/subbot.service.js';
import {isCurrentBotCreator} from './group-bot-identity.js';
import {getEventGroupSettings} from './group-event-settings.js';
import {refreshEventGroupMetadata} from './group-metadata.js';
import {buildGroupUpdateMessage} from './group-update-notifications.js';
import type {EventConn, GroupUpdate} from './group-event-types.js';

export async function groupsUpdate(conn: EventConn, {id, subject, desc, picture}: GroupUpdate): Promise<void> {
    try {
        const botId = conn.user?.id;
        const botConfig = await getSubbotConfig(botId || '');
        const modo = botConfig.mode || 'public';
        const isCreator = isCurrentBotCreator(conn);
        const settings = await getEventGroupSettings(id);

        if (modo === 'private' && !isCreator) return;
        const {metadata, previousMetadata} = await refreshEventGroupMetadata(conn, id);
        const message = buildGroupUpdateMessage({id, subject, desc, picture}, metadata, previousMetadata);

        if (message && settings.detect) {
            await conn.sendMessage(id, {text: message});
        }
    } catch (err: unknown) {
        logError(chalk.red('❌ Error en groupsUpdate:'), err);
    }
}
