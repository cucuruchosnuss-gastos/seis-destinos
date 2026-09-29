# Parte 2 · Cheques: endosar a un proveedor (29/09/2026)

Rama `ci-prueba/parte2-endoso` (worktree), base `34b42b2` (tag `antes-de-cc-cheques-2026-09-29`). Un commit. Solo la región de Cheques de `modulos/administracion.html` (más pruebas, datos de la maqueta, CLAUDE.md y este traspaso). **No se tocó `cuentas-corrientes.html`** (lo hace otra parte) **ni la base** (solo lectura).

## Qué se hizo

- **"Endosado" paga la cuenta del proveedor.** En el diálogo de salida, Endosado ya no pide un texto: abre un buscador (`proveedores_para_endoso`, desde 2 letras, con la deuda por fábrica), se elige el proveedor, la fábrica cuya deuda se paga (por defecto la del cheque) y se ve **qué se paga**: las facturas, las más viejas primero, y lo que queda a favor. Confirmar llama a `endosar_cheque_a_proveedor`.
- **Varios elegidos:** uno por uno, en orden. La vista previa también reparte en orden. Si uno falla: para, dice cuáles salieron, cuál falló (mensaje de la base entero) y cuántos no se tocaron; reintentar sigue con los que faltan.
- **Endosados "con texto" de antes** (`salida_proveedor_id` null; hoy 2: 072-43300023 "nicco" y 072-00600675 "Corrugadora centro"): "Vincular al proveedor" (la misma función, sin fecha → la base respeta la suya) además de "Volver a cartera". El buscador arranca con lo que se había anotado.
- **Endoso a proveedor en la fila/tarjeta:** "dd/mm/aaaa · Cheque endosado 072-43300023 · <razón social>" y "Pagó su cuenta corriente" en lugar de "Volver a cartera".
- **Depositado** sigue igual (`marcar_salida_cheque` / `marcar_salida_cheques`); el campo de texto del destino quedó solo para él.

## Decisiones (y por qué)

1. **"Volver a cartera" NO se ofrece en un endoso a proveedor.** Leí `volver_cheque_a_cartera`: pone `en_cartera` y limpia fecha/destino/por, pero **no revierte el gasto** (`salida_gasto_id`) **ni limpia `salida_proveedor_id`**. Volverlo dejaría un pago sin cheque. La celda lo explica en `title`; `abrirVolverACartera` además corta.
2. **La vista previa replica el reparto de la base** (`repartoFifo`, en centavos, facturas por `fecha_factura` nulls last y `created_at`, las de saldo ≤ 0 se saltean). **No se manda `p_aplicaciones`**: reparte la base, así lo que se ve y lo que pasa salen de la misma regla.
3. **Sin `cuentas_corrientes:ver_todo` no se leen las facturas** (la policy de `facturas_pendientes` es propias o `ver_todo`: una lista incompleta sin aviso). Se muestra solo el total con la deuda de `proveedores_para_endoso` (= min(importe, deuda)) y se dice por qué.
4. **Sin `cuentas_corrientes:registrar_pago`** el botón Endosado queda apagado y una nota dice por qué (y si igual se llega, confirmar no llama a la base). Por eso la región ahora lee las tareas de `cobranzas` **y** `cuentas_corrientes`.
5. **La fábrica:** por defecto la del cheque; un cheque sin fábrica, o varios de fábricas distintas → se elige (no se adivina). Si es otra que la del cheque: "queda como deuda entre empresas (X le va a deber $ … a Y)" — la misma condición con la que la base anota `movimientos_entre_unidades` (el cheque tiene fábrica y es distinta). Las fábricas salen de `unidades_negocio` activas (+ las de la deuda y los cheques si esa lectura falla), sin la fábrica de pruebas.
6. **La fecha del endoso** mantiene la regla de la salida (no futura, no anterior a la cobranza). La base de `endosar_cheque_a_proveedor` solo exige que no sea futura: la pantalla es un poco más estricta a propósito (una salida antes de cobrar el cheque no tiene sentido y el depósito ya lo exige).
7. `erroresSalida` conserva su rama de endosado (la prueban `test-cheques-vista.js` y `mut-cheques-vista.js`), aunque desde la pantalla el endoso ya no pasa por ahí.

## Pruebas

