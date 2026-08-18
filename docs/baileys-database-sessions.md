# Sesiones Baileys cifradas en PostgreSQL

El modo recomendado es `BAILEYS_AUTH_STATE_SOURCE=database`. La sesión principal y cada subbot se restauran desde PostgreSQL sin depender del disco local.

## Modelo y rendimiento

`bot_sessions.auth_sessions` guarda identidad, estado y lease; `auth_credentials` contiene las credenciales cifradas y `signal_keys` una fila por `(session_id, key_type, key_id)`. La separación evita documentos duplicados y permite reemplazar o borrar una Signal key sin reescribir toda la sesión.

Al abrir una sesión, credenciales y keys se descifran una vez y se cargan en memoria. `keys.get()` sólo consulta ese mapa: responder un mensaje no espera PostgreSQL ni Argon2. Las mutaciones actualizan memoria primero y se agrupan en una escritura diferida configurable con `BAILEYS_AUTH_WRITE_DELAY_MS`; cierre y shutdown ejecutan `flush()`.

Un lease con heartbeat evita que dos procesos abran la misma sesión. Si se pierde, el socket recibe cancelación y deja de operar.

## Cifrado

Cada payload usa AES-256-GCM con IV aleatorio y AAD que liga el ciphertext a su propósito, sesión, tipo de key e identificador. La base sólo almacena ciphertext, IV, auth tag y versión. La clave maestra nunca se persiste allí.

Configuración recomendada:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
# guardar el resultado como BOT_SECRETS_MASTER_KEY_B64 en el gestor de secretos
```

Argon2id no cifra y no sustituye AES-GCM: deriva una clave desde `BOT_SECRETS_PASSPHRASE` y `BOT_SECRETS_KDF_SALT_B64`. Su coste de memoria/CPU ocurre una vez al arrancar y el resultado queda cacheado. Es útil si la operación exige passphrase; una clave aleatoria de 32 bytes evita esa latencia y tiene mayor entropía práctica.

Puedes medir el host de producción con:

```bash
npm run benchmark:auth-crypto
```

## Migración desde archivos y base anterior

1. Genera y respalda la clave maestra fuera de PostgreSQL.
2. Despliega el código y ejecuta `NODE_ENV=prod npm run db:migrate`.
3. Configura `BAILEYS_AUTH_STATE_SOURCE=database` y la clave.
4. Arranca una sola instancia. Si la sesión no existe en DB, `BotSession/` o la carpeta de `jadibot/` correspondiente se importa automáticamente.
5. Verifica conexión y ejecuta un backup de DB. Las carpetas originales no se borran automáticamente.
6. Si existía `bot_runtime.api_tokens`, ejecuta `npm run secrets:migrate-legacy`. El script cifra, verifica lectura y sólo después elimina la tabla base64.

Para guardar un token nuevo:

```bash
NODE_ENV=prod npm run secrets:set -- servicio valor-secreto
```

## Rotación de clave

`BOT_SECRETS_KEYRING_JSON` permite leer varias versiones mientras `BOT_SECRETS_KEY_VERSION` selecciona la versión de escrituras nuevas. Mantén la clave anterior en el keyring y ejecuta `NODE_ENV=prod npm run secrets:rotate`. El script descifra todas las filas antiguas, las recifra con la versión activa y actualiza dentro de una transacción. No retires una clave que siga referenciada en `encryption_key_versions`.

La rotación operativa segura es: backup, añadir clave nueva al keyring, incrementar versión, detener sockets activos, ejecutar `secrets:rotate`, arrancar y verificar restauración, confirmar que no quedan filas con la versión antigua y sólo entonces retirar la clave anterior.

## Recuperación

Un backup recuperable necesita dos piezas separadas: el dump PostgreSQL y la misma clave maestra o keyring. Si se pierde la clave, AES-GCM no permite recuperar sesiones ni tokens. Si se filtra, rota claves y credenciales externas; recifrar los mismos secretos no invalida una copia que ya fue exfiltrada.

Para validar la ruta real en PostgreSQL 18:

```bash
npm run test:integration:auth
npm run test:integration:outbox
```
