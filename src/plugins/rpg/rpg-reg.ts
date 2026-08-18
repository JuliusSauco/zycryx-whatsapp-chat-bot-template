import {createHash} from 'node:crypto';
import moment from 'moment-timezone';
import {botInfo} from '../../core/config.js';
import {defineSdkPlugin, type PluginSdk} from '../../core/plugin-sdk.js';
import {lookupCountry} from '../../providers/main-api.provider.js';
import {content} from '../../services/content.service.js';
import {resolveProfileUser} from '../../services/profile-user.service.js';
import {
    completeRegistration,
    countUsers,
    getUserById,
    setUserBirthday,
    setUserGender,
    setUserNationality,
    setUserProfileName,
    unregisterUser,
} from '../../services/user.service.js';
import type {SendMessageOptions} from '../../types/context.js';
import {getParticipantsFast} from '../../utils/mention.js';
import {
    ageFromBirthday,
    isPrivateBotChat,
    isProfileEditCommand,
    isRegistrationCommand,
    normalizeGender,
    normalizeNationality,
    normalizeProfileName,
    parseBirthday,
    parseRegistrationIdentity,
    PROFILE_COMMAND_PATTERN,
    profileCommandScope,
    type ProfileGender,
} from './rpg-registration.helpers.js';

interface RegistrationState {
    step: 1 | 2 | 3;
    name: string;
    age: number;
    gender?: ProfileGender;
    birthday: string | null;
    birthdayText: string | null;
    suggestedNationality: string | null;
    usedPrefix: string;
    userId: string;
}

const registrationStates = new Map<string, RegistrationState>();