- `test-cheques-endoso.js` **119/119**; `mut-cheques-endoso.js` **65/65** (+4 equivalentes: textos armados solo con `formatearImporte()` y palabras fijas).
- Mutaciones de Cheques corridas de a una: vista 53/53, lote 18/18, celular 26/26, colores 52/52, barra-unidad 39/39, cargo 7/7, orden 24/24, plazo 23/23, selección 22/22, unidad 23/23, administracion-cheques 18/18. (Dos anclas de `mut-cheques-vista.js` dejaron de ser únicas con el código nuevo: se reescribió el código nuevo —la fecha del endoso reusa `erroresSalida()` y la descripción de "vincular" va por una variable—, no las mutaciones.)
- `test-cheques-vista.js` y `test-cheques-lote.js`: sus casos de "endosado con texto" pasaron a **depositado** (mismas assertions: error tal cual, payload exacto) y la vista suma que Endosado ya no pide texto, sin permiso se apaga y con permiso abre el buscador.
- `sandbox-cheques.js`: las funciones y constantes nuevas como opcionales, y `sinUnidadesDePrueba` real por el import.
- `seguras-cheques.js`: las interpolaciones nuevas que arman HTML ya escapado, con su motivo.
- Todo: `check-bytes` verde, `correr-todo` 166/166, mutaciones de Cheques (ver el reporte).

## Mirado en la maqueta (sin sesión real)

`administracion?seccion=cheques` a 1280 y 390 px: la fila del endoso a proveedor (chq-6), el viejo con "Vincular al proveedor" + "Volver a cartera" (chq-5), el diálogo con el buscador, la fábrica, el aviso entre empresas y qué se paga; confirmar muestra el cartel. Sin scroll horizontal de la página. En el celular, "Cheque endosado 285-…" se corta con puntos suspensivos en el renglón (el texto entero va en `title`); la tarjeta del viejo mide ~109 px por los dos botones.

## Lo que NO se probó

- **Nada contra la base real**: ni `proveedores_para_endoso` ni `endosar_cheque_a_proveedor` se ejecutaron (solo lectura). Todo contra dobles y la maqueta.
- Que el pago aparezca en la cuenta del proveedor en Cuentas corrientes (lo muestra otra parte).
- El reparto con muchas facturas reales y centavos raros (la suite lo cubre con datos armados).

## Huecos de base (no se inventó nada)

1. **No hay cómo deshacer un endoso a proveedor.** `volver_cheque_a_cartera` no revierte el gasto ni limpia `salida_proveedor_id`, y `anular_gasto` no toca el cheque (ninguna función fuera de `endosar_cheque_a_proveedor` menciona `salida_proveedor_id`, medido el 29/09/2026). Hace falta una función que anule el gasto del endoso, borre el `movimientos_entre_unidades` si lo hubo y vuelva el cheque a cartera — o que `volver_cheque_a_cartera` lo haga cuando hay `salida_gasto_id`.
2. `proveedores_para_endoso` con menos de 2 letras trae 50 proveedores **sin orden fijo** (el `limit` va antes del `order by`); la pantalla no lo llama así, pero conviene saberlo. Tampoco filtra proveedores inactivos o pendientes de aprobación.
3. La deuda de `proveedores_para_endoso` suma `saldo_pendiente` sin filtrar `> 0`: si alguna factura tuviera saldo negativo, el total "sin facturas" podría diferir del reparto real.

## Guion para Facu

1. Administración → Cheques → un cheque en cartera de una cobranza asentada → **Dar salida** → **Endosado**. Tiene que aparecer "¿A qué proveedor se lo pasaste?". Escribí 2 letras: aparecen proveedores con CUIT y "Debe: Nuss $ … · Dolce Pasta $ …".
2. Elegí uno: la fábrica viene puesta (la del cheque). Mirá "Qué se paga": las facturas más viejas primero y cuánto queda a favor. Cambiá la fábrica a otra: tiene que decir "queda como deuda entre empresas".
3. Confirmá: el cartel dice cuánto pagó y cuánto quedó a favor. En la lista, el cheque dice "Cheque endosado 072-… · <proveedor>" y "Pagó su cuenta corriente", **sin** "Volver a cartera". En Cuentas corrientes, el pago en la cuenta del proveedor.
4. Los dos endosados viejos ("nicco", "Corrugadora centro"): **Vincular al proveedor** → el buscador arranca con lo anotado → elegí el proveedor real → confirmá. La fecha de salida no cambia.
5. Seleccionar dos cheques → Dar salida a 2 → Endosado → mismo proveedor: la vista previa dice "Uno por uno, en este orden".
6. Con una cuenta sin "Registrar pagos a proveedores": Endosado aparece apagado con la explicación.

## Qué automatizaría ahora

**Los dobles de `supabase.rpc` de cada suite se reescriben a mano en cada tanda** (acá: una función que responde según el nombre y los parámetros, otra con promesas que se sueltan tarde para probar el turno). Propuesta: un helper `pruebas/rpc-falso.js` con `rpcFalso({ nombre: respuesta | (params) => respuesta, ... })`, `rpcLento()` (devuelve la promesa y su `soltar()`) y el registro de llamadas, igual que el `__segun` que ya tiene la maqueta. Se usa desde cualquier sandbox con `S.__setRpc(rpcFalso({...}))` y cada suite nueva ahorra ~30 líneas y un tipo de error (olvidarse de registrar la llamada).
