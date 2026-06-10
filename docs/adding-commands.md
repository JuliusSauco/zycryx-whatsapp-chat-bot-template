# Guia: agregar un comando nuevo

Pasos para crear un comando siguiendo las convenciones del proyecto. Fecha de referencia: 2026-06-10.

## 1. Elegir familia y archivo

Cada comando vive en `src/plugins/<familia>/<familia>-<nombre>.ts`. Familias actuales: `audio`, `config`, `converters`, `downloads`, `fun`, `games`, `group`, `hooks`, `info`, `menus`, `messages`, `nsfw`, `owner`, `random`, `rpg`, `search`, `stickers`, `subbots`, `tools`.

El loader es recursivo y tiene hot reload: guardar el archivo basta para que el comando quede activo en desarrollo.

## 2. Esqueleto con defineSdkPlugin

Los comandos nuevos usan `defineSdkPlugin` (no `definePlugin`, que queda solo para legacy):

```ts
import {defineSdkPlugin} from '../../core/sdk-plugin.js';

export default defineSdkPlugin({
    command: ['saludo', 'hola'],
    help: ['saludo'],
    tags: ['fun'],
    group: true,           // opcional: solo grupos
    async execute(_m, {sdk}) {
        if (!sdk.text) {
            await sdk.reply.usage('saludo <nombre>');
            return;
        }
        await sdk.reply.text(`Hola, ${sdk.text}!`);
    },
});
```

### Metadata disponible

| Propiedad | Efecto |
|---|---|
| `command` | String, array o regex que activa el plugin (sin prefijo). |
| `customPrefix` | Activador sin prefijo normal (regex o funcion sobre el texto crudo). |
| `help` / `tags` | Texto y categoria para menus. Los `tags` tambien deciden el access mode de familia (ver paso 4). |
| `owner` / `rowner` | Requiere owner del bot / owner fijo. |
| `admin` / `botAdmin` | Requiere admin del grupo / que el bot sea admin. |
| `group` / `private` | Restringe a grupos o privado. |
| `register` | Requiere usuario registrado (RPG). |
| `limit` / `money` / `level` | Costos y requisitos de economia. |
| `before` / `runBeforeOnCommand` | Hook middleware previo (antilink, autoresponder, etc.). |
| `needsFullGroupSettings` | Pide `groupSettings` completos si el comando usa campos fuera del contexto minimo. |

Los guards (`src/guards/`) validan toda esta metadata antes de ejecutar; el plugin no necesita re-verificar permisos que ya declaro.

## 3. Usar el SDK, no helpers sueltos

| Necesitas | Usa |
|---|---|
| Responder texto / exito / error de usuario / uso | `sdk.reply.text/success/userError/usage` |
| Error interno reportable | `sdk.reply.reportableError(e)` |
| Reaccion emoji | `sdk.reply.react('⏳')` |
| Textos centralizados | `sdk.reply.message('ruta.del.mensaje', {valores})` y `resources/data/messages.json` |
| HTTP externo | `sdk.http.json/text/buffer/request` (timeout y errores normalizados) |
| Varios proveedores con fallback | `sdk.providers.runFirst([...])` o un provider en `src/providers/` |
| Procesos largos por usuario | `sdk.createUserLocks()` |
| Enviar archivos | `sdk.sendFile(...)` / `sdk.sendMessage(...)` |
| Aleatoriedad | `pickRandom` y helpers de `src/utils/random.ts` |

Reglas que valida `npm run test:p0`: los plugins migrados/nuevos no deben importar `src/lib/message-template.ts` ni `src/lib/http-client.ts` directamente.

Reglas adicionales del proyecto:

- Nada de SQL directo en plugins: pasa por `src/services/` (y estos por puertos/repositorios).
- Sin `any` ni `@ts-ignore`.
- Textos visibles nuevos van a `resources/data/messages.json` (+ `resources/text/` si son largos).
- Datos grandes (listas, tablas) van a un archivo `.data.ts` junto al plugin.
- No escribir estado mutable en `resources/data`; usar DB via servicios.

## 4. Access modes por familia

El guard `feature-access.guard.ts` mapea `tags` a familias configurables por grupo (`all` / `admins` / `off`):

| Familia configurable | Tags que la activan |
|---|---|
| `games` | `game` |
| `tools` | `tools` |
| `rpg` | `econ`, `gacha`, `rg`, `rpg`, `hot` |
| `downloads` | `downloader` |
| `search` | `buscadores` |
| `stickers` | `sticker` |
| `converters` | `convertidor` |
| `fun` | `fun`, `randow` |

Si tu comando debe respetar el toggle de su familia (comando `enable`/menu de configuracion), usa el tag correspondiente.

## 5. Registrar en menus

`src/plugins/menus/menu-command-metadata.ts` define emoji, uso y descripcion visibles en los menus. Agrega la entrada de tu comando para que aparezca documentado:

```ts
saludo: {emoji: '👋', usage: 'saludo <nombre>', description: 'Saluda a la persona indicada.'},
```

## 6. Hooks (middlewares)

Para logica que corre antes de cada mensaje (estilo antilink), exporta `before` y ubica el archivo en `src/plugins/hooks/` con prefijo `_`:

```ts
import {definePlugin} from '../../core/define-plugin.js';

export default definePlugin({
    runBeforeOnCommand: true,   // tambien corre cuando el mensaje es un comando
    async before(m, {groupSettings, isAdmin, isBotAdmin}) {
        if (!m.isGroup || !groupSettings.antilink) return;
        // retorna false para abortar el pipeline
    },
    async execute() {
        return;
    },
});
```

El contexto del hook ya trae `metadata`, `participants`, `botConfig` y `groupSettings` precargados: no vuelvas a consultarlos.

## 7. Validar antes de subir

```bash
npm run typecheck
npm run build
npm test
```

Y verificacion rapida de deuda:

```bash
rg -n "\bany\b|@ts-ignore" src
```

Si agregaste una API externa nueva: agrega la variable a `.env.example`, a `src/core/env.ts` y documentala en `docs/environment-variables.md`.
