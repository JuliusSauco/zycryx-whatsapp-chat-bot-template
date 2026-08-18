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
const modelConfig = (model: string): UnknownRecord | undefined => (perplexity.api.models as Record<string, UnknownRecord>)[model];

//-------------------[IA BLACKBOXAI]--------------------

async function blackboxAi(query: string): Promise<BlackboxResult> {
    try {
        const headers = {
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'id-ID,id;q=0.9',
            'Content-Type': 'application/json',
            'Origin': 'https://www.blackbox.ai',
            'Referer': 'https://www.blackbox.ai/',
            'Sec-Ch-Ua': '"Chromium";v="137", "Not/A)Brand";v="24"',
            'Sec-Ch-Ua-Mobile': '?1',
            'Sec-Ch-Ua-Platform': '"Android"',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
        };

        const payload = {
            messages: [{role: 'user', content: query, id: '0quFtyH'}],
            id: 'KB5EUHk',
            previewToken: null,
            userId: null,
            codeModelMode: true,
            trendingAgentMode: {},
            isMicMode: false,
            userSystemPrompt: null,
            maxTokens: 1024,
            playgroundTopP: null,
            playgroundTemperature: null,
            isChromeExt: false,
            githubToken: '',
            clickedAnswer2: false,
            clickedAnswer3: false,
            clickedForceWebSearch: false,
            visitFromDelta: false,
            isMemoryEnabled: false,
            mobileClient: false,
            userSelectedModel: null,
            validated: '00f37b34-a166-4efb-bce5-1312d87f2f94',
            imageGenerationMode: false,
            webSearchModePrompt: false,
            deepSearchMode: false,
            domains: null,
            vscodeClient: false,
            codeInterpreterMode: false,
            customProfile: {
                name: '',
                occupation: '',
                traits: [],
                additionalInfo: '',
                enableNewChats: false
            },
            webSearchModeOption: {
                autoMode: true,
                webMode: false,
                offlineMode: false
            },
            session: null,
            isPremium: false,
            subscriptionCache: null,
            beastMode: false,
            reasoningMode: false,
            designerMode: false,
            workspaceId: '',
            asyncMode: false,
            isTaskPersistent: false
        };

        const postRes = await axios.post('https://www.blackbox.ai/api/chat', payload, {
            headers
        });

        const raw = String(postRes.data);
        const parsed = raw.split('$~~~$');
        if (parsed.length === 1) {
            return {
                creator: "elrebelde21",
                status: true,
                data: {
                    response: parsed[0].trim(),
                    source: []
                }
            };
        } else if (parsed.length >= 3) {
            const resultText = parsed[2].trim();
            const resultSources = JSON.parse(parsed[1]) as UnknownRecord[];
            return {
                creator: "elrebelde21",
                status: true,
                data: {
                    response: resultText,
                    source: resultSources.map((s) => ({
                        link: s.link,
                        title: s.title,
                        snippet: s.snippet,
                        position: s.position
                    }))
                }
            };
        } else {
            throw new Error("Format response tidak dikenali.");
        }
    } catch (err: unknown) {
        logError("Terjadi kesalahan:", errorMessage(err));
        return {
            creator: "elrebelde21",
            status: false,
            data: {response: '', source: []},
            error: errorMessage(err)
        };
    }
}

//-------------------[IA EXOML]--------------------

const exoml = {
    createRequestIds: () => {
        const gen = (length: number, charSet: Partial<Record<'lowerCase' | 'upperCase' | 'symbol' | 'number', boolean>> = {}) => {
            const l = "abcdefghijklmnopqrstuvwxyz" // lowercase
            const u = l.toUpperCase() // uppercase
            const s = "-_" // symbol
            const n = "0123456789" // number

            let cs = "" // character set
            const {lowerCase = false, upperCase = false, symbol = false, number = false} = charSet

            if (!lowerCase && !upperCase && !symbol && !number) {
                cs += l + u + s + n
            } else {
                if (lowerCase) cs += l
                if (upperCase) cs += u
                if (symbol) cs += s
                if (number) cs += n
            }

            const result = Array.from({length}, () => cs[randomInt(cs.length)]).join("") || null
            return result
        }

        const id = gen(16, {upperCase: true, lowerCase: true, number: true}) //TXulzbGqk0EDzPeT
        const chatId = `chat-${new Date().getTime()}-${gen(9, {lowerCase: true, number: true})}` //chat-1749292523602-k0tna5ef8
        const userId = `local-user-${new Date().getTime()}-${gen(9, {lowerCase: true, number: true})}` //local-user-1749292766705-b49yu10mm
        const antiBotId = `${gen(32)}-${gen(8, {number: true, lowerCase: true})}` //jUxRXb2xJbf8BVmIn2NGhncRQePiIiNE-8gvna4dd
        return {id, chatId, userId, antiBotId}
    },

    generate: async (messages: ChatMessage[], systemPrompt: string, model: string) => {

        const body = JSON.stringify(
            {
                messages,
                systemPrompt,
                model,
                "isAuthenticated": true,
                ...exoml.createRequestIds()
            }
        )

        const headers = {
            "content-type": "application/json",
        }

        const data = await httpText("https://exomlapi.com/api/chat", {
            headers,
            body,
            "method": "post"
        })

        // aku buruk dalam memparsing ini
        const anu = [...data.matchAll(/^0:"(.*?)"$/gm)].map(v => v[1]).join("").replaceAll("\\n", "\n").replaceAll("\\\"", "\"")
        if (!anu) throw Error(`gagal parsing pesan dari server, kemungkinan pesan kosong / error.\n\n${data}`)
        return anu

    }
}

