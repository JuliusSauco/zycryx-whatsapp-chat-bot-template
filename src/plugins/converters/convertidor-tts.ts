import fs from "fs"
import path from "path"
import {fileURLToPath} from "url"
import {spawn} from "child_process"
import gTTS from "node-gtts"
import {defineSdkPlugin, errorMessage} from '../../core/sdk-plugin.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const TMP_DIR = path.join(__dirname, "../tmp")
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, {recursive: true})

type VoiceEffect = "anonymous" | "robot" | "grave" | "aguda" | "niño" | "demonio";
const voces: VoiceEffect[] = ["anonymous", "robot", "grave", "aguda", "niño", "demonio"]

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
        const wav = await synthTTS(text, lang)
        const ogg = await applyEffect(wav, effect)
        const buffer = fs.readFileSync(ogg)
        await sdk.sendMessage({audio: buffer, mimetype: "audio/ogg; codecs=opus", ptt: true})
        fs.unlinkSync(wav);
        fs.unlinkSync(ogg)
    } catch (e: unknown) {
        return sdk.reply.failure(sdk.content.renderMessage('converters.tts.error', {error: errorMessage(e)}))
    }
    }
})

function runFFmpeg(args: string[]) {
    return new Promise<boolean>((resolve, reject) => {
        const ff = spawn("ffmpeg", args)
        let stderr = ""
        ff.stderr.on("data", (d) => (stderr += d.toString()))
        ff.on("close", (code) => {
            if (code === 0) resolve(true)
            else reject(new Error("ffmpeg error:\n" + stderr))
        })
    })
}

async function synthTTS(text: string, lang = "es") {
    const outPath = path.join(TMP_DIR, `${Date.now()}-raw.wav`)
    const tts = gTTS(lang)
    await new Promise<void>((res, rej) => {
        tts.save(outPath, text, (err) => (err ? rej(err) : res()))
    })
    return outPath
}

async function applyEffect(inputWav: string, style: VoiceEffect | null = null) {
    const outPath = path.join(TMP_DIR, `${Date.now()}-out.ogg`)
    const styleFilters: Record<string, string> = {
        anonymous: "asetrate=44100*0.75,lowpass=f=1400,highpass=f=180",
        robot: "chorus=0.6:0.9:55:0.4:0.25:2",
        grave: "asetrate=44100*0.80",
        aguda: "asetrate=44100*1.20",
        niño: "asetrate=44100*1.25,treble=g=5",
        demonio: "asetrate=44100*0.65,areverb=70:70:100",
    }
    const af = style && styleFilters[style] ? styleFilters[style] : "anull"
    const args = [
        "-y",
        "-i", inputWav,
        "-af", af,
        "-ac", "1",
        "-ar", "48000",
        "-c:a", "libopus",
        "-b:a", "48k",
        outPath,
    ]
    await runFFmpeg(args)
    return outPath
}

function isVoiceEffect(value: string): value is VoiceEffect {
    return voces.includes(value as VoiceEffect);
}
