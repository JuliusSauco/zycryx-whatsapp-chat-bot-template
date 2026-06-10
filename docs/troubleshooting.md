# Troubleshooting

Problemas comunes y como resolverlos. Fecha de referencia: 2026-06-10.

## Conexion y vinculacion

### No aparece el QR en la terminal

- Verifica que elegiste la opcion 1 en el menu de vinculacion y que `BotSession/creds.json` no existe (si existe, el bot intenta reutilizar la sesion en vez de pedir QR).
- El QR se renderiza desde el evento `connection.update` con `qrcode-terminal` (Baileys 7 deprecó `printQRInTerminal`). Si actualizaste Baileys y dejo de salir el QR, revisa que `main.ts` siga manejando el campo `qr` del evento.
- Algunas terminales con fuentes no monoespaciadas deforman el QR; prueba con otra terminal o usa el codigo de emparejamiento (opcion 2).

### El codigo de emparejamiento no llega o es rechazado

- El numero debe ir en formato internacional sin `+` ni espacios.
- WhatsApp limita la frecuencia de codigos; espera 1-2 minutos entre intentos.
- Si el numero es de Mexico, el bot normaliza `52` a `521` automaticamente.

### `Sesión inválida (código 401/403/500)`

La sesion fue cerrada o invalidada (por ejemplo "Cerrar sesion" desde el telefono). El bot detiene los reintentos automaticamente y queda esperando intervencion:

1. Detener el proceso.
2. Borrar la carpeta `BotSession/`.
3. Arrancar de nuevo y re-vincular.

Otros codigos de cierre (red caida, `connectionReplaced`, `restartRequired`) si se reintentan solos cada 3 segundos.

### El bot se desconecta cada cierto tiempo

Es esperado: el proceso se reinicia solo cada 3 horas (`process.exit(0)`) como medida de higiene de memoria. Necesitas un process manager (PM2/systemd) que lo levante de nuevo; ver `docs/deployment.md`.

### Loop de "Closing stale open session"

El detector integrado reinicia el proceso (exit 1) si hay mas de 50 en un minuto. Si reaparece constantemente, suele indicar sesion corrupta: borrar `BotSession/` (o la carpeta del subbot afectado en `jadibot/`) y re-vincular.

## Base de datos

### `ECONNREFUSED` o `password authentication failed` al arrancar

- Verifica `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` en el `.env.<NODE_ENV>` correcto (el bot solo carga el archivo que corresponde a `NODE_ENV`).
- Si usas `DATABASE_URL`, tiene prioridad sobre los parametros individuales.

### `relation "..." does not exist`

Faltan migraciones: ejecuta `npm run db:migrate`. Recuerda que el bot **no** migra automaticamente al arrancar.

### `DB_SCHEMA` no se respeta

`DB_SCHEMA` solo acepta identificadores simples (`[a-zA-Z_][a-zA-Z0-9_]*`); cualquier otro valor cae silenciosamente a `public`. Revisa tambien que corriste `npm run db:ensure-schema` (incluido en `db:migrate`).

## Comandos y plugins

### Un comando no responde

1. Revisa el log con `LOG_LEVEL=command` (default): si el comando aparece como `[ CMD ]`, llego al router; el problema esta en el plugin o sus guards.
2. Si no aparece, puede estar bloqueado antes: grupo baneado, `primary_bot` de otro bot en el grupo, modo admin, access mode de la familia (`games`, `rpg`, `downloads`, etc.) en `admins`/`off`, o el mensaje fue deduplicado.
3. Los rechazos de guards de access mode son silenciosos por diseno (no responden nada).

### Las descargas fallan (`play`, `tiktok`, `ig`, etc.)

Las APIs publicas de descarga son inestables por naturaleza. Los providers (`src/providers/downloads/`) tienen fallbacks entre varios proveedores; si todos fallan:

- revisa qué API keys opcionales tienes configuradas (ver `docs/environment-variables.md`);
- prueba el mismo comando mas tarde: muchos proveedores aplican rate limits;
- revisa el log con `LOG_LEVEL=debug` para ver qué proveedor fallo y por que.

### Stickers o conversiones fallan

FFmpeg no esta instalado o no esta en el PATH. Verifica con `ffmpeg -version` en la misma terminal/usuario que corre el bot. Algunos flujos de stickers usan tambien ImageMagick (`convert`).

### `speedtest` falla

Requiere `python3` en el PATH y el archivo `speed.py` en la raiz del proyecto.

### Hot reload no toma cambios de un plugin

El watcher recarga archivos `.ts`/`.js` dentro de `src/plugins/`. Si agregaste una carpeta nueva justo despues de arrancar, deberia detectarse sola; si no, reinicia el proceso. Cambios fuera de `src/plugins/` (core, services, lib) siempre requieren reinicio.

## Rendimiento

### Mensajes con respuesta lenta

- Activa diagnostico: `LOG_LEVEL=debug` y `PERF_LOG_THRESHOLD_MS=300`. Los logs `[PERF]` desglosan el pipeline por etapa (dedup, smsg, context, guards, plugin) e identifican hooks o plugins lentos.
- La primera interaccion en un grupo puede ser mas lenta mientras se carga metadata; despues queda cacheada (TTL 1h).

### Memoria creciendo

- El reinicio cada 3h es la mitigacion actual. Si el crecimiento es rapido, revisa la cola background (`⚠️ Cola background acumulada` en logs) y la cantidad de subbots activos.

## Errores de build / typecheck

### `tsc` no se reconoce

Faltan dependencias: `npm install`. El proyecto usa TypeScript local, no global.

### `npm test` falla tras cambiar settings de grupo

Las suites de servicios (`tests/services.test.ts`) afirman la forma exacta de los settings. Si agregaste un campo a `group_settings` o a los defaults del servicio, actualiza tambien las expectativas del test.
