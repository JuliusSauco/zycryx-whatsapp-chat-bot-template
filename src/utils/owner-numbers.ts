export function mergeOwnerNumbers(currentValue: string, legacyValue: string): string[][] {
    const values = `${currentValue},${legacyValue}`
        .split(',')
        .map(value => value.trim().split('@')[0].split(':')[0].replace(/[^0-9]/g, ''))
        .filter(Boolean);

    return [...new Set(values)].map(value => [value]);
}
