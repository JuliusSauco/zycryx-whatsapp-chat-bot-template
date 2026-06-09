import {logError} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js';
import {getDatabaseInfo, vacuumDatabase} from '../../services/database.service.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';

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
                        getRequiredPluginMessage('owner.db.infoHeader'),
                        renderTemplate(getRequiredPluginMessage('owner.db.users'), {count: info.usuarios}),
                        renderTemplate(getRequiredPluginMessage('owner.db.registered'), {count: info.registrados}),
                        renderTemplate(getRequiredPluginMessage('owner.db.chats'), {count: info.chats}),
                        renderTemplate(getRequiredPluginMessage('owner.db.totalSize'), {size: info.totalSize ?? getRequiredPluginMessage('owner.db.zeroBytes')}),
                        getRequiredPluginMessage('owner.db.tableHeader'),
                        ...info.tablas.map(r => renderTemplate(getRequiredPluginMessage('owner.db.tableRow'), {
                            table: r.tabla,
                            rows: r.filas,
                            size: r.tamano
                        }))
                    ].join('\n');

                    await m.reply(text);
                } catch (e: unknown) {
                    logError('[❌] /db info error:', e);
                    await m.reply(getRequiredPluginMessage('owner.db.queryError'));
                }
                break;
            }

            case 'optimizar': {
                try {
                    const inicio = Date.now();
                    await vacuumDatabase();
                    const tiempo = ((Date.now() - inicio) / 1000).toFixed(2);
                    await m.reply(renderTemplate(getRequiredPluginMessage('owner.db.optimized'), {seconds: tiempo}));
                } catch (e: unknown) {
                    logError('[❌] Error en optimizar:', e);
                    await m.reply(getRequiredPluginMessage('owner.db.optimizeError'));
                }
                break;
            }

            default:
                await m.reply(getRequiredPluginMessage('owner.db.usage'));
        }
    }
});
