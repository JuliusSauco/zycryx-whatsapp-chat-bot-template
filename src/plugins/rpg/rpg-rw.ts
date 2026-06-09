import {logError} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
//Código elaborado por: https://github.com/elrebelde21

import {
    claimCharacter,
    completeCharacterSale,
    createCharacter,
    findCharacterByUrl,
} from '../../services/character.service.js'
import {addWalletResource, addWalletResourcesAndSetFields, getWallet} from '../../services/wallet.service.js'
import type {CharacterRecord} from '../../ports/repositories.js'
import {httpJson} from '../../lib/http-client.js'
import {pickRandom, randomChance, randomInt} from '../../utils/random.js'
import {formatDurationPaddedMinutesSeconds} from '../../utils/time.js'
import {getRequiredPluginMessage, getRequiredPluginMessageList, renderTemplate} from '../../lib/message-template.js'

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

const tempCharacterStore = new Map<string, TemporaryCharacter>()

async function getAniListCharacter() {
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

    const json = await httpJson<AniListCharacterResponse>('https://graphql.anilist.co', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({query}),
    })

    const c = json.data?.Character
    if (!c || !c.image?.large || !c.name?.full) return await getAniListCharacter()

    const rarezas = getRequiredPluginMessageList('rpg.rw.rarities')
    const rareza = pickRandom(rarezas)
    const favs = c.favourites || 0
    let price = Math.floor(favs * 0.5)
    if (price < 6500) price = 6500
    if (rareza === 'Legendario' && price < 50000) price = 50000 + randomInt(10000)
    return {
        name: c.name.full,
        url: c.image.large,
        tipo: c.gender || getRequiredPluginMessage('rpg.rw.defaultType'),
        anime: c.media?.nodes?.[0]?.title?.romaji || getRequiredPluginMessage('rpg.rw.defaultAnime'),
        rareza,
        price,
        previous_price: null,
        claimed_by: null,
        for_sale: false,
        seller: null,
        votes: 0,
    }
}

