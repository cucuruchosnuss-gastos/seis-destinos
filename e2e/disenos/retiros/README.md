# Handoff: Órdenes de retiro · la carga (depósito)

## Overview
Rediseño del módulo que usa el depósito (Franco, Emanuel, Manuel y Mauricio) para cargar lo que se lleva un cliente, **sobre todo desde el celular**, mientras se sube la mercadería al camión. **No ven precios, saldos ni órdenes de otros.** La valorización y todo lo que tiene plata está en `design_handoff_administracion`.

Usa el sistema de `design_handoff_esqueleto_gestion`: Bricolage Grotesque para títulos y números, Figtree para el texto, grises cálidos, fondo `#F5F3EF`, barra lateral y barra de arriba. El color del módulo es el dorado `oklch(0.55 0.11 108)`.

## About the design files
`Ordenes de Retiro.dc.html` es una referencia de diseño en HTML, no código de producción. Tiene tres grupos de pantallas numeradas: celular (1a–1l), compu (2a–2b) y hoja impresa (3a–3b).

## Fidelity
Alta fidelidad: colores, tipografía, medidas y textos. Datos realistas.

---

## Flujo (celular, 390 × 844)
```
[varias fábricas] 1a Fábrica ─► 1b Cliente ─► 1c Catálogo ─► 1d Lotes ─► 1f La orden ─► 1g Resumen ─► 1h Confirmado
                                              ▲                │ (faltante 1e)   │ + otro producto ─► 1c
                                              └────────────────┘                 └─ Transporte / Observaciones
1h ─► Imprimir · Enviar · Compartir · Cargar otro retiro
Barra inferior: Inicio · Nuevo retiro · Mis retiros (1i)
```
- Arriba, el paso actual en una barra de 4: **Cliente · Productos · Transporte · Confirmar**. La fábrica elegida va siempre a la derecha del título.
- Abajo, una sola acción fija de 56 px en naranja.
- Toques de 44 px como mínimo; renglones de 56–64 px.

### 1a · Fábrica
Solo aparece si la persona tiene más de una. Son tarjetas que llenan el alto, con el **logo** (64 px), el nombre y "El próximo es **N-0012**". Cada fábrica numera con su letra: **N**uss, **D**olce Pasta, **O**rly (Mengui). *Reemplazar los círculos con inicial por los logos reales.*

### 1b · Cliente
- Un buscador de 52 px que busca por **nombre, razón social o apodo**. Lo que coincide se resalta: "los forte" → **Salvador Loforte**, *apodo "Los Forte"*.
- Debajo, los que más retiran de esa fábrica.

### 1c · Catálogo en tres grupos
Cada grupo tiene su encabezado de 40 px, con fondo suave y una raya de 2 px de su color:

| Grupo | Color |
|---|---|
| Producto terminado · SIN CONO | trigo `oklch(0.62 0.12 80)` |
| Producto terminado · CON CONO | ciruela `oklch(0.52 0.12 330)` |
| Materia prima e insumos | gris verde `oklch(0.50 0.05 150)` |

- Cada opción lleva la franja del color del producto (el de la configuración de Producción), el nombre, la pastilla del cono (con cono) y **cuánto hay**: el número grande y la unidad.
- **Lo que no tiene stock no se muestra en la lista; aparece solo al buscar**, al 55 % y con la pastilla bordó "sin stock". Se puede elegir igual y queda como faltante.

### 1d · Varios lotes en un renglón
- Arriba, el producto con su color. Debajo, **¿Cuántas cajas se lleva?** con − / número / +.
- **¿De qué lotes?**: los lotes van del más viejo al más nuevo. El primero lleva la marca "EL MÁS VIEJO". Cada uno muestra la fecha y cuánto queda, y tiene **un campo propio** (76 × 50).
- **Completar con los más viejos** reparte lo pedido empezando por el lote más viejo (42 = 15 + 10 + 17).
- Pie: **Asignado 42 de 42** y "✓ Falta asignar 0" en verde. Si falta asignar, va en gris con el número.

### 1e · Faltante
Si se pide más de lo que hay: "Faltan 14" en bordó y el aviso **"Hay 36 y se lleva 50. Se puede confirmar igual. Las 14 que faltan quedan pendientes de revisión en Administración."** El botón pasa a **Agregar igual**. En Administración aparece en *Retiros por revisar*.

