# ADR-0001 - Marca del bot por contexto

Fecha: 2026-06-30
Estado: aceptado

## Contexto

El bot soporta bot principal y subbots. Hasta ahora `context-builder.ts` mutaba `info.wm` e `info.img2` por mensaje usando la configuracion del bot que estaba procesando el evento. Como `info` es global, dos sesiones en paralelo pueden contaminar la marca visible entre respuestas.

## Decision

La marca visible del bot se pasara por contexto como `branding`.

```ts
interface BotBranding {
    watermark: string;
    logoUrl: string;
}
```

`buildContext()` calcula la marca desde `botConfig` y los valores default de `info`, pero no muta `info`. Los plugins nuevos y migrados deben leer `ctx.branding` o `sdk.branding`.

## Consecuencias

- Evita filtrado de marca entre bot principal y subbots.
- Permite testear menus/plugins sin preparar mutaciones de `globalThis.info`.
- Mantiene `globalThis.info` como fallback legacy mientras se migran plugins antiguos.
- La migracion debe ser gradual porque muchos plugins aun leen `info.wm`.

## Validacion

```bash
npm run typecheck
npm run test:p0
rg "info\\.wm\\s*=|info\\.img2\\s*=|globalThis\\.info\\s*=" src
```

