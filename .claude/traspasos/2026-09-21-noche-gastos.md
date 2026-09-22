# Traspaso — Gastos: importes y kilometraje pasan a las funciones de números de js/utils.js (noche del 21/09/2026)

Para el chat de arquitectura (dueño de CLAUDE.md). Autocontenido: quien lo lea no vio el trabajo.

Parte 3 de la migración de números: `modulos/gastos.html` deja su `parseImporte()` y su `formatearImporteEnVivo()` y usa las funciones compartidas de `js/utils.js` (commit `ae5569d`, sección "Números en formato argentino": `formatearNumeroAr`, `enlazarCampoNumero`, `ponerNumero`, `leerCampoNumero`). **Sin cambios de base** (Supabase solo lectura esta noche). Sin commit: lo hace quien invocó.

Verificado contra la base (solo lectura) antes de decidir:
- `gastos.kilometraje` y `facturas_pendientes.kilometraje` son **`integer`**; los 6 gastos con kilometraje no tienen decimales (máximo 885000). Por eso el kilometraje va con `decimales: 0` y no hay motivo para admitir decimales.
- Firmas de las RPCs que llevan número: `agregar_interes_factura(... p_monto numeric, ... p_tasa_pct numeric ...)`, `editar_factura_pendiente(... p_importe numeric ...)`, `registrar_pago_directo_proveedor(... p_monto numeric ...)`, `sincronizar_pago_directo_proveedor(... p_importe numeric ...)`. No cambiaron.
- `materia_prima_ingresos.ocr_crudo->'importe_total'` es siempre un **número JSON** (`jsonb_typeof = number`; textos como "522261.82", "4418400", "1936886.1").

## Qué cambió en `modulos/gastos.html`

Campos, por clase:
- **IMPORTE (5, con la tasa):** `#campo-importe` (wizard), `#edit-importe` (edición del gasto), `#edit-factura-importe` (edición de la factura pendiente), `#campo-interes-monto` y `#campo-interes-tasa` (modal de interés). Todos `enlazarCampoNumero(el, { decimales: 2 })`. **La tasa es un porcentaje, no plata**, pero hoy usaba el mismo parser y formateo que los importes: se migró igual, con 2 decimales (lo pidió la tarea).
- **CANTIDAD ENTERA (2):** `#campo-kilometraje` (wizard) y `#edit-kilometraje` (edición). Eran **`type="number"`**: en un teclado es-AR, "85.000" podía entrar como 85. Ahora `enlazarCampoNumero(el, { decimales: 0 })` (queda `type="text"` + `inputmode="numeric"`); "85.000" tipeado, pegado o escrito queda 85000. El HTML estático del wizard también pasó a `type="text" inputmode="numeric"` (placeholder "Ej: 85.000", sin `min`).
- **IDENTIFICADOR (4), sin tocar:** `campo-numero-doc`, `edit-numero-doc`, `edit-factura-numero` (número de comprobante) y `campo-nuevo-prov-cuit` (CUIT).

Lecturas:
- `parseImporte()` **se eliminó** (borraba TODOS los puntos: un "387300.50" pegado daba 38.730.050).
- Dos helpers nuevos de una línea: `importeDelWizard()` y `kilometrajeDelWizard()` = `leerCampoNumero(...)`. El importe del wizard lo leen **una sola función** las cuatro puntas: `validarSubpaso('datos')`, el listener de "Enviar a pendiente", `armarGasto()` y `armarFacturaPendiente()`. Los dos `toNum()` locales (`Number(v)`) de esos payloads se fueron.
- Edición del gasto (importe y kilometraje), edición de la factura, monto e interés (los dos lugares de cada uno: el recálculo en vivo y el confirmar): `leerCampoNumero()`.
- La validación "Ingresá el kilometraje del vehículo" pasó de `!campo.value` a `kilometrajeDelWizard() == null`.
- No queda ningún `parseFloat` ni `Number()` sobre texto tipeado. Los `Number()` que quedan son sobre datos de la base (export, total, base del interés).

Escrituras (todas con `ponerNumero()`):
- **OCR** (`prellenarPaso2`): `ponerNumero(campoImp, datos.importe)`. Si lo que llegó no se puede leer, el campo queda vacío y **ya no se marca como "leído de la foto"** (antes quedaba "NaN" marcado).
- **"Cargar gasto" desde un ingreso** (`cargarGastoDesdeIngreso`): `ponerNumero(campo-importe, importe)`.
- **Plantillas de edición:** se sacaron los `value="${Number(g.importe).toLocaleString(...)}"`, `value="${Number(f.importe).toLocaleString(...)}"` y `value="${esc(g.kilometraje)}"`. Después de insertar el HTML se enlaza y se escribe con `ponerNumero`. **Con el importe en null el campo abre VACÍO** (antes "0,00", el latente que marcaba el inventario).
- Las limpiezas (`.value = ''` al resetear el wizard o cambiar la foto) quedaron como estaban: vaciar no es escribir un número.

`formatearImporteEnVivo()` **se eliminó**; cada uno de sus cinco usos pasó a `enlazarCampoNumero`. El del modal de interés se enlaza ANTES de los listeners de recálculo (comentado en el código).

