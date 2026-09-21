# Traspaso — Cobranzas: estados de fotos, doc del autovínculo y rediseño naranja (21/09/2026)

## Baseline FIJO del rediseño

**`fba6396`** — HEAD antes del commit 3.1. Todo "¿se perdió algún control?" compara contra
`git show fba6396:modulos/cobranzas.html`, nunca contra HEAD (`pruebas/controles-cobranzas.js`).

## Hashes (todos en `origin/main`)

| Parte | Hash | Qué |
|---|---|---|
| 2 | `fb4f60c` | CLAUDE.md: `trg_gasto_autovincular_ingreso`, `vincular_ingreso_a_gasto` idempotente, `fn_marcar_edicion_ingreso`. Riesgo de stock doble cerrado en el traspaso del circuito. |
| 1 | `fba6396` | Estados de cada foto al cargar, `foto.enCurso`, reintento con el formulario abierto. |
| 3.1 | `bbb0a79` | Variables naranja, fuera el acento anterior (css, dashboard, cobranzas), `controles-cobranzas.js`. |
| 3.2 | `8413326` | Jerarquía del listado: total neutro, franja + texto de estado, segmentado. |
| 3.3 | `fd0b626` | Tarjeta de cheque en tres niveles, "A la vista", miniaturas fuera de las tarjetas. |
| 3.4 | `5ac8154` | Escala de avisos: neutro / bordó, sin ámbar. |
| 3.5 | `44f6db3` | Escritorio master-detail desde 1100 px. |
| cierre | (el commit de este archivo) | CLAUDE.md y este traspaso. |

La Parte 2 se commiteó antes que la 1 porque se hizo mientras el subagente trabajaba en la 1 (archivos distintos).

## Números al cerrar

(Ver la sección "Números finales" al pie: se completó después de correr todo de nuevo sobre `44f6db3`.)

## Decisiones tomadas sin preguntar

**Parte 1 — fotos**
- `enCurso`, `fase`, `leyendoDesde`, `errorRed` e `intentosLector` son propiedades **no enumerables**: el clonado estructurado de IndexedDB no las copia, así que no llegan al borrador sin tocar `guardarBorrador`. La suite lo verifica con `structuredClone`.
- Errores del lector (no de red): tope de **3 intentos por sesión**, porque cada intento es una llamada paga al modelo. Los de red se reintentan siempre.
- El reintento no corre mientras el sincronizador está trabajando. El primer reintento es a los 30 s o al volver la señal, no al abrir el formulario.
- Una foto subida pero no leída, con señal y sin nada en curso, dice "subida, falta leer los cheques. Se reintenta sola en unos segundos." sin mencionar la señal.

**Parte 3 — rediseño**
- Grosor **600** donde el diseño dice 650; no se tocó el import global de Inter.
- "Chip redundante" = el chip de estado de cada fila; pasó a texto, la franja ya dice el estado.
- Segmentado de **44 px** también en escritorio (el diseño pide 34).
- Días hasta el cobro en pasado: "hoy", "mañana", "desde ayer", "desde hace N días".
- "En cartera" y "Endosado" neutros; el error del lector es aviso neutro (no hay un dato mal).
- `controles-cobranzas.js` cuenta **todos** los `data-*`, no solo los que disparan acciones.
- Escritorio: entre 1100 y 1279 px se esconden Efectivo y Cargada por (siete columnas no entran al lado de 468 px).
- `abrirDetalle` con turno, para que en escritorio la respuesta de la cobranza anterior no pise el panel.
- **"SIN PROCESAR" y "TOTAL DEL MES" no se pusieron**: no hay agregación en la base con los mismos filtros (los agregados de PostgREST no están activados) y sumar en el cliente daría un total falso por la paginación. Hace falta una RPC nueva; es tu decisión.

## Diferencias entre el README del diseño y el código

