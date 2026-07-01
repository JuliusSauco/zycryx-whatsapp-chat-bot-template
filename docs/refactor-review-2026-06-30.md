# Revision de arquitectura y refactorizacion

Fecha de revision: 2026-06-30.

Este reporte complementa `docs/architecture-analysis.md`, `docs/architecture-roadmap.md` y `docs/improvement-roadmap.md`. No reemplaza esos roadmaps: busca convertir los hallazgos actuales del repo en mejoras accionables para los proximos ciclos de mantenimiento.

## Resumen ejecutivo

El proyecto ya tiene una base solida para un bot modular: core separado, guards centralizados, servicios/puertos/adapters, Drizzle/PostgreSQL, providers iniciales, pruebas de nucleo y una ruta clara hacia SDK de plugins. La siguiente mejora con mas impacto no es reescribir el bot, sino reducir los acoplamientos que todavia viven en el runtime y convertir patrones repetidos de plugins en utilidades compartidas.

Recomendacion principal:

1. Arquitectura: crear una fachada de runtime y pasar la identidad/marca del bot por contexto, dejando de mutar `globalThis.info` por mensaje.
2. Codigo especifico: crear helpers compartidos para estado efimero (`cooldowns`, pending actions, expiring maps) y migrar primero menus, juegos y confirmaciones RPG.
3. Proceso: adoptar un flujo ligero de ADR + scorecard de refactor por modulo para que cada cambio grande deje decision, riesgo y criterio de validacion.

## Snapshot medido

Valores obtenidos sobre el estado actual de `src`:

| Indicador | Valor | Lectura |
|---|---:|---|
| Archivos TypeScript en `src/plugins` | 186 | Superficie funcional grande; conviene migrar por familias, no por archivos sueltos. |
| Plugins con `definePlugin` | 0 | Deuda legacy cerrada en plugins. |
| Plugins con `defineSdkPlugin` | 157 | El contrato moderno cubre todas las familias de comandos migradas. |
| Archivos de plugins que importan `message-template.js` | 0 | Plugins y hooks usan `sdk.content` o `content.service`. |
| Archivos de plugins que importan `http-client.js` | 0 | Los plugins usan `sdk.http`, providers o servicios. |
| Archivos con `new Map` en core/lib/plugins | 10 | Restan caches, infraestructura o indices locales aceptados por P5. |
| Archivos con `setTimeout`/`clearTimeout` en core/lib/plugins | 21 | Restan timeouts/reintentos/delays operativos aceptados por P5. |
| Familias de plugins con mas archivos | `rpg` 26, `group` 25, `owner` 21, `downloads` 19 | Priorizar refactors por impacto y riesgo operativo. |

## Lectura general del proyecto

### Fortalezas

- El `handler` esta razonablemente enfocado en orquestacion: deduplicacion, contexto, hooks, guards, ejecucion, logging y metricas de performance.
- `context-builder` ya reduce IO repetido al cargar metadata, config de bot y settings de grupo en paralelo.
- Los guards concentran permisos y evitan repetir checks sensibles dentro de cada plugin.
- La capa de servicios y repositorios mantiene SQL fuera de plugins.
- `defineSdkPlugin` y `plugin-sdk` ya dan una ruta moderna para nuevos comandos: `sdk.reply`, `sdk.content`, `sdk.http`, providers y locks.
- Las pruebas cubren router, guards, context builder, servicios, seguridad, providers y compuertas de arquitectura.
- Los providers de descargas principales ya separan parte de la dependencia con APIs externas.

### Riesgos actuales

- El runtime todavia depende de globales (`globalThis.conn`, `globalThis.conns`, `globalThis.plugins`, `globalThis.info`) en puntos visibles.
- `context-builder.ts` muta `info.wm` e `info.img2` con la config del bot que procesa cada mensaje. Con bot principal + subbots en paralelo, una respuesta puede heredar marca de otra sesion.
- Muchos plugins conservan imports legacy de mensajes y replies, lo que hace mas lenta la migracion a i18n y pruebas unitarias.
- El estado efimero repetido ya tiene helpers compartidos y compuertas para los flujos migrados. El riesgo residual esta en mantener las excepciones de infraestructura bajo control.
- El contrato de providers todavia expresa muy poco (`empty`/`error`), asi que los plugins no pueden distinguir bien entre timeout, rate limit, error de proveedor, respuesta invalida o no encontrado.

## Mejora arquitectonica recomendada

