import type {BotMessage} from './message.js';
import type {BeforePluginContext, PluginContext} from './context.js';

export interface Plugin {
    command?: RegExp | string | string[];
    customPrefix?: RegExp | ((input: string) => boolean);
    help?: string[];
    tags?: string[];
    owner?: boolean;
    rowner?: boolean;
    admin?: boolean;
    botAdmin?: boolean;
    group?: boolean;
    private?: boolean;
    register?: boolean;
    limit?: number;
    money?: number;
    level?: number;
    before?: (m: BotMessage, ctx: BeforePluginContext) => Promise<boolean | void | unknown>;
    runBeforeOnCommand?: boolean;
    __hasBefore?: boolean;
    __name?: string;

    (m: BotMessage, ctx: PluginContext): Promise<unknown>;
}
