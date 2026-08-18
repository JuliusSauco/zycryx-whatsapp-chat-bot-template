# Dependencias operativas

Esta guia separa herramientas del sistema por funcionalidad afectada. Complementa `npm run ops:check`, `docs/deployment.md` y `docs/troubleshooting.md`.

## Resumen

| Herramienta | Prioridad | Afecta | Instalacion tipica |
|---|---|---|---|
| Node.js 24 LTS | Requerida | Runtime del bot, scripts, build. | `nvm install 24` o paquete oficial; mantener el ultimo parche 24.x. |
| PostgreSQL client | Requerida para operacion DB | `pg_dump`, `pg_restore`, `createdb`, backups/restores. | `postgresql-client` / instalador PostgreSQL. |
| FFmpeg | Requerida para multimedia | Stickers, audio, `tomp3`, GIF/reacciones, conversiones. | `apt install ffmpeg` / Chocolatey/Scoop. |
| git | Requerida para deploy por repo | Actualizaciones administrativas con `git pull`. | `apt install git`. |
| ImageMagick | Opcional recomendada | Conversiones PNG/WebP en stickers. | `apt install imagemagick`. |
| Python 3 | Opcional | Solo `speedtest`. | `apt install python3`. |

## Auditoria npm

La migracion a Node.js 24 LTS fue validada el 2026-07-29 con `npm audit`: quedaron 23 hallazgos (2 criticos, 11 altos y 10 moderados). Las ramas pendientes proceden principalmente de dependencias legacy de voz, stickers, busqueda, scraping y SDKs no migrados, entre ellas `node-gtts`, `wa-sticker-formatter`, `yt-search`, `link-preview-js` y `openai`.

No ejecutar `npm audit fix --force`: npm propone downgrades o majors incompatibles para algunos de estos paquetes. Sus reemplazos y migraciones deben abordarse por separado, con pruebas funcionales de WhatsApp y multimedia.

## Por funcionalidad

### Multimedia y stickers

Requiere `ffmpeg` en PATH. Sin FFmpeg pueden fallar:

- stickers desde imagen/video;
- `tomp3`, `toimg` y conversiones multimedia;
- reacciones GIF enviadas como MP4;
- procesamiento de audios.

ImageMagick es opcional, pero recomendado para conversiones PNG/WebP. En Windows se valida `magick`; en Linux/macOS se acepta `magick` o `convert`.

### Backups y recuperacion

El script `npm run ops:backup` puede copiar sesiones sin PostgreSQL client, pero para respaldar DB necesita `pg_dump`.

Para restaurar:

- `pg_restore`: restaura `database.dump`.
- `createdb`: util si la base destino aun no existe.

### Deploy y mantenimiento

`git` es necesario si el servidor se actualiza administrativamente con `git pull`.

### Speedtest

El comando `speedtest` requiere Python (`python3` o `python`) y el archivo `speed.py` en la raiz del proyecto. Si falta, solo se afecta ese comando.

## Validacion

```bash
NODE_ENV=prod npm run ops:check
```

Las advertencias de dependencias opcionales no bloquean el bot, pero explican que comandos o flujos quedaran degradados.
