# Variables de entorno

Referencia completa de configuracion. La fuente de verdad del codigo es `src/core/env.ts`; el contrato publico es `.env.example`. Si agregas una variable nueva, actualiza ambos archivos y este documento.

## Carga de archivos

El loader (`src/core/env.ts`) usa `NODE_ENV` para elegir el archivo:

| `NODE_ENV` | Archivo cargado |
|---|---|
| `local` (default) | `.env.local` |
| `dev` | `.env.dev` |
| `test` | `.env.test` |
| `prod` | `.env.prod` |

Si el archivo no existe, se usan las variables del sistema (`dotenv.config()` sin path). Esto permite inyectar configuracion via entorno en contenedores o servicios gestionados.

`drizzle.config.ts` replica esta misma logica para que `drizzle-kit` use el mismo ambiente.

Para validar un ambiente sin arrancar el bot:

```bash
NODE_ENV=prod npm run ops:check
```

## Entorno y marca

| Variable | Default | Uso |
|---|---|---|
| `NODE_ENV` | `local` | Selecciona archivo `.env.*` y modo de ejecucion. |
| `BOT_DISPLAY_NAME` | `Zycryx Bot` | Nombre visible del bot (watermark de mensajes). |
| `BOT_PACKAGE_NAME` | `Zycryx Stickers` | Packname de stickers. |
| `BOT_AUTHOR` | `Zycryx` | Autor de stickers. |
| `BOT_BANNER_NAME` | `ZYCRYX BOT` | Banner cfonts al arrancar. |
| `BOT_BANNER_AUTHOR` | `by: Zycryx` | Subtitulo del banner. |
| `BOT_REPOSITORY_URL` | vacio | Link de repo mostrado en menus. |
| `BOT_WEBSITE_URL` | vacio | Web/logo alternativo. |
| `BOT_YOUTUBE_URL` / `BOT_TIKTOK_URL` / `BOT_FACEBOOK_URL` / `BOT_INSTAGRAM_URL` | vacio | Redes mostradas en menus. |
| `BOT_GROUP_LINKS` | vacio | Hasta 6 links de grupos oficiales, separados por coma. |
| `BOT_CHANNEL_LINKS` | vacio | Hasta 2 links de canales, separados por coma. |
| `BOT_MOD_GROUP_ID` | vacio | JID del grupo de moderacion que recibe reportes (`xxxxx@g.us`). |
| `DEFAULT_MENU_IMAGE` | `./resources/media/menus/Menu2.jpg` | Imagen por defecto de menus. |

## Owners y permisos

| Variable | Uso |
|---|---|
| `BOT_OWNER_NUMBERS` | Numeros internacionales sin `+`, separados por coma. Pueden usar comandos `owner`. |

## Comportamiento del runtime

| Variable | Default | Uso |
|---|---|---|
| `LOG_LEVEL` | `command` | `error`, `warn`, `info`, `command`, `debug`, `trace`. Ver README seccion Observabilidad. |
| `PERF_LOG_THRESHOLD_MS` | `750` | Umbral para logs `[PERF]` de pipeline lento. |
| `HTTP_TIMEOUT_MS` | `15000` | Timeout por defecto del HTTP client centralizado. |
| `DB_CACHE_TTL_MS` | `300000` | TTL del cache en memoria de settings de grupo y subbot config. |
| `AUDIO_CACHE_TTL_MS` | `300000` | TTL del cache de audios dinamicos. |
| `BACKGROUND_TASK_CONCURRENCY` | `4` | Concurrencia de la cola de tareas en segundo plano (upserts no criticos). |
| `PLUGIN_HOT_RELOAD_ENABLED` | `false` | Activa watchers de plugins; recomendado sólo en desarrollo. |
| `REQUIRED_PLUGIN_PATHS` | hooks críticos | Lista separada por coma que debe existir al arrancar. |
| `MESSAGE_QUEUE_CONCURRENCY` | `32` | Máximo global de mensajes procesados simultáneamente. |
| `MESSAGE_QUEUE_PER_CHAT_LIMIT` | `50` | Backpressure por bot/chat antes de rechazar trabajo nuevo. |
| `MESSAGE_QUEUE_GLOBAL_LIMIT` | `2000` | Límite total de mensajes pendientes. |
| `BOT_LINK_MODE` | `auto` | `auto`, `qr`, `code` o `disabled`. En procesos sin TTY se debe seleccionar un modo explícito. |
| `BOT_LINK_PHONE` | vacío | Número internacional usado por `BOT_LINK_MODE=code` cuando no hay terminal interactiva. |

## Sesiones y cifrado

| Variable | Default | Uso |
|---|---|---|
| `BAILEYS_AUTH_STATE_SOURCE` | `database` | `database` persiste cifrado; `files` mantiene compatibilidad temporal. |
| `BAILEYS_AUTH_WRITE_DELAY_MS` | `25` | Ventana de coalescing para escrituras de Signal keys fuera del camino crítico. |
| `BAILEYS_AUTH_LEASE_SECONDS` | `120` | Lease que impide abrir la misma sesión en dos procesos. |
| `BOT_SECRETS_KEY_VERSION` | `1` | Versión usada para cifrados nuevos. |
| `BOT_SECRETS_MASTER_KEY_B64` | vacío | Clave aleatoria recomendada de exactamente 32 bytes en base64. |
| `BOT_SECRETS_KEYRING_JSON` | vacío | JSON `versión -> clave base64` para leer datos durante una rotación. |
| `BOT_SECRETS_PASSPHRASE` | vacío | Alternativa que deriva la clave una vez mediante Argon2id. |
| `BOT_SECRETS_KDF_SALT_B64` | vacío | Salt aleatorio de al menos 16 bytes, obligatorio con passphrase. |

