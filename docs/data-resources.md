# Recursos de datos

`src/data` queda reservado para datos estaticos versionados junto al codigo. No debe usarse como almacenamiento mutable de runtime.

## Inventario actual

- `src/data/audios.json`: semilla de audios para `audio-response.service`.
- `src/data/characters.json`: catalogo base de personajes.
- `src/data/game/*.json`: bancos de preguntas para juegos.
- `src/data/nsfw/*.json`: bancos de URLs para plugins NSFW.

## Politica

- Los plugins pueden leer estos archivos como referencia o semilla.
- Los cambios del usuario, estados de chats, progreso RPG, configuraciones y tokens deben vivir en Drizzle/DB o en el backend cuando exista.
- Los archivos temporales deben ir a `tmp/` y limpiarse despues de usarse.
- Si un recurso empieza a crecer o cambiar en caliente, debe migrarse a tabla/servicio antes de permitir escrituras en `src/data`.
