export type MainLinkMethod = 'qr' | 'code';
export type MainLinkPhase = 'idle' | 'preparing' | 'awaiting' | 'connected' | 'error';

export interface MainLinkRequest {
    method: MainLinkMethod;
    phone: string | null;
    replaceSession: boolean;
}

export interface MainLinkState {
    phase: MainLinkPhase;
    method: MainLinkMethod | null;
    phone: string | null;
    pairingCode: string | null;
    qrDataUrl: string | null;
    linkedNumber: string | null;
    message: string;
    updatedAt: string;
}

type MainLinkStarter = (request: MainLinkRequest) => Promise<void>;

let starter: MainLinkStarter | null = null;
let operation: Promise<void> | null = null;
let state: MainLinkState = createState({
    phase: 'idle',
    message: 'Elige cómo quieres vincular la sesión principal.',
});

export function registerMainLinkStarter(nextStarter: MainLinkStarter): void {
    starter = nextStarter;
}

export function getMainLinkState(): MainLinkState {
    return {...state};
}

export function updateMainLinkState(update: Partial<Omit<MainLinkState, 'updatedAt'>>): void {
    state = {...state, ...update, updatedAt: new Date().toISOString()};
}

export function resetMainLinkState(message = 'Elige cómo quieres vincular la sesión principal.'): void {
    state = createState({phase: 'idle', message});
}

export async function startMainLink(request: MainLinkRequest): Promise<void> {
    if (!starter) throw new Error('El controlador de vinculación todavía no está disponible.');
    if (operation) throw new Error('Ya hay una operación de vinculación en curso.');
    operation = starter(request);
    try {
        await operation;
    } finally {
        operation = null;
    }
}

function createState(input: Pick<MainLinkState, 'phase' | 'message'>): MainLinkState {
    return {
        ...input,
        method: null,
        phone: null,
        pairingCode: null,
        qrDataUrl: null,
        linkedNumber: null,
        updatedAt: new Date().toISOString(),
    };
}
