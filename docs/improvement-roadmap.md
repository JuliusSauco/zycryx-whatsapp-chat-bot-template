# Roadmap de mejoras internas

Esta lista se mantiene fuera del README para separar la documentacion publica del backlog tecnico del proyecto.

## Prioridad actual

1. Refactorizar textos largos en plugins.
2. Extraer datos estaticos RPG a modulos `.data.ts`.
3. Refactorizar plugins pesados por responsabilidades.
4. Revisar recursos mutables/data.
5. Revisar excepciones internas del HTTP client.
6. Consolidar compatibilidad legacy de `Array.prototype.getRandom`.
7. Evaluar pruebas unitarias para helpers compartidos.

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

## Notas tecnicas

- Los plugins ya no usan `fetch`, `node-fetch` ni `axios` directamente; deben usar `src/lib/http-client.ts`.
- Se mantienen excepciones internas en `src/lib/scraper.ts` y `src/lib/ezgif-convert.ts` porque dependen de `axios-cookiejar-support`, redirects y multipart/response internals.
- Los plugins con procesos largos por usuario deben usar `src/lib/user-request-locks.ts` en vez de declarar mapas `userRequests` propios.
- La seleccion aleatoria debe pasar por `src/utils/random.ts`; `Array.prototype.getRandom` queda solo como compatibilidad legacy.
- Las tablas/listas grandes de plugins deben moverse gradualmente a archivos `.data.ts` dentro de su familia.