### A1. Fachada de runtime y marca por contexto

Problema:

- `globalThis.info` es mutable y compartido.
- `context-builder.ts` cambia `info.wm` e `info.img2` por mensaje segun el subbot.
- Plugins y menus leen `info.wm` directamente.
- `globalThis.conn`, `globalThis.conns` y `globalThis.plugins` tambien se leen desde varios puntos, lo que dificulta tests y multi-sesion limpia.

Objetivo:

- Que cada comando reciba su identidad de bot desde `PluginContext`, no desde un global mutable.
- Que los accesos a conexiones y plugins activos pasen por fachadas pequenas, testeables y con contrato claro.

Propuesta de diseno:

1. Crear `src/core/runtime-state.ts` o `src/services/runtime-state.service.ts`.
2. Exponer funciones de lectura/escritura controladas:
   - `getMainConnection()`
   - `setMainConnection(conn)`
   - `listSubbotConnections()`
   - `registerSubbotConnection(conn)`
   - `unregisterSubbotConnection(userId)`
   - `getLoadedPlugins()`
   - `setLoadedPlugin(name, plugin)`
   - `removeLoadedPlugin(name)`
3. Crear un tipo de marca:

```ts
export interface BotBranding {
    watermark: string;
    logoUrl: string;
}
```

4. Agregar `branding` a `HandlerContext` y `PluginContext`.
5. En `buildContext`, calcular:

```ts
const branding = {
    watermark: botConfig.name ?? info.wm,
    logoUrl: botConfig.logo_url ?? info.img2,
};
```

sin mutar `info`.

6. Migrar plugins que leen `info.wm` a `ctx.branding.watermark` o `sdk.branding.watermark`.
7. Dejar `globalThis.info` como fallback legacy temporal, pero no mutarlo por mensaje.

Primeros archivos candidatos:

- `src/core/context-builder.ts`
- `src/types/context.ts`
- `src/core/plugin-sdk.ts`
- `src/plugins/menus/main-menu.ts`
- `src/plugins/menus/menu-renderer.ts`
- Plugins que usan `info.wm`: stickers, descargas, info, RPG y algunos hooks.

Beneficios:

- Evita filtrado de marca entre bot principal y subbots.
- Reduce dependencia con globales.
- Facilita pruebas de menus y plugins sin preparar `globalThis`.
- Prepara ejecucion multi-instancia o workerizada si algun dia se mueve estado a backend/cache externa.

Riesgos:

- Muchos plugins leen `info.wm`; migrarlos todos de golpe seria grande.
- Debe hacerse por compatibilidad: primero agregar `branding`, luego migrar consumidores por familia.

Plan incremental:

1. Agregar `branding` al contexto y SDK sin tocar plugins legacy.
2. Migrar menus e info, porque son visibles y de bajo riesgo.
3. Migrar stickers/descargas que ponen watermark en `contextInfo`.
4. Agregar test de arquitectura que prohiba nuevas mutaciones de `globalThis.info` fuera de `core/config.ts`.
5. Cuando no queden lectores directos relevantes, congelar `info` como configuracion default.

## Mejora de codigo especifico recomendada

### C1. Helpers compartidos para estado efimero

Problema:

Hay muchos patrones repetidos:

- cooldown por chat o usuario;
- pending action con timeout;
- mapa temporal que se limpia con `setTimeout`;
- confirmaciones de transferencia/venta/reto;
- mensajes recientes o captions guardados mientras termina un flujo.

Ejemplos actuales:

- `src/plugins/menus/main-menu.ts`: cooldown por chat.
- `src/plugins/rpg/rpg-leaderboard.ts`: cooldown por chat con mensaje previo.
- `src/plugins/games/game-ppt.ts`: cooldowns, retos y partidas con timers.
- `src/plugins/rpg/rpg-transfer.ts`: confirmacion con timeout.
- `src/plugins/rpg/rpg-rw-vender.ts`: venta pendiente con timer.
- `src/plugins/hooks/_virustotal.ts`: deduplicacion temporal de URLs.
- `src/core/message-dedup.ts`: mensajes procesados con TTL.

Objetivo:

Crear una utilidad pequena y tipada para estandarizar expiracion, lectura y limpieza de estado efimero, sin convertir todo en DB ni bloquear el modo single-process actual.

Propuesta de API:

