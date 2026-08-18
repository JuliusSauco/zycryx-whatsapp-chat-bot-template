# Roadmap de arquitectura

Este roadmap prioriza cambios estructurales que reducen acoplamiento y preparan el bot para i18n, providers externos mas estables y plugins mas faciles de mantener.

## Snapshot 2026-06-30

Actualizacion 2026-07-21: se implemento el siguiente bloque arquitectonico sobre P0/P2/P5:

- reservas transaccionales e idempotentes para costos de comandos;
- guards sin descuentos y ordenados antes de reservar;
- registro validado con rollback de hot reload;
- manifiesto compatible, features tipadas e interceptores;
- perfiles de timeout, `AbortSignal` y locks compartidos por plugin;
- cola background acotada/coalescida y watchers solo fuera de produccion.

- Avance general estimado del roadmap arquitectonico: 82%.
- P0 esta cerrado como contrato arquitectonico: los plugins nuevos y migrados deben usar `defineSdkPlugin`, `sdk.content`, `sdk.http`, `sdk.reply` y helpers del SDK.
- La compuerta `tests/p0-architecture.test.ts` protege a los plugins migrados para que no vuelvan a importar `message-template` ni `http-client` directamente.
- La deuda legacy de plugins queda cerrada: 157 plugins usan `defineSdkPlugin`, 0 siguen en `definePlugin`, 0 archivos de plugins importan `message-template.js` y 0 importan `http-client.js`.
- La deuda legacy de plugins ya no bloquea P0; las nuevas mejoras deben conservar la compuerta P0 en verde.
- P3 queda cancelado: no se usara backend REST/GraphQL y el bot se conectara directamente a PostgreSQL mediante Drizzle.
- P1 ya tiene providers reales para YouTube, Spotify, TikTok, Threads, Instagram, Facebook, MediaFire y Drive en `src/providers/downloads`.
- La base está normalizada en siete schemas; `database/schema.sql` es el bootstrap único PostgreSQL 18 para instalaciones nuevas.

| Fase | Avance | Estado |
|---|---:|---|
| P0 - SDK/contenido | 100% | Cerrado como contrato base; queda deuda legacy fuera de P0. |
| P1 - Providers | 100% | Cerrado: descargas, IA, conversores, stalkers y stickers avanzados tienen providers por dominio. |
| P2 - Testing nucleo | 100% | Cerrado para router, guards, context builder y servicios. |
| P3 - Backend adapter | Cancelado | Descartado por decision arquitectonica; PostgreSQL directo es la persistencia oficial. |
| P4 - Seguridad owner | 100% | Cerrado para comandos sensibles auditados. |
| P5 - Runtime/escalabilidad | 100% | Cerrado para modo single-process: runtime, branding y estado efimero tienen fachadas, helpers, reglas y excepciones documentadas. |
| P6 - i18n/contenido | 25% | Base de mensajes lista; falta locales/fallback. |
| P7 - Catalogo comandos/help | 100% | Cerrado: catalogo JSON, ayuda consultable, auditoria, subcomandos y colisiones documentales resueltas. |

## P0 - Contrato de contenido y SDK de plugins - 100%

Objetivo: que los plugins nuevos y migrados no importen helpers sueltos para mensajes, HTTP, providers, locks o replies.

