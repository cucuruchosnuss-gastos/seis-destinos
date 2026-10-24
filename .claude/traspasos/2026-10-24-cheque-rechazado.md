# Traspaso — Cheque rechazado y notas de débito (24/10/2026, Tanda B, tarea 1)

Rama `ci-prueba/cheque-rechazado` (desde `origin/main` 4d29b9d). Módulos: Administración (la cartera de cheques y el script principal), Cuentas corrientes y `js/cobranzas-comun.js`. **No se tocó `modulos/produccion.html` ni la base** (solo SELECT de lectura).

## Lo que se leyó en la base (nuss-central, 24/10/2026, ~14:15 de Argentina)
- `pg_get_functiondef` de `buscar_cheques_para_rechazo`, `registrar_cheque_rechazado`, `registrar_nota_debito_cliente`, `registrar_nota_debito_proveedor`, `anular_nota_debito`, `datos_nota_debito`, y de las internas `_nd_emitir` y `_nd_recibir`; `cuenta_cliente` y la vista `v_cuenta_corriente_movimientos`.
- `information_schema.columns` de `notas_debito`, `cobranza_cheques`, `cliente_movimientos` y `facturas_pendientes`; `pg_get_constraintdef` de sus CHECK (estado `rechazado`, tipos `nota_debito` / `anulacion_nota_debito`, `modulo_origen 'nota_debito'`); la policy `notas_debito_ver`; EXECUTE de las seis RPCs para `authenticated` (sí) y `anon` (no). Al 24/10 no hay ninguna nota ni ningún cheque rechazado.
- **Coincide con el pedido**, con estos detalles que mandan (son de la base):
  - `buscar_cheques_para_rechazo` NO devuelve la cuenta del banco por id: "se descuentan $X de <cuenta>" usa el nombre de la cuenta si el cheque está en la lista y, si no, el `destino` que guardó la base.
  - `cuenta_cliente()` NO devuelve `nota_debito_id`: el link de la cuenta sale del código en el detalle ("Nota de débito N-ND-0001") buscado en `notas_debito` del cliente.
  - `datos_nota_debito` no trae la fábrica de la nota: el botón Anular se muestra con `retiros:precios` (en cualquier fábrica) o `cobranzas:procesar`, y la base decide.
  - El comprobante del proveedor es opcional en la base (`'s/n'`); la pantalla lo pide (ver decisiones).

## Qué se hizo (lo que ve Facu)
1. **Cartera → "Cheque rechazado"**: buscador por número (300 ms de espera, desde 2 números), elegir, fecha, motivo con chips Sin fondos / Firma / Cuenta cerrada / Otro + detalle, gastos al cliente (renglones; viene "Gastos de cheque rechazado" vacío), cliente si la cobranza no tiene, "Nota de débito del proveedor" si se le dio a uno (con PDF opcional en la carpeta del usuario), resumen (banco, nota al cliente, nota del proveedor) y una llamada a `registrar_cheque_rechazado`. Después se abre la hoja de la nota.
2. **Estado "Rechazado"** en la cartera: filtro propio, también en "Salidos" y "Todos", en rojo, con fecha, motivo y link a su nota de débito. En Cobranzas cuenta como fuera de cartera.
3. **"+ Nota de débito" suelta** en la cuenta del cliente (Administración) → `registrar_nota_debito_cliente`.
4. **"+ Nota de débito" del proveedor** en su ficha (Cuentas corrientes) → `registrar_nota_debito_proveedor`; en su cuenta queda como comprobante pendiente "Nota de débito <n°>", con **Anular** (si no tiene pagos).
5. **La hoja de la nota de débito** (Administración): A4 vertical, blanco y negro, ORIGINAL y DUPLICADO, total en letras, datos del cheque rechazado, sello ANULADA, Imprimir, Compartir PDF y Anular con motivo.
6. **La cuenta del cliente**: "Nota de débito N-ND-0001" y "Anulación de nota de débito" abren la hoja.

El detalle técnico quedó en `docs/memoria/cheques.md`, `cuentas-corrientes.md` y `administracion.md` (una entrada nueva en cada uno, con fecha).

