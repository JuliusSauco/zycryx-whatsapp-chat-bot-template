# Roadmap de arquitectura

Este roadmap prioriza cambios estructurales que reducen acoplamiento y preparan el bot para i18n, providers externos mas estables y plugins mas faciles de mantener.

## Snapshot 2026-06-09

- Avance general estimado del roadmap arquitectonico: 68%.
- P0 esta cerrado como contrato arquitectonico: los plugins nuevos y migrados deben usar `defineSdkPlugin`, `sdk.content`, `sdk.http`, `sdk.reply` y helpers del SDK.
- La compuerta `tests/p0-architecture.test.ts` protege a los plugins migrados para que no vuelvan a importar `message-template` ni `http-client` directamente.
- Queda deuda legacy visible: 29 plugins usan `defineSdkPlugin`, 126 siguen en `definePlugin`, 121 archivos de plugins aun importan `message-template.js` y 37 importan `http-client.js`.
- Esa deuda no bloquea P0; se migrara por dominios/familias para evitar refactors masivos dificiles de validar.
- P3 sigue desestimado hasta que exista backend real. P1 debe avanzar con providers locales por dominio, no con un adapter backend.
- P1 ya tiene providers reales para YouTube, Spotify, TikTok, Threads, Instagram, Facebook, MediaFire y Drive en `src/providers/downloads`.
- Los scripts de base de datos estan alineados: migraciones registradas en journal y `database/schema.sql` limpio para bootstrap manual desde cero.

| Fase | Avance | Estado |
|---|---:|---|
| P0 - SDK/contenido | 100% | Cerrado como contrato base; queda deuda legacy fuera de P0. |
| P1 - Providers | 85% | Descargas principales centralizadas; faltan providers secundarios/metadata y errores normalizados. |
| P2 - Testing nucleo | 100% | Cerrado para router, guards, context builder y servicios. |
| P3 - Backend adapter | 0% | Desestimado hasta tener backend real. |
| P4 - Seguridad owner | 100% | Cerrado para comandos sensibles auditados. |
| P5 - Runtime/escalabilidad | 20% | Hay locks/cache puntuales; falta inventario y fachadas. |
| P6 - i18n/contenido | 25% | Base de mensajes lista; falta locales/fallback. |
| P7 - Catalogo comandos/help | 10% | Mejora registrada; sin implementacion todavia. |

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
- [x] Definir una regla de mantenimiento: plugins nuevos usan `defineSdkPlugin` salvo excepcion justificada.
- [x] Reducir imports directos de `src/lib/message-template.ts` y `src/lib/http-client.ts` en plugins migrados.
- [x] Agregar test de arquitectura P0 para evitar regresiones de imports directos en plugins migrados.

Deuda posterior a P0:

- [ ] 15% - Migrar `messages`, `random`, `nsfw` y `audio` al SDK.
- [ ] 20% - Migrar `downloads` al SDK durante la extraccion de providers.
- [ ] 10% - Migrar `stickers` y `media conversion` al SDK despues de estabilizar providers multimedia.
- [ ] 10% - Migrar `group`, `games`, `rpg` y `owner` por bloques funcionales, no archivo por archivo.

Nota: esta deuda queda registrada como migracion legacy posterior. No reabre P0, porque el contrato nuevo y su compuerta ya existen.

## P1 - Providers por dominio - 85%

Objetivo: aislar APIs externas inestables detras de contratos propios.

- [x] 100% - Crear `src/providers/downloads` con contrato inicial para busqueda, metadata y media descargable.
- [x] 100% - Empezar por YouTube: extraer `youtube-download.helpers.ts`, `descargas-play.ts` y `descargas-play2.ts` hacia `src/providers/downloads/youtube.provider.ts`.
- [x] 100% - Agregar `tests/download-providers.test.ts` y `npm run test:providers` como compuerta inicial de providers.
- [x] 100% - Mantener `src/plugins/downloads/youtube-download.helpers.ts` como re-export temporal para no romper imports legacy mientras se migra por bloques.
- [x] 100% - Extraer Spotify a provider: busqueda, metadata, descarga y fallback.
- [x] 100% - Extraer TikTok/Threads/Instagram/Facebook/MediaFire/Drive a providers por dominio, priorizando comandos con mas APIs externas o fallbacks duplicados.
- [ ] 0% - Crear `src/providers/ai` para ChatGPT, Gemini, DeepSeek, BlackBox y fallbacks publicos, sin depender de backend.
- [ ] 0% - Crear `src/providers/media-conversion` para ffmpeg, sticker, webp/mp4 y Ezgif.
- [ ] 25% - Normalizar errores de providers con codigos internos y mensajes seguros para usuario.
- [ ] 30% - Agregar pruebas unitarias de fallback por dominio y de normalizacion de errores.
- [ ] 20% - Documentar variables externas nuevas o existentes en `.env.example`.

Pendientes tecnicos concretos de P1:

