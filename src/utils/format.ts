export function formatThousandsDot(num: number): string {
    return num.toLocaleString('en').replace(/,/g, '.');
}

export function formatShortThousands(num: number): string {
    return (num / 1000).toFixed(1) + 'k';
}

export function formatCompactNumber(num: number): string {
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'k';
    return num.toString();
}
