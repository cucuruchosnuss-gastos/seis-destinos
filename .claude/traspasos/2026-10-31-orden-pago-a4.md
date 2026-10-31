# Traspaso: la orden de pago A4 (31/10/2026, rama `ci-prueba/orden-pago-a4`)

Para el chat de arquitectura (dueño de CLAUDE.md y del índice de `docs/memoria/`). Quien lo lea no vio el trabajo: está todo acá.

## El pedido de Facu (textual)

> Rama aparte ci-prueba/orden-pago-a4 (worktree propio, candado, spec:numero). Es la ORDEN DE PAGO A4 que no entró en detalle-pago-cheques:
> - UNA sola hoja A4, sin ORIGINAL ni DUPLICADO.
> - Arriba: empresa (logo, razón social, CUIT, domicilio), número y fecha; proveedor (razón social, CUIT, domicilio).
> - Columna "Con qué se pagó":
>   - Cheques en tabla compacta (banco, número, fecha de pago, importe) SIN librador, SIN cliente y SIN "entregado por". El proveedor no tiene que ver de qué cliente vino el cheque.
>   - Bloque "Transferencias" (cuenta e importe) y bloque "Efectivo", cada uno con su subtotal.
> - Columna "Facturas que cancela": tipo y número, fecha, importe de la factura, lo aplicado en este pago y lo que le queda. Si la factura ya tenía créditos o pagos anteriores, un subrenglón chico que lo diga.
> - Totales en dos cajas A LA MISMA ALTURA: a la izquierda los subtotales por medio + TOTAL PAGADO; a la derecha TOTAL FACTURAS.
> - Una franja con la diferencia: "Queda saldo pendiente $ X", "Queda a favor de [empresa] $ X" o "Facturas canceladas".
> - UNA sola línea "Saldo de la cuenta: $ X" (deuda_pendiente − credito_disponible de v_saldo_proveedor de ese proveedor y empresa), con "le debemos" si es deuda o "a nuestro favor" si es crédito. Nada de "crédito aplicado / no aplicado".
> - El total y el "Son … pesos" salen de datos_orden_pago.total (ya es el vivo). Si anulada = true, la hoja sale tachada "ANULADA" y no se ofrece imprimir.
> - Firmas abajo. Las observaciones internas del gasto no van en la hoja; solo las de la orden marcadas "Van impresas".
> - Botón "Enviar": navigator.share con el PDF; si no hay share, que lo descargue.
> - Escapá todo texto de la base. No toques produccion.html.
> PRUEBAS: specs y mutaciones (cheques sin librador, cajas de totales, franja en los 3 casos, saldo de la cuenta, anulada, Enviar con y sin share).

## Qué cambió (solo `modulos/cuentas-corrientes.html`, la hoja de la orden de pago)

Lo que la base devuelve, leído con `pg_get_functiondef` / `pg_get_viewdef` el 31/10/2026 (nada se cambió en la base):
- `datos_orden_pago(p_orden_id)`: `total` = suma de los gastos NO anulados de la orden (el vivo; si no queda ninguno, el original), `total_original` = `ordenes_pago.total`, `anulada` = la orden tiene gastos y todos están anulados. `cheques` trae `banco, numero, fecha_pago, librador, es_echeq, importe, de_empresa, otra_empresa` (la hoja usa solo los cuatro primeros que pidió Facu y `es_echeq`). `otros_medios` trae `medio, cuenta, importe` y NO filtra los gastos anulados. `facturas` trae `tipo, numero, fecha, importe, aplicado` (suma de `aplicaciones_pago` de los gastos de la orden) y `saldo_actual` (el `saldo_pendiente` de HOY), sin id. `observaciones` = `ordenes_pago.observaciones`.
- `v_saldo_proveedor`: `deuda_pendiente` (facturas pendientes o parciales) y `credito_disponible` (créditos disponibles) por proveedor, empresa y moneda.
- RLS: `aplicaciones_pago` y `aplicaciones_credito` se leen con `cuentas_corrientes:ver_todo`; `gastos`, los propios o con `gastos:ver_exportar`; `ordenes_pago`, con `registrar_pago` o `ver_todo`. `created_at` de las aplicaciones y `creada_en` de la orden son `now()`.

