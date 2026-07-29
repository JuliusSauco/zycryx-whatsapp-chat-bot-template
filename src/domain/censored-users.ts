export interface CensoredUserRecord {
    group_id: string;
    user_id: string;
    user_lid: string | null;
    censored_by: string;
    created_at: Date;
}

export interface UpsertCensoredUserInput {
    groupId: string;
    userId: string;
    userLid: string | null;
    censoredBy: string;
}
