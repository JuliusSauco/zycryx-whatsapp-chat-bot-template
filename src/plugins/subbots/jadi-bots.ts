import {getSubbotConfig} from '../../services/subbot.service.js'
import {definePlugin} from '../../core/define-plugin.js'
import type {GroupParticipant} from '@whiskeysockets/baileys'

export default definePlugin({
    help: ['bots'],
    tags: ['jadibot'],
    command: /^bots$/i,
    async execute(m, {conn, participants}) {
    const mainId = globalThis.conn?.user?.id?.split('@')[0].split(':')[0]
    const activos = (globalThis.conns || []).filter(sock => {
        const id = sock?.userId || sock?.user?.id?.split('@')[0];
        const isAlive = sock?.userId && typeof sock?.uptime === 'number';
        return isAlive && id !== mainId;
    });

    if (!activos.length) return m.reply("❌ No hay subbots conectados en este momento.")
    let mensaje = `🤖 *SubBots activos: ${activos.length}*\n\n`
    const participantes: GroupParticipant[] = m.isGroup ? participants : []

    for (const sock of activos) {
        const userId = sock.user?.id
        if (!userId) continue
        const cleanId = userId.replace(/:\d+/, '').split('@')[0]
        const configId = userId.replace(/:\d+/, '')
        const nombre = sock.user?.name || "-"
        let config
        try {
            config = await getSubbotConfig(configId)
        } catch (e: unknown) {
            config = {prefix: ["/", ".", "#"], mode: "public"}
        }

        const modo = config.mode === "private" ? "Private" : "Public"
        const prefijos = Array.isArray(config.prefix) ? config.prefix : [config.prefix]
        const prefText = prefijos.map((p) => `\`${p}\``).join(", ")
        const mainPrefix = (prefijos[0] === "") ? "" : prefijos[0]
        const textoMenu = mainPrefix ? `${mainPrefix}menu` : "menu"
        const uptime = sock.uptime ? formatearMs(Date.now() - sock.uptime) : "Desconocido"
        const estaEnGrupo = participantes.some((p) => p.id === userId)
        const mostrarNumero = !config.privacy
        const mostrarPrestar = config.prestar && !config.privacy
        let lineaBot = `• ${mostrarNumero ? `wa.me/${cleanId}?text=${encodeURIComponent(textoMenu)} (${nombre})` : `(${nombre})`}\n`
        mensaje += lineaBot
        mensaje += `   ⏱️ Tiempo activo: *${uptime}*\n`
        mensaje += `   ⚙️ Modo: *${modo}*\n`
        mensaje += `   🛠️ Prefix: ${prefText}\n`
        if (mostrarPrestar) mensaje += `   🟢 *Prestar bot*: #join <enlace>\n`
        mensaje += `\n`
    }
    return m.reply(mensaje.trim())
    }
})

function formatearMs(ms: number) {
    const segundos = Math.floor(ms / 1000)
    const minutos = Math.floor(segundos / 60)
    const horas = Math.floor(minutos / 60)
    const dias = Math.floor(horas / 24)
    return `${dias}d ${horas % 24}h ${minutos % 60}m ${segundos % 60}s`
}
