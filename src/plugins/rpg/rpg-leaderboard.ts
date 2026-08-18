import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import type {UserWallet} from '../../domain/users.js';
import {listWallets} from '../../services/wallet.service.js';
import {formatCompactNumber} from '../../utils/format.js';
import {createExpiringMap} from '../../lib/ephemeral-state.js';
import type {proto} from '@whiskeysockets/baileys';
import {findLeaderboardPosition, resolveLeaderboardIdentity} from './rpg-leaderboard.helpers.js';

type RankedWallet = UserWallet & {jid: string};
type RankingProp = 'exp' | 'limite';

interface CooldownEntry {
    lastUsed: number;
    rankingMessage: proto.WebMessageInfo | null;
}

const COOLDOWN_DURATION = 180000; // 3 min
const cooldowns = createExpiringMap<CooldownEntry>({ttlMs: COOLDOWN_DURATION});

export default defineSdkPlugin({
    help: ['leaderboard'],
    tags: ['rpg'],
    command: ['leaderboard', 'lb'],
    register: true,
    async execute(m, {conn, args, sdk, participants}) {
        const chatId = m.chat;
        const now = Date.now();
        const chatData = cooldowns.get(chatId) || {lastUsed: 0, rankingMessage: null};
        const timeLeft = COOLDOWN_DURATION - (now - chatData.lastUsed);

        if (timeLeft > 0) {
            await conn.reply(m.chat, sdk.content.renderMessage('rpg.leaderboard.cooldown', {
                user: m.sender.split('@')[0],
            }), chatData.rankingMessage || m, {mentions: [m.sender]});
            return;
        }

        const users: RankedWallet[] = (await listWallets()).map(u => ({...u, jid: u.id}));
        const sortedExp = [...users].sort((a, b) => b.exp - a.exp);
        const sortedLim = [...users].sort((a, b) => b.limite - a.limite);

        const len = args[0] ? Math.min(100, Math.max(parseInt(args[0]), 10)) : Math.min(10, sortedExp.length);

        const mentions = new Set<string>();
        const format = (list: RankedWallet[], prop: RankingProp, icon: string) =>
            list.slice(0, len).map((user, i) => {
                const {[prop]: value} = user;
                const identity = resolveLeaderboardIdentity(user, participants);
                if (identity.mentionJid) mentions.add(identity.mentionJid);
                return sdk.content.renderMessage('rpg.leaderboard.line', {
                    position: i + 1,
                    user: identity.label,
                    compactValue: formatCompactNumber(value),
                    value,
                    icon,
                });
            }).join('\n');

        const text = sdk.content.renderMessage('rpg.leaderboard.caption', {
            len,
            expPosition: findLeaderboardPosition(sortedExp, [m.sender, m.lid]),
            expTotal: sortedExp.length,
            expRanking: format(sortedExp, 'exp', '⚡'),
            diamondPosition: findLeaderboardPosition(sortedLim, [m.sender, m.lid]),
            diamondTotal: sortedLim.length,
            diamondRanking: format(sortedLim, 'limite', '💎'),
        }).trim();

        const rankingMessage = await sdk.reply.text(text, null, {mentions: [...mentions]});
        cooldowns.set(chatId, {lastUsed: now, rankingMessage});
    },
});
