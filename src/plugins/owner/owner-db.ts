import {definePlugin} from '../../core/define-plugin.js';
import {getDatabaseInfo, vacuumDatabase} from '../../services/database.service.js';

export default definePlugin({
    help: ['db info', 'db optimizar', 'db borrar', 'db crear'],
    tags: ['owner'],
    command: /^(db)$/i,
    rowner: true,
    async execute(m, {args}) {
        const subcmd = args[0]?.toLowerCase();

        switch (subcmd) {
            case 'info': {
                try {
                    const info = await getDatabaseInfo();

                    const text = [
                        `📊 *\`ESTADÍSTICAS DE BASE DE DATOS\`*`,
                        `> 👤 Usuarios: *${info.usuarios}*`,
                        `> ✅ Registrados: *${info.registrados}*`,
                        `> 💬 Chats totales: *${info.chats}*`,
                        `> 💾 Tamaño total DB: *${info.totalSize ?? '0 bytes'}*`,
                        `\n📁 *\`TAMAÑO POR TABLA:\`*`,
                        ...info.tablas.map(r => `• *${r.tabla}*: ${r.filas} filas — ${r.tamano}`)
                    ].join('\n');

                    await m.reply(text);
                } catch (e: unknown) {
                    console.error('[❌] /db info error:', e);
                    await m.reply('❌ Error al consultar la base de datos.');
                }
                break;
            }

            case 'optimizar': {
                try {
                    const inicio = Date.now();
                    await vacuumDatabase();
                    const tiempo = ((Date.now() - inicio) / 1000).toFixed(2);
                    await m.reply(`✅ *Optimización completada.*\n📉 Se ejecutó *VACUUM FULL*\n⏱️ Duración: *${tiempo} segundos*`);
                } catch (e: unknown) {
                    console.error('[❌] Error en optimizar:', e);
                    await m.reply('❌ No se pudo optimizar.');
                }
                break;
            }

            default:
                await m.reply(`❓ Usa uno de estos subcomandos:

• /db info — ver estadísticas
• /db optimizar — VACUUM FULL`);
        }
    }
});
