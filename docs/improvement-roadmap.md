# Roadmap de mejoras internas

Esta lista se mantiene fuera del README para separar la documentacion publica del backlog tecnico del proyecto. Los porcentajes son estimaciones generales para medir avance, no metricas exactas.

## Snapshot 2026-06-10

- Avance general estimado del backlog interno: 78%.
- Roadmap v1: 100%, cerrado.
- Roadmap v2: 100%, cerrado.
- Roadmap v3: cerrado en pruebas/seguridad; backend cancelado por decision arquitectonica.
- Roadmap v4: 100%, cerrado para migracion SDK legacy; i18n queda como bloque futuro.
- Bloque operativo 2026-07-01: 100%, cerrado; concentra hardening de produccion, runbook, preflight, backups, dependencias y recuperacion.
- Revision externa 2026-06-10: se agrego el bloque "Higiene de runtime y conexion" con hallazgos de `main.ts`/`subbot.ts` (detalle en `docs/architecture-analysis.md`).
- Revision de refactor 2026-06-30: se agrego `docs/refactor-review-2026-06-30.md` con dos recomendaciones prioritarias: fachada de runtime/marca por contexto y helpers compartidos para estado efimero.

## Higiene de runtime y conexion (revision 2026-06-10)

Hallazgos de la auditoria de conexion/reconexion. Hoy los enmascara el reinicio automatico cada 3 horas; corregirlos es prerequisito para sesiones largas sin reinicio forzado.

- [x] 100% - Restaurar QR de vinculacion del bot principal y exponerlo como imagen en la consola web, con selección explícita entre QR y código.
- [x] 100% - Registrar `process.on('uncaughtException'/'unhandledRejection')` y los `setInterval` de limpieza una sola vez, fuera de `startBot()` (movidos a nivel de modulo en `main.ts` via `startMaintenanceTasks()`; `startSubBot` ya no re-registra listeners de proceso).
- [x] 100% - No reintentar conexion cuando el codigo de cierre es terminal de sesion: `loggedOut` (401), `forbidden` (403) y `badSession` (500) detienen los reintentos y piden re-vinculacion. Nota: 428 (`connectionClosed`) y 440 (`connectionReplaced`) son transitorios y siguen reintentando, antes estaban mal clasificados como error de sesion.
- [x] 100% - Depurar `globalThis.conns` al cerrar un subbot (remover por `userId` en `close`) y reemplazar la entrada vieja en `open` para que la reconexion registre el socket nuevo.
- [x] 100% - Dejar de mutar `globalThis.info` (`wm`, `img2`) por mensaje en `context-builder.ts`; la marca del bot ahora viaja por contexto y `info` queda como fallback legacy.
- [x] 100% - Versionar `package-lock.json` (removido de `.gitignore`) y fijar `ytdl-core` a `^4.11.5` en vez de `latest`.
- [x] 100% - Sanitizar el error mostrado al usuario en el catch del handler (`sanitizeCommandError`); el log conserva el error completo.
- [x] 100% - Revisar el silenciado global de `console.info`/`console.debug` en `startBot()` y subbots; se elimino la mutacion global y Baileys queda controlado por `pino` en `silent` mas el logger propio.

## Prioridad actual

1. 100% - Migrar `downloads` al SDK gradualmente ahora que P1 providers esta cerrado.
2. 100% - Bloque SDK legacy pequeno cerrado: `messages`, `random`, `nsfw`, `audio`.
3. 100% - Bloque SDK multimedia cerrado: `stickers`.
4. 100% - Bloque SDK `group` cerrado.
5. 100% - Bloque SDK `rpg` cerrado.
6. 100% - Bloque SDK `owner`, menus, subbots, games/fun, config y hooks cerrado.
7. 100% - Hardening operativo: preflight, runbook, deployment, troubleshooting, backups, dependencias y recuperacion.
8. 25% - Preparar i18n sobre `content.service` y `resources/data/messages.json` cuando se retome P6.
9. 100% - Mantener P5 cerrado: estado efimero nuevo debe usar helpers y excepciones documentadas.
10. 100% - Mantener P7 cerrado: catalogo editable, ayuda `--help`, subcomandos y auditoria.
11. Cancelado - P3 backend REST/GraphQL queda fuera del roadmap; usar PostgreSQL directo.

