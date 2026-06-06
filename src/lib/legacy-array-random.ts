import {pickRandom} from '../utils/random.js';

let installed = false;

export function installLegacyArrayRandom(): void {
    const arrayPrototype = Array.prototype as unknown as {getRandom?: () => unknown};

    if (installed || arrayPrototype.getRandom) {
        installed = true;
        return;
    }

    Object.defineProperty(arrayPrototype, 'getRandom', {
        configurable: true,
        writable: true,
        value: function getRandom<T>(this: readonly T[]): T {
            return pickRandom(this);
        },
    });

    installed = true;
}
