# ADR-0003 - Errores tipados de providers

Fecha: 2026-06-30
Estado: aceptado

## Contexto

Los comandos de descarga dependen de APIs externas inestables. Antes el contrato comun de providers distinguia solo fallos genericos como respuesta vacia o error, lo que hacia dificil decidir si el usuario debia reintentar, cambiar el enlace o esperar por rate limit.

## Decision

`ProviderFailureReason` usara razones operativas concretas:

- `timeout`
- `rate_limit`
- `not_found`
- `invalid_response`
- `network`
- `unsupported`

`src/providers/provider.types.ts` centraliza la clasificacion con `classifyProviderFailure()` y el resumen con `summarizeProviderFailures()`. Los providers deben acumular fallos por candidato y los comandos deben mostrar mensajes breves orientados al usuario, sin filtrar detalles internos.

## Consecuencias

- Los comandos pueden responder con causas mas claras cuando todos los fallbacks fallan.
- Los tests pueden validar razon de fallo y prioridad de resumen.
- La migracion puede ser incremental por familia de provider.
- Los errores tecnicos siguen disponibles en `ProviderFailure.error` para diagnostico interno.

## Validacion

```bash
npm run typecheck
npm run test:providers
```
