import type {WASocket} from '@whiskeysockets/baileys';
import type {Plugin} from '../types/plugin.js';

export type RuntimeConnection = WASocket & {
    userId?: string;
    uptime?: number;
    isInit?: boolean;
};

const subbotConnections: RuntimeConnection[] = [];
const loadedPlugins: Record<string, Plugin> = {};
let mainConnection: WASocket | undefined;

export function getMainConnection(): WASocket | undefined {
    return mainConnection;
}

export function setMainConnection(conn: unknown): void {
    mainConnection = conn as WASocket;
}

export function clearMainConnection(conn?: unknown): void {
    if (!conn || mainConnection === conn) mainConnection = undefined;
}

export function isMainConnection(conn: unknown): boolean {
    return Boolean(conn && getMainConnection() === conn);
}

export function getSubbotConnections(): RuntimeConnection[] {
    return subbotConnections;
}

export function hasSubbotConnection(userId: string): boolean {
    return getSubbotConnections().some((conn) => conn.userId === userId);
}

export function registerSubbotConnection(conn: RuntimeConnection): void {
    if (conn.userId) unregisterSubbotConnection(conn.userId);
    getSubbotConnections().push(conn);
}

export function unregisterSubbotConnection(userId: string | undefined): boolean {
    if (!userId) return false;
    const connections = getSubbotConnections();
    const index = connections.findIndex((conn) => conn.userId === userId);
    if (index < 0) return false;
    connections.splice(index, 1);
    return true;
}

export function isSubbotConnection(conn: {user?: {id?: string}} | null | undefined): boolean {
    return Boolean(conn?.user?.id && getSubbotConnections().some((subbot) => subbot.user?.id === conn.user?.id));
}

export function isRuntimeSessionActive(sessionId: string): boolean {
    return getSubbotConnections().some((conn) => conn.userId === sessionId || Boolean(conn.user?.id?.includes(sessionId)));
}

export function getLoadedPlugins(): Record<string, Plugin> {
    return loadedPlugins;
}

export function setLoadedPlugin(filename: string, plugin: Plugin): void {
    getLoadedPlugins()[filename] = plugin;
}

export function removeLoadedPlugin(filename: string): void {
    delete getLoadedPlugins()[filename];
}

export function clearLoadedPlugins(): void {
    const plugins = getLoadedPlugins();
    for (const filename of Object.keys(plugins)) {
        delete plugins[filename];
    }
}
