import assert from 'node:assert/strict';
import {createDailyReminderContent} from '../src/services/daily-reminder.service.js';
import {DAILY_REMINDER_COMMAND_ACCESS_KEY, defaultCommandAccess} from '../src/utils/command-access.js';
import {getFamilyManagerLevel, getRequiredFamilyManagerLevel} from '../src/utils/family-access-authority.js';

const content = createDailyReminderContent('Grupo de prueba');
assert.deepEqual(Object.keys(content), ['text']);
assert.match(content.text, /`🌅 UN NUEVO DIA EN Grupo de prueba`/);
assert.match(content.text, /\.recordatoriodiario on\|off/);
assert.doesNotMatch(content.text, /@everyone|@todos/);

const defaultAccess = defaultCommandAccess(DAILY_REMINDER_COMMAND_ACCESS_KEY);
assert.deepEqual(defaultAccess, {enabled: true, accessMode: 'admin'});
assert.equal(getRequiredFamilyManagerLevel(defaultAccess, {enabled: true, accessMode: 'superadmin'}), 2);
assert.equal(getRequiredFamilyManagerLevel(defaultAccess, {enabled: true, accessMode: 'owner'}), 3);
assert.equal(getFamilyManagerLevel({isOwner: false, isGroupCreator: false, isAdmin: true}), 1);

console.log('daily-reminder.test.ts OK');
