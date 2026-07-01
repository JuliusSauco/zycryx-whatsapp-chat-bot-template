# ADR-0002 - Fachada de runtime

Fecha: 2026-06-30
Estado: aceptado

## Contexto

El bot mantiene estado de proceso para la conexion principal, subbots activos y plugins cargados. Ese estado vivia en `globalThis.conn`, `globalThis.conns` y `globalThis.plugins`, y varios modulos lo leian o mutaban directamente. Esto hacia mas dificil probar runtime, hot reload, subbots y menus sin depender de globales compartidos.

## Decision

Se agrega `src/core/runtime-state.ts` como unica frontera para ese estado.

La fachada expone operaciones pequenas:

- conexion principal: `getMainConnection`, `setMainConnection`, `isMainConnection`;
- subbots: `getSubbotConnections`, `hasSubbotConnection`, `registerSubbotConnection`, `unregisterSubbotConnection`, `isSubbotConnection`, `isRuntimeSessionActive`;
- plugins: `getLoadedPlugins`, `setLoadedPlugin`, `removeLoadedPlugin`, `clearLoadedPlugins`.

Los globales siguen existiendo como almacenamiento legacy interno, pero los consumidores del resto de `src` deben usar la fachada.

## Consecuencias

- Reduce el acoplamiento directo con `globalThis`.
- Centraliza el punto futuro para mover runtime a otro almacenamiento si se necesita.
- Facilita tests de arquitectura que bloqueen nuevos accesos directos.
- Mantiene compatibilidad con codigo legacy y tipos globales existentes.

## Validacion

```bash
npm run typecheck
npm run test:p0
rg "globalThis\\.(conn|conns|plugins)\\b|\\bglobal\\.(conn|conns|plugins)\\b" src
```
