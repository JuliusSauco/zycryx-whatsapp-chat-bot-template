-- Elimina usuarios cuyo identificador de WhatsApp no tiene el formato
-- numerico@s.whatsapp.net (por ejemplo: 393513529362@s.whatsapp.net).
--
-- IMPORTANTE: se valida `id`, no `lid`. En el CSV, `lid` contiene
-- identificadores legitimos que terminan en `@lid`.

BEGIN;

-- Vista previa: estas son las filas que se eliminaran.
SELECT id, nombre, lid
FROM usuarios
WHERE id !~ '^[0-9]+@s\.whatsapp\.net$'
ORDER BY id;

-- En el CSV usuarios_rows.csv del 24-07-2026 deben ser exactamente 44 filas.
-- Si el resultado anterior no es el esperado, ejecuta ROLLBACK en lugar de
-- continuar con el DELETE.

DELETE FROM usuarios
WHERE id !~ '^[0-9]+@s\.whatsapp\.net$'
RETURNING id, nombre, lid;

COMMIT;

-- Para probar el script sin conservar el borrado, sustituye COMMIT por ROLLBACK.
