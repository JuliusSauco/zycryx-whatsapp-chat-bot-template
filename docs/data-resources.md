# Recursos del proyecto

`resources/` centraliza recursos versionados del bot. La carpeta separa datos estructurados (`resources/data`), texto plano (`resources/text`) y medios binarios (`resources/media`).

`resources/data` queda reservado para datos estaticos versionados junto al codigo. No debe usarse como almacenamiento mutable de runtime.

## Inventario actual

- `resources/data/audios.json`: semilla de audios para `audio-response.service`.
- `resources/data/characters.json`: catalogo base de personajes.
- `resources/data/game/*.json`: bancos de preguntas para juegos.
- `resources/data/nsfw/*.json`: bancos de URLs para plugins NSFW.
- `resources/data/messages.json`, `resources/data/prompts.json` y `resources/data/reactions.json`: manifiestos de prompts, mensajes y reacciones multimedia.
- `resources/text/prompts/*.txt`: presets seguros usados por `setprompt`.
- `resources/text/prompts/legacy-chatgpt.txt`: prompt legacy conservado como recurso historico; no se usa como preset activo.
- `resources/text/messages/*.txt`: textos base para bienvenidas, despedidas y frases.
- `resources/media/avatars/*.png`: avatares e imagenes de contacto locales.
- `resources/media/menus/*.jpg`: imagenes base de menus y banners.
- `resources/media/audio/seed/*.mp3|*.opus`: audios locales base usados por respuestas automaticas.
- `resources/media/audio/custom/*.mp3|*.opus|*.m4a|*.wav`: audios agregados por comandos.
- `resources/media/reaction-gifs/**/*.mp4`: GIFs de reaccion convertidos a MP4 para enviarse inline en WhatsApp.

## Politica

- Los plugins pueden leer estos archivos como referencia o semilla.
- Los manifiestos en `resources/data` deben describir rutas, aliases y metadata; los textos largos y binarios deben seguir en `resources/text` o `resources/media`.
- Los cambios del usuario, estados de chats, progreso RPG, configuraciones y tokens deben vivir en Drizzle/DB o en el backend cuando exista.
- Los archivos temporales deben ir a `tmp/` y limpiarse despues de usarse.
- Si un recurso empieza a crecer o cambiar en caliente, debe migrarse a tabla/servicio antes de permitir escrituras en `resources/data`.
- Si un medio local se genera en runtime, debe vivir bajo `resources/media` solo cuando el servicio o comando lo referencie de forma persistente.
