import {dirname, join, relative, sep} from 'path'
import {fileURLToPath, pathToFileURL} from 'url'
import {existsSync, readdirSync, readFileSync, statSync, watch, type FSWatcher} from 'fs'
import chalk from "chalk"
import syntaxerror from 'syntax-error'
import {format} from 'util'
import {router} from '../core/router.js'
import {logDebug, logError, logInfo, logWarn} from './logger.js';
import type {Plugin} from '../types/plugin.js'
import {
    clearLoadedPlugins,
    getLoadedPlugins,
    removeLoadedPlugin,
    setLoadedPlugin,
} from '../core/runtime-state.js'

const __libDir = dirname(fileURLToPath(import.meta.url))
const pluginFolder = join(__libDir, '..', 'plugins')
const pluginFilter = (filename: string): boolean => /\.(js|ts)$/.test(filename) && !filename.endsWith('.d.ts')
const watchedDirs = new Set<string>()
const watchers = new Set<FSWatcher>()
const reloadTimers = new Map<string, ReturnType<typeof setTimeout>>()
clearLoadedPlugins()

type PluginModule = {
    default?: Plugin;
    before?: Plugin['before'];
} & Partial<Plugin>;

function asPluginModule(value: unknown): PluginModule {
    return value && typeof value === 'object' ? value as PluginModule : {};
}

function normalizePlugin(module: PluginModule): Plugin {
    const base = module.default || (async () => undefined) as Plugin;
    return Object.assign(base, module);
}

function setPluginName(plugin: Plugin, filename: string): Plugin {
    plugin.__name = filename;
    return plugin;
}

function normalizePluginPath(fullPath: string): string {
    return relative(pluginFolder, fullPath).split(sep).join('/');
}

function getPluginFullPath(pluginPath: string): string {
    return join(pluginFolder, ...pluginPath.split('/'));
}

function listPluginFiles(dir = pluginFolder): string[] {
    const files: string[] = [];

    for (const entry of readdirSync(dir, {withFileTypes: true})) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...listPluginFiles(fullPath));
            continue;
        }

        const pluginPath = normalizePluginPath(fullPath);
        if (pluginFilter(pluginPath)) files.push(pluginPath);
    }

    return files.sort();
}

export async function loadPlugins(): Promise<void> {
    for (const filename of listPluginFiles()) {
        try {
            const pathFile = pathToFileURL(getPluginFullPath(filename)).href
            const module = asPluginModule(await import(`${pathFile}?update=${Date.now()}`))
            const plugin = setPluginName(normalizePlugin(module), filename)

            setLoadedPlugin(filename, plugin)

            if (typeof plugin.before === 'function') {
                plugin.__hasBefore = true
            }
        } catch (e) {
            logError(chalk.red(`${filename}:\n${format(e)}`))
            removeLoadedPlugin(filename)
        }
    }
    router.registerAll(getLoadedPlugins())
}

const reload = async (filename: string): Promise<void> => {
    if (!pluginFilter(filename)) return

    const fullPath = getPluginFullPath(filename)
    if (existsSync(fullPath)) {
        const err = syntaxerror(readFileSync(fullPath, 'utf8'), filename, {
            sourceType: 'module',
            allowAwaitOutsideFunction: true
        })

        if (err) {
            logError(chalk.red(`ERROR DE SINTAXIS EN ${filename}:\n${format(err)}`))
            return
        }

        const previousPlugin = getLoadedPlugins()[filename];
        try {
            const pathFile = pathToFileURL(fullPath).href
            const module = asPluginModule(await import(`${pathFile}?update=${Date.now()}`))
            const plugin = setPluginName(normalizePlugin(module), filename)

            setLoadedPlugin(filename, plugin)
            router.registerAll(getLoadedPlugins())
            logInfo(chalk.green(`UPDATE : ${filename}`))
        } catch (e) {
            if (previousPlugin) setLoadedPlugin(filename, previousPlugin);
            else removeLoadedPlugin(filename);
            router.registerAll(getLoadedPlugins());
            logError(chalk.red(`❌ ERROR RECARGANDO ${filename}:\n${format(e)}`))
        }
    } else {
        logWarn(chalk.yellow(`PLUGIN ELIMINADO: ${filename}`))
        removeLoadedPlugin(filename)
        router.registerAll(getLoadedPlugins())
    }
}

function watchPluginDirectory(dir: string): void {
    if (watchedDirs.has(dir)) return;
    watchedDirs.add(dir);

    const watcher = watch(dir, async (_eventType, filename) => {
        if (typeof filename !== 'string') return;

        const fullPath = join(dir, filename);
        if (existsSync(fullPath)) {
            const stat = statSync(fullPath);
            if (stat.isDirectory()) {
                logDebug(chalk.gray(`WATCH PLUGIN DIR: ${normalizePluginPath(fullPath)}`));
                watchPluginDirectory(fullPath);
                return;
            }
        }

        const pluginPath = normalizePluginPath(fullPath);
        const previous = reloadTimers.get(pluginPath);
        if (previous) clearTimeout(previous);
        const timer = setTimeout(() => {
            reloadTimers.delete(pluginPath);
            void reload(pluginPath);
        }, 100);
        reloadTimers.set(pluginPath, timer);
    });
    watchers.add(watcher);

    for (const entry of readdirSync(dir, {withFileTypes: true})) {
        if (entry.isDirectory()) watchPluginDirectory(join(dir, entry.name));
    }
}

export function stopPluginWatchers(): void {
    for (const timer of reloadTimers.values()) clearTimeout(timer);
    reloadTimers.clear();
    for (const watcher of watchers) watcher.close();
    watchers.clear();
    watchedDirs.clear();
}

if (process.env.NODE_ENV !== 'prod') watchPluginDirectory(pluginFolder)
