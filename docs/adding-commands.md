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
    feature: 'fun',
    executionPolicy: {profile: 'fast'},
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
| `help` / `tags` | Texto y categoria para menus y ayuda. |
| `feature` | Familia tipada usada por el access mode del grupo. |
| `executionPolicy` | Perfil `fast`, `network`, `media`, `owner-operation` o timeout explicito. |
| `owner` | Requiere owner global o owner persistido del subbot. |
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
| Procesos largos por usuario | `sdk.locks.runExclusive(clave, operacion)` |
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

El guard `feature-access.guard.ts` usa la propiedad tipada `feature` para familias configurables por grupo. Cada regla persiste `enabled` y uno de los modos `all`, `admin`, `superadmin` u `owner`.

Los comandos individuales que necesiten el mismo esquema deben declarar `commandAccess` con una clave estable y una regla predeterminada. Las reglas se guardan con `scope = 'command'`; varios aliases o plugins pueden compartir la misma clave. No combines `admin: true` con un acceso individual que permita `--all`, porque el guard fijo seguiría bloqueando miembros.

```ts
commandAccess: {
    key: 'censored',
    defaultRule: {enabled: true, accessMode: 'admin'},
}
```

| Familia configurable | Valor de `feature` |
|---|---|
| `games` | `games` |
| `tools` | `tools` |
| `rpg` | `rpg` |
| `downloads` | `downloads` |
| `search` | `search` |
| `stickers` | `stickers` |
| `converters` | `converters` |
| `fun` | `fun` |
| Audios automáticos | `audio` |
| GIFs y reacciones normales | `gifs` |
| Contenido NSFW | `nsfw` |
| GIFs NSFW dedicados | `nsfw-gifs` |

Si tu comando debe respetar el toggle de su familia, declara `feature`. Los tags no controlan autorizacion. Los comandos estructurales marcados `owner`, `admin` o `botAdmin` conservan su guard fijo y no quedan sujetos a estas reglas.

## 5. Registrar en menus

`resources/data/commands.json` define emoji, uso, descripcion, permisos y ejemplos visibles. Agrega la entrada y ejecuta las pruebas de catalogo.

```ts
saludo: {emoji: '👋', usage: 'saludo <nombre>', description: 'Saluda a la persona indicada.'},
```

## 6. Hooks (middlewares)

Para logica que corre antes de mensajes usa interceptores tipados. `before` queda soportado solo como compatibilidad:

```ts
import {defineSdkPlugin} from '../../core/sdk-plugin.js';

export default defineSdkPlugin({
    interceptors: [{
        phase: 'security',
        priority: 100,
        appliesTo: 'all',
        failurePolicy: 'fail-closed',
        async run(m, context) {
            if (!m.isGroup || !context.groupSettings.antilink) return {kind: 'continue'};
            return {kind: 'handled'};
        },
    }],
    async execute() {},
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
## 8. Politicas del plugin

Los plugins nuevos deben declarar la familia funcional con `feature` cuando aplique. `tags` queda reservado para menu, ayuda y clasificacion; no debe usarse como contrato de autorizacion.

```ts
export default defineSdkPlugin({
    command: ['example'],
    help: ['example <texto>'],
    tags: ['tools'],
    feature: 'tools',
    executionPolicy: {profile: 'network'},
    limit: 1,
    async execute(_m, {sdk, signal}) {
        if (signal.aborted) return;
        await sdk.reply.success(`Resultado para ${sdk.text}`);
    },
});
```

Perfiles: `fast`, `network`, `media` y `owner-operation`. Usa `timeoutMs` solo cuando el perfil no represente el caso. La cancelacion es cooperativa; pasa `signal` a APIs que lo soporten.

Para impedir trabajos simultaneos usa el registro compartido del SDK:

```ts
const result = await sdk.locks.runExclusive(sdk.sender, async () => {
    return ejecutarProcesoLargo();
});
if (!result.acquired) return sdk.reply.userError('Ya tienes una solicitud en proceso.');
```

No crees locks dentro de `execute` con `createUserRequestLocks`; esa API queda solo para compatibilidad. Los costos `limit` y `money` son reservados por el handler y se confirman solo si `execute` completa.

Los interceptores nuevos deben declarar fase, prioridad, mensajes a los que aplican y politica de fallo. Usa `fail-closed` solo para controles de seguridad; respuestas auxiliares y telemetria deben usar `fail-open` o `report-only`.
