import {botInfo} from "../../core/config.js";
import {logError} from '../../lib/logger.js';
import {defineSdkPlugin, type PluginContentSdk, type PluginHttpSdk} from '../../core/plugin-sdk.js';
//Código elaborado por: https://github.com/elrebelde21

import {
    claimCharacter,
    completeCharacterSale,
    createCharacter,
    findCharacterByUrl,
} from '../../services/character.service.js'
import {addWalletResource, addWalletResourcesAndSetFields, getWallet} from '../../services/wallet.service.js'
import type {CharacterRecord} from '../../domain/characters.js'
import {pickRandom, randomChance, randomInt} from '../../utils/random.js'
import {formatDurationPaddedMinutesSeconds} from '../../utils/time.js'
import {createPendingActionStore} from '../../lib/ephemeral-state.js'
import {content} from '../../services/content.service.js';

interface AniListCharacterResponse {
    data?: {
        Character?: {
            name?: {full?: string}
            image?: {large?: string}
            gender?: string | null
            favourites?: number | null
            media?: {nodes?: Array<{title?: {romaji?: string | null}}>}
        }
    }
}

type TemporaryCharacter = CharacterRecord & {
    esGratis?: boolean
    messageId?: string
}

const tempCharacters = createPendingActionStore<TemporaryCharacter>({ttlMs: 5 * 60 * 1000})

async function getAniListCharacter(http: PluginHttpSdk, pluginContent: PluginContentSdk): Promise<Omit<CharacterRecord, 'id' | 'last_removed_time'>> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const id = randomInt(200000)
        const query = `query {
      Character(id: ${id}) {
        name { full }
        image { large }
        gender
        favourites
        media(perPage: 1) {
          nodes {
            title { romaji }
          }
        }
      }
    }`

        const json = await http.json<AniListCharacterResponse>('https://graphql.anilist.co', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({query}),
        })

        const c = json.data?.Character
        if (!c || !c.image?.large || !c.name?.full) continue

        const rarezas = pluginContent.messageList('rpg.rw.rarities')
        const rareza = pickRandom(rarezas)
        const favs = c.favourites || 0
        let price = Math.floor(favs * 0.5)
        if (price < 6500) price = 6500
        if (rareza === 'Legendario' && price < 50000) price = 50000 + randomInt(10000)
        return {
            name: c.name.full,
            url: c.image.large,
            tipo: c.gender || pluginContent.message('rpg.rw.defaultType'),
            anime: c.media?.nodes?.[0]?.title?.romaji || pluginContent.message('rpg.rw.defaultAnime'),
            rareza,
            price,
            previous_price: null,
            claimed_by: null,
            for_sale: false,
            seller: null,
            votes: 0,
        }
    }

    throw new Error('AniList no devolvio un personaje valido despues de 10 intentos')
}