- [x] Crear `src/services/content.service.ts` como API oficial de mensajes y templates.
- [x] Dejar `src/lib/message-template.ts` como fachada de compatibilidad.
- [x] Crear `src/core/sdk-plugin.ts` y `src/core/plugin-sdk.ts`.
- [x] Migrar plugins piloto al SDK: `herramientas-base64.ts`, `herramienta-id.ts`, `herramientas-ssweb.ts`.
- [x] Migrar primer bloque simple al SDK: `herramientas-hd.ts`, `herramientas-translate.ts`, `maker-txt.ts`.
- [x] Migrar bloque simple de informacion al SDK: `info-ping.ts`, `info-uptime.ts`, `info-sc.ts`, `info-gruposofc.ts`, `info-estado.ts`.
- [x] Migrar bloque informativo/owner simple al SDK: `info-donar.ts`, `info-instalarbot.ts`, `info-reporte.ts`, `info-grouplist.ts`, `herramientas-list.ts`.
- [x] Migrar bloque busqueda/inspeccion al SDK: `buscador-lyrics.ts`, `buscador-google.ts`, `herramientas-superinspect.ts`.
- [x] Migrar bloque restante info/tools/search al SDK: `info-speedtest.ts`, `info-infobot.ts`, `herramientas-whatmusic.ts`, `herramientas-dallE.ts`, `herramientas-chagpt.ts`.
- [x] Migrar plugins simples de bajo riesgo al SDK y `content.service`.
- [x] Migrar bloque de convertidores al SDK: `convertidor-toimg.ts`, `convertidor-tomp3.ts`, `convertidor-tts.ts`, `convertidor-tourl.ts`.
- [x] Migrar bloque legacy pequeno al SDK: `messages`, `random`, `nsfw` y `audio`.
- [x] Migrar familia `downloads` al SDK usando providers existentes y `sdk.content`/`sdk.http`.
- [x] Migrar familia `stickers` al SDK usando providers multimedia y `sdk.content`.
- [x] Migrar familia `group` al SDK por sublotes funcionales.
- [x] Migrar familia `rpg` al SDK, incluyendo economia, registro/perfil, parejas, transferencias y RW/gacha.
- [x] Definir una regla de mantenimiento: plugins nuevos usan `defineSdkPlugin` salvo excepcion justificada.
- [x] Reducir imports directos de `src/lib/message-template.ts` y `src/lib/http-client.ts` en plugins migrados.
- [x] Agregar test de arquitectura P0 para evitar regresiones de imports directos en plugins migrados.

Deuda posterior a P0:

- [x] 100% - Migrar `messages`, `random`, `nsfw` y `audio` al SDK.
- [x] 100% - Migrar `downloads` al SDK durante la extraccion de providers.
- [x] 100% - Migrar `stickers` y `media conversion` al SDK despues de estabilizar providers multimedia.
- [x] 100% - Migrar `group`, `games`, `rpg`, `owner`, `menus`, `subbots`, `fun`, `config` y hooks por bloques funcionales. No quedan plugins con `definePlugin`.

Nota: esta deuda queda registrada como migracion legacy posterior. No reabre P0, porque el contrato nuevo y su compuerta ya existen.

## P1 - Providers por dominio - 100%

Objetivo: aislar APIs externas inestables detras de contratos propios.

- [x] 100% - Crear `src/providers/downloads` con contrato inicial para busqueda, metadata y media descargable.
- [x] 100% - Empezar por YouTube: extraer `youtube-download.helpers.ts`, `descargas-play.ts` y `descargas-play2.ts` hacia `src/providers/downloads/youtube.provider.ts`.
- [x] 100% - Agregar `tests/download-providers.test.ts` y `npm run test:providers` como compuerta inicial de providers.
- [x] 100% - Mantener `src/plugins/downloads/youtube-download.helpers.ts` como re-export temporal para no romper imports legacy mientras se migra por bloques.
- [x] 100% - Extraer Spotify a provider: busqueda, metadata, descarga y fallback.
- [x] 100% - Extraer TikTok/Threads/Instagram/Facebook/MediaFire/Drive a providers por dominio, priorizando comandos con mas APIs externas o fallbacks duplicados.
- [x] 100% - Extraer providers secundarios de descargas/busqueda: AppleMusic, ModAPK y Pinterest.
- [x] 100% - Extraer stalkers de metadata social: InstagramStalk y TikTokStalk.
- [x] 100% - Crear `src/providers/ai` para ChatGPT, Gemini, DeepSeek, BlackBox e imagenes IA sin depender de backend.
- [x] 100% - Crear `src/providers/media-conversion` para conversores base: webp a imagen, audio, TTS y subida de archivos.
- [x] 100% - Extender `src/providers/media-conversion` hacia stickers avanzados: Telegram packs, Stickerly, quote cards, emoji mix, texto animado y reacciones GIF.
- [x] 100% - Normalizar errores de providers con codigos internos, mensajes seguros, timeout por candidato y retry opt-in.
- [x] 100% - Agregar pruebas unitarias base de fallback, retry, timeout y sanitizacion de errores.
- [ ] 20% - Documentar variables externas nuevas o existentes en `.env.example`.

