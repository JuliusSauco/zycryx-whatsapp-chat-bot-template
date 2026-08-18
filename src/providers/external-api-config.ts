import {ENV} from '../core/env.js';

/** Credenciales privadas: solo providers e integraciones pueden importar este módulo. */
export const externalApis = Object.freeze({
    main: {url: ENV.API_BASE_URL, key: ENV.API_KEY},
    fgmods: {url: ENV.FGMODS_API_URL, key: ENV.FGMODS_API_KEY},
    neoxr: {url: ENV.NEOXR_API_URL, key: ENV.NEOXR_API_KEY},
});
