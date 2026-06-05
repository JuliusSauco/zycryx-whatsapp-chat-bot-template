import fs from "fs"
import path from "path"
import {fileURLToPath} from "url"
import {spawn} from "child_process"
import gTTS from "node-gtts"
import {definePlugin} from '../../core/define-plugin.js'
import {errorMessage, replyFailure, replyUsage, replyUserError} from '../../lib/reply-helpers.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const TMP_DIR = path.join(__dirname, "../tmp")
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, {recursive: true})

type VoiceEffect = "anonymous" | "robot" | "grave" | "aguda" | "niño" | "demonio";
const voces: VoiceEffect[] = ["anonymous", "robot", "grave", "aguda", "niño", "demonio"]

export default definePlugin({
    help: ["tts <voz|idioma> <texto>"],
    tags: ["convertidor"],
    command: /^g?tts$/i,
    register: true,
    async execute(m, {conn, args, usedPrefix, command}) {
    if (!args.length && !m.quoted?.text) return replyUsage(m, `${usedPrefix + command} <voz|idioma> <texto>`, `*Voces:* anonymous, robot, grave, aguda, niño\n*Idiomas:* es, en, pt, fr, etc.\n\nEjemplo:\n${usedPrefix + command} anonymous Hola\n${usedPrefix + command} es hello`)
    m.react("🎙️")
    conn.sendPresenceUpdate('recording', m.chat)
    const first = args[0].toLowerCase()
    let effect: VoiceEffect | null = null, lang = "es", text = ""

    if (isVoiceEffect(first)) {
        effect = first
        text = args.slice(1).join(" ")
    } else if (/^[a-z]{2}$/.test(first)) {
        lang = first
        text = args.slice(1).join(" ")
    } else {
        text = args.join(" ")
    }

    if (!text) return replyUserError(m, "Escribe un texto para convertir a voz.")
    try {
        const wav = await synthTTS(text, lang)
        const ogg = await applyEffect(wav, effect)
        const buffer = fs.readFileSync(ogg)
        await conn.sendMessage(m.chat, {audio: buffer, mimetype: "audio/ogg; codecs=opus", ptt: true}, {quoted: m})
        fs.unlinkSync(wav);
        fs.unlinkSync(ogg)
    } catch (e: unknown) {
        return replyFailure(m, "Error: " + errorMessage(e))
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
