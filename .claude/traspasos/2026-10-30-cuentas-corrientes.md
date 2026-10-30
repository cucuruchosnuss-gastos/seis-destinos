# Traspaso — Cuentas corrientes: la factura elegida viaja, "Aplicar a facturas" y anular un pago (30/10/2026)

Prompt para el chat de arquitectura. Quien lo lee no vio el trabajo: todo lo necesario está acá.

## Qué hay que tocar

- **`docs/memoria/cuentas-corrientes.md`**: ya tiene la sección nueva, escrita en la rama, como sub-viñeta **"LA FACTURA ELEGIDA VIAJA, "APLICAR A FACTURAS" Y ANULAR UN PAGO (30/10/2026…)"**, después de "LA ORDEN DE PAGO: ORIGINAL Y DUPLICADO…" y antes de "La cuenta del proveedor nombra esos pagos". Revisala; no hay que escribirla de nuevo.
- **`docs/memoria/aprendizajes.md`**: sumar el aprendizaje de abajo ("Una lista que se tilda tiene que tildar igual que la de al lado").
- **CLAUDE.md**: nada (es un índice; la sección del módulo vive en `docs/memoria/cuentas-corrientes.md`).
- **Permisos**: no hacen falta tareas nuevas ni cambios de catálogo (ver "Permisos").

## Rama y archivos

Rama `ci-prueba/pago-proveedor-aplicar`, desde `origin/main` `e6e0c74`. Archivos:
- `modulos/cuentas-corrientes.html`
- `pruebas/test-cuentas-corrientes-pago-proveedor-aplicar.js` y `pruebas/mut-cuentas-corrientes-pago-proveedor-aplicar.js` (nuevas), `pruebas/pago-aplicar-comun.js` (nueva: la lista de funciones para los sandbox)
- `e2e/109-pago-proveedor-aplicar.spec.js` (nuevo; las ramas abiertas usan del 102 al 108)
- Ajustadas: `test-cuentas-corrientes-numeros.js`, `-pago-mixto.js`, `-proveedores.js`, `-saldo-inicial.js` (suman la lista común), `-xss.js` (las justificaciones de las funciones nuevas), `mut-cuentas-corrientes-numeros.js` (un ancla movida a `tildarFacturaPago`), `e2e/74-cc-clientes-cheques.spec.js` (contesta la pregunta nueva).

## 1. El error de BADIC: qué pasó (verificado con SELECT y el registro de la API, 30/10/2026)

- El pago real: gasto `afbaa847-216e-4e18-8275-1fdd1fc5fe5d`, BADIC S.A.S., Cucuruchos Nuss, 30/10/2026, $ 4.200.000, `medio_pago = 'cheque'`, cargado por Godoy Yanina a las 12:47 (hora AR), orden de pago N-OP-00002 (`3be6ff70-…`). Cheques: N° 62921151 ($ 2.000.000, de Cucuruchos Nuss) y N° 62294736 ($ 2.200.000, **de Dolce Pasta**), los dos `endosado` con `pago_gasto_id` = ese pago.
- El registro de la API (edge_logs) muestra, del navegador de Yanina: una sola lectura de las facturas pendientes al abrir "Registrar pago" (12:44:47), la cartera (12:45:04) y `pagar_proveedor_mixto` (12:47:26). Nada más.
- La base NO pierde aplicaciones: `pagar_proveedor_mixto` → `pagar_proveedor_con_cheques_cartera(…, v_ap_ch)` → `registrar_pago_proveedor(…, p_aplicaciones)` pasan la lista entera con las claves `factura_pendiente_id` / `monto_aplicado` (leídas con `pg_get_functiondef` el 30/10/2026). Entonces **la lista llegó vacía: la factura no estaba tildada**.
- **La causa en la pantalla** (reproducida en la maqueta con un cheque de otra empresa): en la lista de cheques de la cartera, tocar cualquier parte del renglón tilda el cheque (cada renglón es un `<label>`); en la lista de facturas, que está justo arriba, solo tildaba el cuadradito de 18 px y tocar el renglón no hacía nada. Tocando el renglón de la factura, el pago salía con `p_aplicaciones = []`, y la pantalla no preguntaba nada (solo un cartelito "Pago a cuenta: queda todo a favor").
- A las 12:50:18 (hora AR) apareció una aplicación de $ 3.360.000,01 de ese pago a la factura **0004-00011115** (la que correspondía: queda `pagada`), y el crédito bajó a $ 839.999,99. **No vino de un navegador** (no hay ninguna llamada a `aplicar_pago_a_facturas` en el registro de la API en esa ventana): la hizo alguien directo en la base. Hoy quedan $ 839.999,99 a cuenta de ese pago.
- El otro pago a BADIC, del 22/10/2026 (`ed02da9c-…`, $ 2.262.718, cinco cheques de Cucuruchos, orden N-OP-00001), también quedó **entero a cuenta** (0 aplicaciones). No se puede saber si se eligió una factura. BADIC debe hoy el saldo inicial ($ 11.871.325,84) y la nota de débito 013 ($ 349.550): eso lo decide Facu, y se aplica con "Aplicar a facturas".
- No se tocó ningún dato de la base.

