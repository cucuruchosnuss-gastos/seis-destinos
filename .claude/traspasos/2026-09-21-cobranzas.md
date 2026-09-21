# Traspaso al chat de arquitectura — Cobranzas: renglones del cheque (21/09/2026)

**Qué hay que hacer con esto:** actualizar la sección Cobranzas de CLAUDE.md. Este
archivo se va completando commit a commit en la misma tanda; la versión final
está en el último commit de la tanda.

---

## Parte 1 — Los renglones del cheque (commit 1)

### Qué cambió en `modulos/cobranzas.html`

1. **El pie de cada renglón de la tarjeta de revisión tiene TRES estados, y nunca
   dos pies a la vez** (función `pieRenglon` dentro de `htmlTarjetaCheque`):
   - **no cierra** (`mal`): "No coincide con el dígito de control, revisá contra el papel."
   - **cierra y el OCR NO completó nada desde la banda magnética**: "✓ Cierra. Se
     guarda 66259862 y el 8 queda aparte, como dígito de control." El desglose
     REEMPLAZA al ✓ viejo, no se suma abajo.
   - **cierra pero el cheque vino con `controles.completado_desde_cmc7`**: sin ✓ y
     sin desglose. Dice que el dígito no se leyó del papel y manda a mirar el
     cheque. Motivo: ahí el dígito lo CALCULÓ el sistema, así que un ✓ afirmaría
     un control que nadie hizo.
   - vacío o incompleto: sin pie.
2. **Los rótulos** de los renglones dicen "…y el dígito de control del banco,
   como está impreso".
3. **Los renglones se PRELLENAN separados, como en el placeholder** (función nueva
   `renglonComoImpreso`): desde el OCR o desde la base llegan como
   `285-386-3218 6`, `66259862 8`, `09420314667 0`, y ya no pegados
   (`662598628`). Pegado, el dígito se lee como la última cifra del número.
   `aplicarRenglones()` se queda solo con los dígitos, así que lo que se guarda
   no cambia. Un renglón con algún dato faltante se prellena VACÍO, no a medias.
   (Antes, un `dv` `undefined` desde el OCR producía el texto "…undefined".)

### Verificación del punto (f): el número pegado a su dígito

Revisado el archivo entero, no solo el render nuevo. **Ninguna pantalla muestra
el número pegado a su dígito**: el detalle, la tarjeta plegada, el historial
(`resumirCambios` arma `banco-sucursal-numero-cuenta` sin dígitos) y el aviso de
duplicado muestran el número de 8 sin el dígito. El único lugar donde van juntos
es el propio input del renglón, que es donde se tipea "como está impreso"; ahí
el prellenado pasó a ir separado (punto 3 de arriba).

### HALLAZGO que hay que decidir: `completado_desde_cmc7` es POR CHEQUE, no por renglón

Verificado en `supabase/functions/ocr-cheques/index.ts`: el flag se pone en
`true` si **cualquiera** de los tres renglones se completó desde la banda. El pie
nuevo lo muestra en los TRES renglones, así que en un renglón que el OCR sí leyó
del papel el texto actual ("Este dígito lo calculó el sistema…") **afirma algo
falso**. Es del lado seguro —manda a mirar el papel—, pero es falso.

- **El texto actual se dejó en el código, como se pidió.**
- El arreglo de fondo es que la Edge Function devuelva QUÉ renglones completó
  (ej. `completado_desde_cmc7_renglones: ['r2']`). Es territorio de Cobranzas y
  no se hizo en esta tanda. Mientras no exista, cualquier redacción tiene que
  hablar del CHEQUE y no del renglón.

### Tres redacciones alternativas para que elija Facu

Las tres hablan del cheque —que es lo único que el sistema sabe— y ninguna
afirma que se controló algo.

- **Actual (queda en el código):** "Este dígito lo calculó el sistema desde la
  banda magnética: no se leyó del papel. Contralo contra el cheque."
- **Opción A:** "Puede que este renglón no se haya leído del papel: en este
  cheque el sistema completó datos desde la banda magnética y calculó su dígito.
  Comparalo con lo impreso."
- **Opción B:** "En este cheque, algún renglón lo armó el sistema con la banda
  magnética de abajo, y ahí el dígito es calculado, no leído. Revisá que este
  coincida con el papel."
- **Opción C:** "Sin verificar: en este cheque hubo datos que salieron de la
  banda magnética y no del recuadro. Compará este renglón con el cheque antes de
  confirmarlo."

### Verificación (commit 1)

- `node pruebas/check-scripts.js` → OK.
- `node pruebas/test-cobranzas-xss.js` → 126/126 verde. Tests nuevos EJECUTAN
  `htmlTarjetaCheque` con renglones válidos (el dígito se calcula con la
  `dvBcra` real del archivo) y afirman renglón por renglón: el desglose con el
  corte correcto, un solo ✓; con CMC-7 cero ✓ y cero desglose; con un dígito
  mal, el error y nada más; vacío/corto sin pie; texto malicioso con los dígitos
  justos → el pie muestra solo dígitos y el value sale escapado. Más el
  prellenado desde la base y desde el OCR.
- Contraprueba: la suite de renders (`SOLO=render`) contra el archivo de
  `7e1091f` da **101/112 ROJO** (11 fallas, todas del pie nuevo).
- `node pruebas/mut-cobranzas-xss.js` → **98/98 detectadas** (+2 equivalentes
  ya declaradas). Suma 6 mutaciones de COMPORTAMIENTO con ancla única: el caso
  CMC-7 mostrando el desglose, el desglose pegando el número, un renglón corto
  con desglose, un renglón mal sin aviso, el prellenado pegado y el prellenado
  a medias.
