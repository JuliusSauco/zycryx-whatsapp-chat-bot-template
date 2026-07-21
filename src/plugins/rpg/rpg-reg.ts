import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {createHash} from 'crypto';
import moment from 'moment-timezone'
import {
    completeRegistration,
    countUsers,
    getUserById,
    setUserBirthday,
    setUserGender,
    unregisterUser,
} from '../../services/user.service.js';
import type {SendMessageOptions} from '../../types/context.js';
import {content} from '../../services/content.service.js';
import {resolveProfileUser} from '../../services/profile-user.service.js';
import {getParticipantsFast} from '../../utils/mention.js';

const Reg = /\|?(.*)([.|] *?)([0-9]*)$/i;

interface RegistrationState {
    step: 1 | 2;
    nombre: string;
    edad: number;
    genero?: 'hombre' | 'mujer' | 'otro';
    usedPrefix: string;
    userNationality?: string | null;
    userId: string;
}

interface CountryApiResponse {
    result?: {
        name?: string;
        emoji?: string;
    };
}

type Gender = NonNullable<RegistrationState['genero']>;

const formatPhoneNumber = (jid: string) => {
    if (!jid) return null;
    const number = jid.replace('@s.whatsapp.net', '');
    if (!/^\d{8,15}$/.test(number)) return null;
    return `+${number}`;
};
const estados: Record<string, RegistrationState> = {}

