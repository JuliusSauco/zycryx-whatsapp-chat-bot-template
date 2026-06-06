# Excepciones del HTTP client

La regla general del proyecto es usar `src/lib/http-client.ts` para peticiones HTTP desde plugins y servicios comunes.

## Excepciones aceptadas

- `src/lib/scraper.ts`: mantiene `axios` porque algunas integraciones requieren `axios-cookiejar-support`, `CookieJar`, sesiones con cookies, parametros avanzados de scraping y polling de progreso.
- `src/lib/ezgif-convert.ts`: mantiene `axios` porque depende de multipart avanzado, redirecciones y detalles de respuesta que no quedan cubiertos de forma simple por el wrapper actual.
- `src/lib/http-client.ts`: usa `node-fetch` internamente como implementacion centralizada.

## Criterio para nuevas excepciones

Antes de agregar `axios`, `fetch` o `node-fetch` fuera del HTTP client, validar si basta con `httpJson`, `httpText`, `httpBuffer` o `httpRequest`.

Una excepcion nueva debe documentar por que necesita cookies persistentes, multipart especial, streaming, redirects internos o una API de transporte que el wrapper comun no cubre.
