# Traspaso — Cuentas corrientes: la cuenta del proveedor en una sola lista; la orden de pago en una hoja con el saldo (30/10/2026, rama `ci-prueba/cc-proveedor-una-lista`)

Para el chat de arquitectura. Quien lo recibe no vio el trabajo.

## El pedido (Facu, 30/10/2026; pegarlo en `.claude/pedidos/2026-10-30-cc-proveedor-una-lista.md`)
> 1) CUENTA DEL PROVEEDOR EN UNA SOLA LISTA
> - La base ahora devuelve TODOS los pagos en v_cuenta_corriente_movimientos (también los que no se aplicaron a ninguna factura) y los saldos a favor del corte inicial, y el saldo_acumulado ya da bien.
> - Sacá el recuadro aparte "Órdenes de pago (N)" de abajo. La orden de pago se ve en el renglón del pago dentro de la lista (con "Reimprimir" en ese renglón, si existe la orden de pago del gasto: gastos.orden_pago_id → ordenes_pago.numero, ej. N-OP-00001).
> - Que facturas, notas de débito, pagos y créditos queden mezclados por fecha: los que suman (facturas, ND) en un color y los que restan (pagos, créditos) en otro, con el saldo corrido en cada renglón.
> - El filtro "Pagos" tiene que mostrar también los pagos sin aplicar.
> 2) NOTA DE DÉBITO: UNA SOLA HOJA
> - Al imprimir una nota de débito (emitida o recibida), sale UNA hoja, sin "ORIGINAL"/"DUPLICADO". Si hacen falta dos, se imprime dos veces. Revisá si la orden de pago u otro comprobante hacen lo mismo y sacalo también.
> 3) ORDEN DE PAGO: abajo de todo, en lugar del "Resumen de cuenta" con dos renglones, va UNA sola línea: "Saldo de la cuenta con <PROVEEDOR> (a pagar) $ X" o "Saldo de la cuenta a favor de <EMPRESA> $ X", con el neto (deuda_pendiente − credito_disponible de v_saldo_proveedor). Nada de "aplicado / no aplicado".
> PRUEBAS: proveedor con un pago sin aplicar: aparece en la lista y resta; sin recuadro de órdenes de pago abajo; ND imprime una sola hoja; orden de pago con una sola línea de saldo.

## Qué cambió y por qué (solo `modulos/cuentas-corrientes.html`, más pruebas, maqueta y doc)
- **La lista de la ficha.** Ya era una sola, mezclada por fecha, con lo que suma en tinta (facturas, ND, interés) y lo que resta en verde (pagos, créditos). Con la vista nueva entran solos los pagos sin aplicar (una fila por gasto) y el saldo a favor del corte. Cambios: el **saldo corrido en CADA renglón** (antes se escondía cuando daba cero; ahora "Saldo $ 0,00"; en "todas las unidades" sigue oculto porque cada empresa tiene su propio corrido); el saldo a favor del corte inicial dice **"Saldo a favor"** (en la lista y en el resumen descargable); el filtro "Pagos" ya incluía `pago` + `credito_aplicado` y ahora trae también los sin aplicar.
- **Se fue el recuadro "Órdenes de pago (N)"** (`#ficha-ordenes-pago`, `cargarFichaOrdenesPago`, `htmlOrdenesPagoFicha`, `renderizarFichaOrdenesPago`, su CSS y su listener). En su lugar `cargarOrdenesDePagos(filas)` (corre con los movimientos: `gastos.orden_pago_id` de los pagos en tandas de 200 y después `ordenes_pago` por id; solo con `cuentas_corrientes:registrar_pago` o `ver_todo`, que es lo que pide la policy; si falla, no se inventa nada) y el renglón del pago dice **"Orden de pago N-OP-00005"** con **"Reimprimir"** (`data-reimprimir-orden`).
- **La orden de pago en UNA hoja**: se fueron `COPIAS_ORDEN_PAGO`, las clases `.op-copia*` / `.op-cab__copia`, el aviso `#nota-copias-orden` y el salto de página. Si hacen falta dos, se imprime dos veces.
- **La línea del saldo**, abajo de todo (después de las firmas, antes de "Generada por"): `leerSaldoOrdenPago(ordenId)` lee `ordenes_pago` (proveedor y empresa) y `v_saldo_proveedor` en esa empresa y en pesos; `lineaSaldoOrdenPago` hace el neto en centavos: "Saldo de la cuenta con <PROVEEDOR> (a pagar) $ X", "Saldo de la cuenta a favor de <EMPRESA> $ X" o, en cero, "Saldo de la cuenta con <PROVEEDOR> $ 0,00". Sin poder leer el saldo, la línea no va (nunca un $ 0,00 inventado).

