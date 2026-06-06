# Roadmap de mejoras internas

Esta lista se mantiene fuera del README para separar la documentacion publica del backlog tecnico del proyecto.

## Prioridad actual

1. Ampliar pruebas unitarias de router, guards, context builder y servicios con repositorios mockeados.
2. Definir contrato real para `DATA_SOURCE=backend` si se decide activarlo.
3. Auditar comandos owner sensibles y endurecer timeouts, permisos, errores y limites de salida.
4. Continuar reduciendo plugins medianos/grandes cuando aparezcan puntos de complejidad.

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
- [ ] Ampliar pruebas unitarias para router, guards y context builder.
- [ ] Agregar pruebas de servicios con repositorios mockeados.
- [ ] Definir contrato REST/GraphQL real para `DATA_SOURCE=backend`.
- [ ] Auditar comandos owner que ejecutan codigo, procesos o red.
- [ ] Revisar nuevos candidatos a refactor: `descargas-play2.ts`, `_virustotal.ts`, `config-on-y-off.ts`, `rpg-reg.ts`, `rpg-rw.ts`.

## Notas tecnicas

- Los plugins ya no usan `fetch`, `node-fetch` ni `axios` directamente; deben usar `src/lib/http-client.ts`.
- Se mantienen excepciones internas en `src/lib/scraper.ts` y `src/lib/ezgif-convert.ts` porque dependen de `axios-cookiejar-support`, redirects y multipart/response internals.
- Los plugins con procesos largos por usuario deben usar `src/lib/user-request-locks.ts` en vez de declarar mapas `userRequests` propios.
- La seleccion aleatoria debe pasar por `src/utils/random.ts`; `Array.prototype.getRandom` queda solo como compatibilidad legacy.
- Las tablas/listas grandes de plugins deben moverse gradualmente a archivos `.data.ts` dentro de su familia.