### 1f · La orden armada
- Quién retira (Cambiar).
- Los renglones como tarjetas: borde izquierdo del color del producto, cono, lotes ("7021 ×15 · 7033 ×10 · 7038 ×17") y cantidad grande. El faltante va en bordó dentro del renglón.
- "+ Agregar otro producto".
- **Transporte**: viene cargado el habitual del cliente ("· el de siempre"), con Cambiar.
- **Observaciones**, en texto libre.

### 1g · Resumen
Fábrica y código que va a tener, cliente, transporte, observaciones, renglones y **total**. **Sin precios.** "Sin precios: la valoriza Administración."

### 1h · Confirmado
✓ verde, **el código grande** (84 px) y tres botones de 96 px:
- **Imprimir**: A4, dos copias.
- **Enviar**: PDF por WhatsApp o mail. Abre el menú de compartir del teléfono con el PDF.
- **Compartir**: como texto.

Abajo, "Cargar otro retiro".

### 1i · Mis retiros
Lo que cargó **esta persona** en los últimos 30 días. Cada uno con el logo de la fábrica, el código, el cliente, la fecha y las cajas, más **Reimprimir** y **Reenviar**. Una anulada va tachada y con la pastilla "ANULADA", y se puede reimprimir (sale con el sello).

### Estados
- **1j · Sin datos**: "Todavía no cargaste retiros".
- **1k · Cargando**: el catálogo en gris, con la forma de los grupos.
- **1l · Error al confirmar** (sin señal): "No se perdió nada. Queda guardado en el celular hasta que vuelva la señal." El botón pasa a **Reintentar**. La orden **no toma número** hasta que el servidor la confirma.

---

## Compu (1366 × 768)
- **2a · Nuevo retiro**:
  - A la izquierda, la orden: cliente; tabla **Producto · Lotes (pastillas) · Cantidad**, con el faltante en bordó; transporte y observaciones; pie con el total y "Ver resumen y confirmar".
  - A la derecha (380 px), el catálogo con los tres grupos y su encabezado fijo al scrollear.
- **2b · Mis retiros**: tabla Código · Fecha · Cliente · Cajas · Estado · Reimprimir / Reenviar.
- La barra lateral muestra solo lo que tiene habilitado el depósito (Inicio, Órdenes de retiro, Stock).

---

## Hoja impresa (3a, 3b)
- **A4 con dos copias iguales**: arriba **ORIGINAL — CLIENTE** y abajo **DUPLICADO — DEPÓSITO**, separadas por una línea punteada "✂ cortar acá".
- Cada copia lleva:
  - **Arriba**: el logo a color de la fábrica, "SEIS DESTINOS SAS · CUIT 30-71943477-7", "Unión 843, Córdoba · Tel.", la etiqueta de la copia, "ORDEN DE RETIRO", el **código grande** y la fecha y hora.
  - **Cliente**: razón social, CUIT y domicilio. **Transporte**: empresa y chofer.
  - **Tabla**: # · Producto · Lotes · Cantidad. **12 renglones** de 17 px (10 px de letra) entran en cada copia.
  - **Pie**: observaciones y faltante; **total**; "Cargó: Franco Medina"; **Recibí conforme** con líneas para Firma, Aclaración y DNI; "Documento interno. No válido como factura."
- **Sin precios.**
- **Anulada (3b)**: sello "ANULADA" de 96 px, cruzado (−16°), en bordó, en las dos copias, con fecha, quién y motivo.
- Se genera como PDF (para Imprimir y Enviar). Con más de 12 renglones, pasa a una segunda hoja con el mismo encabezado.
- *Nota*: la letra de la hoja (9–12 px) es más chica que el mínimo habitual de impresión, porque así lo pide el formato de dos copias por A4.

---

## Reglas
- El depósito **no ve precios, saldos ni órdenes de otros**.
- Naranja para lo que se toca y lo elegido; verde para "está completo"; bordó para faltante, sin stock y anulada.
- Los colores de producto son los de `design_handoff_config_produccion`. Los conos llevan pastilla de color, con el tono fijo por cono.
- Castellano rioplatense, sin "usted".

## Decisiones para confirmar
1. Lo sin stock aparece solo al buscar (no en la lista).
2. Sin señal, la orden queda guardada en el celular y no toma número hasta confirmarse.
3. Con más de 12 renglones, la hoja pasa a una segunda página.

## Files
- `Ordenes de Retiro.dc.html` · `logo.png` · `support.js`
