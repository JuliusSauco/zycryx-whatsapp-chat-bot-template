# Roadmap de mejoras internas

Esta lista se mantiene fuera del README para separar la documentacion publica del backlog tecnico del proyecto.

## Prioridad actual

1. Continuar P1 del roadmap arquitectonico: providers por dominio despues de YouTube, priorizando Spotify y descargas sociales/media.
2. Migrar `downloads` al SDK gradualmente mientras se extraen providers.
3. Migrar familias legacy al SDK por bloques: `messages`, `random`, `nsfw`, `audio`.
4. Mantener P3 desestimado hasta que exista backend real y contrato versionado.
5. Reducir estado runtime disperso: cooldowns, pending actions, mapas temporales y globales.
6. Preparar i18n sobre `content.service` y `resources/data/messages.json`.
7. Registrar catalogo de comandos editable en JSON y ayuda `--help`, sin mezclarlo con providers.

Ver tambien `docs/architecture-roadmap.md`.

## Estado

### Roadmap v1

- [x] Medir tiempos por hook/plugin individual.
- [x] Cachear recursos estaticos.
- [x] Terminar unificacion del HTTP client.
- [x] Reducir mensajes intermedios en plugins pesados.
- [x] Optimizar mas el pipeline de mensajes pasivos.
- [x] Hacer mas inteligente el contexto de hooks.
- [x] Revisar `jadi-bots` y subbots.
- [x] Mover operaciones no criticas a cola.
- [x] Seguir extrayendo logica compartida.

### Roadmap v2

- [x] Centralizar helpers aleatorios en `src/utils/random.ts`.
- [x] Centralizar alias/regex de comandos en `src/utils/command-alias.ts`.
- [x] Extraer datos estaticos de `fun-randow`.
- [x] Extraer datos estaticos de `random-anime`.
- [x] Extraer datos estaticos de `nsfw-contenido`.
- [x] Refactorizar textos largos en plugins, empezando por `owner-join.ts`.
- [x] Extraer datos estaticos RPG: `rpg-work`, `rpg-crime`, `rpg-slut`.
- [x] Refactorizar plugins pesados: `descargas-play.ts`, `descargas-play2.ts`, `herramientas-superinspect.ts`.
- [x] Revisar recursos mutables/data.
- [x] Revisar excepciones internas del HTTP client: `src/lib/scraper.ts`, `src/lib/ezgif-convert.ts`.
- [x] Consolidar compatibilidad legacy de `Array.prototype.getRandom`.
- [x] Evaluar pruebas unitarias para `random`, `command-alias`, locks y provider fallback.

### Roadmap v3

- [x] Endurecer permisos de comandos owner con red arbitraria: `owner-fetch.ts`.
- [x] Eliminar uso directo de `Math.random()` en plugins y pasar por `src/utils/random.ts`.
- [x] Ampliar pruebas unitarias para router, guards y context builder.
- [x] Agregar pruebas de servicios con repositorios mockeados.
- [ ] Definir contrato REST/GraphQL real para `DATA_SOURCE=backend`.
- [x] Auditar comandos owner que ejecutan codigo, procesos o red.
- [ ] Revisar nuevos candidatos a refactor: `descargas-play2.ts`, `_virustotal.ts`, `config-on-y-off.ts`, `rpg-reg.ts`, `rpg-rw.ts`.

### Roadmap v4

- [x] Cerrar P0: `content.service`, `defineSdkPlugin`, SDK interno y compuerta `test:p0`.
- [x] Migrar convertidores al SDK: `toimg`, `tomp3`, `tts`, `tourl`.
- [x] Agregar pruebas de arquitectura para evitar regresiones en plugins migrados.
- [x] Crear provider de descargas inicial para YouTube.
- [x] Conectar `descargas-play.ts` y `descargas-play2.ts` al provider de YouTube.
- [x] Agregar `test:providers` para la compuerta inicial de providers.
- [ ] Extraer fallbacks de Spotify, TikTok, Instagram, Facebook, MediaFire y Drive.
- [ ] Normalizar errores, timeouts y retries de providers.
- [ ] Definir contratos compartidos de `ProviderResult` y `ProviderError`.
- [ ] Migrar familias `messages`, `random`, `nsfw` y `audio` al SDK.
- [ ] Crear helpers compartidos para cooldowns y pending actions.
- [ ] Diseñar base i18n con fallback sobre `content.service`.
- [ ] Crear catalogo documental de comandos en `resources/data/commands.json`.
- [ ] Implementar ayuda consultable con `/<comando> --help` y `/help <comando>`.
- [ ] Definir contrato REST/GraphQL real para `DATA_SOURCE=backend` solo cuando exista backend.

## Notas tecnicas

- Los plugins ya no usan `fetch`, `node-fetch` ni `axios` directamente; los plugins legacy usan `src/lib/http-client.ts` y los plugins migrados usan `sdk.http`.
- Los plugins nuevos deben usar `defineSdkPlugin` desde `src/core/sdk-plugin.ts` para acceder a `sdk.reply`, `sdk.content`, `sdk.http`, `sdk.providers` y locks por usuario sin importar helpers sueltos.
- Los plugins ya migrados al SDK no deben importar `src/lib/message-template.ts` ni `src/lib/http-client.ts`; `npm run test:p0` lo valida.
- Los providers por dominio deben tener pruebas unitarias sin depender de red cuando sea posible; `npm run test:providers` valida el bloque inicial.
- Se mantienen excepciones internas en `src/lib/scraper.ts` y `src/lib/ezgif-convert.ts` porque dependen de `axios-cookiejar-support`, redirects y multipart/response internals.
- Los plugins con procesos largos por usuario deben usar `src/lib/user-request-locks.ts` en vez de declarar mapas `userRequests` propios.
- La seleccion aleatoria debe pasar por `src/utils/random.ts`; `Array.prototype.getRandom` queda solo como compatibilidad legacy.
- Las tablas/listas grandes de plugins deben moverse gradualmente a archivos `.data.ts` dentro de su familia.
