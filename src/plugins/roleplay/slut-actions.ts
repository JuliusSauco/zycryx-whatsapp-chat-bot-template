import {loadCachedJsonResource} from '../../lib/local-json-resource.js';
import {pickRandom} from '../../utils/random.js';

export interface SlutReactionResource {
    help: string;
    commands: string[];
    folder: string;
    nsfwFolder?: string;
    caption: string;
    nsfwCaption?: string;
    adult?: boolean;
}

interface SlutResponse {
    id: string;
    text: string;
    nsfwText?: string;
}

interface SlutResponseAction {
    displayName: string;
    responses: SlutResponse[];
}

interface SlutResponseResource {
    schemaVersion: number;
    role: string;
    actions: Record<string, SlutResponseAction>;
}

export interface ResolvedSlutAction {
    code: string;
    command: string;
    displayName: string;
    reaction: SlutReactionResource;
    responses: SlutResponse[];
}

const REACTIONS_PATH = 'resources/data/reactions.json';
const RESPONSES_PATH = 'resources/data/roleplay/slut-responses.json';

let cachedAliasMap: Map<string, ResolvedSlutAction> | null = null;

function loadCatalog(): Map<string, ResolvedSlutAction> {
    if (cachedAliasMap) return cachedAliasMap;
    const reactions = loadCachedJsonResource<Record<string, SlutReactionResource>>(REACTIONS_PATH);
    const responseResource = loadCachedJsonResource<SlutResponseResource>(RESPONSES_PATH);
    if (!reactions || !responseResource || responseResource.role !== 'slut' || responseResource.schemaVersion !== 1) {
        throw new Error('El catálogo narrativo del rol slut no está disponible o es inválido');
    }
    const reactionCodes = Object.keys(reactions).sort();
    const responseCodes = Object.keys(responseResource.actions).sort();
    if (reactionCodes.join('\0') !== responseCodes.join('\0')) {
        throw new Error('Las acciones de slut-responses.json no coinciden con reactions.json');
    }
    const ids = new Set<string>();
    const aliases = new Map<string, ResolvedSlutAction>();
    for (const [code, reaction] of Object.entries(reactions)) {
        const responseAction = responseResource.actions[code];
        if (!responseAction || responseAction.responses.length !== 10) {
            throw new Error(`La acción ${code} debe contener exactamente 10 respuestas`);
        }
        for (const response of responseAction.responses) {
            if (!response.id || !response.text.trim() || ids.has(response.id)) {
                throw new Error(`Respuesta inválida o duplicada en la acción ${code}`);
            }
            ids.add(response.id);
        }
        for (const command of reaction.commands) {
            aliases.set(command.toLowerCase(), {
                code,
                command: command.toLowerCase(),
                displayName: responseAction.displayName,
                reaction,
                responses: responseAction.responses,
            });
        }
    }
    cachedAliasMap = aliases;
    return aliases;
}

export function resolveSlutAction(command: string): ResolvedSlutAction | null {
    return loadCatalog().get(command.toLowerCase()) ?? null;
}

export function listSlutActions(): ResolvedSlutAction[] {
    const unique = new Map<string, ResolvedSlutAction>();
    for (const action of loadCatalog().values()) unique.set(action.code, action);
    return [...unique.values()];
}

export function pickSlutResponse(action: ResolvedSlutAction, nsfwEnabled: boolean, previousId?: string): {id: string; text: string} {
    const candidates = action.responses.filter(response => response.id !== previousId);
    const selected = pickRandom(candidates.length ? candidates : action.responses);
    return {id: selected.id, text: nsfwEnabled && selected.nsfwText ? selected.nsfwText : selected.text};
}
