# Contexto para Codex

Este archivo resume el estado del proyecto para que Codex lo lea al iniciar un chat nuevo desde la raiz del repo. Fecha de referencia: 2026-08-17.

## Proyecto

`zycryx-whatsapp-chat-bot-template` es una plantilla modular de bot de WhatsApp hecha con TypeScript, Baileys, Drizzle ORM y PostgreSQL. La idea principal es reutilizar core, arquitectura, persistencia, guards, subbots, observabilidad, plugins y recursos entre bots distintos, cambiando marca, owners, textos, recursos multimedia y claves externas.

El proyecto esta organizado por capas:

- `src/core`: arranque, handler, router, parser, eventos de grupo, contexto, logging y tareas programadas.
- `src/plugins`: comandos y hooks organizados por familias.
- `src/services`: logica de negocio y casos de uso.
- `src/ports`: contratos de repositorios.
- `src/adapters/drizzle`: repositorios concretos con Drizzle/PostgreSQL.
- `src/db`: definición Drizzle, cliente y verificación read-only del modelo PostgreSQL 18.
- `src/lib`: utilidades compartidas e integraciones.
- `src/utils`: helpers puros y reutilizables.
- `resources/data`: datos estaticos versionados, no estado mutable de runtime.
- `resources/media`: imagenes, audios y GIFs de reaccion en MP4 usados por plugins.
- `resources/text`: textos planos versionados usados por mensajes y prompts.
- `docs`: documentacion tecnica y roadmap interno.

## Estado actual

- Persistencia Drizzle sobre PostgreSQL 18, preparada para Supabase.
- Base estrictamente normalizada en `bot_identity`, `bot_economy`, `bot_groups`, `bot_runtime`, `bot_content`, `bot_ai` y `bot_audit`.
- `database/schema.sql` es el único bootstrap de una base nueva; no hay migraciones históricas activas ni soporte de upgrade legacy en esta rama.
- Usuarios separados de identidades, perfil, registro, sanciones, progreso, cooldowns y relaciones.
- Economía basada en catálogo de recursos, cuentas, balances por filas, operaciones y ledger; no existen tablas wallet/bank con una columna por moneda.
- Settings de grupo separados por módulo; owners, prefixes, assets de audio e historial de IA están modelados como filas relacionadas.
- PostgreSQL 18 se usa para UUIDv7 y unicidad temporal `WITHOUT OVERLAPS`.
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

La etapa más reciente normalizó la persistencia completa. Trabajo realizado:

- Dividí la base por siete schemas de dominio y eliminé el uso de `public` como contenedor del bot.
- Reemplacé la tabla ancha de usuarios por agregados 1:1 y 1:N con claves foráneas y checks.
- Reemplacé wallet, banco y reservas duplicadas por `resources`, `financial_accounts`, `account_balances`, `financial_operations` y `ledger_entries`.
- Normalicé configuraciones de grupos, membresías de bots, personajes, audios y memoria IA.
- Adapté repositorios y servicios manteniendo los contratos de dominio consumidos por plugins.
- Creé el bootstrap transaccional PostgreSQL 18/Supabase con RLS, permisos, seeds y triggers.
- Retiré scripts de migración y baseline legacy porque el objetivo de esta rama es una base nueva.
- Agregué `tests/database-normalization.test.ts` y actualicé las pruebas de economía.
- Actualicé Baileys a la última versión publicada (`7.0.0-rc14`) y Jimp a `1.6.1`.

Trabajo arquitectónico anterior relevante:

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
- Toda tabla nueva debe pertenecer al schema temático correcto; no crear tablas del bot en `public`.
- No volver a introducir tablas anchas con columnas repetidas por recurso, feature, owner o prefijo. Usar catálogos y tablas hijas.
- No persistir relaciones o historiales como arrays o JSON; usar filas con claves foráneas, posición y restricciones de unicidad.
- Mantener `src/db/schema.ts` y `database/schema.sql` alineados. El SQL debe seguir siendo un bootstrap completo para una base vacía PostgreSQL 18+.
- No agregar migraciones incrementales ni modificar estructura durante el arranque. `db:setup` provisiona y `db:check` sólo valida.
- Para nuevas relaciones definir `ON DELETE`, checks de estados/rangos e índices para claves foráneas y consultas calientes.
- Mantener RLS y revocación de `anon`/`authenticated` en tablas nuevas del script Supabase.
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
npm test
```

Tambien conviene revisar:

```bash
rg "\bany\b|@ts-ignore" src
rg "from 'axios'|from \"axios\"|from 'node-fetch'|from \"node-fetch\"|fetch\(" src/plugins src/lib
rg "jsonb\(|\.array\(\)|serial\(" src/db/schema.ts
```

La segunda busqueda puede encontrar excepciones internas documentadas; no asumir que todo resultado es bug.

## Pendiente o trabajo futuro

- Definir contrato real del adapter backend REST/GraphQL si se decide activar `DATA_SOURCE=backend`.
- Ampliar pruebas unitarias mas alla de helpers, especialmente router, guards, context builder y servicios con repositorios mockeados.
- Revisar manualmente flujos reales de WhatsApp/Baileys: login, mensajes, grupos, subbots, multimedia y eventos.
- Continuar reduciendo plugins grandes si aparecen nuevos puntos de complejidad.
- Revisar dependencias externas inestables de descargas/APIs y agregar fallbacks donde haga falta.
- Auditar comandos owner y comandos que ejecutan codigo o red para endurecer permisos/errores.
- Validar el bootstrap en cada proyecto Supabase PostgreSQL 18 nuevo antes de conectar el bot.
- Mejorar documentacion operativa de deploy, backups, sesiones y recuperacion.

## Documentacion util

- `README.md`: documentacion principal, instalacion, arquitectura y estado publico.
- `docs/architecture-analysis.md`: fotografia arquitectonica, riesgos y hallazgos de runtime.
- `docs/architecture-roadmap.md`: roadmap por prioridades P0-P7.
- `docs/improvement-roadmap.md`: roadmap tecnico interno y estado de refactors.
- `docs/baileys-connection.md`: flujo de conexion, vinculacion, sesiones y reconexion.
- `docs/environment-variables.md`: referencia completa de variables de entorno.
- `docs/adding-commands.md`: guia para agregar comandos nuevos.
- `docs/deployment.md`: despliegue en servidor, PM2 y backups.
- `docs/troubleshooting.md`: problemas comunes y soluciones.
- `docs/data-resources.md`: politica de recursos estaticos vs estado mutable.
- `docs/http-client-exceptions.md`: excepciones conocidas al HTTP client centralizado.
- `docs/owner-security.md`: seguridad operativa de comandos owner sensibles.
- `.env.example`: variables de configuracion esperadas.
