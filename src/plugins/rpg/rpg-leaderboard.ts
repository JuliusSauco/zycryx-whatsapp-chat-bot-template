import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import type {UserWallet} from '../../ports/repositories.js'
import {listWallets} from '../../services/wallet.service.js'
import {formatCompactNumber} from '../../utils/format.js'
import {createExpiringMap} from '../../lib/ephemeral-state.js'
import type {proto} from '@whiskeysockets/baileys'

type RankedWallet = UserWallet & {jid: string}
type RankingProp = 'exp' | 'limite' | 'money' | 'banco'

interface CooldownEntry {
    lastUsed: number;
    rankingMessage: proto.WebMessageInfo | null;
}

const COOLDOWN_DURATION = 180000 // 3 min
const cooldowns = createExpiringMap<CooldownEntry>({ttlMs: COOLDOWN_DURATION})

export default defineSdkPlugin({
    help: ['leaderboard'],
    tags: ['econ'],
    command: ['leaderboard', 'lb'],
    register: true,
    async execute(m, {conn, args, sdk}) {
    const chatId = m.chat
    const now = Date.now()
    const chatData = cooldowns.get(chatId) || {lastUsed: 0, rankingMessage: null}
    const timeLeft = COOLDOWN_DURATION - (now - chatData.lastUsed)

    if (timeLeft > 0) {
        await conn.reply(m.chat, sdk.content.renderMessage('rpg.leaderboard.cooldown', {
            user: m.sender.split('@')[0]
        }), chatData.rankingMessage || m)
        return
    }

    const users: RankedWallet[] = (await listWallets()).map(u => ({...u, jid: u.id}))
    const sortedExp = [...users].sort((a, b) => b.exp - a.exp)
    const sortedLim = [...users].sort((a, b) => b.limite - a.limite)
    const sortedMoney = [...users].sort((a, b) => b.money - a.money)
    const sortedBanc = [...users].sort((a, b) => b.banco - a.banco)

    const len = args[0] ? Math.min(100, Math.max(parseInt(args[0]), 10)) : Math.min(10, sortedExp.length)

    const format = (list: RankedWallet[], prop: RankingProp, icon: string) =>
        list.slice(0, len).map(({jid, [prop]: value}, i) =>
            sdk.content.renderMessage('rpg.leaderboard.line', {
                position: i + 1,
                user: jid.split('@')[0],
                compactValue: formatCompactNumber(value),
                value,
                icon
            })).join('\n')

    const text = sdk.content.renderMessage('rpg.leaderboard.caption', {
        len,
        expPosition: sortedExp.findIndex(u => u.jid === m.sender) + 1,
        expTotal: sortedExp.length,
        expRanking: format(sortedExp, 'exp', '⚡'),
        diamondPosition: sortedLim.findIndex(u => u.jid === m.sender) + 1,
        diamondTotal: sortedLim.length,
        diamondRanking: format(sortedLim, 'limite', '💎'),
        moneyPosition: sortedMoney.findIndex(u => u.jid === m.sender) + 1,
        moneyTotal: sortedMoney.length,
        moneyRanking: format(sortedMoney, 'money', '🪙'),
        bankPosition: sortedBanc.findIndex(u => u.jid === m.sender) + 1,
        bankTotal: sortedBanc.length,
        bankRanking: format(sortedBanc, 'banco', '💵')
    }).trim()

    const rankingMessage = await sdk.reply.text(text, null, {mentions: conn.parseMention(text)})
    cooldowns.set(chatId, {lastUsed: now, rankingMessage})
    }
})