Mostrar:
- `formatearImporte(importe, moneda)` usa `formatearNumeroAr()` por dentro. **Igual que antes para todo valor presente** (comparado en la suite contra la función del baseline `d79765b`, en ARS y USD, con 15 valores, negativos incluidos), salvo el ausente: **null / undefined / '' / NaN / texto → "—"**. Antes `''` daba "$ 0,00" y un texto "$ NaN". El export a Excel no usa esta función (escribe `Number(g.importe) || 0`), así que el "—" no lo toca.
- `formatearImporteDuplicado()` (aviso de comprobante ya cargado) usa `formatearNumeroAr(num, { decimales: 2, minimos: 0 })`: misma salida que antes ("$1.234,5"), sigue devolviendo null para un ausente.

## Decisiones que conviene dejar escritas

- **`importeDeOcr()` SE QUEDA con `Number()` y NO pasa a `leerNumeroAr()`, a propósito.** No es texto tipeado: es un número JSON pasado a texto por Postgres (`ocr_crudo->>'importe_total'`), siempre con punto decimal y sin miles. `leerNumeroAr` leería un "150.000" (150 con escala 3) como 150 mil. Es la regla de "un helper por FUENTE" (la misma de `numeroDesdeOcr` en Ingreso). Lo que sí cambió es cómo entra al campo: con `ponerNumero`. Está comentado al lado de la función.
- El OCR de `ocr-comprobante` devuelve el importe como número (su prompt pide "con punto decimal"); si alguna vez viniera como string "15400.50", `ponerNumero` lo lee bien (un solo punto con 1-2 decimales es decimal).

## Suites (`pruebas/`)

Nuevas:
- **`test-gastos-numeros.js` — 205/205 verde.** Ejecuta el código real del módulo y de utils.js con un DOM falso donde cada campo es un `inputFalso()` y cada `innerHTML` regenera sus campos (con el `value=""` que ponga la plantilla, como el navegador). El número se verifica en lo que viaja: `armarGasto()` / `armarFacturaPendiente()` (el payload del insert de `gastos` y de `facturas_pendientes`; `registrar_pago_directo_proveedor` recibe `datosGasto.importe`, el mismo objeto), el `update` de `gastos` y `p_importe` de `sincronizar_pago_directo_proveedor` en la edición, `p_importe` de `editar_factura_pendiente`, y `p_monto` / `p_tasa_pct` de `agregar_interes_factura` (modo monto y modo tasa). El listener de "Enviar a pendiente" se toma **tal cual del archivo**. Cubre teclear / escribir / pegar "2.000.000" y "387.300,50", pegar "387300.50", kilometraje "85.000" por los cuatro caminos, OCR, "Cargar gasto", edición con null, los formateadores contra el baseline y un chequeo estático (no quedan `parseImporte`, `formatearImporteEnVivo`, `type="number"` ni `value="${Number(`; se enlazan exactamente los 7 campos, con sus decimales, y ningún identificador).
- **`mut-gastos-numeros.js` — 33/33 mutaciones detectadas** (cada lectura vuelta a `Number` / `parseFloat`, cada `ponerNumero` sacado o vuelto a `.value` / `toLocaleString`, cada enlace sacado o con otros decimales, el HTML del kilometraje de vuelta a `type="number"`, y los dos formateadores).

Actualizada:
- `test-gastos-circuito.js`: su preludio suma `fuenteNumeros()` porque `formatearImporte` ahora usa `formatearNumeroAr`. **No se tocó ninguna assertion.** Sigue 57/57 y `mut-gastos-circuito.js` 21/21.

Corrida completa al cerrar: `check-scripts` OK; `test-cobranzas-cabecera` 72/72, `test-cobranzas-escritorio` 45/45, `test-cobranzas-fotos` 70/70, `test-cobranzas-numeros` 146/146, `test-cobranzas-xss` 320/320, `test-cuentas-corrientes-circuito` 78/78, `test-gastos-circuito` 57/57, `test-gastos-numeros` 205/205, `test-materia-prima-circuito` 113/113, `test-numeros` 149/149; `controles-cobranzas` 354/354.

## Lo que NO se hizo, y por qué

- **El kilometraje se sigue MOSTRANDO crudo** ("85000 km") en los tres resúmenes/detalles (`fila('Kilometraje', ...)`). Es texto para mostrar, no un campo ni un formateador del módulo, y la regla era no cambiar cómo se ve. Pasarlo a "85.000 km" es una línea por lugar con `formatearNumeroAr(g.kilometraje, { decimales: 0 })`; queda para cuando se decida.
- Nada en un navegador real: todo es ejecución del código con el DOM falso. Lo que conviene mirar a mano en el celular: tipear el kilometraje (teclado numérico sin coma) y pegar un importe con punto decimal.

## Qué tocar en CLAUDE.md

- Módulo **Gastos** (sección "Módulos → Existentes → 1. Gastos"): una entrada nueva "NÚMEROS CON LAS FUNCIONES COMPARTIDAS (21/09/2026)" con lo de arriba: los 7 campos enlazados (5 de 2 decimales, 2 de kilometraje entero), `importeDelWizard()`, que la edición abre con `ponerNumero` (null → vacío), `formatearImporte(null/''/NaN) → "—"`, y la decisión de `importeDeOcr` con `Number()`.
- La nota de `parseImporte` en la sección "Arquitectura" / inventario, si la hubiera, ya no aplica a Gastos.
- "Cómo trabajar → las suites viven en `pruebas/`": sumar `test-gastos-numeros.js` / `mut-gastos-numeros.js` con sus números (205/205 y 33/33).
