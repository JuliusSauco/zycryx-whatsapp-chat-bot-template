# Juegos de Rol

La familia `roleplay` agrupa sesiones contratadas entre dos usuarios. El primer rol disponible es `slut` y requiere el artilugio permanente `role-slut`, comprado en la tienda por 1.000 Coins.

## Reglas económicas

- Todas las compras y cobros usan exclusivamente Coins de la E-Wallet. El banco nunca se debita automáticamente.
- El precio automático es `nivel × 1.000` Coins por hora, desde un mínimo de 1.000.
- Entre los niveles 1 y 9 el precio lo determina el bot.
- Desde el nivel 10 se admite `--precio N`, entre 1.000 y `nivel × 1.000` Coins por hora. Sin esa opción se aplica el máximo automático.
- Un contrato fijo se prepaga. La primera hora se acredita al beneficiario al aceptar; el resto queda en custodia y se libera al comenzar cada hora. Las horas aún no iniciadas se devuelven si el contrato termina antes.
- `i` significa tiempo ilimitado. Se cobra una hora al aceptar y otra cada hora hasta que alguien finalice el contrato o la E-Wallet del comprador no tenga saldo suficiente.

## Flujo de comandos

```text
.store buy role-slut
.roll slut [--precio N] [@usuario] [mensaje]
.slut [--precio N] [@usuario] [mensaje]
.roll aceptar @beneficiario [horas|i]
.roll aceptar todos
.roll slut end [@contraparte]
.roll slut responder [mensaje]
.r-slut <acción> [@contraparte] [mensaje]
```

Una oferta sin destinatario menciona de forma oculta a los participantes del grupo. Una oferta dirigida solo puede aceptarla la persona indicada. Cada apertura admite como máximo cinco compradores simultáneos.

Al aceptar sin duración se contrata una hora. `aceptar todos` contrata por una hora cada oferta disponible para el comprador. El comprador termina su propio contrato; el beneficiario puede terminar todos sus contratos activos o uno concreto mediante mención o respondiendo a cualquier mensaje de esa contraparte. La sesión se cierra cuando ya no quedan contratos activos.

## Acciones y respuestas

Cuando comienza un contrato, el bot muestra el menú completo de acciones obtenido de `resources/data/reactions.json`. Las acciones de más de dos participantes no forman parte del rol. `follar` corresponde a la acción `cog` del catálogo.

Sin destinatario, `.r-slut` envía un GIF por cada contraparte activa, de forma secuencial y hasta el máximo de cinco. Con mención o respuesta se limita a esa contraparte. Los GIFs NSFW solo se seleccionan cuando la configuración y los permisos del grupo lo autorizan.

Cada acción del comprador genera automáticamente una respuesta del bot en nombre del beneficiario. El beneficiario puede añadir otra respuesta citando el mensaje con `.roll slut responder`; si omite el texto, el bot vuelve a elegir una respuesta específica de esa acción. Cuando el beneficiario inicia una acción, no se genera una respuesta automática para el comprador.

Las respuestas narrativas están separadas de los textos del menú normal de GIFs. `resources/data/roleplay/slut-responses.json` contiene exactamente diez respuestas largas y aleatorias por cada una de las 26 acciones, para un total de 260.

## Persistencia

Las licencias, sesiones, contratos, eventos de cobro y referencias de mensajes se guardan en tablas normalizadas. Los movimientos económicos generan operaciones y entradas de ledger balanceadas; la custodia de horas prepagadas usa una cuenta institucional `escrow` distinta de la reserva general.

El esquema se mantiene en `src/db/schema.ts` y en el bootstrap completo `database/schema.sql`. Este proyecto no crea ni migra tablas durante el arranque: `db:check` solo valida una base ya provisionada.