## 2. Qué cambió en la pantalla

1. **El renglón entero de una factura la tilda** (`alTocarRenglonFactura`, un listener delegado en `#lista-fifo`; la casilla y el renglón pasan por `tildarFacturaPago`, que pone el saldo como monto; tocar la casilla o el monto no da vuelta la casilla dos veces; cursor de mano).
2. **Sin ninguna factura elegida, se pregunta**: en `confirmarPago`, con facturas pendientes en la lista y ninguna en `p_aplicaciones`, no se llama a la base y aparece pegada al botón `#confirmar-a-cuenta-pago`: **"No elegiste ninguna factura: el pago va a quedar a cuenta. ¿Seguro?"**, con "Elegir una factura" y "Sí, dejarlo a cuenta" (`siDejarACuenta`). Cualquier cambio vuelve a preguntar. Sin facturas pendientes no se pregunta.
3. **"A cuenta $ X · Aplicar a facturas"** en el renglón del pago de la cuenta del proveedor y en su detalle (lo que dejó ESE pago: `creditos_proveedor` disponibles con `origen_gasto_id`; `cargarFichaCreditos` lee ahora `origen_gasto_id`). Abre `#modal-aplicar-pago`: las facturas pendientes con saldo del proveedor en la empresa y la moneda del pago, propuestas de la más vieja a la más nueva, editables, y UNA llamada a **`aplicar_pago_a_facturas(p_gasto_id uuid, p_aplicaciones jsonb [{factura_pendiente_id, monto_aplicado}]) → jsonb {aplicado, queda_a_cuenta}`**. El error de la base tal cual. Con `cuentas_corrientes:registrar_pago`.
4. **"Anular el pago"** en el detalle de cualquier pago (también con cheques), con motivo obligatorio y la vista previa ("Vuelven a la cartera: N° 62921151 ($ 2.000.000,00), N° 62294736 ($ 2.200.000,00)", "La factura 0004-00011115 vuelve a deber $ 3.360.000,01", lo que quedó a cuenta, la deuda con la otra empresa que se da vuelta, la plata que vuelve a la cuenta en efectivo o transferencia, la orden que queda anulada; avisos si el crédito ya se usó o si la orden tiene otro pago que no se anula) → **`anular_gasto(p_gasto_id uuid, p_motivo text) → void`**. Después: "Pago anulado · <motivo>" y **"Hacer el pago de nuevo"** (abre "Registrar pago" en la empresa del pago).
5. **La orden de pago de un pago anulado**, en "Órdenes de pago" de la ficha: tachada con **"ANULADA"** (o "ANULADA EN PARTE" si la orden tiene dos pagos y se anuló uno) y sin "Reimprimir". `ordenes_pago` no tiene estado (columnas verificadas el 30/10/2026): se sabe por `gastos.orden_pago_id` + `gastos.estado = 'anulado'`.

## 3. Lo leído en la base (pg_get_functiondef / information_schema / pg_policies, 30/10/2026)

- `aplicar_pago_a_facturas`: pide `tiene_tarea('cuentas_corrientes','registrar_pago')`; usa los créditos `disponible` con `origen_gasto_id` = el pago; baja `monto_original` y `monto_disponible` y borra el crédito si lo consume entero (así `anular_gasto` no lo confunde con un crédito usado); **no compara la moneda de la factura con la del pago** (la pantalla filtra por la moneda del pago).
- `anular_gasto`: pide ser el dueño del gasto o `tiene_tarea('gastos','editar_anular')`; motivo obligatorio; frena si un crédito del pago tiene `monto_disponible < monto_original`; devuelve las aplicaciones (o anula la factura creada por el mismo pago, `facturas_pendientes.origen_gasto_id`); anula el crédito; con `medio_pago = 'cheque'`, los cheques endosados con `coalesce(pago_gasto_id, salida_gasto_id)` = el pago vuelven a `en_cartera`, anota `cobranza_historial` y la deuda entre empresas al revés; con efectivo o transferencia con cuenta, la devolución a caja.
- `pagar_proveedor_con_cheques_cartera(p_proveedor_id, p_unidad_negocio_id, p_cheque_ids, p_fecha, p_aplicaciones) → uuid`, `pagar_proveedor_mixto(…) → jsonb`, `registrar_pago_proveedor(…) → uuid`, `datos_orden_pago` (no dice si la orden está anulada).
- Policies: `gastos` SELECT = propios o `gastos:ver_exportar`; `ordenes_pago` SELECT = `registrar_pago` o `ver_todo`; `aplicaciones_pago` y `creditos_proveedor` SELECT = `cuentas_corrientes:ver_todo`; `cobranza_cheques` = si ve la cobranza.
- `v_cuenta_corriente_movimientos` muestra un pago si tiene aplicaciones **o** un crédito con `origen_gasto_id` (el "hueco" del pago entero a cuenta que decía la memoria ya no existe).