```ts
export interface ExpiringStoreOptions {
    ttlMs: number;
    onExpire?: (key: string) => void | Promise<void>;
}

export function createExpiringMap<T>(options: ExpiringStoreOptions) {
    return {
        get(key: string): T | undefined;
        set(key: string, value: T, ttlMs?: number): void;
        has(key: string): boolean;
        delete(key: string): boolean;
        clear(): void;
        size(): number;
    };
}

export function createCooldownStore(options: {ttlMs: number}) {
    return {
        check(key: string): {allowed: true} | {allowed: false; remainingMs: number};
        touch(key: string): void;
        reset(key: string): void;
    };
}

export function createPendingActionStore<T>(options: ExpiringStoreOptions) {
    return {
        start(key: string, value: T, ttlMs?: number): void;
        get(key: string): T | undefined;
        consume(key: string): T | undefined;
        cancel(key: string): boolean;
    };
}
```

Primer modulo sugerido:

- `src/lib/ephemeral-state.ts`
- pruebas en `tests/helpers.test.ts` o `tests/ephemeral-state.test.ts`

Migracion inicial de bajo riesgo:

1. `src/plugins/menus/main-menu.ts`
2. `src/plugins/rpg/rpg-leaderboard.ts`
3. `src/core/message-dedup.ts`
4. `src/plugins/hooks/_virustotal.ts`

Migracion posterior:

1. `src/plugins/games/game-ppt.ts`
2. `src/plugins/rpg/rpg-transfer.ts`
3. `src/plugins/rpg/rpg-rw-vender.ts`
4. `src/plugins/rpg/rpg-rw.ts`

Beneficios:

- Menos timers sueltos y menos riesgo de leaks.
- Politica comun de expiracion y limpieza.
- Mejor testabilidad.
- Base clara para reemplazar por Redis/DB/cache externa si se necesita multi-proceso.

Regla de mantenimiento propuesta:

- Nuevos plugins no deberian crear `new Map()` para cooldowns o pending actions si el helper cubre el caso.
- `new Map()` sigue permitido para indices locales puros dentro de una ejecucion de comando, por ejemplo agrupar filas o deduplicar resultados.

## Nuevo proceso recomendado

### P1. ADR ligero para decisiones arquitectonicas

Crear `docs/adr/` y registrar decisiones que cambien contratos internos. No debe ser burocratico: un archivo corto por decision.

Formato sugerido:

```md
# ADR-0001 - Marca del bot por contexto

Fecha:
Estado: propuesto | aceptado | reemplazado

## Contexto
Que problema resuelve.

## Decision
Que cambia y que no cambia.

## Consecuencias
Beneficios, riesgos y plan de migracion.

## Validacion
Comandos/tests que deben pasar.
```

Primeros ADR candidatos:

- Marca del bot por contexto y no por `globalThis.info`.
- Fachada de runtime para conexiones y plugins cargados.
- Politica de estado efimero single-process.
- Contrato de errores de providers.
- Catalogo documental de comandos.

### P2. Scorecard de refactor por modulo

Antes de tocar una familia grande (`rpg`, `group`, `downloads`, `stickers`), registrar una tabla breve:

| Criterio | Estado |
|---|---|
| Usa SDK | si/no/parcial |
| Usa `sdk.content` | si/no |
| Usa provider | no aplica/parcial/si |
| Estado efimero compartido | no/parcial/si |
| Pruebas existentes | ninguna/helpers/servicio/plugin |
| Riesgo operativo | bajo/medio/alto |

Esto evita refactors grandes sin frontera y ayuda a elegir lotes pequenos.

## Priorizacion sugerida

## Estado de ejecucion 2026-06-30

Avance aplicado sobre el orden inmediato:

