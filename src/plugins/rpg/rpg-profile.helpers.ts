import type {ExtendedConn} from '../../types/context.js';

export const DEFAULT_PROFILE_AVATAR = './resources/media/avatars/avatar_contact.png';

export async function loadProfileMedia(input: {
    conn: Pick<ExtendedConn, 'profilePictureUrl'>;
    mentionJid: string;
    fetchBuffer: (url: string) => Promise<Buffer>;
    onFallback?: (reason: 'profile_url' | 'profile_download') => void;
}): Promise<Buffer | string> {
    let url: string;
    try {
        const resolvedUrl = await input.conn.profilePictureUrl(input.mentionJid, 'image');
        if (!resolvedUrl) return DEFAULT_PROFILE_AVATAR;
        url = resolvedUrl;
    } catch {
        input.onFallback?.('profile_url');
        return DEFAULT_PROFILE_AVATAR;
    }
    try {
        return await input.fetchBuffer(url);
    } catch {
        input.onFallback?.('profile_download');
        return DEFAULT_PROFILE_AVATAR;
    }
}