## 4. Qué se verificó y contra qué

- `test-cuentas-corrientes-pago-proveedor-aplicar.js`: 162/162, ejecutando las funciones reales con una base falsa que repite la lógica de `aplicar_pago_a_facturas` y `anular_gasto`: la factura elegida viaja con un cheque de otra empresa (por la casilla y por el renglón), la pregunta sin factura y "Sí, dejarlo a cuenta", aplicar después un pago a cuenta deja la factura pagada y baja el crédito (releído), anular un pago con cheques deja los cheques en cartera, la factura pendiente, el crédito anulado y la orden "ANULADA" sin reimprimir, el error de la base tal cual, doble toque, permisos, marcas de XSS y el baseline fijo `e6e0c74` (ningún id ni data-* perdido).
- `mut-cuentas-corrientes-pago-proveedor-aplicar.js`: 92/92 detectadas (+1 equivalente: `esc(fechaOrden(o.fecha))`), de a una.
- `e2e/109-pago-proveedor-aplicar.spec.js`: 8 pruebas a 390 y 1280 px, sin scroll horizontal ni errores de JS (las rpc que cambian datos se simulan con un getter en `__maqueta.rpc` que cambia `__maquetaTablas`). También pasan 49, 51, 64, 7, 74, 75, 76, 88 y 33 (los de la pantalla).
- `npm run pruebas` y `node pruebas/check-scripts.js` en verde (números en el commit).

## 5. Permisos

No hay tareas nuevas. Se usan las que ya existen: `cuentas_corrientes:registrar_pago` (con bypass de super_admin, `tieneTarea`) para "Aplicar a facturas" y "Hacer el pago de nuevo", y para anular, lo mismo que pide `anular_gasto`: el pago propio, o `gastos:editar_anular` (con bypass). Ninguna RPC cambió de firma (la pantalla solo llama a funciones que ya existían).

## 6. Para el chat de la base (no se hizo nada; son observaciones)

1. `aplicar_pago_a_facturas` no controla la moneda de la factura contra la del pago (un crédito en pesos se podría aplicar a una factura en dólares desde otra pantalla).
2. `ordenes_pago` no tiene estado y `datos_orden_pago` no dice si la orden está anulada: la pantalla lo deduce de `gastos`, que sin `gastos:ver_exportar` solo deja leer los propios. Un `anulada` en `datos_orden_pago` o en una vista resolvería que todos lo vean.
3. `anular_gasto` con efectivo o transferencia y `cuenta_id` nulo: `fn_sincronizar_caja_gasto` regenera el egreso con la cuenta favorita y `anular_gasto` no inserta la devolución (solo con cuenta). Los pagos de Cuentas corrientes siempre llevan cuenta, así que hoy no pasa desde acá.

## Aprendizaje para aprendizajes.md

**Una lista que se tilda tiene que tildar igual que la de al lado** (30/10/2026, caso BADIC). En "Registrar pago" la lista de cheques tildaba tocando el renglón y la de facturas, justo arriba, solo con el cuadradito: la persona tildó los cheques como siempre, "eligió" la factura igual y el pago salió entero a cuenta sin que nada lo dijera. Arreglo: el renglón entero tilda en las dos y, cuando algo importante queda sin elegir (ninguna factura), se pregunta antes de mandar. Para encontrarlo sirvió el registro de la API (edge_logs): muestra qué llamó el navegador y cuándo, sin los parámetros.

## Decidido sin consultar

- "ANULADA EN PARTE" para la orden de un pago mixto con uno de sus dos pagos anulado, también sin reimprimir (la hoja impresa ya no diría la verdad).
- La vista previa va como lista (una línea por cosa) y no en un solo renglón con " · ", para que se lea en el celular.
- "Aplicar a facturas" filtra por la moneda del pago aunque la base no lo controle.
- El panel de acciones del detalle no aparece en la ventana "Ampliar" (es una vista; las acciones están en el modal).

## Lo que no se pudo probar

- Contra la base real: las dos funciones se probaron con su lógica repetida en la base falsa y en la maqueta, no con la base (solo lectura).
- Un usuario sin `gastos:ver_exportar` mirando la orden anulada de otro (por RLS no la ve anulada; está cubierto por la regla "no se afirma lo que no se leyó").
- Varias pruebas de navegador de OTRAS pantallas (Administración, el tablero, Empleados, Gastos en "Ampliar", la barra de abajo) fallan igual en `e6e0c74` limpio en esta máquina: no son de esta rama.

## Qué automatizaría ahora

Simular en la maqueta una rpc que CAMBIA datos (aplicar, anular, pagar) hoy se arma a mano en cada spec con un getter en `__maqueta.rpc`. Propuesta: que `e2e/maqueta/supabase-falso.js` acepte `globalThis.__maqueta.efectos.<rpc> = (params, tablas) => respuesta` (una función que recibe los parámetros y las tablas), así cada spec escribe solo el efecto. Ahorra ~30 líneas por spec y deja probar con los parámetros reales (el getter no los ve).
