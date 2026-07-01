# ADR-0004 - Catalogo central de comandos

Fecha: 2026-06-30
Estado: aceptado

## Contexto

Los menus ya mostraban comandos con icono, uso y descripcion, pero esa informacion vivia en TypeScript dentro del render de menus. Eso hacia mas dificil editar textos, preparar ayuda consultable y mantener un criterio uniforme para descripciones cortas en WhatsApp.

## Decision

Crear `resources/data/commands.json` como catalogo documental versionado de comandos. El router y la activacion real siguen dependiendo de la metadata de cada plugin (`command`, `help`, `tags`), mientras que el catalogo central se usa para UX: iconos, uso canonico, descripciones, aliases documentales y ejemplos.

El adaptador `src/plugins/menus/menu-command-metadata.ts` mantiene su API publica, pero ahora lee desde `src/services/command-catalog.service.ts`.

La ayuda consultable se renderiza desde `src/services/command-help.service.ts` para soportar `help <comando>`, `ayuda <comando>` y `<comando> --help` sin ejecutar el comando real. Las respuestas deben ser cortas, no repetir aliases como comandos separados y usar negrita compatible con WhatsApp: `*texto*`.

La consistencia se audita con `src/services/command-catalog-audit.service.ts`. El comando owner `catalogaudit` compara los plugins cargados contra el catalogo y muestra un resumen corto de pendientes.

La metadata visible se completa por familias para evitar cambios masivos. La primera pasada estatica cubre `downloads`, `group`, `rpg`, `stickers`, `owner`, `tools`, `games`, `info`, `search`, `subbots`, `audio`, `converters`, `fun`, `random`, `nsfw`, `messages` y `menus`; si la auditoria detecta permisos o ambitos que no coinciden, el ajuste debe hacerse despues en la metadata real del plugin o en sus guards.

Algunos comandos legacy comparten el mismo trigger entre familias, por ejemplo `top`, acciones GIF/sticker y acciones random/anime. Para P7 se resuelve la superficie documental sin cambiar el router: el catalogo representa el plugin que realmente gana por prioridad de carga y los `help` legacy de plugins desplazados se ajustan a comandos alcanzables.

## Consecuencias

- Los menus dejan de depender de una tabla embebida en codigo.
- El catalogo puede crecer por familias sin tocar el router.
- La ayuda `help <comando>`, `ayuda <comando>` y `<comando> --help` tiene una fuente comun.
- Los aliases del catalogo son documentales; no deben asumirse como aliases ejecutables si el plugin no los soporta.
- La auditoria permite completar el catalogo por familias sin cargar todo ese trabajo en una sola migracion.
- Las colisiones legacy quedan cerradas para menus y ayuda, pero el router sigue siendo la fuente de ejecucion hasta que exista una fuente unica de verdad para comandos compartidos.

## Validacion

```bash
npm run test:catalog
npm run test:catalog-audit
npm run test:help
npm run typecheck
npm run build
```
