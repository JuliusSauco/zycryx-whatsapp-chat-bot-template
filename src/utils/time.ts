export function formatDurationHoursMinutesShort(duration: number): string {
    const totalSeconds = Math.floor(Math.max(0, duration) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}min`;
}

export function formatDurationClockWords(duration: number): string {
    const minutes = Math.floor((duration / 1000 / 60) % 60);
    const hours = Math.floor((duration / 1000 / 60 / 60) % 24);
    return `${hours.toString().padStart(2, '0')} Hora(s) ${minutes.toString().padStart(2, '0')} Minuto(s)`;
}

export function formatDurationHoursMinutes(duration: number): string {
    const totalMinutes = Math.floor(duration / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours} Horas ${minutes} Minutos`;
}

export function formatDurationMinutesSeconds(duration: number): string {
    const totalSeconds = Math.floor(duration / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes} minutos ${seconds} segundos`;
}

export function formatDurationMinuteSecondsParen(duration: number): string {
    const totalSeconds = Math.floor(Math.max(0, duration) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes} minuto(s) ${seconds} segundo(s)`;
}

export function formatDurationCompact(duration: number): string {
    const seconds = Math.floor(duration / 1000) % 60;
    const minutes = Math.floor(duration / (1000 * 60)) % 60;
    return `${minutes ? `${minutes}m ` : ''}${seconds}s`;
}

export function formatDurationPaddedMinutesSeconds(duration: number): string {
    const seconds = Math.floor((duration / 1000) % 60);
    const minutes = Math.floor((duration / (1000 * 60)) % 60);
    const minutesText = minutes < 10 ? `0${minutes}` : String(minutes);
    const secondsText = seconds < 10 ? `0${seconds}` : String(seconds);
    return `${minutesText} min ${secondsText} seg`;
}
