import {and, eq} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {groupSettings, userGroupRoles, usuarios} from '../../db/schema.js';
import type {UserGroupRoleRepository} from '../../ports/repositories.js';
import {mapUserGroupRole} from './group-settings.mapper.js';

export const userGroupRoleRepository: UserGroupRoleRepository = {
    async upsert({groupId, userId, role, roleDescription, updatedBy}) {
        await orm.transaction(async tx => {
            await tx.insert(groupSettings).values({groupId}).onConflictDoNothing();
            await tx.insert(usuarios).values([{id: userId}, ...(updatedBy ? [{id: updatedBy}] : [])]).onConflictDoNothing();
            await tx.insert(userGroupRoles)
                .values({groupId, userId, role, roleDescription, updatedBy, updatedAt: new Date()})
                .onConflictDoUpdate({
                    target: [userGroupRoles.groupId, userGroupRoles.userId],
                    set: {role, roleDescription, updatedBy, updatedAt: new Date()},
                });
        });
    },

    async insertDefaultIfMissing({groupId, userId, role, roleDescription, updatedBy}) {
        await orm.transaction(async tx => {
            await tx.insert(groupSettings).values({groupId}).onConflictDoNothing();
            await tx.insert(usuarios).values([{id: userId}, ...(updatedBy ? [{id: updatedBy}] : [])]).onConflictDoNothing();
            await tx.insert(userGroupRoles)
                .values({groupId, userId, role, roleDescription, updatedBy: updatedBy || null, updatedAt: new Date()})
                .onConflictDoNothing({target: [userGroupRoles.groupId, userGroupRoles.userId]});
        });
    },

    async find(groupId, userId) {
        const [row] = await orm.select()
            .from(userGroupRoles)
            .where(and(eq(userGroupRoles.groupId, groupId), eq(userGroupRoles.userId, userId)))
            .limit(1);

        return row ? mapUserGroupRole(row) : null;
    },

    async listByGroup(groupId) {
        const rows = await orm.select()
            .from(userGroupRoles)
            .where(eq(userGroupRoles.groupId, groupId));

        return rows.map(mapUserGroupRole);
    },
};
