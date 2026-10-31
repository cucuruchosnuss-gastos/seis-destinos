# Traspaso — arreglos de la auditoría del 30/10 (31/10/2026, rama `ci-prueba/arreglos-auditoria-30-10`)

Para el chat de arquitectura. Sale de `main` = 1c20f98 (las 12 ramas del 30/10 integradas esa noche). Pedido textual:
`.claude/pedidos/2026-10-31-arreglos-auditoria-30-10.md`. Lo hicieron cinco ayudantes en paralelo, cada uno en una rama
local (`arreglos-30-10/p16`, `p25`, `p35`, `p4`, `p7`, más `anclas`), unidas acá con `--no-ff` sin choques. Las
firmas de la base se confirmaron el 30/10/2026 antes de codificar (todas existen y coinciden con el pedido).

| Punto | Commit | e2e | Detalle |
|---|---|---|---|
| 1 y 6 (Valorizar, condición de venta) | 0f97d5c | 112 | abajo |
| 2 y 5b (cuenta del cliente: N1/N2 y aplicar lo que ya tenía) | eb8c45d | 113 | abajo |
| 3 y 5a (Cobranzas), más el error de tiempos de "A qué se aplica" | 7eda58a, 745e27a | 114 | `.claude/traspasos/2026-10-31-cobranzas-p35.md` |
| 4 (detalle del pago) | 4f64e75 | 115 | `.claude/traspasos/2026-10-31-cuentas-corrientes-p4.md` |
| 7 (Entre empresas: "Poner precio") | 8b0dd73 | 116 | abajo |

## Puntos 1 y 6 (modulos/administracion.html)
- Leído en la base el 31/10: `valorizar_con_condiciones` guarda las condiciones mandadas tal cual (una lista vacía BORRA las de la orden); `valorizar_orden_retiro` descuenta aunque la condición esté desactivada; `condiciones_especiales_cliente` acepta `p_solo_activas` false; `precio_lista` se guarda con 2 decimales.
- 1a: si falla la lectura de las condiciones (o una previa del mismo paso) y la orden ya tenía condiciones, aviso "No se pudieron leer las condiciones especiales; reintentá", Guardar apagado (y no llama a la base) y "Volver a leer las condiciones" sin perder los precios escritos. Si la orden no tenía ninguna, se guarda como antes.
- 1b: con `precio_lista` no se usa el subtotal descontado: el bulto de 17.500 queda en 17.500,00.
- 1c: una condición que la orden tenía y hoy está desactivada sale tildada con "(desactivada)" y aviso naranja; si queda tildada se manda y se descuenta.
- 6: al abrir facturar se lee `clientes.pct_parte_a` del cliente en ese momento (aviso, tilde y % inicial salen de ahí; la lista del celular se actualiza). Si la lectura falla: ni aviso ni tilde, y "No se pudo leer la condición de venta del cliente…". Al salir de la ficha (o abrir otra) primero se guarda la condición; si falla, se queda en la ficha con el error.
- Decidido sin consultar: en 1a se bloquea en vez de reenviar las condiciones viejas (reenviarlas sin verlas mostraría precios sin descuento y la base guardaría otros); en 6, si falla la lectura el % inicial sigue saliendo de la lista del celular; el mensaje de arriba conserva su texto de antes.
- No probado: "atrás" del navegador con un guardado que falla; cambiar de fábrica con la condición sin guardar.
- Pruebas: `test-administracion-arreglos-valorizar-condicion.js` 65/65 (rojo sobre 1c20f98), mutaciones 31/31 (+2 equivalentes), e2e/112 10/10.

## Puntos 2 y 5b (modulos/administracion.html, la cuenta del cliente)
- 2: el desplegable de Cuentas corrientes copiado con nombres `…Ad` (`decorarVentasAd`, `htmlDivisionVentaAd`, `infoDivisionAd`, …, CSS `.ad-fila-venta`, `.ad-n1n2*`): tocar la fila Venta de la cuenta de cliente y proveedor despliega N1 (con la comisión y cuánto es), N2 y el total, de `datos_division_orden`, leída una vez por orden. Sin división: el total y "Sin división N1/N2"; sin `retiros:precios` o rechazo de permiso: solo el total. Se ve igual en CC → Clientes (iframe). `js/cuenta-unica.js` no cambió.
- 5b: `aplicaciones_credito_cliente` reemplaza al "hueco de la base": cualquier crédito con algo libre ofrece "Aplicar"; se lee lo anterior (también en las cobranzas, en lugar de `recibo_cobranza`), se suma lo nuevo por doc, parte y medio y va todo junto a `aplicar_credito_cliente`. Si la lectura falla o no suma lo que la cuenta da como aplicado, no se aplica y se dice por qué.
- Decidido sin consultar: "Ver la orden ›" de una Venta pasa adentro del desplegable (tocar la fila ahora despliega); al reenviar lo anterior va `efectivo`, no `monto` (lo que la base cuenta como aplicado); el desplegable está en la cuenta de cliente y proveedor (la "cuenta única" del pedido), NO en la cuenta común de un cliente sin proveedor vinculado (la mayoría): si Facu lo quiere ahí, es otro cambio.
- Quedó sin uso el CSS `.ad-pend__hueco`.
- Pruebas: `test-administracion-arreglos-cuenta-cliente.js` 75/75 (rojo sobre 1c20f98), mutaciones 51/51 (+2), e2e/113 9/9; ajustados `test-/mut-administracion-aplicar-cobranzas.js`, e2e 110 y 40.

