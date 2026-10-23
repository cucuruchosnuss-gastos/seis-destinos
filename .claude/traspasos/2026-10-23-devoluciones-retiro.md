# Traspaso — Devoluciones y reposiciones en la orden de retiro (23/10/2026)

Rama `ci-prueba/devoluciones-retiro` (desde `origin/main` `df19453`). **NO se integra**: queda pusheada para auditoría.

## Qué se hizo
- **Carga** (`modulos/retiros.html`): botón "↩ Devolución de mercadería". El renglón pide producto (solo producto terminado, también lo sin stock), cajas, motivo (chips Rotura / Humedad / Vencido / Error de pedido / Otro + detalle; 3 letras o más), lote que trae (opcional, 40), dos botones grandes "Se descuenta de la orden" (tipo `devolucion`, no saca stock) / "Se reponen" (tipo `reposicion`, pide lotes como un retiro) y "Las cajas devueltas: Se descartan / Vuelven al stock". En la orden armada, el resumen y Mis retiros: sección "Devoluciones · N", la devolución con "−". Se puede confirmar una orden con solo devoluciones.
- **Hoja impresa** (`js/retiros-comun.js`): sección DEVOLUCIONES (el título va adentro de la primera fila: `planHoja`/`medirHoja` y los tamaños NO se tocaron), "−2", el motivo debajo, el lote que trajo, "Se repone · $ 0,00" con precios, "TOTAL DE CAJAS · devueltas N", "a favor del cliente" con total negativo. El texto para compartir también.
- **Administración**: la lista (cajas sin la devolución, "devolvió N", "a favor del cliente"), el detalle (sección, sellos Devolución / Reposición, lotes por renglón con `orden_retiro_item_id`), valorizar (devolución con precio editable y subtotal negativo; reposición en $ 0 sin campo; total "a favor del cliente"), la hoja con precios y **Dividir para facturar con cant ≠ 0** (la devolución en negativo, la reposición en $ 0).
- **Producción → Stock terminado** (`modulos/produccion-gestion.html`, "Lo que salió por retiros"): la entrada `devolucion` se lista como "Devolución de cliente · retiro N-…" ("entraron N cajas", con el motivo) y anular una devolución dice "salieron". Etiqueta `devolucion: 'Devolución de cliente'` en `NOMBRE_TIPO_STOCK_TERMINADO`.
- **Tablero** (`js/tablero.js`): "Cajas despachadas hoy" no cuenta las devoluciones (sí la reposición).
- Anclas de mutaciones viejas actualizadas: `mut-retiros-hoja`, `mut-faltante-retiro`, `mut-produccion-stock-retiros`, `mut-administracion-{ordenes,comisiones,division-orden}`; sandboxes de retiros y Administración con las funciones nuevas; `seguras-retiros.js` con las interpolaciones nuevas.

## Lo decidido sin consultar
- **La carga NO muestra "$0"**: la reposición dice "Se repone · sin cargo". La pantalla del depósito no muestra plata (decisión de Facu del 26/09 y `test-retiros-carga.js` lo exige: ningún `$ N`). Con precios (Administración y la hoja impresa con precios) sí dice "$ 0,00". Si Facu quiere "$0" también en la carga es cambiar un texto y el test.
- **stock.html no se tocó**: en `main` stock.html no tiene un historial de movimientos de producto terminado con nombres de tipo (el producto terminado se ve en `produccion-gestion.html?vista=stock`, adonde stock.html manda). La etiqueta "Devolución de cliente" se puso donde vive ese nombre (`NOMBRE_TIPO_STOCK_TERMINADO` de produccion-gestion) y en "Lo que salió por retiros". Si la otra rama (la que rehace la vista de producto terminado en stock.html) arma un historial con tipos, tiene que sumar `devolucion: 'Devolución de cliente'`.
- El motivo que viaja: el chip, o "Chip: detalle" si se escribió detalle; "Otro" manda solo el texto. "3 letras" se cuenta con letras de verdad (`\p{L}`); la base cuenta caracteres (≥ 3), así que la pantalla es más estricta.
- Pasar un renglón de "Se reponen" a "Se descuenta" suelta los lotes repartidos.
- En la lista de Administración, "N cajas" de una orden = lo que salió (retiro + reposición).
- Los totales de la hoja: TOTAL DE CAJAS = lo que se lleva (retiro + reposición); "devueltas" = devolución + reposición (lo que trajo).

## Lo que no se pudo probar
- Nada contra la base real (solo lectura): todo en la maqueta y en el sandbox. No se cargó ninguna devolución de verdad.
- El PDF ("Enviar") con devoluciones no se generó en el navegador (usa la misma `htmlHoja` que la impresión, que sí se miró).

