# Flujo de conexión con Baileys

Referencia del arranque, vinculación y reconexión del bot principal y los subbots. La versión soportada está fijada en `package.json`.

## Arranque

1. `core/env.ts` carga `.env.<NODE_ENV>`.
2. Se cargan y validan plugins críticos.
3. Arrancan scheduler, mantenimiento y colas con shutdown explícito.
4. `useConfiguredAuthState()` abre la sesión `main` y las sesiones de subbots.
5. Si no hay credenciales registradas, el proceso ofrece QR o código de emparejamiento.
6. `makeWASocket` recibe el auth state cacheado y crea el WebSocket.

## Vinculación

El QR se renderiza desde `connection.update` con `qrcode-terminal`. Para código de emparejamiento se solicita el número internacional sin `+`; los números mexicanos `52` se normalizan a `521`.

Por defecto `BAILEYS_AUTH_STATE_SOURCE=database`. Credenciales y Signal keys se cifran en PostgreSQL. Si no existe una sesión en DB y hay un `BotSession/creds.json` o una carpeta legacy de subbot, se importa automáticamente sin borrar el origen. Consulta `docs/baileys-database-sessions.md`.

`BAILEYS_AUTH_STATE_SOURCE=files` conserva el multi-file auth state sólo como compatibilidad temporal.

## Camino crítico y persistencia

- Al abrir, las Signal keys se descifran una vez y quedan en un mapa en memoria.
- `keys.get()` no consulta DB.
- `keys.set()` actualiza memoria primero y agrupa persistencia mediante write-behind.
- `creds.update`, cierre y shutdown hacen flush.
- Un lease renovable impide que dos procesos usen la misma sesión; perderlo cancela el socket.

## Reconexión

Los códigos terminales `loggedOut` (401), `forbidden` (403) y `badSession` (500) revocan/eliminan la sesión activa y no se reintentan. Los cierres transitorios pasan por un coordinador single-flight con backoff exponencial y jitter, por lo que varios eventos no crean sockets paralelos.

El proceso ya no se reinicia cada tres horas. `uncaughtException` y `unhandledRejection` inician un shutdown controlado: detienen reconexiones, scheduler y watchers; drenan mensajes, tareas de fondo y auth; cierran sockets y finalmente el pool PostgreSQL.

## Configuración del socket

| Opción | Decisión |
|---|---|
| `logger` | Pino silencioso; el proyecto usa su logger propio. |
| `markOnlineOnConnect` | `false` en principal, `true` en subbots. |
| `syncFullHistory` | `false`. |
| `cachedGroupMetadata` | Cache con TTL para evitar IQs repetidos. |
| `defaultQueryTimeoutMs` | 30 segundos. |
| `keepAliveIntervalMs` | 55 segundos. |

## Pipeline de mensajes

`messages.upsert` descarta mensajes inválidos, antiguos o ecos de otros bots. El dispatcher garantiza orden por `(bot, chat)`, limita concurrencia global y aplica backpressure con `MESSAGE_QUEUE_PER_CHAT_LIMIT` y `MESSAGE_QUEUE_GLOBAL_LIMIT`. Un chat lento no bloquea todos los demás.

El pipeline restante vive en `core/handler.ts`: deduplicación, contexto, interceptores, guards, ejecución, métricas y logging.

## Eventos

| Evento | Responsabilidad |
|---|---|
| `messages.upsert` | Dispatcher y handler. |
| `messages.update` | Ediciones/eliminaciones. |
| `group-participants.update` | Participantes y roles. |
| `groups.update` / `group.join-request` | Cambios y solicitudes. |
| `call` | Política de llamadas. |
| `creds.update` | Persistencia cifrada. |
| `connection.update` | Vinculación, lease y reconexión. |