Ver tambien `docs/architecture-roadmap.md`.

## Hardening operativo - 100%

Estado: cerrado. Se enfoca en operar el bot con menos riesgo en servidor real, sin abrir P6 ni ampliar pruebas unitarias por ahora.

- [x] 100% - Crear `npm run ops:check` para validar preflight de produccion: Node.js, `.env`, owners, DB, herramientas externas, build y sesion principal.
- [x] 100% - Crear `docs/operations-runbook.md` con operacion diaria, actualizacion segura, incidentes y recuperacion.
- [x] 100% - Enlazar preflight/runbook desde README, deployment, troubleshooting y environment variables.
- [x] 100% - Agregar plantilla PM2 `ecosystem.config.cjs` lista para copiar.
- [x] 100% - Crear `npm run ops:backup` para respaldar DB, `BotSession/`, `jadibot/` y audios custom con manifest y `.env` opt-in.
- [x] 100% - Documentar procedimiento de backups con comandos concretos para `pg_dump`, restauracion y permisos de sesiones.
- [x] 100% - Revisar dependencias operativas opcionales (`ffmpeg`, ImageMagick, Python, cliente PostgreSQL) y separarlas por funcionalidad afectada.

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

### Roadmap v3 - cerrado

Estado: cerrado. La parte de backend fue cancelada; la persistencia oficial es PostgreSQL directo con Drizzle.

- [x] 100% - Retirar los comandos owner con acceso de red arbitrario.
- [x] 100% - Eliminar uso directo de `Math.random()` en plugins y pasar por `src/utils/random.ts`.
- [x] 100% - Ampliar pruebas unitarias para router, guards y context builder.
- [x] 100% - Agregar pruebas de servicios con repositorios mockeados.
- [x] Cancelado - Definir persistencia remota alternativa.
- [x] 100% - Auditar comandos owner que ejecutan codigo, procesos o red.
- [x] 100% - Revisar nuevos candidatos a refactor: `_virustotal.ts`, `config-on-y-off.ts`, `rpg-reg.ts` y `rpg-rw.ts` ya fueron migrados fuera de legacy.

### Roadmap v4 - 99%

Estado: activo. Es el roadmap operativo actual y debe seguir alineado con `docs/architecture-roadmap.md`.

- [x] 100% - Cerrar P0: `content.service`, `defineSdkPlugin`, SDK interno y compuerta `test:p0`.
- [x] 100% - Migrar convertidores al SDK: `toimg`, `tomp3`, `tts`, `tourl`.
- [x] 100% - Agregar pruebas de arquitectura para evitar regresiones en plugins migrados.
- [x] 100% - Crear provider de descargas inicial para YouTube.
- [x] 100% - Conectar `descargas-play.ts` y `descargas-play2.ts` al provider de YouTube.
- [x] 100% - Agregar `test:providers` para la compuerta inicial de providers.
- [x] 100% - Extraer fallbacks de Spotify, TikTok, Threads, Instagram, Facebook, MediaFire y Drive.
- [x] 100% - Extraer providers secundarios de AppleMusic, ModAPK y Pinterest.
- [x] 100% - Extraer stalkers de Instagram y TikTok a providers de metadata.
- [x] 100% - Extraer providers de IA de texto e imagen: ChatGPT/OpenAI, Gemini, DeepSeek, BlackBox, Copilot y generadores/busquedas de imagen.
- [x] 100% - Extraer providers de conversion base: `toimg`, `tomp3`, `tts` y `tourl`.
- [x] 100% - Extender providers de conversion hacia stickers avanzados: Telegram packs, Stickerly, quote cards, emoji mix, texto animado y reacciones GIF.
- [x] 100% - Normalizar errores, timeouts y retries base de providers con `ProviderCandidate` y fallas sanitizadas.
- [x] 100% - Definir contrato compartido inicial de `ProviderResult` y `ProviderFailureReason`.
- [x] 100% - Migrar familias `messages`, `random`, `nsfw` y `audio` al SDK.
- [x] 100% - Migrar familia `downloads` al SDK.
- [x] 100% - Migrar familia `stickers` al SDK.
- [x] 100% - Migrar familia `group` al SDK por sublotes.
- [x] 100% - Migrar familia `rpg` al SDK por sublotes: economia, perfil/registro, parejas, transferencias y RW/gacha.
- [x] 100% - Migrar familia `owner` al SDK, conservando auditoria, timeouts y limites de comandos sensibles.
- [x] 100% - Migrar menus, subbots, games/fun, config y hooks fuera de `definePlugin`, `message-template` y HTTP directo en plugins.
- [x] 100% - Crear helpers compartidos para cooldowns y pending actions.
- [x] 100% - Cerrar P5 runtime: migrar mapas/timers de cooldowns, retos, juegos, mensajes temporales y acciones pendientes al helper compartido.
- [x] 100% - Documentar excepciones aceptadas de `new Map` y `setTimeout` para infraestructura, caches, timeouts HTTP, reconexion y borrados diferidos.
- [ ] 25% - Diseñar base i18n con fallback sobre `content.service`.
- [x] 100% - Crear catalogo documental inicial de comandos en `resources/data/commands.json`.
- [x] 100% - Implementar ayuda consultable con `/<comando> --help` y `/help <comando>`.
- [x] 100% - Agregar auditoria `catalogaudit` para comparar plugins cargados contra el catalogo.
- [x] 100% - Completar metadata del catalogo por familias; primera pasada estatica hecha en `downloads`, `group`, `rpg`, `stickers`, `owner`, `tools`, `games`, `info`, `search`, `subbots`, `audio`, `converters`, `fun`, `random`, `nsfw`, `messages` y `menus`.
- [x] 100% - Resolver colisiones legacy de comandos compartidos en la superficie documental, especialmente `top`, reacciones GIF/sticker y acciones random/anime.
- [x] Cancelado - Definir persistencia remota alternativa.

