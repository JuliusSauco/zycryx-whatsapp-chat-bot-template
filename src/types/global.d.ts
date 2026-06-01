import type {WASocket} from '@whiskeysockets/baileys';
import type {BotInfo} from './config.js';
import type {Plugin} from './plugin.js';

declare global {
    var conn: WASocket;
    var conns: (WASocket & { userId?: string; uptime?: number; isInit?: boolean })[];
    var plugins: Record<string, Plugin>;
    var owner: string[][];
    var info: BotInfo;
    var multiplier: number;
    var videoList: Array<{from: string; urls: string[]}>;

    interface Array<T> {
        getRandom(): T;
    }
}

export {};
