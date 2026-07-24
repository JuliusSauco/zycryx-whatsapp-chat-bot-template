# Seguridad de comandos owner

## Modelo de permisos

El bot utiliza un unico nivel privilegiado: `owner`. Son owners:

- los numeros configurados en `BOT_OWNER_NUMBERS`;
- los owners guardados en `subbots.owners` para la instancia correspondiente.

Los owners persistidos de subbots se conservan, pero no se pueden agregar ni eliminar desde WhatsApp. Cualquier cambio debe hacerse mediante un procedimiento administrativo controlado.

## Superficie retirada

El bot no expone comandos de WhatsApp para evaluar JavaScript, ejecutar shell, realizar solicitudes HTTP arbitrarias, leer plugins, respaldar credenciales, actualizar el repositorio, reiniciar o detener el proceso. Tampoco permite modificar owners desde el chat.

La administración del proceso, despliegues, respaldos y cambios de owners debe realizarse fuera de WhatsApp, con acceso autenticado al servidor y trazabilidad operativa.

## Comandos conservados

- `.db info` es owner-only y únicamente consulta estadísticas. No ejecuta mantenimiento ni `VACUUM`.
- `.speedtest` continúa público. Ejecuta un archivo conocido mediante `execFile`, con timeout, límite de salida y sanitización de errores; no acepta comandos arbitrarios del usuario.
- Los demás comandos owner conservados siguen protegidos por `ownerGuard`.

## Compatibilidad temporal de configuración

Durante una versión, instalaciones antiguas que todavía definan la variable legacy de owners fijos serán interpretadas como owners normales. Al arrancar se registra una advertencia deprecatoria sin mostrar números ni secretos. El operador debe copiar esos valores a `BOT_OWNER_NUMBERS`; la variable antigua se retirará en una versión posterior.

## Operación recomendada

- Ejecutar el bot con un usuario de sistema dedicado y sin privilegios administrativos.
- Tratar `.env`, `BotSession/` y `jadibot/` como secretos.
- Mantener `BOT_OWNER_NUMBERS` limitado a operadores de confianza.
- Realizar actualizaciones, reinicios y respaldos desde el pipeline o el servidor, nunca mediante mensajes de WhatsApp.
- Revisar los logs de acceso denegado y los cambios administrativos de base de datos.