Pendientes tecnicos concretos de P1:

- [x] 100% - Definir tipos compartidos iniciales para `ProviderResult`, `ProviderFailureReason` y metadata comun de fallbacks.
- [x] 100% - Decidir politica base de provider: cada dominio expone candidatos/fachadas; `http-client` controla HTTP y `ProviderCandidate` puede declarar timeout/retry por candidato cuando haga falta.
- [x] 100% - Separar providers que solo buscan metadata de providers que descargan media para descargas, stalkers, IA y conversores base.
- [x] 100% - Evitar que plugins conozcan URLs de APIs externas, formatos crudos o llaves de respuesta en familias migradas.
- [x] 100% - Mantener pruebas sin red para seleccion de fallback, parseo de respuestas y normalizacion de errores en providers migrados.
- [x] 100% - Documentar excepciones cuando un scraper deba vivir en `src/lib` por cookies, multipart, redirects o streaming.

P1 queda cerrado como contrato base. Ajustes futuros de orden, timeout/retry especifico o nuevos proveedores quedan como mantenimiento incremental, no como fase abierta.

## P2 - Testing de nucleo - 100%

Objetivo: blindar router, guards, context builder y servicios antes de refactors mas grandes.

- [x] Pruebas del router: exact match, arrays, regex, customPrefix, limpieza de registro y before hooks.
- [x] Pruebas de guards: owner, admin, grupo/privado, modo privado/admin, recursos, ban, NSFW y pipeline.
- [x] Pruebas de context builder con sender, owners, admins, metadata/cache/settings y restricciones simuladas.
- [x] Pruebas de servicios con repositorios mockeados: chats, group settings, subbots, runtime tasks, wallet y API tokens.

## P3 - Backend adapter real - cancelado

Objetivo anterior: crear un adapter REST/GraphQL alternativo para persistencia.

Estado: cancelado. El proyecto no usara backend administrativo ni adapter REST/GraphQL; el bot se conectara directamente a PostgreSQL usando Drizzle. Se mantienen puertos y servicios para testabilidad, separacion de capas y evitar SQL directo en plugins.

- [x] Cancelado - Eliminar el scaffold backend del runtime.
- [x] Cancelado - Remover variables de selector/backend del contrato publico.
- [x] Cancelado - Documentar PostgreSQL directo como decision arquitectonica.

## P4 - Seguridad operativa owner - 100%

Objetivo: reducir riesgo en comandos con ejecucion, red, procesos o salida grande.

- [x] Retirar la ejecucion remota y conservar `info-speedtest.ts` con limites estrictos.
- [x] Agregar timeouts, limites de salida y sanitizacion de errores.
- [x] Registrar auditoria de comandos sensibles.
- [x] Documentar permisos y variables necesarias.

## P5 - Estado runtime y escalabilidad - 100%

Objetivo: preparar el bot para crecer sin depender de estado disperso en memoria.

- [x] 100% - Inventariar mapas locales de cooldowns, juegos, retos, pending actions y caches por plugin.
- [x] 100% - Crear helpers compartidos para cooldowns y acciones pendientes con expiracion.
- [x] 100% - Documentar que juegos/retos son single-process hasta tener cache externa.
- [x] 100% - Crear fachada de runtime para `globalThis.conn`, `globalThis.conns` y `globalThis.plugins`.
- [x] 100% - Revisar locks por usuario existentes y reemplazar mapas locales equivalentes cuando el flujo sea de proceso largo.
- [x] 100% - Migrar mapas/timers restantes cuando representen estado efimero de usuario, chat o juego.
- [x] 100% - Agregar compuerta P0 para impedir que los flujos migrados vuelvan a usar `new Map`, `setTimeout` o `clearTimeout` manuales.

Medicion vigente:

