import {logError} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import {listGroupMessageActivity, listGroupMessageCounts} from '../../services/chat.service.js';
import {getGroupSettings, setGroupBooleanFlag} from '../../services/group-settings.service.js';
import {cleanJid} from '../../utils/jid.js';
import {resolveMention} from '../../utils/mention.js';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type ParticipantLike = {
    id: string
    jid?: string
    lid?: string
    phoneNumber?: string
    participantAlt?: string
    admin?: 'admin' | 'superadmin' | null
}

type GhostMember = {
    id: string
    tag: string
    mentionJid: string
    messages: number
    lastMessageAt: Date
    isAdmin: boolean
    isBot: boolean
}

type MessageActivityRow = {
    user_id: string
    message_count: number
    last_message_at: Date | null
}

const TOP_INACTIVE_PAGE_SIZE = 50;

/** Normaliza un JID para comparar: quita el puerto (:XX) y pasa a minúsculas. */
function normJid(jid: string | undefined | null): string {
    return cleanJid(String(jid || '')).toLowerCase();
}

/** Recolecta todas las variantes de JID conocidas de un participante. */
function participantJids(p: ParticipantLike): Set<string> {
    const jids = new Set<string>();
    for (const v of [p?.id, p?.jid, p?.lid, p?.phoneNumber, p?.participantAlt]) {
        const c = normJid(v);
        if (c) jids.add(c);
    }
    return jids;
}

function parseTopInactivePage(command: string): number {
    const match = /^topinactive(\d*)$/i.exec(command);
    if (!match) return 1;
    const page = Number(match[1] || '1');
    return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function formatShortDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
}

function formatPhoneNumber(member: GhostMember): string {
    const digits = member.mentionJid.split('@')[0].replace(/[^\d]/g, '') || member.tag.replace(/[^\d]/g, '');
    return digits ? `+${digits}` : member.tag;
}

function getActivityReferenceDate(rows: MessageActivityRow[]): Date {
    const timestamps = rows
        .map(row => row.last_message_at?.getTime() || 0)
        .filter(timestamp => timestamp > 0);
    if (!timestamps.length) return new Date();
    return new Date(Math.min(...timestamps));
}

function buildMemberData(
    participants: ParticipantLike[],
    activityRows: MessageActivityRow[],
    botJid: string,
    botLid: string,
    fallbackDate: Date,
): GhostMember[] {
    const activityByJid = new Map<string, {messages: number; lastMessageAt: Date | null}>();
    for (const row of activityRows) {
        const key = normJid(row.user_id);
        if (!key) continue;

        const previous = activityByJid.get(key);
        const messages = (previous?.messages || 0) + (Number(row.message_count) || 0);
        const lastMessageAt = [previous?.lastMessageAt, row.last_message_at]
            .filter((date): date is Date => date instanceof Date)
            .sort((a, b) => b.getTime() - a.getTime())[0] || null;
        activityByJid.set(key, {messages, lastMessageAt});
    }

    return participants.map(mem => {
        const jids = participantJids(mem);
        const resolved = resolveMention(mem.id || '', participants);
        const resolvedJid = normJid(resolved.mentionJid);
        if (resolvedJid) jids.add(resolvedJid);

        let messages = 0;
        let lastMessageAt: Date | null = null;
        for (const jid of jids) {
            const activity = activityByJid.get(jid);
            if (!activity) continue;
            messages += activity.messages;
            if (activity.lastMessageAt && (!lastMessageAt || activity.lastMessageAt > lastMessageAt)) {
                lastMessageAt = activity.lastMessageAt;
            }
        }

        const isAdmin = mem.admin === 'admin' || mem.admin === 'superadmin';
        const isBot = jids.has(botJid) || jids.has(botLid);

        return {
            id: mem.id,
            tag: resolved.tag,
            mentionJid: resolved.mentionJid,
            messages,
            lastMessageAt: lastMessageAt || fallbackDate,
            isAdmin,
            isBot,
        };
    });
}

function sortInactiveMembers(members: GhostMember[]): GhostMember[] {
    return [...members].sort((a, b) => {
        const byDate = a.lastMessageAt.getTime() - b.lastMessageAt.getTime();
        if (byDate !== 0) return byDate;
        const byMessages = a.messages - b.messages;
        if (byMessages !== 0) return byMessages;
        return a.mentionJid.localeCompare(b.mentionJid);
    });
}

