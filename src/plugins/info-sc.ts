import {generateWAMessageFromContent} from '@whiskeysockets/baileys'
import {promises as fs} from 'fs'
import {fileURLToPath} from 'url'
import {dirname, join} from 'path'
import {definePlugin} from '../core/define-plugin.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default definePlugin({
    help: ['runtime'],
    tags: ['main'],
    command: /^(runtime|sc)$/i,
    owner: false,
    group: false,
    private: false,
    register: true,
    async execute(m, {conn, usedPrefix: _p}) {
    let fkontak = {
        "key": {
            "participants": "0@s.whatsapp.net",
            "remoteJid": "status@broadcast",
            "fromMe": false,
            "id": "Halo"
        },
        "message": {"contactMessage": {"vcard": `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`}},
        "participant": "0@s.whatsapp.net"
    }

    let _package = {}
    try {
        const pkgStr = await fs.readFile(join(__dirname, '../package.json'), 'utf8')
        _package = JSON.parse(pkgStr)
    } catch (e: any) {
        _package = {}
    }

    const pad = (n: any) => (n < 10 ? '0' : '') + n
    const kyun = (seconds: any) => {
        const days = Math.floor(seconds / (24 * 60 * 60))
        const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60))
        const minutes = Math.floor((seconds % (60 * 60)) / 60)
        const secs = Math.floor(seconds % 60)
        return `🫶 ${info.md}\n\n*⏳ 𝙏𝙄𝙀𝙈𝙋𝙊 𝘼𝘾𝙏𝙄𝙑𝙊:*\n\t${pad(days)} Dias\t ${pad(hours)} Horas ${pad(minutes)} Minutos ${pad(secs)} Segundos\n`
    }

    const runtime = process.uptime()
    const teks = kyun(runtime)
    const prep = generateWAMessageFromContent(m.chat, {
        orderMessage: {
            itemCount: -10062007,
            // @ts-ignore
            status: 500,
            // @ts-ignore
            surface: 999,
            message: teks,
            description: '^^',
            orderTitle: 'Hi Sis',
            token: '9',
            curreyCode: 'IDR',
            totalCurrencyCode: '>〰<',
            // @ts-ignore
            totalAmount1000: '1000000',
            sellerJid: 'https://github.com/elrebelde21/LoliBot-MD',
            thumbnailUrl: "https://telegra.ph/file/39fb047cdf23c790e0146.jpg"
        }
    }, {contextInfo: null, quoted: fkontak})
    if (!prep.key.remoteJid || !prep.message) return
    await conn.relayMessage(prep.key.remoteJid, prep.message, {messageId: prep.key.id ?? undefined})
    }
})
