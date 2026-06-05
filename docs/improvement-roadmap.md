# Roadmap de mejoras internas

Esta lista se mantiene fuera del README para separar la documentacion publica del backlog tecnico del proyecto.

## Prioridad actual

1. Medir tiempos por hook/plugin individual.
2. Cachear recursos estaticos.
3. Terminar unificacion del HTTP client.
4. Reducir mensajes intermedios en plugins pesados.
5. Optimizar mas el pipeline de mensajes pasivos.
6. Hacer mas inteligente el contexto de hooks.
7. Revisar `jadi-bots` y subbots.
8. Mover operaciones no criticas a cola.
9. Seguir extrayendo logica compartida.

## Estado

- [x] Medir tiempos por hook/plugin individual.
- [x] Cachear recursos estaticos.
- [x] Terminar unificacion del HTTP client.
- [ ] Reducir mensajes intermedios en plugins pesados.
- [ ] Optimizar mas el pipeline de mensajes pasivos.
- [ ] Hacer mas inteligente el contexto de hooks.
- [ ] Revisar `jadi-bots` y subbots.
- [ ] Mover operaciones no criticas a cola.
- [ ] Seguir extrayendo logica compartida.

## Notas tecnicas

- Los plugins ya no usan `fetch`, `node-fetch` ni `axios` directamente; deben usar `src/lib/http-client.ts`.
- Se mantienen excepciones internas en `src/lib/scraper.ts` y `src/lib/ezgif-convert.ts` porque dependen de `axios-cookiejar-support`, redirects y multipart/response internals.
