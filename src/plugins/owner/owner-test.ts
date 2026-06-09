import {logError} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js';
import {countSubbotsByType, listSubbotConfigs} from '../../services/subbot.service.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';

export default definePlugin({
    help: ['testsubbots [opcional: 1|2]'],
    tags: ['owner'],
    command: /^testsubbots$/i,
    register: true,
    owner: true,
    async execute(m, {conn, args}) {
        const id = conn.user?.id;
        if (!id) return m.reply(getRequiredPluginMessage('owner.testSubbots.missingBotId'));

        try {
            const tipoFiltro = args[0] === '1' ? 'oficial' : args[0] === '2' ? 'subbot' : null;
            const [rows, conteo] = await Promise.all([
                listSubbotConfigs(tipoFiltro),
                tipoFiltro ? null : countSubbotsByType()
            ]);

            if (rows.length === 0) {
                return m.reply(tipoFiltro
                    ? renderTemplate(getRequiredPluginMessage('owner.testSubbots.emptyByType'), {type: tipoFiltro})
                    : getRequiredPluginMessage('owner.testSubbots.empty'));
            }

            let mensaje = renderTemplate(getRequiredPluginMessage('owner.testSubbots.header'), {
                type: tipoFiltro ? renderTemplate(getRequiredPluginMessage('owner.testSubbots.typeSuffix'), {type: tipoFiltro}) : ''
            });

            if (!tipoFiltro && conteo) {
                const {oficiales, subbots} = conteo;
                mensaje += renderTemplate(getRequiredPluginMessage('owner.testSubbots.summary'), {
                    main: oficiales,
                    subbots
                });
            }

            for (const row of rows) {
                mensaje += renderTemplate(getRequiredPluginMessage('owner.testSubbots.row'), {
                    id: row.id,
                    type: row.tipo || getRequiredPluginMessage('owner.testSubbots.unknown'),
                    mode: row.mode || getRequiredPluginMessage('owner.testSubbots.defaultMode'),
                    name: row.name || getRequiredPluginMessage('owner.testSubbots.defaultName'),
                    prefixes: row.prefix ? row.prefix.join(', ') : getRequiredPluginMessage('owner.testSubbots.defaultPrefixes'),
                    owners: row.owners?.length ? row.owners.join(', ') : getRequiredPluginMessage('owner.testSubbots.defaultOwners'),
                    antiPrivate: row.anti_private ? getRequiredPluginMessage('owner.testSubbots.yes') : getRequiredPluginMessage('owner.testSubbots.no'),
                    antiCall: row.anti_call ? getRequiredPluginMessage('owner.testSubbots.yes') : getRequiredPluginMessage('owner.testSubbots.no'),
                    privacy: row.privacy ? getRequiredPluginMessage('owner.testSubbots.yes') : getRequiredPluginMessage('owner.testSubbots.no'),
                    lend: row.prestar ? getRequiredPluginMessage('owner.testSubbots.yes') : getRequiredPluginMessage('owner.testSubbots.no'),
                    logo: row.logo_url || getRequiredPluginMessage('owner.testSubbots.none')
                });
            }

            m.reply(mensaje.trim());

        } catch (err: unknown) {
            logError("❌ Error al consultar subbots:", err);
            m.reply(getRequiredPluginMessage('owner.testSubbots.error'));
        }
    }
});
