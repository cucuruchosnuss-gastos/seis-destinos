# Traspaso — Ingreso (materia-prima): "Facturas por ingresar" y burbujas de pendientes (24/09/2026)

Para el chat de arquitectura. Quien lo recibe no vio el trabajo: todo lo necesario está acá.

## Qué cambió

Archivo: `modulos/materia-prima.html` (y sus suites en `pruebas/`). **Cero SQL corrido**: Supabase estuvo en solo lectura; las dos RPCs nuevas (`facturas_sin_ingreso`, `crear_ingreso_desde_comprobante`) ya existían y se leyeron con `pg_get_functiondef` antes de construir.

### 1. "Facturas por ingresar" — el circuito en el otro sentido

Hasta ahora el circuito Ingreso ↔ Gastos ↔ Cuentas Corrientes iba de Ingreso a la plata. Ahora también va al revés: una factura de insumos que se cargó por Gastos o por Cuentas Corrientes y cuya mercadería nunca entró al stock.

- **Pantalla nueva** `pantalla-por-ingresar` (drill-down por `hidden`, como "Ingresos internos"), con acceso desde la pantalla principal: botón **"Facturas por ingresar (N)"**, visible **solo con `materia_prima:cargar`** (con bypass de super_admin) y **solo si hay alguna** (o si la lista no se pudo leer).
- La lista sale de **`facturas_sin_ingreso()`**. Cada tarjeta: proveedor (o razón social), fecha, número, tipo, unidad, un chip de origen ("Cuenta corriente" / "Gasto pagado") y el importe (un importe null dice **"—"**, nunca "$ 0"). Arriba, **siempre que haya filas**, el aviso exacto: *"Estas son facturas de insumos que todavía no tienen ingreso. Si la mercadería ya está contada en el inventario, no la cargues: quedaría contada dos veces."*
- **Los gastos que también están en "Pagado sin ingresar" se sacan de esta lista**: son la misma factura con otra puerta, y esa puerta ya vincula el gasto. Dos botones para el mismo papel es cómo se carga dos veces.
- **Aviso de gemelas** (no bloquea): el mismo papel dos veces en la lista (mismo proveedor + mismo número normalizado con la regla de `normalizar_numero_doc`, replicada en `claveNumeroDocMp`), y "ya hay un ingreso con este número de este proveedor".
- **"Cargar lo que entró"** → `crear_ingreso_desde_comprobante({ p_origen, p_id })` (exactamente esos dos parámetros, por nombre), botón trabado mientras manda. Sus mensajes propios van **tal cual**; un error crudo de CHECK (`23514`, o que mencione "check constraint"/"violates") se muestra como *"No se pudo crear el ingreso: la base rechazó el tipo de comprobante. Avisale a administración."* y el crudo va a consola. Con el `ingreso_id`, la lista se recarga (la factura sale) y se abre el wizard en el **modo nuevo "completar ingreso existente"**.

### 2. El wizard en modo "completar ingreso existente"

No hay pantalla de edición de ingresos, así que el wizard ganó un modo (`estado.wizard.completar = { ingresoId, cabecera, foto, ocr }`):
- Lee la cabecera de `materia_prima_ingresos`, llena el encabezado con ella (tipo, número, razón social, fecha, unidad, proveedor) y **va directo al paso de ítems** — con todas sus reglas de siempre: catálogo, alias, presentaciones, lote, categoría obligatoria al crear, recepción parcial.
- **La foto a la vista**: se baja de Storage por su ruta (`rutaFotoMp`, que también extrae la ruta de una URL firmada vieja; un `javascript:` da null y no se baja ni se dibuja), la miniatura sale del blob local (por propiedad, nunca interpolada), y "Ver foto →" firma a 300 s al tocar.
- **OCR detallado**: ese mismo archivo va a `ocr-materia-prima` (no al de Gastos) y los renglones leídos se **proponen** (se agregan, sin pisar lo que se haya cargado a mano). Un PDF va como PDF. Si la foto no se puede bajar (la raíz de otra persona pide `gastos:ver_exportar` o `cuentas_corrientes:ver_todo`) o el OCR falla, se dice y se carga a mano.
- **Confirmar inserta SOLO los renglones** (`materia_prima_items`, el mismo `flatMap(filasItemParaBase)` de siempre, UN insert) con el `ingreso_id` de esa cabecera. **No** inserta otra cabecera, **no** llama a `registrar_factura_de_ingreso` ni a `vincular_ingreso_a_gasto`, y **si el insert falla NO borra la cabecera** (al revés que el camino normal: la creó la RPC y quedó vinculada): se dice y se puede reintentar, sin volver a crear los productos nuevos ya creados.
- No pide el "Total de la factura" ni dibuja la casilla "mercadería que ya estaba" (`sin_stock_motivo` es inmutable después de crear la cabecera; el aviso de la lista cubre ese caso).
- Volver desde los ítems sale del wizard (con confirmación si hay renglones cargados) y recarga el listado.

