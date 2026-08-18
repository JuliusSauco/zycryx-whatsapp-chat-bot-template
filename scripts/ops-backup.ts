import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

type BackupStatus = 'ok' | 'skipped' | 'failed';

type BackupStep = {
  name: string;
  status: BackupStatus;
  detail: string;
};

const PROJECT_ROOT = process.cwd();
const DEFAULT_OUTPUT_DIR = 'backups';

function parseArgs(argv: string[]) {
  const options = {
    dbOnly: argv.includes('--db-only') || process.env.npm_config_db_only === 'true',
    sessionsOnly: argv.includes('--sessions-only') || process.env.npm_config_sessions_only === 'true',
    includeEnv: argv.includes('--include-env') || process.env.npm_config_include_env === 'true',
    outputDir: process.env.npm_config_output || DEFAULT_OUTPUT_DIR,
  };

  const outputIndex = argv.indexOf('--output');
  if (outputIndex >= 0 && argv[outputIndex + 1]) {
    options.outputDir = argv[outputIndex + 1];
  }

  if (options.dbOnly && options.sessionsOnly) {
    throw new Error('Usa solo una bandera: --db-only o --sessions-only.');
  }

  return options;
}

function loadEnv(): string | null {
  const envName = process.env.NODE_ENV || 'local';
  const candidates = [`.env.${envName}`, '.env'];

  for (const fileName of candidates) {
    const fullPath = path.join(PROJECT_ROOT, fileName);
    if (fs.existsSync(fullPath)) {
      dotenv.config({ path: fullPath, override: false, quiet: true });
      return fileName;
    }
  }

  return null;
}

function commandExists(command: string): boolean {
  try {
    if (process.platform === 'win32') {
      execFileSync('where', [command], { stdio: 'ignore' });
    } else {
      execFileSync('sh', ['-c', `command -v ${command}`], { stdio: 'ignore' });
    }
    return true;
  } catch {
    return false;
  }
}

function timestampSlug(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

function relativeOrAbsolute(targetPath: string): string {
  const relative = path.relative(PROJECT_ROOT, targetPath);
  return relative && !relative.startsWith('..') ? relative : targetPath;
}

function copyDirectoryIfExists(sourceRelativePath: string, backupDir: string, steps: BackupStep[]): void {
  const sourcePath = path.join(PROJECT_ROOT, sourceRelativePath);
  const destinationPath = path.join(backupDir, sourceRelativePath);

  if (!fs.existsSync(sourcePath)) {
    steps.push({
      name: sourceRelativePath,
      status: 'skipped',
      detail: 'No existe en este entorno.',
    });
    return;
  }

  try {
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.cpSync(sourcePath, destinationPath, { recursive: true, errorOnExist: false });
    steps.push({
      name: sourceRelativePath,
      status: 'ok',
      detail: `Copiado en ${relativeOrAbsolute(destinationPath)}.`,
    });
  } catch (error) {
    steps.push({
      name: sourceRelativePath,
      status: 'failed',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

function buildPgDumpArgs(backupDir: string): { args: string[]; env: NodeJS.ProcessEnv } | null {
  const databaseUrl = process.env.DATABASE_URL;
  const dbName = process.env.PGDATABASE || process.env.DB_NAME || process.env.POSTGRES_DB;
  const outputPath = path.join(backupDir, 'database.dump');
  const args = ['--format=custom', '--no-owner', '--no-privileges', '--file', outputPath];
  for (const schemaName of [
    'bot_identity', 'bot_economy', 'bot_groups', 'bot_runtime',
    'bot_content', 'bot_ai', 'bot_audit',
  ]) args.push('--schema', schemaName);

  if (databaseUrl) {
    args.push(databaseUrl);
    return { args, env: { ...process.env } };
  }

  if (!dbName) {
    return null;
  }

  const env = {
    ...process.env,
    PGHOST: process.env.PGHOST || process.env.DB_HOST || process.env.POSTGRES_HOST,
    PGPORT: process.env.PGPORT || process.env.DB_PORT || process.env.POSTGRES_PORT,
    PGUSER: process.env.PGUSER || process.env.DB_USER || process.env.POSTGRES_USER,
    PGPASSWORD: process.env.PGPASSWORD || process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD,
  };

  args.push(dbName);
  return { args, env };
}

function backupDatabase(backupDir: string, steps: BackupStep[]): void {
  if (!commandExists('pg_dump')) {
    steps.push({
      name: 'database',
      status: 'failed',
      detail: 'pg_dump no esta disponible en PATH.',
    });
    return;
  }

  const dumpConfig = buildPgDumpArgs(backupDir);
  if (!dumpConfig) {
    steps.push({
      name: 'database',
      status: 'skipped',
      detail: 'No se encontro DATABASE_URL ni nombre de base de datos.',
    });
    return;
  }

  try {
    execFileSync('pg_dump', dumpConfig.args, { env: dumpConfig.env, stdio: 'ignore' });
    steps.push({
      name: 'database',
      status: 'ok',
      detail: `Dump creado en ${relativeOrAbsolute(path.join(backupDir, 'database.dump'))}.`,
    });
  } catch (error) {
    steps.push({
      name: 'database',
      status: 'failed',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

function backupEnvFile(envFileName: string | null, backupDir: string, steps: BackupStep[]): void {
  if (!envFileName) {
    steps.push({
      name: 'env',
      status: 'skipped',
      detail: 'No se encontro archivo .env para copiar.',
    });
    return;
  }

  const sourcePath = path.join(PROJECT_ROOT, envFileName);
  const destinationPath = path.join(backupDir, 'env', envFileName);

  try {
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.copyFileSync(sourcePath, destinationPath);
    steps.push({
      name: 'env',
      status: 'ok',
      detail: `Copiado en ${relativeOrAbsolute(destinationPath)}.`,
    });
  } catch (error) {
    steps.push({
      name: 'env',
      status: 'failed',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const envFileName = loadEnv();
  const backupDir = path.resolve(PROJECT_ROOT, options.outputDir, timestampSlug());
  const steps: BackupStep[] = [];

  fs.mkdirSync(backupDir, { recursive: true });

  if (!options.sessionsOnly) {
    backupDatabase(backupDir, steps);
  }

  if (!options.dbOnly) {
    copyDirectoryIfExists('BotSession', backupDir, steps);
    copyDirectoryIfExists('jadibot', backupDir, steps);
    copyDirectoryIfExists(path.join('resources', 'media', 'audio', 'custom'), backupDir, steps);
  }

  if (options.includeEnv) {
    backupEnvFile(envFileName, backupDir, steps);
  } else {
    steps.push({
      name: 'env',
      status: 'skipped',
      detail: 'Omitido por seguridad. Usa --include-env si necesitas copiarlo.',
    });
  }

  const manifest = {
    createdAt: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV || 'local',
    envFile: envFileName,
    backupDir: relativeOrAbsolute(backupDir),
    steps,
  };

  fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const failed = steps.filter((step) => step.status === 'failed');
  const ok = steps.filter((step) => step.status === 'ok');
  const skipped = steps.filter((step) => step.status === 'skipped');

  console.log(`[backup] creado: ${relativeOrAbsolute(backupDir)}`);
  console.log(`[backup] ok=${ok.length} skipped=${skipped.length} failed=${failed.length}`);

  for (const step of steps) {
    const marker = step.status === 'ok' ? 'OK' : step.status === 'skipped' ? 'SKIP' : 'FAIL';
    console.log(`[${marker}] ${step.name}: ${step.detail}`);
  }

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
