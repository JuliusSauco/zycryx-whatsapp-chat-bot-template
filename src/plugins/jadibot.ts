import {startSubBot} from '../lib/subbot.js';
import {definePlugin} from '../core/define-plugin.js';

let commandFlags = {};

export default definePlugin({
    help: ['jadibot', 'serbot', 'code'],
    tags: ['jadibot'],
    command: /^(serbot|code|jadibot|qr)$/i,
    register: false,
    async execute(m, {conn, command}) {
    // @ts-ignore
    commandFlags[m.sender] = true;

    const rtx = `*🔰 LoliBot-MD 🔰*\nㅤㅤㅤㅤSer sub bot\n\n*Con otro telefono que tengas o en la PC escanea este QR para convertirte en un sub bot*\n\n*1. Haga clic en los tres puntos en la esquina superior derecha*\n*2. Toca WhatsApp Web*\n*3. Escanee este código QR*\n*Este código QR expira en 45 segundos!*\n\n> *⚠️ No nos hacemos responsable del mal uso que se le pueda dar.*`;
    const rtx2 = `*🔰 LoliBot-MD 🔰*\nㅤㅤㅤㅤSer sub bot\n\n*1️⃣ Dirígete a los tres puntos en la esquina superior derecha*\n*2️⃣ Opción: Dispositivos vinculados*\n*3️⃣ Vincular con código de teléfono*\n*4️⃣ Pega el código a continuación*\n> Codigo de 8 digitos vencen en 60 segundos`;

    const phone = m.sender?.split('@')[0];
    const isCode = /^(serbot|code)$/.test(command);
    const caption = isCode ? rtx2 : rtx;
    await startSubBot(m, conn, caption, isCode, phone, m.chat, commandFlags);
    }
});
