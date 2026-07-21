import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const PLUGINS_DIR = path.join(ROOT, 'src', 'plugins');

function listTsFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, {withFileTypes: true});
    return entries.flatMap(entry => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) return listTsFiles(fullPath);
        return entry.isFile() && entry.name.endsWith('.ts') ? [fullPath] : [];
    });
}

function relative(file: string): string {
    return path.relative(ROOT, file).replace(/\\/g, '/');
}

function assertNoPattern(files: string[], pattern: RegExp, label: string): void {
    const offenders = files
        .filter(file => {
            pattern.lastIndex = 0;
            return pattern.test(fs.readFileSync(file, 'utf8'));
        })
        .map(relative);

    assert.deepEqual(offenders, [], `${label}:\n${offenders.join('\n')}`);
}

const sdkPlugins = listTsFiles(PLUGINS_DIR)
    .filter(file => fs.readFileSync(file, 'utf8').includes('defineSdkPlugin'));
const sourceFiles = listTsFiles(SRC_DIR)
    .filter(file => relative(file) !== 'src/core/config.ts');
const brandingConsumerFiles = sourceFiles
    .filter(file => relative(file) !== 'src/core/context-builder.ts');
const runtimeConsumerFiles = listTsFiles(SRC_DIR)
    .filter(file => relative(file) !== 'src/core/runtime-state.ts');
const migratedEphemeralFiles = [
    'src/plugins/downloads/descargas-drive.ts',
    'src/plugins/downloads/descargas-gitclone.ts',
    'src/plugins/downloads/descargas-mediafire.ts',
    'src/plugins/downloads/descargas-modapk.ts',
    'src/plugins/downloads/descargas-play.ts',
    'src/plugins/downloads/descargas-spotify.ts',
    'src/plugins/downloads/descargas.appmusic.ts',
    'src/plugins/fun/fun-adivinar.ts',
    'src/plugins/games/game-math.ts',
    'src/plugins/games/game-ppt.ts',
    'src/plugins/games/game-ttt.ts',
    'src/plugins/hooks/_autolevelup.ts',
    'src/plugins/rpg/rpg-transfer.ts',
    'src/plugins/rpg/rpg-rw-vender.ts',
    'src/plugins/rpg/rpg-rw.ts',
].map(file => path.join(ROOT, file));
const featureAccessGuard = path.join(ROOT, 'src/guards/feature-access.guard.ts');

assertNoPattern(
    sdkPlugins,
    /from\s+['"][^'"]*lib\/message-template\.js['"]|(?<!\.)\bgetRequiredPluginMessage(?:List|ObjectList)?\b|(?<!\.)\brenderTemplate\b/,
    'SDK plugins must use sdk.content instead of message-template helpers',
);

assertNoPattern(
    [featureAccessGuard],
    /plugin\.tags|FEATURE_TAGS/,
    'Feature authorization must use typed plugin.feature instead of documentation tags',
);

assertNoPattern(
    sdkPlugins,
    /from\s+['"][^'"]*lib\/http-client\.js['"]|(?<!\.)\bhttp(?:Json|Text|Request|Buffer)\b/,
    'SDK plugins must use sdk.http or a provider instead of direct http-client helpers',
);

assertNoPattern(
    sourceFiles,
    /\binfo\.(?:wm|img2)\s*=|globalThis\.info\s*=/,
    'Bot branding must be passed through context instead of mutating globalThis.info',
);

assertNoPattern(
    brandingConsumerFiles,
    /\binfo\.(?:wm|img2)\b/,
    'Bot branding consumers must use context branding instead of global info branding',
);

assertNoPattern(
    runtimeConsumerFiles,
    /\bglobalThis\.(?:conn|conns|plugins)\b|\bglobal\.(?:conn|conns|plugins)\b/,
    'Runtime state consumers must use core/runtime-state helpers instead of global connection/plugin state',
);

assertNoPattern(
    migratedEphemeralFiles,
    /\bnew Map<|\bnew Map\(|\bsetTimeout\(|\bclearTimeout\(/,
    'Migrated pending-action plugins must use ephemeral-state helpers instead of manual maps/timers',
);

console.log('p0-architecture.test.ts OK');
