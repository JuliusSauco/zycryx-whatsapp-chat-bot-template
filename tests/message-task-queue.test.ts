import assert from 'node:assert/strict';
import {MessageTaskQueue} from '../src/core/message-task-queue.js';

const order: string[] = [];
let active = 0;
let maxActive = 0;
const queue = new MessageTaskQueue({concurrency: 2, perKeyLimit: 2, globalLimit: 4});
const task = (name: string, delay: number) => async () => {
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise(resolve => setTimeout(resolve, delay));
    order.push(name);
    active--;
};

assert.equal(queue.enqueue('chat-a', task('a1', 20)), true);
assert.equal(queue.enqueue('chat-a', task('a2', 1)), true);
assert.equal(queue.enqueue('chat-a', task('a3', 1)), true);
assert.equal(queue.enqueue('chat-a', task('a4-rejected', 1)), false);
assert.equal(queue.enqueue('chat-b', task('b1', 1)), true);
assert.equal(await queue.idle(2_000), true);

assert.equal(maxActive, 2);
assert.ok(order.indexOf('a1') < order.indexOf('a2'));
assert.ok(order.indexOf('a2') < order.indexOf('a3'));
assert.equal(order.includes('a4-rejected'), false);
assert.equal(queue.getStats().rejected, 1);

console.log('message-task-queue.test.ts OK');
