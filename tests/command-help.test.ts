import assert from 'node:assert/strict';
import {definePlugin} from '../src/core/define-plugin.js';
import {buildInlineHelpQuery, isInlineHelpRequest, renderCommandHelp} from '../src/services/command-help.service.js';

const playHelp = renderCommandHelp({query: 'play', usedPrefix: '.'});
assert.match(playHelp, /^🎵 \*play\*/);
assert.match(playHelp, /\*Uso:\* \.play <busqueda o link>/);
assert.match(playHelp, /\*Alias:\* play2, ytmp3, ytmp4/);
assert.doesNotMatch(playHelp, /\*\*/);
assert.ok(playHelp.split('\n').length <= 6, 'help responses should stay compact');

const topInactiveHelp = renderCommandHelp({query: 'topinactive2 --date', usedPrefix: '#'});
assert.match(topInactiveHelp, /^👻 \*topinactive\[pagina\]/);
assert.match(topInactiveHelp, /\*Ejemplo:\* #topinactive/);

const dbInfoHelp = renderCommandHelp({query: 'db info', usedPrefix: '.'});
assert.match(dbInfoHelp, /^🗄️ \*db info\*/);
assert.match(dbInfoHelp, /\*Requiere:\* owner/);

const setPromptDeleteHelp = renderCommandHelp({query: 'setprompt borrar', usedPrefix: '/'});
assert.match(setPromptDeleteHelp, /^🧹 \*setprompt delete\*/);
assert.match(setPromptDeleteHelp, /\*Uso:\* \/setprompt delete/);

const enableWelcomeHelp = renderCommandHelp({query: 'enable welcome --hidetagadmin', usedPrefix: '#'});
assert.match(enableWelcomeHelp, /^👋 \*enable welcome\*/);
assert.match(enableWelcomeHelp, /\*Uso:\* #enable welcome \[--hidetagadmin\|--hidetag\]/);

const fallbackPlugin = definePlugin({
    command: /^volado$/i,
    help: ['volado <cantidad>'],
    tags: ['game'],
    async execute() {
        return undefined;
    },
});
const fallbackHelp = renderCommandHelp({query: 'volado', usedPrefix: '/', plugin: fallbackPlugin});
assert.match(fallbackHelp, /^🎮 \*volado\*/);
assert.match(fallbackHelp, /\*Uso:\* \/volado <cantidad>/);

assert.equal(isInlineHelpRequest(['song', '--help']), true);
assert.equal(isInlineHelpRequest(['song']), false);
assert.equal(buildInlineHelpQuery('enable', 'bot --help'), 'enable bot');
assert.match(renderCommandHelp({query: '', usedPrefix: '.'}), /^📚 \*Ayuda\*/);

console.log('command-help.test.ts OK');
