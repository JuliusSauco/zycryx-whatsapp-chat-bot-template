# Contexto para Codex

Este archivo resume el estado del proyecto para que Codex lo lea al iniciar un chat nuevo desde la raiz del repo. Fecha de referencia: 2026-06-06.

## Proyecto

`zycryx-whatsapp-chat-bot-template` es una plantilla modular de bot de WhatsApp hecha con TypeScript, Baileys, Drizzle ORM y PostgreSQL. La idea principal es reutilizar core, arquitectura, persistencia, guards, subbots, observabilidad, plugins y recursos entre bots distintos, cambiando marca, owners, textos, recursos multimedia y claves externas.

El proyecto esta organizado por capas:

- `src/core`: arranque, handler, router, parser, eventos de grupo, contexto, logging y tareas programadas.
- `src/plugins`: comandos y hooks organizados por familias.
- `src/services`: logica de negocio y casos de uso.
- `src/ports`: contratos de repositorios.
- `src/adapters/drizzle`: repositorios concretos con Drizzle/PostgreSQL.
- `src/db`: schema Drizzle, cliente y migraciones.
- `src/lib`: utilidades compartidas e integraciones.
- `src/utils`: helpers puros y reutilizables.
- `resources/data`: datos estaticos versionados, no estado mutable de runtime.
- `resources/media`: imagenes, audios y GIFs de reaccion en MP4 usados por plugins.
- `resources/text`: textos planos versionados usados por mensajes y prompts.
- `docs`: documentacion tecnica y roadmap interno.

## Estado actual

- Persistencia migrada a Drizzle ORM sobre PostgreSQL.
- Repositorios Drizzle separados por agregado.
- Core y plugins consumen servicios/puertos; evitar SQL directo en plugins.
- `DATA_SOURCE=local` es el adapter estable. `DATA_SOURCE=backend` existe como scaffold REST/GraphQL futuro, pero no es el camino activo por defecto.
- Loader de plugins recursivo con hot reload y familias de plugins.
- Router con resolucion exacta, regex, aliases y prefixes configurables.
- Plugins nuevos deben usar `definePlugin`.
- Hooks legacy `before` siguen soportados, pero ahora reciben contexto enriquecido.
- Guards centralizados para owner/admin/grupo/privado/admin-mode/NSFW/ban/recursos.
- Handler reducido a orquestacion: deduplicacion, contexto, hooks, guards, ejecucion, performance y logging.
- Eventos de grupo separados por responsabilidad.
- Subbots con sesiones independientes.
- Tareas programadas para reportes, expiracion de grupos y limpieza de memoria.
- VirusTotal integrado como hook configurable.
- `src/**/*.ts` esta trabajado para no usar `any` ni `@ts-ignore`.

## Trabajo reciente realizado

La ultima etapa grande fue el commit `69db9b9 refactor: complete roadmap v2 bot optimizations`. Trabajo realizado:

- Complete el Roadmap v2 de mejoras internas.
- Centralice helpers aleatorios en `src/utils/random.ts`.
- Centralice aliases/regex de comandos en `src/utils/command-alias.ts`.
- Agregue compatibilidad legacy controlada para `Array.prototype.getRandom` en `src/lib/legacy-array-random.ts`.
- Agregue locks compartidos por usuario en `src/lib/user-request-locks.ts` para procesos largos.
- Agregue fallback de proveedores y tests de helpers compartidos.
- Cree `src/lib/background-task-queue.ts` y movi upserts no criticos a tareas en segundo plano.
- Optimice hooks `before` y comandos frecuentes para reutilizar `metadata`, `participants`, `botConfig` y `groupSettings` desde el contexto.
- Refactorice plugins pesados, especialmente `descargas-play.ts`, `descargas-play2.ts`, `fun-juegos.ts`, `fun-randow.ts` y `herramientas-superinspect.ts`.
- Extraje datos estaticos a archivos `.data.ts` en familias `fun`, `random`, `nsfw` y `rpg`.
- Agregue helpers compartidos para descargas de YouTube y juegos.
- Refactorice textos largos de `owner-join.ts` a `owner-join.messages.ts`.
- Revise recursos mutables/data y documente la politica en `docs/data-resources.md`.
- Revise excepciones del HTTP client y documente por que `scraper.ts` y `ezgif-convert.ts` mantienen casos especiales.
- Actualice `docs/improvement-roadmap.md`.
- Agregue `tests/helpers.test.ts` y script `npm run test:helpers`.

## Reglas de mantenimiento

- No agregar SQL directo en plugins. Usar servicios y repositorios.
- No escribir estado mutable en `resources/data`; usar DB o backend cuando exista contrato.
- Usar `resources/data/messages.json`, `resources/data/prompts.json` y `resources/data/reactions.json` como manifiestos para mapear prompts, mensajes y reacciones a archivos en `resources/text` o `resources/media`.
- Mantener medios locales versionados en `resources/media`; los GIFs de reaccion se guardan como MP4 en `resources/media/reaction-gifs`.
- No usar `fetch`, `node-fetch` ni `axios` directamente en plugins. Usar `src/lib/http-client.ts`.
- Excepciones conocidas: `src/lib/scraper.ts` y `src/lib/ezgif-convert.ts` pueden usar internals especiales por cookies, redirects, multipart y response handling.
- Para seleccion aleatoria usar `src/utils/random.ts`; `Array.prototype.getRandom` queda solo para compatibilidad legacy.
- Para procesos largos por usuario usar `src/lib/user-request-locks.ts`.
- Para plugins nuevos, preferir `definePlugin` y ubicar el archivo en la familia correcta.
- Para plugins que necesiten datos grandes, mover tablas/listas a archivos `.data.ts` cercanos al plugin.
- Para settings, metadata o participants de grupo, reutilizar el contexto cuando exista antes de consultar de nuevo.
- Mantener `.env.example` sincronizado cuando se agreguen APIs externas o variables nuevas.

## Validacion recomendada

Antes de cerrar cambios importantes:

```bash
npm run typecheck
npm run build
npm run test:helpers
```

Tambien conviene revisar:

```bash
rg "\bany\b|@ts-ignore" src
rg "from 'axios'|from \"axios\"|from 'node-fetch'|from \"node-fetch\"|fetch\(" src/plugins src/lib
```

La segunda busqueda puede encontrar excepciones internas documentadas; no asumir que todo resultado es bug.

## Pendiente o trabajo futuro

- Definir contrato real del adapter backend REST/GraphQL si se decide activar `DATA_SOURCE=backend`.
- Ampliar pruebas unitarias mas alla de helpers, especialmente router, guards, context builder y servicios con repositorios mockeados.
- Revisar manualmente flujos reales de WhatsApp/Baileys: login, mensajes, grupos, subbots, multimedia y eventos.
- Continuar reduciendo plugins grandes si aparecen nuevos puntos de complejidad.
- Revisar dependencias externas inestables de descargas/APIs y agregar fallbacks donde haga falta.
- Auditar comandos owner y comandos que ejecutan codigo o red para endurecer permisos/errores.
- Revisar compatibilidad y runtime real de PostgreSQL, migraciones y `DB_SCHEMA` en ambientes nuevos.
- Mejorar documentacion operativa de deploy, backups, sesiones y recuperacion.

## Documentacion util

- `README.md`: documentacion principal, instalacion, arquitectura y estado publico.
- `docs/improvement-roadmap.md`: roadmap tecnico interno y estado de refactors.
- `docs/data-resources.md`: politica de recursos estaticos vs estado mutable.
- `docs/http-client-exceptions.md`: excepciones conocidas al HTTP client centralizado.
- `.env.example`: variables de configuracion esperadas.
