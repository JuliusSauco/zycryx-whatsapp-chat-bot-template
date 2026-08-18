import {fetchLatestBaileysVersion} from '@whiskeysockets/baileys';

type BaileysVersion = Awaited<ReturnType<typeof fetchLatestBaileysVersion>>['version'];

let versionPromise: Promise<BaileysVersion> | null = null;

/** Resolve compatibility once per process instead of doing network I/O on every reconnect. */
export function getBaileysVersion(): Promise<BaileysVersion> {
    versionPromise ??= fetchLatestBaileysVersion()
        .then(result => result.version)
        .catch(error => {
            versionPromise = null;
            throw error;
        });
    return versionPromise;
}
