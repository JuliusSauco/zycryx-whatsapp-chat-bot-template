import assert from 'node:assert/strict';
import {definePlugin} from '../src/core/define-plugin.js';
import {
    auditCommandCatalog,
    getAuditQuery,
    renderCommandCatalogAudit,
} from '../src/services/command-catalog-audit.service.js';
import type {Plugin} from '../src/types/plugin.js';

function plugin(options: Partial<Plugin>): Plugin {
    return definePlugin({
        ...options,
        async execute() {
            return undefined;
        },
    });
}

const plugins: Record<string, Plugin> = {
    'downloads/play.ts': plugin({
        command: ['play', 'play2'],
        help: ['play', 'play2'],
        tags: ['downloader'],
    }),
    'games/sin-catalogo.ts': plugin({
        command: /^sin-catalogo$/i,
        help: ['sin-catalogo'],
        tags: ['game'],
    }),
    'owner/catalog.ts': plugin({
        command: 'catalogaudit',
        help: ['catalogaudit'],
        tags: ['owner'],
    }),
    'group/fantasmas.ts': plugin({
        command: 'fantasmas',
        help: ['fantasmas'],
        tags: ['group'],
        admin: true,
    }),
};

assert.equal(getAuditQuery('enable autoresponder --triggerall'), 'enable autoresponder --triggerall');
assert.equal(getAuditQuery('db info'), 'db info');
assert.equal(getAuditQuery('cf <cantidad>'), 'cf');
assert.equal(getAuditQuery('group open/close'), 'group open');
assert.equal(getAuditQuery('msglog on/off/estado'), 'msglog');

const report = auditCommandCatalog(plugins);
assert.equal(report.pluginsChecked, 4);
assert.equal(report.helpEntriesChecked, 5);
assert.equal(report.missingEntries, 1);
assert.equal(report.permissionMismatches, 1);
assert.equal(report.scopeMismatches, 1);
assert.deepEqual(report.issues.map(issue => issue.type), [
    'missing_catalog_entry',
    'permission_mismatch',
    'scope_mismatch',
]);

const output = renderCommandCatalogAudit(report, 2);
assert.match(output, /^🧭 \*Auditoria de comandos\*/);
assert.match(output, /\*Sin catalogo:\* 1/);
assert.match(output, /\+1 pendientes mas\./);
assert.doesNotMatch(output, /\*\*/);

console.log('command-catalog-audit.test.ts OK');
