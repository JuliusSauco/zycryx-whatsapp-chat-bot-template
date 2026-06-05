import type {GroupMetadata} from '@whiskeysockets/baileys';
import type {GroupUpdate} from './group-event-types.js';

export function buildGroupUpdateMessage(update: GroupUpdate, metadata: GroupMetadata, previousMetadata: GroupMetadata | null): string {
    if (!previousMetadata) return '';

    const {subject, desc, picture} = update;
    const groupName = metadata.subject || subject || previousMetadata.subject || 'Grupo';

    if (subject && previousMetadata.subject && subject !== previousMetadata.subject) {
        return `El nombre del grupo ha cambiado a *${groupName}*.`;
    }

    if (desc && desc !== previousMetadata.desc) {
        return `La descripción del grupo *${groupName}* ha sido actualizada, nueva descripción:\n\n${metadata.desc || 'Sin descripción'}`;
    }

    if (picture) {
        return `La foto del grupo *${groupName}* ha sido actualizada.`;
    }

    return '';
}
