# Endurecimiento arquitectónico — 2026-08

Esta etapa implementa la segunda auditoría de arquitectura, sin ampliar el alcance de pruebas unitarias.

## Cambios aplicados

- Bootstrap explícito mediante `startApplication()`: la carga de plugins, listeners, scheduler y servicios operativos propaga sus fallos y activa cierre controlado.
- Estado Baileys exclusivo por sesión y proceso, lease owner por apertura, watchdog de vencimiento local y reintentos de flush final. Un fallo de persistencia marca la instancia en error y bloquea la reconexión automática.
- Cada socket registra `instanceId`, `sessionId`, `instanceType` y `botJid`. Configuración, membresías y `primary_bot` usan el `instanceId` estable; el JID queda como identidad externa única.
- `db:check` valida versión, schemas, relaciones e índices críticos sin modificar la estructura.
- Apagado por fases: aborta plugins, detiene intake y reconexiones, cierra sockets, drena mensajes/eventos/scheduler/background y finalmente libera auth, listener y pool.
- Branding y configuración privada de APIs están separados; los plugins ya no consumen credenciales externas directamente.
- Selecciones YouTube con TTL y límite, aisladas por bot/chat/remitente.
- `bot_runtime.bot_instances` es la raíz canónica. `auth_sessions.session_id` y `bot_instance_id` están desacoplados. La migración de owners se pospone expresamente y `auth_sessions.owner_id` se conserva por compatibilidad.
- Secretos cifrados identificados por `(purpose, name)` e invariantes explícitas de retiro de versiones.
- Puertos de usuario consumidos por capacidades (`identity`, `registration`, `moderation`, `relationships`, `economy`, `preferences`) y adapters seleccionados en `composition-root`.
- Registro declarativo para toggles simples y familias. Los cambios combinados de saludo se ejecutan en una transacción.
- Cachés TTL/LRU acotadas e invalidación selectiva entre réplicas mediante `LISTEN/NOTIFY`, con reconexión permanente y estado observable.
- `GET /health/ready` valida lifecycle, DB, listener, bots conectados y saturación de colas. `/metrics` admite Bearer token opcional.
- Los scrapers legacy y EZGif se dividieron físicamente por dominio; `src/lib/scraper.ts` y `src/lib/ezgif-convert.ts` son sólo fachadas de compatibilidad.
- Los servicios ya no importan `core/composition-root`; los adapters se inyectan desde el composition root mediante un contrato de dependencias.

## Migración y despliegue

Antes de desplegar esta versión:

```bash
npm run ops:backup
npm run db:setup-runtime-role
npm run db:check
npm run build
```

`database/schema.sql` contiene el modelo final PostgreSQL 18 y es el único bootstrap admitido para bases vacías. Esta rama no ejecuta DDL ni upgrades legacy durante el arranque.

Los endpoints operativos escuchan por defecto en `127.0.0.1:3000`; usa `HEALTH_HOST`, `HEALTH_PORT` y `HEALTH_METRICS_TOKEN` para integrarlos con el supervisor o balanceador.

El registro canónico de owners en base de datos no forma parte de esta etapa. No se debe retirar `BOT_OWNER_NUMBERS` ni `auth_sessions.owner_id` hasta ejecutar esa migración específica.

## Dependencias

`npm audit --omit=dev` reporta cero vulnerabilidades. La auditoría completa mantiene cuatro moderadas en la cadena de desarrollo `drizzle-kit -> @esbuild-kit -> esbuild`; el fix automático propone un downgrade breaking de Drizzle Kit y no se aplica al runtime.
