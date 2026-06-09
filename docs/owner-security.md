# Seguridad de comandos owner

Los comandos sensibles quedan limitados para reducir bloqueo del proceso, salidas gigantes y errores crudos expuestos en chat.

## Comandos auditados

- `owner-exec.ts`: eval owner/rowner con prefijo `>` o `=>`.
- `owner-exec2.ts`: shell rowner con prefijo `$`.
- `owner-update.ts`: `git pull`.
- `info-speedtest.ts`: `python3 speed.py --secure --share`.

## Permisos

- `owner-exec.ts` requiere `rowner`.
- `owner-exec2.ts` requiere `rowner`.
- `owner-update.ts` requiere `owner`.
- `info-speedtest.ts` queda como comando informativo publico, pero con timeout y salida limitada.

## Limites aplicados

- Eval owner: timeout de 10 segundos y respuesta truncada.
- Shell owner: timeout de 15 segundos, `maxBuffer` de 64 KB y respuesta truncada.
- Update: `git pull` con timeout de 120 segundos, `maxBuffer` de 128 KB y respuesta truncada.
- Speedtest: timeout de 120 segundos, `maxBuffer` de 128 KB y respuesta truncada.

Los errores de timeout y `maxBuffer` se convierten en mensajes seguros para usuario. Las salidas largas se cortan con aviso de truncado.

## Auditoria

`owner-exec.ts`, `owner-exec2.ts` y `owner-update.ts` registran eventos `[SENSITIVE]` en logs con accion, sender, chat y comando. No se agrega persistencia de auditoria todavia; si se necesita historial consultable, el siguiente paso es guardar estos eventos en DB.

## Variables externas

- `info-speedtest.ts` requiere que exista `python3` en el entorno y el archivo `speed.py` en la raiz del proyecto.
- `owner-update.ts` requiere `git` disponible en el entorno y permisos de lectura/escritura sobre el repo.
- Los comandos de shell/eval dependen del entorno del proceso Node. Usarlos solo con owners fijos/confiables.
