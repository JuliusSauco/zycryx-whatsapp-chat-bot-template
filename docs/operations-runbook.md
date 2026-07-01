# Runbook operativo

Guia corta para operar el bot en produccion. Complementa `docs/deployment.md` y `docs/troubleshooting.md`.

## Preflight

Antes de desplegar, actualizar o investigar un incidente:

```bash
NODE_ENV=prod npm run ops:check
```

El chequeo valida Node.js, archivo `.env`, owners, PostgreSQL, herramientas del sistema, build y sesion principal. Las advertencias no bloquean siempre: algunas solo degradan una funcionalidad concreta, como stickers, backups de DB o `speedtest`. Revisa el detalle antes de dejar el bot sin supervision.

## Operacion diaria

- Revisar salud del proceso: `pm2 status zycryx-bot`.
- Revisar logs recientes: `pm2 logs zycryx-bot --lines 100`.
- Buscar comandos sensibles: `grep "[SENSITIVE]" ~/.pm2/logs/zycryx-bot-out.log ~/.pm2/logs/zycryx-bot-error.log`.
- Vigilar disco: sesiones, logs y backups son los candidatos habituales.
- Ejecutar backup operativo: `NODE_ENV=prod npm run ops:backup`.
- Revisar el `manifest.json` del backup y copiarlo a almacenamiento externo cifrado.

## Actualizacion segura

1. Avisar a owners si habra reinicio.
2. Ejecutar `git pull`.
3. Ejecutar `npm install`.
4. Ejecutar `npm run build`.
5. Ejecutar `npm run db:migrate` si hay migraciones nuevas.
6. Ejecutar `NODE_ENV=prod npm run ops:check`.
7. Reiniciar: `pm2 restart zycryx-bot`.
8. Confirmar conexion en logs.

Si `ops:check` falla, no reiniciar hasta corregir el error. Si solo hay advertencias, decidir segun impacto.

## PM2

Arranque recomendado:

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

La plantilla usa una sola instancia, `NODE_ENV=prod`, `--max-old-space-size=512` y reinicio automatico. No cambies `instances` a mas de 1 para el mismo numero de WhatsApp.

## Incidentes comunes

### Bot apagado

1. `pm2 status zycryx-bot`.
2. `pm2 logs zycryx-bot --lines 200`.
3. Si el proceso esta detenido, ejecutar `pm2 restart zycryx-bot`.
4. Si vuelve a caer, revisar errores de sesion, DB o build.

### Sesion principal invalida

Indicadores: logs con `Sesión inválida` o codigos `401`, `403`, `500`.

1. Detener proceso.
2. Respaldar la carpeta actual si hace falta diagnostico.
3. Borrar `BotSession/`.
4. Arrancar en terminal interactiva para vincular.
5. Volver a PM2.

### DB inaccesible

1. Verificar `.env.prod` o variables del sistema.
2. Probar conexion PostgreSQL desde el servidor.
3. Ejecutar `NODE_ENV=prod npm run ops:check`.
4. Si faltan tablas, ejecutar `npm run db:migrate`.

### Descargas o APIs externas fallan

- Confirmar que el bot responde a comandos simples.
- Revisar rate limits o errores de provider en logs `LOG_LEVEL=debug`.
- Validar claves opcionales en `.env.prod`.
- No reiniciar por defecto: muchas APIs publicas fallan de forma temporal.

## Recuperacion

### Crear backup manual

```bash
NODE_ENV=prod npm run ops:backup
```

Para separar responsabilidades:

```bash
NODE_ENV=prod npm run ops:backup:db
NODE_ENV=prod npm run ops:backup:sessions
```

No copies `.env.prod` en backups comunes. Si realmente necesitas incluirlo, usa `--include-env` y guarda el resultado cifrado.

### Restaurar DB

1. Detener bot: `pm2 stop zycryx-bot`.
2. Restaurar dump:

```bash
pg_restore --clean --if-exists --dbname "$DATABASE_URL" backups/<fecha>/database.dump
```

3. Ejecutar migraciones pendientes: `NODE_ENV=prod npm run db:migrate`.
4. Validar entorno: `NODE_ENV=prod npm run ops:check`.
5. Arrancar bot: `pm2 start zycryx-bot`.

Si no usas `DATABASE_URL`, exporta `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD` y usa `--dbname "$DB_NAME"`.

### Restaurar sesion

1. Detener bot: `pm2 stop zycryx-bot`.
2. Restaurar carpeta principal:

```bash
cp -a backups/<fecha>/BotSession ./BotSession
chmod -R 700 BotSession
```

3. Restaurar subbots si aplica:

```bash
cp -a backups/<fecha>/jadibot ./jadibot
chmod -R 700 jadibot
```

4. Arrancar bot: `pm2 restart zycryx-bot`.

Si WhatsApp invalido la sesion, restaurar archivos antiguos no ayuda: hay que re-vincular.

## Reglas de seguridad

- Mantener `BOT_FIXED_OWNER_JIDS` al minimo.
- Tratar `BotSession/`, `jadibot/` y `.env.prod` como secretos.
- No correr el bot con usuario de sistema con sudo.
- No exponer PostgreSQL publicamente salvo firewall estricto.
- Revisar logs `[SENSITIVE]` despues de cambios de owners o mantenimiento.
