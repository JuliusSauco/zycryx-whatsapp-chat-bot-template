# Flujo de conexion con Baileys

Como se conecta, vincula y reconecta el bot principal y los subbots. Fecha de referencia: 2026-06-10. Version de Baileys: `@whiskeysockets/baileys ^7.0.0-rc.9`.

## Arranque del bot principal

Secuencia de `src/core/index.ts` y `src/core/main.ts`:

1. `core/env.ts` carga `.env.<NODE_ENV>`.
2. `core/config.ts` construye `global.owner` y `globalThis.info` (marca, links, imagenes).
3. `loadPlugins()` carga recursivamente `src/plugins/**` y registra el router.
4. `startScheduledTasks()` inicia tareas recurrentes (expiracion de grupos, reportes, limpieza de memoria).
5. `main()` decide el modo de arranque:
   - Si no hay credenciales (`BotSession/creds.json`) ni subbots, pregunta interactivamente por consola: QR (opcion 1) o codigo de emparejamiento de 8 digitos (opcion 2).
   - Si hay subbots activos pero no credenciales del principal, arranca solo los subbots.
6. `startBot()` crea el socket con `makeWASocket`.

## Vinculacion (primer login)

### Por QR

Baileys 7 deprecó `printQRInTerminal` (la opcion existe pero no hace nada). El QR se renderiza manualmente: el handler de `connection.update` lee el campo `qr` y lo dibuja en terminal con `qrcode-terminal` cuando el usuario eligio el modo QR y las credenciales aun no estan registradas.

### Por codigo de emparejamiento

Si el usuario elige la opcion 2, se pide el numero por consola y ~2 segundos despues de crear el socket se llama `sock.requestPairingCode(numero)`. El codigo se muestra en terminal y se ingresa en WhatsApp > Dispositivos vinculados.

Detalle regional: numeros que empiezan con `52` (Mexico) se normalizan a `521`.

## Sesiones

- La sesion del bot principal vive en `./BotSession` (multi-file auth state: `creds.json` + archivos de claves de sesion/pre-keys).
- Cada subbot vive en `./jadibot/<numero>/`.
- Ninguna de las dos carpetas debe versionarse (ya estan en `.gitignore`). Tratarlas como secretos: quien tenga esos archivos controla la cuenta de WhatsApp.
- `creds.update` dispara `saveCreds` para persistir cambios de credenciales.

### Limpieza automatica de sesiones

`main.ts` ejecuta cada 10 minutos un limpiador que:

- recorta pre-keys a un maximo (~500, conservando las 300 mas recientes);
- elimina archivos de sesion con mas de 30 minutos sin modificar (excepto `creds.json`) cuando la conexion no esta activa.

Ademas hay un detector de spam de "Closing stale open session": si se detectan mas de 50 en un minuto, el proceso sale con codigo 1 para que el process manager lo reinicie limpio.

## Configuracion del socket

Opciones relevantes en `makeWASocket` (bot principal):

| Opcion | Valor | Motivo |
|---|---|---|
| `logger` | pino `silent` | Baileys es muy verboso; el proyecto usa su propio logger. |
| `browser` | `['Windows', 'Chrome', '']` | Firma de dispositivo vinculado. |
| `markOnlineOnConnect` | `false` | No marcar el bot como "en linea" (los subbots usan `true`). |
| `syncFullHistory` | `false` | No sincronizar historial completo. |
| `getMessage` | `async () => undefined` | No hay store de mensajes; afecta reintentos de descifrado y polls, asumido como trade-off. |
| `cachedGroupMetadata` | NodeCache TTL 1h | Evita IQs repetidos de metadata de grupo. |
| `msgRetryCounterCache` / `userDevicesCache` | NodeCache sin TTL | Caches estandar de Baileys. |
| `defaultQueryTimeoutMs` | 30s | Timeout de queries IQ. |
| `keepAliveIntervalMs` | 55s | Keep-alive del WebSocket. |

Al conectar (`connection === 'open'`) se precarga la metadata de todos los grupos con `groupFetchAllParticipating()` y se sincronizan los admins de cada grupo hacia `user_group_roles` (`syncStartupGroupAdmins`).

## Reconexion

### Bot principal

En `connection === 'close'` el comportamiento depende del codigo de desconexion:

- **Codigos terminales de sesion** — `loggedOut` (401), `forbidden` (403) y `badSession` (500): el bot **no reintenta**. Loguea el aviso y queda detenido hasta que el operador borre `BotSession/` y vuelva a vincular.
- **Cualquier otro codigo** (perdida de red, `connectionClosed` 428, `connectionReplaced` 440, `restartRequired` 515, etc.): espera 3 segundos y vuelve a llamar `startBot()`.

Los listeners de proceso (`uncaughtException`/`unhandledRejection`) y las tareas de mantenimiento (`startMaintenanceTasks()`: limpieza de tmp, reinicio de 3h, limpieza de sesiones) se registran una sola vez a nivel de modulo, por lo que las reconexiones no los duplican.

El reinicio automatico del proceso cada 3 horas (`process.exit(0)`) **requiere un process manager** (PM2, systemd, Docker restart policy) que reinicie el proceso; sin el, el bot se apaga solo.

### Subbots

`src/lib/subbot.ts` maneja la reconexion por codigo:

- `401`/`403`: hasta 5 reintentos; si fallan, se elimina la carpeta de sesion del subbot.
- Cierres de red (`connectionClosed`, `connectionLost`, `timedOut`, `connectionReplaced`): reintento a los 3s.
- Cualquier otro codigo: reintento a los 3s.

Los subbots se cargan al inicio (`cargarSubbots`) y se re-escanean cada 60 segundos buscando sesiones nuevas en `./jadibot`.

Al cerrar la conexion de un subbot, su socket se remueve de `globalThis.conns` (por `userId`); cuando la reconexion abre, el socket nuevo reemplaza cualquier entrada previa. Asi `conns` nunca apunta a sockets muertos.

## Pipeline de mensajes

- `messages.upsert` filtra: solo `type === 'notify'`, descarta mensajes sin contenido, mensajes con mas de 120s de antiguedad y ecos de otros bots (`isOtherBotKey`).
- Cada chat tiene una cola FIFO propia (`chatQueues`): los mensajes de un mismo chat se procesan en serie, chats distintos en paralelo.
- El resto del pipeline (dedup, contexto, hooks, guards, plugin) vive en `src/core/handler.ts` y esta descrito en el README.

## Eventos suscritos

| Evento | Modulo |
|---|---|
| `messages.upsert` | `core/handler.ts` (via cola por chat) |
| `messages.update` | `core/message-update.ts` (ediciones/eliminaciones) |
| `group-participants.update` | `core/group-events.ts` |
| `groups.update` | `core/group-update-events.ts` |
| `group.join-request` | `core/group-join-request.ts` |
| `call` | `core/call-events.ts` |
| `creds.update` | persistencia de sesion |
| `connection.update` | vinculacion y reconexion |
