import {defineSdkPlugin, errorMessage} from '../../core/sdk-plugin.js'
import {isVoiceEffect, type VoiceEffect, synthesizeTtsPtt} from '../../providers/media-conversion/audio.provider.js';

export default defineSdkPlugin({
    help: ["tts <voz|idioma> <texto>"],
    tags: ["convertidor"],
    command: /^g?tts$/i,
    register: true,
    async execute(m, {sdk}) {
    const commandLabel = sdk.usedPrefix + sdk.command;
    if (!sdk.args.length && !m.quoted?.text) return sdk.reply.usage(
        sdk.content.renderMessage('converters.tts.usage', {command: commandLabel}),
        sdk.content.renderMessage('converters.tts.examples', {command: commandLabel}),
    )
    await sdk.reply.react("🎙️")
    await sdk.conn.sendPresenceUpdate('recording', sdk.chatId)
    const first = sdk.args[0]?.toLowerCase() || ""
    let effect: VoiceEffect | null = null, lang = "es", text = ""

    if (isVoiceEffect(first)) {
        effect = first
        text = sdk.args.slice(1).join(" ")
    } else if (/^[a-z]{2}$/.test(first)) {
        lang = first
        text = sdk.args.slice(1).join(" ")
    } else {
        text = sdk.args.join(" ")
    }

    if (!text) text = m.quoted?.text || "";
    if (!text) return sdk.reply.userError(sdk.content.message('converters.tts.missingText'))
    try {
        const buffer = await synthesizeTtsPtt(text, lang, effect)
        await sdk.sendMessage({audio: buffer, mimetype: "audio/ogg; codecs=opus", ptt: true})
    } catch (e: unknown) {
        return sdk.reply.failure(sdk.content.renderMessage('converters.tts.error', {error: errorMessage(e)}))
    }
    }
})