## Lo verificado en la base (23/10/2026, `pg_get_functiondef` / `pg_get_constraintdef` / `information_schema`)
- `orden_retiro_items`: `tipo` text default 'retiro', `motivo_devolucion`, `lote_devuelto`, `destino_devuelto`; CHECK `chk_ori_tipo`; `cajas > 0` siempre.
- `stock_terminado_movimientos`: tipo `devolucion` en el CHECK (`cajas > 0` y `orden_retiro_id` no null) y columna `orden_retiro_item_id`.
- `registrar_orden_retiro`, `valorizar_orden_retiro`, `anular_orden_retiro`, `datos_division_orden`, `mis_ordenes_retiro`: como dice el pedido (detalle en `docs/memoria/retiros.md`).

## Lugares que suman cajas o plata (grep `orden_retiro_items` / `subtotal`)
| Archivo:línea (aprox.) | Qué suma | Estado |
|---|---|---|
| `js/tablero.js` `cargarRetiros` (~615) | cajas despachadas hoy | arreglado |
| `modulos/administracion.html` `leerOrdenes` (~2733) | cajas de cada orden en la lista | arreglado |
| `administracion.html` `leerOrden` (~2834) + `lotesDeRenglon` | renglones y lotes del detalle | arreglado (tipo + lotes por renglón) |
| `administracion.html` `cantidadValorizable` / `subtotalValorizar` / `totalValorizar` | plata al valorizar | arreglado |
| `administracion.html` `htmlRenglonOrden` / `htmlComisionOrden` / `htmlFilaOrden` | subtotal y total mostrados | arreglado (signo y "a favor") |
| `administracion.html` `ordenParaHoja` | hoja con precios | arreglado |
| `administracion.html` `renglonesParte` | hoja dividida | arreglado (cant ≠ 0) |
| `administracion.html` (~10390) faltantes por revisar | solo ids | no aplica |
| `modulos/retiros.html` `totalCajasForm` / `textoTotalForm` / `cajasDeOrden` | cajas de la carga y de Mis retiros | arreglado |
| `js/retiros-comun.js` `totalCajasOrden` / `totalUnidadesOrden` / `htmlFilaHoja` | total de la hoja | arreglado |
| `modulos/produccion-gestion.html` `salidasPorRetiro` / `htmlRetirosStock` | salidas por retiros | arreglado |
| `modulos/stock.html` traspaso (lee `stock_terminado_movimientos` por lote) | saldo por lote | no aplica (una devolución al stock suma a su lote: correcto) |
| `js/faltante-retiro.js`, `modulos/accesos.html` | solo comentarios | no aplica |
| `caja.html`, `conos.html`, `stock.html` "subtotal" | otra cosa | no aplica |
| base: `cargar_comision_orden` | comisión en % = `round(total × p / 100)` | **pendiente de base**: con total negativo la comisión sale negativa (movimiento del cliente y factura de COMISIONES en negativo). Decidir si una orden a favor del cliente lleva comisión |
| base: `datos_division_orden` / `_comisiones_orden` | comisiones sobre `subtotal_a` | **pendiente de base (decisión)**: la A resta las devoluciones; con `subtotal_a` negativo las comisiones salen negativas |
| base: `retiros_por_revisar` | faltantes | **pendiente de base (menor)**: no dice si el renglón es una reposición |
| base: `clientes_con_saldo.retiros_mes` | cuenta órdenes | no aplica (cuenta también una de solo devoluciones; es un conteo, no una venta) |
| base: `cuenta_cliente` | importes | no aplica (la base ya guarda el total neto, "Orden de retiro N-…") |

## Qué automatizaría ahora
- **Las anclas de mutación que se rompen al tocar código ajeno**: 6 archivos `mut-*` tuvieron que actualizarse a mano porque un renglón cambió. Un script `pruebas/anclas-rama.js` que, para los archivos tocados en la rama, verifique que cada `de:` de cada `mut-*.js` siga existiendo exactamente una vez (sin correr las suites, en segundos) y diga qué mut cambiar. Hoy eso se descubre corriendo las mutaciones (15+ minutos).
- **Las listas de funciones de los sandbox** (`sandbox-retiros.js`, `sandbox-administracion.js`): cada función nueva hay que sumarla a mano o se rompen TODAS las suites del módulo con "NO EXISTE la función". Generarlas solas: extraer todos los `function x(` del módulo (como hace `rangosDeFunciones`) en vez de mantener la lista.
