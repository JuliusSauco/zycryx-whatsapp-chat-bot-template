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
} from '../domain/users.js';

export async function getUserById(userId: string) {
    return repositories.userIdentity.findById(userId);
}

export async function getUserName(userId: string): Promise<string | null> {
    return repositories.userIdentity.findNameById(userId);
}

export async function getUserBanInfo(userId: string): Promise<UserBanInfo | null> {
    return repositories.userModeration.findBanInfo(userId);
}

export async function registerBanNotice(userId: string, notices: number): Promise<void> {
    await repositories.userModeration.incrementBanNotice(userId, notices);
}

export async function setUserBanStatus(userId: string, banned: boolean, reason: string | null): Promise<void> {
    await repositories.userModeration.setBanStatus(userId, banned, reason);
}

export async function getUserResources(userId: string): Promise<UserResources> {
    return repositories.userEconomy.getResources(userId);
}

export async function decrementUserLimit(userId: string, amount: number): Promise<void> {
    await repositories.userEconomy.decrementLimit(userId, amount);
}

export async function countUsers(): Promise<{total: number; registered: number}> {
    return repositories.userRegistration.countUsers();
}

export async function getUserStickerSettings(userId: string): Promise<UserStickerSettings | null> {
    return repositories.userPreferences.findStickerSettings(userId);
}

export async function setUserStickerSettings(
    userId: string,
    packname: string,
    author: string | null,
): Promise<void> {
    await repositories.userPreferences.setStickerSettings(userId, packname, author);
}

export async function getUserWarnInfo(userId: string): Promise<UserWarnInfo | null> {
    return repositories.userModeration.findWarnInfo(userId);
}

export async function incrementUserWarn(userId: string): Promise<void> {
    await repositories.userModeration.incrementWarn(userId);
}

export async function decrementUserWarn(userId: string): Promise<void> {
    await repositories.userModeration.decrementWarn(userId);
}

export async function resetUserWarn(userId: string): Promise<void> {
    await repositories.userModeration.resetWarn(userId);
}

export async function listWarnedUsers(): Promise<UserWarnInfo[]> {
    return repositories.userModeration.listWarnedUsers();
}

export async function getNumberByLid(lid: string): Promise<string | null> {
    return repositories.userIdentity.findNumberByLid(lid);
}

export async function listBannedUsers(): Promise<BannedUserInfo[]> {
    return repositories.userModeration.listBannedUsers();
}

export async function listMarriedUsers(): Promise<MarriedUserInfo[]> {
    return repositories.userRelationships.listMarriedUsers();
}

export async function getPrivateWarn(userId: string): Promise<boolean | null> {
    return repositories.userModeration.getPrivateWarn(userId);
}

export async function setPrivateWarn(userId: string, warned: boolean): Promise<void> {
    await repositories.userModeration.setPrivateWarn(userId, warned);
}

export async function setMarriageRequest(userId: string, requesterId: string | null): Promise<void> {
    await repositories.userRelationships.setMarriageRequest(userId, requesterId);
}

export async function getMarriageRequest(userId: string): Promise<string | null> {
    return repositories.userRelationships.getMarriageRequest(userId);
}

export async function marryUsers(userA: string, userB: string): Promise<void> {
    await repositories.userRelationships.marryUsers(userA, userB);
}

export async function divorceUsers(userA: string, userB: string): Promise<void> {
    await repositories.userRelationships.divorceUsers(userA, userB);
}

export async function completeRegistration(input: CompleteRegistrationInput): Promise<void> {
    await repositories.userRegistration.completeRegistration(input);
}

export async function unregisterUser(userId: string): Promise<void> {
    await repositories.userRegistration.unregister(userId);
}

export async function setUserProfileName(userId: string, name: string): Promise<boolean> {
    return repositories.userRegistration.setProfileName(userId, name);
}

export async function setUserGender(userId: string, gender: string): Promise<boolean> {
    return repositories.userRegistration.setGender(userId, gender);
}

export async function setUserNationality(userId: string, nationality: string | null): Promise<boolean> {
    return repositories.userRegistration.setNationality(userId, nationality);
}

export async function setUserBirthday(userId: string, birthday: string | null): Promise<boolean> {
    return repositories.userRegistration.setBirthday(userId, birthday);
}

export async function upsertUser(input: UpsertUserInput): Promise<void> {
    await repositories.userIdentity.upsertBasicUser(input);

    if (input.lid) {
        await repositories.userIdentity.setUserLid(input.id, input.lid);
    }
}
