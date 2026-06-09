import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
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

assertNoPattern(
    sdkPlugins,
    /from\s+['"][^'"]*lib\/message-template\.js['"]|(?<!\.)\bgetRequiredPluginMessage(?:List|ObjectList)?\b|(?<!\.)\brenderTemplate\b/,
    'SDK plugins must use sdk.content instead of message-template helpers',
);

assertNoPattern(
    sdkPlugins,
    /from\s+['"][^'"]*lib\/http-client\.js['"]|(?<!\.)\bhttp(?:Json|Text|Request|Buffer)\b/,
    'SDK plugins must use sdk.http or a provider instead of direct http-client helpers',
);

console.log('p0-architecture.test.ts OK');
