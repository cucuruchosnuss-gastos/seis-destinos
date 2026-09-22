# Traspaso — Cobranzas: los importes pasan a las funciones de números de js/utils.js (noche del 21/09/2026)

Para el chat de arquitectura (dueño de CLAUDE.md). Autocontenido: quien lo lea no vio el trabajo.

Parte 2 de la migración de números: `modulos/cobranzas.html` deja su parser propio y usa las funciones compartidas de `js/utils.js` (commit `ae5569d`, sección "Números en formato argentino": `leerNumeroAr`, `formatearNumeroAr`, `enlazarCampoNumero`, `ponerNumero`). **Sin cambios de base** (esta noche Supabase era solo lectura; se consultó el tipo de las dos columnas: `cobranzas.efectivo` y `cobranza_cheques.importe` son `numeric(14,2)`). Sin commit: lo hace quien invocó.

## Qué cambió en `modulos/cobranzas.html`

Campos, por clase:
- **IMPORTE (2):** `#cob-efectivo` y el `[data-importe]` de cada tarjeta de cheque. Los dos se enlazan con `enlazarCampoNumero(el, { decimales: 2 })`: formatean mientras se escribe ("2.000.000", "387.300,50"), el punto del teclado se toma como coma decimal y pegar "387300.50" funciona.
- **CANTIDAD (0).**
- **IDENTIFICADOR (6), sin tocar:** los tres renglones de la banda CMC-7 (`data-r1/r2/r3`), el CUIT de los titulares, el filtro de número de cheque (`#cob-filtro-cheque`) y el comprobante de referencia. Siguen como texto de dígitos, sin puntos de miles.

Lecturas: `parseImporteCobranza()` y `milesValidos()` **se eliminaron**. Las cinco lecturas (el importe que viaja en `chequeParaBase`, la tarjeta, `origenDatosDe`, el total del formulario, `efectivoDelFormulario` y el "El efectivo no se entiende" de `motivosParaNoGuardar`) usan `leerNumeroAr()`. No queda ningún `parseFloat` ni `Number()` sobre texto tipeado (los `Number()` que quedan son sobre datos de la base).

Escrituras: una función nueva, `escribirImporteEnCampo(input, valor)`, que llama a `ponerNumero()`. La usan `pintarFormulario()` (efectivo) y `conectarTarjetasCheque()` (importe de cada cheque, **después** de insertar el HTML). La plantilla del importe **ya no lleva `value="${escCob(ch.importe)}"`**: un sink menos. Única excepción deliberada: un texto de un borrador VIEJO que no se puede leer (p. ej. "12,500.50", tipeado antes de que el campo formateara) se escribe tal cual, para que el aviso "El efectivo no se entiende" hable de algo que se ve; vaciarlo escondería el dato.

**EL ORDEN DEL ENLACE IMPORTA, y quedó comentado en el código:** el enlace se registra ANTES del listener del módulo que copia `el.value` al estado. Al revés, el estado guardaría el texto crudo de la tecla ("200.0000" mientras el campo pasa a "2.000.000") y leería null. Hay una mutación por cada campo que invierte el orden y da rojo.

OCR y edición: `chequeDesdeOcr` guarda el importe del OCR **como número** (antes `String(p.importe)`); `chequeDesdeBase` y la edición guardan lo que vino de la base sin pasarlo a texto. De paso se cierra un bug latente del parser viejo: un importe del OCR con tres decimales (1234.567) daba 1.234.567; ahora el campo muestra 1.234,57 (la columna es `numeric(14,2)` y redondea igual).

**Borradores en el celular (IndexedDB `cobranzas-offline`):** siguen guardando el objeto del formulario; el efectivo y el importe quedan como el texto que muestra el campo (ya formateado) o como número si vinieron del OCR/base. **Los borradores viejos abren bien**, verificado en la suite: "387300" → campo 387.300 y viaja 387300; "387300.5" → 387.300,50 y viaja 387300.5; "12.500,50" → 12.500,50 y viaja 12500.5 (en `p_efectivo` y en `p_cheques[].importe` de `guardar_cobranza`).

Mostrar: `formatearImporte()` usa `formatearNumeroAr()` por dentro y se ve **igual que antes** para todo valor presente (comparado contra el `toLocaleString('es-AR', currency ARS)` anterior, con el mismo espacio duro después del "$"), salvo el ausente: **null / undefined / '' / NaN → "—"**. Antes `formatearImporte(null)` y `formatearImporte('')` daban "$ 0,00". Con eso la tabla de Cheques con un importe null dice "—" y las cifras de cabecera siguen diciendo "No se pudo calcular". Diferencia teórica sin efecto: el redondeo de valores con más de dos decimales usa `toFixed` en vez de `toLocaleString` (1.005 → 1,00 en vez de 1,01); los importes del módulo tienen dos decimales.