- [x] ADR creado: `docs/adr/ADR-0001-branding-por-contexto.md`.
- [x] `branding` agregado a `HandlerContext`, `PluginContext`, `BeforePluginContext` y `PluginSdk`.
- [x] `context-builder.ts` dejo de mutar `info.wm` e `info.img2`; ahora calcula marca por contexto.
- [x] Menus e info de bajo riesgo migrados a `branding`: `main-menu.ts`, `info-donar.ts`, `info-instalarbot.ts` y `maker-txt.ts`.
- [x] Prueba de arquitectura agregada para bloquear nuevas mutaciones de `globalThis.info` fuera de `core/config.ts`.
- [x] Helper `src/lib/ephemeral-state.ts` creado con pruebas dedicadas.
- [x] Migracion inicial de estado efimero aplicada a `message-dedup.ts`, `main-menu.ts`, `rpg-leaderboard.ts` y `_virustotal.ts`.
- [x] Consumidores directos de `info.wm` migrados a `branding.watermark` en `stickers`, `downloads`, `hooks`, `games`, `owner` y `rpg`.
- [x] Prueba P0 endurecida para bloquear nuevos lectores directos de `info.wm`/`info.img2` fuera de `context-builder.ts`.
- [x] ADR creado: `docs/adr/ADR-0002-fachada-runtime.md`.
- [x] Fachada `src/core/runtime-state.ts` creada para conexion principal, subbots y plugins cargados.
- [x] Accesos directos a `globalThis.conn`, `globalThis.conns`, `globalThis.plugins`, `global.conn`, `global.conns` y `global.plugins` migrados a la fachada.
- [x] Prueba P0 agregada para bloquear nuevos accesos directos al runtime global fuera de `runtime-state.ts`.
- [x] `src/lib/ephemeral-state.ts` extendido para que `onExpire` reciba tambien el valor expirado.
- [x] Pending actions complejas migradas al helper de estado efimero:
  - `src/plugins/games/game-ppt.ts`
  - `src/plugins/rpg/rpg-transfer.ts`
  - `src/plugins/rpg/rpg-rw-vender.ts`
  - `src/plugins/rpg/rpg-rw.ts`
- [x] Prueba P0 agregada para bloquear `new Map`, `setTimeout` y `clearTimeout` manuales en esos flujos ya migrados.
- [x] ADR creado: `docs/adr/ADR-0005-estado-efimero-single-process.md`.
- [x] P5 cerrado para modo single-process:
  - `game-math.ts`, `game-ttt.ts`, `fun-adivinar.ts` y `_autolevelup.ts` migrados al helper de estado efimero.
  - captions/mensajes temporales de `Drive`, `GitClone`, `MediaFire`, `ModAPK`, `Play`, `Spotify` y `AppleMusic` migrados a mapas con expiracion.
  - `createExpiringMap()` expone `entries()` y `values()` para reemplazar iteraciones de mapas manuales.
  - `tests/p0-architecture.test.ts` protege los nuevos archivos migrados.
  - Excepciones de `new Map` y `setTimeout` documentadas en `docs/architecture-roadmap.md`.
- [x] ADR creado: `docs/adr/ADR-0003-errores-tipados-de-providers.md`.
- [x] `ProviderFailureReason` expandido a `timeout`, `rate_limit`, `not_found`, `invalid_response`, `network` y `unsupported`.
- [x] Clasificacion y resumen de fallos centralizados en `src/providers/provider.types.ts`.
- [x] Provider de YouTube migrado para acumular fallos por candidato en `runDownloadProviders`, `downloadYouTubeAudio` y `downloadYouTubeVideo`.
- [x] Comandos `.play`, `.play2`, `.ytmp3` y `.ytmp4` actualizados para mostrar una causa breve cuando todos los providers fallan.
- [x] Helper `src/plugins/downloads/download-error.ts` creado para renderizar fallos por scope.
- [x] Comandos consumidores de providers comunes actualizados para mostrar causa breve:
  - Spotify
  - TikTok
  - Instagram
  - Facebook
  - Mediafire
  - Drive
  - Threads
- [x] Tests de providers ampliados para validar mensajes `downloadFailed` y `failureReason` de todos los scopes migrados.
- [x] `src/lib/provider-fallback.ts` adaptado con `runFirstProviderResult()` para devolver `ProviderResult`.
- [x] Helpers legacy de descarga migrados al contrato tipado:
  - `src/plugins/downloads/descargas.appmusic.ts`
  - `src/plugins/downloads/descargas-modapk.ts`
  - `src/plugins/downloads/descargas-pinterest.ts`
- [x] Providers secundarios extraidos a `src/providers/downloads`:
  - `applemusic.provider.ts`
  - `modapk.provider.ts`
  - `pinterest.provider.ts`
- [x] Stalkers de metadata social extraidos a `src/providers/downloads`:
  - `instagram-stalk.provider.ts`
  - `tiktok-stalk.provider.ts`
- [x] Providers de IA extraidos:
  - `src/providers/ai/text.provider.ts`
  - `src/providers/ai/image.provider.ts`
- [x] Providers de conversion base extraidos:
  - `src/providers/media-conversion/image.provider.ts`
  - `src/providers/media-conversion/audio.provider.ts`
  - `src/providers/media-conversion/upload.provider.ts`
