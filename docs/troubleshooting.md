# Troubleshooting

Problemas comunes y como resolverlos. Fecha de referencia: 2026-06-10.

Antes de cambios grandes o diagnosticos largos, ejecuta:

```bash
NODE_ENV=prod npm run ops:check
```

Si marca errores, corrige eso primero. Si solo marca advertencias, revisalas segun el incidente.

## Conexion y vinculacion

### No aparece el QR en la consola web

- Entra en `/console`, autentícate, selecciona **Escanear QR** y pulsa **Generar QR**.
- Si queda en “Preparando”, revisa la conectividad con WhatsApp y los logs de la misma vista.
- Puedes cambiar a **Usar código** y escribir el número internacional del bot si la cámara no reconoce el QR.

### El codigo de emparejamiento no llega o es rechazado

- El numero debe ir en formato internacional sin `+` ni espacios.
- WhatsApp limita la frecuencia de codigos; espera 1-2 minutos entre intentos.
- No incluyas prefijos de llamada, extensiones ni ceros locales que no formen parte del número internacional.

### `Sesión inválida (código 401/403/500)`

La sesion fue cerrada o invalidada (por ejemplo "Cerrar sesion" desde el telefono). El bot detiene los reintentos automaticamente y queda esperando intervencion:

1. Abre la consola web.
2. Elige QR o código e introduce el número internacional cuando corresponda.
3. Inicia la vinculación; el proceso revoca el estado inválido y guarda la sesión nueva al sincronizar.

Otros codigos de cierre (red caida, `connectionReplaced`, `restartRequired`) usan reconexión single-flight con backoff exponencial y jitter.

### El bot se desconecta cada cierto tiempo

No hay un reinicio periódico forzado. Revisa el código de desconexión, pérdida del lease de sesión, conectividad y logs del supervisor. Un loop de sesiones stale suele indicar una sesión inválida o dos procesos intentando operar el mismo dispositivo; el lease de DB debe dejar sólo uno activo.

## Base de datos

### `ECONNREFUSED` o `password authentication failed` al arrancar

- Verifica `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` en el `.env.<NODE_ENV>` correcto (el bot solo carga el archivo que corresponde a `NODE_ENV`).
- Si usas `DATABASE_URL`, tiene prioridad sobre los parametros individuales.
- Ejecuta `NODE_ENV=prod npm run ops:check` para detectar variables faltantes antes de reiniciar.

### `relation "..." does not exist`

Ejecuta `npm run db:check`. En una base realmente vacía, provisiona una sola vez con `npm run db:setup`; no lo ejecutes sobre una base que ya tenga tablas parciales. Esta rama no actualiza esquemas legacy y los schemas del bot son fijos.

### PostgreSQL anterior a 18

El bootstrap y `db:check` rechazan versiones anteriores porque el modelo usa UUIDv7 y restricciones temporales de PostgreSQL 18. Actualiza o crea un proyecto Supabase con PG18.

## Comandos y plugins

### Un comando no responde

1. Revisa el log con `LOG_LEVEL=command` (default): si el comando aparece como `[ CMD ]`, llego al router; el problema esta en el plugin o sus guards.
2. Si no aparece, puede estar bloqueado antes: grupo baneado, `primary_bot` de otro bot en el grupo, modo admin, access mode de la familia (`games`, `rpg`, `downloads`, etc.) en `admins`/`off`, o el mensaje fue deduplicado.
3. Los rechazos de guards de access mode son silenciosos por diseno (no responden nada).

### Las descargas fallan (`play`, `tiktok`, `ig`, etc.)

Las APIs publicas de descarga son inestables por naturaleza. Los providers (`src/providers/downloads/`) tienen fallbacks entre varios proveedores; si todos fallan:

- revisa qué API keys opcionales tienes configuradas (ver `docs/environment-variables.md`);
- prueba el mismo comando mas tarde: muchos proveedores aplican rate limits;
- revisa el log con `LOG_LEVEL=debug` para ver qué proveedor fallo y por que.

### Stickers o conversiones fallan

FFmpeg no esta instalado o no esta en el PATH. Verifica con `ffmpeg -version` en la misma terminal/usuario que corre el bot. Algunos flujos de stickers usan tambien ImageMagick (`convert`).

Ejecuta `NODE_ENV=prod npm run ops:check` para ver exactamente que funcionalidades quedan afectadas por cada dependencia faltante. La matriz completa esta en `docs/operational-dependencies.md`.

### `speedtest` falla

Requiere `python3` en el PATH y el archivo `speed.py` en la raiz del proyecto.

### Hot reload no toma cambios de un plugin

El watcher recarga archivos `.ts`/`.js` dentro de `src/plugins/`. Si agregaste una carpeta nueva justo despues de arrancar, deberia detectarse sola; si no, reinicia el proceso. Cambios fuera de `src/plugins/` (core, services, lib) siempre requieren reinicio.

## Rendimiento

### Mensajes con respuesta lenta

- Activa diagnostico: `LOG_LEVEL=debug` y `PERF_LOG_THRESHOLD_MS=300`. Los logs `[PERF]` desglosan el pipeline por etapa (dedup, smsg, context, guards, plugin) e identifican hooks o plugins lentos.
- La primera interaccion en un grupo puede ser mas lenta mientras se carga metadata; despues queda cacheada (TTL 1h).

### Memoria creciendo

- El reinicio cada 3h es la mitigacion actual. Si el crecimiento es rapido, revisa la cola background (`⚠️ Cola background acumulada` en logs) y la cantidad de subbots activos.

## Errores de build / typecheck

### `tsc` no se reconoce

Faltan dependencias: `npm install`. El proyecto usa TypeScript local, no global.

### `npm test` falla tras cambiar settings de grupo

Las suites de servicios (`tests/services.test.ts`) afirman la forma exacta de los settings. Si agregaste un campo a `group_settings` o a los defaults del servicio, actualiza tambien las expectativas del test.
