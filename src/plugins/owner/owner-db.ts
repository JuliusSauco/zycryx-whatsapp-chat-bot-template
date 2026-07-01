import {logError} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {getDatabaseInfo, vacuumDatabase} from '../../services/database.service.js';

export default defineSdkPlugin({
    help: ['db info', 'db optimizar', 'db borrar', 'db crear'],
    tags: ['owner'],
    command: /^(db)$/i,
    rowner: true,
    async execute(_m, {args, sdk}) {
        const subcmd = args[0]?.toLowerCase();

        switch (subcmd) {
            case 'info': {
                try {
                    const info = await getDatabaseInfo();

                    const text = [
                        sdk.content.message('owner.db.infoHeader'),
                        sdk.content.renderMessage('owner.db.users', {count: info.usuarios}),
                        sdk.content.renderMessage('owner.db.registered', {count: info.registrados}),
                        sdk.content.renderMessage('owner.db.chats', {count: info.chats}),
                        sdk.content.renderMessage('owner.db.totalSize', {size: info.totalSize ?? sdk.content.message('owner.db.zeroBytes')}),
                        sdk.content.message('owner.db.tableHeader'),
                        ...info.tablas.map(r => sdk.content.renderMessage('owner.db.tableRow', {
                            table: r.tabla,
                            rows: r.filas,
                            size: r.tamano
                        }))
                    ].join('\n');

                    await sdk.reply.text(text);
                } catch (e: unknown) {
                    logError('[❌] /db info error:', e);
                    await sdk.reply.message('owner.db.queryError');
                }
                break;
            }

            case 'optimizar': {
                try {
                    const inicio = Date.now();
                    await vacuumDatabase();
                    const tiempo = ((Date.now() - inicio) / 1000).toFixed(2);
                    await sdk.reply.message('owner.db.optimized', {seconds: tiempo});
                } catch (e: unknown) {
                    logError('[❌] Error en optimizar:', e);
                    await sdk.reply.message('owner.db.optimizeError');
                }
                break;
            }

            default:
                await sdk.reply.message('owner.db.usage');
        }
    }
});
