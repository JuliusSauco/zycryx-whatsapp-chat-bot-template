import fg from 'api-dylux';
import {httpJson} from '../../lib/http-client.js';
import {DEFAULT_PROVIDER_TIMEOUT_MS, runProviderCandidates, type ProviderCandidate, type ProviderResult, withProviderPolicy} from '../provider.types.js';

export type TikTokStalkProfile =
    | {
        source: 'main';
        username?: string;
        nickname?: string;
        verified?: boolean;
        signature?: string;
        url?: string;
        avatar?: string;
        followers: number;
        following: number;
        likes: number;
        videos: number;
    }
    | {
        source: 'api-dylux';
        name?: string;
        username: string;
        followers?: string | number;
        following?: string | number;
        description?: string;
        avatar?: string;
    };

interface TikTokStalkResponse {
    result?: {
        users?: {
            username?: string;
            nickname?: string;
            verified?: boolean;
            signature?: string;
            url?: string;
            avatarLarger?: string;
        };
        stats?: {
            followerCount?: number;
            followingCount?: number;
            heartCount?: number;
            videoCount?: number;
        };
    };
}

interface DyluxTikTokProfile {
    name?: string;
    username?: string;
    followers?: string | number;
    following?: string | number;
    desc?: string;
    profile?: string;
}

export function buildTikTokStalkProviders(username: string): ProviderCandidate<TikTokStalkProfile>[] {
    return withProviderPolicy<TikTokStalkProfile>([
        {
            name: 'main-tiktok-stalk',
            run: async () => {
                const data = await httpJson<TikTokStalkResponse>(`${info.apis}/tools/tiktokstalk?q=${encodeURIComponent(username)}`);
                const profile = data.result?.users;
                if (!profile?.username || !profile.avatarLarger) return null;
                const stats = data.result?.stats || {};
                return {
                    source: 'main',
                    username: profile.username,
                    nickname: profile.nickname,
                    verified: profile.verified,
                    signature: profile.signature,
                    url: profile.url,
                    avatar: profile.avatarLarger,
                    followers: stats.followerCount || 0,
                    following: stats.followingCount || 0,
                    likes: stats.heartCount || 0,
                    videos: stats.videoCount || 0,
                };
            },
        },
        {
            name: 'api-dylux-tiktok-stalk',
            run: async () => {
                const profile = await fg.ttStalk(username) as DyluxTikTokProfile;
                if (!profile?.username || !profile.profile) return null;
                return {
                    source: 'api-dylux',
                    name: profile.name,
                    username: profile.username,
                    followers: profile.followers,
                    following: profile.following,
                    description: profile.desc,
                    avatar: profile.profile,
                };
            },
        },
    ], {timeoutMs: DEFAULT_PROVIDER_TIMEOUT_MS, retries: 1});
}

export function getTikTokStalkProfile(username: string): Promise<ProviderResult<TikTokStalkProfile>> {
    return runProviderCandidates(buildTikTokStalkProviders(username));
}
