import {randomUUID} from 'node:crypto';
import {
    ROLEPLAY_MAX_FIXED_HOURS, SLUT_LICENSE_PRICE_COINS, SLUT_PRODUCT_CODE, SLUT_ROLE_CODE,
    parseRoleplayDuration,
} from '../domain/roleplay.js';
import {repositories} from './data-source.js';

export function buySlutRoleEntitlement(userId: string, now = new Date()) {
    return repositories.roleplay.buyEntitlement({
        userId,
        productCode: SLUT_PRODUCT_CODE,
        priceCoins: SLUT_LICENSE_PRICE_COINS,
        operationId: randomUUID(),
        now,
    });
}

export function hasSlutRoleEntitlement(userId: string) {
    return repositories.roleplay.hasEntitlement(userId, SLUT_PRODUCT_CODE);
}

export function openSlutRoleSession(input: {
    groupId: string;
    beneficiaryId: string;
    targetId: string | null;
    requestedPriceCoins?: number;
    offerMessage: string;
    now?: Date;
}) {
    return repositories.roleplay.openSession({
        roleCode: SLUT_ROLE_CODE,
        productCode: SLUT_PRODUCT_CODE,
        groupId: input.groupId,
        beneficiaryId: input.beneficiaryId,
        targetId: input.targetId,
        requestedPriceCoins: input.requestedPriceCoins,
        offerMessage: input.offerMessage,
        now: input.now ?? new Date(),
    });
}

export function findOpenSlutSession(groupId: string, beneficiaryId: string) {
    return repositories.roleplay.findOpenSession({groupId, beneficiaryId, roleCode: SLUT_ROLE_CODE});
}

export function listAvailableSlutSessions(groupId: string, buyerId: string) {
    return repositories.roleplay.listAvailableSessions({groupId, buyerId, roleCode: SLUT_ROLE_CODE});
}

export function acceptSlutSession(input: {
    sessionId: string;
    buyerId: string;
    duration?: string;
    now?: Date;
}) {
    const duration = parseRoleplayDuration(input.duration);
    if (duration.kind === 'invalid') {
        return Promise.resolve({kind: 'invalid_hours', maximum: ROLEPLAY_MAX_FIXED_HOURS} as const);
    }
    return repositories.roleplay.acceptSession({
        sessionId: input.sessionId,
        buyerId: input.buyerId,
        mode: duration.mode,
        hours: duration.hours,
        now: input.now ?? new Date(),
        operationId: randomUUID(),
    });
}

export function acceptAllSlutSessions(groupId: string, buyerId: string, sessionCount: number, now = new Date()) {
    return repositories.roleplay.acceptAll({
        groupId,
        buyerId,
        roleCode: SLUT_ROLE_CODE,
        now,
        operationIds: Array.from({length: sessionCount}, () => randomUUID()),
    });
}

export function endSlutRole(input: {
    groupId: string;
    actorId: string;
    counterpartyId?: string;
    quotedMessageId?: string;
    now?: Date;
}) {
    return repositories.roleplay.endContracts({
        groupId: input.groupId,
        actorId: input.actorId,
        roleCode: SLUT_ROLE_CODE,
        counterpartyId: input.counterpartyId,
        quotedMessageId: input.quotedMessageId,
        now: input.now ?? new Date(),
        operationId: randomUUID(),
    });
}

export function listActiveSlutCounterparties(groupId: string, actorId: string) {
    return repositories.roleplay.listActiveCounterparties({groupId, actorId, roleCode: SLUT_ROLE_CODE});
}

export function recordSlutActionMessage(input: {
    messageId: string;
    contractId: string;
    groupId: string;
    actorId: string;
    targetId: string;
    actionCode: string;
    expiresAt?: Date;
}) {
    return repositories.roleplay.recordActionMessage({
        ...input,
        expiresAt: input.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000),
    });
}

export function findSlutActionContract(messageId: string, actorId: string) {
    return repositories.roleplay.findActionContract({messageId, actorId});
}

export function processDueRoleplayContracts(now = new Date(), limit = 100) {
    return repositories.roleplay.processDueContracts(now, limit);
}

export function cleanExpiredRoleplayActionMessages(now = new Date()) {
    return repositories.roleplay.cleanExpiredActionMessages(now);
}