export default definePlugin({
    help: ['rw'],
    tags: ['gacha'],
    command: ['rf', 'rw'],
    register: true,
    async before(m, {conn}) {
    const quotedId = m.quoted?.key?.id || m.quoted?.id
    const character = quotedId ? tempCharacterStore.get(quotedId) : null
    if (m.quoted && quotedId && /^[\/]?c$/i.test(m.originalText) && character && character.messageId === quotedId) {
        try {
            const user = await getWallet(m.sender)
            const claimedCharacter = await findCharacterByUrl(character.url)
            if (!claimedCharacter) return conn.sendMessage(m.chat, {text: getRequiredPluginMessage('rpg.rw.notFound')}, {quoted: m})

            if (claimedCharacter.claimed_by) {
                if (!claimedCharacter.for_sale) return conn.sendMessage(m.chat, {
                    text: renderTemplate(getRequiredPluginMessage('rpg.rw.alreadyBought'), {
                        owner: claimedCharacter.claimed_by.split('@')[0]
                    }),
                    contextInfo: {mentionedJid: [claimedCharacter.claimed_by]}
                }, {quoted: m})
                const seller = claimedCharacter.seller
                if (seller === m.sender) return conn.sendMessage(m.chat, {text: getRequiredPluginMessage('rpg.rw.selfBuy')}, {quoted: m})
                if (!user || user.exp < character.price) return conn.sendMessage(m.chat, {text: getRequiredPluginMessage('rpg.rw.notEnoughExp')}, {quoted: m})

                const sellerExp = Math.floor(character.price * 0.9)
                await addWalletResource(m.sender, 'exp', -character.price)
                if (seller) await addWalletResource(seller, 'exp', sellerExp)
                await completeCharacterSale(claimedCharacter.id, m.sender)

                await conn.sendMessage(m.chat, {
                    text: renderTemplate(getRequiredPluginMessage('rpg.rw.bought'), {
                        name: character.name,
                        price: character.price
                    }),
                    image: {url: character.url}
                }, {quoted: m})

                if (seller) {
                    await conn.sendMessage(seller, {
                        text: renderTemplate(getRequiredPluginMessage('rpg.rw.sellerNotice'), {
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
                    return conn.sendMessage(m.chat, {text: getRequiredPluginMessage('rpg.rw.notEnoughExp')}, {quoted: m})
                }

                if (!esGratis) {
                    await addWalletResource(m.sender, 'exp', -character.price)
                }

                await claimCharacter(claimedCharacter.id, m.sender)
                const msg = esGratis ? renderTemplate(getRequiredPluginMessage('rpg.rw.claimedFree'), {
                    name: character.name
                }) : renderTemplate(getRequiredPluginMessage('rpg.rw.bought'), {
                    name: character.name,
                    price: character.price
                })
                await conn.sendMessage(m.chat, {text: msg, image: {url: character.url}}, {quoted: m})
            }
            tempCharacterStore.delete(quotedId)
        } catch (e: unknown) {
            logError(e)
            return conn.sendMessage(m.chat, {text: getRequiredPluginMessage('rpg.rw.processBuyError')}, {quoted: m})
        }
    }
    },
    async execute(m, {conn}) {
    try {
        const user = await getWallet(m.sender)
        const lastTime = user?.ryTime || 0
        const now = Date.now()

        if (now - lastTime < 600000) return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('rpg.rw.cooldown'), {
            time: formatDurationPaddedMinutesSeconds(lastTime + 600000 - now)
        }), m)
        const character = await getAniListCharacter()
        const esGratis = randomChance(0.5)
        let claimedCharacter = await findCharacterByUrl(character.url)

        if (!claimedCharacter) {
            claimedCharacter = await createCharacter({
                ...character,
                last_removed_time: null,
            })
        }

        const status = claimedCharacter.for_sale ? renderTemplate(getRequiredPluginMessage('rpg.rw.statusForSale'), {
            owner: claimedCharacter.claimed_by?.split('@')[0] || ''
        }) : claimedCharacter.claimed_by ? renderTemplate(getRequiredPluginMessage('rpg.rw.statusBought'), {
            owner: claimedCharacter.claimed_by.split('@')[0]
        }) : getRequiredPluginMessage('rpg.rw.statusFree')
        const priceMessage = !claimedCharacter.claimed_by && esGratis ? getRequiredPluginMessage('rpg.rw.priceFree') : claimedCharacter.previous_price ? renderTemplate(getRequiredPluginMessage('rpg.rw.priceWithPrevious'), {
            previousPrice: claimedCharacter.previous_price,
            price: claimedCharacter.price
        }) : renderTemplate(getRequiredPluginMessage('rpg.rw.price'), {price: claimedCharacter.price})
        const sentMessage = await conn.sendFile(m.chat, claimedCharacter.url, 'lp.jpg', renderTemplate(getRequiredPluginMessage('rpg.rw.caption'), {
            name: claimedCharacter.name,
            anime: claimedCharacter.anime,
            type: claimedCharacter.tipo,
            rarity: claimedCharacter.rareza,
            status,
            priceMessage,
            action: !claimedCharacter.claimed_by && esGratis ? getRequiredPluginMessage('rpg.rw.actionClaimFree') : getRequiredPluginMessage('rpg.rw.actionBuy')
        }), m, false, {
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                externalAdReply: {
                    title: getRequiredPluginMessage('rpg.rw.adTitle'),
                    body: info.wm,
                    thumbnailUrl: m.pp,
                    sourceUrl: pickRandom([info.nna, info.nna2, info.md]),
                    mediaType: 1,
                    showAdAttribution: false,
                    renderLargerThumbnail: false
                }
            }
        });

        const messageId = sentMessage.key?.id
        if (messageId) tempCharacterStore.set(messageId, {...claimedCharacter, esGratis, messageId})

        if (messageId) setTimeout(() => tempCharacterStore.delete(messageId), 5 * 60 * 1000)
        await addWalletResourcesAndSetFields({userId: m.sender, resources: {}, fields: {ryTime: now}})
    } catch (e: unknown) {
    }
    },
})

