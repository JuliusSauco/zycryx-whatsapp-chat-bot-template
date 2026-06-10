# Analisis arquitectonico

Fecha de revision: 2026-06-09.

Este documento resume el estado arquitectonico actual despues de cerrar P0, iniciar P1 con providers por dominio y alinear los scripts de base de datos.

## Estado actual

- El core esta separado por responsabilidades: arranque, handler, parser, router, context builder, guards, eventos de grupo, observabilidad y tareas programadas.
- La persistencia estable es `DATA_SOURCE=local` con Drizzle ORM y PostgreSQL.
- `DATA_SOURCE=backend` sigue como scaffold. No debe condicionar el trabajo de providers hasta tener contrato real.
- Existe un SDK interno para plugins en `src/core/plugin-sdk.ts` y `src/core/sdk-plugin.ts`.
- Existe `src/services/content.service.ts` como API oficial de mensajes, listas y templates.
- `src/lib/message-template.ts` queda como fachada legacy mientras se migra el resto de plugins.
- Los plugins migrados al SDK quedan protegidos por `tests/p0-architecture.test.ts` para no volver a importar `message-template` ni `http-client` directo.
- P1 ya empezo con providers de descargas para YouTube, Spotify, TikTok, Threads, Instagram, Facebook, MediaFire y Drive.
- `src/plugins/downloads/youtube-download.helpers.ts` queda como re-export temporal para compatibilidad.
- La suite de pruebas cubre helpers, router, guards, context builder, servicios, comandos sensibles, providers y compuerta P0.
- Los scripts de DB estan alineados: `src/db/schema.ts`, journal de migraciones y `database/schema.sql` limpio desde cero.

## Avance por area

| Area | Avance | Lectura |
|---|---:|---|
| Core/handler/router/guards | 90% | Arquitectura estable y testeada; quedan mejoras futuras de runtime global. |
| Persistencia Drizzle/PostgreSQL | 95% | Local estable, migraciones y bootstrap manual alineados. |
| SDK y contenido | 65% | Contrato nuevo cerrado; migracion legacy por familias pendiente. |
| Providers externos | 85% | Descargas principales centralizadas; faltan providers secundarios/metadata, IA y conversion multimedia. |
| Testing | 75% | Core cubierto; faltan mas pruebas de providers, i18n y plugins complejos. |
| Seguridad owner | 90% | Comandos sensibles auditados; queda vigilancia continua al agregar comandos. |
| Runtime/escalabilidad | 20% | Hay locks/cache puntuales; falta fachada de globales y cooldowns/pending actions. |
| i18n/contenido editable | 25% | Mensajes centralizados; faltan locales, fallback y catalogo de comandos. |

## Hallazgos cuantitativos

Valores de referencia obtenidos con `rg` sobre `src/plugins`:

| Indicador | Valor | Lectura |
|---|---:|---|
| Plugins con `defineSdkPlugin` | 29 | Base migrada al contrato nuevo. |
| Plugins con `definePlugin` | 126 | Deuda legacy a migrar gradualmente. |
| Archivos que importan `message-template.js` | 121 | Textos ya centralizados en JSON, pero muchos plugins aun usan fachada legacy. |
| Archivos que importan `http-client.js` | 37 | Candidatos naturales para providers o SDK HTTP. |

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

Los plugins de `downloads`, `stickers`, `random`, `nsfw`, `rpg` y algunos hooks todavia conocen URLs, formatos de respuesta y fallbacks de APIs externas.

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
- El siguiente paso recomendado es decidir si los stalkers (`igstalk`, `tiktokstalk`) y providers secundarios (`Pinterest`, `AppMusic`, `ModAPK`) quedan dentro de P1 o pasan a un P1.1.
- Evitar por ahora providers dependientes de backend; P1 debe funcionar con librerias locales y HTTP centralizado.

Pendientes de diseno:

- Extender el contrato inicial `ProviderResult`/`ProviderFailureReason` con errores tipados mas expresivos.
- Definir timeout/retry por proveedor.
- Separar busqueda, metadata y descarga en contratos claros.
- Agregar pruebas sin red para fallback y parseo de respuestas.

### Migracion SDK incompleta

Hay muchos plugins aun en `definePlugin`, `m.reply`, `conn.reply`, `conn.sendMessage` y helpers legacy.

Riesgo:

- Mas acoplamiento al runtime de Baileys.
- Mas dificultad para testear comandos.
- Mas trabajo cuando llegue i18n.

Recomendacion:

- Migrar por familias, no archivo suelto.
- Siguiente bloque recomendado: `messages`, `random`, `nsfw` y `audio`.
- Luego bloques grandes: `downloads`, `stickers`, `group`, `games`, `rpg`, `owner`.

### Estado en memoria por plugin

Existen mapas locales para cooldowns, juegos, retos, temporales y solicitudes. Algunos son estado natural de runtime; otros podrian beneficiarse de helpers compartidos.

Riesgo:

- Limpieza inconsistente.
- Dificultad para escalar a varias replicas.
- Posibles leaks si un timeout no libera estado.

Recomendacion:

- Mantener estado efimero en memoria mientras el bot sea single-process.
- Centralizar patrones repetidos: cooldowns, pending actions, locks, expiraciones.
- Documentar que juegos/retos no son multi-replica hasta tener backend o cache externa.

### Globales del runtime

`globalThis.conn`, `globalThis.conns`, `globalThis.plugins` e `info` siguen siendo parte del runtime.

Riesgo:

- Acoplamiento fuerte a un solo proceso.
- Tests mas dificiles en modulos que dependen de globales.

Recomendacion:

- No eliminarlos de golpe.
- Crear fachadas pequenas para acceso a conexiones, plugins activos y config publica.
- Migrar consumidores nuevos a esas fachadas.

### Recursos multimedia locales

El volumen actual es manejable y no justifica mover multimedia a cloud storage.

Riesgo futuro:

- Repo pesado si crecen MP3/MP4.
- Deploys mas lentos.

Recomendacion:

- Mantener local por ahora.
- Si crece, evaluar Supabase Storage o S3-compatible con cache local y manifest JSON.

### Catalogos JSON editables

Ya existen manifiestos para mensajes, prompts, audios y reacciones. Falta llevar comandos a un patron similar sin convertir JSON en fuente de routing.

Riesgo:

- Menus, ayuda y metadata visible pueden divergir de los plugins reales.
- La ayuda `--help` no tiene una fuente documental unica.

Recomendacion:

- Registrar `resources/data/commands.json` como catalogo documental.
- Crear `command-catalog.service.ts`.
- Soportar `/help <comando>` y `/<comando> --help`.
- Validar consistencia entre catalogo y plugins cargados.

### Backend adapter pendiente

`DATA_SOURCE=backend` esta bien como scaffold, pero no debe avanzar sin contrato.

Riesgo:

- Duplicar logica sin API real.
- Diseñar providers dependientes de un backend que aun no existe.

Recomendacion:

- Dejar P3 desestimado hasta tener backend versionado.
- Providers P1 deben ser locales/libreria, no backend-first.

## Prioridad recomendada

1. Mantener `test:p0` en `npm test`.
2. Continuar P1 con providers secundarios: metadata/stalkers, Pinterest, AppMusic, ModAPK y GitClone.
3. Normalizar errores/timeouts de providers y ampliar pruebas `test:providers`.
4. Migrar `downloads` al SDK gradualmente mientras se extraen providers.
5. Migrar el bloque `messages/random/nsfw/audio` al SDK.
6. Migrar providers de stickers y media conversion cuando descargas este estable.
7. Registrar catalogo de comandos editable despues de estabilizar providers iniciales.

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