## Lo que NO se hizo (y por qué)
- **La nota de débito impresa** vive en `modulos/administracion.html` (`htmlNotaDebito`, `COPIAS_NOTA_DEBITO = ['ORIGINAL', 'DUPLICADO']` línea ~7253, el aviso `#ad-nd-nota-copias` línea ~1500, `imprimirNotaDebito` / `pdfNotaDebito` ~7616-7660). Por instrucción del coordinador no se tocó: la hace él en esta misma rama. La ND recibida de un proveedor no se imprime en Cuentas corrientes (solo "Ver PDF" del archivo subido).
- **El remito de retiros** (`js/retiros-comun.js`, `COPIAS_IMPRESION` / `COPIAS_PDF`: original arriba y duplicado abajo en la misma hoja) se dejó como está, por instrucción del coordinador.
- **"Resumen de cuenta con dos renglones"** en la orden de pago: no existe ni en `main` ni en la historia del repo (`git log --all -S"Resumen de cuenta"` solo da el resumen descargable de cuenta) ni en `datos_orden_pago`. Se agregó la línea nueva abajo de todo. **Pregunta para Facu:** ¿lo que veía era "Saldo a favor del proveedor: $ X" (lo que sobró de ESE pago)? Ese renglón sigue estando. Si es eso lo que hay que reemplazar, es una línea de código.

## Qué se verificó y contra qué (todo SELECT, 30/10/2026; nada se escribió en la base)
- `pg_get_viewdef('v_cuenta_corriente_movimientos')`: pagos = una fila por gasto no anulado con aplicaciones o con crédito (`−g.importe`, `referencia 'Pago a proveedor'`); créditos aplicados solo los que no vienen de un pago (`origen_gasto_id IS NULL`) y de nota de crédito; el corte inicial (`origen_gasto_id` y `origen_tipo` null, no anulado) como `credito_aplicado` con `referencia 'Saldo a favor (corte inicial)'`; `saldo_acumulado` por proveedor + empresa + moneda.
- `pg_get_viewdef('v_saldo_proveedor')`: deuda = saldo de facturas pendiente/parcial; crédito = `monto_disponible` disponible.
- `information_schema`: `gastos.orden_pago_id` (uuid); `ordenes_pago` (id, unidad_negocio_id, numero, proveedor_id, fecha, total…).
- `pg_get_functiondef('datos_orden_pago(uuid)')`: no trae saldo de cuenta ni "resumen"; por eso la línea se lee aparte.
- Suites: `test-cuentas-corrientes-proveedor-una-lista.js` 50/50, `mut-…` 28/28. Ajustadas y en verde: `test-modulos-esqueleto-parejo.js` (el `#ficha-ordenes-pago` que se fue, en su lista de cambiados a propósito), `-orden-pago-copias` (una hoja; mut 19/19), `-pago-mixto` (la orden de cada pago), `-xss` (mut 116/116), `-barra-unidad` (mut 44/44), `-nota-debito-pdf` (mut 20/20) y las que arman la lista (`-comisiones`, `-nota-debito`, `-proveedores`, `-saldo-inicial`: suman `cargarOrdenesDePagos`). `check-scripts` OK, `test-anclas-mutaciones` 246/246. `e2e/107-cc-proveedor-una-lista.spec.js` 2/2 (390 y 1280, con el PDF de UNA página), `e2e/88-orden-pago-copias.spec.js` 5/5 (una hoja; PDF de una página también con 25 comprobantes) y `e2e/49-pago-mixto.spec.js` 14/14.
- `mut-cuentas-corrientes-pago-mixto.js` sigue sin poder correr entero por un ancla que ya era ambigua en `main` (`'las cuentas sin centavos'`, en la lista YA_ROTAS); no es de este cambio.

## Qué tocar en la documentación
- `docs/memoria/cuentas-corrientes.md`: YA tiene la sección "LA CUENTA DEL PROVEEDOR EN UNA SOLA LISTA; LA ORDEN DE PAGO EN UNA HOJA CON EL SALDO (30/10/2026…)" debajo de "LA ORDEN DE PAGO: ORIGINAL Y DUPLICADO" (en el medio del archivo). Revisarla al integrar; cuando se haga la ND de Administración, sumar ahí o en `administracion.md` que también sale en una hoja.
- `CLAUDE.md`: nada.
- Para el chat de permisos: nada (sin tareas nuevas ni RPCs cambiadas).

## Decidido sin consultar
- El saldo corrido en cero se muestra ("Saldo $ 0,00"); en "todas las unidades" sigue oculto.
- La línea del saldo usa la razón social de la empresa (la misma de la cabecera); sin razón social, el nombre de la empresa. Es el saldo de hoy, no el del día de la orden.
- "Saldo a favor del proveedor" (sobrante de ese pago) se dejó.
- El texto "Saldo a favor" para el corte inicial (en vez de "Crédito aplicado").

## Qué automatizaría ahora
Sacar las dos copias tocó 9 suites y 3 specs que tenían `htmlOrdenPago`, `cargarFichaMovimientos` o la lista de funciones del sandbox escrita a mano. Un `pruebas/cc-comun.js` con las listas de funciones por pantalla (la ficha, la orden de pago, el detalle del pago), como ya hace `cuenta-unica-comun.js`, haría que un cambio así toque UNA lista en vez de nueve.
