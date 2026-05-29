# 🤖 Zycryx WhatsApp Chat Bot Template

![Tecnologias principales](https://skillicons.dev/icons?i=typescript,nodejs,npm,postgres,git&theme=dark)

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-4169E1?logo=postgresql&logoColor=white)
![Baileys](https://img.shields.io/badge/Baileys-WhatsApp-25D366?logo=whatsapp&logoColor=white)
![npm](https://img.shields.io/badge/npm-package-CB3837?logo=npm&logoColor=white)

Plantilla modular para crear bots de WhatsApp con TypeScript, Baileys, Node.js y PostgreSQL. El objetivo del proyecto es servir como base reutilizable para varios bots que comparten casi el mismo nucleo, pero cambian marca, comandos, APIs, owners, textos, recursos multimedia y reglas de comunidad.

Esta plantilla concentra el comportamiento comun en `src/core`, `src/lib`, `src/guards`, `src/utils` y `src/types`, mientras que las funcionalidades visibles para usuarios se agregan como plugins dentro de `src/plugins`.

## 📚 Contenido

- [✨ Caracteristicas](#caracteristicas)
- [🧰 Tecnologias](#tecnologias)
- [📋 Requisitos](#requisitos)
- [⚡ Instalacion](#instalacion)
- [⚙️ Configuracion](#configuracion)
- [📜 Scripts](#scripts)
- [🗂️ Estructura de carpetas](#estructura-de-carpetas)
- [🏛️ Arquitectura](#arquitectura)
- [🧩 Patrones de diseno](#patrones-de-diseno)
- [🔁 Flujo de ejecucion](#flujo-de-ejecucion)
- [🔌 Plugins](#plugins)
- [🗄️ Base de datos](#base-de-datos)
- [📌 Estado actual del analisis](#estado-actual-del-analisis)
- [🧭 Recomendaciones arquitectonicas](#recomendaciones-arquitectonicas)
- [✅ Buenas practicas para nuevos proyectos](#buenas-practicas-para-nuevos-proyectos)
- [🧪 Validacion](#validacion)

<a id="caracteristicas"></a>
## ✨ Caracteristicas

- Conexion a WhatsApp mediante Baileys.
- Sistema modular de plugins para comandos.
- Router de comandos con resolucion exacta, regex y custom prefixes.
- Guards centralizados para permisos, owners, admins, grupos, modo admin, NSFW, ban y recursos.
- Configuracion por entorno usando archivos `.env.local`, `.env.dev`, `.env.test` o `.env.prod`.
- Configuracion de marca del bot desde variables de entorno.
- Persistencia en PostgreSQL.
- Soporte para subbots.
- Tareas programadas para reportes, limpieza de memoria y salida automatica de grupos expirados.
- Utilidades multimedia para imagenes, audios, videos, stickers y conversiones.
- Datos auxiliares para juegos, RPG, contenido aleatorio y respuestas dinamicas.

<a id="tecnologias"></a>
## 🧰 Tecnologias

| Tecnologia | Uso |
|---|---|
| TypeScript | Lenguaje principal del proyecto. |
| Node.js | Runtime de ejecucion. |
| Baileys | Conexion WebSocket con WhatsApp. |
| PostgreSQL | Persistencia de usuarios, grupos, subbots, reportes, stats y memoria. |
| npm | Gestion de dependencias y scripts. |
| tsx | Ejecucion TypeScript en desarrollo con watch mode. |
| Pino | Logger usado por Baileys. |
| Axios / node-fetch | Consumo de APIs externas. |
| FFmpeg | Procesamiento de audio y video. |
| Jimp / node-webpmux / wa-sticker-formatter | Procesamiento de imagenes y stickers. |
| cross-env | Scripts compatibles entre Windows, Linux y macOS. |

<a id="requisitos"></a>
## 📋 Requisitos

- Node.js 18 o superior.
- PostgreSQL 14 o superior.
- FFmpeg instalado en el sistema.
- npm.
- Cuenta de WhatsApp para vincular el bot con QR o codigo de emparejamiento.

<a id="instalacion"></a>
## ⚡ Instalacion

```bash
git clone <url-del-repositorio>
cd zycryx-whatsapp-chat-bot-template
npm install
```

Copia el archivo de entorno base:

```bash
cp .env.example .env.local
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Ejecuta el proyecto en modo local:

```bash
npm run dev
```

En la primera ejecucion el bot solicitara el metodo de vinculacion con WhatsApp. Las credenciales de sesion se guardan localmente y no deben versionarse.

<a id="configuracion"></a>
## ⚙️ Configuracion

La plantilla carga variables segun `NODE_ENV`:

| `NODE_ENV` | Archivo esperado |
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
BOT_MOD_GROUP_ID=
BOT_OWNER_NUMBERS=
DATA_SOURCE=local

# Preparado para backend futuro
BACKEND_PROTOCOL=rest
BACKEND_BASE_URL=
BACKEND_API_TOKEN=
BACKEND_TIMEOUT_MS=10000

API_BASE_URL=https://api.delirius.store
API_KEY=
FGMODS_API_URL=https://api.fgmods.xyz/api
FGMODS_API_KEY=
NEOXR_API_URL=https://api.neoxr.eu/api
NEOXR_API_KEY=

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
```

<a id="scripts"></a>
## 📜 Scripts

| Script | Descripcion |
|---|---|
| `npm run dev` | Ejecuta el bot en modo local con watch. |
| `npm run dev:dev` | Ejecuta el bot con `NODE_ENV=dev`. |
| `npm run dev:test` | Ejecuta el bot con `NODE_ENV=test`. |
| `npm run build` | Limpia y compila TypeScript hacia `dist/`. |
| `npm run typecheck` | Valida tipos sin emitir archivos. |
| `npm run db:generate` | Genera migraciones de Drizzle desde `src/db/schema.ts`. |
| `npm run db:migrate` | Aplica migraciones de Drizzle a PostgreSQL. |
| `npm run db:studio` | Abre Drizzle Studio para inspeccionar la base de datos. |
| `npm run serve` | Ejecuta la version compilada en produccion. |
| `npm run serve:local` | Ejecuta la version compilada en local. |
| `npm run start` | Compila y ejecuta en produccion. |
| `npm run start:local` | Compila y ejecuta en local. |
| `npm run bun:start:local` | Ejecuta el bot con Bun en local. |

<a id="estructura-de-carpetas"></a>
## 🗂️ Estructura de carpetas

```text
zycryx-whatsapp-chat-bot-template/
├── database/
│   ├── legacy-to-drizzle-baseline.sql
│   └── schema.sql
├── drizzle.config.ts
├── media/
│   ├── gifs/
│   ├── text/
│   ├── Menu1.jpg
│   ├── Menu2.jpg
│   ├── Menu3.jpg
│   ├── Menu4.jpg
│   └── a.mp3
├── src/
│   ├── adapters/
│   │   ├── backend/
│   │   └── drizzle/
│   ├── core/
│   │   ├── config.ts
│   │   ├── context-builder.ts
│   │   ├── define-plugin.ts
│   │   ├── env.ts
│   │   ├── handler.ts
│   │   ├── index.ts
│   │   ├── main.ts
│   │   ├── message-parser.ts
│   │   ├── router.ts
│   │   └── scheduled-tasks.ts
│   ├── data/
│   ├── db/
│   ├── game/
│   ├── guards/
│   ├── lib/
│   ├── nsfw/
│   ├── ports/
│   ├── plugins/
│   ├── services/
│   ├── types/
│   ├── utils/
│   ├── audios.json
│   ├── avatar_contact.png
│   ├── characters.json
│   └── text-chatgpt.txt
├── .env.example
├── package.json
├── package-lock.json
├── README.md
├── speed.py
└── tsconfig.json
```

## 📁 Descripcion de carpetas

| Ruta | Responsabilidad |
|---|---|
| `database/` | SQL auxiliar para referencia y migracion legacy hacia Drizzle. |
| `media/` | Imagenes, audios, videos, textos y recursos usados por plugins. |
| `src/adapters/backend/` | Base del adapter REST/GraphQL futuro. |
| `src/adapters/drizzle/` | Implementacion local de repositorios con Drizzle ORM. |
| `src/core/` | Arranque, entorno, configuracion, router, parser, handler y tareas del runtime. |
| `src/db/` | Cliente, schema y migraciones Drizzle. |
| `src/data/` | Datos estaticos o auxiliares usados por funcionalidades del bot. |
| `src/game/` | Datos para juegos, trivias y dinamicas interactivas. |
| `src/guards/` | Pipeline de validaciones previas a ejecutar comandos. |
| `src/lib/` | Integraciones internas, loader de plugins, subbots y helpers multimedia. |
| `src/nsfw/` | Datos o recursos relacionados con comandos marcados como NSFW. |
| `src/ports/` | Contratos de repositorios que desacoplan servicios de adapters concretos. |
| `src/plugins/` | Comandos y funcionalidades del bot. |
| `src/services/` | Casos de uso y fachada de dominio usada por plugins/core. |
| `src/types/` | Contratos TypeScript compartidos. |
| `src/utils/` | Utilidades puras o helpers reutilizables. |

<a id="arquitectura"></a>
## 🏛️ Arquitectura

La plantilla esta organizada alrededor de un nucleo pequeno y extensible:

```mermaid
flowchart TD
    A["WhatsApp"] --> B["Baileys socket"]
    B --> C["src/core/main.ts"]
    C --> D["src/core/handler.ts"]
    D --> E["src/core/context-builder.ts"]
    D --> F["src/core/message-parser.ts"]
    F --> G["src/core/router.ts"]
    G --> H["src/guards"]
    H --> I["src/plugins"]
    I --> J["src/services"]
    J --> K["src/ports/repositories.ts"]
    K --> L["src/adapters/drizzle"]
    K --> N["src/adapters/backend"]
    L --> O["PostgreSQL"]
    N --> P["REST/GraphQL futuro"]
    I --> Q["src/lib / src/utils"]
    I --> M["Respuesta a WhatsApp"]
```

Componentes principales:

- `main.ts`: inicia Baileys, carga plugins, registra eventos y arranca tareas programadas.
- `handler.ts`: procesa mensajes entrantes, evita duplicados, arma contexto, ejecuta guards y despacha comandos.
- `context-builder.ts`: centraliza sender, metadata, permisos, settings de grupo y configuracion del bot.
- `router.ts`: resuelve comandos por string, array, regex o `customPrefix`.
- `define-plugin.ts`: factory recomendada para plugins nuevos con metadata tipada.
- `scheduled-tasks.ts`: tareas recurrentes separadas del pipeline de mensajes.
- `plugins.ts`: loader y hot reload de plugins.
- `services/`: capa de casos de uso que evita que los plugins hablen con la base directamente.
- `ports/repositories.ts`: contrato de persistencia para Drizzle local y backend futuro.
- `adapters/drizzle/`: repositorios locales separados por agregado.
- `postgres.ts`: pool minimo de PostgreSQL usado por Drizzle.

<a id="patrones-de-diseno"></a>
## 🧩 Patrones de diseno

### 🔌 Plugin Architecture

Cada comando vive como modulo independiente dentro de `src/plugins`. Esto permite que distintos proyectos compartan el core y activen, eliminen o personalicen comandos sin tocar el arranque del bot.

### 🎯 Command Pattern

Cada plugin representa una accion ejecutable. El router convierte un mensaje entrante en un comando y delega la ejecucion al handler del plugin correspondiente.

### 🚦 Router / Dispatcher

`CommandRouter` mantiene un mapa de comandos exactos y listas para regex o custom prefixes. Esto reduce el costo de busqueda y separa la deteccion del comando de la ejecucion.

### 🛡️ Guard Pattern

Los permisos y restricciones se evaluan antes del plugin:

- modo publico o privado;
- usuario baneado;
- NSFW;
- owner o rowner;
- admin de grupo;
- bot admin;
- grupo o privado;
- recursos como limite, dinero o nivel;
- modo admin del grupo.

Esto evita duplicar validaciones dentro de cada comando.

### 🔄 Ports & Adapters

La persistencia pasa por `src/ports/repositories.ts` y se implementa en adapters. Actualmente `DATA_SOURCE=local` usa Drizzle + PostgreSQL; `DATA_SOURCE=backend` ya tiene un esqueleto REST/GraphQL que queda pendiente de contrato real.

### 🧬 Repository Pattern

Los repositorios Drizzle viven separados por agregado: usuarios, wallet, grupos, chats, personajes, reportes, memoria, tokens y estadisticas. `src/adapters/drizzle/repositories.ts` solo compone el adapter completo.

### ⚙️ Configuration Pattern

La marca del bot, owners, enlaces, APIs, base de datos y entorno se configuran desde `.env`. Asi la misma plantilla puede convertirse en varios bots sin editar codigo fuente.

### 🧱 Context Builder

El contexto de un mensaje se construye en una sola capa. El plugin recibe datos listos como `isOwner`, `isAdmin`, `isBotAdmin`, `metadata`, `participants`, `args`, `text` y `command`.

### ⏱️ Scheduled Tasks

Las tareas recurrentes se ejecutan fuera del handler de mensajes. Esto mantiene separado el trafico de WhatsApp de procesos como reportes, expiracion de grupos y limpieza de memoria.

### 🧼 Separation of Concerns

El core no deberia contener logica de negocio de comandos. Los plugins contienen comportamiento de usuario; los guards validan permisos; `lib` integra dependencias; `utils` contiene funciones reutilizables.

<a id="flujo-de-ejecucion"></a>
## 🔁 Flujo de ejecucion

```text
Mensaje de WhatsApp
  -> Baileys recibe messages.upsert
  -> handler descarta duplicados y mensajes antiguos
  -> smsg normaliza el mensaje
  -> context-builder resuelve permisos y metadata
  -> message-parser detecta prefijo, comando, args y texto
  -> before hooks de plugins
  -> router resuelve el plugin
  -> guards validan permisos y recursos
  -> plugin ejecuta la accion
  -> service aplica regla de negocio
  -> repository port persiste o consulta datos
  -> Drizzle adapter o backend adapter
  -> stats/logs se actualizan
  -> respuesta vuelve a WhatsApp
```

<a id="plugins"></a>
## 🔌 Plugins

La forma recomendada para plugins nuevos es usar `definePlugin`:

```ts
import {definePlugin} from '../core/define-plugin.js';

export default definePlugin({
    command: ['ping', 'p'],
    help: ['ping'],
    tags: ['main'],
    async execute(m, {conn}) {
        await conn.reply(m.chat, 'pong', m);
    }
});
```

Metadata soportada:

| Propiedad | Uso |
|---|---|
| `command` | Comando string, array o regex. |
| `customPrefix` | Prefijo especial, por ejemplo `$` o `>`. |
| `help` | Texto usado por menus o documentacion. |
| `tags` | Categoria del comando. |
| `owner` | Requiere owner del bot o subbot. |
| `rowner` | Requiere owner real/fijo. |
| `admin` | Requiere admin del grupo. |
| `botAdmin` | Requiere que el bot sea admin. |
| `group` | Solo grupos. |
| `private` | Solo chat privado. |
| `register` | Requiere usuario registrado. |
| `limit`, `money`, `level` | Recursos o progreso requerido. |
| `before` | Hook previo a comandos. |

<a id="base-de-datos"></a>
## 🗄️ Base de datos

La plantilla usa PostgreSQL para persistir:

- usuarios;
- settings por grupo;
- chats;
- conteo de mensajes;
- subbots;
- personajes;
- reportes;
- memoria de chat;
- tokens de API;
- estadisticas de comandos.

La estructura de base de datos vive en `src/db/schema.ts` y sus migraciones versionadas en `src/db/migrations/`. Para preparar una base nueva ejecuta `npm run db:migrate` antes de iniciar el bot.

Los tokens externos se leen desde `api_tokens` usando `name` y `token_b64`. Si vienes de una base antigua con una tabla `tokens(id, value)`, la migracion `0001_legacy_api_tokens` copia esos registros a `api_tokens` y codifica `value` en base64 sin sobrescribir tokens ya existentes.

Para una base antigua que ya tenga tablas creadas antes de Drizzle, primero ejecuta el baseline legacy y luego las migraciones normales:

```bash
psql "$DATABASE_URL" -f database/legacy-to-drizzle-baseline.sql
npm run db:migrate
```

No uses `database/legacy-to-drizzle-baseline.sql` en bases nuevas. Ese script existe para evitar que la migracion inicial `0000` choque con tablas ya existentes y para normalizar columnas historicas como `"sWelcome"`/`swelcome` o `"antiStatus"`/`antistatus`.

<a id="estado-actual-del-analisis"></a>
## 📌 Estado actual del analisis

Este README refleja el estado posterior a la migracion de persistencia:

- Los plugins ya no usan `m.db` ni `db.query` directamente.
- La base local usa Drizzle ORM con schema y migraciones versionadas.
- `src/adapters/drizzle/` esta separado por repositorio/agregado.
- `src/services/` funciona como frontera para plugins y core.
- `DATA_SOURCE=backend` existe como scaffold, pero sus metodos quedan pendientes hasta que exista contrato REST/GraphQL real.
- Hay soporte para migracion legacy de tokens y baseline de bases antiguas.
- El sistema de plugins aun convive entre `definePlugin` y el formato historico `handler.command`.
- El tipado runtime de Baileys/plugins todavia depende mucho de `any` y algunos `@ts-ignore`.

<a id="recomendaciones-arquitectonicas"></a>
## 🧭 Recomendaciones arquitectonicas

El proyecto ya supero la fase mas riesgosa de la migracion: la persistencia esta detras de servicios, puertos y adapters. El nuevo foco ya no es "sacar SQL de plugins", sino endurecer contratos, reducir deuda de tipado y preparar la plantilla para crecer en varios bots o un backend externo.

### 🧩 1. Unificar el sistema de plugins

El punto de mejora mas importante ahora es migrar plugins legacy al formato `definePlugin`. En el analisis actual hay pocos plugins con `definePlugin` y la mayoria siguen usando `handler.command = ...`.

Ruta recomendada:

```text
1. Migrar comandos owner/admin.
2. Migrar comandos de grupo y moderacion.
3. Migrar RPG/economia.
4. Migrar descargas y multimedia.
5. Eliminar metadata mutada manualmente cuando todos usen definePlugin.
```

Beneficio: permisos, cooldowns, categorias y documentacion de comandos pueden vivir en un contrato unico.

### 🧱 2. Fortalecer tipado de runtime

El segundo punto mas rentable es reducir `any` y `@ts-ignore`, especialmente en:

- `src/core/handler.ts`
- `src/core/context-builder.ts`
- `src/core/main.ts`
- `src/types/context.ts`
- plugins de registro, multimedia, RPG y stickers

La meta no es tipar todo de golpe, sino crear tipos compartidos para:

```text
BotConnection
BotMessage
PluginContext
PluginBeforeHook
GroupParticipant
ResolvedSender
```

### 🗃️ 3. Mantener la capa de datos como frontera estable

La ruta actual para persistencia debe mantenerse asi:

```text
plugin
  -> service
  -> repository port
  -> adapter drizzle/backend
```

No se recomienda volver a introducir `db.query` en plugins ni en core. Para codigo nuevo, primero se agrega metodo al puerto, luego implementacion Drizzle y finalmente servicio.

Repositorios Drizzle actuales:

```text
src/adapters/drizzle/
├── api-token.repository.ts
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

### 🌐 4. Esperar el contrato real antes de implementar backend

`DATA_SOURCE=backend` ya esta cableado, pero sus metodos fallan de forma explicita porque aun no existe contrato real. Esta es la decision correcta por ahora.

Cuando el backend este listo, define primero:

```text
REST:
GET /users/:id
PATCH /users/:id/wallet
GET /groups/:id/settings
...

GraphQL:
query UserWallet($id: ID!)
mutation AddWalletResource(...)
```

Luego se implementa `src/adapters/backend/repositories.ts` metodo por metodo, sin tocar plugins.

### 🧪 5. Agregar pruebas por capas

Ya hay una arquitectura testeable. Falta sumar pruebas automatizadas para proteger futuras migraciones.

Prioridad sugerida:

| Prioridad | Prueba |
|---|---|
| Alta | `message-parser`, `router`, guards de permisos. |
| Alta | Servicios de wallet, usuarios, group settings y characters. |
| Media | Repositorios Drizzle con PostgreSQL real. |
| Media | Migracion legacy `legacy-to-drizzle-baseline.sql`. |
| Baja | Plugins de contenido aleatorio o comandos puramente visuales. |

Stack recomendado:

- Vitest para unit tests.
- Testcontainers o una DB Postgres de CI para integracion.
- Fixtures de mensajes Baileys para probar parser/contexto.

### 🧰 6. Modularizar dominios grandes

`src/services` y `src/adapters/drizzle` ya estan modularizados. El siguiente candidato es `src/plugins`, porque concentra muchos dominios distintos.

Opcion futura:

```text
src/modules/
├── group/
├── rpg/
├── stickers/
├── downloads/
├── ai/
├── moderation/
└── owner/
```

Cada modulo podria tener:

```text
plugins/
services/
schemas/
fixtures/
```

### 🧵 7. Cola de trabajos para multimedia e IA

Descargas, conversiones, stickers, scraping e IA pueden saturar el proceso principal. Si el bot crece, conviene mover esas tareas a jobs.

Opciones:

- BullMQ + Redis para alto volumen.
- pg-boss si quieres aprovechar PostgreSQL.
- Worker threads para conversiones locales especificas.

### 🛡️ 8. Seguridad operacional

Puntos recomendados para produccion:

- Desactivar comandos de ejecucion remota por defecto.
- Agregar auditoria para acciones owner/admin.
- Rate limiting por usuario/chat/comando.
- Validar URLs antes de fetch/scraping.
- Separar secretos de usuario final y secretos operativos.
- Revisar permisos de subbots y owners con allowlist explicita.

### 🏢 9. Preparar monorepo si aparece panel web

Si el proyecto evoluciona hacia backend + panel administrativo, la arquitectura natural seria:

```text
apps/
├── bot-worker/
├── admin-api/
└── admin-web/

packages/
├── db/
├── core/
├── plugins/
└── shared/
```

Stack sugerido:

- Bot: Node.js + Baileys.
- API: Fastify o NestJS.
- Web admin: Next.js.
- DB compartida: Drizzle + PostgreSQL.
- Monorepo: pnpm workspaces o Turborepo.

### 🗺️ Ruta de migracion recomendada

Orden sugerido actualizado:

```text
1. Mantener todo comando nuevo usando services y definePlugin.
2. Migrar plugins legacy por dominio hacia definePlugin.
3. Reducir any/@ts-ignore empezando por core y tipos compartidos.
4. Agregar tests de parser, router, guards y services.
5. Probar migraciones Drizzle y baseline legacy en una DB real.
6. Implementar adapter backend cuando exista contrato real.
7. Evaluar cola de jobs si multimedia/IA empieza a bloquear el bot.
8. Separar modulos o monorepo si aparecen varios bots/panel web.
```

<a id="buenas-practicas-para-nuevos-proyectos"></a>
## ✅ Buenas practicas para nuevos proyectos

- Mantener secretos y marca en `.env`, no en plugins.
- Crear nuevos comandos con `definePlugin`.
- Evitar comandos con logica demasiado grande; extraer helpers a `src/lib` o `src/utils`.
- No tocar `core` para agregar funcionalidades de usuario.
- Declarar permisos con metadata del plugin y dejar que los guards hagan su trabajo.
- No versionar carpetas de sesion como `BotSession` o `jadibot`.
- Revisar dependencias vulnerables antes de desplegar en produccion.
- Usar `BOT_MOD_GROUP_ID` si se quieren reenviar reportes a un grupo de moderacion.
- Mantener los textos de bienvenida/despedida en `media/text` cuando sean personalizables.

<a id="validacion"></a>
## 🧪 Validacion

Antes de publicar cambios:

```bash
npm run typecheck
npm run build
npm audit
```

`npm audit` puede requerir decisiones manuales porque algunas actualizaciones son rompientes o dependen de librerias externas sin fix directo.

## 🛣️ Roadmap sugerido

- Migrar plugins legacy al formato `definePlugin`, empezando por owner/admin y moderacion.
- Reducir `any` y `@ts-ignore` en core, context, tipos compartidos y plugins criticos.
- Agregar pruebas para parser, router, guards, services y repositorios Drizzle.
- Probar `database/legacy-to-drizzle-baseline.sql` contra una copia de una base antigua real.
- Mantener las migraciones Drizzle alineadas con cada cambio de schema.
- Implementar el adapter backend cuando exista contrato REST/GraphQL real.
- Evaluar jobs/colas para descargas, stickers, conversiones e IA si aumenta el volumen.
- Documentar cada plugin con tags, permisos, recursos requeridos y ejemplos.

## ⚖️ Uso responsable

WhatsApp tiene sus propias condiciones de uso. Esta plantilla debe usarse para automatizacion responsable, comunidades propias, pruebas educativas o proyectos donde exista consentimiento de los participantes. Cada implementacion basada en esta plantilla es responsable de sus propios comandos, datos, integraciones y politicas de uso.

## 🙌 Creditos

- Conexion WhatsApp: [Baileys](https://github.com/WhiskeySockets/Baileys)
- Lenguaje: [TypeScript](https://www.typescriptlang.org/)
- Runtime: [Node.js](https://nodejs.org/)
- Base de datos: [PostgreSQL](https://www.postgresql.org/)
- Plantilla: Zycryx WhatsApp Chat Bot Template
