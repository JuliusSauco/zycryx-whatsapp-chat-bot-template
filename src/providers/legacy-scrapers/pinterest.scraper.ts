import {logError, logInfo, logWarn} from '../../lib/logger.js';
import WebSocket from "ws";
import axios from 'axios';
import {createHash} from 'crypto';
import {wrapper} from 'axios-cookiejar-support';
import * as cheerio from 'cheerio';
import {CookieJar} from 'tough-cookie';
import {ENV} from '../../core/env.js';
import {httpText} from '../../lib/http-client.js';
import {pickRandom, randomInt} from '../../utils/random.js';

type UnknownRecord = Record<string, unknown>;
type ChatMessage = {role: string; content: string; id?: string};
type ScraperResult = UnknownRecord & {
    status?: boolean;
    code?: number;
    success?: boolean;
    error?: string;
    data?: UnknownRecord & {response?: string};
    result?: UnknownRecord & {
        pins?: unknown;
        title?: string;
        type?: string;
        download?: string;
        thumbnail?: string;
    };
};
type BlackboxResult = ScraperResult & {
    data: UnknownRecord & {response: string; source?: unknown[]};
    error?: string;
};
type PinterestSearchResult = ScraperResult & {
    result: UnknownRecord & {pins: unknown[]};
};
type DownloadScraperResult = ScraperResult & {
    result: UnknownRecord & {
        title?: string;
        type?: string;
        download?: string;
        thumbnail?: string;
    };
};
type ValidationError = UnknownRecord & {
    param: string;
    error: string;
};
type PinterestImage = {url?: string; width?: number; height?: number};
type PinterestVideo = {url?: string; width?: number; height?: number; file_size?: number};
type AmdlLinkResult = ScraperResult & {id?: string};
type AmdlFileInfo = UnknownRecord & {
    worker?: string;
    file?: string;
    title?: string;
    thumbnail?: string;
    duration?: number;
    uploader?: string;
};
type CaptchaChallenge = {
    algorithm: string;
    challenge: string;
    salt: string;
    maxnumber: number;
    signature: string;
};
type YtdownProgress = ScraperResult & {
    download_url?: string;
    progress?: number;
    text?: string;
};
type StdoutWithCursor = NodeJS.WriteStream & {
    clearLine?: () => void;
    cursorTo?: (x: number) => void;
};

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);
const axiosStatus = (error: unknown): number => axios.isAxiosError(error) ? error.response?.status || 500 : 500;
const axiosData = (error: unknown): unknown => axios.isAxiosError(error) ? error.response?.data : undefined;
const asRecord = (value: unknown): UnknownRecord => value && typeof value === 'object' ? value as UnknownRecord : {};
//----------------------[Pinterest]---------------------------
const pinterest = {
    api: {
        base: "https://www.pinterest.com",
        endpoints: {
            search: "/resource/BaseSearchResource/get/",
            pin: "/resource/PinResource/get/",
            user: "/resource/UserResource/get/"
        }
    },

    headers: {
        'accept': 'application/json, text/javascript, */*, q=0.01',
        'referer': 'https://www.pinterest.com/',
        'user-agent': 'Postify/1.0.0',
        'x-app-version': 'a9522f',
        'x-pinterest-appstate': 'active',
        'x-pinterest-pws-handler': 'www/[username]/[slug].js',
        'x-pinterest-source-url': '/search/pins/?rs=typed&q=kucing%20anggora/',
        'x-requested-with': 'XMLHttpRequest'
    },

    isUrl: (str: string): boolean => {
        try {
            new URL(str);
            return true;
        } catch (_) {
            return false;
        }
    },

    isPin: (url: string): boolean => {
        if (!url) return false;
        const patterns = [
            /^https?:\/\/(?:www\.)?pinterest\.com\/pin\/[\w.-]+/,
            /^https?:\/\/(?:www\.)?pinterest\.[\w.]+\/pin\/[\w.-]+/,
            /^https?:\/\/(?:www\.)?pinterest\.(?:ca|co\.uk|com\.au|de|fr|id|es|mx|br|pt|jp|kr|nz|ru|at|be|ch|cl|dk|fi|gr|ie|nl|no|pl|pt|se|th|tr)\/pin\/[\w.-]+/,
            /^https?:\/\/pin\.it\/[\w.-]+/,
            /^https?:\/\/(?:www\.)?pinterest\.com\/amp\/pin\/[\w.-]+/,
            /^https?:\/\/(?:[a-z]{2}|www)\.pinterest\.com\/pin\/[\w.-]+/,
            /^https?:\/\/(?:www\.)?pinterest\.com\/pin\/[\d]+(?:\/)?$/,
            /^https?:\/\/(?:www\.)?pinterest\.[\w.]+\/pin\/[\d]+(?:\/)?$/,
            /^https?:\/\/(?:www\.)?pinterestcn\.com\/pin\/[\w.-]+/,
            /^https?:\/\/(?:www\.)?pinterest\.com\.[\w.]+\/pin\/[\w.-]+/
        ];

        const clean = url.trim().toLowerCase();
        return patterns.some(pattern => pattern.test(clean));
    },

    getCookies: async () => {
        try {
            const response = await axios.get(pinterest.api.base);
            const setHeaders = response.headers['set-cookie'];
            if (setHeaders) {
                const cookies = setHeaders.map(cookieString => {
                    const cp: string[] = cookieString.split(';');
                    const cv = cp[0].trim();
                    return cv;
                });
                return cookies.join('; ');
            }
            return null;
        } catch (error: unknown) {
            logError(error);
            return null;
        }
    },

    search: async (query: string, limit: number = 10): Promise<PinterestSearchResult> => {
        if (!query) {
            return {
                status: false,
                code: 400,
                result: {
                    pins: [],
                    message: "[ ❌ ] ¡Hermano, qué escribiste? ¿El query está literalmente vacío? ¿Crees que tengo un tercer ojo para adivinar? ¡Esfuérzate un poco, por favor!"
                }
            };
        }

        try {
            const cookies = await pinterest.getCookies();
            if (!cookies) {
                return {
                    status: false,
                    code: 400,
                    result: {
                        pins: [],
                        message: "[ ❌ ] No pude obtener las cookies, intenta de nuevo más tarde, ¿ya?"
                    }
                };
            }

            const params = {
                source_url: `/search/pins/?q=${query}`,
                data: JSON.stringify({
                    options: {
                        isPrefetch: false,
                        query: query,
                        scope: "pins",
                        bookmarks: [""],
                        no_fetch_context_on_resource: false,
                        page_size: limit
                    },
                    context: {}
                }),
                _: Date.now()
            };

            const {data} = await axios.get(`${pinterest.api.base}${pinterest.api.endpoints.search}`, {
                headers: {...pinterest.headers, 'cookie': cookies},
                params: params
            });

            const container: UnknownRecord[] = [];
            const results = (data.resource_response.data.results as UnknownRecord[]).filter((v) => asRecord(asRecord(v.images).orig));

            results.forEach((result) => {
                const images = asRecord(result.images);
                const pinner = asRecord(result.pinner);
                const videos = asRecord(result.videos);
                container.push({
                    id: result.id,
                    title: result.title || "",
                    description: result.description,
                    pin_url: `https://pinterest.com/pin/${result.id}`,
                    media: {
                        images: {
                            orig: images.orig,
                            small: images['236x'],
                            medium: images['474x'],
                            large: images['736x']
                        },
                        video: result.videos ? {
                            video_list: videos.video_list,
                            duration: videos.duration,
                            video_url: videos.video_url
                        } : null
                    },
                    uploader: {
                        username: pinner.username,
                        full_name: pinner.full_name,
                        profile_url: `https://pinterest.com/${pinner.username}`
                    }
                });
            });

            if (container.length === 0) {
                return {
                    status: false,
                    code: 404,
                    result: {
                        pins: [],
                        message: `[ ❌ ] ¡Qué desastre, hermano! No encontré nada con "${query}". En serio, tus habilidades de búsqueda necesitan mejorar, sin ofender, ¡esfuérzate más!`
                    }
                };
            }

            return {
                status: true,
                code: 200,
                result: {
                    query: query,
                    total: container.length,
                    pins: container
                }
            };

        } catch (error: unknown) {
            return {
                status: false,
                code: axiosStatus(error),
                result: {
                    pins: [],
                    message: "[ ❌ ] ¡El servidor está en caos, hermano! Me molestas todo el tiempo, necesita un descanso. Intenta de nuevo más tarde, ¿ok?"
                }
            };
        }
    },

    download: async (pinUrl: string): Promise<ScraperResult> => {
        if (!pinUrl) {
            return {
                status: false,
                code: 400,
                result: {
                    message: "[ ❌ ] ¿Me diste un link vacío, hermano? ¿En serio? ¿Quieres que descargue aire? ¡Esfuérzate un poco, estoy cansado!"
                }
            };
        }

        if (!pinterest.isUrl(pinUrl)) {
            return {
                status: false,
                code: 400,
                result: {
                    message: "[ ❌ ] ¿Qué link es este? ¡No sabes ni lo básico de URLs, qué locura!"
                }
            };
        }

        if (!pinterest.isPin(pinUrl)) {
            return {
                status: false,
                code: 400,
                result: {
                    message: "[ ❌ ] ¡Por favor, esto no es un link de Pinterest, hermano!"
                }
            };
        }

        try {
            const pinId = pinUrl.split('/pin/')[1].replace('/', '');
            const cookies = await pinterest.getCookies();

            if (!cookies) {
                return {
                    status: false,
                    code: 400,
                    result: {
                        message: "[ ❌ ] No pude obtener las cookies, intenta de nuevo más tarde, ¿ya?"
                    }
                };
            }

            const params = {
                source_url: `/pin/${pinId}/`,
                data: JSON.stringify({
                    options: {
                        field_set_key: "detailed",
                        id: pinId,
                    },
                    context: {}
                }),
                _: Date.now()
            };

            const {data} = await axios.get(`${pinterest.api.base}${pinterest.api.endpoints.pin}`, {
                headers: {...pinterest.headers, 'cookie': cookies},
                params: params
            });

            if (!data.resource_response.data) {
                return {
                    status: false,
                    code: 404,
                    result: {
                        message: "[ ❌ ] El pin ya no existe, hermano, se fue, expiró, ¡borrado del planeta! Busca algo que exista, me cansé de explicarte."
                    }
                };
            }

            const pd = data.resource_response.data;
            const mediaUrls: UnknownRecord[] = [];

            if (pd.videos) {
                const videoFormats = Object.values(pd.videos.video_list as Record<string, PinterestVideo>)
                    .sort((a, b) => (b.width || 0) - (a.width || 0));

                videoFormats.forEach((video) => {
                    mediaUrls.push({
                        type: 'video',
                        quality: `${video.width}x${video.height}`,
                        width: video.width,
                        height: video.height,
                        duration: pd.videos.duration || null,
                        url: video.url,
                        file_size: video.file_size || null,
                        thumbnail: pd.images.orig.url
                    });
                });
            }

            if (pd.images) {
                const imge = {
                    'original': pd.images.orig,
                    'large': pd.images['736x'],
                    'medium': pd.images['474x'],
                    'small': pd.images['236x'],
                    'thumbnail': pd.images['170x']
                };

                Object.entries(imge).forEach(([quality, image]) => {
                    const imageInfo = image as PinterestImage | undefined;
                    if (imageInfo) {
                        mediaUrls.push({
                            type: 'image',
                            quality: quality,
                            width: imageInfo.width,
                            height: imageInfo.height,
                            url: imageInfo.url,
                            size: `${imageInfo.width}x${imageInfo.height}`
                        });
                    }
                });
            }

            if (mediaUrls.length === 0) {
                return {
                    status: false,
                    code: 404,
                    result: {
                        message: "[ ❌ ] ¡Qué desastre, hermano! El pin no tiene medios. ¿Qué esperas que descargue, solo vibes? ¡Qué locura!"
                    }
                };
            }

            return {
                status: true,
                code: 200,
                result: {
                    id: pd.id,
                    title: pd.title || pd.grid_title || "",
                    description: pd.description || "",
                    created_at: pd.created_at,
                    dominant_color: pd.dominant_color || null,
                    link: pd.link || null,
                    category: pd.category || null,
                    media_urls: mediaUrls,
                    statistics: {
                        saves: pd.repin_count || 0,
                        comments: pd.comment_count || 0,
                        reactions: pd.reaction_counts || {},
                        total_reactions: pd.total_reaction_count || 0,
                        views: pd.view_count || 0,
                        saves_by_category: pd.aggregated_pin_data?.aggregated_stats || {},
                    },
                    source: {
                        name: pd.domain || null,
                        url: pd.link || null,
                        favicon: pd.favicon_url || null,
                        provider: pd.provider_name || null,
                        rating: pd.embed?.src_rating || null
                    },
                    board: {
                        id: pd.board?.id || null,
                        name: pd.board?.name || null,
                        url: pd.board?.url ? `https://pinterest.com${pd.board.url}` : null,
                        owner: {
                            id: pd.board?.owner?.id || null,
                            username: pd.board?.owner?.username || null
                        }
                    },
                    uploader: {
                        id: pd.pinner?.id || null,
                        username: pd.pinner?.username || null,
                        full_name: pd.pinner?.full_name || null,
                        profile_url: pd.pinner?.username ? `https://pinterest.com/${pd.pinner.username}` : null,
                        image: {
                            small: pd.pinner?.image_small_url || null,
                            medium: pd.pinner?.image_medium_url || null,
                            large: pd.pinner?.image_large_url || null,
                            original: pd.pinner?.image_xlarge_url || null
                        },
                        type: pd.pinner?.type || "user",
                        is_verified: pd.pinner?.verified_identity || false
                    },
                    metadata: {
                        article: pd.article || null,
                        product: {
                            price: pd.price_value || null,
                            currency: pd.price_currency || null,
                            availability: pd.shopping_flags || null,
                            ratings: pd.rating || null,
                            reviews_count: pd.review_count || null
                        },
                        recipe: pd.recipe || null,
                        video: pd.videos ? {
                            duration: pd.videos.duration || null,
                            views: pd.videos.video_view_count || null,
                            cover: pd.videos.cover_image_url || null
                        } : null
                    },
                    is_promoted: pd.is_promoted || false,
                    is_downloadable: pd.is_downloadable || true,
                    is_playable: pd.is_playable || false,
                    is_repin: pd.is_repin || false,
                    is_video: pd.is_video || false,
                    has_required_attribution: pd.attribution || null,
                    privacy_level: pd.privacy || "public",
                    tags: pd.pin_join?.annotations || [],
                    hashtags: pd.hashtags || [],
                    did_it_data: pd.did_it_data || null,
                    native_creator: pd.native_creator || null,
                    sponsor: pd.sponsor || null,
                    visual_search_objects: pd.visual_search_objects || []
                }
            };

        } catch (error: unknown) {
            if (axiosStatus(error) === 404) {
                return {
                    status: false,
                    code: 404,
                    result: {
                        message: "[ ❌ ] El pin ya no existe, hermano, se fue, expiró, ¡borrado del planeta! Busca algo que exista, me cansé de explicarte."
                    }
                };
            }

            return {
                status: false,
                code: axiosStatus(error),
                result: {
                    message: "[ ❌ ] ¡El servidor está en caos, hermano! Me molestas todo el tiempo, necesita un descanso. Intenta de nuevo más tarde, ¿ok?"
                }
            };
        }
    },

    profile: async (username: string): Promise<ScraperResult> => {
        if (!username) {
            return {
                status: false,
                code: 400,
                result: {
                    message: "[ ❌ ] ¿Dónde está el username, hermano? ¿Esperas que sea adivino? ¡Dame un username al menos, por favor!"
                }
            };
        }

        try {
            const cookies = await pinterest.getCookies();
            if (!cookies) {
                return {
                    status: false,
                    code: 400,
                    result: {
                        message: "[ ❌ ] No pude obtener las cookies, intenta de nuevo más tarde, ¿ya?"
                    }
                };
            }

            const params = {
                source_url: `/${username}/`,
                data: JSON.stringify({
                    options: {
                        username: username,
                        field_set_key: "profile",
                        isPrefetch: false,
                    },
                    context: {}
                }),
                _: Date.now()
            };

            const {data} = await axios.get(`${pinterest.api.base}${pinterest.api.endpoints.user}`, {
                headers: {...pinterest.headers, 'cookie': cookies},
                params: params
            });

            if (!data.resource_response.data) {
                return {
                    status: false,
                    code: 404,
                    result: {
                        message: "[ ❌ ] ¡El usuario no existe, hermano! ¿A quién estás buscando en realidad?"
                    }
                };
            }

            const userx = data.resource_response.data;

            return {
                status: true,
                code: 200,
                result: {
                    id: userx.id,
                    username: userx.username,
                    full_name: userx.full_name || "",
                    bio: userx.about || "",
                    email: userx.email || null,
                    type: userx.type || "user",
                    profile_url: `https://pinterest.com/${userx.username}`,
                    image: {
                        small: userx.image_small_url || null,
                        medium: userx.image_medium_url || null,
                        large: userx.image_large_url || null,
                        original: userx.image_xlarge_url || null
                    },
                    stats: {
                        pins: userx.pin_count || 0,
                        followers: userx.follower_count || 0,
                        following: userx.following_count || 0,
                        boards: userx.board_count || 0,
                        likes: userx.like_count || 0,
                        saves: userx.save_count || 0
                    },
                    website: userx.website_url || null,
                    domain_url: userx.domain_url || null,
                    domain_verified: userx.domain_verified || false,
                    explicitly_followed_by_me: userx.explicitly_followed_by_me || false,
                    implicitly_followed_by_me: userx.implicitly_followed_by_me || false,
                    location: userx.location || null,
                    country: userx.country || null,
                    is_verified: userx.verified_identity || false,
                    is_partner: userx.is_partner || false,
                    is_indexed: userx.indexed || false,
                    is_tastemaker: userx.is_tastemaker || false,
                    is_employee: userx.is_employee || false,
                    is_blocked: userx.blocked_by_me || false,
                    meta: {
                        first_name: userx.first_name || null,
                        last_name: userx.last_name || null,
                        full_name: userx.full_name || "",
                        locale: userx.locale || null,
                        gender: userx.gender || null,
                        partner: {
                            is_partner: userx.is_partner || false,
                            partner_type: userx.partner_type || null
                        }
                    },
                    account_type: userx.account_type || null,
                    personalize_pins: userx.personalize || false,
                    connected_to_etsy: userx.connected_to_etsy || false,
                    has_password: userx.has_password || true,
                    has_mfa: userx.has_mfa || false,
                    created_at: userx.created_at || null,
                    last_login: userx.last_login || null,
                    social_links: {
                        twitter: userx.twitter_url || null,
                        facebook: userx.facebook_url || null,
                        instagram: userx.instagram_url || null,
                        youtube: userx.youtube_url || null,
                        etsy: userx.etsy_url || null
                    },
                    custom_gender: userx.custom_gender || null,
                    pronouns: userx.pronouns || null,
                    board_classifications: userx.board_classifications || {},
                    interests: userx.interests || []
                }
            };

        } catch (error: unknown) {
            if (axiosStatus(error) === 404) {
                return {
                    status: false,
                    code: 404,
                    result: {
                        message: "[ ❌ ] ¡El username no es válido, hermano! Buscas a lo loco, mejor googlea primero."
                    }
                };
            }

            return {
                status: false,
                code: axiosStatus(error),
                result: {
                    message: "[ ❌ ] ¡El servidor está en caos, hermano! Me molestas todo el tiempo, necesita un descanso. Intenta de nuevo más tarde, ¿ok?"
                }
            };
        }
    }
};

export {pinterest};
