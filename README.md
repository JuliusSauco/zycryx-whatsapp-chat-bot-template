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
- [📌 Estado Actual](#estado-actual)

<a id="caracteristicas"></a>
## ✨ Caracteristicas

- Conexion a WhatsApp mediante Baileys.
- Sistema modular de 175 plugins distribuidos por familia.
- Loader de plugins recursivo con hot reload.
- Router de comandos con resolucion exacta, regex y custom prefixes.
- Plugins nuevos mediante `definePlugin`.
- Compatibilidad con hooks legacy que exportan `before`.
- Guards centralizados para owners, admins, grupo/privado, modo admin, NSFW, ban y recursos.
- Context builder para sender, metadata, permisos, settings de grupo y config del bot.
- Persistencia con Drizzle ORM sobre PostgreSQL.
- Repositorios Drizzle separados por agregado.
- Puertos de repositorio para desacoplar servicios del adapter concreto.
- Scaffold de backend REST/GraphQL futuro con `DATA_SOURCE=backend`.
- Migraciones versionadas y script `db:ensure-schema`.
- Soporte para `DB_SCHEMA` usando `search_path`.
- Subbots con sesiones independientes.
- Tareas programadas para reportes, expiracion de grupos y limpieza de memoria.
- Recursos base en `src/data` y recursos mutables de audios en base de datos.
- Observabilidad con `LOG_LEVEL` y logs de performance configurables.
- Integracion opcional con VirusTotal para analisis de enlaces y archivos.
- `src/**/*.ts` sin `any` ni `@ts-ignore`.

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
| Axios / node-fetch | Consumo de APIs externas. |
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

Ejecuta en desarrollo:

```bash
npm run dev
```

O compila y ejecuta la version local:

```bash
npm run start:local
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
DEFAULT_MENU_IMAGE=./media/Menu2.jpg

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
| `npm run db:generate` | Genera migraciones desde `src/db/schema.ts`. |
| `npm run db:ensure-schema` | Crea el schema configurado si no existe. |
| `npm run db:migrate` | Ejecuta `db:ensure-schema` y aplica migraciones. |
| `npm run db:studio` | Abre Drizzle Studio. |
| `npm run dev` | Ejecuta local con `tsx watch`. |
| `npm run dev:dev` | Ejecuta con `NODE_ENV=dev`. |
| `npm run dev:test` | Ejecuta con `NODE_ENV=test`. |
| `npm run serve` | Ejecuta `dist` con `NODE_ENV=prod`. |
| `npm run serve:local` | Ejecuta `dist` con `NODE_ENV=local`. |
| `npm run serve:dev` | Ejecuta `dist` con `NODE_ENV=dev`. |
| `npm run serve:test` | Ejecuta `dist` con `NODE_ENV=test`. |
| `npm run start` | Build + serve prod. |
| `npm run start:local` | Build + serve local. |
| `npm run start:dev` | Build + serve dev. |
| `npm run start:test` | Build + serve test. |
| `npm run bun:start:*` | Alternativas con Bun. |

<a id="estructura"></a>
## 🗂️ Estructura

```text
zycryx-whatsapp-chat-bot-template/
├── database/
├── media/
├── src/
│   ├── adapters/
│   │   ├── backend/
│   │   └── drizzle/
│   ├── core/
│   ├── data/
│   │   ├── game/
│   │   └── nsfw/
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
| `media/` | Imagenes, audios, textos y recursos usados por plugins. |
| `src/adapters/backend/` | Scaffold REST/GraphQL futuro. |
| `src/adapters/drizzle/` | Implementacion local de repositorios con Drizzle. |
| `src/core/` | Arranque, entorno, router, parser, handler, contexto y tareas. |
| `src/db/` | Cliente, schema y migraciones Drizzle. |
| `src/data/` | Datos estaticos y seeds readonly. |
| `src/guards/` | Validaciones previas a ejecutar comandos. |
| `src/lib/` | Integraciones, loader de plugins, subbots, multimedia, logs y scraping. |
| `src/plugins/` | Comandos y hooks agrupados por familia. |
| `src/ports/` | Contratos de repositorios. |
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
| `lib/plugins.ts` | Loader recursivo y hot reload de plugins. |
| `lib/logger.ts` | Logger con niveles configurables. |
| `lib/simple.ts` | Normalizacion de mensajes y helpers custom de `conn`. |
| `services/` | Capa de aplicacion usada por core/plugins. |
| `ports/repositories.ts` | Contratos de persistencia. |
| `adapters/drizzle/` | Repositorios PostgreSQL con Drizzle. |
| `adapters/backend/` | Adapter pendiente de contrato externo. |

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
  -> before hooks
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

La forma recomendada para nuevos plugins es `definePlugin`:

```ts
import {definePlugin} from '../../core/define-plugin.js';

export default definePlugin({
    command: ['ping', 'p'],
    help: ['ping'],
    tags: ['main'],
    async execute(m, {conn}) {
        await conn.reply(m.chat, 'pong', m);
    },
});
```

Tambien se soportan hooks previos:

```ts
import {definePlugin} from '../../core/define-plugin.js';

export default definePlugin({
    tags: ['group'],
    runBeforeOnCommand: true,
    async before(m, {conn}) {
        if (!m.isGroup) return;
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

Para generar cambios de schema:

```bash
npm run db:generate
npm run db:migrate
```

Para inspeccion:

```bash
npm run db:studio
```

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

`src/data` contiene recursos base readonly:

- `src/data/audios.json`;
- `src/data/characters.json`;
- `src/data/game/*.json`;
- `src/data/nsfw/*.json`.

Los audios personalizados ya no se escriben en `src/data/audios.json`. El flujo actual es:

```text
src/data/audios.json -> seed base
audio_responses      -> overrides, altas y bajas dinamicas
audio-response.service.ts -> merge de seed + DB
```

Los comandos `addaudios` y `delaudios` persisten cambios en PostgreSQL mediante `audio_responses`.

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
```

Para confirmar que no se reintrodujo deuda de tipado:

```bash
rg -n '\bany\b|@ts-ignore' src --glob '*.ts'
```

Para ejecutar local desde build:

```bash
npm run start:local
```

O si ya compilaste:

```bash
npm run serve:local
```

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
- Observabilidad configurable con `LOG_LEVEL`.
- VirusTotal integrado como hook configurable.
- `src/**/*.ts` sin `any` ni `@ts-ignore`.
- Build y typecheck pasan.

## ✅ Buenas Practicas Para Nuevos Bots

- Copiar `.env.example` y completar secretos solo en archivos ignorados.
- Mantener `DATA_SOURCE=local` hasta que el backend tenga contrato estable.
- Crear nuevos comandos con `definePlugin`.
- Ubicar cada plugin dentro de su familia.
- Usar servicios existentes antes de crear nuevos accesos a datos.
- No agregar SQL directo en plugins.
- No escribir recursos mutables dentro de `src/data`.
- Ejecutar `typecheck`, `build` y busqueda de `any/@ts-ignore` antes de subir.
- Documentar APIs externas nuevas en `.env.example`.
