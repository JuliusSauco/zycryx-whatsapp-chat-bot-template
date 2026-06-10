import type {AppRepositories} from '../../ports/repositories.js';
import {audioResponseRepository} from './audio-response.repository.js';
import {apiTokenRepository} from './api-token.repository.js';
import {charactersRepository} from './character.repository.js';
import {chatMemoryRepository} from './chat-memory.repository.js';
import {chatsRepository} from './chat.repository.js';
import {databaseRepository} from './database.repository.js';
import {groupSettingsRepository} from './group-settings.repository.js';
import {messageLogRepository} from './message-log.repository.js';
import {messagesRepository} from './message.repository.js';
import {reportsRepository} from './report.repository.js';
import {statsRepository} from './stats.repository.js';
import {subbotsRepository} from './subbot.repository.js';
import {userRepository} from './user.repository.js';
import {userGroupRoleRepository} from './user-group-role.repository.js';

export function createDrizzleRepositories(): AppRepositories {
    return {
        users: userRepository,
        userGroupRoles: userGroupRoleRepository,
        chats: chatsRepository,
        messages: messagesRepository,
        messageLogs: messageLogRepository,
        stats: statsRepository,
        subbots: subbotsRepository,
        characters: charactersRepository,
        apiTokens: apiTokenRepository,
        audioResponses: audioResponseRepository,
        groupSettings: groupSettingsRepository,
        reports: reportsRepository,
        chatMemory: chatMemoryRepository,
        database: databaseRepository,
    };
}
