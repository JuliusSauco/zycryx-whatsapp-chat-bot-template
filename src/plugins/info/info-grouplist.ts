import {definePlugin} from '../../core/define-plugin.js';
import {listJoinedGroupIdsByBot} from '../../services/chat.service.js';
import type {GroupParticipant} from '@whiskeysockets/baileys';

type GroupParticipantWithPhone = GroupParticipant & {
    phoneNumber?: string;
};

export default definePlugin({
    help: ['groups', 'grouplist'],
    tags: ['main'],
    command: /^(groups|grouplist|listadegrupo|gruposlista|listagrupos|listadegrupos|grupolista|listagrupo)$/i,
    register: true,
    async execute(m, {conn}) {
    const botId = (conn.user?.id || '').split(':')[0].replace(/[^0-9]/g, '');
    let txt = '';
    try {
        const grupos = await listJoinedGroupIdsByBot(botId);
        if (grupos.length === 0) return m.reply('❌ Este bot no está unido a ningún grupo.');

        for (let i = 0; i < grupos.length; i++) {
            const jid = grupos[i];
            const metadata = await conn.groupMetadata(jid).catch(() => null);
            if (!metadata) continue;
            const botNumber = (conn.user?.id || '').split(':')[0].replace(/[^0-9]/g, '');

            const bot = metadata.participants.find((u) => {
                const participant = u as GroupParticipantWithPhone;
                return participant.id?.includes(botNumber) || participant.phoneNumber?.includes(botNumber);
            }) as GroupParticipantWithPhone | undefined;
            const isBotAdmin = bot?.admin === 'admin' || bot?.admin === 'superadmin';
            const isParticipant = Boolean(bot?.id);
            const participantStatus = isParticipant ? '✅ *Estoy aquí*' : '❌ *No estoy aquí*';

            let link = '❌ No soy admin';
            if (isBotAdmin) {
                const code = await conn.groupInviteCode(jid).catch(() => null);
                if (code) link = `https://chat.whatsapp.com/${code}`;
                else link = '⚠️ Error al generar link';
            }

            txt += `${i + 1}. ${metadata.subject || 'Sin nombre'} | ${participantStatus}
- *ID:* ${jid}
- *Admin:* ${isBotAdmin ? 'Sí' : 'No'}
- *Participantes:* ${metadata.participants.length}
- *Link:* ${link}

━━━━━━━━━━━━━━━

`;
        }

        m.reply(`_*\`ESTÁ EN ESTOS GRUPOS:\`*_\n> *• Total grupo:* ${grupos.length}\n\n${txt}`.trim());
    } catch (err: unknown) {
        console.error(err);
    }
    }
});
