import syntaxerror from 'syntax-error'
import {format} from 'util'
import {fileURLToPath} from 'url'
import {dirname} from 'path'
import {createRequire} from 'module'
import {definePlugin} from '../core/define-plugin.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(__dirname)

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
        let _return
        let _syntax = ''

        try {
            let i = 15
            const f = {exports: {}}

            // @ts-ignore
            let exec = new (async () => {
            }).constructor(
                'print', 'm', 'handler', 'require', 'conn', 'Array',
                'process', 'args', 'groupMetadata', 'module', 'exports', 'argument',
                _text
            )

            _return = await exec.call(conn,
                // @ts-ignore
                (...args) => {
                    if (--i < 1) return
                    console.log(...args)
                    return conn.reply(m.chat, format(...args), m)
                },
                m, plugin, require, conn, CustomArray, process, args, metadata, f, f.exports, [conn, _2]
            )

        } catch (e: any) {
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

class CustomArray extends Array {
    // @ts-ignore
    constructor(...args) {
        // @ts-ignore
        if (typeof args[0] === 'number') return super(Math.min(args[0], 10000))
        // @ts-ignore
        else return super(...args)
    }
}
