import {defineSdkPlugin} from '../../core/sdk-plugin.js'

export default defineSdkPlugin({
    help: ['runtime'],
    tags: ['main'],
    command: /^(runtime|sc)$/i,
    owner: false,
    group: false,
    private: false,
    register: true,
    async execute(_m, {sdk}) {
    const runtime = process.uptime()
    const teks = sdk.content.renderMessage('info.runtime.response', {
        repositoryUrl: info.md,
        runtime: formatRuntime(runtime, (values) => sdk.content.renderMessage('info.runtime.duration', values)),
    })
    return sdk.reply.text(teks)
    }
})

function pad(n: number): string {
    return (n < 10 ? '0' : '') + n
}

function formatRuntime(seconds: number, renderDuration: (values: Record<string, string>) => string): string {
    const days = Math.floor(seconds / (24 * 60 * 60))
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60))
    const minutes = Math.floor((seconds % (60 * 60)) / 60)
    const secs = Math.floor(seconds % 60)
    return renderDuration({
        days: pad(days),
        hours: pad(hours),
        minutes: pad(minutes),
        seconds: pad(secs),
    })
}
