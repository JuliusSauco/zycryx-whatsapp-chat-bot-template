# Despliegue en servidor

Guia operativa para correr el bot en produccion (VPS Linux o Windows). Fecha de referencia: 2026-07-29.

## Requisitos del servidor

- Node.js 24 LTS (usar siempre el parche 24.x mas reciente).
- PostgreSQL 18+ accesible desde el servidor (incluido un proyecto Supabase con PG18).
- Cliente PostgreSQL en PATH (`pg_dump`, `pg_restore`, `createdb`) para backups y recuperacion.
- FFmpeg en el PATH (stickers, conversiones, audios).
- git (para despliegues y actualizaciones administrativas con `git pull`).
- Python 3 con el alias `python3` (opcional, solo para el comando `speedtest`).
- Un process manager es recomendado para reinicio ante fallos no recuperables y arranque del servidor.
- ~512 MB de RAM para el proceso Node (`serve` ya usa `--max-old-space-size=512`).

## Primer despliegue

```bash
git clone <url-del-repositorio>
cd zycryx-whatsapp-chat-bot-template
nvm install 24
nvm use 24
node --version # debe mostrar v24.x
npm ci
cp .env.example .env.prod        # completar valores reales
# generar BOT_SECRETS_MASTER_KEY_B64 y guardarla en el gestor de secretos
npm run build
npm run ops:check
NODE_ENV=prod npm run db:setup   # una sola vez sobre una base vacia
NODE_ENV=prod npm run db:setup-runtime-role # con DB_ADMIN_URL sólo durante este paso
```

Después, configura `DATABASE_URL` con el rol runtime creado y retira `DB_ADMIN_URL` del entorno del proceso. Vuelve a ejecutar `db:setup-runtime-role` si provisionas nuevamente el modelo para aplicar grants y políticas RLS.

`npm ci` usa exactamente `package-lock.json`. El typecheck/build es un paso explícito para que una instalación de producción con devDependencies omitidas no dependa de `tsc`. `engine-strict=true` rechaza Node fuera de la rama 24.x o npm fuera de la rama 11.x.

### Vinculacion inicial

La primera ejecucion es interactiva (pide QR o codigo por consola), asi que hazla en una terminal real (o `tmux`/`screen`), no bajo el process manager:

```bash
npm run serve   # NODE_ENV=prod
```

Con `BAILEYS_AUTH_STATE_SOURCE=database`, la sesión queda cifrada en `bot_sessions`; detén el proceso cuando la conexión abra y arranca bajo el supervisor. Una carpeta `BotSession/` existente se importa automáticamente la primera vez y se conserva como respaldo.

## PM2 (recomendado)

Con la plantilla incluida:

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Comando equivalente manual:

```bash
npm install -g pm2
pm2 start dist/core/index.js --name zycryx-bot \
  --node-args="--max-old-space-size=512" \
  --env NODE_ENV=prod
pm2 save
pm2 startup   # arranque automatico del sistema
```

Claves:

- La plantilla PM2 ejecuta `npm run serve:checked`: valida PostgreSQL 18 y los nueve schemas antes de iniciar, sin modificar estructura.
- `autorestart` (default de PM2) recupera fallos no controlados; las reconexiones normales usan backoff dentro del proceso.
- Logs: `pm2 logs zycryx-bot`. Considera `pm2 install pm2-logrotate` porque el bot loguea bastante en niveles altos.
- Variables: PM2 no lee `.env.prod` por si mismo; el bot la carga solo segun `NODE_ENV`. Basta con exportar `NODE_ENV=prod`.
- La plantilla `ecosystem.config.cjs` fija `instances: 1`; no escales horizontalmente el mismo numero de WhatsApp.

Equivalente con systemd: unit con `Restart=always`, `Environment=NODE_ENV=prod` y `ExecStart=/usr/bin/node --max-old-space-size=512 dist/core/index.js` desde el directorio del repo.

## Actualizar version

```bash
git pull
npm ci
npm run build
NODE_ENV=prod npm run db:setup-runtime-role
NODE_ENV=prod npm run ops:check
pm2 restart zycryx-bot
```

Con `ecosystem.config.cjs`, `pm2 restart` valida el modelo antes de levantar el bot. El arranque no modifica la estructura de la base.

## Preflight operativo

El comando `npm run ops:check` revisa prerequisitos locales sin iniciar el bot: version de Node, archivo `.env`, owners, configuracion de PostgreSQL, herramientas externas, build y sesion principal.

Usalo antes de dejar un servidor en produccion y despues de cambios en `.env.prod`, estructura de base o actualizaciones del sistema. Ver tambien `docs/operations-runbook.md` y `docs/operational-dependencies.md`.

## Backups

