# Roadmap de mejoras internas

Esta lista se mantiene fuera del README para separar la documentacion publica del backlog tecnico del proyecto. Los porcentajes son estimaciones generales para medir avance, no metricas exactas.

## Snapshot 2026-06-10

- Avance general estimado del backlog interno: 70%.
- Roadmap v1: 100%, cerrado.
- Roadmap v2: 100%, cerrado.
- Roadmap v3: 80%, cerrado en pruebas/seguridad; backend queda desestimado hasta tener contrato real.
- Roadmap v4: 68%, activo; concentra providers, SDK legacy, runtime, i18n y catalogo de comandos.
- Revision externa 2026-06-10: se agrego el bloque "Higiene de runtime y conexion" con hallazgos de `main.ts`/`subbot.ts` (detalle en `docs/architecture-analysis.md`).

## Higiene de runtime y conexion (revision 2026-06-10)

Hallazgos de la auditoria de conexion/reconexion. Hoy los enmascara el reinicio automatico cada 3 horas; corregirlos es prerequisito para sesiones largas sin reinicio forzado.

- [x] 100% - Restaurar QR de vinculacion del bot principal: Baileys 7 dejo `printQRInTerminal` como no-op; ahora se renderiza el campo `qr` de `connection.update` con `qrcode-terminal`.
- [x] 100% - Registrar `process.on('uncaughtException'/'unhandledRejection')` y los `setInterval` de limpieza una sola vez, fuera de `startBot()` (movidos a nivel de modulo en `main.ts` via `startMaintenanceTasks()`; `startSubBot` ya no re-registra listeners de proceso).
- [x] 100% - No reintentar conexion cuando el codigo de cierre es terminal de sesion: `loggedOut` (401), `forbidden` (403) y `badSession` (500) detienen los reintentos y piden re-vinculacion. Nota: 428 (`connectionClosed`) y 440 (`connectionReplaced`) son transitorios y siguen reintentando, antes estaban mal clasificados como error de sesion.
- [x] 100% - Depurar `globalThis.conns` al cerrar un subbot (remover por `userId` en `close`) y reemplazar la entrada vieja en `open` para que la reconexion registre el socket nuevo.
- [ ] 0% - Dejar de mutar `globalThis.info` (`wm`, `img2`) por mensaje en `context-builder.ts`; pasar la marca del bot via contexto.
- [x] 100% - Versionar `package-lock.json` (removido de `.gitignore`) y fijar `ytdl-core` a `^4.11.5` en vez de `latest`.
- [x] 100% - Sanitizar el error mostrado al usuario en el catch del handler (`sanitizeCommandError`); el log conserva el error completo.
- [ ] 0% - Revisar el silenciado global de `console.info`/`console.debug` en `startBot()`; preferir niveles del logger propio.

## Prioridad actual

1. 85% - Continuar P1 del roadmap arquitectonico: providers secundarios y metadata/stalkers despues de cerrar descargas principales.
2. 20% - Migrar `downloads` al SDK gradualmente mientras se extraen providers.
3. 15% - Migrar familias legacy al SDK por bloques: `messages`, `random`, `nsfw`, `audio`.
4. 0% - Mantener P3 desestimado hasta que exista backend real y contrato versionado.
5. 20% - Reducir estado runtime disperso: cooldowns, pending actions, mapas temporales y globales.
6. 25% - Preparar i18n sobre `content.service` y `resources/data/messages.json`.
7. 10% - Registrar catalogo de comandos editable en JSON y ayuda `--help`, sin mezclarlo con providers.

Ver tambien `docs/architecture-roadmap.md`.

## Roadmaps Historicos Cerrados

### Roadmap v1 - 100%

Estado: cerrado. Se mantiene solo como registro historico.

- [x] 100% - Medir tiempos por hook/plugin individual.
- [x] 100% - Cachear recursos estaticos.
- [x] 100% - Terminar unificacion del HTTP client.
- [x] 100% - Reducir mensajes intermedios en plugins pesados.
- [x] 100% - Optimizar mas el pipeline de mensajes pasivos.
- [x] 100% - Hacer mas inteligente el contexto de hooks.
- [x] 100% - Revisar `jadi-bots` y subbots.
- [x] 100% - Mover operaciones no criticas a cola.
- [x] 100% - Seguir extrayendo logica compartida.

### Roadmap v2 - 100%

Estado: cerrado. Se mantiene solo como registro historico.

- [x] 100% - Centralizar helpers aleatorios en `src/utils/random.ts`.
- [x] 100% - Centralizar alias/regex de comandos en `src/utils/command-alias.ts`.
- [x] 100% - Extraer datos estaticos de `fun-randow`.
- [x] 100% - Extraer datos estaticos de `random-anime`.
- [x] 100% - Extraer datos estaticos de `nsfw-contenido`.
- [x] 100% - Refactorizar textos largos en plugins, empezando por `owner-join.ts`.
- [x] 100% - Extraer datos estaticos RPG: `rpg-work`, `rpg-crime`, `rpg-slut`.
- [x] 100% - Refactorizar plugins pesados: `descargas-play.ts`, `descargas-play2.ts`, `herramientas-superinspect.ts`.
- [x] 100% - Revisar recursos mutables/data.
- [x] 100% - Revisar excepciones internas del HTTP client: `src/lib/scraper.ts`, `src/lib/ezgif-convert.ts`.
- [x] 100% - Consolidar compatibilidad legacy de `Array.prototype.getRandom`.
- [x] 100% - Evaluar pruebas unitarias para `random`, `command-alias`, locks y provider fallback.