- [x] 100% - Definir tipos compartidos iniciales para `ProviderResult`, `ProviderFailureReason` y metadata comun de fallbacks.
- [ ] 10% - Decidir politica de timeout/retry por provider: timeout corto por proveedor y fallback al siguiente.
- [ ] 25% - Separar providers que solo buscan metadata de providers que descargan media.
- [ ] 20% - Evitar que plugins conozcan URLs de APIs externas, formatos crudos o llaves de respuesta.
- [ ] 20% - Mantener pruebas sin red para seleccion de fallback, parseo de respuestas y normalizacion de errores.
- [ ] 40% - Documentar excepciones cuando un scraper deba vivir en `src/lib` por cookies, multipart, redirects o streaming.

## P2 - Testing de nucleo - 100%

Objetivo: blindar router, guards, context builder y servicios antes de refactors mas grandes.

- [x] Pruebas del router: exact match, arrays, regex, customPrefix, limpieza de registro y before hooks.
- [x] Pruebas de guards: owner, admin, grupo/privado, modo privado/admin, recursos, ban, NSFW y pipeline.
- [x] Pruebas de context builder con sender, owners, admins, metadata/cache/settings y restricciones simuladas.
- [x] Pruebas de servicios con repositorios mockeados: chats, group settings, subbots, runtime tasks, wallet y API tokens.

## P3 - Backend adapter real - 0%

Objetivo: que `DATA_SOURCE=backend` deje de ser scaffold y tenga contrato REST/GraphQL verificable.

Estado: desestimado por ahora. No avanzar providers o adapters que dependan del backend hasta que exista un backend real y versionado.

- [ ] 0% - Definir OpenAPI/GraphQL schema minimo por repositorio.
- [ ] 0% - Implementar adapter REST inicial para agregados prioritarios.
- [ ] 0% - Agregar contract tests compartidos entre Drizzle y backend.
- [ ] 0% - Documentar migracion operativa entre local DB y backend.

## P4 - Seguridad operativa owner - 100%

Objetivo: reducir riesgo en comandos con ejecucion, red, procesos o salida grande.

- [x] Auditar `owner-exec.ts`, `owner-exec2.ts`, `owner-update.ts`, `info-speedtest.ts`.
- [x] Agregar timeouts, limites de salida y sanitizacion de errores.
- [x] Registrar auditoria de comandos sensibles.
- [x] Documentar permisos y variables necesarias.

## P5 - Estado runtime y escalabilidad - 20%

Objetivo: preparar el bot para crecer sin depender de estado disperso en memoria.

- [ ] 20% - Inventariar mapas locales de cooldowns, juegos, retos, pending actions y caches por plugin.
- [ ] 15% - Crear helpers compartidos para cooldowns y acciones pendientes con expiracion.
- [ ] 20% - Documentar que juegos/retos son single-process hasta tener backend/cache externa.
- [ ] 0% - Crear fachada de runtime para `globalThis.conn`, `globalThis.conns` y `globalThis.plugins`.
- [ ] 45% - Revisar locks por usuario existentes y reemplazar mapas locales equivalentes cuando el flujo sea de proceso largo.

## P6 - i18n y contenido - 25%

Objetivo: convertir el trabajo de `messages.json` en base real para i18n.

- [ ] 0% - Definir estructura de locales, por ejemplo `resources/data/locales/es/messages.json`.
- [ ] 0% - Agregar fallback de idioma en `content.service`.
- [x] 100% - Mantener compatibilidad temporal con `resources/data/messages.json`.
- [ ] 10% - Agregar test de keys requeridas y fallback.
- [ ] 15% - Migrar plugins legacy fuera de `message-template` hacia `sdk.content`.

## P7 - Catalogo de comandos y ayuda consultable - 10%

Objetivo: separar la documentacion editable de comandos del routing tecnico de plugins.

- [ ] 0% - Crear `resources/data/commands.json` como catalogo documental de comandos.
- [ ] 10% - Migrar `src/plugins/menus/menu-command-metadata.ts` hacia JSON o cargarlo desde un servicio.
- [ ] 0% - Crear `src/services/command-catalog.service.ts` para resolver uso, descripcion, ejemplos, aliases, flags y permisos visibles.
- [ ] 0% - Implementar ayuda consultable con `/<comando> --help`, `/help <comando>` y `/ayuda <comando>`.
- [ ] 0% - Soportar subcomandos, por ejemplo `/enable welcome --help`, `/db info --help`, `/setprompt delete --help`.
- [ ] 0% - Agregar prueba que compare catalogo vs plugins cargados para detectar comandos sin documentar y permisos documentados que no coinciden.
- [x] 100% - Mantener `command` real y permisos de ejecucion dentro del plugin hasta tener una migracion segura; el JSON no debe controlar routing al inicio.

Esta mejora queda registrada, pero no debe mezclarse con P1 hasta cerrar providers iniciales. El catalogo sera fuente documental para menus y ayuda, no fuente de ejecucion al principio.

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
