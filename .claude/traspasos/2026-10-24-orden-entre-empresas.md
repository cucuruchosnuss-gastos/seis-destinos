# Traspaso — La orden a otra empresa del grupo (Tanda C, 24/10/2026)

Rama `ci-prueba/orden-entre-empresas`, salida de `origin/main` `d2d1dc1`. Tag de seguridad `antes-de-orden-entre-empresas-2026-10-24` (pusheado). **Sin integrar a main** (lo integra la sesión principal). Los hashes finales están al pie.

## Qué se hizo

La base (en producción desde el 24/10/2026, verificada hoy con `information_schema`, `pg_constraint` y `pg_get_functiondef`, solo lectura): `clientes.unidad_grupo_id` marca que el cliente ES otra empresa del grupo. Hoy hay uno: **"DOLCE PASTA SRL" de Nuss → Dolce Pasta**, con la lista "Nuss → Dolce Pasta (interna)" (`es_interna`, sin precios) y cero órdenes. `registrar_orden_retiro` hace entrar lo que sale en el stock de la otra (`_orden_grupo_espejar`), devuelve `entre_empresas: true` y no acepta devoluciones; `valorizar_orden_retiro` deja la deuda en `movimientos_entre_unidades.orden_retiro_id` y no en la cuenta del cliente; `anular_orden_retiro` revierte las dos cosas.

1. **La Carga** (`modulos/retiros.html`):
   - Con ese cliente, el sello "Entre empresas" y el aviso **"Entre empresas: lo que sale entra al stock de Dolce Pasta"** en la tarjeta del cliente, **arriba del catálogo en el celular** (en ese paso la tarjeta no se ve), en el resumen y en la orden confirmada ("lo que salió entra al stock de Dolce Pasta.").
   - **No se ofrece "↩ Devolución de mercadería"** (la reposición sale del mismo botón, así que tampoco). Si se cargó una devolución y después se cambió el cliente a Dolce Pasta, no deja confirmar y dice qué renglón sacar.
   - El nombre de la empresa sale de `unidades_negocio` (una sola vez; si falla, "otra empresa del grupo"). Lo que viaja a la base no cambió.
2. **Administración** (`modulos/administracion.html`):
   - Lista de órdenes y detalle: sello **"Entre empresas"**; el detalle dice "Es Dolce Pasta, otra empresa del grupo: lo que salió entró a su stock."
   - Valorizada: "Total" y **"Queda como deuda de Dolce Pasta con Cucuruchos Nuss (Entre empresas): no va a la cuenta corriente."** Al valorizar, el mismo aviso ("Al valorizar, queda como deuda de…") y el mensaje de éxito lo repite. Sin límite de crédito.
   - **Sin "Dividir para facturar", sin comisión, sin "Facturas de ARCA"**; el filtro "Con comisión sin cargar" no las cuenta.
   - Lista de clientes: sello "Empresa del grupo". **Ficha**: arriba, solo lectura, "Es la empresa Dolce Pasta del grupo. Sus órdenes no van a la cuenta corriente: quedan como deuda entre empresas, y no se dividen para facturar ni llevan comisión."
3. **Entre empresas** (la sección que ya existía): cada deuda de una orden dice **"Orden de retiro N-0042"** con el código como link; tocarlo cambia a la empresa de la orden y la abre (con la flecha de volver).
4. Docs: `docs/memoria/retiros.md` (la base y la Carga), `docs/memoria/administracion.md` (la pantalla) y un aprendizaje nuevo en `docs/memoria/aprendizajes.md` (la pantalla por pasos del celular escondía el aviso; lo encontró el e2e).

## Lo que suma ventas, comisiones o cuenta corriente (punto 3 del pedido)

