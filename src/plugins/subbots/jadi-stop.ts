import {logError, logInfo} from '../../lib/logger.js';
import fs from "fs";
import path from "path";
import {defineSdkPlugin} from '../../core/sdk-plugin.js';

export default defineSdkPlugin({
    help: ['stop'],
    tags: ['jadibot'],
    command: /^(stop)$/i,
    owner: true,
    private: true,
    register: true,
    async execute(m, {conn, sdk}) {
    const rawId = conn.user?.id || "";
    const cleanId = rawId.replace(/:\d+/, ""); // elimina :16, :17
    const sessionPath = path.join("jadibot", cleanId);
    const isSubBot = fs.existsSync(sessionPath);
    if (!isSubBot) return sdk.reply.message('subbots.stop.onlySubbot')
    try {
        await sdk.reply.message('subbots.stop.goodbye');
        await conn.logout();

        setTimeout(() => {
            if (fs.existsSync(sessionPath)) {
                fs.rmSync(sessionPath, {recursive: true, force: true});
                logInfo(`[SubBot ${cleanId}] Sesión cerrada y eliminada.`);
            }
        }, 2000);

        setTimeout(() => {
            void sdk.reply.message('subbots.stop.success');
        }, 3000);
    } catch (err: unknown) {
        logError(`❌ Error al cerrar el subbot ${cleanId}:`, err);
        await sdk.reply.message('subbots.stop.error');
    }
    }
});
