import fg from 'api-dylux';
import {httpJson} from '../../lib/http-client.js';
import {DEFAULT_PROVIDER_TIMEOUT_MS, runProviderCandidates, type ProviderCandidate, type ProviderResult, withProviderPolicy} from '../provider.types.js';

export type InstagramStalkProfile =
    | {
        source: 'main';
        username?: string;
        fullName?: string;
        biography?: string;
        verified?: boolean;
        private?: boolean;
        followers?: number;
        following?: number;
        posts?: number;
        url?: string;
        profilePicture?: string;
    }
    | {
        source: 'api-dylux';
        name?: string;
        username: string;
        followers?: string;
        following?: string;
        description?: string;
        posts?: string;
        profilePicture?: string;
    };

interface InstagramStalkResponse {
    data?: {
        username?: string;
        full_name?: string;
        biography?: string;
        verified?: boolean;
        private?: boolean;
        followers?: number;
        following?: number;
        posts?: number;
        url?: string;
        profile_picture?: string;
    };
}

interface DyluxInstagramProfile {
    name?: string;
    username?: string;
    followersH?: string;
    followingH?: string;
    description?: string;
    postsH?: string;
    profilePic?: string;
}

export function buildInstagramStalkProviders(username: string): ProviderCandidate<InstagramStalkProfile>[] {
    return withProviderPolicy<InstagramStalkProfile>([
        {
            name: 'main-instagram-stalk',
            run: async () => {
                const data = await httpJson<InstagramStalkResponse>(`${info.apis}/tools/igstalk?username=${encodeURIComponent(username)}`);
                const profile = data.data;
                if (!profile?.username || !profile.profile_picture) return null;
                return {
                    source: 'main',
                    username: profile.username,
                    fullName: profile.full_name,
                    biography: profile.biography,
                    verified: profile.verified,
                    private: profile.private,
                    followers: profile.followers,
                    following: profile.following,
                    posts: profile.posts,
                    url: profile.url,
                    profilePicture: profile.profile_picture,
                };
            },
        },
        {
            name: 'api-dylux-instagram-stalk',
            run: async () => {
                const profile = await fg.igStalk(username) as DyluxInstagramProfile;
                if (!profile?.username || !profile.profilePic) return null;
                return {
                    source: 'api-dylux',
                    name: profile.name,
                    username: profile.username,
                    followers: profile.followersH,
                    following: profile.followingH,
                    description: profile.description,
                    posts: profile.postsH,
                    profilePicture: profile.profilePic,
                };
            },
        },
    ], {timeoutMs: DEFAULT_PROVIDER_TIMEOUT_MS, retries: 1});
}

export function getInstagramStalkProfile(username: string): Promise<ProviderResult<InstagramStalkProfile>> {
    return runProviderCandidates(buildInstagramStalkProviders(username));
}
