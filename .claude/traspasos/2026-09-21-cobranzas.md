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

---

## Parte 2 — Vista "Cheques" (commit 2)

### Qué cambió en `modulos/cobranzas.html`

- **Pestañas "Cobranzas" / "Cheques"** arriba de las dos vistas de lista (solo
  se ven ahí). La pestaña activa va en `--oliva-oscuro`: es navegación, no una
  acción, y no compite con el botón primario.
- **Vista nueva "Cheques": una tabla estilo planilla, una fila por cheque.**
  Columnas: N° de cheque (el de 8, sin dígito de control), banco (el nombre de
  `bancos_bcra`; si no está, "Banco 999 (no está en el catálogo)" — la misma
  `nombreBanco()` de todo el módulo), emisión, pago ("Al día" en un común),
  importe, cliente, estado y salida (fecha y destino).
- **Arriba, el total en pesos y la cantidad de los cheques EN CARTERA.** Es el
  total de TODA la cartera, no el de los filtros — responde "cuánto tengo en
  cartera". Con un filtro puesto, la tarjeta lo dice con una línea. Si la
  consulta falla, dice "No se pudo calcular" y NUNCA "$ 0,00".
- **Filtro de estado con tres chips:** En cartera (por defecto) / Salidos
  (depositados y endosados) / Todos. **Los anulados solo aparecen con "Todos".**
- **Orden:** por fecha de cobro ascendente — la de pago en un diferido, la de
  emisión en un común —, así lo que se cobra primero queda arriba. A igual
  fecha, por número.
- Los salidos van **atenuados con color** (no con `opacity`: la celda fija se
  volvería transparente) y con la etiqueta "Depositado" / "Endosado". Los
  anulados, tachados.
- **Tocar una fila** (o Enter/espacio con el teclado) abre el detalle de la
  cobranza, que muestra sus fotos. El "Volver" del detalle vuelve a la vista de
  la que se vino (`abrirDetalle(id, { origen })`, parámetro con default y no
  variable suelta) y el botón dice "Volver a los cheques".
- **375 px, verificado en un navegador:** la página mide 375 px de ancho (no
  scrollea de costado); la tabla (841 px de contenido) scrollea dentro de su
  propia caja (342 px) con la columna del número `position: sticky`. Probado
  con una página armada con el CSS real del módulo y la tabla generada por las
  funciones reales, porque la pantalla real exige sesión.

### Los filtros por número y por banco se MUDARON a esta vista

Estaban (sin commitear) en la lista de cobranzas y se resolvían en dos pasos:
buscar en `cobranza_cheques` los `cobranza_id` y después filtrar `v_cobranzas`
con `.in('id', ids)`, con un tope de 200 ids. **Acá se filtra
`cobranza_cheques` directo, así que el `.in()`, el tope y el aviso de truncado
no existen: no entraron al código.** La lista de cobranzas quedó sin filtros de
cheque.

- **Número** (`filtroNumeroCheque`), la regla de los cuatro largos: menos de 8
  dígitos → contiene; 8 → exacto; 9 → exacto sobre los primeros 8, avisando si
  el noveno cierra o no como dígito de control (con la `dvBcra()` del archivo,
  no una copia); más de 9 → avisa y NO filtra por número. **Se cuentan
  dígitos, no caracteres**, y **el patrón del `like` se arma con los dígitos
  ya extraídos, nunca con el texto crudo**: un `%` o un `_` tipeados nunca
  llegan a la consulta.
- **DECISIÓN NUEVA, tomada sin preguntar:** un texto con ALGO escrito pero
  NINGÚN dígito ("%", "abc") da **cero resultados y un aviso**, sin consultar.
  Antes caía en "no filtrar", o sea mostraba todos los cheques.
- **Banco** (select): la lista sale de **todos los cheques visibles, sin
  ningún filtro** (una sola consulta, `cargarResumenCheques`, que arma también
  el total en cartera) y se recarga con esa misma consulta al guardar, anular,
  reabrir y marcar una salida (`refrescarListado`). Si el banco elegido deja
  de tener cheques, queda igual como opción, para que el selector no diga
  "Todos" con el filtro puesto.
- **"Limpiar filtros"** borra los tres —estado vuelve a "En cartera", número y
  banco en blanco—, en el estado Y en los campos, y vuelve a consultar. Solo
  aparece con algún filtro puesto. Verificado ejecutándolo.

### EL TOPE MEDIDO DEL `.in()`, por si vuelve a hacer falta

Medido contra el PostgREST de este proyecto el 17/09/2026, con uuids reales en
la query (`id=in.(...)` viaja en la URL): **650 ids (24.128 B de URL) todavía
entran; 700 ids (25.978 B) ya se rechazan; de 1200 para arriba la conexión se
corta sin respuesta.** El código viejo usaba 200 (unos 7,5 KB), más de tres
veces por debajo, porque en el camino hay proxies que cortan antes y no se
pueden medir desde acá. Hoy ese código no existe.

### Límites conocidos (declarados en pantalla, no silenciosos)

- **PostgREST devuelve 1000 filas por defecto.** La tabla, la consulta de
  cobranzas (de donde sale el cliente) y el resumen avisan si llegan a 1000.
  Hoy hay 11 cheques.
- **El cliente sale de una segunda consulta con TODAS las cobranzas visibles**
  (`id, cliente, estado, fecha`), sin embed —el módulo no usa embeds entre
  estas tablas— y sin `.in()`, que es justo lo que tenía tope. Un cheque cuya
  cobranza no llegó muestra "—", nunca "undefined".
- RLS: con solo `cobranzas:cargar` la persona ve sus propios cheques, así que
  su total y su lista de bancos son los suyos. No se completa con `bancos_bcra`.

### Verificación (commit 2)

- `check-scripts` OK. Suite **195/195**. Tests nuevos ejecutados: los cuatro
  largos del número; `%`, `%%_`, `6625%`, `12_4` y `a%b1` contra un
  constructor de consultas que anota lo pedido (ningún patrón `like` tiene otra
  cosa que dígitos entre los `%`; un `%` solo no consulta); los tres estados;
  el orden; el total (en centavos, con importes que arrastran error de punto
  flotante); el total ante un error; cada columna de la tabla con texto
  malicioso; el selector de banco; limpiar; vacío y error; y el CSS de la
  columna fija y del scroll.
- Mutaciones **139/139** (+2 equivalentes ya declaradas), incluidas 23 de
  comportamiento de esta vista. Tres escaparon en la primera corrida y se
  investigaron antes de agregar nada: un `escCob` innecesario sobre un número
  (se sacó), un caso de prueba que no distinguía sumar en centavos (0,1 y 0,2
  dan exacto; se cambió por 1,1 + 2,2 + 0,29) y el camino de error del resumen
  sin test (se agregó).
