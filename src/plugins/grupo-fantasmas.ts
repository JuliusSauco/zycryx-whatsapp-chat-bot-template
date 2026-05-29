import {definePlugin} from '../core/define-plugin.js'
import {listGroupMessageCounts} from '../services/chat.service.js';
import {getGroupSettings, setGroupBooleanFlag} from '../services/group-settings.service.js';
import {cleanJid} from '../utils/jid.js';
import {resolveMention} from '../utils/mention.js';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Normaliza un JID para comparar: quita el puerto (:XX) y pasa a minúsculas. */
function normJid(jid: any): string {
    return cleanJid(String(jid || '')).toLowerCase();
}

/** Recolecta todas las variantes de JID conocidas de un participante. */
function participantJids(p: any): Set<string> {
    const jids = new Set<string>();
    for (const v of [p?.id, p?.jid, p?.lid, p?.phoneNumber, p?.participantAlt]) {
        const c = normJid(v);
        if (c) jids.add(c);
    }
    return jids;
}

export default definePlugin({
    help: ['fantasmas', 'kickfantasmas'],
    tags: ['group'],
    command: /^(fantasmas|kickfantasmas)$/i,
    admin: true,
    botAdmin: true,
    group: true,
    register: true,
    async execute(m, {conn, text, participants, command, metadata}) {
    try {
        if (!Array.isArray(participants) || !participants.length) {
            return m.reply('⚠️ No pude obtener la lista de participantes del grupo.');
        }

        // 1. Conteo de mensajes del grupo, indexado por JID normalizado.
        const counts = await listGroupMessageCounts(m.chat);
        const countByJid = new Map<string, number>();
        for (const row of counts) {
            const key = normJid(row.user_id);
            if (key) countByJid.set(key, (countByJid.get(key) || 0) + (Number(row.message_count) || 0));
        }

        const botJid = normJid(conn.user?.id);
        const botLid = normJid(conn.user?.lid);

        // 2. Por cada participante, sumar mensajes de TODAS sus variantes de JID.
        //    (messages.user_id puede estar guardado como phone JID o como @lid;
        //     el participante del metadata expone ambas formas).
        const memberData = participants.map((mem: any) => {
            const jids = participantJids(mem);
            // Resolver lid → phone JID y agregarlo también al set de búsqueda.
            const resolved = resolveMention(mem.id || '', participants);
            const resolvedJid = normJid(resolved.mentionJid);
            if (resolvedJid) jids.add(resolvedJid);

            let messages = 0;
            for (const j of jids) messages += countByJid.get(j) || 0;

            const isAdmin = mem.admin === 'admin' || mem.admin === 'superadmin';
            const isBot = jids.has(botJid) || jids.has(botLid);

            return {id: mem.id, tag: resolved.tag, mentionJid: resolved.mentionJid, messages, isAdmin, isBot};
        });

        // 3. Fantasmas: 0 ó 1 mensaje, que no sean admins ni el propio bot.
        let sum = text ? parseInt(text) : memberData.length;
        if (isNaN(sum) || sum <= 0) sum = memberData.length;
        const sider = memberData
            .slice(0, sum)
            .filter((mem: any) => mem.messages <= 1 && !mem.isAdmin && !mem.isBot);
        const total = sider.length;

        switch (command.toLowerCase()) {
            case 'fantasmas': {
                if (total === 0) return m.reply(`⚠️ Este grupo es activo, ¡no tiene fantasmas! :D`);
                let teks = `⚠️ REVISIÓN DE INACTIVOS ⚠️\n\n`;
                teks += `Grupo: ${metadata?.subject || 'Sin nombre'}\n`;
                teks += `*Miembros del grupo:* ${memberData.length}\n`;
                teks += `*Miembros inactivos (0-1 msg):* ${total}\n\n`;
                teks += `[ 👻 LISTA DE FANTASMAS 👻 ]\n`;
                teks += sider.map((v: any) => `  👉🏻 ${v.tag} (${v.messages} msg)`).join('\n');
                teks += `\n\n*Nota:* El bot cuenta mensajes desde que se activó en este grupo.`;
                await conn.sendMessage(m.chat, {
                    text: teks,
                    contextInfo: {mentionedJid: sider.map((v: any) => v.mentionJid)}
                }, {quoted: m});
                break;
            }

            case 'kickfantasmas': {
                if (total === 0) return m.reply(`⚠️ Este grupo es activo, ¡no tiene fantasmas! :D`);
                let kickTeks = `⚠️ ELIMINACIÓN DE INACTIVOS ⚠️\n\n`;
                kickTeks += `Grupo: ${metadata?.subject || 'Sin nombre'}\n`;
                kickTeks += `*Miembros del grupo:* ${memberData.length}\n`;
                kickTeks += `*Miembros inactivos (0-1 msg):* ${total}\n\n`;
                kickTeks += `[ 👻 FANTASMAS A ELIMINAR 👻 ]\n`;
                kickTeks += sider.map((v: any) => `${v.tag}`).join('\n');
                kickTeks += `\n\n*El bot eliminará la lista mencionada, empezando en 20 segundos, con 10 segundos entre cada expulsión.*`;
                await conn.sendMessage(m.chat, {
                    text: kickTeks,
                    contextInfo: {mentionedJid: sider.map((v: any) => v.mentionJid)}
                }, {quoted: m});

                // Silenciar el welcome durante la purga (el ?? evita el bug de '|| true').
                const chatSettings = await getGroupSettings(m.chat) || {};
                const originalWelcome = chatSettings.welcome ?? true;
                await setGroupBooleanFlag(m.chat, 'welcome', false);
                await delay(20000);
                try {
                    for (const user of sider) {
                        if (user.isBot) continue;
                        await conn.groupParticipantsUpdate(m.chat, [user.id], 'remove')
                            .catch((e: any) => console.error('❌ Error expulsando fantasma:', e));
                        await delay(10000);
                    }
                } finally {
                    await setGroupBooleanFlag(m.chat, 'welcome', originalWelcome);
                }
                await m.reply(`✅ Eliminación de fantasmas completada.`);
                break;
            }
        }
    } catch (err: any) {
        console.error(err);
        m.reply("❌ Error ejecutando el comando. Por favor, intenta de nuevo.");
    }
    }
});


;
