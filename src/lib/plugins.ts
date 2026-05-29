import {dirname, join} from 'path'
import {fileURLToPath, pathToFileURL} from 'url'
import {existsSync, readdirSync, readFileSync, watch} from 'fs'
import chalk from "chalk"
import syntaxerror from 'syntax-error'
import {format} from 'util'
import {router} from '../core/router.js'

const __libDir = dirname(fileURLToPath(import.meta.url))
const pluginFolder = join(__libDir, '..', 'plugins')
const pluginFilter = (filename: string): boolean => /\.(js|ts)$/.test(filename) && !filename.endsWith('.d.ts')
globalThis.plugins = {}

export async function loadPlugins(): Promise<void> {
    for (const filename of readdirSync(pluginFolder).filter(pluginFilter)) {
        try {
            const pathFile = pathToFileURL(join(pluginFolder, filename)).href
            const module = await import(`${pathFile}?update=${Date.now()}`)
            let plugin: any = module.default || module
            if (typeof module.before === 'function') {
                plugin = {...plugin, before: module.before}
            }

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

const reload = async (_: any, filename: string): Promise<void> => {
    if (!pluginFilter(filename)) return

    const fullPath = join(pluginFolder, filename)
    if (existsSync(fullPath)) {
        const err = syntaxerror(readFileSync(fullPath) as any, filename, {
            sourceType: 'module',
            allowAwaitOutsideFunction: true
        })

        if (err) {
            console.error(chalk.red(`ERROR DE SINTAXIS EN ${filename}:\n${format(err)}`))
            return
        }

        try {
            const pathFile = pathToFileURL(fullPath).href
            const module = await import(`${pathFile}?update=${Date.now()}`)
            let plugin: any = module.default || module
            if (typeof module.before === 'function') {
                plugin = {...plugin, before: module.before}
            }

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

watch(pluginFolder, reload as any)