- [x] Provider de stickers avanzados extraido:
  - `src/providers/media-conversion/sticker.provider.ts`
  - Telegram packs
  - Stickerly
  - quote cards
  - emoji mix
  - texto animado `attp/brat/bratvid`
  - reacciones GIF/waifu
- [x] Pruebas agregadas:
  - `tests/ai-providers.test.ts`
  - `tests/media-conversion-providers.test.ts`
- [x] Mensajes de fallo tipado agregados para Apple Music, ModAPK y Pinterest.
- [x] ADR creado: `docs/adr/ADR-0004-catalogo-comandos.md`.
- [x] Catalogo documental inicial creado en `resources/data/commands.json`.
- [x] Menus migrados para leer iconos, usos y descripciones desde `src/services/command-catalog.service.ts`.
- [x] Prueba `test:catalog` agregada para validar formato, aliases clave y longitud de descripciones.
- [x] Ayuda consultable implementada con `help <comando>`, `ayuda <comando>` y `<comando> --help`.
- [x] Respuestas de ayuda compactas con formato WhatsApp (`*texto*`) y sin duplicar aliases como comandos separados.
- [x] Prueba `test:help` agregada para validar formato corto, aliases, fallback y ausencia de `**`.
- [x] Auditoria `catalogaudit` agregada para comparar plugins cargados contra `resources/data/commands.json`.
- [x] Prueba `test:catalog-audit` agregada para validar faltantes, permisos, ambito y formato compacto.
- [x] Primera pasada estatica del catalogo completada para familias `downloads` y `group`:
  - aliases y ejemplos visibles agregados para descargas.
  - `requiredRole` y `scope` documentados para comandos de grupo/admin.
  - subcomandos utiles agregados: `group open`, `group close`, `grupo aprobar`, `msglog`, `setwelcome`, `setbye`, `resetai`, `timeIA`.
- [x] Primera pasada estatica del catalogo completada para familias `rpg` y `stickers`:
  - economia, registro, banco, niveles, gacha y pareja documentados con aliases.
  - stickers comunes, texto, packs, Telegram, acciones y reacciones documentados.
  - usos canonicos ajustados cuando el `help` legacy no coincide con el comando ejecutable.
- [x] Primera pasada estatica del catalogo completada para familias `owner`, `tools`, `games`, `info`, `search` y `subbots`:
  - comandos owner sensibles documentados con permisos visibles.
  - herramientas, busquedas, IA, juegos y subbots cubiertos con aliases canonicos.
  - pruebas de catalogo ampliadas para aliases clave de estas familias.
- [x] Segunda pasada estatica del catalogo completada para familias `audio`, `converters`, `fun`, `random`, `nsfw`, `messages` y `menus`:
  - menus agregaron aliases reales sin duplicar comandos como entradas separadas.
  - convertidores y audios personalizados quedaron con usos mas precisos.
  - NSFW, juegos sociales, trivia, frases, random anime y reacciones GIF quedaron documentados en formato corto.
- [x] P7 cerrado:
  - ayuda de subcomandos muestra el comando completo: `db info`, `setprompt delete`, `enable welcome`.
  - colisiones documentales resueltas para `top`, reacciones GIF/sticker y acciones random/anime.
  - `help` legacy de stickers/RPG apunta ahora a comandos alcanzables por el router.
- [x] Migracion SDK legacy aplicada al primer bloque pequeno:
  - `src/plugins/messages/msg-text-ins.ts`
  - `src/plugins/messages/msg-gif-dp.ts`
  - `src/plugins/messages/msg-gif-reactions.ts`
  - `src/plugins/random/random-anime.ts`
  - `src/plugins/nsfw/nsfw-contenido.ts`
  - `src/plugins/audio/so-add-audio.ts`
  - estos plugins ya usan `defineSdkPlugin`, `sdk.content`, `sdk.reply`, `sdk.sendMessage`, `sdk.sendFile` y `sdk.http` cuando aplica.
- [x] Migracion SDK legacy aplicada a `downloads`:
  - todos los comandos de `src/plugins/downloads` usan `defineSdkPlugin`.
  - los comandos de descarga usan `sdk.content`, `sdk.reply`, `sdk.sendMessage`, `sdk.sendFile` y `sdk.http`.
  - `download-error.ts` usa `content.service` en lugar de `message-template`.
