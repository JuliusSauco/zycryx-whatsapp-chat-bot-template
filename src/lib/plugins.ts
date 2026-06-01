import {dirname, join} from 'path'
import {fileURLToPath, pathToFileURL} from 'url'
import {existsSync, readdirSync, readFileSync, watch} from 'fs'
import chalk from "chalk"
import syntaxerror from 'syntax-error'
import {format} from 'util'
import {router} from '../core/router.js'
import type {Plugin} from '../types/plugin.js'

const __libDir = dirname(fileURLToPath(import.meta.url))
const pluginFolder = join(__libDir, '..', 'plugins')
const pluginFilter = (filename: string): boolean => /\.(js|ts)$/.test(filename) && !filename.endsWith('.d.ts')
globalThis.plugins = {}

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

export async function loadPlugins(): Promise<void> {
    for (const filename of readdirSync(pluginFolder).filter(pluginFilter)) {
        try {
            const pathFile = pathToFileURL(join(pluginFolder, filename)).href
            const module = asPluginModule(await import(`${pathFile}?update=${Date.now()}`))
            const plugin = normalizePlugin(module)

            globalThis.plugins[filename] = plugin

            if (typeof plugin.before === 'function') {
                plugin.__hasBefore = true
            }
        } catch (e) {
            console.error(chalk.red(`${filename}:\n${format(e)}`))
            delete globalThis.plugins[filename]
        }
    }
    router.registerAll(globalThis.plugins)
}

const reload = async (_eventType: string, filename: string | Buffer | null): Promise<void> => {
    if (typeof filename !== 'string') return
    if (!pluginFilter(filename)) return

    const fullPath = join(pluginFolder, filename)
    if (existsSync(fullPath)) {
        const err = syntaxerror(readFileSync(fullPath, 'utf8'), filename, {
            sourceType: 'module',
            allowAwaitOutsideFunction: true
        })

        if (err) {
            console.error(chalk.red(`ERROR DE SINTAXIS EN ${filename}:\n${format(err)}`))
            return
        }

        try {
            const pathFile = pathToFileURL(fullPath).href
            const module = asPluginModule(await import(`${pathFile}?update=${Date.now()}`))
            const plugin = normalizePlugin(module)

            globalThis.plugins[filename] = plugin
            router.registerAll(globalThis.plugins)
            console.log(chalk.green(`UPDATE : ${filename}`))
        } catch (e) {
            console.error(chalk.red(`❌ ERROR RECARGANDO ${filename}:\n${format(e)}`))
        }
    } else {
        console.log(chalk.yellow(`PLUGIN ELIMINADO: ${filename}`))
        delete globalThis.plugins[filename]
        router.registerAll(globalThis.plugins)
    }
}

watch(pluginFolder, reload)