export default defineSdkPlugin({
    help: ['rw'],
    tags: ['gacha'],
    command: ['rf', 'rw'],
    register: true,
    async before(m, {conn}) {
    const quotedId = m.quoted?.key?.id || m.quoted?.id
    const character = quotedId ? tempCharacters.get(quotedId) : null
    if (m.quoted && quotedId && /^[./#!]?c$/i.test(m.originalText.trim()) && character && character.messageId === quotedId) {
        try {
            const user = await getWallet(m.sender)
            const claimedCharacter = await findCharacterByUrl(character.url)
            if (!claimedCharacter) return conn.sendMessage(m.chat, {text: content.message('rpg.rw.notFound')}, {quoted: m})

            if (claimedCharacter.claimed_by) {
                if (!claimedCharacter.for_sale) return conn.sendMessage(m.chat, {
                    text: content.renderMessage('rpg.rw.alreadyBought', {
                        owner: claimedCharacter.claimed_by.split('@')[0]
                    }),
                    contextInfo: {mentionedJid: [claimedCharacter.claimed_by]}
                }, {quoted: m})
                const seller = claimedCharacter.seller
                if (seller === m.sender) return conn.sendMessage(m.chat, {text: content.message('rpg.rw.selfBuy')}, {quoted: m})
                if (!user || user.exp < character.price) return conn.sendMessage(m.chat, {text: content.message('rpg.rw.notEnoughExp')}, {quoted: m})

                const sellerExp = Math.floor(character.price * 0.9)
                await addWalletResource(m.sender, 'exp', -character.price, 'character_market', 'character_purchase')
                if (seller) await addWalletResource(seller, 'exp', sellerExp, 'character_market', 'character_sale')
                await completeCharacterSale(claimedCharacter.id, m.sender)

                await conn.sendMessage(m.chat, {
                    text: content.renderMessage('rpg.rw.bought', {
                        name: character.name,
                        price: character.price
                    }),
                    image: {url: character.url}
                }, {quoted: m})

                if (seller) {
                    await conn.sendMessage(seller, {
                        text: content.renderMessage('rpg.rw.sellerNotice', {
                            name: character.name,
                            buyer: m.sender.split('@')[0],
                            exp: sellerExp
                        }),
                        image: {url: character.url},
                        contextInfo: {mentionedJid: [m.sender]}
                    }, {quoted: m})
                }
            } else {
                const esGratis = character.esGratis
                if (!esGratis && (!user || user.exp < character.price)) {
                    return conn.sendMessage(m.chat, {text: content.message('rpg.rw.notEnoughExp')}, {quoted: m})
                }

                if (!esGratis) {
                    await addWalletResource(m.sender, 'exp', -character.price, 'character_market', 'character_claim')
                }

                await claimCharacter(claimedCharacter.id, m.sender)
                const msg = esGratis ? content.renderMessage('rpg.rw.claimedFree', {
                    name: character.name
                }) : content.renderMessage('rpg.rw.bought', {
                    name: character.name,
                    price: character.price
                })
                await conn.sendMessage(m.chat, {text: msg, image: {url: character.url}}, {quoted: m})
            }
            tempCharacters.cancel(quotedId)
        } catch (e: unknown) {
            logError(e)
            return conn.sendMessage(m.chat, {text: content.message('rpg.rw.processBuyError')}, {quoted: m})
        }
    }
    },
    async execute(m, {conn, branding, sdk}) {
    try {
        const user = await getWallet(m.sender)
        const lastTime = user?.ryTime || 0
        const now = Date.now()

        if (now - lastTime < 600000) return sdk.reply.message('rpg.rw.cooldown', {
            time: formatDurationPaddedMinutesSeconds(lastTime + 600000 - now)
        })
        const character = await getAniListCharacter(sdk.http, sdk.content)
        const esGratis = randomChance(0.5)
        let claimedCharacter = await findCharacterByUrl(character.url)

        if (!claimedCharacter) {
            claimedCharacter = await createCharacter({
                ...character,
                last_removed_time: null,
            })
        }

        const status = claimedCharacter.for_sale ? sdk.content.renderMessage('rpg.rw.statusForSale', {
            owner: claimedCharacter.claimed_by?.split('@')[0] || ''
        }) : claimedCharacter.claimed_by ? sdk.content.renderMessage('rpg.rw.statusBought', {
            owner: claimedCharacter.claimed_by.split('@')[0]
        }) : sdk.content.message('rpg.rw.statusFree')
        const priceMessage = !claimedCharacter.claimed_by && esGratis ? sdk.content.message('rpg.rw.priceFree') : claimedCharacter.previous_price ? sdk.content.renderMessage('rpg.rw.priceWithPrevious', {
            previousPrice: claimedCharacter.previous_price,
            price: claimedCharacter.price
        }) : sdk.content.renderMessage('rpg.rw.price', {price: claimedCharacter.price})
        const sentMessage = await conn.sendFile(m.chat, claimedCharacter.url, 'lp.jpg', sdk.content.renderMessage('rpg.rw.caption', {
            name: claimedCharacter.name,
            anime: claimedCharacter.anime,
            type: claimedCharacter.tipo,
            rarity: claimedCharacter.rareza,
            status,
            priceMessage,
            action: !claimedCharacter.claimed_by && esGratis ? sdk.content.message('rpg.rw.actionClaimFree') : sdk.content.message('rpg.rw.actionBuy')
        }), m, false, {
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                externalAdReply: {
                    title: sdk.content.message('rpg.rw.adTitle'),
                    body: branding.watermark,
                    thumbnailUrl: m.pp,
                    sourceUrl: pickRandom([botInfo.nna, botInfo.nna2, botInfo.md]),
                    mediaType: 1,
                    showAdAttribution: false,
                    renderLargerThumbnail: false
                }
            }
        });

        const messageId = sentMessage.key?.id
        if (messageId) tempCharacters.start(messageId, {...claimedCharacter, esGratis, messageId})
        await addWalletResourcesAndSetFields({userId: m.sender, resources: {}, fields: {ryTime: now}, reason: 'character_market', operation: 'character_roll'})
    } catch (e: unknown) {
        logError(e)
        return sdk.reply.message('rpg.rw.loadError')
    }
    },
})