## Lo decidido sin consultar
- La hoja vive en el script de Administración (no en un `js/` compartido nuevo): la cartera, que es otro `<script type="module">` de la misma página, la pide con el evento `administracion:nota-debito`. Así no hubo que abrir una excepción nueva a la regla de duplicar. En Cuentas corrientes NO hay hoja de la nota recibida (es el papel del proveedor: se adjunta su PDF).
- El total en letras se copió de la orden de pago de Cuentas corrientes (`importeEnLetrasNd`), por la regla de duplicar.
- "Salidos" incluye a los rechazados (el pedido dice que figuren "en las salidas"); para Cobranzas, `ESTADOS_SALIDOS` no cambió y el rechazado se sumó solo a `ESTADOS_FUERA_DE_CARTERA`.
- El color del rechazado es el **rojo** del sistema (`--rojo-suave` + franja `--rojo`), distinto del bordó del plazo y del anulado.
- El n° de comprobante de la nota del proveedor es **obligatorio en la pantalla** (la base acepta sin número y pone "s/n").
- Un renglón de gasto sin importe no viaja (así el renglón que viene puesto no molesta); uno con importe y sin concepto no deja confirmar.
- Con "Otro", el motivo es solo lo escrito (3 letras o más); con un chip, "Chip: detalle".
- Si el PDF del proveedor no se puede subir, no se registra el rechazo (se dice por qué). Si se sube y la base rechaza, el archivo queda huérfano en la carpeta del usuario (mismo costo aceptado que Gastos).
- Las seis opciones del filtro de estados ahora bajan de renglón en el celular (a 390 se pisaban) y el link "‹ Cobranzas" no se corta.
- Se ajustaron pruebas viejas que fijaban lo que cambió a propósito: `test-cheques-vista` (seis opciones; "Salidos" con rechazado), `test-cheques-colores` (ocho entradas en la leyenda), `test-cheques-banco` (dos regex tolerantes), `test-cuentas-corrientes-numeros` (el enlace de la nota de débito), y la lista de funciones de cinco suites de Cuentas corrientes (`cargarNotasDebitoFicha`). `sandbox-cheques.js` suma las funciones nuevas y un `retornoExtra`.

## Lo que no se pudo probar
- Nada con la base real ni con sesión: todo en la maqueta (Supabase falso) y en las suites. Falta la pasada de Facu/Yanina con un cheque de verdad (ver guion).
- "Compartir PDF" en un celular real (en Chromium de escritorio no hay `navigator.share` de archivos: se prueba que descarga el PDF).
- La subida real del PDF al bucket `comprobantes` (la policy de "carpeta propia" se respetó en la ruta, pero no se subió nada).

## Guion para Facu
1. Administración → Cheques → "Cheque rechazado". Escribí los últimos 4 números de un cheque depositado: tiene que aparecer en la lista.
2. Elegilo, tocá "Sin fondos", poné un gasto (por ejemplo $ 1.500) y mirá el resumen: "Se descuentan $ … de <cuenta>" y el total de la nota.
3. Confirmá: se abre la nota de débito. Probá Imprimir (dos hojas: ORIGINAL y DUPLICADO) y Compartir PDF desde el celular.
4. En la cartera, filtro "Rechazados": el cheque en rojo con la fecha, el motivo y el link a la nota.
5. En la cuenta del cliente: el renglón "Nota de débito N-ND-…" abre la hoja; "Anular" con motivo la revierte.
6. Cuentas corrientes → la ficha de un proveedor → "+ Nota de débito": queda como comprobante pendiente; "Anular" la saca si no tiene pagos.

## Pruebas (números al cierre)
PENDIENTE

## Qué automatizaría ahora
- **El sandbox de cada módulo con TODAS sus funciones**: hoy cada suite de Cuentas corrientes (y algunas de Administración) lista a mano las funciones que extrae, y cada función nueva que llama una vieja obliga a tocar cinco o seis suites (pasó acá con `cargarNotasDebitoFicha`). Un `sandbox-cuentas-corrientes.js` como el de Cheques (con OPCIONALES que se cargan si existen) lo saca de raíz.
- **Un control de imports en las suites de sandbox**: el sandbox de Cheques trae `textoSalidaCheque` aunque la región no la importe, y el error solo apareció en el navegador. Una prueba que compare los nombres que el sandbox inyecta desde `js/` contra los `import` del script lo atraparía en `npm run pruebas`.
- **Esperar un debounce en e2e**: el patrón "fill + runFor/espera" se repite; un helper `escribirYEsperarBusqueda(page, selector, texto)` en `e2e/ayuda.js`.
