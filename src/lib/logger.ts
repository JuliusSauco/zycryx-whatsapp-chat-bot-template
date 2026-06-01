import chalk from "chalk";

interface LoggerConnection {
    user?: {
        id?: string;
        name?: string;
    };
}

const LogLevel = {
    ERROR: 0,
    COMMAND: 1,
    MESSAGE: 2
} as const;

const CURRENT_LOG_LEVEL: number = LogLevel.COMMAND;

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

function logError(error: unknown): void {
    console.error(chalk.bgRed.white.bold(" ERROR ") + " " + chalk.red(new Date().toISOString()), "\n", chalk.redBright(String(error)));
}

export {
    LogLevel,
    CURRENT_LOG_LEVEL,
    logCommand,
    logMessage,
    logError
};
