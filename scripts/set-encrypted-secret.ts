import readlineSync from 'readline-sync';
import {db} from '../src/lib/postgres.js';
import {setEncryptedApiToken} from '../src/services/api-token.service.js';
import {logInfo} from '../src/lib/logger.js';

const name = (process.env.SECRET_NAME || process.argv[2] || readlineSync.question('Nombre del token: ')).trim();
const token = (process.env.SECRET_VALUE || process.argv[3] || readlineSync.question('Valor secreto: ', {hideEchoBack: true})).trim();
if (!name || !token) throw new Error('SECRET_NAME y el valor secreto son obligatorios.');

await setEncryptedApiToken(name, token);
logInfo(`[SECRETS] Token '${name}' cifrado y guardado. El valor no se imprimió.`);
await db.end();