La hoja nueva (`htmlOrdenPago(d, { saldo, anteriores })`):
1. Arriba la empresa (logo, razón social, CUIT, domicilio), "ORDEN DE PAGO", número y fecha; el proveedor (razón social, CUIT, domicilio). UNA hoja, sin ORIGINAL/DUPLICADO (ya era así desde el 30/10).
2. Dos columnas (`.op-columnas`, 9fr 11fr; en una hoja de menos de 150 mm —el celular— van una abajo de la otra con `@container`; impresa y en el PDF, lado a lado):
   - **"Con qué se pagó"**: "Cheques" (Banco / Número / Fecha de pago / Importe, con "eCheq"; sin librador, sin la empresa o cliente de origen, sin "entregado por"), "Transferencias" (Cuenta / Importe), "QR" aparte si aparece, "Efectivo" (sin la caja); cada bloque con "Subtotal …".
   - **"Facturas que cancela"**: Comprobante ("Factura A 0003-00001201"; "factura" se lee "Factura", "otro" o sin tipo solo el número) / Fecha / Importe / Aplicado / Le queda; y el subrenglón chico "Ya tenía pagos anteriores por $ X y créditos por $ Y" cuando la factura tenía aplicaciones de OTROS pagos o de créditos con fecha anterior a la orden (`leerAnterioresOrdenPago`, que lee `ordenes_pago.creada_en`, los gastos de la orden, sus aplicaciones y las de esas facturas; sin `ver_todo` no ve nada y el subrenglón no va; si algo falla, no se afirma nada).
3. **Dos cajas a la misma altura** (`.op-totales`): izquierda los subtotales por medio + TOTAL PAGADO (= `datos_orden_pago.total`); derecha "Aplicado en este pago", "Les queda" y TOTAL FACTURAS (= aplicado + lo que les queda). Grilla con las cajas estiradas al alto de la más alta y el TOTAL de cada una pegado abajo: las dos líneas de total quedan a la misma altura (medido en el navegador).
4. "Son … pesos" del total vivo.
5. **La franja**: "Queda saldo pendiente $ X" (lo que les queda a las facturas), "Queda a favor de PAZ MIRTA $ X" (lo pagado que no se aplicó, total − aplicado; la razón social de la empresa, o su nombre) o "Facturas canceladas". Si se pagó una parte de una factura y además sobró, van los dos renglones. Sin facturas y sin nada a favor, no va. Reemplaza al viejo "Saldo a favor del proveedor".
6. **UNA línea "Saldo de la cuenta: $ X le debemos"** (o "a nuestro favor"; en cero, sin palabra): neto `deuda_pendiente − credito_disponible` de `v_saldo_proveedor` de ese proveedor en esa empresa y en pesos (el de HOY). Sin poder leerlo, la línea no va. `lineaSaldoOrdenPago(saldo)` ahora devuelve `{ importe, sentido }`.
7. Observaciones (solo las de la orden), firmas, "Generada por …".
8. **Anulada** (`anulada = true`): aviso arriba, sello "ANULADA" cruzado, título y totales tachados, sin "Imprimir" ni "Enviar". "ANULADA EN PARTE" sigue como estaba (`marcarHojaAnulada`, por los gastos), pero si la base dice "no anulada" y los gastos que la persona ve están todos anulados, es "en parte" (manda la base).
9. **Versión compacta** (más de 15 renglones en la columna más larga): tablas a 6pt y el banco en un renglón con "…". Medido en el PDF de Chromium (A4, márgenes 8 mm): entran 50 cheques y 50 facturas a la vez con nombres de banco reales (30 a 40 letras) e importes de millones; 55 ya son dos hojas. La normal (hasta 15 renglones) entra siempre.
10. **"Enviar"** (`#btn-enviar-orden`): arma el PDF de la hoja (html2canvas 1.4.1 + jsPDF 2.5.1 de cdnjs, cargados al usarlo, como el recibo de Cobranzas), en UNA hoja A4, y lo comparte con `navigator.share` ("Orden de pago N-OP-00005 ANATOLIA SRL.pdf") si el navegador acepta archivos; si no, lo descarga y avisa. Si la persona cancela el share, nada. Doble toque, un PDF.

## Qué se verificó y contra qué

- `node pruebas/test-cuentas-corrientes-orden-pago-a4.js`: 148/148 (ejecuta el código real con document, base, html2canvas, jsPDF y navigator falsos); da rojo sobre el commit fijo `1c20f98`.
- `node pruebas/mut-cuentas-corrientes-orden-pago-a4.js`: 88/88 detectadas (+6 equivalentes anotadas), baseline `1c20f98`.
- Re-ancladas y en verde: `mut-...-orden-pago-copias` 19/19, `-proveedor-una-lista` 28/28, `-pago-proveedor-aplicar` 100/100, `-xss` 125/125. (`mut-...-pago-mixto` y `mut-...-nota-credito` ya estaban en la lista de rotas de antes por anclas no únicas que no son de esta rama.)
- `e2e/117-orden-pago-a4.spec.js` (7 pruebas, maqueta, 390 y 1280 px): la hoja, sin librador, las columnas lado a lado / apiladas, nada se sale de su columna ni de su caja, las cajas y sus totales a la misma altura (medido con `getBoundingClientRect`), la franja en los tres casos, 40 cheques + 40 facturas en UNA página del PDF de Chromium, anulada, "Enviar" con share y sin share (descarga real de Playwright). `e2e/88`, `e2e/49` y `e2e/107` pasados a la hoja A4 y en verde.
- `npm run pruebas`, `node pruebas/check-scripts.js` y `test-anclas-mutaciones`: ver el informe de la rama (en verde al cerrar).

