import chalk from 'chalk';
import {logError} from '../lib/logger.js';
import {getSubbotConfig} from '../services/subbot.service.js';
import type {WASocket} from '@whiskeysockets/baileys';

export interface CallUpdate {
    from: string;
}

export async function callUpdate(conn: WASocket, call: CallUpdate): Promise<void> {
    try {
        const callerId = call.from;
        const botConfig = await getSubbotConfig(conn.user?.id || '');
        if (!botConfig.anti_call) return;
        await conn.sendMessage(callerId, {
            text: `🚫 Está prohibido hacer llamadas, serás bloqueado...`
        });
        await conn.updateBlockStatus(callerId, 'block');
    } catch (err: unknown) {
        logError(chalk.red('❌ Error en callUpdate:'), err);
    }
}
