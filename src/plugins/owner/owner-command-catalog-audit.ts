import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {auditCommandCatalog, renderCommandCatalogAudit} from '../../services/command-catalog-audit.service.js';

export default defineSdkPlugin({
    help: ['catalogaudit'],
    tags: ['owner'],
    command: /^(catalogaudit|auditarcatalogo|auditcommands)$/i,
    owner: true,
    async execute(_m, {sdk}) {
        await sdk.reply.text(renderCommandCatalogAudit(auditCommandCatalog()));
    },
});
