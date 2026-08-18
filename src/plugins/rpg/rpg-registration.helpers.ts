import moment from 'moment-timezone';

export const REGISTRATION_COMMANDS = new Set([
    'reg', 'register', 'registrar', 'registro', 'registrarse', 'signup', 'verify', 'verificar',
]);

export const PROFILE_EDIT_COMMANDS = new Set([
    'setnombre', 'setname',
    'setgenero', 'setgender',
    'setnacionalidad', 'setnationality',
    'setbirthday', 'setcumple', 'setcumpleanos', 'setcumpleaños',
]);

export const PROFILE_COMMAND_PATTERN = /^(setbirthday|setcumple(?:anos|años)?|setgenero|setgender|setnacionalidad|setnationality|setnombre|setname|nserie|unreg|sn|myns|verify|verificar|registrar(?:se)?|registro|signup|reg(?:ister)?)$/i;

export type ProfileGender = 'hombre' | 'mujer' | 'otro';

export type RegistrationIdentity =
    | {ok: true; name: string; age: number}
    | {ok: false; reason: 'format' | 'name_too_long' | 'too_old' | 'too_young'};

const REGISTRATION_PATTERN = /^\s*([^.|]+?)\s*[.|]\s*(\d{1,3})\s*$/u;
const BIRTHDAY_FORMATS = ['DD/MM/YYYY', 'D/M/YYYY', 'D [de] MMMM [de] YYYY'];

export function isRegistrationCommand(command: string): boolean {
    return REGISTRATION_COMMANDS.has(command.toLowerCase());
}

export function isProfileEditCommand(command: string): boolean {
    return PROFILE_EDIT_COMMANDS.has(command.toLowerCase());
}

export function parseRegistrationIdentity(input: string): RegistrationIdentity {
    const match = input.match(REGISTRATION_PATTERN);
    if (!match) return {ok: false, reason: 'format'};
    const name = normalizeProfileName(match[1] || '');
    const age = Number.parseInt(match[2] || '', 10);
    if (!name) return {ok: false, reason: 'format'};
    if (name.length >= 45) return {ok: false, reason: 'name_too_long'};
    if (age > 100) return {ok: false, reason: 'too_old'};
    if (age < 5) return {ok: false, reason: 'too_young'};
    return {ok: true, name, age};
}

export function normalizeProfileName(input: string): string | null {
    const value = input.trim().replace(/✓+$/u, '').replace(/\s+/gu, ' ').trim();
    if (value.length < 2 || value.length >= 45) return null;
    return value;
}

export function normalizeGender(input: string): ProfileGender | null {
    const value = input.trim().toLocaleLowerCase('es');
    if (value === '1' || value === 'hombre' || value === 'male' || value === 'masculino') return 'hombre';
    if (value === '2' || value === 'mujer' || value === 'female' || value === 'femenino') return 'mujer';
    if (value === '3' || value === 'otro' || value === 'other') return 'otro';
    return null;
}

export function normalizeNationality(input: string): string | null {
    const value = input.replace(/\s+/gu, ' ').trim();
    if (value.length < 2 || value.length > 64) return null;
    if (!/^[\p{L}\p{M} .'-]+$/u.test(value)) return null;
    return value;
}

export function parseBirthday(input: string): string | null {
    const parsed = moment(input.trim(), BIRTHDAY_FORMATS, true);
    if (!parsed.isValid()) return null;
    const today = moment().startOf('day');
    if (parsed.isAfter(today) || parsed.isBefore('1900-01-01', 'day')) return null;
    return parsed.format('YYYY-MM-DD');
}

export function ageFromBirthday(birthday: string): number {
    return moment().diff(moment(birthday, 'YYYY-MM-DD', true), 'years');
}

export function isPrivateBotChat(chatId: string): boolean {
    return !chatId.endsWith('@g.us');
}

export function profileCommandScope(isGroup: boolean): 'redirect_to_private' | 'execute_private' {
    return isGroup ? 'redirect_to_private' : 'execute_private';
}