## Decisiones tomadas sin consultar

- **"Van impresas"**: no hay ninguna columna ni casilla; la marca es el propio campo "Observaciones de la orden" del pago, cuyo texto de ayuda dice "Van impresas en la orden de pago" y que es lo único que se guarda en `ordenes_pago.observaciones` (`pagar_proveedor_mixto` no lo copia al gasto). La hoja imprime ese campo y nada del gasto (que `datos_orden_pago` ni siquiera trae). No se inventó nada en la base.
- La cuenta de la transferencia SÍ va (lo pidió Facu); antes la hoja no la mostraba.
- QR va en su bloque propio (no es una transferencia); el efectivo, sin la caja de la que salió.
- TOTAL FACTURAS = lo aplicado en este pago + lo que les queda hoy (lo que debían al pagarse), no la suma de los importes originales: así la franja dice la verdad cuando una factura ya tenía pagos.
- "Le queda" es el saldo de HOY de la factura (`saldo_actual`), igual que la línea del saldo de la cuenta.
- "Queda a favor" sale de lo pagado que no se aplicó (total vivo − aplicado), no de `a_favor` de la base (que suma el crédito original aunque después se haya aplicado).
- Una anulada tampoco ofrece "Enviar".
- En la compacta el banco se corta con "…" en un renglón (el número del cheque y el eCheq quedan enteros).

## Lo que no se pudo probar

- El PDF real de "Enviar" con html2canvas y jsPDF de cdnjs: en este contenedor cdnjs no carga; se probó con dobles (en la suite y en el navegador) que se carguen esas dos URLs, que el PDF salga de la hoja en 194 mm y en UNA A4, y el share / la descarga.
- `navigator.share` en un celular de verdad.
- El subrenglón con datos reales: hoy la base tiene 2 órdenes de pago y ninguna con observaciones.
- Una orden "anulada en parte" con el resto en efectivo/transferencia: `otros_medios` de la base no filtra los gastos anulados, así que esa hoja mostraría el medio anulado en los subtotales; como sale "ANULADA EN PARTE" y sin imprimir, no se tocó (es de la base).

## Qué tocar en la doc

- `docs/memoria/cuentas-corrientes.md`: ya tiene la sección "LA ORDEN DE PAGO A4 (31/10/2026, …)" (escrita en esta rama, en el medio, después del bloque del 30/10). Revisar que el índice de CLAUDE.md no necesite nada (no hay tareas, permisos, tablas ni RPCs nuevas; ninguna RPC cambió de firma).
- `docs/memoria/pruebas-y-ensayo.md`, si lleva la lista de suites: sumar `test-/mut-cuentas-corrientes-orden-pago-a4.js`, `pruebas/orden-pago-a4-comun.js` y `e2e/117-orden-pago-a4.spec.js`.
- Aprendizaje para `docs/memoria/aprendizajes.md`: "En el e2e, `emulateMedia('print')` NO cambia el ancho: para medir cómo queda impresa una hoja con `@container`, poner el viewport en 733 px (194 mm). Y correr Playwright con puertos propios (`E2E_PUERTO`, `E2E_PUERTO_MAQUETA`, `MAQUETA_URL`) cuando hay otras sesiones: si no, se reusa el servidor de otro worktree (o se cae a mitad)."

## Permisos

Ninguno nuevo. Ninguna RPC cambió de firma ni de valor de retorno.

## Qué automatizaría ahora

Medir "¿entra en una A4?" a mano costó varias vueltas (un spec temporal que probaba variantes de CSS y contaba páginas). Lo convertiría en un script `npm run medir:hoja -- <módulo> <selector> <datos>` que abra la maqueta, inyecte N renglones, pase a impresión a 733 px y devuelva el alto en mm y las páginas del PDF para N = 10, 20, … hasta que no entre: sirve para la orden de pago, el recibo de Cobranzas, la nota de débito y la hoja de retiro.
