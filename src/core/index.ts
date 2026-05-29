import './env.js';
import cfonts from 'cfonts';
import {ENV} from './env.js';

console.log('Iniciando 🚀🚀🚀')

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

import('./main.js');
