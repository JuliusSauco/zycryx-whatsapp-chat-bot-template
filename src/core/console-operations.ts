import type {SyncedDataResetResult} from '../ports/repositories.js';

export type ConsoleOperationAction = 'clear-data' | 'stop-bot' | 'restart-bot' | 'delete-session';
export type ConsoleOperationPhase = 'idle' | 'running' | 'success' | 'error';

export interface ConsoleOperationResult {
    message: string;
    mainStopped: boolean;
    reset?: SyncedDataResetResult;
}

export interface ConsoleOperationState {
    phase: ConsoleOperationPhase;
    action: ConsoleOperationAction | null;
    message: string;
    mainStopped: boolean;
    reset: SyncedDataResetResult | null;
    updatedAt: string;
}

type ConsoleOperationHandler = (action: ConsoleOperationAction) => Promise<ConsoleOperationResult>;

let handler: ConsoleOperationHandler | null = null;
let operation: Promise<ConsoleOperationResult> | null = null;
let state: ConsoleOperationState = createState();

export function registerConsoleOperationHandler(nextHandler: ConsoleOperationHandler): void {
    handler = nextHandler;
}

export function getConsoleOperationState(): ConsoleOperationState {
    return {...state, reset: state.reset ? {...state.reset} : null};
}

export function setConsoleMainStopped(mainStopped: boolean): void {
    state = {...state, mainStopped, updatedAt: new Date().toISOString()};
}

export async function runConsoleOperation(action: ConsoleOperationAction): Promise<ConsoleOperationResult> {
    if (!handler) throw new Error('Los controles operativos todavía no están disponibles.');
    if (operation) throw new Error('Ya hay una operación administrativa en curso.');
    state = {
        ...state,
        phase: 'running',
        action,
        message: 'Operación en curso…',
        reset: null,
        updatedAt: new Date().toISOString(),
    };
    operation = handler(action);
    try {
        const result = await operation;
        state = {
            phase: 'success',
            action,
            message: result.message,
            mainStopped: result.mainStopped,
            reset: result.reset ? {...result.reset} : null,
            updatedAt: new Date().toISOString(),
        };
        return result;
    } catch (error) {
        state = {
            ...state,
            phase: 'error',
            action,
            message: error instanceof Error ? error.message : String(error),
            updatedAt: new Date().toISOString(),
        };
        throw error;
    } finally {
        operation = null;
    }
}

function createState(): ConsoleOperationState {
    return {
        phase: 'idle',
        action: null,
        message: 'Sin operaciones pendientes.',
        mainStopped: false,
        reset: null,
        updatedAt: new Date().toISOString(),
    };
}
