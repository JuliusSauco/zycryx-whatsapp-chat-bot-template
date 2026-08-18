# Analisis arquitectonico

Fecha de revision: 2026-06-10.

Este documento resume el estado arquitectonico actual despues de cerrar P0, iniciar P1 con providers por dominio, alinear los scripts de base de datos y cerrar P5 para runtime single-process. La revision 2026-06-10 agrega hallazgos de runtime y conexion (ver seccion al final de riesgos).

## Estado actual

- El core esta separado por responsabilidades: arranque, handler, parser, router, context builder, guards, eventos de grupo, observabilidad y tareas programadas.
- La persistencia oficial es Drizzle ORM con conexion directa a PostgreSQL.
- El adapter backend REST/GraphQL fue descartado; no forma parte del roadmap.
- Existe un SDK interno para plugins en `src/core/plugin-sdk.ts` y `src/core/sdk-plugin.ts`.
- Existe `src/services/content.service.ts` como API oficial de mensajes, listas y templates.
- `src/lib/message-template.ts` queda como fachada legacy mientras se migra el resto de plugins.
- Los plugins migrados al SDK quedan protegidos por `tests/p0-architecture.test.ts` para no volver a importar `message-template` ni `http-client` directo.
- P1 ya empezo con providers de descargas para YouTube, Spotify, TikTok, Threads, Instagram, Facebook, MediaFire y Drive.
- `src/plugins/downloads/youtube-download.helpers.ts` queda como re-export temporal para compatibilidad.
- La suite de pruebas cubre helpers, router, guards, context builder, servicios, comandos sensibles, providers y compuerta P0.
- El modelo DB está normalizado por dominios y alineado entre `src/db/schema.ts` y el bootstrap PostgreSQL 18 `database/schema.sql`.

## Avance por area

| Area | Avance | Lectura |
|---|---:|---|
| Core/handler/router/guards | 92% | Arquitectura estable y testeada; runtime global ya tiene fachada, quedan mejoras puntuales. |
| Persistencia Drizzle/PostgreSQL | 100% | Siete schemas temáticos, bootstrap PG18/Supabase y repositorios alineados. |
| SDK y contenido | 100% | Contrato nuevo cerrado; plugins y hooks migrados fuera de `definePlugin`, `message-template` y HTTP directo en plugins. |
| Providers externos | 100% | P1 cerrado: descargas, IA, conversores, stalkers y stickers avanzados tienen providers por dominio. |
| Testing | 75% | Core cubierto; faltan mas pruebas de providers, i18n y plugins complejos. |
| Seguridad owner | 90% | Comandos sensibles auditados; queda vigilancia continua al agregar comandos. |
| Runtime/escalabilidad | 85% | P5 cerrado para modo single-process; queda como futuro mover estado efimero a cache externa si hay multi-replica. |
| i18n/contenido editable | 35% | Mensajes y catalogo de comandos centralizados; faltan locales y fallback. |

## Hallazgos cuantitativos

Valores de referencia obtenidos con `rg` sobre `src/plugins`:

| Indicador | Valor | Lectura |
|---|---:|---|
| Plugins con `defineSdkPlugin` | 157 | Plugins migrados al contrato nuevo. |
| Plugins con `definePlugin` | 0 | Deuda legacy cerrada en plugins. |
| Archivos que importan `message-template.js` en plugins | 0 | Plugins y hooks consumen `sdk.content` o `content.service`. |
| Archivos que importan `http-client.js` en plugins | 0 | El HTTP directo se movio a SDK, providers o servicios. |
| Archivos con `new Map` en core/lib/plugins | 10 | Restan caches, infraestructura o indices locales aceptados por P5. |
| Archivos con `setTimeout`/`clearTimeout` en core/lib/plugins | 21 | Restan timeouts/reintentos/delays operativos aceptados por P5. |

Estos numeros no bloquean P0. El P0 garantiza el contrato para plugins nuevos y migrados; la deuda restante se trabaja por dominios.

## Puntos fuertes

- Separacion clara de core, plugins, servicios, puertos y adapters.
- Handler reducido a orquestacion y con contexto enriquecido para evitar consultas repetidas.
- Guards centralizados y testeados.
- Repositorios Drizzle separados por agregado.
- Recursos estaticos consolidados en `resources/data`, `resources/text` y `resources/media`.
- Textos visibles avanzaron hacia `resources/data/messages.json`, lo que prepara i18n.
- Audios dinamicos ya no escriben en JSON versionado; usan DB y `resources/media/audio/custom`.
- Comandos owner sensibles tienen timeouts, limites de salida, sanitizacion y auditoria.
- No hay `any` ni `@ts-ignore` en `src/**/*.ts`.

## Riesgos y deuda tecnica

### Providers externos parcialmente centralizados

Algunos plugins legacy y hooks todavia conocen URLs, formatos de respuesta y fallbacks de APIs externas.

Riesgo:

- Cambios de APIs rompen comandos completos.
- Es dificil medir proveedor por proveedor.
- Los fallbacks quedan duplicados y mezclados con UI del comando.