### 3. "Faltan los renglones"

Si la persona toca "Cargar lo que entró" y abandona, la factura sale de la lista pero el ingreso queda vacío. Se resuelve **sin tocar la base**: en el listado y en el detalle, un ingreso **con 0 renglones, con `gasto_id` o `factura_pendiente_id`, que no es remito ni factura vinculada a un remito** dice *"Faltan los renglones…"* y ofrece **"Cargar lo que entró"** (con `materia_prima:cargar`), que reabre el mismo modo con ese `ingreso_id`. El listado ya traía los renglones en su embed (`cantidadItems`), así que no hizo falta ninguna consulta. Al 24/09/2026 no hay ningún ingreso sin renglones en la base (verificado).

### 4. Burbujas de pendientes adentro del módulo

`mis_pendientes()` (la misma RPC del dashboard, sin tocarla) al abrir y en `visibilitychange`, con turno. Si falla, ninguna burbuja; 0/null/''/decimales/negativos no dibujan nada; el número es el de la RPC; `title`/`aria-label` escapados. Clase local `.burbuja-mp` (la receta de `.tarjeta-modulo__burbuja`, en línea).
- `stock:transferencias_por_aceptar` → burbuja en el botón **"Ingresos internos"** (que solo aparece con `stock:recibir_transferencia`).
- `materia_prima:insumos_por_revisar` → una línea en la pantalla principal: burbuja + "insumos nuevos por revisar" + **"Revisarlos en Stock →"** a `stock.html?vista=catalogo`.
- `materia_prima:pagado_sin_ingresar` → **sin burbuja aparte**: el título "Pagado sin ingresar (N)" ya sale de `gastos_sin_ingreso()` y la RPC cuenta `count(*)` de esa misma función con el mismo usuario: coinciden por construcción (la suite lo compara contra el agrupado REAL del dashboard).

## Hallazgos de la base (NO se pueden arreglar desde el módulo)

1. **`crear_ingreso_desde_comprobante` HOY FALLA SIEMPRE.** Inserta `tipo_doc = coalesce(tipo_documento,'factura')` sin traducir, y los valores reales de las 36 filas son `'Factura A'`, `'Factura C'`, `'Factura X'`, `'Otro'` o null, mientras `materia_prima_ingresos_tipo_doc_check` solo admite `remito` / `factura_a` / `factura_x` / `sin_comprobante` (verificado con `pg_get_constraintdef`). Hace falta mapear en la RPC (`'Factura A'`→`factura_a`, `'Factura X'`→`factura_x`, y decidir qué hacer con `'Factura C'`, `'Otro'` y null — el CHECK no tiene `factura_c`). Hasta entonces la pantalla muestra el texto para una persona.
2. **El mismo papel aparece DOS veces en `facturas_sin_ingreso()`**: un gasto de un proveedor con cuenta corriente deja su factura espejo (`facturas_pendientes.origen_gasto_id`), y la función devuelve las dos. Medido el 24/09/2026: **5 pares sobre 36 filas**. Y `crear_ingreso_desde_comprobante` solo mira su propia columna, así que cargar una no impide cargar la otra → **mercadería contada dos veces**. La pantalla lo avisa (no bloquea); el arreglo de fondo es que la función excluya el espejo (o lo junte con su gasto) y que la RPC rechace si la gemela ya tiene ingreso.
3. `facturas_sin_ingreso()` no filtra por `fecha_inicio_circuito_stock()`, a diferencia de `gastos_sin_ingreso()`. Por eso aparecen las ~36 viejas y por eso el aviso de "ya contada en el inventario" es obligatorio. Si se decide filtrar, el aviso puede quedar igual.

