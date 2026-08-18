# Censura de usuarios por grupo

El comando `censored` mantiene una lista persistente e independiente por grupo. El bot debe ser administrador para gestionar la lista y eliminar mensajes.

## Uso

```text
.censored @usuario
.censored                 # respondiendo a un mensaje
.censored list
.uncensored @usuario
```

La censura no expira y sobrevive reinicios y salidas temporales del participante. Los mensajes se eliminan sin avisos. Si el censurado es ascendido a administrador, creador u owner, el filtro se suspende mientras conserve ese rango.

## Acceso

Está habilitado por defecto para administradores. Puede configurarse con:

```text
.enable censored --all
.enable censored --admin
.enable censored --superadmin
.enable censored --owner
.disable censored
```

Desactivar conserva la lista y pausa tanto la administración como el borrado hasta volver a habilitarlo. Por seguridad, el bot, los owners y los participantes fuera de la autoridad jerárquica del ejecutor no pueden ser censurados.