No configures simultáneamente clave maestra y passphrase. El modo base de datos requiere uno de los dos métodos. La clave o passphrase debe vivir en el gestor de secretos del despliegue, nunca en PostgreSQL ni en el repositorio.

## PostgreSQL

| Variable | Default | Uso |
|---|---|---|
| `DB_HOST` | `localhost` | Host de PostgreSQL. |
| `DB_PORT` | `5432` | Puerto. |
| `DB_NAME` | `zycryx_bot` | Base de datos. |
| `DB_USER` | `postgres` | Usuario. |
| `DB_PASSWORD` | vacio | Password. |
| `DATABASE_URL` | vacio | Alternativa a los parametros individuales. Tiene prioridad si esta definida. |
| `DB_POOL_MAX` | `20` | Máximo de conexiones del pool por proceso. |
| `DB_IDLE_TIMEOUT_MS` | `30000` | Tiempo para cerrar conexiones ociosas. |
| `DB_CONNECTION_TIMEOUT_MS` | `10000` | Timeout al adquirir conexión. |
| `DB_STATEMENT_TIMEOUT_MS` | `30000` | Timeout PostgreSQL por sentencia del bot. |
| `HEALTH_HOST` | `127.0.0.1` | Interfaz donde escucha health/readiness/metrics. Usa una red privada o proxy autenticado al exponerla. |
| `HEALTH_PORT` | `3000` | Puerto HTTP para `/health/live`, `/health/ready` y `/metrics`. |
| `HEALTH_METRICS_TOKEN` | vacío | Si está definido, `/metrics` exige `Authorization: Bearer <token>`. |
| `CONSOLE_VIEW_TOKEN` | vacío | Token Bearer obligatorio para la consola web `/console` y sus APIs. Si está vacío, la API de consola permanece deshabilitada. |
| `DB_ADMIN_URL` | vacío | Conexión administrativa usada sólo por `db:setup-runtime-role`. |
| `DB_RUNTIME_ROLE` | `zycryx_bot_app` | Rol DML sin DDL que se aprovisiona para el proceso. |
| `DB_RUNTIME_PASSWORD` | vacío | Password de al menos 20 caracteres para ese rol; no la versionar. |

## APIs externas

Todas son opcionales: los comandos que las usan fallan de forma controlada o usan fallbacks si faltan.

| Variable | Uso |
|---|---|
| `API_BASE_URL` / `API_KEY` | API generica principal (default `https://api.delirius.store`). |
| `FGMODS_API_URL` / `FGMODS_API_KEY` | API FGMods (descargas y herramientas). |
| `NEOXR_API_URL` / `NEOXR_API_KEY` | API Neoxr (descargas y herramientas). |
| `ACR_HOST` / `ACR_ACCESS_KEY` / `ACR_ACCESS_SECRET` | ACRCloud para reconocimiento de musica (`whatmusic`). |
| `ALYACHAN_API_KEY`, `BETABOTZ_API_KEY`, `LOLHUMAN_API_KEY`, `SKYULTRA_API_KEY`, `ZENKEY_API_KEY` | APIs alternativas usadas como fallbacks de descargas/busquedas. |
| `TENOR_API_KEY` | GIFs via Tenor. |
| `TELEGRAM_BOT_TOKEN` | Importacion de stickers de Telegram. |
| `UNSPLASH_ACCESS_KEY` | Busqueda de imagenes. |
| `TRANSLATE_API_KEY` | Traduccion. |
| `PERPLEXITY_API_KEYS` | Claves para IA conversacional (acepta varias separadas por coma). |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | Metadata y busqueda de Spotify. |

## VirusTotal

| Variable | Default | Uso |
|---|---|---|
| `VIRUSTOTAL_API_KEY` | vacio | Sin clave, el hook se desactiva. |
| `VIRUSTOTAL_ENABLED` | `true` | Apagado global del hook. |
| `VIRUSTOTAL_MAX_FILE_MB` | `32` | Tamano maximo de archivo analizado. |
| `VIRUSTOTAL_POLL_ATTEMPTS` | `6` | Reintentos de polling del analisis. |
| `VIRUSTOTAL_POLL_INTERVAL_MS` | `10000` | Intervalo entre reintentos. |

## Secretos

- Nunca versionar `.env.local`, `.env.dev`, `.env.test` ni `.env.prod` (ya estan en `.gitignore`).
- `.env.example` debe mantener todas las claves pero sin valores reales.
- Tokens que cambian en runtime pueden vivir cifrados en `bot_security.encrypted_secrets` mediante `npm run secrets:set`.
- Si un secreto se filtro en un commit, rota el token; eliminarlo del historial no alcanza.