## Qué se verificó y contra qué

- Cuerpos de `facturas_sin_ingreso`, `crear_ingreso_desde_comprobante`, `normalizar_numero_doc` y `mis_pendientes` (`pg_get_functiondef`), el CHECK de `tipo_doc` (`pg_get_constraintdef`), las policies de `materia_prima_items` (`pg_policy`: insertar pide `materia_prima:cargar` en la unidad del ingreso), y conteos de datos (36 filas, 5 gemelas, 0 ingresos sin renglones).
- Suites (todo ejecutado, código real en sandbox):
  - `test-materia-prima-por-ingresar.js` **130/130**, `mut-materia-prima-por-ingresar.js` **51/51**. Incluye invariantes contra el baseline fijo `fb3be49` (`filasItemParaBase`, `filaItemParaBase`, `crearInsumosNuevos`, `fusionarEntregas`, `guardarAliasNuevos`, `itemDesdeOcr` idénticas).
  - `test-materia-prima-pendientes.js` **38/38**, `mut-materia-prima-pendientes.js` **19/19** (el guard de null/'' en `cantidadPendiente` es equivalente y está declarado en el runner).
  - Las viejas siguen verdes: circuito 117/117 (mut 33/33), fotos 57/57 (14/14), números 87/87 (32/32), sin-stock 41/41 (15/15), xss 167/167 (124/124). Tres ajustes con motivo: un stub de `renderizarAccesoPorIngresar` en la suite del circuito, las entradas nuevas de SEGURAS + el stub de `abrirCompletarIngreso` en la de xss, y el ancla de una mutación del circuito que ahora lleva el `!w.completar &&`.
  - `pruebas/check-scripts.js`: OK.
- **NO probado**: nada en un navegador con sesión ni contra la base real (el camino feliz de "Cargar lo que entró" no se puede probar hasta que se arregle el hallazgo 1). Guion para Facu cuando esté arreglado: (1) abrir Ingreso con `materia_prima:cargar` y ver "Facturas por ingresar (N)"; (2) tocar "Cargar lo que entró" en una factura con foto: tiene que abrir los ítems con la foto arriba y los renglones propuestos; (3) confirmar y ver que la factura desaparece de la lista y el ingreso aparece con sus renglones; (4) repetir con otra y salir sin cargar: el ingreso tiene que aparecer con "Faltan los renglones" y el botón tiene que reabrir el modo; (5) con una transferencia pendiente, ver la burbuja en "Ingresos internos".

## Qué tocar en CLAUDE.md

1. **Circuito Ingreso ↔ Gastos ↔ Cuentas Corrientes**: agregar el sentido inverso (`facturas_sin_ingreso()`, `crear_ingreso_desde_comprobante(p_origen, p_id) → {ingreso_id}`, que crea SOLO la cabecera vinculada), y en "Dónde se ve, por módulo → Ingreso" la pantalla "Facturas por ingresar" y el modo completar. Anotar los hallazgos 1–3 de arriba como pendientes de la base.
2. **Módulo 6 (Ingreso)**: una entrada "FACTURAS POR INGRESAR — el circuito inverso" con lo de las secciones 1–3, y otra "BURBUJAS DE PENDIENTES" con la sección 4. En "Pendientes conocidos del módulo", sacar/matizar "No existe pantalla de edición de un ingreso": sigue sin existir, pero el wizard tiene un modo que agrega renglones a un ingreso existente.
3. **Dashboard — burbujas**: anotar que Ingreso muestra adentro `stock:transferencias_por_aceptar` (en "Ingresos internos") e `insumos_por_revisar` (línea con link a `stock.html?vista=catalogo`), y que `pagado_sin_ingresar` coincide por construcción con el título de su lista.
4. **Reglas de oro → suites**: sumar `test/mut-materia-prima-por-ingresar.js` y `test/mut-materia-prima-pendientes.js`.

No hacen falta tareas nuevas ni cambios de permisos (se usan `materia_prima:cargar`, `stock:recibir_transferencia` y `stock:gestionar_catalogo`, que ya existen). Ninguna RPC cambió de firma.
