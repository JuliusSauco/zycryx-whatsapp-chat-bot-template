export interface NsfwContentItem {
    label: string;
    type: 'json' | 'api' | 'waifu' | 'array';
    aliases: string[];
    url?: string;
    api?: string;
    field?: string;
    array?: string[];
}

export const nsfwContent = {
    pack: {
        label: '_🥵 aqui tiene mi Pack 😏_',
        type: 'json',
        url: 'https://raw.githubusercontent.com/elrebelde21/The-LoliBot-MD2/main/src/nsfw/pack.json',
        aliases: []
    },
    pack2: {
        label: '_🥵 aqui tiene mi Pack 😏_',
        type: 'json',
        url: 'https://raw.githubusercontent.com/elrebelde21/The-LoliBot-MD2/main/src/nsfw/packgirl.json',
        aliases: []
    },
    pack3: {
        label: '_🥵 aqui tiene mi Pack 😏_',
        type: 'json',
        url: 'https://raw.githubusercontent.com/elrebelde21/The-LoliBot-MD2/main/src/nsfw/packmen.json',
        aliases: []
    },
    tetas: {
        label: '🥵 dame lechita de hay 🥵',
        type: 'json',
        url: 'https://raw.githubusercontent.com/elrebelde21/The-LoliBot-MD2/main/src/nsfw/tetas.json',
        aliases: ['pechos']
    },
    videoxxx: {
        label: '_*ᴅɪsғʀᴜᴛᴀ ᴅᴇʟ ᴠɪᴅᴇᴏ 🥵_',
        type: 'json',
        url: 'https://raw.githubusercontent.com/elrebelde21/The-LoliBot-MD2/main/src/nsfw/videoxxxc.json',
        aliases: ['vídeoxxx']
    },
    videoxxxlesbi: {
        label: '_*ᴅɪsғʀᴜᴛᴀ ᴅᴇʟ ᴠɪᴅᴇᴏ 🥵_',
        type: 'json',
        url: 'https://raw.githubusercontent.com/elrebelde21/The-LoliBot-MD2/main/src/nsfw/videoxxxc2.json',
        aliases: ['videolesbixxx', 'pornolesbivid']
    },
    pornololi: {
        label: '🥵',
        type: 'json',
        url: 'https://raw.githubusercontent.com/elrebelde21/The-LoliBot-MD2/main/src/nsfw/pornololi.json',
        aliases: ['pornololi']
    },
    yuri: {
        label: '👩‍❤️‍👩 Yuri',
        type: 'json',
        url: 'https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/yuri.json',
        aliases: []
    },
    yaoi: {
        label: '👨‍❤️‍👨 Yaoi',
        type: 'api',
        api: 'https://nekobot.xyz/api/image?type=yaoi',
        field: 'message',
        aliases: []
    },
    corean: {label: '🥵', type: 'api', api: 'https://delirius-apiofc.vercel.app/nsfw/corean', aliases: ["china"]},
    boobs: {label: 'Upa la paja 😱', type: 'api', api: 'https://delirius-apiofc.vercel.app/nsfw/boobs', aliases: []},
    girls: {
        label: '🥵 Uff pa una pajita 🥵',
        type: 'api',
        api: 'https://delirius-apiofc.vercel.app/nsfw/girls',
        aliases: ["porno"]
    },
    trapito: {label: '🚺 Trapito', type: 'waifu', api: 'trap', aliases: ['trap']},
} satisfies Record<string, NsfwContentItem>
