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
  se ven ahí). La pestaña activa va en el tono oscuro del acento del módulo (hoy `--naranja-oscuro`): es navegación, no una
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

---

## Parte 3 — Salida de cheques (commit 3)

### Lo que la base ya tenía (verificado el 21/09/2026, sin crear ni tocar nada)

Consultado con `pg_constraint`, `information_schema.columns`, `pg_get_functiondef`,
`pg_trigger`, `pg_get_viewdef` y `pg_policies`:

- **`cobranza_cheques.estado` tiene CUATRO valores**: `en_cartera`, `anulado`,
  `depositado`, `endosado` (`cobranza_cheques_estado_check`).
- **Cuatro columnas nuevas**, las cuatro nullable: `salida_fecha` (date),
  `salida_destino` (text), `salida_por` (uuid, FK `cobranza_cheques_salida_por_fkey`
  → `empleados`) y `salida_registrada_en` (timestamptz). Dos CHECK:
  - `chk_salida_coherente`: con estado depositado/endosado exige fecha, quién y
    cuándo, y además destino si es endosado; en cualquier otro estado, las
    cuatro en null.
  - `chk_salida_destino`: null o entre 1 y 150 caracteres (sin contar bordes).
  - **`salida_por` es una SEGUNDA referencia a `empleados` en el universo de
    Cobranzas.** El nombre se resuelve contra `v_empleados_publico` en
    `abrirDetalle()`, junto con los del historial, y NUNCA con un embed. Hay que
    corregir la frase de CLAUDE.md que dice "LA ÚNICA FK A `empleados` ES
    `cobranzas.empleado_id`": ya no es la única.
- **`marcar_salida_cheque(p_cheque_id uuid, p_tipo text, p_fecha date, p_destino text)`
  → void.** SECURITY DEFINER, `search_path = public`, `authenticated` sí, `anon`
  no. Exige `cobranzas:procesar` (`tiene_tarea`, CON bypass), tipo
  `depositado`/`endosado`, fecha obligatoria, destino obligatorio si es endosado
  y de hasta 150, la cobranza `procesada`, el cheque `en_cartera`, la fecha no
  futura (`_cobranza_hoy_ar()`) y **no anterior a la fecha de la cobranza**.
  Escribe el historial `cheque_salida` con `despues = {cheque_id, banco_codigo,
  numero, importe, estado, fecha, destino}`.
- **`volver_cheque_a_cartera(p_cheque_id uuid, p_motivo text)` → void.** Mismos
  atributos. Exige `procesar`, motivo, y que el cheque esté depositado o
  endosado. **NO pide que la cobranza esté procesada.** Limpia las cuatro
  columnas y escribe el historial `cheque_vuelve_cartera` con el motivo y
  `antes = {…, estado, fecha, destino, por}` (lo que el cheque ERA).
- **Trigger `trg_cobranza_cheque_proteger_salida`** (BEFORE DELETE OR UPDATE
  sobre `cobranza_cheques`, función `_cobranza_cheque_proteger_salida`): si el
  cheque está depositado o endosado, **bloquea el DELETE y cualquier UPDATE que
  no sea volverlo a cartera o dejarlo igual**. Por eso `editar_cobranza` (que
  borra y reinserta los cheques) y `anular_cobranza` (que los pasa a `anulado`)
  fallan con: *"El cheque 007 Nº 12345678 ya salió de cartera (depositado). Para
  editar o anular esta cobranza, primero volvelo a cartera."* (con los datos del
  cheque). El `delete` de `editar_cobranza` está fuera del bloque que traduce
  errores, así que el mensaje sale tal cual.
- `cobranza_historial.accion` admite `cheque_salida` y `cheque_vuelve_cartera`,
  y `chk_historial_motivo` exige motivo también en `cheque_vuelve_cartera`.
