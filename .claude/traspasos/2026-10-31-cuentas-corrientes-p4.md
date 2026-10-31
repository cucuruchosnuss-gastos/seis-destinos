# Traspaso — Cuentas corrientes: arreglos del detalle del pago (31/10/2026, arreglos de la auditoría del 30/10, punto 4)

Para el chat de arquitectura (dueño de CLAUDE.md y `docs/memoria/`). Quien lo recibe no vio el trabajo: esto es autocontenido.

(El nombre lleva `-p4` porque otro ayudante trabaja el mismo día en Cuentas corrientes —la orden de pago A4— en otra rama, y así los dos traspasos no chocan al unir.)

## Rama y archivos
- Rama LOCAL `arreglos-30-10/p4`, creada desde `origin/main` = `1c20f98`. No se pusheó: la une la sesión principal.
- `modulos/cuentas-corrientes.html` (solo el detalle del pago; no se tocó la hoja de la orden de pago).
- Pruebas: `pruebas/test-cuentas-corrientes-arreglos-detalle-pago.js` y `pruebas/mut-cuentas-corrientes-arreglos-detalle-pago.js` (nuevas), `pruebas/datos-maqueta/arreglos-detalle-pago.js` + `e2e/maqueta/datos/arreglos-detalle-pago.json` (nuevos), `e2e/115-arreglos-detalle-pago.spec.js` (nuevo); ajustes en `pruebas/pago-aplicar-comun.js`, `pruebas/test-cuentas-corrientes-pago-proveedor-aplicar.js`, `pruebas/mut-cuentas-corrientes-pago-proveedor-aplicar.js`, `pruebas/test-cuentas-corrientes-detalle-pago-cheques.js`, `pruebas/mut-cuentas-corrientes-detalle-pago-cheques.js`.
- `docs/memoria/cuentas-corrientes.md`: se agregó UNA sección "EL DETALLE DEL PAGO: ARREGLOS (31/10/2026, arreglos de la auditoría, punto 4…)" en el medio, justo después de la sección de "LA FACTURA ELEGIDA VIAJA, APLICAR A FACTURAS Y ANULAR UN PAGO". Revisala; si preferís otra ubicación, movela.

## Qué cambió y por qué (pedido de Facu, punto 4)
1. **(a) Releer "a cuenta" y "Anular" después de sacar o agregar un cheque.** Antes, al sacar o agregar un cheque se releía el contenido del detalle pero NO el panel de abajo (lo que quedaba a cuenta y "Anular el pago"): si se sacaba el único cheque, el pago quedaba anulado en la base pero la pantalla seguía ofreciendo "Anular" y el "A cuenta $ X" viejo. Ahora `confirmarSacarChequeDP` y `confirmarAgregarChequesDP` llaman a `releerAccionesTrasCambioChequesDP(dp)` → `cargarAccionesDetallePago` (solo si ese detalle sigue abierto). En un pago anulado "Anular" desaparece y queda "Pago anulado · <motivo>" con "Hacer el pago de nuevo".
2. **(b) Los cheques del pago con el criterio de la base.** `sacar_cheque_de_pago` y `anular_gasto` toman los cheques con `coalesce(pago_gasto_id, salida_gasto_id) = el gasto AND estado = 'endosado'`. La pantalla leía "pago_gasto_id = X o salida_gasto_id = X" sin mirar el estado, y podía mostrar (y prometer devolver) un cheque rechazado o uno que es de otro pago. PostgREST no filtra por un coalesce, así que siguen las dos lecturas (ahora pidiendo también `pago_gasto_id` y `salida_gasto_id`) y la función nueva `chequesDeEstePagoCC` filtra. Vale para el detalle (`cargarDetallePago`) y para la vista previa de Anular (`leerAccionesDetallePago`).
3. **(c) El aviso cuando la RLS esconde los cheques.** La policy de `cobranza_cheques` ("leer si ve la cobranza") filtra sin dar error, así que el aviso viejo (solo con error) casi nunca salía. Ahora `noSeVenChequesDP`: en un pago con cheques **de la cartera**, sin anular, con la lectura vacía (o con error) dice "No se pueden ver los cheques de este pago con tu usuario.".
4. **(d) Anular con efectivo o transferencia: la plata vuelve a la caja siempre.** `anular_gasto` ahora devuelve la plata también sin `cuenta_id` (da vuelta cada `egreso_gasto` del gasto). La vista previa dice siempre "Vuelven $ X a la caja (a la cuenta de la que salieron)" (antes, sin cuenta, no decía nada). Con QR o cheques no habla de caja.

