import fetch from 'node-fetch';
import {definePlugin} from '../../core/define-plugin.js';
import type {GroupParticipant} from '@whiskeysockets/baileys';

let toM = (a: string) => '@' + a.split('@')[0]
export default definePlugin({
    help: ["love", "gay2", "lesbiana", "pajero", "pajera", "puto", "puta", "manco", "manca", "rata", "prostituta", "prostituto", "amigorandom", "amistad", "regalar", "formarpareja", "gay", "personalidad", "pregunta", "ship", "topgays", "top", "topputos", "toplindos", "toppajer@s", "topshipost", "toppanafresco", "topgrasa", "topintegrantes", "topfamos@s", "topsostero", "top5parejas", "Doxxeo", "doxxeo", "follar"],
    tags: ['game'],
    command: /^love|gay2|lesbiana|pajero|pajera|puto|puta|manco|manca|rata|prostituta|prostituto|amigorandom|amistad|regalar|dar|enviar|meter|chupar|metersela|retar|formarpareja|formarparejas|gay|personalidad|pregunta|preguntas|apakah|ship|shippear|topgays|top|topputos|toplindos|toplind@s|toppajer@s|toppajeros|topshipost|topshiposters|toppanafresco|topgrasa|toppanafrescos|toplagrasa|topintegrante|topintegrantes|topotakus|topfamosos|topfamos@s|topsostero|topparejas|top5parejas|Doxxeo|doxxeo|doxxear|Doxxear|doxeo|doxear|doxxeame|doxeame|ruletas|ruleta|suerte|violar|follar/i,
    register: true,
    async execute(m, {conn, metadata, command, text, participants, usedPrefix}) {
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
    try {

        let user = (a: string) => '@' + a.split('@')[0] //'@' + a.split('@')[0]
        let ps = metadata.participants.map((v: GroupParticipant) => v.id)
        let a = ps.getRandom()
        let b = ps.getRandom()
        let c = ps.getRandom()
        let d = ps.getRandom()
        let e = ps.getRandom()
        let f = ps.getRandom()
        let g = ps.getRandom()
        let h = ps.getRandom()
        let i = ps.getRandom()
        let j = ps.getRandom()


//------------------------------------------------------------------------------------

        if (command == 'amistad' || command == 'amigorandom') {
            m.reply(`*🔰 Vamos a hacer algunas amistades 🔰*\n\n*Oye ${toM(a)} hablale al privado a ${toM(b)} para que jueguen y se haga una amistad 🙆*\n\n*Las mejores amistades empiezan con un juego 😉*`, null, {
                mentions: [a, b]
            })
        }

//------------------------------------------------------------------------------------

        if (command == 'follar' || command == 'violar') {
            if (!text) return m.reply(`*Ingrese el @ o el nombre de la persona que quieras saber si te puedes ${command.replace('how', '')}*`)
            let user = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted?.sender
            if (!user) return m.reply(`*Etiqueta o responde a la persona que quieras saber si te puedes ${command.replace('how', '')}*`)
            conn.reply(m.chat, `🤤👅🥵 *𝐀𝐂𝐀𝐁𝐀𝐒 𝐃𝐄 𝐅𝐎𝐋𝐋𝐀𝐑𝐓𝐄𝐋@!*🥵👅🤤\n\n*𝙏𝙚 𝙖𝙘𝙖𝙗𝙖𝙨 𝙙𝙚 𝙛𝙤𝙡𝙡𝙖𝙧 𝙖 𝙡𝙖 𝙥𝙚𝙧𝙧𝙖 𝙙𝙚* *${text}* ⁩ *𝙖 𝟰 𝙥𝙖𝙩𝙖𝙨 𝙢𝙞𝙚𝙣𝙩𝙧𝙖𝙨 𝙩𝙚 𝙜𝙚𝙢𝙞𝙖 𝙘𝙤𝙢𝙤 𝙪𝙣𝙖 𝙢𝙖𝙡𝙙𝙞𝙩𝙖 𝙥𝙚𝙧𝙧𝙖 "𝐀𝐚𝐚𝐡.., 𝐀𝐚𝐚𝐡𝐡, 𝐬𝐢𝐠𝐮𝐞, 𝐧𝐨 𝐩𝐚𝐫𝐞𝐬, 𝐧𝐨 𝐩𝐚𝐫𝐞𝐬.." 𝙮 𝙡𝙖 𝙝𝙖𝙨 𝙙𝙚𝙟𝙖𝙙𝙤 𝙩𝙖𝙣 𝙧𝙚𝙫𝙚𝙣𝙩𝙖𝙙𝙖 𝙦𝙪𝙚 𝙣𝙤 𝙥𝙪𝙚𝙙𝙚 𝙨𝙤𝙨𝙩𝙚𝙣𝙚𝙧 𝙣𝙞 𝙨𝙪 𝙥𝙧𝙤𝙥𝙞𝙤 𝙘𝙪𝙚𝙧𝙥𝙤 𝙡𝙖 𝙢𝙖𝙡𝙙𝙞𝙩𝙖 𝙯𝙤𝙧𝙧𝙖!*\n\n*${text}*\n🤤🥵 *¡𝐘𝐀 𝐓𝐄 𝐇𝐀𝐍 𝐅𝐎𝐋𝐋𝐀𝐃𝐎!* 🥵🤤`, undefined, {mentions: [user]})
        }

//------------------------------------------------------------------------------------

        if (command == 'formarpareja' || command == 'formarparejas') {
            m.reply(`*${toM(a)}, 𝙔𝙖 𝙚𝙨 𝙝𝙤𝙧𝙖 𝙙𝙚 𝙦𝙪𝙚 𝙩𝙚 💍 𝘾𝙖𝙨𝙚𝙨 𝙘𝙤𝙣 ${toM(b)}, 𝙇𝙞𝙣𝙙𝙖 𝙋𝙖𝙧𝙚𝙟𝙖 😉💓*`, null, {
                mentions: [a, b]
            })
        }

//------------------------------------------------------------------------------------

        if (command == 'personalidad') {
            if (!text) return conn.reply(m.chat, 'Ingrese un nombre?', m)
            let personalidad = `┏━━°❀❬ *PERSONALIDAD}* ❭❀°━━┓
*┃*
*┃• Nombre* : ${text}
*┃• Buena Moral* : ${pickRandom(['6%', '12%', '20%', '27%', '35%', '41%', '49%', '54%', '60%', '66%', '73%', '78%', '84%', '92%', '93%', '94%', '96%', '98,3%', '99,7%', '99,9%', '1%', '2,9%', '0%', '0,4%'])}
*┃• Mala Moral* : ${pickRandom(['6%', '12%', '20%', '27%', '35%', '41%', '49%', '54%', '60%', '66%', '73%', '78%', '84%', '92%', '93%', '94%', '96%', '98,3%', '99,7%', '99,9%', '1%', '2,9%', '0%', '0,4%'])}
*┃• Tipo de persona* : ${pickRandom(['De buen corazón', 'Arrogante', 'Tacaño', 'Generoso', 'Humilde', 'Tímido', 'Cobarde', 'Entrometido', 'Cristal', 'No binarie XD', 'Pendejo'])}
*┃• Siempre* : ${pickRandom(['Pesado', 'De malas', 'Distraido', 'De molestoso', 'Chismoso', 'Pasa jalandosela', 'De compras', 'Viendo anime', 'Chatea en WhatsApp porque esta soltero', 'Acostado bueno para nada', 'De mujeriego', 'En el celular'])}
*┃• Inteligencia* : ${pickRandom(['6%', '12%', '20%', '27%', '35%', '41%', '49%', '54%', '60%', '66%', '73%', '78%', '84%', '92%', '93%', '94%', '96%', '98,3%', '99,7%', '99,9%', '1%', '2,9%', '0%', '0,4%'])}
*┃• Morosidad* : ${pickRandom(['6%', '12%', '20%', '27%', '35%', '41%', '49%', '54%', '60%', '66%', '73%', '78%', '84%', '92%', '93%', '94%', '96%', '98,3%', '99,7%', '99,9%', '1%', '2,9%', '0%', '0,4%'])}
*┃• Coraje* : ${pickRandom(['6%', '12%', '20%', '27%', '35%', '41%', '49%', '54%', '60%', '66%', '73%', '78%', '84%', '92%', '93%', '94%', '96%', '98,3%', '99,7%', '99,9%', '1%', '2,9%', '0%', '0,4%'])}
*┃• Miedo* : ${pickRandom(['6%', '12%', '20%', '27%', '35%', '41%', '49%', '54%', '60%', '66%', '73%', '78%', '84%', '92%', '93%', '94%', '96%', '98,3%', '99,7%', '99,9%', '1%', '2,9%', '0%', '0,4%'])}
*┃• Fama* : ${pickRandom(['6%', '12%', '20%', '27%', '35%', '41%', '49%', '54%', '60%', '66%', '73%', '78%', '84%', '92%', '93%', '94%', '96%', '98,3%', '99,7%', '99,9%', '1%', '2,9%', '0%', '0,4%'])}
*┃• Género* : ${pickRandom(['Hombre', 'Mujer', 'Homosexual', 'Bisexual', 'Pansexual', 'Feminista', 'Heterosexual', 'Macho alfa', 'Mujerzona', 'Marimacha', 'Palosexual', 'PlayStationSexual', 'Sr. Manuela', 'Pollosexual'])}
┗━━━━━━━━━━━━━━━━`
            conn.reply(m.chat, personalidad, m, {mentions: conn.parseMention(personalidad)})
        }

//------------------------------------------------------------------------------------

        if (command == 'ship' || command == 'shippear') {
            if (!text) return m.reply(`⚠️ 𝐄𝐬𝐜𝐫𝐢𝐛𝐚 𝐞𝐥 𝐧𝐨𝐦𝐛𝐫𝐞 𝐝𝐞 𝐝𝐨𝐬 𝐩𝐞𝐫𝐬𝐨𝐧𝐚𝐬 𝐩𝐚𝐫𝐚 𝐜𝐚𝐥𝐜𝐮𝐥𝐚𝐫 𝐬𝐮𝐬 𝐚𝐦𝐨𝐫`)
            let [text1, ...text2Parts] = text.split(' ')
            const text2 = (text2Parts || []).join(' ')
            if (!text2) throw `⚠️ 𝐅𝐚𝐥𝐭𝐚 𝐞𝐥 𝐧𝐨𝐦𝐛𝐫𝐞 𝐝𝐞 𝐥𝐚 𝐬𝐞𝐠𝐮𝐧𝐝𝐚 𝐩𝐞𝐫𝐬𝐨𝐧𝐚`
            let love = `_❤️ *${text1}* tu oportunidad de enamorarte de *${text2}* es de *${Math.floor(Math.random() * 100)}%* 👩🏻‍❤️‍👨🏻_ `.trim()
            m.reply(love, null, {mentions: conn.parseMention(love)})
        }

//------------------------------------------------------------------------------------

        if (command == 'Doxxeo' || command == 'doxxeo' || command == 'doxxear' || command == 'Doxxear' || command == 'doxeo' || command == 'doxear' || command == 'doxxeame' || command == 'doxeame') {
//if (new Date - user.prue < 90000) return await conn.reply(m.chat, `🙌 HEY ALTO ESPERA UNOS MINUTOS PARA USAR OTRO COMANDO NO HAGA SPAM`, fkontak, m)
            let who
            if (m.isGroup) who = m.mentionedJid[0]
            else who = m.chat
            let start = `*😱 ¡¡𝙀𝙢𝙥𝙚𝙯𝙖𝙣𝙙𝙤 𝙙𝙤𝙭𝙭𝙚𝙤!! 😱*`
            let ala = `😨`
            let boost = `*${pickRandom(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'])}%*`
            let boost2 = `*${pickRandom(['21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40'])}%*`
            let boost3 = `*${pickRandom(['41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60'])}%*`
            let boost4 = `*${pickRandom(['61', '62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79', '80'])}%*`
            let boost5 = `*${pickRandom(['81', '82', '83', '84', '85', '86', '87', '88', '89', '90', '91', '92', '93', '94', '95', '96', '97', '98', '99', '100'])}%*`

            const sentMessage = await conn.sendMessage(m.chat, {
                text: `${start}`,
                mentions: await conn.parseMention(text)
            }, {quoted: m})
            if (!sentMessage) return
            const {key} = sentMessage
            await delay(1000 * 1)
            await conn.sendMessage(m.chat, {text: `${boost2}`, edit: key})
            await delay(1000 * 1)
            await conn.sendMessage(m.chat, {text: `${boost3}`, edit: key})
            await delay(1000 * 1)
            await conn.sendMessage(m.chat, {text: `${boost4}`, edit: key})
            await delay(1000 * 1)
            await conn.sendMessage(m.chat, {text: `${boost5}`, edit: key})

            let old = performance.now()
            let neww = performance.now()
            let speed = `${neww - old}`
            let doxeo = `*✅ 𝐏𝐞𝐫𝐬𝐨𝐧𝐚 𝐡𝐚𝐜𝐤𝐞𝐚𝐝𝐚 𝐜𝐨𝐧 𝐞𝐱𝐢𝐭𝐨𝐬 🤣*\n\n*𝐓𝐢𝐞𝐦𝐩𝐨: ${speed} 𝐒𝐞𝐠𝐮𝐧𝐝𝐨𝐬!*

*𝐑𝐞𝐬𝐮𝐥𝐭𝐚𝐝𝐨𝐬:*
*Nombre:* ${text}
*Ip:* 192.28.213.234
*N:* 43 7462
*W:* 12.4893
*SS NUMBER:* 6979191519182016
*IPV6:* fe80::5dcd::ef69::fb22::d9888%12 
*UPNP:* Enabled
*DMZ:* 10.112.42.15
*MAC:* 5A:78:3E:7E:00
*ISP:* TORNADO SLK PRODUCTION
*DNS:* 8.8.8.8
*ALT DNS:* 1.1.1.1.1  
*DNS SUFFIX:* TORNADO WI-FI
*WAN:* 100.23.10.90
*WAN TYPE:* private nat
*GATEWAY:* 192.168.0.1
*SUBNET MASK:* 255.255.0.255
*UDP OPEN PORTS:* 8080.80
*TCP OPEN PORTS:* 443
*ROUTER VENDEDOR:* ERICCSON
*DEVICE VENDEDOR:* WIN32-X
*CONNECTION TYPE:* TORNADO SLK PRODUCTION
*ICMPHOPS:* 192.168.0.1 192.168.1.1 100.73.43.4
host-132.12.32.167.ucom.com
host-132.12.111.ucom.com
36.134.67.189 216.239.78.11
Sof02s32inf14.1e100.net
*HTTP:* 192.168.3.1:433-->92.28.211.234:80
*Http:* 192.168.625-->92.28.211.455:80
*Http:* 192.168.817-->92.28.211.8:971
*Upd:* 192.168452-->92.28.211:7265288
*Tcp:* 192.168.682-->92.28.211:62227.7
*Tcp:* 192.168.725-->92.28.211:67wu2
*Tcp:* 192.168.629-->92.28.211.167:8615
*EXTERNAL MAC:* 6U:77:89:ER:O4
*MODEM JUMPS:* 58`
            await conn.sendMessage(m.chat, {text: doxeo, edit: key})
        }

//------------------------------------------------------------------------------------

        if (command == 'gay') {
            let vn = 'https://qu.ax/HfeP.mp3'
            let who
            if (m.isGroup) who = m.mentionedJid[0] ? m.mentionedJid[0] : m.sender
            else who = m.sender
            let member = participants.map((u: GroupParticipant) => u.id)
            let me = m.sender
            let jodoh = member[Math.floor(Math.random() * member.length)]
            const gayScore = Math.floor(Math.random() * 100)
            let gay = getGayLabel(gayScore)
//let kah = ra[Math.floor(Math.random() * ra.length)]
            let jawab = `@${who.split("@")[0]} Es 🏳️‍🌈 ${gayScore}% Gay\n\n${gay}`;
            const avatar = await conn.profilePictureUrl(who, 'image').catch(() => 'https://telegra.ph/file/24fa902ead26340f3df2c.png');

            const imageRes = await fetch(`https://some-random-api.com/canvas/gay?avatar=${encodeURIComponent(String(avatar))}`);
            const buffer = await imageRes.buffer();

            await conn.sendMessage(m.chat, {
                image: buffer,
                caption: jawab,
                contextInfo: {
                    mentionedJid: [who],
                    forwardingScore: 9999999,
                    isForwarded: false
                }
            }, {quoted: m, ephemeralExpiration: 24 * 60 * 1000});

            await conn.sendFile(m.chat, vn, 'gay.mp3', undefined, m, true, {
                type: 'audioMessage',
                ptt: true
            });
        }

//------------------------------------------------------------------------------------

        if (command == 'gay2') {
            if (!text) return m.reply(`🤔 𝙋𝙚𝙣𝙙𝙚𝙟𝙤 𝙚𝙩𝙞𝙦𝙪𝙚𝙩𝙖𝙨 𝙖𝙡 𝙡𝙖 𝙥𝙚𝙧𝙨𝙤𝙣𝙖 𝙘𝙤𝙣 𝙚𝙡 @Tag`)
            let juego = `_*${text.toUpperCase()}* *ES* *${randomPercent()}%* *GAY*_ 🏳️‍🌈`.trim()
            await conn.reply(m.chat, juego, m, m.mentionedJid ? {mentions: m.mentionedJid} : {})
        }

//------------------------------------------------------------------------------------

        if (command == 'lesbiana') {
            if (!text) return m.reply(`🤔 𝙋𝙚𝙣𝙙𝙚𝙟𝙤 𝙚𝙩𝙞𝙦𝙪𝙚𝙩𝙖𝙨 𝙖𝙡 𝙡𝙖 𝙥𝙚𝙧𝙨𝙤𝙣𝙖 𝙘𝙤𝙣 𝙚𝙡 @Tag`)
            let juego = `_*${text.toUpperCase()}* *ES* *${randomPercent()}%* *${command.replace('how', '').toUpperCase()}*_ 🏳️‍🌈`.trim()
            await conn.reply(m.chat, juego, m, m.mentionedJid ? {mentions: m.mentionedJid} : {})
        }

//------------------------------------------------------------------------------------

        if (command == 'pajero') {
            if (!text) return m.reply(`🤔 𝙋𝙚𝙣𝙙𝙚𝙟𝙤 𝙚𝙩𝙞𝙦𝙪𝙚𝙩𝙖𝙨 𝙖𝙡 𝙡𝙖 𝙥𝙚𝙧𝙨𝙤𝙣𝙖 𝙘𝙤𝙣 𝙚𝙡 @Tag`)
            let juego = `_*${text.toUpperCase()}* *ES* *${randomPercent()}%* *${command.replace('how', '').toUpperCase()}*_ 😏💦`.trim()
            await conn.reply(m.chat, juego, m, m.mentionedJid ? {mentions: m.mentionedJid} : {})
        }

//------------------------------------------------------------------------------------

        if (command == 'pajera') {
            if (!text) return m.reply(`🤔 𝙋𝙚𝙣𝙙𝙚𝙟𝙤 𝙚𝙩𝙞𝙦𝙪𝙚𝙩𝙖𝙨 𝙖𝙡 𝙡𝙖 𝙥𝙚𝙧𝙨𝙤𝙣𝙖 𝙘𝙤𝙣 𝙚𝙡 @Tag`)
            let juego = `_*${text.toUpperCase()}* *ES* *${randomPercent()}%* *${command.replace('how', '').toUpperCase()}*_ 😏💦`.trim()
            await conn.reply(m.chat, juego, m, m.mentionedJid ? {mentions: m.mentionedJid} : {})
        }

//------------------------------------------------------------------------------------

        if (command == 'puto') {
            if (!text) return m.reply(`🤔 𝙋𝙚𝙣𝙙𝙚𝙟𝙤 𝙚𝙩𝙞𝙦𝙪𝙚𝙩𝙖𝙨 𝙖𝙡 𝙡𝙖 𝙥𝙚𝙧𝙨𝙤𝙣𝙖 𝙘𝙤𝙣 𝙚𝙡 @Tag`)
            let juego = `_*${text.toUpperCase()}* *ES* *${randomPercent()}%* *${command.replace('how', '').toUpperCase()},* *MÁS INFORMACIÓN A SU PRIVADO 🔥🥵 XD*_`.trim()
            await conn.reply(m.chat, juego, m, m.mentionedJid ? {mentions: m.mentionedJid} : {})
        }

//------------------------------------------------------------------------------------

        if (command == 'puta') {
            if (!text) return m.reply(`🤔 𝙋𝙚𝙣𝙙𝙚𝙟𝙤 𝙚𝙩𝙞𝙦𝙪𝙚𝙩𝙖𝙨 𝙖𝙡 𝙡𝙖 𝙥𝙚𝙧𝙨𝙤𝙣𝙖 𝙘𝙤𝙣 𝙚𝙡 @Tag`)
            let juego = `_*${text.toUpperCase()}* *ES* *${randomPercent()}%* *${command.replace('how', '').toUpperCase()},* *MÁS INFORMACIÓN A SU PRIVADO 🔥🥵 XD*_`.trim()
            await conn.reply(m.chat, juego, m, m.mentionedJid ? {mentions: m.mentionedJid} : {})
        }

//------------------------------------------------------------------------------------

        if (command == 'manco') {
            if (!text) return m.reply(`🤔 𝙋𝙚𝙣𝙙𝙚𝙟𝙤 𝙚𝙩𝙞𝙦𝙪𝙚𝙩𝙖𝙨 𝙖𝙡 𝙡𝙖 𝙥𝙚𝙧𝙨𝙤𝙣𝙖 𝙘𝙤𝙣 𝙚𝙡 @Tag`)
            let juego = `_*${text.toUpperCase()}* *ES* *${randomPercent()}%* *${command.replace('how', '').toUpperCase()} 💩*_`.trim()
            await conn.reply(m.chat, juego, m, m.mentionedJid ? {mentions: m.mentionedJid} : {})
        }

//------------------------------------------------------------------------------------ 

        if (command == 'manca') {
            if (!text) return m.reply(`🤔 𝙋𝙚𝙣𝙙𝙚𝙟𝙤 𝙚𝙩𝙞𝙦𝙪𝙚𝙩𝙖𝙨 𝙖𝙡 𝙡𝙖 𝙥𝙚𝙧𝙨𝙤𝙣𝙖 𝙘𝙤𝙣 𝙚𝙡 @Tag`)
            let juego = `_*${text.toUpperCase()}* *ES* *${randomPercent()}%* *${command.replace('how', '').toUpperCase()} 💩*_`.trim()
            await conn.reply(m.chat, juego, m, m.mentionedJid ? {mentions: m.mentionedJid} : {})
        }

//------------------------------------------------------------------------------------

        if (command == 'rata') {
            if (!text) return m.reply(`🤔 𝙋𝙚𝙣𝙙𝙚𝙟𝙤 𝙚𝙩𝙞𝙦𝙪𝙚𝙩𝙖𝙨 𝙖𝙡 𝙡𝙖 𝙥𝙚𝙧𝙨𝙤𝙣𝙖 𝙘𝙤𝙣 𝙚𝙡 @Tag`)
            let juego = `_*${text.toUpperCase()}* *ES* *${randomPercent()}%* *${command.replace('how', '').toUpperCase()} 🐁 COME QUESO 🧀*_`.trim()
            await conn.reply(m.chat, juego, m, m.mentionedJid ? {mentions: m.mentionedJid} : {})
        }

//------------------------------------------------------------------------------------ 

        if (command == 'prostituto') {
            if (!text) return m.reply(`🤔 𝙋𝙚𝙣𝙙𝙚𝙟𝙤 𝙚𝙩𝙞𝙦𝙪𝙚𝙩𝙖𝙨 𝙖𝙡 𝙡𝙖 𝙥𝙚𝙧𝙨𝙤𝙣𝙖 𝙘𝙤𝙣 𝙚𝙡 @Tag`)
            let juego = `_*${text.toUpperCase()}* *ES* *${randomPercent()}%* *${command.replace('how', '').toUpperCase()} 🫦👅, QUIEN QUIERE DE SUS SERVICIOS? XD*_`.trim()
            await conn.reply(m.chat, juego, m, m.mentionedJid ? {mentions: m.mentionedJid} : {})
        }

//------------------------------------------------------------------------------------  

        if (command == 'prostituta') {
            if (!text) return m.reply(`🤔 𝙋𝙚𝙣𝙙𝙚𝙟𝙤 𝙚𝙩𝙞𝙦𝙪𝙚𝙩𝙖𝙨 𝙖𝙡 𝙡𝙖 𝙥𝙚𝙧𝙨𝙤𝙣𝙖 𝙘𝙤𝙣 𝙚𝙡 @Tag`)
            let juego = `_*${text.toUpperCase()}* *ES* *${randomPercent()}%* *${command.replace('how', '').toUpperCase()} 🫦👅, QUIEN QUIERE DE SUS SERVICIOS? XD*_`.trim()
            await conn.reply(m.chat, juego, m, m.mentionedJid ? {mentions: m.mentionedJid} : {})
        }

//------------------------------------------------------------------------------------

        if (command == 'love') {
            if (!text) return m.reply(`🤔 𝙋𝙚𝙣𝙙𝙚𝙟𝙤 𝙚𝙩𝙞𝙦𝙪𝙚𝙩𝙖𝙨 𝙖𝙡 𝙡𝙖 𝙥𝙚𝙧𝙨𝙤𝙣𝙖 𝙘𝙤𝙣 𝙚𝙡 @Tag`)
            conn.reply(m.chat, ` *❤️❤️ MEDIDOR DE AMOR ❤️❤️* 
*El amor de ${text} por ti es de* *${Math.floor(Math.random() * 100)}%* *de un 100%*
*Deberias pedirle que sea tu  novia/o ?*`.trim(), m, m.mentionedJid ? {
                mentions: m.mentionedJid
            } : {})
        }

//------------------------------------------------------------------------------------    
        if (command == 'top') {
            if (!text) return m.reply(`𝙔 𝙚𝙡 𝙩𝙚𝙭𝙩𝙤? 🤔\n📍 Ejemplo: ${usedPrefix}top nedro`)
            let ps = metadata.participants.map((v: GroupParticipant) => v.id)
            let a = ps.getRandom()
            let b = ps.getRandom()
            let c = ps.getRandom()
            let d = ps.getRandom()
            let e = ps.getRandom()
            let f = ps.getRandom()
            let g = ps.getRandom()
            let h = ps.getRandom()
            let i = ps.getRandom()
            let j = ps.getRandom()
            let k = Math.floor(Math.random() * 70);
            let x = `${pickRandom(['🤓', '😅', '😂', '😳', '😎', '🥵', '😱', '🤑', '🙄', '💩', '🍑', '🤨', '🥴', '🔥', '👇🏻', '😔', '👀', '🌚'])}`
            let l = Math.floor(Math.random() * x.length);
            let vn = `https://hansxd.nasihosting.com/sound/sound${k}.mp3`
            let top = `*${x} Top 10 ${text} ${x}*
    
*1. ${user(a)}*
*2. ${user(b)}*
*3. ${user(c)}*
*4. ${user(d)}*
*5. ${user(e)}*
*6. ${user(f)}*
*7. ${user(g)}*
*8. ${user(h)}*
*9. ${user(i)}*
*10. ${user(j)}*`
            m.reply(top, null, {mentions: [a, b, c, d, e, f, g, h, i, j]})
            conn.sendFile(m.chat, vn, 'error.mp3', undefined, m, true, {
                type: 'audioMessage',
                ptt: true
            })
        }

//------------------------------------------------------------------------------------

        if (command == 'topgays') {
            let vn = 'https://qu.ax/HfeP.mp3'
            let top = `*🌈TOP 10 GAYS/LESBIANAS DEL GRUPO🌈*
    
*_1.- 🏳️‍🌈 ${user(a)}_* 🏳️‍🌈
*_2.- 🪂 ${user(b)}_* 🪂
*_3.- 🪁 ${user(c)}_* 🪁
*_4.- 🏳️‍🌈 ${user(d)}_* 🏳️‍🌈
*_5.- 🪂 ${user(e)}_* 🪂
*_6.- 🪁 ${user(f)}_* 🪁
*_7.- 🏳️‍🌈 ${user(g)}_* 🏳️‍🌈
*_8.- 🪂 ${user(h)}_* 🪂
*_9.- 🪁 ${user(i)}_* 🪁
*_10.- 🏳️‍🌈 ${user(j)}_* 🏳️‍🌈`
            m.reply(top, null, {mentions: conn.parseMention(top)})
            conn.sendFile(m.chat, vn, 'error.mp3', undefined, m, true, {
                type: 'audioMessage',
                ptt: true
            })
        }

//------------------------------------------------------------------------------------ 

        if (command == 'topotakus') {
            let vn = 'https://qu.ax/ZgFZ.mp3'
            let top = `*🌸 TOP 10 OTAKUS DEL GRUPO 🌸*
    
*_1.- 💮 ${user(a)}_* 💮
*_2.- 🌷 ${user(b)}_* 🌷
*_3.- 💮 ${user(c)}_* 💮
*_4.- 🌷 ${user(d)}_* 🌷
*_5.- 💮 ${user(e)}_* 💮
*_6.- 🌷 ${user(f)}_* 🌷
*_7.- 💮 ${user(g)}_* 💮
*_8.- 🌷 ${user(h)}_* 🌷
*_9.- 💮 ${user(i)}_* 💮
*_10.- 🌷 ${user(j)}_* 🌷`
            m.reply(top, null, {mentions: conn.parseMention(top)})
            conn.sendFile(m.chat, vn, 'otaku.mp3', undefined, m, true, {
                type: 'audioMessage',
                ptt: true
            })
        }

//------------------------------------------------------------------------------------

        if (command == 'topintegrantes' || command == 'topintegrante') {
            let top = `*_💎TOP 10 L@S MEJORES INTEGRANTES👑_*
    
*_1.- 💎 ${user(a)}_* 💎
*_2.- 👑 ${user(b)}_* 👑
*_3.- 💎 ${user(c)}_* 💎
*_4.- 👑 ${user(d)}_* 👑
*_5.- 💎 ${user(e)}_* 💎
*_6.- 👑 ${user(f)}_* 👑
*_7.- 💎 ${user(g)}_* 💎
*_8.- 👑 ${user(h)}_* 👑
*_9.- 💎 ${user(i)}_* 💎
*_10.- 👑 ${user(j)}_* 👑`
            m.reply(top, null, {mentions: conn.parseMention(top)})
        }

//------------------------------------------------------------------------------------   

        if (command == 'toplagrasa' || command == 'topgrasa') {
            let top = `*_Uwu TOP 10 LA GRASA Uwu_* 
    
*_1.- Bv ${user(a)} Bv_*
*_2.- :v ${user(b)} :v_*
*_3.- :D ${user(c)} :D_*
*_4.- Owo ${user(d)} Owo_*
*_5.- U.u ${user(e)} U.u_*
*_6.- >:v ${user(f)} >:v_*
*_7.- :'v ${user(g)} :'v_*
*_8.- ._. ${user(h)} ._._*
*_9.- :V ${user(i)} :V_*
*_10.- XD ${user(j)} XD_*`
            m.reply(top, null, {mentions: conn.parseMention(top)})
        }

//------------------------------------------------------------------------------------

        if (command == 'toppanafrescos' || command == 'toppanafresco') {
            let top = `*_👊TOP 10 PANAFRESCOS👊_* 
    
*_1.- 🤑 ${user(a)}_* 🤑
*_2.- 🤙 ${user(b)}_* 🤙
*_3.- 😎 ${user(c)}_* 😎
*_4.- 👌 ${user(d)}_* 👌
*_5.- 🧐 ${user(e)}_* 🧐
*_6.- 😃 ${user(f)}_* 😃
*_7.- 😋 ${user(g)}_* 😋
*_8.- 🤜 ${user(h)}_* 🤜
*_9.- 💪 ${user(i)}_* 💪
*_10.- 😉 ${user(j)}_* 😉`
            m.reply(top, null, {mentions: conn.parseMention(top)})
        }

//------------------------------------------------------------------------------------

        if (command == 'topshiposters' || command == 'topshipost') {
            let top = `*_😱TOP 10 SHIPOSTERS DEL GRUPO😱_* 
    
*_1.- 😈 ${user(a)}_* 😈
*_2.- 🤙 ${user(b)}_* 🤙
*_3.- 🥶 ${user(c)}_* 🥶
*_4.- 🤑 ${user(d)}_* 🤑
*_5.- 🥵 ${user(e)}_* 🥵
*_6.- 🤝 ${user(f)}_* 🤝
*_7.- 😟 ${user(g)}_* 😟
*_8.- 😨 ${user(h)}_* 😨
*_9.- 😇 ${user(i)}_* 😇
*_10.- 🤠 ${user(j)}_* 🤠`
            m.reply(top, null, {mentions: conn.parseMention(top)})
        }

//------------------------------------------------------------------------------------  

        if (command == 'toppajer@s') {
            let top = `*_😏TOP L@S MAS PAJEROS/AS DEL GRUPO💦_* 
    
*_1.- 🥵 ${user(a)}_* 💦
*_2.- 🥵 ${user(b)}_* 💦
*_3.- 🥵 ${user(c)}_* 💦
*_4.- 🥵 ${user(d)}_* 💦
*_5.- 🥵 ${user(e)}_* 💦
*_6.- 🥵 ${user(f)}_* 💦
*_7.- 🥵 ${user(g)}_* 💦
*_8.- 🥵 ${user(h)}_* 💦
*_9.- 🥵 ${user(i)}_* 💦
*_10.- 🥵 ${user(j)}_* 💦`
            m.reply(top, null, {mentions: conn.parseMention(top)})
        }

//------------------------------------------------------------------------------------  

        if (command == 'toplind@s' || command == 'toplindos') {
            let top = `*_😳TOP L@S MAS LIND@S Y SEXIS DEL GRUPO😳_*
    
*_1.- ✨ ${user(a)}_* ✨
*_2.- ✨ ${user(b)}_* ✨
*_3.- ✨ ${user(c)}_* ✨
*_4.- ✨ ${user(d)}_* ✨
*_5.- ✨ ${user(e)}_* ✨
*_6.- ✨ ${user(f)}_* ✨
*_7.- ✨ ${user(g)}_* ✨
*_8.- ✨ ${user(h)}_* ✨
*_9.- ✨ ${user(i)}_* ✨
*_10.- ✨ ${user(j)}_* ✨`
            m.reply(top, null, {mentions: conn.parseMention(top)})
        }

//------------------------------------------------------------------------------------

        if (command == 'topput@s') {
            let top = `*_😏TOP L@S MAS PUT@S DEL GRUPO SON🔥_* 
    
*_1.- 👉 ${user(a)}_* 👌
*_2.- 👉 ${user(b)}_* 👌
*_3.- 👉 ${user(c)}_* 👌
*_4.- 👉 ${user(d)}_* 👌
*_5.- 👉 ${user(e)}_* 👌
*_6.- 👉 ${user(f)}_* 👌
*_7.- 👉 ${user(g)}_* 👌
*_8.- 👉 ${user(h)}_* 👌
*_9.- 👉 ${user(i)}_* 👌
*_10.- 👉 ${user(j)}_* 👌`
            m.reply(top, null, {mentions: conn.parseMention(top)})
        }

//------------------------------------------------------------------------------------   

        if (command == 'topfamosos' || command == 'topfamos@s') {
            let top = `*_🌟TOP PERSONAS FAMOSAS EN EL GRUPO🌟_* 
    
*_1.- 🛫 ${user(a)}_* 🛫
*_2.- 🥂 ${user(b)}_* 🥂
*_3.- 🤩 ${user(c)}_* 🤩
*_4.- 🛫 ${user(d)}_* 🛫
*_5.- 🥂 ${user(e)}_* 🥂
*_6.- 🤩 ${user(f)}_* 🤩
*_7.- 🛫 ${user(g)}_* 🛫
*_8.- 🥂 ${user(h)}_* 🥂
*_9.- 🤩 ${user(i)}_* 🤩
*_10.- 🛫 ${user(j)}_* 🛫`
            m.reply(top, null, {mentions: conn.parseMention(top)})
        }

//------------------------------------------------------------------------------------ 

        if (command == 'topparejas' || command == 'top5parejas') {
            let top = `*_😍 Las 5 maravillosas parejas del grupo 😍_*
    
*_1.- ${user(a)} 💘 ${user(b)}_* 
Que hermosa pareja 💖, me invitan a su Boda 🛐

*_2.- ${user(c)} 💘 ${user(d)}_*  
🌹 Ustedes se merecen lo mejor del mundo 💞

*_3.- ${user(e)} 💘 ${user(f)}_* 
Tan enamorados 😍, para cuando la familia 🥰

*_4.- ${user(g)} 💘 ${user(h)}_* 
💗 Decreto que ustedes son la pareja del Año 💗 

*_5.- ${user(i)} 💘 ${user(j)}_* 
Genial! 💝, están de Luna de miel 🥵✨❤️‍🔥`
            m.reply(top, null, {mentions: conn.parseMention(top)})
        }
    } catch (e: unknown) {
//await conn.reply(m.chat, `${lenguajeGB['smsMalError3']()}#report ${lenguajeGB['smsMensError2']()} ${usedPrefix + command}\n\n${wm}`, fkontak, m)
//console.log(`❗❗ ${lenguajeGB['smsMensError2']()} ${usedPrefix + command} ❗❗`)
        console.log(e)
    }
    }
})