Recomendacion:

- Crear providers por dominio empezando por descargas.
- Los providers deben devolver modelos normalizados y errores tipados.
- Los plugins solo deben decidir UX, permisos y envio final.
- Los primeros providers creados son `src/providers/downloads/youtube.provider.ts`, `src/providers/downloads/spotify.provider.ts`, `src/providers/downloads/tiktok.provider.ts`, `src/providers/downloads/threads.provider.ts`, `src/providers/downloads/instagram.provider.ts`, `src/providers/downloads/facebook.provider.ts`, `src/providers/downloads/mediafire.provider.ts` y `src/providers/downloads/drive.provider.ts`.
- `src/plugins/downloads/youtube-download.helpers.ts` queda como re-export de compatibilidad.
- AppleMusic, ModAPK, Pinterest, InstagramStalk y TikTokStalk ya viven en `src/providers/downloads`; IA de texto/imagen vive en `src/providers/ai`; conversores base y stickers avanzados viven en `src/providers/media-conversion`.
- P1 queda cerrado. Las mejoras futuras de timeout/retry o nuevos proveedores se tratan como mantenimiento incremental.
- Evitar providers dependientes de un backend propio; P1 debe funcionar con librerias locales y HTTP centralizado.

Pendientes de diseno:

- Extender el contrato inicial `ProviderResult`/`ProviderFailureReason` con errores tipados mas expresivos.
- Definir timeout/retry por proveedor.
- Separar busqueda, metadata y descarga en contratos claros.
- Agregar pruebas sin red para fallback y parseo de respuestas.

### Migracion SDK incompleta

La migracion de plugins fuera de `definePlugin`, `message-template` y `http-client` directo queda cerrada. Aun pueden existir llamadas `m.reply`, `conn.reply` o envios especiales donde el flujo de Baileys lo requiere.

Riesgo:

- Mas acoplamiento al runtime de Baileys.
- Mas dificultad para testear comandos.
- Mas trabajo cuando llegue i18n.

Recomendacion:

- Migrar por familias, no archivo suelto.
- Bloques `messages`, `random`, `nsfw`, `audio`, `downloads`, `stickers`, `group`, `rpg`, `owner`, `menus`, `subbots`, `games`, `fun`, `config` y hooks migrados.
- Siguiente bloque recomendado: preparar P6 i18n/locales o ampliar pruebas de plugins complejos.

### Estado en memoria por plugin

Los mapas locales de cooldowns, juegos, retos, temporales y solicitudes quedaron migrados al helper compartido cuando representan estado efimero de usuario, chat o juego. `src/lib/ephemeral-state.ts` cubre cooldowns, expiring maps y pending actions; `src/lib/user-request-locks.ts` cubre procesos largos por usuario.

Riesgo:

- Dificultad para escalar a varias replicas sin cache externa.
- Posibles leaks si un nuevo plugin ignora los helpers compartidos.

Recomendacion:

- Mantener estado efimero en memoria mientras el bot sea single-process.
- Para nuevos cooldowns, pending actions, locks o expiraciones, usar `src/lib/ephemeral-state.ts` o `src/lib/user-request-locks.ts`.
- Tratar juegos/retos como no multi-replica hasta tener cache externa.
- `new Map` queda reservado para caches internas, infraestructura o indices locales puros dentro de una ejecucion.
- `setTimeout` queda reservado para timeouts HTTP/scraper, reconexion, borrados diferidos, tareas programadas, colas y expiraciones encapsuladas.

### Globales del runtime

`globalThis.conn`, `globalThis.conns`, `globalThis.plugins` e `info` siguen existiendo como almacenamiento legacy interno. El acceso a conexiones y plugins cargados ya pasa por `src/core/runtime-state.ts`; `info` queda como configuracion/fallback y la marca del bot viaja por contexto.

Riesgo:

- Acoplamiento fuerte a un solo proceso.
- Tests mas dificiles en modulos que dependen de globales.

Recomendacion:

- No eliminarlos de golpe.
- Mantener `runtime-state.ts` como unica frontera aceptada para conexiones y plugins.
- Seguir migrando consumidores nuevos a contexto/SDK en vez de leer `info` directamente.

### Recursos multimedia locales

El volumen actual es manejable y no justifica mover multimedia a cloud storage.

Riesgo futuro:

- Repo pesado si crecen MP3/MP4.
- Deploys mas lentos.

Recomendacion:

- Mantener local por ahora.
- Si crece, evaluar Supabase Storage o S3-compatible con cache local y manifest JSON.

### Catalogos JSON editables

Ya existen manifiestos para mensajes, prompts, audios, reacciones y comandos. El catalogo de comandos queda como fuente documental, no como fuente de routing.

Riesgo residual:

- Menus, ayuda y metadata visible pueden divergir de los plugins reales.
- La consistencia entre catalogo y plugins cargados debe mantenerse con auditoria cuando se agreguen comandos nuevos.

Estado aplicado:

