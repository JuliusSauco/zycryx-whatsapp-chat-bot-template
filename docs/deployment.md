# Despliegue en servidor

Guia operativa para correr el bot en produccion (VPS Linux o Windows). Fecha de referencia: 2026-06-10.

## Requisitos del servidor

- Node.js 18+ (recomendado 20 LTS o superior).
- PostgreSQL 14+ accesible desde el servidor.
- FFmpeg en el PATH (stickers, conversiones, audios).
- git (lo usa el comando owner `update` / `git pull`).
- Python 3 con el alias `python3` (opcional, solo para el comando `speedtest`).
- Un process manager: **obligatorio**, no opcional. El bot se reinicia solo cada 3 horas con `process.exit(0)` y tambien sale con codigo 1 si detecta loops de sesion; sin supervisor, el proceso queda muerto.
- ~512 MB de RAM para el proceso Node (`serve` ya usa `--max-old-space-size=512`).

## Primer despliegue

```bash
git clone <url-del-repositorio>
cd zycryx-whatsapp-chat-bot-template
npm install
cp .env.example .env.prod        # completar valores reales
npm run build
npm run db:migrate               # con NODE_ENV=prod si la DB depende del env
```

Nota: `npm install` ejecuta `postinstall: tsc`, por lo que el build inicial ocurre durante la instalacion. Si solo quieres instalar dependencias usa `npm install --ignore-scripts` y compila despues con `npm run build`.

### Vinculacion inicial

La primera ejecucion es interactiva (pide QR o codigo por consola), asi que hazla en una terminal real (o `tmux`/`screen`), no bajo el process manager:

```bash
npm run serve   # NODE_ENV=prod
```

Cuando la sesion quede guardada en `BotSession/`, detén el proceso y arranca bajo el supervisor.

## PM2 (recomendado)

```bash
npm install -g pm2
pm2 start dist/core/index.js --name zycryx-bot \
  --node-args="--max-old-space-size=512" \
  --env NODE_ENV=prod
pm2 save
pm2 startup   # arranque automatico del sistema
```

Claves:

- `autorestart` (default de PM2) cubre el `process.exit(0)` periodico del bot.
- Logs: `pm2 logs zycryx-bot`. Considera `pm2 install pm2-logrotate` porque el bot loguea bastante en niveles altos.
- Variables: PM2 no lee `.env.prod` por si mismo; el bot la carga solo segun `NODE_ENV`. Basta con exportar `NODE_ENV=prod`.

Equivalente con systemd: unit con `Restart=always`, `Environment=NODE_ENV=prod` y `ExecStart=/usr/bin/node --max-old-space-size=512 dist/core/index.js` desde el directorio del repo.

## Actualizar version

```bash
git pull
npm install
npm run build
npm run db:migrate    # solo si hay migraciones nuevas
pm2 restart zycryx-bot
```

Las migraciones nunca corren automaticamente al arrancar; ejecutalas siempre como paso explicito y controlado.

## Backups

Que respaldar y con que frecuencia:

| Que | Donde | Frecuencia | Nota |
|---|---|---|---|
| Base de datos | `pg_dump zycryx_bot` | Diario | Contiene usuarios, settings, RPG, warns, roles, audios dinamicos. |
| Sesion principal | `BotSession/` | Tras vincular y ante cambios importantes | Copiar con el bot detenido. Tratar como secreto. |
| Sesiones subbots | `jadibot/` | Opcional | Los duenos pueden re-vincular si se pierden. |
| Audios custom | `resources/media/audio/custom/` | Semanal | Archivos subidos con `addaudios`. |
| Config | `.env.prod` | Ante cambios | Guardar en gestor de secretos, no en el repo. |

Restaurar sesion: detener bot, restaurar carpeta `BotSession/`, arrancar. Si WhatsApp invalido la sesion (codigo 401/440), no sirve restaurar: hay que borrar `BotSession/` y re-vincular.

## Operacion

- **Salud**: el bot loguea `CONECTADO CORRECTAMENTE` al abrir conexion y `[PERF]` cuando el pipeline supera `PERF_LOG_THRESHOLD_MS`.
- **Espacio en disco**: `tmp/` se limpia solo (archivos >3 min). `BotSession/` y `jadibot/` recortan pre-keys automaticamente cada 10 min.
- **Reinicio manual**: comando owner `restart` (requiere process manager) o `pm2 restart zycryx-bot`.
- **Sesion invalida en logs** (`Sesión inválida (código 401/403/500)`): el bot deja de reintentar por si solo. Detener proceso, borrar `BotSession/`, re-vincular.
- **Multiples replicas**: NO soportado. El estado de juegos, cooldowns y locks vive en memoria del proceso y la sesion de WhatsApp es por dispositivo. Una instancia por numero.

## Checklist de seguridad en produccion

- `.env.prod` con permisos restrictivos (`chmod 600`) y fuera del repo.
- `BOT_FIXED_OWNER_JIDS` minimo: esos numeros pueden ejecutar codigo y shell en el servidor (`owner-exec`, `owner-exec2`).
- Usuario de sistema dedicado sin sudo para correr el bot.
- PostgreSQL sin exposicion publica (bind local o firewall) y usuario con permisos solo sobre la base del bot.
- Revisar logs `[SENSITIVE]` periodicamente: registran cada uso de eval/shell/update con sender y comando.
- Mantener `npm audit` bajo control; varias dependencias de scraping/descargas son inestables por naturaleza.
