import './env.js';
import cfonts from 'cfonts';
import {ENV} from './env.js';
import {logError, logInfo} from '../lib/logger.js';

logInfo('Iniciando 🚀🚀🚀')

cfonts.say(ENV.BOT_BANNER_NAME, {
    font: 'chrome',
    align: 'center',
    gradient: ['red', 'magenta'],
    transition: false
});

cfonts.say(ENV.BOT_BANNER_AUTHOR, {
    font: 'console',
    align: 'center',
    gradient: ['red', 'magenta'],
    transition: false
});

try {
    const {startApplication} = await import('./main.js');
    await startApplication();
} catch (error) {
    logError('[STARTUP] El bootstrap de la aplicación falló:', error);
    process.exitCode = 1;
}