- `resources/data/commands.json` registrado como catalogo documental.
- `command-catalog.service.ts` creado.
- `help <comando>`, `ayuda <comando>` y `<comando> --help` soportados con respuestas compactas para WhatsApp.
- `catalogaudit` agregado para validar consistencia entre catalogo y plugins cargados.
- P7 cerrado: subcomandos (`db info`, `setprompt delete`, `enable welcome`) y colisiones documentales (`top`, GIF/sticker/random) resueltas.

### Backend adapter cancelado

El adapter backend REST/GraphQL fue descartado. El bot se conectara directamente a PostgreSQL mediante Drizzle y no habra contrato REST/GraphQL de persistencia.

Riesgo:

- Reintroducir un segundo camino de persistencia sin necesidad operativa.
- Duplicar logica de repositorios y pruebas para una arquitectura que el proyecto no usara.

Recomendacion:

- Mantener una sola implementacion de repositorios: `src/adapters/drizzle`.
- Conservar puertos y servicios para separar capas, testear con mocks y evitar SQL directo en plugins.
- Si algun dia se necesita panel administrativo, tratarlo como proyecto aparte que lea/escriba la misma base o use contratos nuevos, no como selector alternativo de persistencia dentro del bot.

### Hallazgos de runtime y conexion (revision 2026-06-10)

Riesgos detectados al auditar `src/core/main.ts` y `src/lib/subbot.ts`. La mayoria fue corregida el mismo 2026-06-10; el estado de cada uno queda marcado.

1. **Recursos duplicados en reconexion del bot principal (corregido 2026-06-10).** Cada `connection close` volvia a llamar `startBot()`, que re-registraba `process.on('uncaughtException'/'unhandledRejection')` y creaba de nuevo los tres `setInterval` (limpieza de tmp, reinicio de 3h, limpieza de sesiones). Corregido: listeners de proceso e intervalos viven ahora a nivel de modulo (`startMaintenanceTasks()` en `main.ts`); `startSubBot` ya no registra listeners de proceso.
2. **Reconexion infinita con sesion invalida (corregido 2026-06-10).** Los codigos terminales detienen los reintentos y piden re-vinculacion. Ademas se corrigio la clasificacion: los terminales reales son `loggedOut` (401), `forbidden` (403) y `badSession` (500); 428 (`connectionClosed`) y 440 (`connectionReplaced`) son transitorios y deben reintentar.
3. **`globalThis.conns` nunca se depuraba (corregido 2026-06-10).** Al cerrar un subbot se remueve su entrada por `userId`, y al reconectar la entrada vieja se reemplaza por el socket nuevo.
4. **QR de vinculacion (corregido 2026-06-10).** Baileys 7 deprecó `printQRInTerminal` (no-op), por lo que la opcion 1 del menu de vinculacion no mostraba ningun QR. Corregido renderizando el campo `qr` de `connection.update` con `qrcode-terminal`.
5. **`globalThis.info` mutado por mensaje (corregido 2026-06-30).** `context-builder.ts` ya no escribe `info.wm`/`info.img2` por mensaje. La marca se calcula en contexto (`branding`) y `info` queda como fallback legacy.
6. **`package-lock.json` ignorado en git (corregido 2026-06-10).** Lockfile versionado y `ytdl-core` fijado a `^4.11.5` en vez de `latest`.
7. **`console.info`/`console.debug` silenciados globalmente (corregido 2026-07-01).** `startBot()` y `startSubBot()` ya no reasignan funciones globales de consola. Baileys queda silencioso mediante `pino` en `silent` y los logs del proyecto siguen pasando por `src/lib/logger.ts` y `LOG_LEVEL`.
8. **Error crudo expuesto al usuario (corregido 2026-06-10).** El catch del handler ahora pasa el error por `sanitizeCommandError` antes de responder en el chat; el log conserva el error completo.

## Prioridad recomendada

1. Mantener `test:p0` en `npm test`.
2. Ampliar pruebas unitarias de plugins complejos ahora que la migracion SDK esta cerrada.
3. Normalizar errores/timeouts de providers y ampliar pruebas `test:providers`.
4. Continuar con P6 i18n/locales por scorecard.
5. Preparar P6 i18n sobre `content.service` y `resources/data/messages.json`.
6. Migrar providers de stickers y media conversion cuando descargas este estable.
7. Mantener P5 cerrado: aplicar helpers de estado efimero en nuevos flujos y no agregar mapas/timers manuales para cooldowns, retos o pending actions.

## Buenas practicas vigentes

- Plugins nuevos: usar `defineSdkPlugin`.
- Mensajes nuevos: usar `sdk.content` y `resources/data/messages.json`.
- HTTP nuevo en plugins migrados: usar `sdk.http`; si hay mas de un proveedor, crear provider por dominio.
- Procesos largos: usar locks compartidos o `sdk.createUserLocks`.
- Datos grandes: mover a `.data.ts` o manifiestos JSON segun corresponda.
- Estado mutable: DB o servicio, no `resources/data`.
- Validacion minima antes de cerrar cambios:

```bash
npm run typecheck
npm run build
npm test
```