## Suites (`pruebas/`)

Nuevas:
- `test-cobranzas-numeros.js` — **146/146 verde**. Ejecuta el código real del módulo y de utils.js; el efectivo y el importe son `inputFalso()` enlazados por el código real (el bloque del efectivo se toma tal cual de `conectarTodo()`), y el número se verifica en lo que viaja a `guardar_cobranza` / `editar_cobranza` con un supabase mockeado. Cubre teclear, escribir crudo y pegar "2.000.000" y "387.300,50"; borradores con strings mixtos; OCR; edición; `formatearImporte`; y que los identificadores no se tocan.
- `mut-cobranzas-numeros.js` — **22/22 mutaciones detectadas** (lecturas a `Number`/`parseFloat`, sacar el `ponerNumero` de cada escritura, sacar o invertir cada enlace, el OCR como texto, la plantilla con `value=""`, `formatearImporte` volviendo a `Number()`).

Actualizadas (por helpers que ya no existen, sin borrar assertions):
- `sandbox.js`, `test-cobranzas-cabecera.js`, `test-cobranzas-escritorio.js`, `test-cobranzas-fotos.js`: el preludio suma `fuenteNumeros()` y la lista de funciones cambia `parseImporteCobranza`/`milesValidos` por `escribirImporteEnCampo`.
- `test-cobranzas-xss.js`: la marca `tarj_importe` ya no se espera escapada en la tarjeta **porque el importe ya no se interpola** (lo escribe `ponerNumero`); se reemplazó por una assertion más fuerte: la marca no aparece en el HTML ni escapada.
- `test-cobranzas-cabecera.js`: la assertion "total null: No se pudo calcular" solo miraba que no hubiera "$", y con `formatearImporte(null)` = "—" dejó de distinguir el guard de `htmlResumen` (la mutación que lo saca escapaba). Ahora exige además el texto "No se pudo calcular" en la cifra del total.

Números al cerrar:
- `check-scripts.js`: OK.
- `test-cobranzas-cabecera` 72/72 · `escritorio` 45/45 · `fotos` 70/70 · `numeros` 146/146 · `xss` 320/320 · `cuentas-corrientes-circuito` 78/78 · `gastos-circuito` 57/57 · `materia-prima-circuito` 113/113 · `numeros` (utils) 149/149.
- `controles-cobranzas.js`: 354/354 (ningún id ni data-* perdido; el `type` de los inputs no cambió en el HTML).
- Mutaciones: `numeros` 22/22 · `fotos` 27/27 (+2 equivalentes) · `escritorio` 35/35 · `cabecera` 45/45 · `xss` 220/220 (+1 equivalente). Eran 221: la que falta es la automática del `value="${escCob(ch.importe)}"` de la tarjeta, que ya no existe porque ese sink se sacó.

## Qué tocar en CLAUDE.md

1. **Módulo Cobranzas → "PENDIENTES DEL MÓDULO"**: el renglón *"`formatearImporte(null)` devuelve `$ 0,00` y no `—`"* queda **CERRADO** (21/09/2026): ahora da "—", y un importe ausente nunca termina en "$ 0,00".
2. **Módulo Cobranzas**, una entrada nueva: los dos importes usan las funciones de `js/utils.js`; `parseImporteCobranza` ya no existe; el importe del cheque se escribe con `ponerNumero` después de insertar la tarjeta (no con `value=""`); el enlace va antes del listener; el OCR guarda el importe como número; los borradores viejos con "387300" / "387300.5" / "12.500,50" abren igual.
3. **"Cómo trabajar" → lista de suites en `pruebas/`**: sumar `test-cobranzas-numeros.js` / `mut-cobranzas-numeros.js` con sus números, y que `sandbox.js` de Cobranzas carga `fuenteNumeros()` en el preludio.

## Lo que NO se hizo

- **No se probó en un navegador ni en un celular.** Todo está verificado ejecutando el código con `inputFalso()`; lo que falta es tocar los dos campos en un teléfono real (el teclado numérico de iPhone/Android y el cursor al borrar en el medio).
- No se tocó `js/utils.js`, ni otros módulos, ni la base.
- Los `Number()` sobre datos de la base (`htmlFilaCobranza`, `resumenCartera`, `erroresDeCheque`, el historial) quedan como estaban: no leen texto tipeado.
