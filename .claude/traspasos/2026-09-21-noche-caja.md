# Traspaso — Caja: números con las funciones compartidas (noche del 21/09/2026)

Para el chat de arquitectura. Quien lo recibe no vio el trabajo: esto es autocontenido.

## Qué cambió (solo `modulos/caja.html`, más dos archivos nuevos en `pruebas/`)

Los montos de Caja pasan por las funciones de números de `js/utils.js` (commit `ae5569d`), igual que Gastos (`b97b44c`) y Cobranzas (`d79765b`).

- **Se eliminaron `parseImporte()` y `formatearImporteEnVivo()` propios.** El parser viejo borraba TODOS los puntos antes de leer, así que un "387300.50" pegado viajaba a la RPC como **38.730.050**. Ahora:
  - `IDS_CAMPOS_MONTO` + `enlazarCamposMonto()` enlazan los tres campos con `enlazarCampoNumero(…, { decimales: 2 })` al iniciar (donde antes se llamaba a `formatearImporteEnVivo`).
  - `montoDeCampo(id)` = `leerCampoNumero(...)`: la única lectura, la usan `guardarMovimiento()` y `guardarTraspaso()`.
  - Los vaciados al abrir los modales pasaron de `.value = ''` a `ponerNumero(campo, null)`, para que el estado del enlace no arrastre el valor anterior.
- **Formateadores:** `formatearImporte()` usa `formatearNumeroAr()` por dentro; todo valor presente se ve igual que antes (verificado contra el baseline), y un importe ausente (`null`, `undefined`, `''`, `NaN`, texto) da **"—"** (antes `''` daba "$ 0,00" y un texto "$ NaN"). `formatearImporteCentavosSuaves()` igual: `null` daba "$ 0,00", ahora "—". **Se mantuvo la separación texto plano / HTML**: `formatearImporte()` no escapa, `importeHtml()` = `esc(formatearImporte())`, y `formatearImporteCentavosSuaves()` sigue escapando la moneda por dentro.
- **Export a Excel: no lo toca.** La columna "Importe" sale de `Number(m.monto) || 0` (un número, no un formateador) y `etiquetaMovimiento()` no formatea importes. Verificado leyendo `exportarMovimientosExcel()`.

## Campos por clase
- **IMPORTE (3):** `movimiento-monto` (ingreso externo, ingreso propio, egreso y retiro), `traspaso-monto` y `traspaso-monto-destino` (el de "Monto que entra" cuando origen y destino tienen distinta moneda). El inventario no se había perdido ninguno: son todos los campos de monto del archivo.
- **CANTIDAD (0).**
- **IDENTIFICADOR (3), sin tocar:** `editar-bancarios-cbu`, `editar-bancarios-alias`, `editar-bancarios-numero`.

## Verificado contra la base (solo lectura)
Firmas en `pg_proc`: `registrar_ingreso_externo_caja(p_monto numeric, …)`, `registrar_retiro_caja(p_monto numeric, …)`, `crear_solicitud_movimiento_caja(…, p_monto numeric, …)`, `registrar_traspaso_cuenta_caja(…, p_monto_origen numeric, p_monto_destino numeric, …)`. Los nombres de los parámetros coinciden con lo que arma el código. **`registrar_ingreso_propio_caja` existe pero caja.html NO la llama**: el ingreso propio va por `crear_solicitud_movimiento_caja` con `p_tipo='ingreso'` (lo prueba la suite).

## Pruebas
- `pruebas/test-caja-numeros.js` — **379/379**. Ejecuta `guardarMovimiento()` y `guardarTraspaso()` REALES con los campos enlazados (inputFalso) y un supabase mockeado: "2.000.000" → 2000000 y "387.300,50" / pegado "387300.50" → 387300.5 en `p_monto` de las cuatro variantes del movimiento y en `p_monto_origen` / `p_monto_destino` (misma moneda y entre monedas); monto vacío o 0 frena sin llamar; reabrir los modales vacía los campos; formateadores iguales al baseline `b97b44c` (fijo) para valores presentes y "—" para ausentes; estático (no queda `parseImporte`, `formatearImporteEnVivo`, `parseFloat`, `toLocaleString`, `type="number"`, ni `.value` a mano sobre un monto; los identificadores bancarios no se enlazan). Contra el archivo anterior da rojo.
- `pruebas/mut-caja-numeros.js` — **24/24 detectadas** (lecturas a `parseFloat`/`Number`/parser viejo, escrituras sin `ponerNumero`, enlaces sacados o con 0 decimales, formateadores rotos, escapes sacados).
- `node pruebas/check-scripts.js`: OK. Resto de las suites en verde (cobranzas cabecera 72/72, escritorio 45/45, fotos 70/70, números 146/146, xss 320/320; CC circuito 78/78; gastos circuito 57/57, números 205/205; MP circuito 113/113; test-numeros 149/149; controles-cobranzas 354/354).

## Lo que no se hizo, y por qué
- **"Total de la empresa" con cero saldos sigue diciendo "$ 0,00"**: el call site le pasa un `0` explícito (`principal ? total : 0`), que es un total calculado y no un dato ausente. No se cambió.
- Los `Number()` sobre saldos y montos que vienen de la base (no de un campo) quedan como estaban: no son texto tipeado.
- No hay borradores ni almacenamiento local en Caja: no aplica el test de borradores.
- Nada probado en un navegador real.

## Qué tocar en CLAUDE.md
Sección **Módulos → 2. Caja**: agregar una viñeta "NÚMEROS (21/09/2026)" con lo de arriba (los tres montos enlazados con `enlazarCampoNumero`, leídos con `leerCampoNumero`, sin `parseImporte` ni `formatearImporteEnVivo`; `formatearImporte` / `formatearImporteCentavosSuaves` con "—" para lo ausente, la separación texto plano / `importeHtml()` intacta; el Excel no pasa por formateadores). En **"Las suites de verificación viven en `pruebas/`"**, sumar `test-caja-numeros.js` / `mut-caja-numeros.js` con sus números. Y en la sección de RPCs de Caja, dejar dicho que `registrar_ingreso_propio_caja` no tiene consumidor en el frontend.
