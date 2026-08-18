# Cache compartido con Redis

El runtime combina dos niveles:

- L1: mapas acotados dentro del proceso para lecturas submilisegundo.
- L2: Redis compartido para configuraciones calientes de grupos y subbots.

PostgreSQL sigue siendo la fuente de verdad. Los triggers `LISTEN/NOTIFY` invalidan L1 y L2; si el listener se reconecta, ambos niveles se vacían para no conservar valores potencialmente obsoletos.

Redis también coordina la deduplicación de mensajes y los locks de comandos largos. Todas las claves tienen TTL y los locks se liberan con comparación de token, evitando que un proceso elimine el lock adquirido posteriormente por otro.

El bot puede funcionar sin Redis cuando `REDIS_REQUIRED=false`; en ese caso conserva el comportamiento local. En producción se recomienda `REDIS_REQUIRED=true` para impedir que una réplica arranque sin coordinación compartida.

Los endpoints `/metrics`, `/health/ready` y la consola web exponen conectividad, hits, misses, escrituras, invalidaciones y errores de Redis. Nunca incluyen la URL ni sus credenciales.

No se almacenan en Redis credenciales de WhatsApp, Signal keys, tokens descifrados ni archivos multimedia.