- `--oliva-oscuro` era `#434C10` en main.css, no `#5A6416`: se reemplazó lo que existía.
- Contraste: el README dice 4,9:1; medido da 5,18:1.
- No existía ningún chip "SIN SUBIR" (lo local es un banner, no filas del listado). No se agregó.
- El texto de validación del renglón es otro ("✓ Cierra…"), deliberado: se dejó.
- La tarjeta abierta tiene "Confirmar cheque" y "Quitar" lado a lado, no un botón de ancho completo: se dejó.
- El recálculo del DV en vivo, el plegado al confirmar y Editar/Quitar en la plegada ya existían.
- "Marcar como procesada" **no pide confirmación** hoy; el README dice que sí. No se agregó.
- Encabezado de escritorio: el diseño muestra barra navy con avatar; quedó el encabezado de tarjeta que ya existe. La barra de módulos es placeholder.
- El prototipo no trae listado de celular: la jerarquía salió del texto del README.

## Lo que no se pudo hacer o verificar

- **Nada se probó en un navegador con sesión real.** Las capturas (fuera del repo, en el scratchpad de la sesión) son de páginas de muestra que ejecutan los renders reales con datos de ejemplo y el CSS real; en escritorio la activación del modo se simula. Se pierden con la sesión.
- La tarjeta del dashboard no se capturó (necesita sesión).
- El encabezado de la columna "Cheques" de la tabla de escritorio se ve truncado ("CHEQU…") a 1440 px: detalle cosmético pendiente (la columna mide 92 px).
- Si la cobranza elegida en escritorio está en una página todavía no cargada, una acción que recarga la lista la suelta.
- Parte 1: sigue el riesgo de que el sincronizador haya tomado un borrador antes de abrirse el formulario y lea la misma foto (se achicó, no se cerró). Y `guardarBorrador()` sigue leyendo `estado.form` (pendiente viejo de CLAUDE.md).

## Guion corto de revisión

**En el celular** (recargá la app para tener la versión nueva):
1. El tile de Cobranzas del inicio y el módulo se ven en **naranja**, no verde oliva.
2. Listado: el total de cada fila en negro; a la izquierda una franja naranja en las registradas y bordó en las anuladas; los filtros Todas / Registradas / … son un selector segmentado.
3. Nueva cobranza con una foto **con señal**: tiene que decir "Subiendo la foto…" y después "Leyendo los cheques con IA… puede tardar hasta un minuto (N s)" con el contador corriendo. **La palabra "señal" no tiene que aparecer.** Al terminar, "✓ N cheques leídos" y ✓ en la miniatura.
4. Poné el celular en modo avión y sacá otra foto: ahí sí "sin señal". Sacá el modo avión con el formulario abierto: la foto se tiene que leer sola (al volver la red o a los 30 s).
5. Una tarjeta de cheque: importe arriba, Emisión · Paga el · N° cheque abajo, banco y cuenta al pie. En un común, "Paga el" dice **"A la vista"**; en un diferido, la fecha y "en N días".
6. Tocá un dígito de un renglón de la banda para romperlo: el aviso sale **bordó**. Los avisos informativos (banda magnética, endoso) son **grises**, ninguno amarillo.
7. En la vista Cheques, un común dice "A la vista".

**En la compu** (ventana de más de 1100 px):
1. El listado se ve como tabla y a la derecha aparece "Elegí una cobranza del listado para verla acá."
2. Clic en una fila: se abre a la derecha sin cambiar de pantalla, la fila queda con fondo naranja suave.
3. Marcá una como procesada o anulá una de prueba: la fila y el panel se actualizan sin perder la selección.
4. Filtrá por "Anuladas" con una registrada abierta: el panel se vacía con un texto gris.
5. Achicá la ventana por debajo de 1100 px: vuelve el flujo de celular de siempre.

## Números finales (sobre `44f6db3`, todo corrido de nuevo al cerrar)

| Chequeo | Resultado |
|---|---|
| check-scripts (todos los HTML) | OK |
| controles-cobranzas (contra `fba6396`) | 350/350 — nuevos: `id:cob-maestro` y `button[data-mini]` |
| test-cobranzas-xss | 320/320 |
| test-cobranzas-fotos | 70/70 |
| test-cobranzas-escritorio | 41/41 |
| test circuito: materia prima / gastos / CC | 113/113 · 57/57 · 78/78 |
| mut-cobranzas-xss | 217/217 (+1 equivalente) |
| mut-cobranzas-fotos | 27/27 (+2 equivalentes) |
| mut-cobranzas-escritorio | 32/32 |
| mut circuito: materia prima / gastos / CC | 33/33 · 21/21 · 39/39 |

Mutaciones corridas de a una, en secuencia. Todos los archivos tocados, sin CR.