## Roadmaps Activos o Condicionados

### Roadmap v3 - 80%

Estado: casi cerrado. La parte pendiente de backend queda condicionada al P3 arquitectonico y no debe bloquear mejoras locales.

- [x] 100% - Endurecer permisos de comandos owner con red arbitraria: `owner-fetch.ts`.
- [x] 100% - Eliminar uso directo de `Math.random()` en plugins y pasar por `src/utils/random.ts`.
- [x] 100% - Ampliar pruebas unitarias para router, guards y context builder.
- [x] 100% - Agregar pruebas de servicios con repositorios mockeados.
- [ ] 0% - Definir contrato REST/GraphQL real para `DATA_SOURCE=backend`.
- [x] 100% - Auditar comandos owner que ejecutan codigo, procesos o red.
- [ ] 35% - Revisar nuevos candidatos a refactor: `descargas-play2.ts`, `_virustotal.ts`, `config-on-y-off.ts`, `rpg-reg.ts`, `rpg-rw.ts`.

### Roadmap v4 - 68%

Estado: activo. Es el roadmap operativo actual y debe seguir alineado con `docs/architecture-roadmap.md`.

- [x] 100% - Cerrar P0: `content.service`, `defineSdkPlugin`, SDK interno y compuerta `test:p0`.
- [x] 100% - Migrar convertidores al SDK: `toimg`, `tomp3`, `tts`, `tourl`.
- [x] 100% - Agregar pruebas de arquitectura para evitar regresiones en plugins migrados.
- [x] 100% - Crear provider de descargas inicial para YouTube.
- [x] 100% - Conectar `descargas-play.ts` y `descargas-play2.ts` al provider de YouTube.
- [x] 100% - Agregar `test:providers` para la compuerta inicial de providers.
- [x] 100% - Extraer fallbacks de Spotify, TikTok, Threads, Instagram, Facebook, MediaFire y Drive.
- [ ] 25% - Normalizar errores, timeouts y retries de providers.
- [x] 100% - Definir contrato compartido inicial de `ProviderResult` y `ProviderFailureReason`.
- [ ] 15% - Migrar familias `messages`, `random`, `nsfw` y `audio` al SDK.
- [ ] 20% - Crear helpers compartidos para cooldowns y pending actions.
- [ ] 25% - Diseñar base i18n con fallback sobre `content.service`.
- [ ] 0% - Crear catalogo documental de comandos en `resources/data/commands.json`.
- [ ] 0% - Implementar ayuda consultable con `/<comando> --help` y `/help <comando>`.
- [ ] 0% - Definir contrato REST/GraphQL real para `DATA_SOURCE=backend` solo cuando exista backend.

## Mejoras De Base De Datos - 100%

Estado: cerrado como mantenimiento actual.

- [x] 100% - Alinear `src/db/schema.ts` con el estado final de migraciones.
- [x] 100% - Verificar que todos los `.sql` de migraciones esten registrados en `src/db/migrations/meta/_journal.json`.
- [x] 100% - Mantener `database/schema.sql` como bootstrap manual limpio desde cero.
- [x] 100% - Documentar en README la diferencia entre `npm run db:migrate` y `database/schema.sql`.

## Notas tecnicas

- Los plugins ya no usan `fetch`, `node-fetch` ni `axios` directamente; los plugins legacy usan `src/lib/http-client.ts` y los plugins migrados usan `sdk.http`.
- Los plugins nuevos deben usar `defineSdkPlugin` desde `src/core/sdk-plugin.ts` para acceder a `sdk.reply`, `sdk.content`, `sdk.http`, `sdk.providers` y locks por usuario sin importar helpers sueltos.
- Los plugins ya migrados al SDK no deben importar `src/lib/message-template.ts` ni `src/lib/http-client.ts`; `npm run test:p0` lo valida.
- Los providers por dominio deben tener pruebas unitarias sin depender de red cuando sea posible; `npm run test:providers` valida el bloque inicial.
- Se mantienen excepciones internas en `src/lib/scraper.ts`, `src/lib/webp2mp4.ts` y `src/lib/ezgif-convert.ts` porque dependen de cookies, redirects, multipart o response internals.
- Los plugins con procesos largos por usuario deben usar `src/lib/user-request-locks.ts` en vez de declarar mapas `userRequests` propios.
- La seleccion aleatoria debe pasar por `src/utils/random.ts`; `Array.prototype.getRandom` queda solo como compatibilidad legacy.
- Las tablas/listas grandes de plugins deben moverse gradualmente a archivos `.data.ts` dentro de su familia.
