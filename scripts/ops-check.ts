import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';

type Level = 'ok' | 'warn' | 'fail';

interface CheckResult {
    level: Level;
    label: string;
    detail: string;
}

const envName = process.env.NODE_ENV || 'local';
const envFile = `.env.${envName}`;
const envPath = path.resolve(process.cwd(), envFile);
const fallbackEnvPath = path.resolve(process.cwd(), '.env');
const loadedPath = fs.existsSync(envPath)
    ? envPath
    : fs.existsSync(fallbackEnvPath)
        ? fallbackEnvPath
        : null;

if (loadedPath) dotenv.config({path: loadedPath, override: false, quiet: true});

const checks: CheckResult[] = [];

function add(level: Level, label: string, detail: string): void {
    checks.push({level, label, detail});
}

function hasValue(name: string): boolean {
    return Boolean((process.env[name] || '').trim());
}

function commandExists(command: string): boolean {
    try {
        if (process.platform === 'win32') {
            execFileSync('where', [command], {stdio: 'ignore'});
        } else {
            execFileSync('sh', ['-c', `command -v ${command}`], {stdio: 'ignore'});
        }
        return true;
    } catch {
        return false;
    }
}

function anyCommandExists(commands: string[]): boolean {
    return commands.some(commandExists);
}

function checkNode(): void {
    const major = Number(process.versions.node.split('.')[0]);
    if (major >= 20) {
        add('ok', 'Node.js', `version ${process.version}`);
    } else if (major >= 18) {
        add('warn', 'Node.js', `version ${process.version}; recomendado 20 LTS o superior`);
    } else {
        add('fail', 'Node.js', `version ${process.version}; se requiere 18+`);
    }
}

function checkEnv(): void {
    if (loadedPath) {
        add('ok', 'Archivo env', `cargado ${path.relative(process.cwd(), loadedPath)}`);
    } else {
        add('warn', 'Archivo env', `no existe ${envFile} ni .env; se usaran variables del sistema`);
    }

    const source = process.env.DATA_SOURCE || 'local';
    if (source !== 'local') {
        add('warn', 'DATA_SOURCE', `${source}; el adapter estable es local`);
    } else {
        add('ok', 'DATA_SOURCE', 'local');
    }

    if (!hasValue('BOT_OWNER_NUMBERS')) {
        add('warn', 'BOT_OWNER_NUMBERS', 'sin owners normales configurados');
    } else {
        add('ok', 'BOT_OWNER_NUMBERS', 'configurado');
    }

    if (!hasValue('BOT_FIXED_OWNER_JIDS')) {
        add('warn', 'BOT_FIXED_OWNER_JIDS', 'sin rowners; comandos shell/eval no tendran operador fijo');
    } else {
        add('ok', 'BOT_FIXED_OWNER_JIDS', 'configurado; mantener esta lista minima');
    }
}

