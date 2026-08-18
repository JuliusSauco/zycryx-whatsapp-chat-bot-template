import {installConsoleCapture} from '../lib/runtime-console.js';

installConsoleCapture();

const [{default: cfonts}, {ENV}, {logError, logInfo}] = await Promise.all([
    import('cfonts'),
    import('./env.js'),
    import('../lib/logger.js'),
]);

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