- **`v_cobranzas` NO cambió** (sigue con `security_invoker=true`):
  `total_cheques` suma todos los cheques de la cobranza, incluidos los que
  salieron, que es lo correcto porque la cobranza fue por ese total.
  **`_cobranza_snapshot` no cambió de código**, pero como usa `to_jsonb(q)`, el
  snapshot de cada cheque ahora incluye también las cuatro columnas `salida_*`.
- Las policies no cambiaron: cinco, las cinco `SELECT`.
- Datos al 21/09/2026: 15 cobranzas y 18 cheques (16 en cartera, 2 anulados,
  ninguno salido todavía).

### Qué cambió en `modulos/cobranzas.html`

- **Botón "Salió"** en cada fila en cartera de la tabla, solo con
  `cobranzas:procesar` y solo si la cobranza está procesada (la RPC rechaza
  cualquier otro estado). **"Volver a cartera"** en cada fila que salió, solo con
  `procesar` (sin mirar el estado de la cobranza, igual que la RPC).
  **DECISIÓN tomada sin preguntar: los botones van DEBAJO DEL NÚMERO, en la
  columna fija**, y no en una columna al final: en 375 px la última columna
  queda fuera de la pantalla y habría que ir a buscar el botón. Tocarlos no abre
  la cobranza (`stopPropagation`), y un Enter sobre el botón no abre la fila (la
  fila solo responde al teclado cuando el foco está en ella).
- **Diálogo propio** (nada de `prompt`/`confirm`): "¿Qué pasó con el cheque?"
  con dos botones grandes, Depositado / Endosado; fecha que arranca en
  `hoyArgentina()`, con `max` = hoy y `min` = fecha de la cobranza; con
  Endosado, "¿A quién se lo pasaste?" obligatorio; con Depositado, "¿En qué
  banco o cuenta? (opcional)". Se valida antes de llamar con las mismas reglas
  que la RPC; un destino vacío viaja como null. **Un error del servidor se
  muestra TAL CUAL dentro del diálogo, que queda abierto.**
- "Volver a cartera" reusa el diálogo de motivo que ya usaban anular y reabrir.
- **Detalle:** cada cheque muestra su estado (chip) y, si salió, "Depositado el
  dd/mm/aaaa en X" / "Endosado el dd/mm/aaaa a X", más "Registró la salida:
  nombre". **Agregado sin preguntar:** si la cobranza tiene algún cheque afuera
  (y no está anulada), un aviso ámbar dice que para editarla o anularla primero
  hay que volverlos a cartera. Los botones Editar/Anular siguen visibles: si
  igual lo intentan, el mensaje de la base llega entero.
