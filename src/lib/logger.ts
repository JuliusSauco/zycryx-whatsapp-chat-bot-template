import chalk from "chalk";
import type {WASocket} from "@whiskeysockets/baileys";

const LogLevel = {
    ERROR: 0,
    COMMAND: 1,
    MESSAGE: 2
} as const;

const CURRENT_LOG_LEVEL: number = LogLevel.COMMAND;

interface LogCommandParams {
    conn: WASocket;
    sender: string;
    chatId: string;
    isGroup: boolean;
    command: string;
    timestamp?: Date;
}

interface LogMessageParams {
    conn: WASocket;
    sender: string;
    chatId: string;
    isGroup: boolean;
    text: string;
    timestamp?: Date;
}

function formatBotLabel(conn: WASocket): string {
    const jidRaw = (conn as any)?.user?.id || "";
    const jidClean = jidRaw.replace(/:\d+/, "").split("@")[0];
    const name = (conn as any)?.user?.name?.trim() || jidClean;
    const isSubbot = globalThis.conns?.some((c: any) => c.user?.id === (conn as any)?.user?.id);
    const label = `${chalk.yellowBright("+" + jidClean)} ${chalk.cyanBright("-")} ${chalk.bold(name)}${isSubbot ? chalk.magenta(" (sub bot)") : ""}`;
    return label;
}

function logCommand({conn, timestamp, sender, chatId, isGroup, command}: LogCommandParams): void {
    if (CURRENT_LOG_LEVEL < LogLevel.COMMAND) return;
    const ts = new Date(timestamp || Date.now()).toLocaleString("es-AR");
    const botLabel = formatBotLabel(conn);

    console.log(
        chalk.bgBlue.white.bold(" [ CMD ] ") + " " + chalk.gray(botLabel) + "\n" +
        chalk.green("From: ") + sender + "\n" +
        chalk.green("Chat: ") + `${isGroup ? "Grupo" : "Privado"}` + "\n" +
        chalk.green("Comando: ") + `${chalk.whiteBright(command)}\n`
    );
}

function logMessage({conn, timestamp, sender, chatId, isGroup, text}: LogMessageParams): void {
    if (CURRENT_LOG_LEVEL < LogLevel.MESSAGE) return;
    const ts = new Date(timestamp || Date.now()).toLocaleString("es-AR");
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