export default defineSdkPlugin({
    help: ['fantasmas', 'kickfantasmas', 'topinactive'],
    tags: ['group'],
    command: /^(fantasmas|kickfantasmas|topinactive\d*)$/i,
    admin: true,
    botAdmin: true,
    group: true,
    register: true,
    async execute(m, {sdk}) {
    try {
        if (!Array.isArray(sdk.participants) || !sdk.participants.length) {
            return sdk.reply.message('group.ghosts.missingParticipants');
        }

        // 1. Conteo de mensajes del grupo, indexado por JID normalizado.
        const activityRows = await listGroupMessageActivity(sdk.chatId);
        const counts = activityRows.length ? activityRows : await listGroupMessageCounts(sdk.chatId)
            .then(rows => rows.map(row => ({...row, last_message_at: null})));

        const botJid = normJid(sdk.conn.user?.id);
        const botLid = normJid(sdk.conn.user?.lid);
        const fallbackDate = getActivityReferenceDate(counts);

        // 2. Por cada participante, sumar mensajes de TODAS sus variantes de JID.
        //    (messages.user_id puede estar guardado como phone JID o como @lid;
        //     el participante del metadata expone ambas formas).
        const memberData = buildMemberData(sdk.participants as ParticipantLike[], counts, botJid, botLid, fallbackDate);

        // 3. Fantasmas: 0 ó 1 mensaje, que no sean admins ni el propio bot.
        let sum = sdk.text ? parseInt(sdk.text) : memberData.length;
        if (isNaN(sum) || sum <= 0) sum = memberData.length;
        const sider = memberData
            .slice(0, sum)
            .filter(mem => mem.messages <= 1 && !mem.isAdmin && !mem.isBot);
        const total = sider.length;

        switch (sdk.command.toLowerCase()) {
            case 'fantasmas': {
                if (total === 0) return sdk.reply.message('group.ghosts.noGhosts');
                let teks = sdk.content.renderMessage('group.ghosts.listHeader', {
                    group: sdk.metadata?.subject || sdk.content.message('group.ghosts.unknownGroup'),
                    members: memberData.length,
                    inactive: total
                });
                teks += sider.map(v => sdk.content.renderMessage('group.ghosts.listItem', {
                    tag: v.tag,
                    messages: v.messages
                })).join('\n');
                teks += sdk.content.message('group.ghosts.listFooter');
                await sdk.sendMessage({
                    text: teks,
                    contextInfo: {mentionedJid: sider.map(v => v.mentionJid)}
                });
                break;
            }

            case 'kickfantasmas': {
                if (total === 0) return sdk.reply.message('group.ghosts.noGhosts');
                let kickTeks = sdk.content.renderMessage('group.ghosts.kickHeader', {
                    group: sdk.metadata?.subject || sdk.content.message('group.ghosts.unknownGroup'),
                    members: memberData.length,
                    inactive: total
                });
                kickTeks += sider.map(v => `${v.tag}`).join('\n');
                kickTeks += sdk.content.message('group.ghosts.kickFooter');
                await sdk.sendMessage({
                    text: kickTeks,
                    contextInfo: {mentionedJid: sider.map(v => v.mentionJid)}
                });

                // Silenciar el welcome durante la purga (el ?? evita el bug de '|| true').
                const chatSettings = await getGroupSettings(sdk.chatId) || {};
                const originalWelcome = chatSettings.welcome ?? true;
                await setGroupBooleanFlag(sdk.chatId, 'welcome', false);
                await delay(20000);
                try {
                    for (const user of sider) {
                        if (user.isBot) continue;
                        await sdk.conn.groupParticipantsUpdate(sdk.chatId, [user.id], 'remove')
                            .catch((e: unknown) => logError('❌ Error expulsando fantasma:', e));
                        await delay(10000);
                    }
                } finally {
                    await setGroupBooleanFlag(sdk.chatId, 'welcome', originalWelcome);
                }
                await sdk.reply.message('group.ghosts.completed');
                break;
            }

            default: {
                if (!/^topinactive\d*$/i.test(sdk.command)) break;
                const inactive = sortInactiveMembers(memberData.filter(mem => mem.messages <= 1 && !mem.isAdmin && !mem.isBot));
                if (inactive.length === 0) return sdk.reply.message('group.ghosts.noGhosts');

                const page = parseTopInactivePage(sdk.command);
                const totalPages = Math.ceil(inactive.length / TOP_INACTIVE_PAGE_SIZE);
                if (page > totalPages) {
                    return sdk.reply.message('group.ghosts.topInactive.emptyPage', {
                        page,
                        totalPages,
                    });
                }

                const showNumbers = /(^|\s)--number(\s|$)/i.test(sdk.text || '');
                const showDateOnly = /(^|\s)--date(\s|$)/i.test(sdk.text || '');
                const start = (page - 1) * TOP_INACTIVE_PAGE_SIZE;
                const pageItems = inactive.slice(start, start + TOP_INACTIVE_PAGE_SIZE);
                const nextCommand = page < totalPages ? `${sdk.usedPrefix || '.'}topinactive${page + 1}` : '-';
                let topText = sdk.content.renderMessage('group.ghosts.topInactive.header', {
                    group: sdk.metadata?.subject || sdk.content.message('group.ghosts.unknownGroup'),
                    page,
                    totalPages,
                    inactive: inactive.length,
                    nextCommand,
                });

                topText += pageItems.map((member, index) => {
                    const identity = showNumbers ? formatPhoneNumber(member) : member.tag;
                    const date = formatShortDate(member.lastMessageAt);
                    const detail = showDateOnly
                        ? sdk.content.renderMessage('group.ghosts.topInactive.dateDetail', {date})
                        : sdk.content.renderMessage('group.ghosts.topInactive.fullDetail', {
                            messages: member.messages,
                            date,
                        });
                    return sdk.content.renderMessage('group.ghosts.topInactive.item', {
                        position: start + index + 1,
                        identity,
                        detail,
                    });
                }).join('\n');
                topText += sdk.content.message('group.ghosts.topInactive.footer');

                await sdk.sendMessage({
                    text: topText,
                    contextInfo: showNumbers ? undefined : {mentionedJid: pageItems.map(member => member.mentionJid)}
                });
                break;
            }
        }
    } catch (err: unknown) {
        logError(err);
        await sdk.reply.message('group.ghosts.error');
    }
    }
});


;
