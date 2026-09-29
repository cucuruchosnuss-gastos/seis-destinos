# Handoff: Producción · Configuración (compu y celular)

## Overview

Rediseño de la **Configuración de Producción**, dentro de la gestión de Producción. Secciones: Productos, Máquinas, Recetas, Ingredientes, Conos y Personal y PINes.

Usa **el mismo sistema visual** que `design_handoff_esqueleto_gestion`: tipografía, colores, barra lateral y barra de arriba. Los tokens están en ese README y acá no se repiten, salvo los colores nuevos de producto.

Resuelve dos problemas:
1. Todo era grande, había mucho scroll y se veía poca información.
2. Los tres niveles (producto → presentación → empaque) se veían iguales y no se entendía qué pertenecía a qué.

## About the design files

`Configuracion Produccion.dc.html` es una **referencia de diseño en HTML**, no código de producción. `support.js` solo sirve para abrirlo en el navegador. Cada pantalla tiene un número (1a…7b).

## Fidelity

Alta fidelidad en colores, tipografía, medidas y textos. Datos de ejemplo realistas. Las *decisiones de diseño* están marcadas.

---

## Pantallas

| # | Pantalla | Estado que muestra |
|---|---|---|
| 1a | Productos · Cucuruchón Mini | Presentación **sin empaque**, marcada para completar |
| 1b | Productos · editando el empaque | Editor abierto en el mismo renglón |
| 1c | Productos · Cucuruchón Grande | **Muchas presentaciones** (7) |
| 2a | Máquinas | Receta vigente v3 |
| 3a | Recetas · Máquina 1 | **Historial de 3 versiones** |
| 3b | Recetas · comparar v2 con v3 | Cambios marcados |
| 4a | Ingredientes · Grasa | **Sin insumo conectado** |
| 4b | Ingredientes · Harina | 4 insumos conectados |
| 5a | Conos | **Lista filtrada** ("cas") y por revisar arriba |
| 6a | Personal y PINes | Una fila cambiada |
| 7a | Celular · lista de productos (Dolce Pasta) | Barquillos y especiales |
| 7b | Celular · detalle de un producto | Presentación sin empaque |

---

## Estructura común (compu, 1366 × 768)

Esqueleto: barra lateral (Producción activa) + barra de arriba (la fábrica elegida filtra todo).

Contenido, con padding `14px 24px 18px`, en columna y **sin scroll de página**:
1. **Encabezado** (30 px): ícono de Producción · "Producción / **Configuración**" (Bricolage 22/700) y a la derecha las **pestañas de sección** en un segmentado (`#EDE9E3`, botones de 30 px). La activa va en blanco con letra `#8F2F08` 700. Burbujas: Ingredientes **3** en bordó (sin insumo), Conos 2 y Personal 2 en gris.
2. Solo en Productos: la barra de **caja predeterminada** (40 px).
3. **Lista | Detalle**: `grid-template-columns: 300px minmax(0,1fr)`, `gap: 14px`, alto hasta abajo. Cada panel tiene **su propio scroll** y la página no se mueve.

### Lista (izquierda)
- Panel blanco, radio 14. Arriba, un buscador de 36 px que filtra desde la primera letra, y "+ Nuevo" (borde naranja).
- Si hace falta, un aviso bordó debajo del buscador ("3 ingredientes no llevan lote").
- Renglones de **42 px** (padding 4/8, radio 9): franja de color de 8 × 28 (solo productos) · nombre 14/600 · detalle 12.5 `#6B645A` · pastilla a la derecha.
- **Elegido**: fondo `#FDEEE4`, nombre `#8F2F08` 700. Apagado: 50 % de opacidad y pastilla "Apagado".
- Subtítulos de grupo en 11.5/800 mayúsculas `#9A9287`.

### Detalle (derecha)
- Todo se edita **en el mismo panel**, sin saltar de pantalla.
- Tablas con encabezado de 30 px (12/700 mayúsculas `#9A9287`) y filas de **38–44 px** con divisor `#F3F0EB`.
- Interruptores: 34 × 20 en tablas y 38 × 22 en cabeceras. Prendido en naranja, apagado en `#D6CFC4`.

---

## 1 · Productos

### Color por producto
Cada producto tiene un color, y **todo lo que le pertenece lo lleva**: la franja en la lista, el bloque de arriba del detalle (fondo suave + borde superior de 5 px), el punto de cada presentación y la pastilla "×320".

Fórmula: color `oklch(L C H)`, fondo suave `oklch(0.955 C×0.3 H)`, texto sobre el suave `oklch(min(L,0.5)−0.06 C×0.8 H)`.

