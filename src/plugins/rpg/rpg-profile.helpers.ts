import type {ExtendedConn} from '../../types/context.js';

export const DEFAULT_PROFILE_AVATAR = './resources/media/avatars/avatar_contact.png';

export async function loadProfileMedia(input: {
    conn: Pick<ExtendedConn, 'profilePictureUrl'>;
    mentionJid: string;
    groupJid?: string | null;
    fetchBuffer: (url: string) => Promise<Buffer>;
    onFallback?: (reason: 'profile_url' | 'profile_download' | 'group_url' | 'group_download') => void;
}): Promise<Buffer | string> {
    const profileMedia = await loadJidPicture(input, input.mentionJid, 'profile_url', 'profile_download');
    if (profileMedia) return profileMedia;

    if (input.groupJid) {
        const groupMedia = await loadJidPicture(input, input.groupJid, 'group_url', 'group_download');
        if (groupMedia) return groupMedia;
    }

    return DEFAULT_PROFILE_AVATAR;
}

async function loadJidPicture(
    input: Parameters<typeof loadProfileMedia>[0],
    jid: string,
    urlReason: 'profile_url' | 'group_url',
    downloadReason: 'profile_download' | 'group_download',
): Promise<Buffer | null> {
    let url: string | null;
    try {
        url = await input.conn.profilePictureUrl(jid, 'image') || null;
    } catch {
        input.onFallback?.(urlReason);
        return null;
    }
    if (!url) {
        input.onFallback?.(urlReason);
        return null;
    }
    try {
        return await input.fetchBuffer(url);
    } catch {
        input.onFallback?.(downloadReason);
        return null;
    }
}
