const ECONOMY_INFO_ARGUMENTS = new Set(['--info', 'help', 'ayuda']);

export function isEconomyInfoRequest(args: readonly string[]): boolean {
    return ECONOMY_INFO_ARGUMENTS.has(args[0]?.toLowerCase() ?? '');
}