## Qué se verificó y contra qué
- Base `nuss-central`, el 31/10/2026, solo lectura: `pg_get_functiondef` de `sacar_cheque_de_pago`, `agregar_cheques_a_pago`, `anular_gasto`, `pagar_proveedor_con_cheques_cartera` y `endosar_cheque_a_proveedor` (cómo escriben la descripción); `pg_policies` de `cobranza_cheques` (una sola: SELECT si existe la cobranza visible). Datos: 18 gastos con `medio_pago = 'cheque'`; 2 sin cheques endosados con el coalesce (uno sin proveedor y sin descripción, y "Pago a cuenta corriente — NICCO S.R.L." del 21/08/2026); los 32 cheques con `pago_gasto_id` o `salida_gasto_id` están endosados y ninguno tiene los dos distintos (hoy el filtro no esconde nada real: protege lo que venga). 0 gastos en efectivo/transferencia sin anular con `cuenta_id` null.
- `test-cuentas-corrientes-arreglos-detalle-pago.js`: 51/51 verde; sobre `1c20f98` da ROJO (20/50: 30 fallas, de los cuatro puntos). Ejecuta el código real (abrir el detalle, el panel de acciones, sacar, agregar) con una base falsa que repite sacar y agregar.
- `mut-cuentas-corrientes-arreglos-detalle-pago.js`: 25/25 detectadas. `mut-…-pago-proveedor-aplicar.js` 100/100; `mut-…-detalle-pago-cheques.js` 77/77 (+8 equivalentes) tras mover una mutación.
- `e2e/115-arreglos-detalle-pago.spec.js` en la maqueta, 390 y 1280 px: 6/6 verde; sobre `1c20f98`, 6/6 rojo. `e2e/106`, `109` y `74`: 22/22 verde.
- `node pruebas/check-scripts.js` OK; `test-anclas-mutaciones.js` verde. `npm run pruebas`: 343/343 en verde.

## Decisiones tomadas sin consultar
- **El aviso de (c) va solo en pagos de la cartera** (descripción que empieza con "Pago con cheques de terceros" o "Cheque endosado", que es lo que escriben las cuatro funciones de la base que mueven cheques de la cartera a un pago). Motivo: hay un pago real con `medio_pago = 'cheque'` que no es de la cartera (NICCO, 21/08/2026); con la regla literal le diría a Facu "no se pueden ver los cheques con tu usuario", que es falso. Con error de lectura avisa siempre. En un pago anulado no avisa (sus cheques ya volvieron a la cartera).
- Por lo mismo, la vista previa de Anular de ese pago viejo ya no dice "Los cheques de este pago vuelven a la cartera".
- El texto de (d) es uno solo para con y sin cuenta: "Vuelven $ X a la caja (a la cuenta de la que salieron)".
- La mutación "sin poder leer los cheques no lo dice" se movió de `mut-…-detalle-pago-cheques.js` a la suite nueva (con los datos de aquella, que dicen "Pago con cheques de terceros", quedó equivalente), y en `mut-…-pago-proveedor-aplicar.js` la de "promete devolver plata en un pago sin cuenta" pasó a "…con QR".

## Lo no probado
- Contra la base real con un usuario sin `cobranzas:ver_todo` (la RLS filtrando de verdad): se probó con la base falsa y la maqueta.
- `agregar_cheques_a_pago` arma la descripción del pago con `pago_gasto_id = X or salida_gasto_id = X` sin mirar el estado (los otros usan el coalesce + endosado). Diferencia menor en la base; no se tocó (la base la maneja su chat).

## Qué sección de la documentación tocar
- `docs/memoria/cuentas-corrientes.md`: ya va la sección nueva (ver arriba). Además, en la sección "EL DETALLE DEL PAGO EN DOS COLUMNAS…" (30/10) dice que sin poder leer los cheques se muestra "Con tu usuario no se pueden ver los cheques de este pago": ahora el texto es "No se pueden ver los cheques de este pago con tu usuario." y sale también con la lectura vacía. Y en "Anular un pago" dice "en efectivo o transferencia con cuenta 'Vuelven $ X a la cuenta de la que salieron'": ahora es con o sin cuenta y dice "a la caja".
- `docs/memoria/aprendizajes.md` (sugerido): "La RLS de SELECT filtra sin dar error: una lectura vacía puede ser 'no tenés permiso'. Si la pantalla sabe que tendría que haber filas (acá: un pago de la cartera), lo tiene que decir".
- No hay tareas ni permisos nuevos; ninguna RPC cambió de firma.

## Qué automatizaría ahora
- **Un ayudante para "el mismo criterio que la base"**: dos veces en dos días hubo que copiar a mano el WHERE de una función SQL a la pantalla (los cheques de un pago). Un script que, dado el nombre de una función, extraiga con `pg_get_functiondef` sus `where` sobre una tabla y los deje como comentario + prueba de equivalencia contra datos de muestra, ahorraría la lectura manual y detectaría cuándo la base cambia el criterio y la pantalla quedó atrás.
- **Mover una mutación de suite**: cada vez que un arreglo vuelve equivalente una mutación ajena hay que encontrarla a mano (corriendo la suite entera de mutaciones, minutos). `npm run mutaciones:rama` podría avisar al final "esta mutación de otra suite escapó: probablemente tu cambio la volvió equivalente; movela a tu suite" con el bloque listo para pegar.