## Mejoras De Base De Datos - 100%

Estado: cerrado como mantenimiento actual.

- [x] 100% - Alinear `src/db/schema.ts` con el bootstrap normalizado PostgreSQL 18.
- [x] 100% - Retirar migraciones históricas para la estrategia explícita de base nueva.
- [x] 100% - Mantener `database/schema.sql` como bootstrap manual limpio desde cero.
- [x] 100% - Documentar en README `db:setup`, `db:check` y el modelo por schemas.

## Notas tecnicas

### Bloque de robustecimiento de plugins - 2026-07-21

- [x] Separar validacion y consumo de recursos.
- [x] Agregar reservas atomicas, confirmacion, liberacion e idempotencia.
- [x] Recuperar reservas pendientes vencidas mediante tarea programada.
- [x] Validar colisiones exactas/regex antes de publicar el registro.
- [x] Incorporar manifiesto compatible, feature tipada e interceptores.
- [x] Agregar timeouts por perfil, `AbortSignal` y locks compartidos.
- [x] Acotar/coalescer la cola background y limitar hot reload a desarrollo.
- [ ] Migrar gradualmente imports legacy de locks y hooks al contrato nuevo.
- [ ] Extraer casos de uso de los plugins grandes de configuracion, RPG, grupos y VirusTotal.

- Los plugins ya no usan `fetch`, `node-fetch`, `axios` ni `src/lib/http-client.ts` directamente; usan `sdk.http`, providers o servicios.
- Los plugins nuevos deben usar `defineSdkPlugin` desde `src/core/sdk-plugin.ts` para acceder a `sdk.reply`, `sdk.content`, `sdk.http`, `sdk.providers` y locks por usuario sin importar helpers sueltos.
- Los plugins ya migrados al SDK no deben importar `src/lib/message-template.ts` ni `src/lib/http-client.ts`; `npm run test:p0` lo valida.
- Los providers por dominio deben tener pruebas unitarias sin depender de red cuando sea posible; `npm run test:providers` valida el bloque inicial.
- Se mantienen excepciones internas en `src/lib/scraper.ts`, `src/lib/webp2mp4.ts` y `src/lib/ezgif-convert.ts` porque dependen de cookies, redirects, multipart o response internals.
- Los plugins con procesos largos por usuario deben usar `src/lib/user-request-locks.ts` en vez de declarar mapas `userRequests` propios.
- La seleccion aleatoria debe pasar por `src/utils/random.ts`; `Array.prototype.getRandom` queda solo como compatibilidad legacy.
- Las tablas/listas grandes de plugins deben moverse gradualmente a archivos `.data.ts` dentro de su familia.