function checkDatabase(): void {
    if (hasValue('DATABASE_URL')) {
        add('ok', 'PostgreSQL', 'DATABASE_URL configurado');
        return;
    }

    const missing = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER'].filter(name => !hasValue(name));
    if (missing.length) {
        add('fail', 'PostgreSQL', `faltan variables: ${missing.join(', ')}`);
    } else {
        add('ok', 'PostgreSQL', `config individual para ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
    }

    if (!hasValue('DB_PASSWORD')) {
        add('warn', 'DB_PASSWORD', 'vacio; valido solo si PostgreSQL permite auth local sin password');
    }
}

function checkTools(): void {
    const gitAvailable = commandExists('git');
    add(gitAvailable ? 'ok' : 'warn', 'git', gitAvailable ? 'disponible; requerido por owner update y mantenimiento con git pull' : 'no encontrado; afecta owner update y despliegues con git pull');

    const ffmpegAvailable = commandExists('ffmpeg');
    add(ffmpegAvailable ? 'ok' : 'warn', 'ffmpeg', ffmpegAvailable ? 'disponible; requerido por stickers, audios, convertidores y reacciones GIF' : 'no encontrado; afecta stickers, audios, convertidores y reacciones GIF');

    const imageMagickCommands = process.platform === 'win32' ? ['magick'] : ['magick', 'convert'];
    const imageMagickAvailable = anyCommandExists(imageMagickCommands);
    add(
        imageMagickAvailable ? 'ok' : 'warn',
        'ImageMagick',
        imageMagickAvailable
            ? 'disponible; mejora conversiones PNG/WebP en stickers'
            : 'no encontrado; algunos stickers PNG/WebP pueden depender solo de ffmpeg o fallar',
    );

    const pythonAvailable = anyCommandExists(['python3', 'python']);
    const speedScriptExists = fs.existsSync(path.resolve(process.cwd(), 'speed.py'));
    if (pythonAvailable && speedScriptExists) {
        add('ok', 'python3/speed.py', 'disponible para speedtest');
    } else if (pythonAvailable) {
        add('warn', 'speed.py', 'python esta disponible, pero falta speed.py; afecta solo speedtest');
    } else {
        add('warn', 'python3', 'no encontrado; afecta solo speedtest');
    }

    const pgDumpAvailable = commandExists('pg_dump');
    add(pgDumpAvailable ? 'ok' : 'warn', 'pg_dump', pgDumpAvailable ? 'disponible; requerido por ops:backup de DB' : 'no encontrado; ops:backup no podra crear dump de PostgreSQL');

    const pgRestoreAvailable = commandExists('pg_restore');
    add(pgRestoreAvailable ? 'ok' : 'warn', 'pg_restore', pgRestoreAvailable ? 'disponible; requerido para restaurar database.dump' : 'no encontrado; restauracion de dumps requerira instalar cliente PostgreSQL');

    const createDbAvailable = commandExists('createdb');
    add(createDbAvailable ? 'ok' : 'warn', 'createdb', createDbAvailable ? 'disponible; util para crear bases durante restore' : 'no encontrado; solo afecta restaurar en una base nueva');
}

function checkRuntimeFiles(): void {
    const distIndex = path.resolve(process.cwd(), 'dist/core/index.js');
    add(fs.existsSync(distIndex) ? 'ok' : 'warn', 'Build', fs.existsSync(distIndex) ? 'dist/core/index.js existe' : 'no existe dist/core/index.js; ejecuta npm run build');

    const sessionDir = path.resolve(process.cwd(), 'BotSession');
    const creds = path.join(sessionDir, 'creds.json');
    if (fs.existsSync(creds)) {
        add('ok', 'Sesion principal', 'BotSession/creds.json existe');
    } else if (fs.existsSync(sessionDir)) {
        add('warn', 'Sesion principal', 'BotSession existe pero falta creds.json');
    } else {
        add('warn', 'Sesion principal', 'no vinculada aun; primer arranque sera interactivo');
    }

    const customAudioDir = path.resolve(process.cwd(), 'resources/media/audio/custom');
    add(fs.existsSync(customAudioDir) ? 'ok' : 'warn', 'Audios custom', fs.existsSync(customAudioDir) ? 'directorio existe' : 'directorio no existe; se creara al usar audios custom');
}

function printResults(): void {
    const icon: Record<Level, string> = {ok: 'OK', warn: 'WARN', fail: 'FAIL'};
    for (const result of checks) {
        console.log(`[${icon[result.level]}] ${result.label}: ${result.detail}`);
    }

    const failures = checks.filter(result => result.level === 'fail').length;
    const warnings = checks.filter(result => result.level === 'warn').length;
    console.log(`\nResumen: ${failures} error(es), ${warnings} advertencia(s).`);
    if (failures > 0) process.exitCode = 1;
}

checkNode();
checkEnv();
checkDatabase();
checkTools();
checkRuntimeFiles();
printResults();
