import {getGroupSettings} from '../services/group-settings.service.js';
import type {GroupSettings} from '../types/config.js';

const DEFAULT_EVENT_GROUP_SETTINGS: Partial<GroupSettings> = {
    welcome: true,
    detect: true,
    antifake: false,
    autoAcceptMode: 'off',
};

export async function getEventGroupSettings(groupId: string): Promise<Partial<GroupSettings>> {
    return await getGroupSettings(groupId) || DEFAULT_EVENT_GROUP_SETTINGS;
}
