# 🤖 Zycryx WhatsApp Chat Bot Template

![Tecnologias principales](https://skillicons.dev/icons?i=typescript,nodejs,npm,postgres,git&theme=dark)

![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-24%20LTS-339933?logo=node.js&logoColor=white)
![Baileys](https://img.shields.io/badge/Baileys-7.x-25D366?logo=whatsapp&logoColor=white)
![Drizzle](https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle&logoColor=111)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18%2B-4169E1?logo=postgresql&logoColor=white)
![npm](https://img.shields.io/badge/npm-package-CB3837?logo=npm&logoColor=white)

Plantilla modular para construir bots de WhatsApp con TypeScript, Baileys, Drizzle ORM y PostgreSQL. Esta base esta pensada para reutilizar core, arquitectura, persistencia, guards, subbots, observabilidad y utilidades entre varios proyectos, cambiando marca, comandos, textos, recursos multimedia, owners y APIs externas.

El proyecto esta orientado a capas: los plugins no deberian consultar la base directamente; pasan por servicios, puertos y repositorios. La persistencia oficial es conexion directa a PostgreSQL mediante Drizzle ORM.

## 📚 Contenido

- [✨ Caracteristicas](#caracteristicas)
- [🧰 Tecnologias](#tecnologias)
- [📋 Requisitos](#requisitos)
- [⚡ Instalacion](#instalacion)
- [⚙️ Configuracion](#configuracion)
- [📜 Scripts](#scripts)
- [🚀 Produccion](#produccion)
- [🗂️ Estructura](#estructura)
- [🏛️ Arquitectura](#arquitectura)
- [🧩 Patrones](#patrones)
- [🔁 Flujo De Ejecucion](#flujo-de-ejecucion)
- [🔌 Plugins](#plugins)
- [🗄️ Base De Datos](#base-de-datos)
- [📦 Recursos](#recursos)
- [📊 Observabilidad](#observabilidad)
- [🔐 Secretos Y Seguridad](#secretos)
- [🧪 Validacion](#validacion)
- [🔎 Auditoria Tecnica](#auditoria-tecnica)
- [🗺️ Roadmap y Analisis](#roadmap-y-analisis)
- [📌 Estado Actual](#estado-actual)

<a id="caracteristicas"></a>
## ✨ Caracteristicas

- Conexion a WhatsApp mediante Baileys.
- Sistema modular de plugins distribuidos por familias funcionales.
- Loader de plugins recursivo con hot reload.
- Router de comandos con resolucion exacta, regex y custom prefixes.
- Plugins nuevos mediante `defineSdkPlugin` y SDK interno para contenido, HTTP, replies, providers y locks.
- `content.service` como API oficial para mensajes, listas y templates, preparado para i18n.
- Providers por dominio iniciados en `src/providers`, con YouTube centralizado para busqueda, metadata, descarga y fallbacks.
- Compatibilidad con hooks legacy que exportan `before`.
- Hooks `before` con contexto enriquecido para reutilizar metadata, permisos, bot config y settings ya precargados.
- Guards centralizados para owners, admins, grupo/privado, modo admin, NSFW, ban y recursos.
- Context builder para sender, metadata, permisos, settings de grupo y config del bot.
- Pipeline de eventos de grupo separado por responsabilidad: participantes, cambios de grupo, solicitudes de ingreso, antifake, welcome/bye y promote/demote.
- Persistencia con Drizzle ORM sobre PostgreSQL.
- Repositorios Drizzle separados por agregado.
- Puertos de repositorio para desacoplar servicios de la implementacion Drizzle.
- Modelos y reglas de dominio independientes de Drizzle en `src/domain` para usuarios, grupos, subbots, audios, personajes y estado operativo.
- Reservas transaccionales e idempotentes para comandos que consumen recursos de la economia.
- Registro validado de plugins con deteccion de aliases y regex duplicadas.
- Interceptores tipados, timeouts por perfil, cancelacion cooperativa y locks con namespace por plugin.
- Conexion directa a PostgreSQL como decision arquitectonica; no hay adapter backend REST/GraphQL.
- Modelo estricto normalizado por dominios en nueve schemas PostgreSQL.
- Bootstrap único para bases nuevas, validación de PostgreSQL 18 y seguridad RLS compatible con Supabase.
- Subbots con sesiones independientes.
- Reglas persistentes por familia con activación independiente y modos `all`, `admin`, `superadmin` y `owner`: juegos, herramientas, RPG, descargas, búsquedas, stickers, convertidores, diversión, audios, GIFs y NSFW.
- Roles de admins por grupo persistidos en `user_group_roles`, sincronizados al iniciar y en eventos promote/demote.
- Autoresponder configurable por grupo (trigger por mencion o texto) y registro opcional de mensajes (`message_logs`).
- Tareas programadas para reportes, expiracion de grupos y limpieza de memoria.
- Recursos base en `resources/data` y recursos mutables de audios en base de datos.
- Observabilidad con `LOG_LEVEL` y logs de performance configurables.
- Integracion opcional con VirusTotal para analisis de enlaces y archivos.
- Optimizaciones de latencia para evitar consultas repetidas a settings, subbot config y metadata en hooks y comandos de grupo frecuentes.
- `src/**/*.ts` sin `any` ni `@ts-ignore`.
- Suite de pruebas para helpers, router, guards, context builder, servicios, comandos sensibles, providers y compuerta P0.

<a id="tecnologias"></a>
## 🧰 Tecnologias

| Tecnologia | Uso |
|---|---|
| TypeScript | Lenguaje principal y contratos de arquitectura. |
| Node.js | Runtime principal del bot. |
| Baileys | Conexion WebSocket con WhatsApp. |
| Drizzle ORM | Acceso tipado al modelo PostgreSQL normalizado. |
| PostgreSQL 18 | Persistencia, UUIDv7 y restricciones temporales. |
| drizzle-kit | Verificacion/exportacion del schema y Drizzle Studio. |
| tsx | Ejecucion TypeScript en desarrollo. |
| Pino | Logger silencioso usado internamente por Baileys. |
| HTTP client centralizado | Consumo de APIs externas desde SDK, providers y librerias internas. |
| Axios / Fetch nativo | Compatibilidad interna en scrapers especiales documentados. |
| FFmpeg | Procesamiento multimedia. |
| Sharp / Jimp / node-webpmux | Imagenes y stickers. |
| cross-env | Scripts con variables de entorno. |

<a id="requisitos"></a>
## 📋 Requisitos

- Node.js 24 LTS (usar siempre el parche 24.x mas reciente).
- npm.
- PostgreSQL 18 o superior. Para hosting administrado, el proyecto está preparado para Supabase con PostgreSQL 18.
- FFmpeg instalado y disponible en PATH.
- Cliente PostgreSQL (`pg_dump`, `pg_restore`) para backups y restauracion.
- git disponible en PATH (lo usa el comando owner `update`).
- Python 3 como `python3` (opcional, solo para el comando `speedtest`).
- Cuenta de WhatsApp para vincular el bot por QR o codigo.
- Variables de entorno en `.env.local`, `.env.dev`, `.env.test` o `.env.prod`. Referencia completa en `docs/environment-variables.md`.

<a id="instalacion"></a>
## ⚡ Instalacion

```bash
git clone <url-del-repositorio>
cd zycryx-whatsapp-chat-bot-template
nvm install 24
nvm use 24
node --version # debe mostrar v24.x
npm ci
```

El archivo `.nvmrc` mantiene la seleccion en la rama 24 LTS. Actualiza periodicamente al parche 24.x mas reciente y no uses Node 25/26 sin una nueva validacion del proyecto.

Copia el entorno base:

```bash
cp .env.example .env.local
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Prepara una base vacía. Este comando ejecuta una sola vez `database/schema.sql` y falla si el servidor no es PostgreSQL 18+:

```bash
npm run db:setup
```

En Supabase también puedes pegar el contenido completo del script en SQL Editor. Con `psql`:

```bash
psql -U <user> -d <database> -f database/schema.sql
```

El despliegue ejecuta `db:check`, que sólo valida versión y estructura; nunca altera la base. Las bases nuevas se provisionan una sola vez con `db:setup`.

Ejecuta en desarrollo:

```bash
npm run dev
```

O compila y ejecuta la version local:

```bash
npm run start:local
```

En la primera ejecucion el bot pedira QR o codigo de emparejamiento. Por defecto, credenciales y Signal keys quedan cifradas en PostgreSQL; las carpetas locales sólo se usan para importar sesiones legacy o con `BAILEYS_AUTH_STATE_SOURCE=files`.

<a id="configuracion"></a>
## ⚙️ Configuracion

El loader usa `NODE_ENV` para seleccionar archivo:

| `NODE_ENV` | Archivo |
|---|---|
| `local` | `.env.local` |
| `dev` | `.env.dev` |
| `test` | `.env.test` |
| `prod` | `.env.prod` |

Variables principales:

```env
NODE_ENV=local

BOT_DISPLAY_NAME=Zycryx Bot
BOT_PACKAGE_NAME=Zycryx Stickers
BOT_AUTHOR=Zycryx
BOT_BANNER_NAME=ZYCRYX BOT
BOT_BANNER_AUTHOR=by: Zycryx
BOT_REPOSITORY_URL=
BOT_WEBSITE_URL=
BOT_YOUTUBE_URL=
BOT_TIKTOK_URL=
BOT_FACEBOOK_URL=
BOT_INSTAGRAM_URL=
BOT_GROUP_LINKS=
BOT_CHANNEL_LINKS=
BOT_OWNER_NUMBERS=573001112233,51999888777
BOT_MOD_GROUP_ID=
BOT_LINK_MODE=auto
BOT_LINK_PHONE=
DEFAULT_MENU_IMAGE=./resources/media/menus/Menu2.jpg

LOG_LEVEL=command
PERF_LOG_THRESHOLD_MS=750
HTTP_TIMEOUT_MS=15000
DB_CACHE_TTL_MS=300000
AUDIO_CACHE_TTL_MS=300000
BACKGROUND_TASK_CONCURRENCY=4

API_BASE_URL=https://api.delirius.store
API_KEY=
FGMODS_API_URL=https://api.fgmods.xyz/api
FGMODS_API_KEY=
NEOXR_API_URL=https://api.neoxr.eu/api
NEOXR_API_KEY=
ACR_HOST=identify-eu-west-1.acrcloud.com
ACR_ACCESS_KEY=
ACR_ACCESS_SECRET=
ALYACHAN_API_KEY=
BETABOTZ_API_KEY=
LOLHUMAN_API_KEY=
TENOR_API_KEY=
TELEGRAM_BOT_TOKEN=
SKYULTRA_API_KEY=
UNSPLASH_ACCESS_KEY=
ZENKEY_API_KEY=
TRANSLATE_API_KEY=
PERPLEXITY_API_KEYS=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
VIRUSTOTAL_API_KEY=
VIRUSTOTAL_ENABLED=true
VIRUSTOTAL_MAX_FILE_MB=32
VIRUSTOTAL_POLL_ATTEMPTS=6
VIRUSTOTAL_POLL_INTERVAL_MS=10000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=zycryx_bot
DB_USER=postgres
DB_PASSWORD=
```

Tambien puedes usar `DATABASE_URL`:

```env
DATABASE_URL=postgresql://usuario:password@localhost:5432/zycryx_bot
```

Los schemas son parte fija del modelo (`bot_identity`, `bot_economy`, `bot_groups`, `bot_runtime`, `bot_content`, `bot_ai` y `bot_audit`); no se configuran mediante variables de entorno.

### 👑 Owners

`BOT_OWNER_NUMBERS` recibe numeros internacionales sin `+`, separados por coma:

```env
BOT_OWNER_NUMBERS=573001112233,51999888777
```

<a id="scripts"></a>
## 📜 Scripts

| Script | Descripcion |
|---|---|
| `npm run clean` | Elimina `dist` y `tsconfig.tsbuildinfo` con un script portable Node.js. |
| `npm run build` | Limpia y compila TypeScript a `dist/`. |
| `npm run typecheck` | Valida tipos sin emitir archivos. |
| `npm test` | Ejecuta normalización DB, helpers, dominios, router, guards, servicios, seguridad, providers, catálogo, ayuda y P0. |
| `npm run test:helpers` | Pruebas de helpers compartidos. |
| `npm run test:database` | Verifica schemas temáticos, invariantes PG18 y ausencia de tablas legacy. |
| `npm run test:plugin-pipeline` | Pruebas de interceptores, timeouts y locks del pipeline de plugins. |
| `npm run test:command-resources` | Pruebas de validacion, reservas idempotentes y mensajes de cobro. |
| `npm run test:profile-user` | Pruebas de resolucion JID/LID, alta basica y fallback de foto de perfil. |
| `npm run test:user-domain` | Pruebas de mappers y defaults del dominio de usuarios. |
| `npm run test:group-domain` | Pruebas de mappers y defaults del dominio de grupos. |
| `npm run test:subbot-domain` | Pruebas de mappers y defaults del dominio de subbots. |
| `npm run test:audio-domain` | Pruebas de mappers y normalizacion del dominio de audios. |
| `npm run test:operations-domain` | Pruebas de memoria IA y mappers operativos. |
| `npm run test:character-domain` | Pruebas de mappers y reglas de precios de personajes RPG. |
| `npm run test:ephemeral` | Pruebas de cooldowns, expiraciones y pending actions compartidas. |
| `npm run test:router` | Pruebas del router de comandos. |
| `npm run test:guards` | Pruebas de guards y pipeline de permisos. |
| `npm run test:context` | Pruebas del context builder. |
| `npm run test:services` | Pruebas de servicios con repositorios mockeados. |
| `npm run test:security` | Pruebas de comandos sensibles y sanitizacion. |
| `npm run test:providers` | Pruebas de providers de descargas por dominio. |
| `npm run test:ai-providers` | Pruebas de providers de IA. |
| `npm run test:media-conversion` | Pruebas de providers de conversion multimedia y stickers. |
| `npm run test:catalog` | Valida formato y aliases clave del catalogo de comandos. |
| `npm run test:catalog-audit` | Valida auditoria entre catalogo documental y plugins cargados. |
| `npm run test:help` | Pruebas de ayuda consultable (`help`, `ayuda`, `--help`). |
| `npm run test:p0` | Compuerta P0 para plugins migrados al SDK. |
| `npm run ops:check` | Preflight operativo: Node, env, owners, DB, herramientas, build y sesion. |
| `npm run ops:backup` | Backup local de DB, sesiones y audios custom con manifest. |
| `npm run ops:backup:db` | Backup solo de PostgreSQL con `pg_dump`. |
| `npm run ops:backup:sessions` | Backup solo de sesiones y audios custom. |
| `npm run db:setup` | Provisiona una base nueva desde `database/schema.sql`. |
| `npm run db:setup-runtime-role` | Crea/actualiza un rol DML sin DDL y sus políticas RLS. |
| `npm run db:check` | Valida PostgreSQL 18+, schemas, relaciones e índices críticos sin modificar datos. |
| `npm run db:studio` | Abre Drizzle Studio. |
| `npm run secrets:set -- <nombre> <valor>` | Guarda o rota un secreto cifrado. |
| `npm run secrets:migrate-legacy` | Migra y verifica `api_tokens` base64 antes de eliminarla. |
| `npm run secrets:rotate` | Recifra secretos, credenciales y Signal keys con la versión activa. |
| `npm run dev` | Ejecuta local con `tsx watch`. |
| `npm run dev:dev` | Ejecuta con `NODE_ENV=dev`. |
| `npm run dev:test` | Ejecuta con `NODE_ENV=test`. |
| `npm run serve` | Ejecuta `dist` con `NODE_ENV=prod` sin migrar. |
| `npm run serve:checked` | Valida la base y ejecuta `serve`; es el comando usado por PM2. |
| `npm run serve:local` | Ejecuta `dist` con `NODE_ENV=local` sin migrar. |
| `npm run serve:dev` | Ejecuta `dist` con `NODE_ENV=dev` sin migrar. |
| `npm run serve:test` | Ejecuta `dist` con `NODE_ENV=test` sin migrar. |
| `npm run start` | Build + serve prod sin migrar. |
| `npm run start:local` | Build + serve local sin migrar. |
| `npm run start:dev` | Build + serve dev sin migrar. |
| `npm run start:test` | Build + serve test sin migrar. |
| `npm run bun:start:*` | Alternativas con Bun. |

<a id="produccion"></a>
## 🚀 Produccion

Guia completa en `docs/deployment.md` y runbook diario en `docs/operations-runbook.md`. Resumen:

```bash
npm ci
cp .env.example .env.prod   # completar valores reales
npm run db:setup             # una sola vez, sobre la base vacía
npm run build
npm run serve               # primera vez en terminal real para vincular QR/codigo
```

Puntos clave:

- Un process manager (PM2, systemd o restart policy de Docker) es recomendado para recuperar fallos no controlados y arrancar con el servidor.
- La vinculacion inicial es interactiva (pide QR o codigo por consola); hazla fuera del supervisor y luego arranca bajo PM2.
- La plantilla PM2 ejecuta `db:check` antes del bot. Los cambios de estructura no se aplican durante un reinicio.
- Una sola instancia por numero de WhatsApp: el estado de juegos/cooldowns vive en memoria y la sesion es por dispositivo.
- Respalda la base y la clave maestra/keyring por separado; las carpetas de sesión sólo importan durante la migración legacy.
- Flujo de conexion, sesiones y reconexion documentado en `docs/baileys-connection.md`. Problemas comunes en `docs/troubleshooting.md`.
- Preflight operativo: `NODE_ENV=prod npm run ops:check`.

<a id="estructura"></a>
## 🗂️ Estructura

```text
zycryx-whatsapp-chat-bot-template/
├── database/
├── resources/
│   ├── data/
│   │   ├── game/
│   │   └── nsfw/
│   ├── media/
│       ├── audio/
│       ├── avatars/
│       ├── menus/
│       └── reaction-gifs/
│   └── text/
│       ├── messages/
│       └── prompts/
├── src/
│   ├── adapters/
│   │   └── drizzle/
│   ├── core/
│   ├── db/
│   │   ├── schema.ts
│   │   └── ensure-schema.ts
│   ├── domain/
│   ├── guards/
│   ├── lib/
│   ├── plugins/
│   │   ├── audio/
│   │   ├── config/
│   │   ├── converters/
│   │   ├── downloads/
│   │   ├── fun/
│   │   ├── games/
│   │   ├── group/
│   │   ├── hooks/
│   │   ├── info/
│   │   ├── menus/
│   │   ├── messages/
│   │   ├── nsfw/
│   │   ├── owner/
│   │   ├── random/
│   │   ├── rpg/
│   │   ├── search/
│   │   ├── stickers/
│   │   ├── subbots/
│   │   └── tools/
│   ├── ports/
│   ├── providers/
│   ├── services/
│   ├── types/
│   └── utils/
├── .env.example
├── drizzle.config.ts
├── package.json
├── README.md
└── tsconfig.json
```

| Ruta | Responsabilidad |
|---|---|
| `database/` | Bootstrap canónico PostgreSQL 18 para bases nuevas. |
| `resources/data/` | Datos estaticos y seeds readonly. |
| `resources/media/` | Imagenes, audios y recursos multimedia usados por plugins. |
| `resources/media/reaction-gifs/` | GIFs de reaccion guardados como MP4 para envio inline en WhatsApp. |
| `resources/text/` | Textos versionados: mensajes base y prompts. |
| `src/adapters/drizzle/` | Implementacion local de repositorios con Drizzle. |
| `src/core/` | Arranque, entorno, router, parser, handler, contexto y tareas. |
| `src/db/` | Cliente, definición Drizzle y verificación de schemas. |
| `src/domain/` | Modelos, defaults, mappers puros y reglas de negocio independientes de la persistencia. |
| `src/guards/` | Validaciones previas a ejecutar comandos. |
| `src/lib/` | Integraciones, loader de plugins, subbots, multimedia, logs y scraping. |
| `src/plugins/` | Comandos y hooks agrupados por familia. |
| `src/ports/` | Contratos de repositorios. |
| `src/providers/` | Providers por dominio para aislar APIs externas, fallbacks y respuestas crudas. |
| `src/services/` | Casos de uso y fachada de dominio. |
| `src/types/` | Tipos compartidos del runtime. |
| `src/utils/` | Helpers reutilizables. |

<a id="arquitectura"></a>
## 🏛️ Arquitectura

```mermaid
flowchart TD
    A["WhatsApp"] --> B["Baileys Socket"]
    B --> C["core/main.ts"]
    C --> D["lib/plugins.ts"]
    C --> E["core/handler.ts"]
    E --> F["lib/simple.ts"]
    E --> G["core/context-builder.ts"]
    E --> H["core/message-parser.ts"]
    H --> I["core/router.ts"]
    I --> J["guards"]
    J --> K["plugins por familia"]
    K --> L["services"]
    L --> Q["domain"]
    L --> M["ports/repositories.ts"]
    M --> Q
    M --> N["adapters/drizzle"]
    N --> P["PostgreSQL"]
    K --> R["lib/utils/apis"]
    K --> S["Respuesta WhatsApp"]
```

Componentes principales:

| Componente | Rol |
|---|---|
| `core/index.ts` | Punto de entrada. |
| `core/main.ts` | Inicializa Baileys, plugins, eventos, subbots y tareas. |
| `core/handler.ts` | Pipeline de mensajes, deduplicacion, parser, guards y ejecucion. |
| `core/context-builder.ts` | Construye permisos, metadata, bot config y settings de grupo. |
| `core/router.ts` | Resuelve comandos exactos, regex y custom prefixes. |
| `core/define-plugin.ts` | Factory para plugins nuevos. |
| `core/sdk-plugin.ts` | Factory recomendada para plugins nuevos y migrados. |
| `core/plugin-sdk.ts` | SDK interno: `sdk.content`, `sdk.http`, `sdk.reply`, providers y locks. |
| `core/group-events.ts` | Eventos de participantes del grupo. |
| `core/group-join-request.ts` | Solicitudes de ingreso y auto-accept. |
| `core/group-update-events.ts` | Cambios de nombre, descripcion y foto del grupo. |
| `core/group-metadata.ts` | Cache y refresco de metadata para eventos. |
| `core/group-antifake.ts` | Antifake para participantes agregados. |
| `core/group-welcome-bye.ts` | Mensajes de bienvenida y despedida. |
| `core/group-admin-events.ts` | Mensajes de promote/demote. |
| `core/message-log.ts` | Conteo y auditoria de mensajes de grupo. |
| `core/performance-logger.ts` | Logs `[PERF]` por etapas del pipeline. |
| `lib/plugins.ts` | Loader recursivo y hot reload de plugins. |
| `lib/logger.ts` | Logger con niveles configurables. |
| `lib/simple.ts` | Normalizacion de mensajes y helpers custom de `conn`. |
| `services/` | Capa de aplicacion usada por core/plugins. |
| `services/content.service.ts` | API oficial de mensajes, listas y templates. |
| `domain/` | Entidades, defaults y reglas puras compartidas por servicios, puertos y mappers. |
| `ports/repositories.ts` | Contratos de persistencia. |
| `adapters/drizzle/` | Repositorios PostgreSQL con Drizzle. |
| `providers/` | Integraciones por dominio para descargas, IA y conversion multimedia, con errores tipados y fallbacks. |

<a id="patrones"></a>
## 🧩 Patrones

### 🔌 Plugin Architecture

Los comandos viven como modulos independientes dentro de `src/plugins/<familia>`. Esto permite copiar la plantilla a otros bots y cambiar solo las familias necesarias.

`defineSdkPlugin` conserva la API compatible y genera metadata para el registro validado. Cada plugin obtiene un ID estable derivado de su ruta, una `feature` tipada y una politica de ejecucion. El registro candidato se valida completo antes de sustituir al activo; un hot reload invalido conserva la version anterior.

Perfiles de ejecucion disponibles:

| Perfil | Timeout base | Uso |
|---|---:|---|
| `fast` | 15 s | Comandos locales y respuestas simples. |
| `network` | 60 s | Consultas HTTP y APIs. |
| `owner-operation` | 2 min | Operaciones administrativas controladas. |
| `media` | 5 min | Descargas y conversion multimedia. |

El contexto incluye `pluginId`, `correlationId` y `signal`. La cancelacion es cooperativa: providers, HTTP o procesos largos deben observar el `AbortSignal` para detener trabajo subyacente.

### 🎯 Command Pattern

Cada plugin representa una accion ejecutable. El router traduce un mensaje en un comando y el handler delega la ejecucion.

### 🚦 Router / Dispatcher

`CommandRouter` usa mapa para comandos exactos y listas para regex/custom prefixes. Esto mantiene el dispatch separado del procesamiento de mensajes.

### 🛡️ Guard Pattern

Los guards validan antes del plugin:

- owner global o persistido del subbot;
- admin de grupo;
- bot admin;
- grupo o privado;
- modo publico/privado;
- usuario baneado;
- NSFW y horario;
- limites, dinero y nivel;
- modo admin del grupo.

Los guards de acceso se ejecutan antes del guard de recursos. Este ultimo solo valida; no descuenta saldos. Tras aprobar todas las restricciones, el handler crea una reserva atomica en PostgreSQL, ejecuta el plugin y confirma el cobro al completar. Los fallos y timeouts liberan la reserva, y una tarea programada recupera reservas vencidas tras reinicios abruptos.

### 🔗 Interceptor Pipeline

Los hooks legacy `before` siguen soportados mediante un adaptador. El contrato nuevo usa interceptores con fase (`security`, `conversation`, `post`), prioridad, aplicabilidad y politica de error (`fail-open`, `fail-closed`, `report-only`). Los resultados son tipados: `continue`, `handled`, `reject` o `error`.

El orden general es: normalizacion, seguridad/conversacion, routing, autorizacion, reserva de recursos, ejecucion, confirmacion y telemetria.

### 🔄 Ports & Adapters

La persistencia sigue esta ruta:

```text
plugin/core -> service -> repository port -> adapter -> storage
```

Actualmente:

- Drizzle + PostgreSQL es la unica implementacion soportada.
- Los puertos siguen existiendo para mantener servicios testeables y evitar SQL directo en plugins.
- Los tipos persistidos se convierten mediante mappers de adapter hacia modelos de `src/domain`; las reglas de negocio no dependen del schema Drizzle.

### 🧬 Repository Pattern

Los repositorios Drizzle estan separados por agregado:

```text
src/adapters/drizzle/
├── api-token.repository.ts
├── audio-response.repository.ts
├── character.repository.ts
├── chat-memory.repository.ts
├── chat.repository.ts
├── database.repository.ts
├── group-settings.repository.ts
├── message-log.repository.ts
├── message.repository.ts
├── report.repository.ts
├── stats.repository.ts
├── subbot.repository.ts
├── user-group-role.repository.ts
├── user-wallet.repository.ts
├── user.repository.ts
└── repositories.ts
```

Los agregados que necesitan transformar filas de Drizzle usan archivos `*.mapper.ts` junto a su repositorio. Los contratos de entrada y salida se concentran en `src/ports/repositories.ts` y reutilizan los modelos de `src/domain`.

### 🧱 Context Builder

El handler no reparte calculos de permisos por todo el proyecto. `context-builder.ts` centraliza sender, JID/LID, admin, bot admin, owner, subbot config, metadata y group settings.

Los hooks `before` reciben un contexto enriquecido (`BeforePluginContext`) con:

- `metadata` y `participants`;
- `isAdmin`, `isBotAdmin`, `isOwner` e `isGroup`;
- `botConfig`;
- `groupSettings`;
- `chatId` y `sender`.

Esto evita que hooks como antilink, audios, autolevelup, antiprivado y VirusTotal consulten de nuevo la base o pidan metadata del grupo.

### 🧭 Event Modules

Los eventos de WhatsApp estan separados del pipeline de mensajes:

```text
participantsUpdate -> group-events.ts
groupsUpdate       -> group-update-events.ts
groupJoinRequest   -> group-join-request.ts
callUpdate         -> call-events.ts
messageUpdate      -> message-update.ts
```

Los helpers de eventos viven en modulos pequenos:

```text
group-metadata.ts
group-event-settings.ts
group-participant-resolver.ts
group-antifake.ts
group-welcome-bye.ts
group-admin-events.ts
group-update-notifications.ts
group-bot-identity.ts
group-event-resources.ts
```

### ⏱️ Scheduled Tasks

Las tareas recurrentes viven fuera del pipeline de mensajes: expiracion de grupos, reportes pendientes y limpieza de memoria.

### 🧼 Strong Typing Boundary

El proyecto fue limpiado para no usar `any` ni `@ts-ignore` en `src/**/*.ts`. Las integraciones dinamicas usan `unknown`, contratos parciales y guards/casts localizados.

<a id="flujo-de-ejecucion"></a>
## 🔁 Flujo De Ejecucion

```text
WhatsApp message
  -> Baileys messages.upsert
  -> handler deduplica y descarta mensajes antiguos
  -> smsg normaliza mensaje y helpers
  -> context-builder precarga contexto
  -> upsert chat / contador / usuario
  -> message-parser extrae prefijo, comando, args y text
  -> before hooks con contexto ya precargado
  -> router resuelve plugin
  -> guards validan permisos y recursos
  -> plugin ejecuta accion
  -> service aplica caso de uso
  -> repository port consulta/persiste
  -> adapter Drizzle
  -> respuesta vuelve a WhatsApp
```

<a id="plugins"></a>
## 🔌 Plugins

La forma recomendada para nuevos plugins es `defineSdkPlugin`:

```ts
import {defineSdkPlugin} from '../../core/sdk-plugin.js';

export default defineSdkPlugin({
    command: ['ping', 'p'],
    help: ['ping'],
    tags: ['main'],
    async execute(_m, {sdk}) {
        await sdk.reply.text('pong');
    },
});
```

El SDK expone helpers estables para no importar utilidades sueltas desde cada plugin:

| Helper | Uso |
|---|---|
| `sdk.content` | Leer y renderizar mensajes desde `resources/data/messages.json`. |
| `sdk.reply` | Respuestas comunes, errores de usuario, errores internos, usage y reacciones. |
| `sdk.http` | HTTP centralizado con timeout y errores normalizados. |
| `sdk.providers` | Ejecutar fallbacks por proveedor. |
| `sdk.createUserLocks` | Locks por usuario para procesos largos. |
| `sdk.sendMessage` / `sdk.sendFile` | Envio quoted al chat actual. |

`definePlugin` sigue soportado para compatibilidad legacy, pero no es el patron recomendado para comandos nuevos.

Tambien se soportan hooks previos:

```ts
import {definePlugin} from '../../core/define-plugin.js';

export default definePlugin({
    tags: ['group'],
    runBeforeOnCommand: true,
    async before(m, {conn, groupSettings, isAdmin, isBotAdmin, metadata}) {
        if (!m.isGroup) return;
        if (!groupSettings.antilink) return;
    },
    async execute() {
        return;
    },
});
```

Metadata soportada:

| Propiedad | Uso |
|---|---|
| `command` | String, array o regex. |
| `customPrefix` | Activador especial sin prefijo normal. |
| `help` | Texto usado por menus. |
| `tags` | Categoria del comando. |
| `owner` | Requiere owner del bot/subbot. |
| `admin` | Requiere admin de grupo. |
| `botAdmin` | Requiere que el bot sea admin. |
| `group` | Solo grupos. |
| `private` | Solo privado. |
| `register` | Requiere usuario registrado. |
| `limit`, `money`, `level` | Requisitos de economia/RPG. |
| `before` | Hook previo. |
| `runBeforeOnCommand` | Permite ejecutar `before` tambien en comandos. |

<a id="base-de-datos"></a>
## 🗄️ Base De Datos

La fuente tipada vive en `src/db/schema.ts` y el bootstrap ejecutable en `database/schema.sql`. La normalización separa identidad, economía, grupos, runtime, contenido, IA, auditoría, seguridad y sesiones. No se guardan listas en arrays/JSON ni se repiten columnas por cada recurso, owner, prefijo, saludo o mensaje de memoria.

| Schema | Responsabilidad | Tablas principales |
|---|---|---|
| `bot_identity` | Usuario canónico e información dependiente | `users`, `user_identities`, `user_profiles`, `user_registrations`, `user_bans`, `user_warnings`, `user_progress`, `user_cooldowns`, `marriages`, `marriage_members`, `marriage_requests` |
| `bot_economy` | Catálogo y contabilidad | `resources`, `financial_accounts`, `account_balances`, `financial_operations`, `ledger_entries`, `bank_loans`, `bank_loan_payments`, `command_resource_reservations`, `command_reservation_items` |
| `bot_groups` | Chats y módulos configurables | `chats`, `group_settings`, ajustes por módulo, `group_command_access_rules`, `group_censored_users`, `user_group_roles`, `user_group_activity_counters` |
| `bot_runtime` | Instancias y operación del bot | `subbots`, `subbot_prefixes`, `subbot_owners`, `bot_chat_memberships`, `reports`, `report_deliveries`, `stats` |
| `bot_content` | Contenido dinámico y mercado RPG | `characters`, `character_ownerships`, `character_price_events`, `character_market_listings`, `audio_responses`, `audio_response_assets` |
| `bot_ai` | Memoria conversacional ordenada | `chat_memory`, `chat_memory_messages` |
| `bot_audit` | Registro auditable | `message_logs` |
| `bot_security` | Secretos cifrados y versiones de clave | `encryption_key_versions`, `encrypted_secrets` |
| `bot_sessions` | Estado cifrado de Baileys | `auth_sessions`, `auth_credentials`, `signal_keys` |

### Modelo relacional

```mermaid
erDiagram
    USERS ||--o{ USER_IDENTITIES : has
    USERS ||--o| USER_PROFILES : has
    USERS ||--o| USER_REGISTRATIONS : registers
    USERS ||--o{ FINANCIAL_ACCOUNTS : owns
    FINANCIAL_ACCOUNTS ||--o{ ACCOUNT_BALANCES : contains
    RESOURCES ||--o{ ACCOUNT_BALANCES : classifies
    FINANCIAL_OPERATIONS ||--o{ LEDGER_ENTRIES : groups
    FINANCIAL_ACCOUNTS ||--o{ LEDGER_ENTRIES : receives
    RESOURCES ||--o{ LEDGER_ENTRIES : denominates
    GROUP_SETTINGS ||--o| GROUP_MODERATION_SETTINGS : configures
    GROUP_SETTINGS ||--o{ GROUP_GREETINGS : configures
    GROUP_SETTINGS ||--o{ GROUP_COMMAND_ACCESS_RULES : overrides
    SUBBOTS ||--o{ SUBBOT_PREFIXES : exposes
    SUBBOTS ||--o{ SUBBOT_OWNERS : authorizes
    SUBBOTS ||--o{ BOT_CHAT_MEMBERSHIPS : joins
    CHATS ||--o{ BOT_CHAT_MEMBERSHIPS : contains
    CHARACTERS ||--o| CHARACTER_OWNERSHIPS : owned_by
    CHARACTERS ||--o{ CHARACTER_PRICE_EVENTS : prices
    CHARACTERS ||--o{ CHARACTER_MARKET_LISTINGS : lists
    CHAT_MEMORY ||--o{ CHAT_MEMORY_MESSAGES : contains
    AUDIO_RESPONSES ||--o{ AUDIO_RESPONSE_ASSETS : uses
    REPORTS ||--|| REPORT_DELIVERIES : dispatches
    AUTH_SESSIONS ||--|| AUTH_CREDENTIALS : authenticates
    AUTH_SESSIONS ||--o{ SIGNAL_KEYS : contains
    ENCRYPTION_KEY_VERSIONS ||--o{ ENCRYPTED_SECRETS : encrypts
```

Detalles importantes:

- `users` conserva sólo la identidad interna y el nombre visible; teléfono, LID y username son filas únicas en `user_identities`.
- Los saldos son filas `(account_id, resource_code)`. Añadir un recurso no exige alterar tablas ni duplicar lógica wallet/bank/reserve.
- `financial_operations` agrupa cada caso de uso y `ledger_entries` conserva importes y saldo resultante para auditoría.
- Los ajustes de grupo se dividen por módulo. `group_settings` es la raíz y las reglas de familias/comandos sólo almacenan overrides.
- Owners, prefixes, recursos de reservas, URLs de audio e historial de IA son relaciones uno-a-muchos ordenadas.
- El precio y propietario actuales de un personaje se separan de su historial de precios y publicaciones de mercado.
- Las entregas de reportes forman un outbox durable con lease, reintentos y `FOR UPDATE SKIP LOCKED`.
- Las credenciales de Baileys y cada Signal key se cifran con AES-256-GCM y AAD; nunca se persiste la clave maestra.
- PostgreSQL 18 aporta `uuidv7()` y la unicidad temporal `WITHOUT OVERLAPS` para solicitudes matrimoniales vigentes.

### Bootstrap de Supabase

La rama requiere una base vacía con PostgreSQL 18+. Usa una sola de estas opciones:

```bash
npm run db:setup
# o
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/schema.sql
```

En Supabase puedes ejecutar el archivo completo desde SQL Editor. Para `db:setup`/`psql`, usa la conexión directa de la base y no el pooler en modo transacción. El script es transaccional, comprueba la versión, crea los nueve schemas, catálogos, claves foráneas, checks, índices, triggers de `updated_at`, capitalización inicial del reserve y seguridad RLS. `anon` y `authenticated` no reciben permisos; `service_role` los recibe si el rol existe.

Para evolucionar una instalación existente y luego comprobarla:

```bash
npm run db:check
npm run db:studio
```

### 🔑 Secretos y sesiones cifradas

Los secretos externos pueden vivir en el gestor de secretos del entorno o en `bot_security.encrypted_secrets`. El valor se cifra en la aplicación con AES-256-GCM; PostgreSQL sólo recibe `ciphertext`, IV, auth tag y versión de clave.

Genera una clave aleatoria de 32 bytes y guárdala fuera de la base:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
npm run secrets:set -- nombre-del-token valor-secreto
```

Argon2id está disponible como alternativa de derivación desde passphrase. Su coste se paga una vez por proceso y la clave derivada queda en memoria; para producción automatizada se recomienda la clave aleatoria base64. Consulta `docs/baileys-database-sessions.md` para rotación, migración y recuperación.

<a id="recursos"></a>
## 📦 Recursos

`resources/data` contiene recursos base readonly:

- `resources/data/audios.json`;
- `resources/data/characters.json`;
- `resources/data/game/*.json`;
- `resources/data/nsfw/*.json`;
- `resources/data/messages.json`, `resources/data/prompts.json` y `resources/data/reactions.json` para manifiestos de prompts, mensajes, textos visibles de plugins y reacciones.

`resources/text` contiene todos los recursos `.txt` versionados:

- `resources/text/messages/*.txt`;
- `resources/text/prompts/*.txt`.

`resources/media` contiene medios locales usados por plugins y configuracion:

- `resources/media/avatars/*.png`;
- `resources/media/audio/seed/*`;
- `resources/media/audio/custom/*`;
- `resources/media/menus/*.jpg`;
- `resources/media/reaction-gifs/**/*.mp4`.

Los audios personalizados ya no se escriben en `resources/data/audios.json`. El flujo actual es:

```text
resources/data/audios.json -> seed base
audio_responses      -> overrides, altas y bajas dinamicas
resources/media/audio/custom -> archivos agregados por addaudios
audio-response.service.ts -> merge de seed + DB
```

Los comandos `addaudios` y `delaudios` persisten cambios en PostgreSQL mediante `audio_responses`.

Los comandos de reacciones multimedia se describen en `resources/data/reactions.json`. El plugin genérico `msg-gif-reactions.ts` resuelve aliases, carpetas, captions y variantes públicas/NSFW. Solo `msg-gif-tr.ts` (tríos) y `msg-gif-ogi.ts` (orgías) se conservan aparte por sus reglas especiales de múltiples objetivos.

Cada reacción puede tener una carpeta pública y otra `nsfw/`. Los GIFs públicos están activos por defecto; la variante explícita solo se usa cuando `nsfw-gifs` está habilitado para el nivel del participante. Si una reacción no tiene versión pública y el acceso NSFW está desactivado, el comando no responde para evitar confundir a los participantes.

<a id="observabilidad"></a>
## 📊 Observabilidad

El logger soporta niveles configurables:

```env
LOG_LEVEL=command
PERF_LOG_THRESHOLD_MS=750
```

Niveles disponibles:

| Nivel | Uso |
|---|---|
| `error` | Solo errores. |
| `warn` | Advertencias y errores. |
| `info` | Estado operativo general. |
| `command` | Incluye comandos recibidos. |
| `debug` | Incluye performance, eventos de grupo y diagnostico. |
| `trace` | Maximo detalle. |

Para diagnosticar latencia:

```env
LOG_LEVEL=debug
PERF_LOG_THRESHOLD_MS=300
```

<a id="secretos"></a>
## 🔐 Secretos Y Seguridad

Este repositorio esta pensado para ser publico. No versionar:

- `.env.local`, `.env.dev`, `.env.test`, `.env.prod`;
- carpetas legacy de WhatsApp (`BotSession/`, `jadibot/`);
- tokens reales de APIs;
- backups de base de datos;
- archivos temporales.

Usa `.env.example` como contrato publico y `.env.local` para valores reales. Si GitHub bloquea un push por secret scanning, elimina el secreto del historial antes de subir o rota el token.

Recomendaciones operativas:

- Trata el dump de DB, `BotSession/`, `jadibot/` y la clave maestra como credenciales; guarda la clave separada del dump.
- Manten `BOT_OWNER_NUMBERS` limitado a operadores de confianza. Los comandos de ejecucion remota, mantenimiento del proceso y respaldo de credenciales no se exponen por WhatsApp; consulta `docs/owner-security.md`.
- Corre el bot con un usuario de sistema dedicado y sin privilegios; PostgreSQL sin exposicion publica.
- Los guards de permisos (`owner`, `admin`, `group`, access modes por familia) deben declararse en la metadata del plugin, no re-implementarse a mano.
- Checklist completo de produccion en `docs/deployment.md`.

<a id="validacion"></a>
## 🧪 Validacion

Comandos recomendados antes de subir cambios:

```bash
npm run typecheck
npm run build
npm test
```

Para confirmar que no se reintrodujo deuda de tipado:

```bash
rg -n '\bany\b|@ts-ignore' src --glob '*.ts'
```

Para revisar el estado de migracion al SDK:

```bash
npm run test:p0
rg -l "message-template\.js" src/plugins
rg -l "http-client\.js" src/plugins
```

Para ejecutar local desde build:

```bash
npm run start:local
```

En una instalación nueva ejecuta `npm run db:setup` una sola vez. En instalaciones existentes usa `npm run db:check`; esta rama no ofrece upgrades incrementales sobre esquemas legacy.

O si ya compilaste:

```bash
npm run serve:local
```

<a id="auditoria-tecnica"></a>
## 🔎 Auditoria Tecnica

Barrido de referencia: 2026-07-01. El estado medido del codigo confirma que la arquitectura actual ya esta mayormente alineada con los roadmaps recientes:

| Indicador | Resultado |
|---|---:|
| Archivos TypeScript en `src/plugins` | 188 |
| Plugins con `defineSdkPlugin` | 157 |
| Plugins con `definePlugin` | 0 |
| Imports directos de `message-template.js` en plugins | 0 |
| Imports directos de `http-client.js` en plugins | 0 |
| Coincidencias de `any`, `@ts-ignore` o `@ts-expect-error` en `src/**/*.ts` | 0 |
| ADRs registrados en `docs/adr` | 5 |
| Suites unitarias en `tests` | 20 |

Hallazgos y buenas practicas vigentes:

- El core mantiene una separacion sana entre handler, contexto, router, guards, eventos, runtime state, servicios y adapters.
- El SDK de plugins ya es el contrato operativo: nuevos comandos deben entrar por `defineSdkPlugin`, `sdk.reply`, `sdk.content`, `sdk.http`, providers y locks.
- La fachada `core/runtime-state.ts` y `branding` por contexto reducen el acoplamiento a `globalThis`.
- Los providers ya cubren descargas, IA, conversion multimedia y stickers avanzados con errores tipados, timeout y retry opt-in.
- El estado efimero repetido debe seguir pasando por `src/lib/ephemeral-state.ts` o `src/lib/user-request-locks.ts`; los mapas/timers restantes son caches, infraestructura, delays operativos o indices locales aceptados.
- `src/lib/scraper.ts`, `src/lib/ezgif-convert.ts`, `src/lib/webp2mp4.ts` y `src/lib/http-client.ts` son excepciones internas conocidas para HTTP especial; los plugins no deben importar `fetch`, `axios`, `node-fetch` ni `http-client` directamente.
- El script `clean` debe mantenerse portable porque `build` forma parte del flujo recomendado de produccion en Linux, Windows y macOS.

Oportunidades de optimizacion detectadas:

| Prioridad | Area | Recomendacion |
|---|---|---|
| P1 | Archivos temporales | Migrar comandos que escriben en `./tmp` (por ejemplo reconocimiento musical) a `fs.promises.mkdtemp`, `try/finally` y rutas generadas por helper para evitar archivos huerfanos ante error. |
| P1 | Delays operativos | Crear un helper compartido `delay(ms)` para plugins de grupo/stickers/subbots que hoy declaran delays locales. No es urgente, pero reduce duplicacion. |
| P1 | Providers | Agregar metricas por provider: candidato usado, motivo de fallo dominante, duracion y retry aplicado. Esto ayuda a detectar APIs externas inestables sin leer logs crudos. |
| P2 | P0 architecture tests | Ampliar gradualmente la compuerta de mapas/timers manuales a nuevas familias cuando se migren mas flujos a `ephemeral-state`. |
| P2 | Pruebas de plugins complejos | Cubrir comandos RPG, grupo y owner con mocks de servicios/repositorios para validar permisos, dinero, limites y mensajes sin conectar Baileys. |
| P2 | i18n | Convertir `resources/data/messages.json` en estructura por locales con fallback (`es` como default) y tests de keys requeridas. |
| P3 | Runtime multi-proceso | Mantener single-process por ahora. Si se escala, mover cooldowns, juegos, pending actions y deduplicacion a Redis o cache compatible. |

Arquitecturas futuras razonables:

| Opcion | Cuando conviene | Cambios principales |
|---|---|---|
| Modular monolith actual | Un bot por numero, despliegue simple, plugins versionados con el repo. | Mantener SDK, services, providers, Drizzle y PM2/systemd. Es el camino recomendado hoy. |
| Worker + cache externa | Cuando se requiera alta disponibilidad o multiples procesos. | Externalizar estado efimero a Redis, locks distribuidos, colas de trabajo y deduplicacion compartida. |
| Plataforma multi-tenant de bots | Cuando varios bots compartan core pero tengan marca, owners y plugins habilitados distintos. | Separar tenant config, branding, recursos, providers y permisos por bot; schema por tenant o tablas con `bot_id`. |
| Event-driven para tareas pesadas | Cuando descargas, conversiones o IA bloqueen demasiado el ciclo de mensajes. | Mover descargas/conversiones a cola con workers, estados consultables y callbacks/respuestas diferidas. |

<a id="roadmap-y-analisis"></a>
## 🗺️ Roadmap y Analisis

Documentacion tecnica viva:

| Documento | Uso |
|---|---|
| `docs/architecture-analysis.md` | Fotografia arquitectonica actual, riesgos, deuda y buenas practicas. |
| `docs/architecture-roadmap.md` | Roadmap por prioridades P0-P7. |
| `docs/improvement-roadmap.md` | Backlog interno de mejoras y refactors. |
| `docs/adr/` | Decisiones arquitectonicas aceptadas: branding por contexto, runtime state, providers, catalogo y estado efimero. |
| `docs/baileys-connection.md` | Flujo de conexion, vinculacion, sesiones y reconexion con Baileys. |
| `docs/baileys-database-sessions.md` | Cifrado, rendimiento, migración, rotación y recuperación de sesiones. |
| `docs/environment-variables.md` | Referencia completa de variables de entorno. |
| `docs/adding-commands.md` | Guia paso a paso para agregar comandos nuevos. |
| `docs/deployment.md` | Despliegue en servidor, PM2, backups y checklist de produccion. |
| `docs/operations-runbook.md` | Rutina operativa, preflight, actualizacion segura e incidentes comunes. |
| `docs/operational-dependencies.md` | Dependencias del sistema por funcionalidad afectada. |
| `docs/troubleshooting.md` | Problemas comunes de conexion, DB, comandos y rendimiento. |
| `docs/data-resources.md` | Politica de recursos estaticos, multimedia y datos mutables. |
| `docs/http-client-exceptions.md` | Excepciones justificadas al HTTP client centralizado. |
| `docs/owner-security.md` | Seguridad operativa de comandos owner sensibles. |

Resumen actual:

| Fase | Avance | Estado |
|---|---:|---|
| P0 - SDK/contenido | 100% | Cerrado como contrato base. |
| P1 - Providers | 100% | Cerrado: descargas, IA, conversores, stalkers y stickers avanzados tienen providers. |
| P2 - Testing nucleo | 100% | Cerrado para router, guards, context builder y servicios. |
| P3 - Backend adapter | Cancelado | Descartado: el bot se conecta directamente a PostgreSQL. |
| P4 - Seguridad owner | 100% | Cerrado para comandos sensibles auditados. |
| P5 - Runtime/escalabilidad | 100% | Cerrado para helpers compartidos y excepciones documentadas. |
| P6 - i18n/contenido | 25% | Base lista en `messages.json`; faltan locales. |
| P7 - Catalogo comandos/help | 100% | Cerrado con catalogo, ayuda y auditoria. |

<a id="estado-actual"></a>
## 📌 Estado Actual

- Persistencia migrada a Drizzle ORM.
- Repositorios Drizzle separados por agregado.
- Capa `src/domain` separada para modelos y reglas de usuarios, grupos, subbots, audios, personajes y operaciones.
- Plugins y core consumen servicios/puertos, no SQL directo.
- Secretos runtime cifrados y versionados en `bot_security.encrypted_secrets`.
- Sesiones Baileys cifradas en PostgreSQL, con cache de Signal keys en memoria, write-behind y lease entre réplicas.
- `audio_responses` almacena audios dinamicos.
- Backend REST/GraphQL descartado; la persistencia soportada es PostgreSQL directo con Drizzle.
- Loader de plugins recursivo con soporte para carpetas por familia.
- Plugins organizados en 19 familias.
- SDK interno disponible para plugins nuevos y migrados.
- Todos los plugins usan `defineSdkPlugin`; `definePlugin`, `message-template` y HTTP directo quedaron fuera de `src/plugins`.
- Reglas normalizadas por familia (`enabled` y `all`/`admin`/`superadmin`/`owner`) aplicadas por `feature-access.guard.ts` y configurables con `enable`/`disable`.
- Roles de admins por grupo en `user_group_roles`, sincronizados al arrancar (`startup-admin-sync.ts`) y en eventos de grupo.
- `test:p0` evita que plugins migrados al SDK vuelvan a importar helpers legacy de mensajes o HTTP.
- `content.service` centraliza mensajes, listas y templates desde `resources/data/messages.json`.
- `src/providers/downloads/youtube.provider.ts` centraliza busqueda, seleccion de calidad, descarga y fallbacks de YouTube.
- `descargas-play.ts` y `descargas-play2.ts` consumen el provider de YouTube; `youtube-download.helpers.ts` queda como re-export temporal.
- `src/providers/downloads/spotify.provider.ts` centraliza busqueda y descarga de Spotify para `descargas-spotify.ts`.
- `src/providers/downloads/tiktok.provider.ts` centraliza descarga y busqueda de TikTok para `descargas-tiktok.ts` y `descargas-tiktoksearch.ts`.
- `src/providers/downloads/threads.provider.ts` centraliza descargas de Threads para `descargas-threads.ts`.
- `src/providers/downloads/instagram.provider.ts` y `src/providers/downloads/facebook.provider.ts` centralizan descargas sociales para `descargas-ig.ts` y `descargas-fb.ts`.
- `src/providers/downloads/mediafire.provider.ts` y `src/providers/downloads/drive.provider.ts` centralizan descargas de archivos para `descargas-mediafire.ts` y `descargas-drive.ts`.
- `src/providers/provider.types.ts` define el contrato inicial `ProviderResult`/`ProviderFailureReason`.
- `test:providers` valida el bloque inicial de providers.
- Eventos de grupo separados por modulo: participantes, actualizaciones, solicitudes, recursos, metadata y mensajes auxiliares.
- Hooks `before` optimizados con contexto compartido para evitar lecturas repetidas de settings, config y metadata.
- Comandos de grupo frecuentes reutilizan `metadata`, `participants` y `groupSettings` del contexto.
- Handler reducido a orquestacion del pipeline de mensajes, con deduplicacion, performance y logging separados.
- Observabilidad configurable con `LOG_LEVEL`.
- VirusTotal integrado como hook configurable.
- `src/**/*.ts` sin `any` ni `@ts-ignore`.
- Recursos de comandos protegidos por reservas atomicas, confirmacion en exito y recuperacion de pendientes vencidas.
- Registry de plugins validado y hot reload con rollback, debounce y desactivado en produccion.
- Pipeline compatible con interceptores tipados, perfiles de timeout, `AbortSignal` y locks por namespace.
- Build, typecheck y suite de pruebas pasan.
- Base estrictamente normalizada en nueve schemas, con `schema.ts` y bootstrap alineados para PostgreSQL 18/Supabase.

## 🧭 Mejoras Pendientes Registradas

| Prioridad | Mejora | Avance | Estado |
|---|---|---:|---|
| P1 | Completar providers de descargas: Spotify, TikTok, Threads, Instagram, Facebook, MediaFire y Drive. | 100% | Bloque principal cerrado. |
| P1 | Normalizar errores, timeouts y retries de providers. | 25% | Mantenimiento incremental sobre contrato base cerrado. |
| P1 | Ampliar `test:providers` con casos sin red para fallback y parseo. | 30% | Fallback comun cubierto; ampliar por proveedor cuando cambien APIs. |
| P1/P0 | Migrar `downloads` al SDK mientras se extraen providers. | 100% | Cerrado. |
| P0 deuda | Migrar familias legacy restantes al SDK. | 100% | Cerrado. |
| P3 | Backend REST/GraphQL. | Cancelado | Descartado por decision arquitectonica; usar PostgreSQL directo. |
| P5 | Centralizar cooldowns, pending actions, locks y fachadas de runtime global. | 100% | Cerrado para helpers compartidos y excepciones documentadas. |
| P6 | Preparar i18n con locales y fallback en `content.service`. | 25% | Base de contenido lista. |
| P7 | Crear `resources/data/commands.json` y ayuda `/<comando> --help`. | 100% | Cerrado con auditoria documental. |

## ✅ Buenas Practicas Para Nuevos Bots

- Copiar `.env.example` y completar secretos solo en archivos ignorados.
- Mantener PostgreSQL directo con Drizzle como persistencia oficial.
- Crear nuevos comandos con `defineSdkPlugin`.
- Ubicar cada plugin dentro de su familia.
- Usar servicios existentes antes de crear nuevos accesos a datos.
- No agregar SQL directo en plugins.
- No importar `message-template` ni `http-client` directamente en plugins nuevos o migrados.
- No escribir recursos mutables dentro de `resources/data`.
- Ejecutar `typecheck`, `build`, `npm test` y busqueda de `any/@ts-ignore` antes de subir.
- Documentar APIs externas nuevas en `.env.example`.
