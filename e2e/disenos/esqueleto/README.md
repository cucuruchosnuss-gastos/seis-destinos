# Handoff: Esqueleto de la app de gestión + Tablero de resúmenes

## Overview

Nuevo **esqueleto** (barra lateral, barra de arriba, celular) y nueva **pantalla principal** de la app de gestión de Seis Destinos (Grupo Nuss), para compu y celular. No es la tablet de la fábrica.

Reemplaza: la barra lateral actual, la barra de fábricas en pastillas, **la barra blanca vieja (logo grande, nombre, mail y Salir) que se elimina**, y la grilla "Módulos · Abrir →".

## About the design files

`Esqueleto y Tablero.dc.html` es una **referencia de diseño en HTML**, no código de producción. `support.js` solo sirve para abrirlo en el navegador; `logo.png` es el logo de Seis Destinos. Implementar en el proyecto real con sus convenciones.

Cada pantalla tiene un número (1a…7b) que se usa acá. En el archivo se pueden tocar las fábricas, el nombre del usuario (abre el menú) y el botón de colapsar la barra.

## Fidelity

**Alta fidelidad** en colores, tipografía, medidas y textos. Datos de ejemplo realistas. Las *decisiones de diseño* están marcadas.

---

## Pantallas

| # | Pantalla | Tamaño |
|---|---|---|
| 1a | Tablero del dueño (todos los módulos) | 1366 × 768 |
| 1b | Tablero del dueño, pantalla grande | 1920 × 1080 |
| 2a | Alguien con solo Gastos y Caja | 1366 × 768 |
| 3a | Estados: sin datos, error, cargando | 1366 × 768 |
| 4a | Barra lateral colapsada (con nombre al pasar el mouse) | 1366 × 768 |
| 4b | Menú del usuario abierto | 1366 × 768 |
| 5a | Modo acomodar el tablero | 1366 × 768 |
| 6a | Personalizar | 1366 × 768 |
| 7a | Celular · tablero | 390 × 844 |
| 7b | Celular · Más | 390 × 844 |

---

## Tokens (cambios respecto de los módulos anteriores)

| Rol | Valor | Cambio |
|---|---|---|
| Títulos y números | **Bricolage Grotesque** 600–800 (opsz 12–96) | **Nuevo** — reemplaza Inter en títulos y números grandes |
| Texto | **Figtree** 400–800 | **Nuevo** — reemplaza Inter en texto |
| Fondo de app | `#F5F3EF` | **Cambia** (antes `#eef1f6`, que era azulado) |
| Tarjeta / barras | `#FFFFFF`, borde 1px `#E7E3DC` | Borde **cambia** (antes `#E5E7EB`) |
| Divisor interno | `#EFEBE5` | Cambia (cálido) |
| Pista de segmentados | `#F3F0EB` · hover `#E9E5DF` · hover de fila `#F6F3EF` | Nuevo |
| Texto | `#1C1A17` | Cambia (antes `#111111`) |
| Texto de menú / fuerte secundario | `#3D3831` | Cambia |
| Texto secundario | `#6B645A` | Cambia (antes `#55617d`, azulado) |
| Texto suave / etiquetas | `#9A9287` | Cambia (antes `#8a94ab`) |
| Acento (lo que se toca, lo elegido) | `#C2410C` · suave `#FDEEE4` · oscuro `#8F2F08` · fila `#FFF8F3` | Igual |
| Bien | `#2F7D4F` · suave `#E6F4EC` · texto `#205B39` | Igual |
| Mal / urgente | `#7A2E42` · suave `#F5E8EC` · texto `#5C2233` · borde `#E8CDD5` · hover `#FBF3F5` | Igual |
| Radios | tarjeta 16 · botón 12 · ítem de menú 9 · ícono 7–9 · burbuja 999 | Tarjeta **baja** de 20 a 16 |

Los grises pasaron de azulados a **cálidos** para que no haya azules y conviva con el naranja. Si se adopta, conviene migrar los módulos ya hechos.

