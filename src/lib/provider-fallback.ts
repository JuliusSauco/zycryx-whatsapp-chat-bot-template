import {logError} from './logger.js';

export interface Provider<T> {
    name: string;
    run: () => Promise<T | null | undefined>;
}

export async function runFirstProvider<T>(providers: Provider<T>[], errorMessage: string): Promise<T> {
    for (const provider of providers) {
        try {
            const result = await provider.run();
            if (result) return result;
            logError(`[PROVIDER ${provider.name}] respuesta vacia`);
        } catch (err: unknown) {
            logError(`[PROVIDER ${provider.name}] ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    throw new Error(errorMessage);
}