## Punto 7 (modulos/administracion.html, Entre empresas)
- Leído en la base: las filas `'traspaso_terminado_precio'` salen de `movimientos_entre_unidades` con `referencia_id = traspaso_id` (el movimiento, sin decir de qué tipo); `valorizado.fecha` es la fecha del movimiento; `valorizar_…` reemplaza el precio anterior.
- a) "Mercadería sin valorizar" junta mercadería e insumos sin precio, un renglón por movimiento (título, fecha, entrega → recibe, hasta 4 líneas de detalle). Arreglado de paso: los insumos ya valorizados seguían contando "sin valor" en la tarjeta del saldo.
- b) Órdenes de retiro: igual que antes.
- c) "Poner precio" (solo `gastos:gastos_empresa`): la ventana con `movimiento_para_valorizar` (entrega → recibe, fecha, lista interna; precio por caja con 2 decimales o por unidad de medida con 4, precargado con el sugerido y su fuente, naranja si no hay; subtotal, total en vivo, concepto). Guardar manda todos los renglones (el vacío como null) y muestra "Faltan precios: …" tal cual; al guardar relee saldo y lista. Valorizado: "Valorizado en $ X el dd/mm" y "Cambiar precio".
- d) La fila de una valorización dice "Valorización" con "Cambiar precio": el tipo sale de la fila de mercadería/insumos del mismo movimiento, o se prueba traspaso → ingreso → transferencia (corta ante un error que no sea "No encontré…").
- e) El ajuste frena importe <= 0 ("El importe tiene que ser mayor que cero.").
- Decidido sin consultar: la fecha de "Valorizado … el" es la del movimiento (la base no guarda el día del precio); el bloque dice "entrega → recibe"; detalle de hasta 4 renglones; insumos con 4 decimales.
- No probado contra la base real: que probar los tres tipos dependa de que la base conteste "No encontré…" ante el tipo equivocado (así dice su código).
- Pruebas: `test-administracion-arreglos-entre-empresas.js` 138/138 (rojo sobre 1c20f98), mutaciones 61/61 (+1), e2e/116 y 111, 36, 62 en verde.

## Otros
- La memoria de Cuentas corrientes quedó al día con el punto 4 (el aviso de los cheques y la plata que vuelve a la caja) y la sección del punto 4 va debajo de "Anular un pago" (así se une sin chocar con `ci-prueba/orden-pago-a4`).
- `arreglos-30-10/anclas`: tres suites de mutaciones de Administración (`corregir-orden`, `valorizar-con-division`, `link-remitos`) tenían anclas que ya no existían desde la integración del 30/10 (`test-anclas-mutaciones` saltea las de baseline fijo); quedaron al día.
- Nada se probó contra la base real (es solo lectura; hoy no hay clientes con corte). No se tocó produccion.html.

## Para el chat de la base
- La marca "Van impresas" de la orden de pago no existe como casilla (ver el traspaso de `ci-prueba/orden-pago-a4`).
- `agregar_cheques_a_pago` arma su descripción sin mirar el estado del cheque (las otras funciones usan coalesce + 'endosado').
- `valorizado.fecha` es la del movimiento: si se quiere "valorizado el dd/mm" con el día real, hace falta guardarlo.

## Qué automatizaría ahora
- **Puertos de las e2e**: `e2e/playwright.config.js` reusa cualquier servidor en el 4180; con varios ayudantes a la vez las e2e corrieron contra archivos de otro y fallaron de forma rara (lo vieron tres ayudantes). Que tome un puerto libre solo (o uno según la carpeta del worktree).
- **`test-anclas-mutaciones` con las de baseline fijo**: hoy las saltea y por eso tres suites quedaron con anclas rotas sin aviso; que también las corra con `MUT_SOLO_ANCLAS=1`.
- **Copias entre módulos que se separan** (el desplegable N1/N2 en CC y en Administración, el selector de Cobranzas y el de Administración): una prueba que compare los cuerpos de las dos familias de funciones cambiando el sufijo y dé rojo si una cambia sin la otra.