**Sin azules. El naranja nunca marca validez**: es el ítem activo, la fábrica elegida, los botones, los interruptores prendidos. Bien o mal lo dicen verde y bordó.

**La única excepción a "sin azules" (30/09/2026, pedido de Facu): el CELESTE de las formas de pago electrónicas.** Las etiquetas de forma de pago (`.forma-pago` de `css/main.css`) van: efectivo en verde, cheque de papel en naranja, **e-cheque y transferencia en celeste** (`--celeste` #0284C7, `--celeste-suave` #E0F2FE, `--celeste-oscuro` #075985; 6,6:1 el oscuro sobre el suave), la transferencia con su propio ícono (dos flechas). Solo en esas etiquetas chicas, siempre con el nombre escrito al lado: nunca en fondos grandes, botones ni nada que se toque. Las usan Cobranzas, Cobranzas por asentar y la cartera de cheques de Administración.

### Por qué esta tipografía
- **Bricolage Grotesque**: grotesca con carácter (terminales y anchos variables), muy firme en números grandes (`$ 4.380.000`, `142`). Se usa solo en títulos, saludo y números grandes, con `letter-spacing: -0.03em` y `font-variant-numeric: tabular-nums`.
- **Figtree**: geométrica cálida, muy legible en 13–15 px, con buena ñ y acentos. Todo lo demás.

### Paleta por módulo

Color en `oklch(L C H)`. Fondo del ícono: `oklch(0.955 C×0.28 H)`. El color va **solo en el ícono y en detalles** (barritas de la tarjeta), nunca en fondos grandes. Se evitaron los tonos 210–270 (azules) y se separan del naranja de acento por tono o luminosidad.

| Módulo | Color | Tono |
|---|---|---|
| Gastos | `oklch(0.55 0.16 355)` | frambuesa |
| Caja | `oklch(0.60 0.13 85)` | mostaza |
| Cobranzas | `oklch(0.62 0.15 62)` | ámbar |
| Cheques | `oklch(0.52 0.16 290)` | violeta |
| Cuentas corrientes | `oklch(0.50 0.15 322)` | ciruela |
| Ingreso | `oklch(0.48 0.08 50)` | tostado |
| Stock | `oklch(0.52 0.12 130)` | oliva |
| Producción | `oklch(0.52 0.10 180)` | verde agua |
| Pedidos | `oklch(0.58 0.17 20)` | coral |
| Órdenes de retiro | `oklch(0.55 0.11 108)` | dorado |
| Administración | `oklch(0.45 0.14 305)` | uva |
| Proyectos Taller | `oklch(0.42 0.07 150)` | verde bosque |
| Accesos | `oklch(0.50 0.07 205)` | petróleo |
| Empleados | `oklch(0.60 0.13 340)` | rosa |
| Seguridad | `oklch(0.40 0.012 60)` | grafito |
| Inicio / Personalizar | `oklch(0.35 0.012 60)` | tinta |

Fábricas (marca a la izquierda del botón; **reemplazar por el logo real de 20 px** que ya tiene la app): Nuss `oklch(0.55 0.11 55)`, Dolce Pasta `oklch(0.52 0.10 130)`, Mengui `oklch(0.57 0.19 25)`, Taller `#57534E`. "Todas" muestra los cuatro colores en un cuadradito.

---

## Esqueleto · compu (desde 1024 px)

Layout: `display: flex` → barra lateral fija + columna (barra de arriba 52 px + contenido con scroll propio).

### Barra lateral
- Ancho **232 px** abierta, **64 px** colapsada. Fondo blanco, borde derecho `#E7E3DC`, padding `12px 10px 10px`.
- **Logo** arriba: cuadrado de 36 px (radio 10) con la estrella + "Seis Destinos" 15.5/700 Bricolage y "GROUP" 10/700 con `letter-spacing: .24em`. Colapsada: solo el cuadrado.
- **Ítem**: 32 px de alto, gap 2 px, radio 9. Ícono en cuadrado de 24 px (radio 7) con el color del módulo; nombre 13.5 px/500 `#3D3831`; burbuja a la derecha.
- **Activo**: fondo `#FDEEE4`, texto `#8F2F08` 700. Hover: `#F6F3EF`.
- **Burbuja**: 18 px de alto, 11.5/700. Bordó `#7A2E42` con letra blanca si hay algo urgente; gris `#EDE9E3` con tinta si no. Colapsada, la burbuja va sobre la esquina del ícono.
- **Orden**: Inicio · (divisor) · fijados · (divisor) · el resto. El divisor es 1 px `#EFEBE5`.
- **Cuenta**: 16 ítems × 34 px = 544 px + logo 60 + pie 50 → entra en **768 px sin scroll** con hasta 16 módulos. Si alguna vez hay más, la lista hace scroll y el logo y el pie quedan fijos.
- **Pie**: "Personalizar" (abre 6a) + botón de colapsar (32 px, doble chevron). Colapsada, van apilados.
- **Colapsada (4a)**: al pasar el mouse, cartel negro `#1C1A17` a la derecha con el nombre y lo pendiente ("Cobranzas · 5 por controlar"). El estado abierta/colapsada se guarda por persona.
- **Inicio** vuelve al tablero. *Decisión de diseño*: se agrega "Inicio" como primer ítem porque el tablero ahora es una pantalla con contenido.

### Barra de arriba (única)
- 52 px, fondo blanco, borde inferior. Padding `0 16px 0 20px`.
- **Fábricas** a la izquierda: segmentado dentro de una pista `#F3F0EB` (radio 11, padding 3). Botones de 30 px, radio 8, 13.5/600, marca de 20 px + nombre. **Elegida**: fondo `#C2410C`, letra blanca 700, marca con anillo blanco.
- **Usuario** a la derecha: pastilla de 38 px con borde, iniciales en círculo de 30 px, nombre 14/600 y chevron. Abre el menú (4b).
- **Menú del usuario (4b)**: 260 px, radio 14, sombra. Cabecera con iniciales 38 px, nombre completo y mail. Ítems de 40 px: **Mi cuenta**, **Mis sesiones** (con "3 abiertas"), divisor, **Salir**. Cierra con clic afuera o Esc.
- **La barra blanca vieja se elimina.** Nombre, mail y Salir viven en este menú.

---

## Esqueleto · celular (390 px)

- Sin barra lateral.
- **Arriba**: logo 32 px + "Seis Destinos"; iniciales a la derecha (38 px, abre Mi cuenta / Mis sesiones / Salir).
- **Fábricas**: fila que se desliza de costado (`overflow-x: auto`), botones de 36 px. La última queda cortada a propósito para que se note que se desliza.
- **Barra inferior** (84 px con el área segura): **Inicio + los 3 módulos más usados + Más**. *Decisión de diseño*: se reservó un lugar para Inicio en vez de 4 módulos, porque el tablero es la pantalla que más se abre; los 3 módulos salen de "los que más uso" (o de los fijados, si la persona fijó). Activo: ícono naranja sobre `#FDEEE4`. Burbuja bordó para lo urgente; "Más" suma las burbujas de lo que no está en la barra.
- **Más (7b)**: hoja desde abajo con todos los módulos en grilla de 3 (con burbujas) y abajo Personalizar, Mi cuenta, Mis sesiones, Salir (46 px).

---

## Tablero de resúmenes

### Encabezado
- **Saludo**: "Buen día, Pablo" (Bricolage 26/700) + "· lunes 28/09" (16, `#6B645A`). Buen día hasta las 13, Buenas tardes hasta las 20, Buenas noches después.
- **Franja urgente**: solo si hay algo urgente en algún módulo habilitado. Fondo `#F5E8EC`, borde `#E8CDD5`, radio 12. "Para resolver ya" + hasta **4** ítems, cada uno con su número en bordó y lleva directo a donde se resuelve. Si no hay nada urgente, **no aparece** (2a).

### Grilla
- `grid-template-columns: repeat(N, minmax(0,1fr))`, `gap: 14px`, `grid-auto-flow: dense`.
- **N = 4** en 1366; **6** en 1920 (desde 1680 px); **1** en celular. Entre 1024 y 1280, 3 columnas.
- **Tamaños**: **chica** = 1 columna · **mediana** = 2 columnas · **ancha** = 4 columnas (la fila entera en 1366). En celular todas ocupan el ancho.
- Tamaños por defecto del dueño: Producción ancha; Cobranzas, Caja, Gastos, Administración, Cuentas corrientes, Stock y Proyectos Taller medianas; el resto chicas. Orden por defecto: el de 1a.
- Cada persona ve **solo las tarjetas de los módulos que tiene habilitados**. Todas respetan la fábrica elegida arriba; "Todas" es la suma.

### Tarjeta
- Blanca, borde `#E7E3DC`, radio 16, padding `14px 16px 10px`, alto mínimo 196 px. Hover: borde `#D6CFC4` y sombra suave. **Tocar la tarjeta abre el módulo.**
- **Cabecera**: ícono 30 px (radio 9) con el color del módulo + nombre 15/700 + chevron `#B8B0A4`.
- **Cuerpo**: dos bloques en `flex-wrap` (cada uno `flex: 1 1 200px`). En mediana y ancha quedan lado a lado; en chica se apilan solos.
  - Bloque principal: etiqueta 13.5/600 `#6B645A` ("Gastado en septiembre") → **número grande** Bricolage 800 (chica 36 · mediana 42 · ancha 54; celular 36/46) + unidad 17/600 → dato secundario 19/700 (por ejemplo "US$ 2.350") → tendencia con flecha en círculo (verde si sube lo bueno).
  - Bloque de contexto: renglones "dato · valor" 14 px (valor 700, verde si es bueno) y, si hay, una lista corta con título 12/800 en mayúsculas y barritas de 5 px del color del módulo (bordó si es malo).
- **Pie "lo que hay que resolver"**: divisor arriba, renglones de 34 px: pastilla con el número (bordó con letra blanca si es urgente; gris `#F1EEE9` si no) + texto (bordó 650 si es urgente) + chevron naranja. **Cada renglón lleva directo a la lista filtrada** donde se resuelve (no a la portada del módulo). Si no hay nada: "Nada pendiente" en verde con tilde.
- Palabras simples, sin gráficos: solo números, flechas y barritas.

### Qué muestra cada tarjeta

| Módulo | Número grande | Contexto | Resolver |
|---|---|---|---|
| Gastos | Gastado en el mes | Hoy · últimos 7 días · 3 categorías que más pesan (barritas) | Gastos sin proveedor |
| Caja | Mi saldo en $ (+ US$ debajo) | Caja de la empresa (**solo super_admin**) · entró / salió hoy | Transferencias por aceptar |
| Cobranzas | Cobrado hoy | Últimos 7 días · por chofer (top 3) | Por controlar (cantidad y $) |
| Cheques | En cartera, $ (+ cantidad) | Plazo promedio · para depositar hoy | Vencen esta semana (urgente) |
| Cuentas corrientes | Le debemos a proveedores | Los 3 más grandes | Vencido (urgente) · vence esta semana |
| Ingreso | Ingresos de MP hoy | Últimos 7 días | Facturas por ingresar · recuento abierto |
| Stock | Insumos por agotarse | Para cuántos días alcanza harina y azúcar (barritas, bordó < 5 días) | Transferencias por recibir |
| Producción | Cajas hoy + flecha vs. mismo día de la semana pasada | Máquinas (paradas primero, en bordó) · andando · masas · scrap % | Máquinas paradas (urgente) · planillas por completar · lote que peor rinde |
| Pedidos | Por entregar | Para hoy · esta semana | Atrasados (urgente) |
| Órdenes de retiro | Cajas despachadas hoy | Órdenes de la semana | Sin valorizar |
| Administración | Nos deben los clientes | Cobrado en el mes · los que más deben | Cobranzas por asentar (urgente) · pasados de su límite (urgente) |
| Proyectos Taller | En curso | Facturado · cobrado · falta cobrar (**solo con permiso de precios**; si no, no se muestran) | Atrasados (urgente) · pasados de presupuesto |
| Accesos y empleados | Usuarios activos | Empleados en Naaloo | Solicitudes de acceso |
| Seguridad (**solo super_admin**) | Errores de la app, 7 días | Sesiones abiertas | Errores nuevos |

*Decisión de diseño*: "la semana" se muestra como **últimos 7 días** en Gastos, Cobranzas e Ingreso para que un lunes no dé igual que "hoy". Pedidos sí usa "esta semana" (de lunes a domingo) porque mira hacia adelante.

**Qué es urgente** (bordó, y entra en la franja): máquina parada, pedidos atrasados, cheques que vencen en ≤ 7 días, deuda vencida con proveedores, cobranzas por asentar, clientes pasados de límite, proyectos atrasados. Lo demás es pendiente normal (gris).

### Estados de tarjeta (3a)
- **Cargando**: la tarjeta mantiene su tamaño; barras grises `#F1EEE9`/`#F5F3EF` en lugar de etiqueta, número y contexto + "Cargando…". En producción, agregar un brillo suave de izquierda a derecha (1.4 s).
- **Error**: "No se pudo cargar" 16/700 con ícono bordó, "Puede ser la conexión. El resto del tablero anda bien." y botón **Reintentar** (36 px, borde naranja). **Cada tarjeta pide sus datos por separado**: si una falla, las otras siguen.
- **Sin datos**: guion en cuadrado gris + mensaje en palabras ("Hoy no hubo cobranzas") en Bricolage 21/700; el contexto sigue (últimos 7 días) y el pie dice "Nada por controlar".

---

## Modo acomodar (5a)

- Se entra desde Personalizar → "Acomodar sobre el tablero" (o un botón "Acomodar" si se decide agregarlo al saludo).
- Barra arriba: manija naranja, "Estás acomodando tu tablero", explicación corta, **Volver a como venía** y **Listo** (naranja).
- Cada tarjeta: borde punteado `#D6CFC4`, **manija** (6 puntos, 26 × 30) a la izquierda del ícono, segmentado de tamaño **Chica / Mediana / Ancha** y botón de esconder (ojo tachado). La tarjeta no navega en este modo.
- **Arrastrando**: la tarjeta se levanta (borde naranja 2 px, sombra grande, rotación −1.6°) y el lugar donde cae se marca con recuadro punteado naranja sobre `#FFF8F3` y "Soltá acá". Las demás se corren en vivo.
- **Escondidas**: bandeja punteada abajo con las tarjetas ocultas y "Mostrar".
- Con teclado: la manija toma foco; flechas mueven, Enter suelta.

## Personalizar (6a)

- Pantalla propia, "Personalizar" queda activo en la barra.
- **Barra lateral**: segmentado **A mano / Alfabético / Los que más uso**. Lista con manija para arrastrar (solo en "A mano") y botón **Fijar / Fijado** (naranja suave cuando está fijado). Los fijados van siempre arriba, en cualquier orden elegido. "Los que más uso" cuenta aperturas de los últimos 30 días.
- **Tablero**: lista en el orden del tablero con manija, tamaño (Chica / Mediana / Ancha) e interruptor de mostrar (naranja prendido, `#D6CFC4` apagado; la fila apagada baja a 55 % de opacidad). Botón "Acomodar sobre el tablero" → 5a.
- **Volver a como venía**: vuelve barra y tablero al orden y tamaños por defecto (pedir confirmación).
- **Todo se guarda por persona** (en el servidor, así se ve igual en la compu y el celular). Los cambios se aplican al momento, sin botón de guardar.

---

## Comportamiento general
- La fábrica elegida se recuerda por persona y aplica a todas las tarjetas y módulos.
- Los números de las tarjetas se refrescan al volver a la pestaña y cada 2 minutos (Producción cada 30 s).
- Plata con `$ 1.234.567` (punto de miles, sin decimales en el tablero). Dólares `US$ 2.350`.
- Castellano rioplatense, sin "usted".
