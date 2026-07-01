# ADR-0005 - Estado efimero single-process

Fecha: 2026-06-30
Estado: aceptado

## Contexto

El bot mantiene cooldowns, retos, partidas, captions temporales, acciones pendientes y deduplicacion en memoria. Esto es aceptable para el modo actual de ejecucion single-process, pero antes estaba repartido en mapas y timers manuales dentro de plugins.

## Decision

El estado efimero de usuario, chat o juego debe pasar por helpers compartidos:

- `src/lib/ephemeral-state.ts` para cooldowns, mapas con expiracion y acciones pendientes.
- `src/lib/user-request-locks.ts` para procesos largos por usuario.

`new Map` queda permitido solo para caches internas, infraestructura o indices locales puros dentro de una ejecucion. `setTimeout` queda permitido para timeouts HTTP/scraper, reconexion, borrados diferidos, tareas programadas, colas en segundo plano y expiraciones encapsuladas.

Los flujos ya migrados quedan protegidos por `tests/p0-architecture.test.ts`, que bloquea `new Map`, `setTimeout` y `clearTimeout` manuales en esos archivos.

## Consecuencias

- El bot mantiene compatibilidad con el runtime actual sin introducir Redis o DB para estado temporal.
- Los plugins nuevos tienen una ruta unica para expiraciones y cooldowns.
- Juegos y retos siguen siendo single-process; si el bot corre en varias replicas, este ADR debe revisarse y reemplazarse por un contrato con cache externa o backend.

## Validacion

```bash
npm run typecheck
npm run build
npm test
rg "new Map<|new Map\\(" src/plugins src/core src/lib
rg "setTimeout\\(|clearTimeout\\(" src/plugins src/core src/lib
```
