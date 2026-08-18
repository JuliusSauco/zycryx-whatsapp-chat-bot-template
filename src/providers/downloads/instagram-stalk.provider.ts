import {externalApis} from '../external-api-config.js';
import {httpJson} from '../../lib/http-client.js';
import {DEFAULT_PROVIDER_TIMEOUT_MS, runProviderCandidates, type ProviderCandidate, type ProviderResult, withProviderPolicy} from '../provider.types.js';

export type InstagramStalkProfile = {
        source: 'main';
        username: string;
        fullName?: string;
        biography?: string;
        verified?: boolean;
        private?: boolean;
        followers?: number;
        following?: number;
        posts?: number;
        url?: string;
        profilePicture: string;
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

export function buildInstagramStalkProviders(username: string): ProviderCandidate<InstagramStalkProfile>[] {
    return withProviderPolicy<InstagramStalkProfile>([
        {
            name: 'main-instagram-stalk',
            run: async () => {
                const data = await httpJson<InstagramStalkResponse>(`${externalApis.main.url}/tools/igstalk?username=${encodeURIComponent(username)}`);
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
    ], {timeoutMs: DEFAULT_PROVIDER_TIMEOUT_MS, retries: 1});
}

export function getInstagramStalkProfile(username: string): Promise<ProviderResult<InstagramStalkProfile>> {
    return runProviderCandidates(buildInstagramStalkProviders(username));
}
