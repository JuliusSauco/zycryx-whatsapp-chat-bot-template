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
| `BOT_FIXED_OWNER_JIDS` | Numeros o JIDs completos, separados por coma. Pueden usar comandos `rowner` (eval, shell, etc.). Mantener esta lista minima: estos usuarios pueden ejecutar codigo arbitrario en el proceso. |

## Comportamiento del runtime

| Variable | Default | Uso |
|---|---|---|
| `DATA_SOURCE` | `local` | `local` = Drizzle + PostgreSQL (estable). `backend` = scaffold REST/GraphQL futuro, falla explicitamente. |
| `LOG_LEVEL` | `command` | `error`, `warn`, `info`, `command`, `debug`, `trace`. Ver README seccion Observabilidad. |
| `PERF_LOG_THRESHOLD_MS` | `750` | Umbral para logs `[PERF]` de pipeline lento. |
| `HTTP_TIMEOUT_MS` | `15000` | Timeout por defecto del HTTP client centralizado. |
| `DB_CACHE_TTL_MS` | `300000` | TTL del cache en memoria de settings de grupo y subbot config. |
| `AUDIO_CACHE_TTL_MS` | `300000` | TTL del cache de audios dinamicos. |
| `BACKGROUND_TASK_CONCURRENCY` | `4` | Concurrencia de la cola de tareas en segundo plano (upserts no criticos). |

## PostgreSQL

| Variable | Default | Uso |
|---|---|---|
| `DB_HOST` | `localhost` | Host de PostgreSQL. |
| `DB_PORT` | `5432` | Puerto. |
| `DB_NAME` | `zycryx_bot` | Base de datos. |
| `DB_USER` | `postgres` | Usuario. |
| `DB_PASSWORD` | vacio | Password. |
| `DB_SCHEMA` | `public` | Schema usado via `search_path`, aplicado al pool y a drizzle-kit. Solo acepta identificadores válidos (`[a-zA-Z_][a-zA-Z0-9_]*`); si no, cae a `public`. |
| `DATABASE_URL` | vacio | Alternativa a los parametros individuales. Tiene prioridad si esta definida. |

## Backend futuro (scaffold)

Solo aplican si `DATA_SOURCE=backend`, que hoy no es el camino activo:

| Variable | Default | Uso |
|---|---|---|
| `BACKEND_PROTOCOL` | `rest` | Protocolo previsto. |
| `BACKEND_BASE_URL` | vacio | URL base del backend. |
| `BACKEND_API_TOKEN` | vacio | Token de autenticacion. |
| `BACKEND_TIMEOUT_MS` | `10000` | Timeout de requests al backend. |

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
- Tokens que cambian en runtime pueden vivir en la tabla `api_tokens` (ver README, seccion API Tokens).
- Si un secreto se filtro en un commit, rota el token; eliminarlo del historial no alcanza.