| Lugar | Qué suma | ¿Se cambió? |
|---|---|---|
| `js/tablero.js:603` `cargarRetiros` | "Cajas despachadas hoy" y "Órdenes esta semana" (cajas y cantidad, sin plata) | **No** (decisión, ver abajo): son cajas que salieron del depósito, no ventas. |
| `js/tablero.js:626` `cargarAdministracion` | "Nos deben los clientes" (`clientes_con_saldo.saldo`) y "Cobrado en <mes>" (`cliente_movimientos` tipo cobranza) | No hace falta: salen de `cliente_movimientos`, que la base NO llena para estas órdenes. El cliente del grupo da saldo 0 y no entra en "los que más deben". |
| `js/barra-lateral.js:502` / `mis_pendientes()` (base) | `ordenes_sin_valorizar` (cuenta) y `clientes_sobre_limite` (de `cliente_movimientos`) | No hace falta: una orden entre empresas igual hay que valorizarla (es la deuda); el límite sale de la cuenta, que no se toca. |
| `modulos/administracion.html:2308` `contarSinValorizar` (portada) | cuántas órdenes faltan valorizar | No hace falta (misma razón). |
| `modulos/administracion.html:2752` `faltaComision` / `:2757` `ordenesComisionSinCargar` | sello y filtro "Con comisión sin cargar" | **Sí**: nunca para un cliente del grupo. |
| `modulos/administracion.html:2816` `puedeCargarComision` / `:2855` `htmlComisionOrden` | comisión de la orden (`cargar_comision_orden` → `cliente_movimientos` tipo comision + factura del proveedor COMISIONES) | **Sí**: no se ofrece; el detalle muestra la deuda entre empresas en su lugar. |
| `modulos/administracion.html:4137` `puedeDividir` / `:4114` `htmlFacturasOrden` | "Dividir para facturar" (`datos_division_orden`: partes A/B y comisiones de los 3 vendedores) y las facturas de ARCA | **Sí**: no se ofrece ni se muestra. |
| `modulos/administracion.html:2965` `leerOrdenes` / `htmlFilaOrden` | el total de cada fila | **Sí** (el sello "Entre empresas"); el total se sigue mostrando: es el valor de la deuda. |
| `modulos/administracion.html:3535` `abrirValorizar` / `:3730` `guardarValorizacion` / `:3480` `leerSaldoCliente` | saldo proyectado y aviso de límite de crédito | **Sí**: sin límite (`v.limite` null) y sin el aviso aunque la base diga `supera_limite`. |
| `modulos/administracion.html:4482` `leerSaldos`, `:4595` `leerApagados`, `:4660` `leerApagadosTodas`, `:4713` `leerOtrasCuentas` (`clientes_con_saldo`) | saldo por cliente y "N retiros este mes" | El saldo no hace falta (de `cliente_movimientos`). `retiros_mes` **cuenta** las órdenes al grupo: es una cuenta de retiros, no plata; si Facu no la quiere ahí, se cambia en la base (pendiente abajo). |
| `modulos/administracion.html:5522` `leerCuenta` (`cuenta_cliente`) y la cuenta de cliente y proveedor (`cuenta_unificada`) | la cuenta corriente | No hace falta: salen de `cliente_movimientos`. |
| `modulos/administracion.html:6951` `cargarComisiones` | la configuración de % de los 3 vendedores | No hace falta: no suma órdenes. |
| `modulos/cuentas-corrientes.html:5605` `cargarCodigosComision` | el código de la orden de cada factura de comisión | No hace falta: estas órdenes no tienen comisión. |
| `modulos/cobranzas.html:3864` / `js/tablero.js:400` `resumen_cobranzas` | cobranzas | No hace falta: no toca órdenes. |
| `modulos/produccion-gestion.html:9742` salidas por retiro de un lote | trazabilidad (despacho / ajuste / devolución) | No hace falta: la entrada en Dolce (`traspaso_entrada`) no se lista como salida. |
| `modulos/stock.html:8440` | el rótulo de `traspaso_entrada` | Ya dice "Vino de otra fábrica". |

No hay ningún reporte de "ventas" en el repo (se buscó `ventas`, `vendido`, `facturado`, `ranking`).

## Decidido sin consultar

- **"Cajas despachadas hoy" del tablero sigue contando las órdenes a Dolce Pasta**: es lo que salió físicamente del depósito, no una venta. Si Facu lo quiere sin ellas, es un filtro por cliente en `cargarRetiros` (hay que leer `clientes.unidad_grupo_id`).
- **El total se sigue mostrando** en la lista y el detalle de una orden entre empresas (es el valor de la deuda), pero nunca con comisión ni "a cuenta corriente".
- **"Facturas de ARCA" se esconde** junto con "Dividir para facturar" (sin división no hay dónde cargar el número). Nuss (SEIS DESTINOS SAS) y Dolce Pasta (DOLCE PASTA SRL) son razones sociales distintas: si entre ellas se factura, hace falta decidir dónde se carga.
- El aviso de la Carga también aparece **arriba del catálogo en el celular** (no estaba pedido; sin eso, mientras se elige el producto no se veía).
- El link de Entre empresas **cambia la empresa elegida** de Administración a la de la orden (como si se eligiera arriba).
- En Entre empresas, si no se puede leer `movimientos_entre_unidades` (solo la leen super_admin y `taller:precios`), la orden se busca **por el código que trae el concepto** ("Orden de retiro N-0042").
- Sellos neutros (gris con borde) en Administración: "Entre empresas" es un dato, no algo que se toca (la regla del naranja).

## Lo que no se pudo probar

- **Nada contra la base real** (solo lectura): ni una orden real a Dolce Pasta, ni que entre al stock de Dolce, ni la deuda en Entre empresas. Hoy hay cero órdenes a ese cliente.
- La lista interna no tiene precios: valorizar una orden real va a fallar con "Faltan precios en N renglón(es)…" (la pantalla lo muestra tal cual) hasta que se carguen en Listas de precios.
- Mirado en la maqueta (sin sesión real) a 390, 360, tablet (768) y 1280 px con `e2e/62` (capturas en `e2e/resultados/capturas`): sin scroll de costado ni errores de JavaScript. La hoja impresa no cambió (no se miró aparte).
- El link de Entre empresas con un usuario que NO es super_admin (por el código del concepto) está probado solo en la suite unitaria.

## Pendiente para el chat de la base