//-------------------[IA PERPLEXITY]--------------------

const perplexity = {
    api: {
        base: 'https://api.perplexity.ai/chat/completions',

        models: {
            'sonar-medium-online': {
                description: 'Online-enabled medium model',
                context: 12000
            },
            'sonar-small-online': {
                description: 'Online-enabled small model',
                context: 12000
            },
            'sonar-medium-chat': {
                description: 'Optimized medium chat model',
                context: 12000
            },
            'sonar-small-chat': {
                description: 'Optimized small chat model',
                context: 12000
            },
            'sonar-reasoning-pro': {
                description: 'Advanced reasoning model with enhanced capabilities',
                context: 16384
            },
            'sonar-reasoning': {
                description: 'Balanced reasoning model',
                context: 8192
            },
            'sonar-pro': {
                description: 'Enhanced general purpose model',
                context: 8192
            },
            'sonar': {
                description: 'Fast and efficient model',
                context: 4096
            },
            'mixtral-8x7b-instruct': {
                description: 'Mixtral instruction model',
                context: 8192
            },
            'codellama-70b-instruct': {
                description: 'Code specialized model',
                context: 8192
            },
            'llama-2-70b-chat': {
                description: 'LLaMA 2 chat model',
                context: 4096
            }
        },

        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Postify/1.0.0'
        },

        keys: ENV.PERPLEXITY_API_KEYS.split(',').map(key => key.trim()).filter(Boolean),

        retry: {
            maxAttempts: 3,
            delayMs: 2000,
            timeoutMs: 60000
        }
    },

    isParams: (messages: unknown, model: string, temperature: number): ValidationError[] => {
        const errors: ValidationError[] = [];

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            errors.push({
                param: 'messages',
                error: 'Udah capek yak gua ngasih tau lu, input tuh minimal diisi napa 🗿',
                example: [{
                    role: 'user',
                    content: 'inputnya disini yakk'
                }]
            });
        } else {
            messages.forEach((msg: Partial<ChatMessage>, index: number) => {
                if (!msg.role || !msg.content) {
                    errors.push({
                        param: `messages[${index}]`,
                        error: 'Format message lu ngaco anjirr 🗿',
                        example: {
                            role: 'user/assistant',
                            content: 'inputnya disini yakk'
                        }
                    });
                }
            });
        }

        if (!model) {
            errors.push({
                param: 'model',
                error: 'Literally modelnya kagak diisi bree?? Minimal input lah 1 mah 🗿',
                available: Object.keys(perplexity.api.models)
            });
        } else if (!modelConfig(model)) {
            errors.push({
                param: 'model',
                error: 'Model yang lu pilih kagak ada bree! Pilih aja salah satu dari list ini yak ..',
                available: Object.keys(perplexity.api.models)
            });
        }

        if (temperature === undefined || temperature === null) {
            errors.push({
                param: 'temperature',
                error: 'Temperaturenya mana bree?! Kagak kosong begini dong 🗿',
                range: '0.0 - 1.0',
                recommended: 0.7
            });
        } else if (temperature < 0 || temperature > 1) {
            errors.push({
                param: 'temperature',
                error: 'Temperaturenya kebanyakan atau kurang ngab! Rangenya 0-1 doang yak 🙃',
                range: '0.0 - 1.0',
                recommended: 0.7
            });
        }

        return errors;
    },

    key: () => {
        if (!perplexity.api.keys.length) throw new Error('PERPLEXITY_API_KEYS no está configurado');
        return pickRandom(perplexity.api.keys);
    },

    delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

    retry: async <T>(operation: () => Promise<T>, attempt: number = 1): Promise<T> => {
        try {
            return await operation();
        } catch (error: unknown) {
            if (attempt >= perplexity.api.retry.maxAttempts) {
                throw error;
            }

            logInfo(`🔄 Ngetry attempt yang ke-${attempt}, nunggu ${perplexity.api.retry.delayMs}ms yak bree 😂...`);
            logError(errorMessage(error));

            await perplexity.delay(perplexity.api.retry.delayMs * attempt);
            return await perplexity.retry(operation, attempt + 1);
        }
    },

    createAxiosInstance: () => axios.create({
        baseURL: perplexity.api.base,
        timeout: perplexity.api.retry.timeoutMs,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
    }),

    getHeaders: (apiKey: string) => {
        return {
            'Authorization': `Bearer ${apiKey}`,
            ...perplexity.api.headers
        };
    },

    chat: async (messages: ChatMessage[], model: string = 'sonar', temperature: number = 0.7): Promise<ScraperResult> => {
        const ve = perplexity.isParams(messages, model, temperature);
        if (ve.length > 0) {
            return {
                status: false,
                code: 400,
                result: {
                    error: 'Parameter lu pada ngaco semua anjiir 🌝',
                    details: ve
                }
            };
        }

        return await perplexity.retry(async () => {
            const axiosInstance = perplexity.createAxiosInstance();
            const perplexityKey = perplexity.key();

            try {
                const response = await axiosInstance.post('', {
                    model: model,
                    messages: messages,
                    temperature: temperature,
                    max_tokens: 4096,
                    stream: false
                }, {
                    headers: perplexity.getHeaders(perplexityKey)
                });

                return {
                    status: true,
                    code: 200,
                    result: {
                        response: response.data.choices[0].message.content,
                        model: {
                            name: model,
                        ...modelConfig(model)
                        }
                    }
                };

            } catch (error: unknown) {
                const e = {
                    status: false,
                    code: axiosStatus(error),
                    result: {
                        error: 'Error bree 🗿',
                        details: errorMessage(error),
                        solution: 'Coba lagi nanti aja bree, sapa tau berhasil nanti 😂'
                    }
                };
                throw e;
            }
        });
    },

    stream: async (messages: ChatMessage[], model: string = 'sonar', temperature: number = 0.7, onChunk: (chunk: string) => void): Promise<ScraperResult> => {
        const ve = perplexity.isParams(messages, model, temperature);
        if (ve.length > 0) {
            return {
                status: false,
                code: 400,
                result: {
                    error: 'Parameter lu pada ngaco semua bree 😫',
                    details: ve
                }
            };
        }

        if (typeof onChunk !== 'function') {
            return {
                status: false,
                code: 400,
                result: {
                    error: 'Function callbacknya mana bree?! 😤',
                    details: [{
                        param: 'onChunk',
                        error: 'Kudu pake callback function buat streaminnya bree!',
                        example: '(chunk) => logInfo(chunk)'
                    }]
                }
            };
        }

        return await perplexity.retry(async () => {
            const axiosInstance = perplexity.createAxiosInstance();
            const perplexityKey = perplexity.key();

            try {
                const response = await axiosInstance.post('', {
                    model: model,
                    messages: messages,
                    temperature: temperature,
                    max_tokens: 4096,
                    stream: true
                }, {
                    headers: perplexity.getHeaders(perplexityKey),
                    responseType: 'stream'
                });

                let pull = '';

                for await (const chunk of response.data) {
                    const lines = chunk.toString().split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const result = JSON.parse(line.slice(5));
                                if (result.choices?.[0]?.delta?.content) {
                                    const content = result.choices[0].delta.content;
                                    pull += content;
                                    onChunk(content);
                                }
                            } catch (e) {
                                if (!line.includes('[DONE]')) {
                                    logWarn('❌ Gagal parse chunknya bree: ', e);
                                }
                            }
                        }
                    }
                }

                return {
                    status: true,
                    code: 200,
                    result: {
                        response: pull,
                        model: {
                            name: model,
                            ...modelConfig(model)
                        }
                    }
                };

            } catch (error: unknown) {
                const e = {
                    status: false,
                    code: axiosStatus(error),
                    result: {
                        error: 'Streamingnya error bree 😑',
                        details: errorMessage(error),
                        solution: 'Reset ulang aja dah streamingnya bree 🔄'
                    }
                };
                throw e;
            }
        });
    }
};

export {blackboxAi, exoml, perplexity};