- **Historial:** "Salida de un cheque" y "Cheque vuelto a cartera", con una
  frase ("Cheque N° 12345678 (Banco): endosado el 12/09/2026 a X." / "…: volvió
  a cartera. Figuraba depositado el 12/09/2026 en X.") más el motivo.
- **`salida_destino` es un sink nuevo de XSS** (lo tipea una persona): va con
  `escCob` en la tabla, en el detalle y en el historial, verificado ejecutando
  los tres renders con texto malicioso.

### LO QUE NO SE PROBÓ: la prueba manual del error en un navegador

**No se hizo.** La pantalla necesita una sesión iniciada y no la tengo. La única
otra vía era crear la cobranza de prueba por SQL haciéndome pasar por un
usuario real (poniendo su uid en los claims del JWT), que equivale a inventar
una sesión, así que se descartó. **No quedó ninguna cobranza de prueba en la
base.**

Lo que SÍ está probado ejecutando el código: con la RPC devolviendo el texto
exacto del trigger, editar muestra el mensaje entero en el error del guardado y
anular lo muestra entero en el aviso. Si alguno se tapara con un genérico, la
suite da rojo (hay una mutación por cada camino).

**Pasos para que Facu lo pruebe a mano** (con una cobranza de prueba que se
note que no es real):
1. Nueva cobranza, cliente "PRUEBA - NO ES REAL", un cheque cualquiera con foto.
2. Detalle → "Marcar como procesada".
3. Pestaña "Cheques" → en la fila del cheque, "Salió" → Depositado → Confirmar.
   Tiene que quedar atenuado, con la etiqueta "Depositado".
4. Tocar la fila → detalle → tiene que aparecer el aviso ámbar → "Reabrir", con
   un motivo.
5. "Editar" → "Guardar cobranza". Debajo del botón tiene que aparecer el mensaje
   entero: "El cheque … ya salió de cartera (depositado). Para editar o anular
   esta cobranza, primero volvelo a cartera."
6. Salir del formulario y tocar "Anular": tiene que salir el mismo mensaje.
7. Limpieza: pestaña Cheques → filtro "Salidos" → "Volver a cartera" con un
   motivo → detalle → "Anular". La cobranza queda anulada y su cheque, anulado.
   Ojo: el paso 5 deja un borrador de edición en el celular; se descarta desde
   el aviso "Hay cobranzas solo en este celular".

### Para Cuentas Corrientes (a futuro)

**Solo el ENDOSADO va a descontar Cuentas Corrientes cuando se conecte**: se le
paga a un proveedor con el cheque. El depositado no. Por eso el destino es
obligatorio en el endoso y opcional en el depósito. Hoy no hay ninguna conexión:
marcar la salida no toca ni Caja ni Cuentas Corrientes.

### Verificación (commit 3)

- `check-scripts` OK. Suite **256/256**. Tests nuevos, todos ejecutados: quién
  ve cada botón (con y sin `procesar`, super_admin, cobranza registrada o
  procesada, cada estado del cheque, y que el botón esté en la columna fija);
  las reglas del diálogo (endosado sin destino, fecha futura, anterior a la
  cobranza, 150/151); los parámetros exactos que viajan; el diálogo abierto
  (fecha, límites, pregunta); confirmar con error local, con error de la base y
  con éxito; volver a cartera (error y parámetros); el error del trigger al
  editar y al anular; detalle e historial con texto malicioso, y el cheque
  depositado y el endosado.
- Mutaciones **170/170** (+2 equivalentes ya declaradas). El guard de unicidad
  abortó una mutación ambigua (la misma línea en la tabla y en el detalle) y se
  ancló a su contexto; después escapó "un depositado no muestra su salida en el
  detalle", que era un hueco real (el test solo usaba un endosado) y se agregó.
- **Lo que la suite NO cubre** (necesita eventos del DOM de verdad): el
  `stopPropagation` de los botones de la fila, el guard del Enter sobre el
  botón, y que `abrirDetalle` sume `salida_por` a los nombres que busca.

---

## Resumen para la sección Cobranzas de CLAUDE.md

- Cuatro estados del cheque: `en_cartera`, `depositado`, `endosado`, `anulado`.
  Un cheque sale de cartera solo por `marcar_salida_cheque` (con la cobranza
  procesada) y vuelve solo por `volver_cheque_a_cartera` (con motivo). Pasa a
  `anulado` solo cuando se anula la cobranza entera.
- El trigger `trg_cobranza_cheque_proteger_salida` impide borrar o anular un
  cheque que salió, así que editar o anular su cobranza falla con un mensaje
  claro que la pantalla muestra tal cual. Hay que volverlo a cartera primero.
- Solo el endosado va a descontar Cuentas Corrientes cuando se conecte.
- Los filtros por número y por banco viven en la vista de cheques, no en la
  lista de cobranzas.
- Sumar las dos RPCs nuevas a la lista de RPCs de Cobranzas, y el trigger, y
  corregir la frase de "la única FK a empleados" (ver arriba).
- No hace falta nada del chat de permisos: ninguna tarea nueva (las dos RPCs
  usan `cobranzas:procesar`, que ya existe) y ninguna firma existente cambió.
