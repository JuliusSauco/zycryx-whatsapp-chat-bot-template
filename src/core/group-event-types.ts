import type {GroupMetadata, WASocket} from '@whiskeysockets/baileys';
import type {ExtendedConn} from '../types/context.js';

export type ParticipantUpdateItem = string | {
    id?: string;
    phoneNumber?: string;
};

export interface GroupParticipantsUpdate {
    id: string;
    participants: ParticipantUpdateItem[];
    action: string;
    author?: string | {id?: string} | null;
}

export interface GroupUpdate {
    id: string;
    subject?: string;
    desc?: string;
    picture?: string;
}

export interface GroupJoinRequest {
    id: string;
    author?: string;
    participant: string;
    participantPn?: string;
    action: string;
    method?: string;
}

export type EventConn = WASocket & {
    groupCache?: ExtendedConn['groupCache'];
};

export type CachedGroupMetadata = GroupMetadata | null;