| Producto | L C H |
|---|---|
| Mini | 0.78 0.15 95 (amarillo) |
| Chico | 0.60 0.14 145 (verde) |
| Grande | 0.68 0.16 50 (naranja durazno) |
| Standard | 0.52 0.15 300 (violeta) |
| Mini / Chico / Grande / Standard Chocolate | marrones: 0.60 0.08 70 · 0.48 0.07 55 · 0.36 0.05 45 · 0.68 0.07 75 |
| Barquillos 35/40/45 de 4 | trigo: 0.78 0.10 85 · 0.68 0.11 75 · 0.58 0.10 65 |
| Barquillos 35/40/45 de 3 | trigo más apagado: 0.80 0.07 100 · 0.70 0.07 90 · 0.60 0.07 80 |
| Soft · Cubanón · Canoli · Capelina · Obleas · Vaso 125 | 0.66 0.13 350 · 0.56 0.13 35 · 0.58 0.10 120 · 0.50 0.13 320 · 0.74 0.06 80 · 0.52 0.07 195 |

*Decisión de diseño*: **Grande** va en un naranja durazno más claro que el `#C2410C` de acción, para que no se confunda con "lo que se toca". El verde de **Chico** es más claro que el verde de "bueno" y nunca se usa en textos de estado. El color de producto lo elige el admin (paleta cerrada de estas 20 opciones) y se guarda en el producto.

### Lista
Primero **COMUNES** (Mini, Chico, Grande, Standard), después **DE CHOCOLATE**. En Dolce Pasta: **BARQUILLOS** y **ESPECIALES**. Cada renglón: nombre · "Común · 5 presentaciones" · pastilla bordó "1 sin empaque" si alguna presentación no tiene empaque, o "Apagado".

### Caja predeterminada
Barra de 40 px arriba de la lista y del detalle: "Caja predeterminada de Cucuruchos Nuss: **Caja N°1 Nuss** · se sugiere en cada presentación nueva" + **Cambiar**.

### Detalle
- **Cabecera** en el color del producto: nombre (Bricolage 23/700) · "Masa Común" · "5 presentaciones" · interruptor Activo · Editar nombre.
- **Presentaciones** en tabla: `minmax(0,1fr) 64px minmax(0,3.3fr) 46px` → Presentación (con "Con cono / Sin cono" debajo) · Por caja · **Empaque por caja** · Activa. La línea del empaque **nunca se corta**: si no entra, pasa a 2 renglones.
- **El empaque en una línea legible**: "Caja N°1 Nuss · 1 bolsa grande · 1 plancha · 3 separadores", con ícono de caja y chevron naranja. Hover `#FFF8F3`. Tocar abre el editor.
- **Sin empaque (1a)**: pastilla bordó "**Falta el empaque**" + "Completar ›" en naranja. Además suma a la pastilla de la lista.
- La presentación apagada queda al 50 %.

### Editor de empaque (1b)
Se abre **debajo del renglón**, dentro de la tabla: borde naranja 1.5 px, fondo `#FFF8F3`, radio 12.
- **Caja** (izquierda): opciones de 38 px con radio. La elegida lleva borde naranja. La predeterminada de la fábrica lleva la pastilla gris "★ Sugerida".
- **Insumos que consume por caja** (derecha): `minmax(0,1fr) 60px 168px 24px` → insumo (desplegable) · cantidad · **cuándo** (Siempre / Si es con cono / Si lleva doble bolsa) · quitar. "+ Agregar insumo".
- **Pie**: "Va a quedar: …" con la línea resumida tal como se va a ver, Cancelar y **Guardar empaque**.
- Un solo editor abierto a la vez. Si hay cambios sin guardar y se toca otro renglón, se pregunta.

### Muchas presentaciones (1c)
Con 7 presentaciones de 44 px, la tabla entra entera en 1366 × 768. Si hay más, scrollea **solo el panel de detalle**.

---

## 2 · Máquinas (2a)
- Lista: "Máquina 1 · Orden 1 · receta v3" + Activa/Apagada.
- Detalle: nombre · **orden en la tablet** (▲ 1 ▼) · interruptor Activa.
- **Receta vigente**: pastilla "v3" (color de Producción) · "desde el 14/08/2026 · la cambió Facundo Usabarrena" · ingredientes en 2 columnas de 36 px (con "sin insumo" en bordó cuando corresponde) · **Ver historial · 3 versiones** · **Nueva versión** (lleva a Recetas).
- Abajo, "Hace:" con los productos en sus pastillas de color.

## 3 · Recetas
### 3a · Receta con historial
- Lista por máquina: "v3 · desde 14/08/2026 · 3 versiones".
- Cabecera: "Receta de la Máquina 1" · segmentado de versiones (**v3 · vigente** / v2 / v1) · Comparar versiones · **Nueva versión**.
- Tabla `minmax(0,1fr) 96px minmax(0,1.3fr)`: Ingrediente · **Cantidad (kg)** a la derecha con tabular-nums · Insumo del depósito (o "Sin insumo · no lleva lote" en bordó). Total de la masa al pie en Bricolage 17/800.
- **Historial** a la derecha: una tarjeta por versión con la versión, "Vigente" (negro), la fecha, quién y **qué cambió** ("Azúcar 12,00 → 12,50 · …").
- **Nueva versión** copia la vigente y la abre para editar en la misma tabla. Al guardar pide un motivo, pasa a ser la vigente, y **la anterior queda en el historial sin cambios**. Las masas guardan con qué versión se hicieron.