export default defineSdkPlugin({
    help: ['reg <nombre.edad>', 'verificar <nombre.edad>', 'nserie', 'unreg <serial>', 'setgenero', 'setbirthday'],
    tags: ['rg'],
    command: /^(setbirthday|setgenero|nserie|unreg|sn|myns|verify|verificar|registrar|reg(ister)?)$/i,
    async before(m, {conn}) {
    let fkontak = {
        key: {participants: "0@s.whatsapp.net", remoteJid: "status@broadcast", fromMe: false, id: "Halo"},
        message: {contactMessage: {vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`}},
        participant: "0@s.whatsapp.net"
    };
    const who = m.sender
    const step = estados[who]?.step
    const input = (m.originalText || m.text || '').trim()
    const rtotalreg = (await countUsers()).registered;
    if (!step) return

    const activePrefix = estados[who]?.usedPrefix || '.'
    if (!m.text.startsWith(activePrefix)) {
        if (step === 1) {
            let lower = input.toLowerCase()
            let genero: Gender | null = lower === '1' || lower === 'hombre' ? 'hombre' : lower === '2' || lower === 'mujer' ? 'mujer' : lower === '3' || lower === 'otro' ? 'otro' : null
            if (!genero) return m.reply(content.message('rpg.registration.invalidGenderSelection'))
            estados[who].genero = genero
            estados[who].step = 2
            return m.reply(content.message('rpg.registration.birthdayStep'))
        }
        if (step === 2) {
            let cumple = null
            let cumpleTexto = null
            if (input.toLowerCase() !== 'omitir') {
                try {
                    const fecha = moment(input, ['DD/MM/YYYY', 'D [de] MMMM [de] YYYY'], true)
                    if (!fecha.isValid()) throw new Error('invalid')
                    cumple = fecha.format('YYYY-MM-DD')
                    cumpleTexto = input
                } catch (e: unknown) {
                    return m.reply(content.message('rpg.registration.invalidBirthdayShort'))
                }
            }
            const pref = estados[who]?.usedPrefix || '.'
            const userNationality = estados[who]?.userNationality || ''
            const {nombre, edad, genero, userId} = estados[who]
            if (!genero) return m.reply(content.message('rpg.registration.invalidGenderRestart'))
            const serial = createHash('md5').update(userId).digest('hex')
            const reg_time = new Date()
            await completeRegistration({
                id: userId,
                nombre: nombre + '✓',
                edad,
                gender: genero,
                birthday: cumple,
                regTime: reg_time,
                serialNumber: serial,
            })

            const date = moment.tz('America/Bogota').format('DD/MM/YYYY')
            const time = moment.tz('America/Argentina/Buenos_Aires').format('LT')

            delete estados[who]

            return await conn.sendMessage(m.chat, {
                text: content.renderMessage('rpg.registration.completed', {
                    name: nombre,
                    age: edad,
                    gender: genero,
                    birthdayLine: cumpleTexto ? content.renderMessage('rpg.registration.birthdayLine', {birthday: cumpleTexto}) : '',
                    time,
                    date,
                    countryLine: userNationality ? content.renderMessage('rpg.registration.countryLine', {country: userNationality}) : '',
                    phone: who.split('@')[0],
                    serial,
                    prefix: pref,
                    totalRegistered: toNum(rtotalreg + 1)
                }),
                contextInfo: {
                    forwardingScore: 9999999,
                    isForwarded: true,
                    externalAdReply: {
                        mediaUrl: info.md,
                        mediaType: 2,
                        showAdAttribution: false,
                        renderLargerThumbnail: false,
                        title: content.message('rpg.registration.completedTitle'),
                        body: content.message('rpg.registration.completedBody'),
                        previewType: 'PHOTO',
                        thumbnailUrl: "https://telegra.ph/file/33bed21a0eaa789852c30.jpg",
                        sourceUrl: info.md
                    }
                }
            }, {quoted: fkontak, ephemeralExpiration: 24 * 60 * 1000, disappearingMessagesInChat: 24 * 60 * 1000} as SendMessageOptions);
        }
    }
    },
    async execute(m, {conn, text, args, usedPrefix, command, sdk, participants}) {
    const rawWho = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? conn.user?.id || m.sender : m.sender;
    const profileIdentity = await resolveProfileUser({
        rawJid: rawWho,
        participants: getParticipantsFast(conn, m.chat, participants),
        aliases: rawWho === m.sender ? [m.lid] : [],
        displayName: rawWho === m.sender ? m.pushName : null,
        createIfMissing: true,
    });
    if (!profileIdentity) return sdk.reply.message('rpg.registration.profileUpdateFailed');
    const who = profileIdentity.userId;
    let userNationality = null;
    try {
        const phone = formatPhoneNumber(who);
        if (phone) {
            const data = await sdk.http.json<CountryApiResponse>(`${info.apis}/tools/country?text=${phone}`);
            userNationality = data.result ? `${data.result.name} ${data.result.emoji}` : null;
        }
    } catch (err: unknown) {
        userNationality = null;
    }

    const user = profileIdentity.user;
    let name2 = m.pushName || 'loli'

    if (command === 'reg' || command === 'verify' || command === 'verificar') {
        if (user?.registered) return sdk.reply.message('rpg.registration.alreadyRegistered')
        if (estados[m.sender]?.step) return sdk.reply.message('rpg.registration.alreadyInProgress')
        if (!Reg.test(text)) return sdk.reply.message('rpg.registration.usage', {
            command: usedPrefix + command,
            name: name2
        })

        const regMatch = text.match(Reg)
        if (!regMatch) return sdk.reply.message('rpg.registration.usage', {
            command: usedPrefix + command,
            name: name2
        })
        let [, name, , age] = regMatch
        if (!name) return sdk.reply.message('rpg.registration.missingName')
        if (!age) return sdk.reply.message('rpg.registration.missingAge')
        if (name.length >= 45) return sdk.reply.message('rpg.registration.nameTooLong')
        const ageNumber = parseInt(age)
        if (ageNumber > 100) return sdk.reply.message('rpg.registration.tooOld')
        if (ageNumber < 5) return sdk.reply.message('rpg.registration.tooYoung')

        estados[m.sender] = {step: 1, nombre: name, edad: ageNumber, usedPrefix, userNationality, userId: who}

        return sdk.reply.message('rpg.registration.genderStep')
    }

    if (command == 'nserie' || command == 'myns' || command == 'sn') {
        const sn = user?.serialNumber || user?.serial_number || createHash('md5').update(who).digest('hex');
        await conn.fakeReply(m.chat, sn, '0@s.whatsapp.net', sdk.content.message('rpg.registration.serialQuoted'), 'status@broadcast')
//m.reply(sn);
    }

    if (command == 'unreg') {
        if (!args[0]) return sdk.reply.message('rpg.registration.unregMissingSerial', {prefix: usedPrefix})
        const user2 = await getUserById(who);
        const sn = user2?.serialNumber || user2?.serial_number || createHash('md5').update(who).digest('hex');
        if (args[0] !== sn) return sdk.reply.message('rpg.registration.unregInvalidSerial')
        await unregisterUser(who);
        await conn.fakeReply(m.chat, sdk.content.message('rpg.registration.unregSuccess'), '0@s.whatsapp.net', sdk.content.message('rpg.registration.unregQuoted'), 'status@broadcast')
    }

    if (command === 'setgenero') {
        const genero = (args[0] || '').toLowerCase()
        if (!['hombre', 'mujer', 'otro'].includes(genero)) return sdk.reply.message('rpg.registration.setGenderUsage', {prefix: usedPrefix})
        const updated = await setUserGender(who, genero)
        if (!updated) return sdk.reply.message('rpg.registration.profileUpdateFailed')
        return sdk.reply.message('rpg.registration.setGenderSuccess', {gender: genero})
    }

    if (command === 'setbirthday') {
        let birthday = args.join(' ').trim()
        if (!birthday) return sdk.reply.message('rpg.registration.setBirthdayUsage', {prefix: usedPrefix})
        if (birthday.toLowerCase() === 'borrar') {
            const updated = await setUserBirthday(who, null)
            if (!updated) return sdk.reply.message('rpg.registration.profileUpdateFailed')
            return sdk.reply.message('rpg.registration.setBirthdayDeleted')
        }
        const fecha = moment(birthday, ['DD/MM/YYYY', 'D [de] MMMM [de] YYYY'], true)
        if (!fecha.isValid()) return sdk.reply.message('rpg.registration.invalidBirthday')
        const updated = await setUserBirthday(who, fecha.format('YYYY-MM-DD'))
        if (!updated) return sdk.reply.message('rpg.registration.profileUpdateFailed')
        return sdk.reply.message('rpg.registration.setBirthdaySuccess', {birthday})
    }
    },
})


;

function toNum(number: number) {
    if (number >= 1000 && number < 1000000) {
        return (number / 1000).toFixed(1) + 'k';
    } else if (number >= 1000000) {
        return (number / 1000000).toFixed(1) + 'M';
    } else if (number <= -1000 && number > -1000000) {
        return (number / 1000).toFixed(1) + 'k';
    } else if (number <= -1000000) {
        return (number / 1000000).toFixed(1) + 'M';
    } else {
        return number.toString();
    }
}

