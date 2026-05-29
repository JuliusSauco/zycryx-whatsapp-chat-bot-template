import {repositories} from './data-source.js';
import type {
    BannedUserInfo,
    CompleteRegistrationInput,
    MarriedUserInfo,
    UpsertUserInput,
    UserBanInfo,
    UserResources,
    UserStickerSettings,
    UserWarnInfo,
} from '../ports/repositories.js';

export async function getUserById(userId: string) {
    return repositories.users.findById(userId);
}

export async function getUserName(userId: string): Promise<string | null> {
    return repositories.users.findNameById(userId);
}

export async function getUserBanInfo(userId: string): Promise<UserBanInfo | null> {
    return repositories.users.findBanInfo(userId);
}

export async function registerBanNotice(userId: string, notices: number): Promise<void> {
    await repositories.users.incrementBanNotice(userId, notices);
}

export async function setUserBanStatus(userId: string, banned: boolean, reason: string | null): Promise<void> {
    await repositories.users.setBanStatus(userId, banned, reason);
}

export async function getUserResources(userId: string): Promise<UserResources> {
    return repositories.users.getResources(userId);
}

export async function decrementUserLimit(userId: string, amount: number): Promise<void> {
    await repositories.users.decrementLimit(userId, amount);
}

export async function countUsers(): Promise<{total: number; registered: number}> {
    return repositories.users.countUsers();
}

export async function getUserStickerSettings(userId: string): Promise<UserStickerSettings | null> {
    return repositories.users.findStickerSettings(userId);
}

export async function setUserStickerSettings(
    userId: string,
    packname: string,
    author: string | null,
): Promise<void> {
    await repositories.users.setStickerSettings(userId, packname, author);
}

export async function getUserWarnInfo(userId: string): Promise<UserWarnInfo | null> {
    return repositories.users.findWarnInfo(userId);
}

export async function incrementUserWarn(userId: string): Promise<void> {
    await repositories.users.incrementWarn(userId);
}

export async function decrementUserWarn(userId: string): Promise<void> {
    await repositories.users.decrementWarn(userId);
}

export async function resetUserWarn(userId: string): Promise<void> {
    await repositories.users.resetWarn(userId);
}

export async function listWarnedUsers(): Promise<UserWarnInfo[]> {
    return repositories.users.listWarnedUsers();
}

export async function getNumberByLid(lid: string): Promise<string | null> {
    return repositories.users.findNumberByLid(lid);
}

export async function listBannedUsers(): Promise<BannedUserInfo[]> {
    return repositories.users.listBannedUsers();
}

export async function listMarriedUsers(): Promise<MarriedUserInfo[]> {
    return repositories.users.listMarriedUsers();
}

export async function getPrivateWarn(userId: string): Promise<boolean | null> {
    return repositories.users.getPrivateWarn(userId);
}

export async function setPrivateWarn(userId: string, warned: boolean): Promise<void> {
    await repositories.users.setPrivateWarn(userId, warned);
}

export async function setMarriageRequest(userId: string, requesterId: string | null): Promise<void> {
    await repositories.users.setMarriageRequest(userId, requesterId);
}

export async function getMarriageRequest(userId: string): Promise<string | null> {
    return repositories.users.getMarriageRequest(userId);
}

export async function marryUsers(userA: string, userB: string): Promise<void> {
    await repositories.users.marryUsers(userA, userB);
}

export async function divorceUsers(userA: string, userB: string): Promise<void> {
    await repositories.users.divorceUsers(userA, userB);
}

export async function completeRegistration(input: CompleteRegistrationInput): Promise<void> {
    await repositories.users.completeRegistration(input);
}

export async function unregisterUser(userId: string): Promise<void> {
    await repositories.users.unregister(userId);
}

export async function setUserGender(userId: string, gender: string): Promise<void> {
    await repositories.users.setGender(userId, gender);
}

export async function setUserBirthday(userId: string, birthday: string | null): Promise<void> {
    await repositories.users.setBirthday(userId, birthday);
}

export async function upsertUser(input: UpsertUserInput): Promise<void> {
    await repositories.users.upsertBasicUser(input);

    if (input.lid) {
        await repositories.users.clearLidFromOtherUsers(input.lid, input.id);
        await repositories.users.setUserLid(input.id, input.lid);
    }
}
