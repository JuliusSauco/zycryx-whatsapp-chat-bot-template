import {logError, logInfo, logWarn} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
//Código elaborado por: https://github.com/elrebelde21

import fetch from 'node-fetch'
import {
    claimCharacter,
    completeCharacterSale,
    createCharacter,
    findCharacterByUrl,
} from '../../services/character.service.js'
import {addWalletResource, addWalletResourcesAndSetFields, getWallet} from '../../services/wallet.service.js'
import type {CharacterRecord} from '../../ports/repositories.js'

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
    const id = Math.floor(Math.random() * 200000)
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

    const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({query}),
    })

    const json = await res.json() as AniListCharacterResponse
    const c = json.data?.Character
    if (!c || !c.image?.large || !c.name?.full) return await getAniListCharacter()

    const rarezas = ['Común', 'Raro', 'Épico', 'Legendario']
    const rareza = rarezas[Math.floor(Math.random() * rarezas.length)]
    const favs = c.favourites || 0
    let price = Math.floor(favs * 0.5)
    if (price < 6500) price = 6500
    if (rareza === 'Legendario' && price < 50000) price = 50000 + Math.floor(Math.random() * 10000)
    return {
        name: c.name.full,
        url: c.image.large,
        tipo: c.gender || 'no comun',
        anime: c.media?.nodes?.[0]?.title?.romaji || 'Anime',
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
            if (!claimedCharacter) return conn.sendMessage(m.chat, {text: '⚠️ Error: Personaje no encontrado.'}, {quoted: m})

            if (claimedCharacter.claimed_by) {
                if (!claimedCharacter.for_sale) return conn.sendMessage(m.chat, {
                    text: `⚠️ Este personaje ya ha sido comprado por @${claimedCharacter.claimed_by.split('@')[0]}`,
                    contextInfo: {mentionedJid: [claimedCharacter.claimed_by]}
                }, {quoted: m})
                const seller = claimedCharacter.seller
                if (seller === m.sender) return conn.sendMessage(m.chat, {text: '⚠️ No puedes comprar tu propio personaje.'}, {quoted: m})
                if (!user || user.exp < character.price) return conn.sendMessage(m.chat, {text: '⚠️ No tienes suficientes exp para comprar este personaje.'}, {quoted: m})

                const sellerExp = Math.floor(character.price * 0.9)
                await addWalletResource(m.sender, 'exp', -character.price)
                if (seller) await addWalletResource(seller, 'exp', sellerExp)
                await completeCharacterSale(claimedCharacter.id, m.sender)

                await conn.sendMessage(m.chat, {
                    text: `🎉 ¡Has comprado a ${character.name} por ${character.price} exp!`,
                    image: {url: character.url}
                }, {quoted: m})

                if (seller) {
                    await conn.sendMessage(seller, {
                        text: `🎉 ¡Tu personaje ${character.name} ha sido comprado por @${m.sender.split('@')[0]}!\n💰 ${sellerExp} exp han sido transferidos a tu cuenta (después de la comisión).`,
                        image: {url: character.url},
                        contextInfo: {mentionedJid: [m.sender]}
                    }, {quoted: m})
                }
            } else {
                const esGratis = character.esGratis
                if (!esGratis && (!user || user.exp < character.price)) {
                    return conn.sendMessage(m.chat, {text: '⚠️ No tienes suficientes exp para comprar este personaje.'}, {quoted: m})
                }

                if (!esGratis) {
                    await addWalletResource(m.sender, 'exp', -character.price)
                }

                await claimCharacter(claimedCharacter.id, m.sender)
                const msg = esGratis ? `🎁 ¡Reclamaste a ${character.name} totalmente GRATIS!` : `🎉 ¡Has comprado a ${character.name} por ${character.price} exp!`
                await conn.sendMessage(m.chat, {text: msg, image: {url: character.url}}, {quoted: m})
            }
            tempCharacterStore.delete(quotedId)
        } catch (e: unknown) {
            logError(e)
            return conn.sendMessage(m.chat, {text: '⚠️ Error al procesar la compra. Intenta de nuevo.'}, {quoted: m})
        }
    }
    },
    async execute(m, {conn}) {
    try {
        const user = await getWallet(m.sender)
        const lastTime = user?.ryTime || 0
        const now = Date.now()

        if (now - lastTime < 600000) return conn.reply(m.chat, `🤚 Pa, espera ${msToTime(lastTime + 600000 - now)} para volver a usar este comando`, m)
        const character = await getAniListCharacter()
        const esGratis = Math.random() < 0.5
        let claimedCharacter = await findCharacterByUrl(character.url)

        if (!claimedCharacter) {
            claimedCharacter = await createCharacter({
                ...character,
                last_removed_time: null,
            })
        }

        const status = claimedCharacter.for_sale ? `💸 Estado: @${claimedCharacter.claimed_by?.split('@')[0]} está vendiendo este personaje.` : claimedCharacter.claimed_by ? `🔒 Estado: Comprado por @${claimedCharacter.claimed_by.split('@')[0]}` : `🆓 Estado: Libre`
        const priceMessage = !claimedCharacter.claimed_by && esGratis ? '🎁 ¡Puedes reclamarlo totalmente GRATIS!' : claimedCharacter.previous_price ? `~💰 Precio Anterior: ${claimedCharacter.previous_price} exp~\n💰 Precio Actual: ${claimedCharacter.price} exp` : `💰 Precio: ${claimedCharacter.price} exp`
        const sentMessage = await conn.sendFile(m.chat, claimedCharacter.url, 'lp.jpg', `💥 Nombre: ${claimedCharacter.name}\n📺 Anime: ${claimedCharacter.anime}\n⚧️ Tipo: ${claimedCharacter.tipo}\n⭐ Rareza: ${claimedCharacter.rareza}\n${status}\n${priceMessage}\n\n> Responde con "c" a este mensaje para ${!claimedCharacter.claimed_by && esGratis ? 'reclamarlo gratis' : 'comprarlo'}`, m, false, {
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                externalAdReply: {
                    title: "✨️ Character Details ✨️",
                    body: info.wm,
                    thumbnailUrl: m.pp,
                    sourceUrl: [info.nna, info.nna2, info.md].getRandom(),
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

function msToTime(duration: number) {
    const seconds = Math.floor((duration / 1000) % 60)
    const minutes = Math.floor((duration / (1000 * 60)) % 60)
    const minutesStr = minutes < 10 ? `0${minutes}` : minutes
    const secondsStr = seconds < 10 ? `0${seconds}` : seconds
    return `${minutesStr} min ${secondsStr} seg`
}
