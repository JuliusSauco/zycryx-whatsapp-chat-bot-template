import {logInfo} from '../../lib/logger.js';
import syntaxerror from 'syntax-error'
import {format} from 'util'
import {fileURLToPath} from 'url'
import {dirname} from 'path'
import {createRequire} from 'module'
import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import {auditSensitiveCommand, limitOutput, sanitizeCommandError, withTimeout} from '../../lib/sensitive-command.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(__dirname)
const AsyncFunction = Object.getPrototypeOf(async function () {
}).constructor as new (...args: string[]) => (...args: unknown[]) => Promise<unknown>
const OWNER_EVAL_TIMEOUT_MS = 10_000;

const plugin = defineSdkPlugin({
    help: ['> ', '=> ', '='],
    tags: ['owner'],
    customPrefix: /^=?>\s?/,
    customPrefixPriority: 100,
    rowner: true,
    register: true,
    async execute(m, _2) {

//if (m.fromMe) return
        const {conn, isOwner, args, metadata, sdk} = _2
        if (!isOwner) return

        let prefixMatch = (m.originalText || m.text)?.match(/^=?>\s?/)
        if (!prefixMatch) return

        const noPrefix = m.originalText.replace(prefixMatch[0], '').trim()
        if (!noPrefix) return
        const _text = prefixMatch[0].startsWith('=') ? 'return ' + noPrefix : noPrefix
        const old = (m.exp || 0) * 1
        let _return: unknown
        let _syntax = ''
        auditSensitiveCommand({action: 'owner-eval', sender: m.sender, chatId: m.chat, command: noPrefix})

        try {
            let i = 15
            const f = {exports: {}}

            let exec = new AsyncFunction(
                'print', 'm', 'handler', 'require', 'conn', 'Array',
                'process', 'args', 'groupMetadata', 'module', 'exports', 'argument',
                _text
            )

            _return = await withTimeout(Promise.resolve(exec.call(conn,
                (...args: unknown[]) => {
                    if (--i < 1) return
                    logInfo(format(...args))
                    return sdk.reply.text(limitOutput(format(...args)))
                },
                m, plugin, require, conn, CustomArray, process, args, metadata, f, f.exports, [conn, _2]
            )), OWNER_EVAL_TIMEOUT_MS, 'owner eval')

        } catch (e: unknown) {
            const err = syntaxerror(_text, 'Execution Function', {
                allowReturnOutsideFunction: true,
                allowAwaitOutsideFunction: true,
                sourceType: 'module'
            })
            if (err) _syntax = '```' + err + '```\n\n'
            _return = sanitizeCommandError(e)
        } finally {
            await sdk.reply.text(limitOutput(_syntax + format(_return)))
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
