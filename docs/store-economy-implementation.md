# Tienda, claim, robos y rifas

Este documento fija el comportamiento funcional implementado para la nueva familia `store`.

## Catálogo económico

| Recurso | Emoji | Valor en EXP | Robable | Protegido |
| --- | --- | ---: | --- | --- |
| EXP | ✨ | 1 | Sí | Sí |
| Coins | 🪙 | 100 | Sí | Sí |
| Límites | 💎 | 1.000 | Sí | Sí |
| Botcoin | 🤖 | 10.000 | Sí | Sí |
| Zyxcoin | 🔷 | 100.000 | No | No |

El catálogo vive en `bot_economy.resources`; nombres, plurales, emojis y equivalencias no se duplican en columnas de usuario.

## Tienda y seguridad

La tienda se abre con `.store` y los aliases `.tienda`, `.marketplace`, `.market`, `.compras`, `.webstore` y `.botstore`. `.store --info` muestra la guía; `.store security` o `.store seguridad` muestra estado y cinco mejoras posteriores. Un usuario de nivel 0 ve los niveles 1 a 5, pero no puede comprar.

La compra usa `.store buy security` o `.tienda comprar seguridad`. El nivel de seguridad es el nivel del usuario, limitado a 100, y el precio diario es:

```text
precio diario en Coins = 10 × nivel de seguridad
```

La capacidad restante del ladrón es 90 % en seguridad 1 y desciende linealmente hasta 0 % en seguridad 100:

```text
factor restante(S) = 0,9 × (100 − S) / 99
```

La compra y cada renovación transfieren Coins de la wallet a la reserva institucional mediante operación y ledger. `.subscription security inactive` y sus equivalentes en español detienen renovaciones; la protección ya pagada se conserva hasta `paid_until`.

## Robos

`.rob` mantiene cuatro intentos diarios y cooldowns de 1, 2, 3 y 4 horas, con cambio de día en `America/Bogota`. Admite EXP, Coins, Límites y Botcoins en wallet o banco; Zyxcoin se rechaza siempre.

```text
capacidad en EXP = nivel × 1.000
máximo del recurso = floor(capacidad en EXP / valor del recurso)
```

Ejemplos: nivel 1 permite hasta 1.000 EXP, 10 Coins o 1 Límite; Botcoin comienza en nivel 10. Para el banco se aplica además un factor de 0,5. La seguridad usa redondeo estocástico para recursos indivisibles y un bloqueo total sigue consumiendo el intento válido.

## Claim

`.daily` y `.claim` conservan la espera exacta de 24 horas y la racha si el siguiente reclamo ocurre antes de 48 horas.

```text
EXP base = día de racha × 1.000
```

Solo los múltiplos de 10 añaden el bono: 10.000 EXP, 10 Límites y 5.000 Coins. Por ejemplo, el día 500 entrega 500.000 EXP base más el bono.

## Rifas

Cada ticket cuesta 100 Coins o 10 Límites y el pago entra en reservas. Cada usuario puede mantener como máximo cinco tickets pendientes. Los códigos se entregan únicamente en el comprobante privado.

`.listrifas1`, `.listrifas2` y aliases ingleses son privados y exclusivos del owner. Cada página muestra hasta 20 personas, la cantidad comprada por cada una y el total global de tickets; nunca lista códigos.

`.start rifa <título>`, `.star rifa <título>` o `.iniciar rifa <título>` elige uniformemente uno de los códigos pendientes, consume el lote y anuncia `RIFA DE <TÍTULO>`, ganador, código elegido y total de participaciones.

## Privacidad y mensajes de grupo

Las consultas de saldos, banco, deuda, historial y suscripciones se realizan por privado. Las operaciones —comprar, comprar todo, cambiar, depositar, retirar, solicitar o pagar préstamos y comprar en tienda— pueden iniciarse en grupos. El grupo recibe solo una confirmación; importes, saldos, códigos y guías se envían al privado. Un fallo de entrega privada no revierte la transacción.

## Recordatorio diario

El scheduler revisa cada minuto la ventana 08:00–09:59 de `America/Bogota`. Un registro persistente por grupo y fecha evita duplicados y respeta el bot primario configurado. El mensaje obtiene el nombre del grupo, menciona de forma oculta a todos los participantes y recuerda las dinámicas, `.daily`, depósitos, consulta privada de `.wallet` y `.store security`.

## Persistencia

La implementación agrega catálogos, suscripciones, cargos, rifas, tickets, entradas y entregas de recordatorios normalizadas. `src/db/schema.ts` y `database/schema.sql` permanecen alineados; el SQL continúa siendo el único bootstrap de una base vacía PostgreSQL 18+.
