import type {BotMessage} from './message.js';
import type {BeforePluginContext, PluginContext} from './context.js';

export type PluginFeature = import('../domain/groups.js').ConfigurableFeatureKey;
export type PluginCommandAccess = Readonly<{
    key: string;
    defaultRule: import('../domain/groups.js').CommandAccessRule;
}>;
export type ExecutionProfile = 'fast' | 'network' | 'media' | 'owner-operation';
export interface ExecutionPolicy {
    profile?: ExecutionProfile;
    timeoutMs?: number;
}
export type InterceptorPhase = 'security' | 'conversation' | 'post';
export type InterceptorFailurePolicy = 'fail-open' | 'fail-closed' | 'report-only';
export type InterceptorResult =
    | {kind: 'continue'}
    | {kind: 'handled'}
    | {kind: 'reject'; message?: string}
    | {kind: 'error'; error: unknown};
export interface PluginInterceptor {
    phase: InterceptorPhase;
    priority: number;
    appliesTo: 'all' | 'commands' | 'messages';
    failurePolicy: InterceptorFailurePolicy;
    run(m: BotMessage, ctx: BeforePluginContext): Promise<InterceptorResult>;
}

export interface PluginManifest {
    id: string;
    commands?: string | readonly string[] | RegExp;
    customPrefix?: RegExp | ((input: string) => boolean);
    customPrefixPriority: number;
    permissions: Readonly<{owner: boolean; admin: boolean; botAdmin: boolean; register: boolean}>;
    scope: 'group' | 'private' | 'both';
    resources: Readonly<{limit: number; money: number; level: number}>;
    feature?: PluginFeature;
    commandAccess?: PluginCommandAccess;
    executionPolicy: ExecutionPolicy;
    interceptors: PluginInterceptor[];
}

export interface Plugin {
    command?: RegExp | string | string[];
    customPrefix?: RegExp | ((input: string) => boolean);
    customPrefixPriority?: number;
    help?: string[];
    tags?: string[];
    owner?: boolean;
    admin?: boolean;
    botAdmin?: boolean;
    group?: boolean;
    private?: boolean;
    register?: boolean;
    limit?: number;
    money?: number;
    level?: number;
    feature?: PluginFeature;
    commandAccess?: PluginCommandAccess;
    executionPolicy?: ExecutionPolicy;
    interceptors?: PluginInterceptor[];
    manifest?: Readonly<PluginManifest>;
    before?: (m: BotMessage, ctx: BeforePluginContext) => Promise<boolean | void | unknown>;
    runBeforeOnCommand?: boolean;
    needsFullGroupSettings?: boolean;
    __hasBefore?: boolean;
    __name?: string;

    (m: BotMessage, ctx: PluginContext): Promise<unknown>;
}