1. **`movimientos_entre_empresas()` no devuelve `orden_retiro_id`**: la pantalla lo lee de la tabla (solo super_admin / `taller:precios`) o lo saca del texto del concepto. Sumar `orden_retiro_id` (o `referencia_tipo = 'orden_retiro'`) a las filas `otro`.
2. **La mercadería de una orden entre empresas no aparece en `movimientos_entre_empresas()` hasta que se valoriza** (la rama `mercaderia` solo mira `traspaso_id` e `ingreso_externo`; el despacho y el `traspaso_entrada` de la orden no tienen `traspaso_id`). Antes de valorizar, Entre empresas no la muestra.
3. **`datos_division_orden`, `guardar_division_orden`, `guardar_factura_orden` y `cargar_comision_orden` no rechazan una orden a un cliente con `unidad_grupo_id`**: la pantalla no las ofrece, pero la base debería frenarlas (una comisión le escribiría `cliente_movimientos` al cliente del grupo).
4. **`registrar_orden_retiro` no dice qué no entró** en la otra empresa (`_orden_grupo_espejar` devuelve `productos_sin_presentacion`, pero se descarta con `perform`): si Dolce no tiene la misma presentación, sale de Nuss y no entra a Dolce sin aviso. Devolverlo para mostrarlo en la orden confirmada.
5. **`valorizar_orden_retiro`** para estos clientes devuelve `saldo_cliente` / `limite_credito` / `supera_limite` del cliente (sin sentido acá; la pantalla los ignora). Podría devolver el saldo entre las dos empresas.
6. **`buscar_clientes` y `mis_ordenes_retiro` no traen `unidad_grupo_id`** (Mis retiros no marca "Entre empresas"; la Carga lo saca de la tabla `clientes`).
7. `clientes_con_saldo.retiros_mes` cuenta las órdenes al grupo (decidir si va).

## Pruebas (números)

- `test-retiros-entre-empresas.js` **42/42**; `mut-retiros-entre-empresas.js` **25/25** (baseline fijo `d2d1dc1`: la suite da rojo sobre la carga de antes).
- `test-administracion-orden-entre-empresas.js` **85/85**; `mut-administracion-orden-entre-empresas.js` **42/42** (baseline `d2d1dc1`).
- `e2e/62-orden-entre-empresas.spec.js` **12/12** (390, 360, tablet, 1280; puertos propios 4192/4193).
- Las de siempre al día: `sandbox-retiros.js`, `sandbox-administracion.js` (funciones nuevas), `seguras-administracion.js` (3 interpolaciones con motivo); `test-clientes-apagados.js` (el SELECT de la ficha suma `unidad_grupo_id`).
- Mutaciones de antes cuyas anclas tocó el cambio, corridas de a una y en verde: `mut-administracion-division-orden` 96/96, `mut-administracion-comisiones` 40/40, `mut-administracion-ordenes` 82/82 (+1 equivalencia: el total de la valorizada entre empresas), `mut-retiros-carga` 118/118 (+2 equivalencias: el aviso, que lo prueba la suite nueva con marcas), `mut-administracion-entre-empresas` 76/76, `mut-clientes-apagados` 42/42, `mut-clientes-provisorios` 58/58, `mut-resumen-cuenta` 56/56, `mut-retiros-devoluciones` 68/68.
- **Ojo, NO es de esta rama:** `mut-administracion-clientes.js` da **48/50** por dos `esc()` de `htmlCuenta` (`esc(orden)` y `esc(nota.id)`, del botón de la nota de débito de la Tanda B) que su suite no detecta; esta rama no toca esas líneas. Queda para quien siga la nota de débito (una equivalencia justificada o una aserción con marca).
- `npm run pruebas` sobre main 1b0e136 + la rama: **295/295 en verde**. GitHub: ver al pie.

## Hashes de la rama

`7901114` (la carga y Administración), `224a711` (aviso en el catálogo, maqueta y e2e/62), `32775b4` (docs, traspaso y suites de antes al día), `9ab7f49` (dos anclas de mutación), `3d73bb1` (trae main `1b0e136`: un solo choque, en `aprendizajes.md`, quedaron los dos lados). El último commit de la rama es este traspaso con los números finales; GitHub (Pruebas y Navegador) se esperó en ese commit.

## Qué automatizaría ahora

- **El e2e de un aviso en una pantalla por pasos**: lo más caro de esta parte fue descubrir que en el celular el paso del catálogo esconde la tarjeta del cliente (la suite unitaria estaba verde). Un helper en `e2e/ayuda.js` — `visibleEnCadaPaso(page, selector, pasos)` — que recorra los pasos de la Carga (`data-paso` cliente → productos → orden) a 390 px y diga en cuáles se ve un elemento, haría ese chequeo de una línea para cualquier cosa nueva de la Carga.
- **La lista de "lugares que suman" del punto 3** se armó a mano con `grep`. Un script `pruebas/lugares-que-suman.js` que liste cada lectura de `ordenes_retiro` / `orden_retiro_items` / `cliente_movimientos` y cada RPC de saldos o comisiones (archivo:línea y función) la daría en segundos la próxima vez que cambie qué cuenta como venta.