- 10 archivos en `src/plugins`, `src/core` o `src/lib` aun contienen `new Map`.
- 21 archivos aun contienen `setTimeout` o `clearTimeout`.
- No hay mutaciones de `globalThis.info.wm`/`globalThis.info.img2` por mensaje; `context-builder.ts` solo lee `info` como fallback.

Excepciones aceptadas al cierre de P5:

- `new Map` queda permitido en infraestructura y caches controladas: `ephemeral-state.ts`, `db-cache.ts`, `local-json-resource.ts`, `static-resource-cache.ts`, `router.ts`, `context-builder.ts`, `main.ts`, `user-request-locks.ts`.
- `new Map` queda permitido como indice local puro dentro de una ejecucion, por ejemplo agregaciones de `grupo-fantasmas.ts` o conversiones temporales en `jadi-bots.ts`.
- `setTimeout` queda permitido para timeouts HTTP/scraper, reconexion Baileys/subbots, borrado diferido de mensajes, reinicio owner, tareas programadas, colas en segundo plano y expiraciones encapsuladas por `ephemeral-state.ts`.
- Nuevos cooldowns, retos, acciones pendientes o estado temporal de usuario/chat/juego deben usar `src/lib/ephemeral-state.ts` o `src/lib/user-request-locks.ts`.

## P6 - i18n y contenido - 25%

Objetivo: convertir el trabajo de `messages.json` en base real para i18n.

- [ ] 0% - Definir estructura de locales, por ejemplo `resources/data/locales/es/messages.json`.
- [ ] 0% - Agregar fallback de idioma en `content.service`.
- [x] 100% - Mantener compatibilidad temporal con `resources/data/messages.json`.
- [ ] 10% - Agregar test de keys requeridas y fallback.
- [x] 100% - Migrar plugins legacy fuera de `message-template` hacia `sdk.content`/`content.service`.

## P7 - Catalogo de comandos y ayuda consultable - 100%

Objetivo: separar la documentacion editable de comandos del routing tecnico de plugins.

- [x] 100% - Crear `resources/data/commands.json` como catalogo documental de comandos.
- [x] 100% - Migrar `src/plugins/menus/menu-command-metadata.ts` hacia JSON o cargarlo desde un servicio.
- [x] 100% - Crear `src/services/command-catalog.service.ts` para resolver uso, descripcion, ejemplos, aliases, flags y permisos visibles.
- [x] 100% - Implementar ayuda consultable con `/<comando> --help`, `/help <comando>` y `/ayuda <comando>`.
- [x] 100% - Soportar subcomandos, por ejemplo `/enable welcome --help`, `/db info --help`, `/setprompt delete --help`.
- [x] 100% - Agregar pruebas de formato compacto, aliases y ayuda consultable.
- [x] 100% - Agregar auditoria que compare catalogo vs plugins cargados para detectar comandos sin documentar y permisos documentados que no coinciden.
- [x] 100% - Completar metadata por familias; primera pasada hecha en `downloads`, `group`, `rpg`, `stickers`, `owner`, `tools`, `games`, `info`, `search`, `subbots`, `audio`, `converters`, `fun`, `random`, `nsfw`, `messages` y `menus`.
- [x] 100% - Resolver comandos legacy duplicados entre familias en la superficie documental: `top`, reacciones GIF/sticker y acciones random/anime.
- [x] 100% - Mantener `command` real y permisos de ejecucion dentro del plugin hasta tener una migracion segura; el JSON no debe controlar routing al inicio.

P7 queda cerrado como fuente documental para menus y ayuda. El router y los plugins siguen siendo la fuente de ejecucion.

## Criterio de avance

Cada fase debe pasar:

```bash
npm run typecheck
npm run build
npm run test:helpers
npm run test:router
npm run test:guards
npm run test:context
npm run test:services
npm run test:security
npm run test:providers
npm run test:p0
```

Para P0 tambien revisar:

```bash
rg "defineSdkPlugin" src/plugins
npm run test:p0
```

Para deuda legacy y planificacion de migraciones:

```bash
rg -l "message-template\\.js" src/plugins
rg -l "http-client\\.js" src/plugins
rg -l "definePlugin\\(" src/plugins
```
