import {logError, logInfo, logWarn} from '../../lib/logger.js';
import syntaxerror from 'syntax-error'
import {format} from 'util'
import {fileURLToPath} from 'url'
import {dirname} from 'path'
import {createRequire} from 'module'
import {definePlugin} from '../../core/define-plugin.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(__dirname)
const AsyncFunction = Object.getPrototypeOf(async function () {
}).constructor as new (...args: string[]) => (...args: unknown[]) => Promise<unknown>

const plugin = definePlugin({
    help: ['> ', '=> ', '='],
    tags: ['owner'],
    customPrefix: /^=?>\s?/,
    rowner: true,
    register: true,
    async execute(m, _2) {

//if (m.fromMe) return
        const {conn, isOwner, args, metadata} = _2
        if (!isOwner) return

        let prefixMatch = (m.originalText || m.text)?.match(/^=?>\s?/)
        if (!prefixMatch) return

        const noPrefix = m.originalText.replace(prefixMatch[0], '').trim()
        const _text = prefixMatch[0].startsWith('=') ? 'return ' + noPrefix : noPrefix
        const old = (m.exp || 0) * 1
        let _return: unknown
        let _syntax = ''

        try {
            let i = 15
            const f = {exports: {}}

            let exec = new AsyncFunction(
                'print', 'm', 'handler', 'require', 'conn', 'Array',
                'process', 'args', 'groupMetadata', 'module', 'exports', 'argument',
                _text
            )

            _return = await exec.call(conn,
                (...args: unknown[]) => {
                    if (--i < 1) return
                    logInfo(format(...args))
                    return conn.reply(m.chat, format(...args), m)
                },
                m, plugin, require, conn, CustomArray, process, args, metadata, f, f.exports, [conn, _2]
            )

        } catch (e: unknown) {
            const err = syntaxerror(_text, 'Execution Function', {
                allowReturnOutsideFunction: true,
                allowAwaitOutsideFunction: true,
                sourceType: 'module'
            })
            if (err) _syntax = '```' + err + '```\n\n'
            _return = e
        } finally {
            conn.reply(m.chat, _syntax + format(_return), m)
            m.exp = old
        }
    }
})

export default plugin

class CustomArray<T = unknown> extends Array<T> {
    constructor(...args: T[] | [number]) {
        if (typeof args[0] === 'number') {
            super(Math.min(args[0], 10000))
        } else {
            super(...args as T[])
        }
    }
}