function pickRandom<T>(list: T[]): T {
    return list[Math.floor(Math.random() * list.length)]
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function msToTime(duration: number) {
    const minutes = Math.floor((duration / (1000 * 60)) % 60)
    const hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
    const formattedHours = hours < 10 ? "0" + hours : String(hours)
    const formattedMinutes = minutes < 10 ? "0" + minutes : String(minutes)
    return formattedHours + " Hora(s) " + formattedMinutes + " Minuto(s)"
}

function randomPercent(): number {
    return Math.floor(Math.random() * 500)
}

function getGayLabel(score: number): string {
    if (score < 20) return 'Usted es hetero 🤪🤙'
    if (score <= 30) return 'Mas o menos 🤔'
    if (score <= 40) return 'Tengo mi dudas 😑'
    if (score <= 49) return 'Tengo razon? 😏'
    if (score === 50) return 'Eres o no? 🧐'
    return 'Usted es gay 🥸'
}

//conn.sendHydrated(m.chat, juego, wm, null, md, '𝙂𝙖𝙩𝙖𝘽𝙤𝙩-𝙈𝘿', null, null, [
//['𝙈𝙚𝙣𝙪 𝙅𝙪𝙚𝙜𝙤𝙨 | 𝙂𝙖𝙢𝙚𝙨 𝙈𝙚𝙣𝙪 🎡', '#juegosmenu'],
//['𝙊𝙩𝙧𝙖 𝙫𝙚𝙯 | 𝘼𝙜𝙖𝙞𝙣 🤭', `${usedPrefix + command} ${text.toUpperCase()}`],
//['𝙑𝙤𝙡𝙫𝙚𝙧 𝙖𝙡 𝙈𝙚𝙣𝙪́ | 𝘽𝙖𝙘𝙠 𝙩𝙤 𝙈𝙚𝙣𝙪 ☘️', '/menu']
//], m, m.mentionedJid ? {
//mentions: m.mentionedJid
//} : {})} 
