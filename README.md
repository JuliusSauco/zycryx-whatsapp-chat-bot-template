# 🤖 Zycryx WhatsApp Chat Bot Template

![Tecnologias principales](https://skillicons.dev/icons?i=typescript,nodejs,npm,postgres,git&theme=dark)

![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![Baileys](https://img.shields.io/badge/Baileys-7.x-25D366?logo=whatsapp&logoColor=white)
![Drizzle](https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle&logoColor=111)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-4169E1?logo=postgresql&logoColor=white)
![npm](https://img.shields.io/badge/npm-package-CB3837?logo=npm&logoColor=white)

Plantilla modular para construir bots de WhatsApp con TypeScript, Baileys, Drizzle ORM y PostgreSQL. Esta base esta pensada para reutilizar core, arquitectura, persistencia, guards, subbots, observabilidad y utilidades entre varios proyectos, cambiando marca, comandos, textos, recursos multimedia, owners y APIs externas.

El proyecto esta orientado a capas: los plugins no deberian consultar la base directamente; pasan por servicios, puertos y adapters. El adapter estable es Drizzle + PostgreSQL. El adapter backend REST/GraphQL existe como scaffold preparado para un contrato futuro.

## 📚 Contenido

- [✨ Caracteristicas](#caracteristicas)
- [🧰 Tecnologias](#tecnologias)
- [📋 Requisitos](#requisitos)
- [⚡ Instalacion](#instalacion)
- [⚙️ Configuracion](#configuracion)
- [📜 Scripts](#scripts)
- [🗂️ Estructura](#estructura)
- [🏛️ Arquitectura](#arquitectura)
- [🧩 Patrones](#patrones)
- [🔁 Flujo De Ejecucion](#flujo-de-ejecucion)
- [🔌 Plugins](#plugins)
- [🗄️ Base De Datos](#base-de-datos)
- [📦 Recursos](#recursos)
- [📊 Observabilidad](#observabilidad)
- [🔐 Secretos](#secretos)
- [🧪 Validacion](#validacion)
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
- Puertos de repositorio para desacoplar servicios del adapter concreto.
- Scaffold de backend REST/GraphQL futuro con `DATA_SOURCE=backend`.
- Migraciones versionadas y script `db:ensure-schema`.
- Soporte para `DB_SCHEMA` usando `search_path`.
- Subbots con sesiones independientes.
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
| Drizzle ORM | Acceso tipado a PostgreSQL y migraciones. |
| PostgreSQL | Persistencia local. |
| drizzle-kit | Generacion, migracion y Drizzle Studio. |
| tsx | Ejecucion TypeScript en desarrollo. |
| Pino | Logger silencioso usado internamente por Baileys. |
| HTTP client centralizado | Consumo de APIs externas desde SDK, providers y librerias internas. |
| Axios / node-fetch | Compatibilidad interna en scrapers especiales documentados. |
| FFmpeg | Procesamiento multimedia. |
| Jimp / node-webpmux / wa-sticker-formatter | Imagenes y stickers. |
| cross-env | Scripts con variables de entorno. |

<a id="requisitos"></a>
## 📋 Requisitos

- Node.js 18 o superior.
- npm.
- PostgreSQL 14 o superior.
- FFmpeg instalado y disponible en PATH.
- Cuenta de WhatsApp para vincular el bot por QR o codigo.
- Variables de entorno en `.env.local`, `.env.dev`, `.env.test` o `.env.prod`.

<a id="instalacion"></a>
## ⚡ Instalacion

```bash
git clone <url-del-repositorio>
cd zycryx-whatsapp-chat-bot-template
npm install
```

Copia el entorno base:

```bash
cp .env.example .env.local
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Prepara la base de datos:

```bash
npm run db:migrate
```

Las migraciones no se ejecutan automaticamente al iniciar el bot. En deploys y ambientes compartidos ejecuta `npm run db:migrate` como paso previo controlado.

Si necesitas crear manualmente una base desde cero sin reproducir migraciones historicas, usa el script limpio:

```bash
psql -U <user> -d <database> -f database/schema.sql
```

Ese archivo contiene el schema actual con `CREATE TABLE` y `CREATE INDEX`. No lo mezcles con `npm run db:migrate` sobre la misma base salvo que marques/baselines las migraciones como aplicadas.

Ejecuta en desarrollo:

```bash
npm run dev
```

O compila y ejecuta la version local:

```bash
npm run start:local
```

Si estas levantando un ambiente nuevo y quieres build + migracion + arranque en un solo comando:

```bash
npm run start:local:migrate
```

En la primera ejecucion el bot pedira QR o codigo de emparejamiento. Las sesiones se guardan en carpetas locales y no deben versionarse.

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
BOT_OWNER_NUMBERS=573001112233,51999888777
BOT_FIXED_OWNER_JIDS=573001112233@s.whatsapp.net,51999888777@s.whatsapp.net
BOT_MOD_GROUP_ID=
DEFAULT_MENU_IMAGE=./resources/media/menus/Menu2.jpg

DATA_SOURCE=local
LOG_LEVEL=command
PERF_LOG_THRESHOLD_MS=750

BACKEND_PROTOCOL=rest
BACKEND_BASE_URL=
BACKEND_API_TOKEN=
BACKEND_TIMEOUT_MS=10000

API_BASE_URL=https://api.delirius.store
API_KEY=
PERPLEXITY_API_KEYS=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
VIRUSTOTAL_API_KEY=
VIRUSTOTAL_ENABLED=true

DB_HOST=localhost
DB_PORT=5432
DB_NAME=zycryx_bot
DB_USER=postgres
DB_PASSWORD=
DB_SCHEMA=public
```

Tambien puedes usar `DATABASE_URL`:

```env
DATABASE_URL=postgresql://usuario:password@localhost:5432/zycryx_bot
DB_SCHEMA=bot_dev
```

`DB_SCHEMA` se aplica al cliente y a Drizzle Kit mediante `search_path`. El proyecto trabaja sobre el schema configurado.

### 👑 Owners

`BOT_OWNER_NUMBERS` recibe numeros internacionales sin `+`, separados por coma:

```env
BOT_OWNER_NUMBERS=573001112233,51999888777
```

`BOT_FIXED_OWNER_JIDS` recibe JIDs completos. Estos owners pueden usar comandos marcados como `rowner`:

```env
BOT_FIXED_OWNER_JIDS=573001112233@s.whatsapp.net,51999888777@s.whatsapp.net
```

<a id="scripts"></a>
## 📜 Scripts

| Script | Descripcion |
|---|---|
| `npm run clean` | Elimina `dist` y `tsconfig.tsbuildinfo`. |
| `npm run build` | Limpia y compila TypeScript a `dist/`. |
| `npm run typecheck` | Valida tipos sin emitir archivos. |
| `npm test` | Ejecuta helpers, router, guards, context builder, servicios, seguridad, providers y P0. |
| `npm run test:helpers` | Pruebas de helpers compartidos. |
| `npm run test:router` | Pruebas del router de comandos. |
| `npm run test:guards` | Pruebas de guards y pipeline de permisos. |
| `npm run test:context` | Pruebas del context builder. |
| `npm run test:services` | Pruebas de servicios con repositorios mockeados. |
| `npm run test:security` | Pruebas de comandos sensibles y sanitizacion. |
| `npm run test:providers` | Pruebas de providers por dominio. |
| `npm run test:p0` | Compuerta P0 para plugins migrados al SDK. |
| `npm run db:generate` | Genera migraciones desde `src/db/schema.ts`. |
| `npm run db:ensure-schema` | Crea el schema configurado si no existe. |
| `npm run db:migrate` | Ejecuta `db:ensure-schema` y aplica migraciones. |
| `npm run db:setup` | Alias explicito de preparacion de base. |
| `npm run db:studio` | Abre Drizzle Studio. |
| `npm run dev` | Ejecuta local con `tsx watch`. |
| `npm run dev:dev` | Ejecuta con `NODE_ENV=dev`. |
| `npm run dev:test` | Ejecuta con `NODE_ENV=test`. |
| `npm run serve` | Ejecuta `dist` con `NODE_ENV=prod` sin migrar. |
| `npm run serve:local` | Ejecuta `dist` con `NODE_ENV=local` sin migrar. |
| `npm run serve:dev` | Ejecuta `dist` con `NODE_ENV=dev` sin migrar. |
| `npm run serve:test` | Ejecuta `dist` con `NODE_ENV=test` sin migrar. |
| `npm run serve:*:migrate` | Ejecuta migraciones y luego inicia `dist` para el ambiente indicado. |
| `npm run start` | Build + serve prod sin migrar. |
| `npm run start:local` | Build + serve local sin migrar. |
| `npm run start:dev` | Build + serve dev sin migrar. |
| `npm run start:test` | Build + serve test sin migrar. |
| `npm run start:*:migrate` | Build + migraciones + serve para el ambiente indicado. |
| `npm run bun:start:*` | Alternativas con Bun. |

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
│   │   ├── backend/
│   │   └── drizzle/
│   ├── core/
│   ├── db/
│   │   └── migrations/
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
| `database/` | SQL auxiliar para referencias y migracion legacy. |
| `resources/data/` | Datos estaticos y seeds readonly. |
| `resources/media/` | Imagenes, audios y recursos multimedia usados por plugins. |
| `resources/media/reaction-gifs/` | GIFs de reaccion guardados como MP4 para envio inline en WhatsApp. |
| `resources/text/` | Textos versionados: mensajes base y prompts. |
| `src/adapters/backend/` | Scaffold REST/GraphQL futuro. |
| `src/adapters/drizzle/` | Implementacion local de repositorios con Drizzle. |
| `src/core/` | Arranque, entorno, router, parser, handler, contexto y tareas. |
| `src/db/` | Cliente, schema y migraciones Drizzle. |
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
    L --> M["ports/repositories.ts"]
    M --> N["adapters/drizzle"]
    M --> O["adapters/backend"]
    N --> P["PostgreSQL"]
    O --> Q["REST/GraphQL futuro"]
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
| `ports/repositories.ts` | Contratos de persistencia. |
| `adapters/drizzle/` | Repositorios PostgreSQL con Drizzle. |
| `adapters/backend/` | Adapter pendiente de contrato externo. |
| `providers/downloads/youtube.provider.ts` | Provider inicial de YouTube: busqueda, descarga, calidad y fallbacks. |

<a id="patrones"></a>
## 🧩 Patrones

### 🔌 Plugin Architecture

Los comandos viven como modulos independientes dentro de `src/plugins/<familia>`. Esto permite copiar la plantilla a otros bots y cambiar solo las familias necesarias.

### 🎯 Command Pattern

Cada plugin representa una accion ejecutable. El router traduce un mensaje en un comando y el handler delega la ejecucion.

### 🚦 Router / Dispatcher

`CommandRouter` usa mapa para comandos exactos y listas para regex/custom prefixes. Esto mantiene el dispatch separado del procesamiento de mensajes.

### 🛡️ Guard Pattern

Los guards validan antes del plugin:

- owner o rowner;
- admin de grupo;
- bot admin;
- grupo o privado;
- modo publico/privado;
- usuario baneado;
- NSFW y horario;
- limites, dinero y nivel;
- modo admin del grupo.

### 🔄 Ports & Adapters

La persistencia sigue esta ruta:

```text
plugin/core -> service -> repository port -> adapter -> storage
```

Actualmente:

- `DATA_SOURCE=local`: Drizzle + PostgreSQL.
- `DATA_SOURCE=backend`: scaffold que falla de forma explicita hasta definir contrato REST/GraphQL.

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
├── message.repository.ts
├── report.repository.ts
├── stats.repository.ts
├── subbot.repository.ts
├── user-wallet.repository.ts
├── user.repository.ts
└── repositories.ts
```

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
  -> adapter Drizzle o backend futuro
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
| `rowner` | Requiere owner fijo. |
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

El schema vive en `src/db/schema.ts` y actualmente incluye:

- `usuarios`;
- `group_settings`;
- `chats`;
- `messages`;
- `subbots`;
- `characters`;
- `reportes`;
- `chat_memory`;
- `stats`;
- `api_tokens`;
- `audio_responses`.

Para una base nueva:

```bash
npm run db:migrate
```

El arranque del bot no aplica migraciones automaticamente. Esto evita que multiples replicas, reinicios o despliegues ejecuten cambios de schema sin control. La secuencia recomendada para dev/prod es:

```bash
npm run build
npm run db:migrate
npm run serve:dev
```

Para generar cambios de schema:

```bash
npm run db:generate
npm run db:migrate
```

Para inspeccion:

```bash
npm run db:studio
```

### 🧱 Bootstrap Manual Desde Cero

`database/schema.sql` es el script canónico para crear manualmente la estructura final en una base vacia. A diferencia de `src/db/migrations`, no contiene `ALTER ADD COLUMN`, `UPDATE` legacy ni pasos historicos.

Uso recomendado:

```bash
psql -U <user> -d <database> -f database/schema.sql
```

Usa este camino cuando quieras provisionar una base limpia manualmente. Usa `npm run db:migrate` cuando quieras que Drizzle controle el historial incremental de migraciones. No ejecutes ambos caminos sobre la misma base sin hacer baseline del historial.

### 🧬 Migracion Legacy

Si vienes de una base antigua creada antes de Drizzle:

```bash
psql "$DATABASE_URL" -f database/legacy-to-drizzle-baseline.sql
npm run db:migrate
```

No uses `database/legacy-to-drizzle-baseline.sql` en bases nuevas. Ese baseline existe para alinear tablas y columnas historicas sin chocar con la migracion inicial.

### 🔑 API Tokens

Los secretos externos pueden vivir en `.env.local` o en la tabla `api_tokens`, segun su naturaleza.

`api_tokens` usa:

```text
name      text primary key
token_b64 text not null
```

El servicio `api-token.service.ts` decodifica `token_b64` y mantiene cache en memoria.

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

Los comandos de reacciones multimedia se describen en `resources/data/reactions.json`. El plugin generico `msg-gif-reactions.ts` resuelve aliases, carpeta y caption desde ese manifiesto; `msg-gif-dp.ts` se conserva aparte porque el comando `trio` necesita reglas especiales de dos objetivos.

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
## 🔐 Secretos

Este repositorio esta pensado para ser publico. No versionar:

- `.env.local`, `.env.dev`, `.env.test`, `.env.prod`;
- sesiones de WhatsApp (`BotSession/`, `jadibot/`);
- tokens reales de APIs;
- backups de base de datos;
- archivos temporales.

Usa `.env.example` como contrato publico y `.env.local` para valores reales. Si GitHub bloquea un push por secret scanning, elimina el secreto del historial antes de subir o rota el token.

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

Recuerda ejecutar `npm run db:migrate` antes si hay migraciones pendientes.

O si ya compilaste:

```bash
npm run serve:local
```

<a id="roadmap-y-analisis"></a>
## 🗺️ Roadmap y Analisis

Documentacion tecnica viva:

| Documento | Uso |
|---|---|
| `docs/architecture-analysis.md` | Fotografia arquitectonica actual, riesgos, deuda y buenas practicas. |
| `docs/architecture-roadmap.md` | Roadmap por prioridades P0-P7. |
| `docs/improvement-roadmap.md` | Backlog interno de mejoras y refactors. |
| `docs/data-resources.md` | Politica de recursos estaticos, multimedia y datos mutables. |
| `docs/http-client-exceptions.md` | Excepciones justificadas al HTTP client centralizado. |
| `docs/owner-security.md` | Seguridad operativa de comandos owner sensibles. |

Resumen actual:

- P0 esta cerrado: SDK interno, `content.service`, migracion base y test arquitectonico.
- P1 esta en curso: `src/providers/downloads/youtube.provider.ts` ya centraliza YouTube y queda pendiente extraer Spotify, TikTok, Instagram, Facebook, MediaFire y Drive.
- P2 y P4 estan cerrados: pruebas de core y seguridad operativa owner.
- P3 queda desestimado hasta tener backend real con contrato versionado.
- P5, P6 y P7 quedan como mejoras posteriores: estado runtime/escalabilidad, i18n y catalogo documental de comandos con ayuda `--help`.

<a id="estado-actual"></a>
## 📌 Estado Actual

- Persistencia migrada a Drizzle ORM.
- Repositorios Drizzle separados por agregado.
- Plugins y core consumen servicios/puertos, no SQL directo.
- `api_tokens` migrado a Drizzle.
- `audio_responses` almacena audios dinamicos.
- Backend REST/GraphQL preparado como adapter pendiente, no activo por defecto.
- Loader de plugins recursivo con soporte para carpetas por familia.
- Plugins organizados en 19 familias.
- SDK interno disponible para plugins nuevos y migrados.
- 29 plugins usan `defineSdkPlugin`; el resto mantiene compatibilidad legacy con `definePlugin`.
- `test:p0` evita que plugins migrados al SDK vuelvan a importar helpers legacy de mensajes o HTTP.
- `content.service` centraliza mensajes, listas y templates desde `resources/data/messages.json`.
- `src/providers/downloads/youtube.provider.ts` centraliza busqueda, seleccion de calidad, descarga y fallbacks de YouTube.
- `descargas-play.ts` y `descargas-play2.ts` consumen el provider de YouTube; `youtube-download.helpers.ts` queda como re-export temporal.
- `test:providers` valida el bloque inicial de providers.
- Eventos de grupo separados por modulo: participantes, actualizaciones, solicitudes, recursos, metadata y mensajes auxiliares.
- Hooks `before` optimizados con contexto compartido para evitar lecturas repetidas de settings, config y metadata.
- Comandos de grupo frecuentes reutilizan `metadata`, `participants` y `groupSettings` del contexto.
- Handler reducido a orquestacion del pipeline de mensajes, con deduplicacion, performance y logging separados.
- Observabilidad configurable con `LOG_LEVEL`.
- VirusTotal integrado como hook configurable.
- `src/**/*.ts` sin `any` ni `@ts-ignore`.
- Build, typecheck y suite de pruebas pasan.

## 🧭 Mejoras Pendientes Registradas

| Prioridad | Mejora | Estado |
|---|---|---|
| P1 | Completar providers de descargas: Spotify, TikTok, Threads, Instagram, Facebook, MediaFire y Drive. | En curso despues de YouTube. |
| P1 | Normalizar errores, timeouts y retries de providers. | Pendiente. |
| P1 | Ampliar `test:providers` con casos sin red para fallback y parseo. | Pendiente. |
| P1/P0 | Migrar `downloads` al SDK mientras se extraen providers. | Pendiente gradual. |
| P0 deuda | Migrar familias legacy `messages`, `random`, `nsfw` y `audio` al SDK. | Pendiente. |
| P3 | Definir backend REST/GraphQL real para `DATA_SOURCE=backend`. | Desestimado hasta tener backend. |
| P5 | Centralizar cooldowns, pending actions, locks y fachadas de runtime global. | Pendiente. |
| P6 | Preparar i18n con locales y fallback en `content.service`. | Pendiente. |
| P7 | Crear `resources/data/commands.json` y ayuda `/<comando> --help`. | Registrado, no iniciado. |

## ✅ Buenas Practicas Para Nuevos Bots

- Copiar `.env.example` y completar secretos solo en archivos ignorados.
- Mantener `DATA_SOURCE=local` hasta que el backend tenga contrato estable.
- Crear nuevos comandos con `defineSdkPlugin`.
- Ubicar cada plugin dentro de su familia.
- Usar servicios existentes antes de crear nuevos accesos a datos.
- No agregar SQL directo en plugins.
- No importar `message-template` ni `http-client` directamente en plugins nuevos o migrados.
- No escribir recursos mutables dentro de `resources/data`.
- Ejecutar `typecheck`, `build`, `npm test` y busqueda de `any/@ts-ignore` antes de subir.
- Documentar APIs externas nuevas en `.env.example`.
