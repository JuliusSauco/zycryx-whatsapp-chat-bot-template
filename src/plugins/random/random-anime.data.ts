export interface RandomContentItem {
    label: string;
    type?: 'api' | 'json' | 'video' | 'static';
    api?: string;
    nsfwApi?: string;
    url?: string;
    vids?: string[];
    imgs?: string[];
    isMeme?: boolean;
    aliases: string[];
}

export const randomAnimeContent = {
    waifu: {label: '*💖 Nyaww 💖*', api: 'waifu', nsfwApi: 'waifu', type: 'api', aliases: []},
    neko: {label: '🐱 Neko', api: 'neko', nsfwApi: 'neko', type: 'api', aliases: ['gatito', 'nyan']},
    shinobu: {label: '🍡 Shinobu', api: 'shinobu', type: 'api', aliases: []},
    megumin: {label: '💥 Megumin', api: 'megumin', type: 'api', aliases: ['meg']},
    bully: {label: '😈 Bully', api: 'bully', type: 'api', aliases: []},
    cuddle: {label: '🥰 Cuddle', api: 'cuddle', type: 'api', aliases: []},
    cry: {label: '😭 Cry', api: 'cry', type: 'api', aliases: []},
    bonk: {label: '🔨 Bonk', api: 'bonk', type: 'api', aliases: []},
    wink: {label: '😉 Wink', api: 'wink', type: 'api', aliases: []},
    handhold: {label: '🤝 Handhold', api: 'handhold', type: 'api', aliases: []},
    nom: {label: '🍪 Nom', api: 'nom', type: 'api', aliases: []},
    glomp: {label: '💞 Glomp', api: 'glomp', type: 'api', aliases: []},
    happy: {label: '😁 Happy', api: 'happy', type: 'api', aliases: []},
    poke: {label: '👉 Poke', api: 'poke', type: 'api', aliases: []},
    dance: {label: '💃 Dance', api: 'dance', type: 'api', aliases: []},
    meme: {label: '🤣 Meme', isMeme: true, aliases: ['memes', 'meme2']},
    loli: {
        label: '*Yo soy tu loli uwu 😍*',
        type: 'json',
        url: 'https://raw.githubusercontent.com/elrebelde21/The-LoliBot-MD2/main/src/randow/loli.json',
        aliases: ['kawaii']
    },
    navidad: {
        label: '🎄 Navidad',
        type: 'json',
        url: 'https://raw.githubusercontent.com/elrebelde21/The-LoliBot-MD2/main/src/randow/navidad.json',
        aliases: []
    },
    messi: {
        label: '*🇦🇷 Messi*',
        type: 'json',
        url: 'https://raw.githubusercontent.com/elrebelde21/The-LoliBot-MD2/main/src/randow/messi.json',
        aliases: []
    },
    ronaldo: {
        label: '_*Siiiuuuuuu*_',
        type: 'json',
        url: 'https://raw.githubusercontent.com/elrebelde21/The-LoliBot-MD2/main/src/randow/CristianoRonaldo.json',
        aliases: []
    }
} satisfies Record<string, RandomContentItem>