El camino recomendado es usar el script operativo:

```bash
NODE_ENV=prod npm run ops:backup
```

Esto crea una carpeta local en `backups/<fecha>/` con:

- `database.dump` en formato custom de PostgreSQL, si `pg_dump` esta disponible y existe configuracion de DB.
- `BotSession/` y `jadibot/` si aún existen sesiones legacy en archivos.
- `resources/media/audio/custom/`.
- `manifest.json` con lo que se copio, omitio o fallo.

Por seguridad, el script no copia `.env.prod` por defecto. Si necesitas incluirlo en un respaldo offline y cifrado:

```bash
NODE_ENV=prod npm run ops:backup -- --include-env
```

Opciones utiles:

```bash
NODE_ENV=prod npm run ops:backup:db
NODE_ENV=prod npm run ops:backup:sessions
npx tsx scripts/ops-backup.ts --output /var/backups/zycryx
```

Que respaldar y con que frecuencia:

| Que | Donde | Frecuencia | Nota |
|---|---|---|---|
| Base de datos | `npm run ops:backup` o `pg_dump` | Diario | Incluye sesiones y secretos cifrados; sin la clave externa el dump no basta para recuperarlos. |
| Clave maestra/keyring | Gestor de secretos externo | Tras cada rotación | Respaldar separado de PostgreSQL y con acceso restringido. |
| Sesiones legacy | `BotSession/`, `jadibot/` | Sólo durante migración | Compatibilidad temporal; tratar como secreto. |
| Audios custom | `resources/media/audio/custom/` | Semanal | Archivos subidos con `addaudios`. |
| Config | `.env.prod` | Ante cambios | Guardar en gestor de secretos, no en el repo. |

Backup manual equivalente de la DB:

```bash
pg_dump --format=custom --no-owner --no-privileges \
  --file backups/manual/database.dump "$DATABASE_URL"
```

Si usas variables separadas:

```bash
PGPASSWORD="$DB_PASSWORD" pg_dump --host "$DB_HOST" --port "$DB_PORT" \
  --username "$DB_USER" --dbname "$DB_NAME" \
  --format=custom --no-owner --no-privileges \
  --file backups/manual/database.dump
```

Restaurar DB:

```bash
pm2 stop zycryx-bot
createdb "$DB_NAME"   # solo si la base no existe
pg_restore --clean --if-exists --dbname "$DATABASE_URL" backups/<fecha>/database.dump
NODE_ENV=prod npm run db:check
NODE_ENV=prod npm run ops:check
pm2 start zycryx-bot
```

Restaurar una sesión persistida en base de datos:

```bash
pm2 stop zycryx-bot
# restaurar database.dump y reinyectar la misma clave/keyring externa
NODE_ENV=prod npm run db:check
pm2 restart zycryx-bot
```

Si WhatsApp invalidó la sesión (401/403/500), restaurar una copia antigua no ayuda: elimina la sesión revocada mediante el flujo administrativo y vuelve a vincular.

## Operacion

- **Salud**: el bot loguea `CONECTADO CORRECTAMENTE` al abrir conexion y `[PERF]` cuando el pipeline supera `PERF_LOG_THRESHOLD_MS`.
- **Espacio en disco**: `tmp/` se limpia solo. En modo `files`, las carpetas legacy recortan pre-keys; en modo `database`, Signal keys viven normalizadas en PostgreSQL.
- **Reinicio manual**: comando owner `restart` (requiere process manager) o `pm2 restart zycryx-bot`.
- **Sesion invalida en logs** (`Sesión inválida (código 401/403/500)`): el bot revoca el estado activo y deja de reintentar; vuelve a vincular.
- **Multiples replicas**: una sesión concreta sólo puede ser tomada por un proceso gracias al lease de DB. Juegos, cooldowns y locks siguen siendo locales: no uses varias réplicas activas para repartir mensajes del mismo número.
- **Preflight**: `NODE_ENV=prod npm run ops:check` para revisar prerequisitos antes de reiniciar.

## Checklist de seguridad en produccion

- `.env.prod` con permisos restrictivos (`chmod 600`) y fuera del repo.
- `BOT_OWNER_NUMBERS` limitado a operadores de confianza y revisado en cada despliegue.
- Usuario de sistema dedicado sin sudo para correr el bot.
- PostgreSQL sin exposicion publica (bind local o firewall) y usuario con permisos solo sobre la base del bot.
- Clave maestra/keyring almacenada fuera de PostgreSQL, con backup separado y rotación controlada.
- Revisar logs `[SENSITIVE]` periodicamente: registran cada uso de eval/shell/update con sender y comando.
- Mantener `npm audit` bajo control; varias dependencias de scraping/descargas son inestables por naturaleza.