- [x] Migracion SDK legacy aplicada a `stickers`:
  - todos los comandos de `src/plugins/stickers` usan `defineSdkPlugin`.
  - los comandos de stickers usan `sdk.content`, `sdk.reply`, `sdk.sendMessage`, `sdk.sendFile` y providers multimedia.
- [x] Migracion SDK legacy de `group` cerrada:
  - migrados comandos simples (`setdesc`, `setname`, `link`, `resetlink`, `message-log`, `pin`).
  - migrada moderacion basica (`promote`, `demote`, `kick`, `kicknum`, `delete`, `setpp`).
  - migrados listados/advertencias (`staff`, `listwarn`, `warn`, `delwarn`).
  - cerrados `config`, `fantasmas`, `groupInfo`, `hidetag`, `setConfig`, `sethorario`, `setprompt`, `setrole` y `tagall`.
- [x] Migracion SDK legacy de `rpg` cerrada:
  - 26/26 archivos migrados a `defineSdkPlugin`.
  - economia y recompensas usan `sdk.reply`, `sdk.content` y `sdk.http` donde aplica.
  - registro/perfil, parejas, transferencia y RW/gacha migrados conservando hooks `before` y estado efimero compartido.
  - `src/plugins/rpg` queda sin imports directos a `message-template.js` ni `http-client.js`.
- [x] Migracion SDK legacy de `owner` y resto de plugins cerrada:
  - `src/plugins/owner` queda 21/21 en `defineSdkPlugin`.
  - comandos sensibles (`exec`, `exec2`, `fetch`, `update`, `backup`, `restart`, `join`) conservan auditoria, timeouts, limites y permisos.
  - menus, subbots, games/fun y config quedan fuera de `definePlugin`.
  - hooks `antilink`, `antiprivado`, `autolevelup`, `virustotal` y `autoresponder` dejan de importar `message-template`/`http-client` desde plugins.
  - se agrega `src/services/public-ai-fallback.service.ts` para encapsular el fallback HTTP publico del autoresponder.

Punto de continuacion recomendado:

1. Ejecutar `catalogaudit` en un runtime real y revisar diferencias de metadata/permisos.
2. Corregir primero metadata real del plugin cuando `requiredRole` o `scope` no coincidan con el catalogo.
3. P1 cerrado al 100%; la migracion SDK legacy de plugins queda cerrada. Continuar con P6 i18n o pruebas de plugins complejos. P5 queda en mantenimiento.
4. Despues de ese bloque, volver a medir:

```bash
rg "globalThis\\.info|\\binfo\\.wm\\b|\\binfo\\.img2\\b" src
rg "globalThis\\.(conn|conns|plugins)\\b|\\bglobal\\.(conn|conns|plugins)\\b" src
rg "new Map<|new Map\\(" src/plugins src/core src/lib
rg "setTimeout\\(|clearTimeout\\(" src/plugins src/core src/lib
rg "ProviderFailureReason|summarizeProviderFailures|classifyProviderFailure" src tests
```

### Ahora

1. Continuar con P6 i18n por scorecard.
2. Revisar diferencias reales que reporte `catalogaudit` cuando el bot este cargado.
3. Mantener P5 cerrado: nuevos cooldowns, retos o pending actions deben usar los helpers compartidos.

### Siguiente ciclo

1. Ampliar pruebas unitarias de plugins complejos con repositorios/servicios mockeados.
2. Ampliar pruebas unitarias de plugins con repositorios mockeados.

### Mas adelante

1. Evaluar persistencia externa para estado efimero si el bot pasa a multi-proceso.
2. Evaluar convertir `runFirstProvider` en alias deprecated de `runFirstProviderResult` cuando ya no haya consumidores que esperen excepciones.

## Criterios de aceptacion

Para cada mejora estructural:

```bash
npm run typecheck
npm run build
npm test
```

Validaciones adicionales:

```bash
rg "globalThis\\.info|\\binfo\\.wm\\b|\\binfo\\.img2\\b" src
rg "globalThis\\.(conn|conns|plugins)\\b|\\bglobal\\.(conn|conns|plugins)\\b" src
rg "new Map<|new Map\\(" src/plugins src/core src/lib
rg "setTimeout\\(|clearTimeout\\(" src/plugins src/core src/lib
rg "ProviderFailureReason|summarizeProviderFailures|classifyProviderFailure" src tests
rg -l "message-template\\.js" src/plugins
rg -l "http-client\\.js" src/plugins
```

La meta no es que estas busquedas den cero inmediatamente. La meta es que cada nuevo cambio reduzca o justifique resultados.
