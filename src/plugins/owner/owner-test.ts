import {logError} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {countSubbotsByType, listSubbotConfigs} from '../../services/subbot.service.js';

export default defineSdkPlugin({
    help: ['testsubbots [opcional: 1|2]'],
    tags: ['owner'],
    command: /^testsubbots$/i,
    register: true,
    owner: true,
    async execute(m, {conn, args, sdk}) {
        const id = conn.user?.id;
        if (!id) return sdk.reply.message('owner.testSubbots.missingBotId');

        try {
            const tipoFiltro = args[0] === '1' ? 'main' : args[0] === '2' ? 'subbot' : null;
            const [rows, conteo] = await Promise.all([
                listSubbotConfigs(tipoFiltro),
                tipoFiltro ? null : countSubbotsByType()
            ]);

            if (rows.length === 0) {
                return tipoFiltro
                    ? sdk.reply.message('owner.testSubbots.emptyByType', {type: tipoFiltro})
                    : sdk.reply.message('owner.testSubbots.empty');
            }

            let mensaje = sdk.content.renderMessage('owner.testSubbots.header', {
                type: tipoFiltro ? sdk.content.renderMessage('owner.testSubbots.typeSuffix', {type: tipoFiltro}) : ''
            });

            if (!tipoFiltro && conteo) {
                const {main, subbots} = conteo;
                mensaje += sdk.content.renderMessage('owner.testSubbots.summary', {
                    main,
                    subbots
                });
            }

            for (const row of rows) {
                mensaje += sdk.content.renderMessage('owner.testSubbots.row', {
                    id: row.id,
                    type: row.instanceType || sdk.content.message('owner.testSubbots.unknown'),
                    mode: row.mode || sdk.content.message('owner.testSubbots.defaultMode'),
                    name: row.name || sdk.content.message('owner.testSubbots.defaultName'),
                    prefixes: row.prefix ? row.prefix.join(', ') : sdk.content.message('owner.testSubbots.defaultPrefixes'),
                    owners: row.owners?.length ? row.owners.join(', ') : sdk.content.message('owner.testSubbots.defaultOwners'),
                    antiPrivate: row.anti_private ? sdk.content.message('owner.testSubbots.yes') : sdk.content.message('owner.testSubbots.no'),
                    antiCall: row.anti_call ? sdk.content.message('owner.testSubbots.yes') : sdk.content.message('owner.testSubbots.no'),
                    privacy: row.privacy ? sdk.content.message('owner.testSubbots.yes') : sdk.content.message('owner.testSubbots.no'),
                    lend: row.prestar ? sdk.content.message('owner.testSubbots.yes') : sdk.content.message('owner.testSubbots.no'),
                    logo: row.logo_url || sdk.content.message('owner.testSubbots.none')
                });
            }

            await sdk.reply.text(mensaje.trim());

        } catch (err: unknown) {
            logError("❌ Error al consultar subbots:", err);
            await sdk.reply.message('owner.testSubbots.error');
        }
    }
});
