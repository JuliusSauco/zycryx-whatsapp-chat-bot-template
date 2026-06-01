import chalk from "chalk";

interface LoggerConnection {
    user?: {
        id?: string;
        name?: string;
    };
}

const LOG_LEVELS = ['error', 'warn', 'info', 'command', 'debug', 'trace'] as const;
export type LogLevelName = typeof LOG_LEVELS[number];

const LogLevel = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    COMMAND: 3,
    DEBUG: 4,
    TRACE: 5,
    MESSAGE: 5,
} as const;

const LOG_LEVEL_VALUES: Record<LogLevelName, number> = {
    error: LogLevel.ERROR,
    warn: LogLevel.WARN,
    info: LogLevel.INFO,
    command: LogLevel.COMMAND,
    debug: LogLevel.DEBUG,
    trace: LogLevel.TRACE,
};

function getConfiguredLogLevel(): LogLevelName {
    const value = (process.env.LOG_LEVEL || 'command').toLowerCase();
    return LOG_LEVELS.includes(value as LogLevelName) ? value as LogLevelName : 'command';
}

const CURRENT_LOG_LEVEL: number = LOG_LEVEL_VALUES[getConfiguredLogLevel()];

interface LogCommandParams {
    conn: LoggerConnection;
    sender: string;
    chatId: string;
    isGroup: boolean;
    command: string;
    timestamp?: Date;
}

interface LogMessageParams {
    conn: LoggerConnection;
    sender: string;
    chatId: string;
    isGroup: boolean;
    text: string;
    timestamp?: Date;
}

function formatBotLabel(conn: LoggerConnection): string {
    const jidRaw = conn.user?.id || "";
    const jidClean = jidRaw.replace(/:\d+/, "").split("@")[0];
    const name = conn.user?.name?.trim() || jidClean;
    const isSubbot = globalThis.conns?.some((c) => c.user?.id === conn.user?.id);
    const label = `${chalk.yellowBright("+" + jidClean)} ${chalk.cyanBright("-")} ${chalk.bold(name)}${isSubbot ? chalk.magenta(" (sub bot)") : ""}`;
    return label;
}

function logCommand({conn, sender, isGroup, command}: LogCommandParams): void {
    if (CURRENT_LOG_LEVEL < LogLevel.COMMAND) return;
    const botLabel = formatBotLabel(conn);

    console.log(
        chalk.bgBlue.white.bold(" [ CMD ] ") + " " + chalk.gray(botLabel) + "\n" +
        chalk.green("From: ") + sender + "\n" +
        chalk.green("Chat: ") + `${isGroup ? "Grupo" : "Privado"}` + "\n" +
        chalk.green("Comando: ") + `${chalk.whiteBright(command)}\n`
    );
}

function logMessage({conn, sender, isGroup, text}: LogMessageParams): void {
    if (CURRENT_LOG_LEVEL < LogLevel.MESSAGE) return;
    const botLabel = formatBotLabel(conn);

    console.log(
        chalk.bgGray.white.bold(" [ MSG ] ") + " " + chalk.gray(botLabel) + "\n" +
        chalk.green("From: ") + sender + "\n" +
        chalk.green("Chat: ") + `${isGroup ? "Grupo" : "Privado"}` + "\n" +
        chalk.green("Mensaje: ") + `${chalk.white(text)}\n`
    );
}

function shouldLog(level: keyof typeof LogLevel): boolean {
    return CURRENT_LOG_LEVEL >= LogLevel[level];
}

function formatDetails(details: unknown[]): unknown[] {
    return details.length ? details : [];
}

function logError(message: unknown, ...details: unknown[]): void {
    if (!shouldLog('ERROR')) return;
    console.error(chalk.bgRed.white.bold(" ERROR ") + " " + chalk.red(new Date().toISOString()), "\n", chalk.redBright(String(message)), ...formatDetails(details));
}

function logWarn(message: unknown, ...details: unknown[]): void {
    if (!shouldLog('WARN')) return;
    console.warn(chalk.yellow(String(message)), ...formatDetails(details));
}

function logInfo(message: unknown, ...details: unknown[]): void {
    if (!shouldLog('INFO')) return;
    console.log(String(message), ...formatDetails(details));
}

function logDebug(message: unknown, ...details: unknown[]): void {
    if (!shouldLog('DEBUG')) return;
    console.log(chalk.gray(String(message)), ...formatDetails(details));
}

function logTrace(message: unknown, ...details: unknown[]): void {
    if (!shouldLog('TRACE')) return;
    console.log(chalk.gray(String(message)), ...formatDetails(details));
}

export {
    LogLevel,
    CURRENT_LOG_LEVEL,
    logCommand,
    logMessage,
    logError,
    logWarn,
    logInfo,
    logDebug,
    logTrace,
    shouldLog,
};
