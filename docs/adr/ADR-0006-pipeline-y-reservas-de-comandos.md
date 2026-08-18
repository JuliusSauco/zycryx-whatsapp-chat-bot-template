# ADR-0006: pipeline validado y reservas de recursos

## Estado

Aceptado.

## Contexto

Los guards descontaban recursos antes de terminar todas las autorizaciones y mediante operaciones separadas. El router tambien permitia reemplazos silenciosos, mientras los hooks `before` mezclaban seguridad, conversaciones y efectos auxiliares.

## Decision

- Mantener el monolito modular y `defineSdkPlugin` como API compatible.
- Validar un registro candidato completo antes de publicarlo y rechazar aliases o regex identicas.
- Adaptar hooks legacy a interceptores tipados con fase, prioridad y politica de fallo.
- Ejecutar todos los guards sin efectos antes de reservar recursos.
- Reservar limite y dinero atomicamente en PostgreSQL, confirmar en exito y liberar en fallo o expiracion.
- Usar timeouts por perfil y `AbortSignal`; la cancelacion del trabajo subyacente es cooperativa.

## Consecuencias

Se agrega la tabla `command_resource_reservations` y una tarea de recuperacion. Los plugins existentes siguen funcionando, pero los nuevos deben declarar `feature` y politica de ejecucion cuando corresponda. El adaptador legacy y `createUserLocks` se retiraran solo en una version mayor futura.