export default defineSdkPlugin({
    help: [
        'reg <nombre.edad>', 'register <nombre.edad>', 'registrar <nombre.edad>',
        'nserie', 'unreg <serial>', 'setnombre', 'setgenero/setgender',
        'setnacionalidad/setnationality', 'setbirthday/setcumpleaños',
    ],
    tags: ['rg'],
    command: PROFILE_COMMAND_PATTERN,
    async before(m, {conn}) {
        if (!isPrivateBotChat(m.chat)) return;
        const who = m.sender;
        const state = registrationStates.get(who);
        if (!state) return;

        const input = (m.originalText || m.text || '').trim();
        if (!input || input.startsWith(state.usedPrefix)) return;

        if (state.step === 1) {
            const gender = normalizeGender(input);
            if (!gender) return m.reply(content.message('rpg.registration.invalidGenderSelection'));
            state.gender = gender;
            state.step = 2;
            return m.reply(content.message('rpg.registration.birthdayStep'));
        }

        if (state.step === 2) {
            if (input.toLocaleLowerCase('es') === 'omitir') {
                state.birthday = null;
                state.birthdayText = null;
            } else {
                const birthday = parseBirthday(input);
                if (!birthday) return m.reply(content.message('rpg.registration.invalidBirthdayShort'));
                if (ageFromBirthday(birthday) !== state.age) {
                    return m.reply(content.renderMessage('rpg.registration.birthdayAgeMismatch', {age: state.age}));
                }
                state.birthday = birthday;
                state.birthdayText = input;
            }
            state.step = 3;
            return m.reply(content.renderMessage('rpg.registration.nationalityStep', {
                suggestion: state.suggestedNationality
                    ? content.renderMessage('rpg.registration.nationalitySuggestion', {nationality: state.suggestedNationality})
                    : '',
            }));
        }

        const lowerInput = input.toLocaleLowerCase('es');
        const nationality = lowerInput === 'omitir' ? state.suggestedNationality : normalizeNationality(input);
        if (lowerInput !== 'omitir' && !nationality) {
            return m.reply(content.message('rpg.registration.invalidNationality'));
        }
        if (!state.gender) {
            registrationStates.delete(who);
            return m.reply(content.message('rpg.registration.invalidGenderRestart'));
        }

        const registeredBefore = (await countUsers()).registered;
        const serial = createHash('md5').update(state.userId).digest('hex');
        await completeRegistration({
            id: state.userId,
            nombre: `${state.name}✓`,
            edad: state.age,
            gender: state.gender,
            nationality,
            birthday: state.birthday,
            regTime: new Date(),
            serialNumber: serial,
        });
        registrationStates.delete(who);

        const fakeContact = {
            key: {participants: '0@s.whatsapp.net', remoteJid: 'status@broadcast', fromMe: false, id: 'Halo'},
            message: {contactMessage: {vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${who.split('@')[0]}:${who.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`}},
            participant: '0@s.whatsapp.net',
        };
        return conn.sendMessage(m.chat, {
            text: content.renderMessage('rpg.registration.completed', {
                name: state.name,
                age: state.age,
                gender: state.gender,
                birthdayLine: state.birthdayText
                    ? content.renderMessage('rpg.registration.birthdayLine', {birthday: state.birthdayText})
                    : '',
                time: moment.tz('America/Argentina/Buenos_Aires').format('LT'),
                date: moment.tz('America/Bogota').format('DD/MM/YYYY'),
                countryLine: nationality
                    ? content.renderMessage('rpg.registration.countryLine', {country: nationality})
                    : '',
                phone: who.split('@')[0],
                serial,
                prefix: state.usedPrefix,
                totalRegistered: compactNumber(registeredBefore + 1),
                editInstructions: content.renderMessage('rpg.registration.editInstructions', {prefix: state.usedPrefix}),
            }),
            contextInfo: {
                forwardingScore: 9999999,
                isForwarded: true,
                externalAdReply: {
                    mediaUrl: botInfo.md,
                    mediaType: 2,
                    showAdAttribution: false,
                    renderLargerThumbnail: false,
                    title: content.message('rpg.registration.completedTitle'),
                    body: content.message('rpg.registration.completedBody'),
                    previewType: 'PHOTO',
                    thumbnailUrl: 'https://telegra.ph/file/33bed21a0eaa789852c30.jpg',
                    sourceUrl: botInfo.md,
                },
            },
        }, {quoted: fakeContact, ephemeralExpiration: 24 * 60 * 1000, disappearingMessagesInChat: 24 * 60 * 1000} as SendMessageOptions);
    },
    async execute(m, {conn, text, args, usedPrefix, command, sdk, participants, isGroup}) {
        const normalizedCommand = command.toLocaleLowerCase('es');
        const rawWho = m.fromMe ? conn.user?.id || m.sender : m.sender;
        const profileIdentity = await resolveProfileUser({
            rawJid: rawWho,
            participants: getParticipantsFast(conn, m.chat, participants),
            aliases: rawWho === m.sender ? [m.lid] : [],
            displayName: rawWho === m.sender ? m.pushName : null,
            createIfMissing: true,
        });
        if (!profileIdentity) return sdk.reply.message('rpg.registration.profileUpdateFailed');
        const who = profileIdentity.userId;
        const user = profileIdentity.user;

        if (profileCommandScope(isGroup) === 'redirect_to_private') {
            await sdk.reply.message('rpg.registration.privateOnlyGroup');
            const privateText = await buildPrivateContinuation(
                normalizedCommand, text, usedPrefix, user.registered, who, m.pushName,
            );
            await conn.sendMessage(who, {text: privateText});
            return;
        }

        if (isRegistrationCommand(normalizedCommand)) {
            if (user.registered) return sdk.reply.message('rpg.registration.alreadyRegisteredWithEdits', {prefix: usedPrefix});
            if (registrationStates.has(who)) return sdk.reply.message('rpg.registration.alreadyInProgress');
            const identity = parseRegistrationIdentity(text);
            if (!identity.ok) return replyRegistrationIdentityError(identity.reason, sdk, usedPrefix, normalizedCommand, m.pushName);
            registrationStates.set(who, {
                step: 1,
                name: identity.name,
                age: identity.age,
                birthday: null,
                birthdayText: null,
                suggestedNationality: await inferNationality(who),
                usedPrefix,
                userId: who,
            });
            return sdk.reply.message('rpg.registration.genderStep');
        }

        if (normalizedCommand === 'nserie' || normalizedCommand === 'myns' || normalizedCommand === 'sn') {
            const serial = user.serialNumber || user.serial_number || createHash('md5').update(who).digest('hex');
            await conn.fakeReply(m.chat, serial, '0@s.whatsapp.net', sdk.content.message('rpg.registration.serialQuoted'), 'status@broadcast');
            return;
        }

        if (normalizedCommand === 'unreg') {
            if (!args[0]) return sdk.reply.message('rpg.registration.unregMissingSerial', {prefix: usedPrefix});
            const stored = await getUserById(who);
            const serial = stored?.serialNumber || stored?.serial_number || createHash('md5').update(who).digest('hex');
            if (args[0] !== serial) return sdk.reply.message('rpg.registration.unregInvalidSerial');
            await unregisterUser(who);
            registrationStates.delete(who);
            await conn.fakeReply(m.chat, sdk.content.message('rpg.registration.unregSuccess'), '0@s.whatsapp.net', sdk.content.message('rpg.registration.unregQuoted'), 'status@broadcast');
            return;
        }

        if (isProfileEditCommand(normalizedCommand) && !user.registered) {
            return sdk.reply.message('rpg.registration.registerBeforeEditing', {prefix: usedPrefix});
        }

        if (normalizedCommand === 'setnombre' || normalizedCommand === 'setname') {
            const name = normalizeProfileName(args.join(' '));
            if (!name) return sdk.reply.message('rpg.registration.setNameUsage', {prefix: usedPrefix});
            const updated = await setUserProfileName(who, `${name}✓`);
            return updated
                ? sdk.reply.message('rpg.registration.setNameSuccess', {name})
                : sdk.reply.message('rpg.registration.profileUpdateFailed');
        }

        if (normalizedCommand === 'setgenero' || normalizedCommand === 'setgender') {
            const gender = normalizeGender(args.join(' '));
            if (!gender) return sdk.reply.message('rpg.registration.setGenderUsage', {prefix: usedPrefix});
            const updated = await setUserGender(who, gender);
            return updated
                ? sdk.reply.message('rpg.registration.setGenderSuccess', {gender})
                : sdk.reply.message('rpg.registration.profileUpdateFailed');
        }

        if (normalizedCommand === 'setnacionalidad' || normalizedCommand === 'setnationality') {
            const rawNationality = args.join(' ').trim();
            if (!rawNationality) return sdk.reply.message('rpg.registration.setNationalityUsage', {prefix: usedPrefix});
            if (rawNationality.toLocaleLowerCase('es') === 'borrar') {
                const updated = await setUserNationality(who, null);
                return updated
                    ? sdk.reply.message('rpg.registration.setNationalityDeleted')
                    : sdk.reply.message('rpg.registration.profileUpdateFailed');
            }
            const nationality = normalizeNationality(rawNationality);
            if (!nationality) return sdk.reply.message('rpg.registration.invalidNationality');
            const updated = await setUserNationality(who, nationality);
            return updated
                ? sdk.reply.message('rpg.registration.setNationalitySuccess', {nationality})
                : sdk.reply.message('rpg.registration.profileUpdateFailed');
        }

        const rawBirthday = args.join(' ').trim();
        if (!rawBirthday) return sdk.reply.message('rpg.registration.setBirthdayUsage', {prefix: usedPrefix});
        if (rawBirthday.toLocaleLowerCase('es') === 'borrar') {
            const updated = await setUserBirthday(who, null);
            return updated
                ? sdk.reply.message('rpg.registration.setBirthdayDeleted')
                : sdk.reply.message('rpg.registration.profileUpdateFailed');
        }
        const birthday = parseBirthday(rawBirthday);
        if (!birthday) return sdk.reply.message('rpg.registration.invalidBirthday');
        const updated = await setUserBirthday(who, birthday);
        return updated
            ? sdk.reply.message('rpg.registration.setBirthdaySuccess', {birthday: rawBirthday})
            : sdk.reply.message('rpg.registration.profileUpdateFailed');
    },
});

async function buildPrivateContinuation(
    command: string,
    text: string,
    prefix: string,
    registered: boolean,
    userId: string,
    pushName: string | null | undefined,
): Promise<string> {
    if (!isRegistrationCommand(command)) {
        return content.renderMessage('rpg.registration.privateCommandReminder', {prefix, command});
    }
    if (registered) return content.renderMessage('rpg.registration.alreadyRegisteredWithEdits', {prefix});
    if (registrationStates.has(userId)) return content.message('rpg.registration.alreadyInProgress');
    const identity = parseRegistrationIdentity(text);
    if (!identity.ok) {
        return content.renderMessage('rpg.registration.privateRegistrationStart', {
            usage: content.renderMessage('rpg.registration.usage', {
                command: `${prefix}reg`,
                name: pushName || 'Loli',
            }),
        });
    }
    registrationStates.set(userId, {
        step: 1,
        name: identity.name,
        age: identity.age,
        birthday: null,
        birthdayText: null,
        suggestedNationality: await inferNationality(userId),
        usedPrefix: prefix,
        userId,
    });
    return content.renderMessage('rpg.registration.privateRegistrationStarted', {
        genderStep: content.message('rpg.registration.genderStep'),
    });
}

async function inferNationality(userId: string): Promise<string | null> {
    const number = userId.replace('@s.whatsapp.net', '');
    if (!/^\d{8,15}$/.test(number)) return null;
    try {
        const country = await lookupCountry(`+${number}`);
        return country?.name?.trim() || null;
    } catch {
        return null;
    }
}

function replyRegistrationIdentityError(
    reason: 'format' | 'name_too_long' | 'too_old' | 'too_young',
    sdk: PluginSdk,
    prefix: string,
    command: string,
    pushName: string | null | undefined,
) {
    if (reason === 'name_too_long') return sdk.reply.message('rpg.registration.nameTooLong');
    if (reason === 'too_old') return sdk.reply.message('rpg.registration.tooOld');
    if (reason === 'too_young') return sdk.reply.message('rpg.registration.tooYoung');
    return sdk.reply.message('rpg.registration.usage', {
        command: prefix + command,
        name: pushName || 'Loli',
    });
}

function compactNumber(number: number): string {
    if (Math.abs(number) >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
    if (Math.abs(number) >= 1_000) return `${(number / 1_000).toFixed(1)}k`;
    return number.toString();
}