### 3b · Comparar
- Dos desplegables (v2 → v3) y Cerrar.
- "3 cambios" en naranja suave. Tabla: Ingrediente · v2 (antes) · v3 (ahora) · Cambio.
- **Fila que cambió**: fondo `#FFF8F3`, valor viejo tachado, nuevo en 700 y diferencia "+ 0,50 kg" en `#8F2F08`. Lo que quedó igual va en gris con "—".
- *Decisión de diseño*: la diferencia no va en verde ni en bordó, porque subir o bajar un ingrediente no es bueno ni malo.
- Pie: quién hizo la versión, cuándo y el motivo, + "**Volver a la v2 (crea la v4)**", que nunca borra nada.

## 4 · Ingredientes
- Lista: los 9 ingredientes con "4 insumos conectados". **Grasa, Colorante y Fécula** llevan pastilla bordó "No lleva lote" y aviso arriba de la lista. **Agua** va con "A propósito" en gris, porque no necesita lote.
- **4a · Sin insumo**: bloque bordó "La Grasa no tiene ningún insumo del depósito conectado", con qué consecuencia tiene y **Conectar insumo**. Debajo, "En el depósito hay estos, que podrían ser", con **Conectar** en cada uno (sugeridos por nombre parecido).
- **4b · Con insumos**: tabla Insumo del depósito · En depósito · Último lote · Quitar. Harina = Júpiter, Chacabuco, La Clásica, Wali. "+ Conectar otro insumo".
- Abajo de los dos: "Lo usan:" las máquinas con su cantidad.

## 5 · Conos (5a)
Sección de una sola columna (no tiene detalle: todo se hace en el renglón).
- "351 conos del catálogo · 26 activos".
- **Por revisar** siempre arriba, en bloque `#FFF8F3`: cono · quién lo cargó, en qué sublote y cuándo · **Rechazar** · **Aceptar**.
- Buscador (con borde naranja cuando tiene texto y × para borrar) + filtro **Todos 351 / Activos 26 / Apagados 323 / Por revisar 2** + "6 conos con 'cas'".
- El buscador **filtra desde la primera letra** y resalta lo que coincide con fondo `#FDEEE4`.
- Tabla de 40 px: Cono · Cliente · **Doble bolsa** (casilla de 20 px) · Estado (Aceptado gris / Por revisar naranja suave / Rechazado bordó) · **Activo** (interruptor). Encabezado fijo al scrollear.
- Se guarda al tocar, renglón por renglón, igual que antes.

## 6 · Personal y PINes (6a)
- Una fila de 40 px por persona: Persona · **Encargado / Masero / Operario** (casillas de 20 px) · PIN (**PIN propio** verde / **Por cambiar** gris / **Sin PIN** bordó) · Asignar PIN o Resetear PIN · "Cambiada".
- Arriba: buscador y "Generar PIN a los que no tienen · 2". Abajo, fijo: "**Guardar los cambios · 1 fila**".
- La fila cambiada lleva fondo `#FFF8F3`. La hoja de PINes para imprimir no cambia (ver `design_handoff_produccion_gestion`, 3c).

---

## Celular (390 × 844)
- Barra de arriba: ‹ atrás (44 px) · qué hay detrás en chico ("Configuración") · el título · la fábrica.
- **7a · Lista**: buscador de 44 px y renglones-tarjeta de **52 px** con la franja de color, nombre, detalle, pastilla y ›. Mismos grupos que en compu.
- **7b · Detalle**: bloque del color del producto (masa, cantidad, Activo). Cada presentación es una tarjeta: arriba nombre, cono, ×240 e interruptor; abajo, **en una franja de 44 px, el empaque en una línea** (tocar abre el editor a pantalla completa). Sin empaque: franja bordó "Falta el empaque · Completar ›".
- Las otras secciones siguen igual: lista → detalle a pantalla completa. Las tablas pasan a renglones de dos líneas.
- Barra inferior del esqueleto con Producción activa.

---

## Reglas
- Sin azules. **Naranja** para lo que se toca y lo elegido; **verde** para lo bueno; **bordó** para lo que falta o está mal.
- Todo lo que falta configurar (empaque, insumo) se marca en **tres lugares**: la burbuja de la pestaña, la pastilla en la lista y el aviso en el detalle.
- Los errores al guardar van pegados al botón que guarda.
- Castellano rioplatense, sin "usted".

## Decisiones para confirmar
1. Paleta cerrada de colores de producto que elige el admin.
2. Grande en naranja durazno (distinto del naranja de acción).
3. "Volver a una versión" crea una versión nueva en vez de reactivar la vieja.
4. Que Agua quede como "no hace falta lote" y no cuente como pendiente.

## Files
- `Configuracion Produccion.dc.html`: todas las pantallas, numeradas.
- `logo.png`, `support.js`.
