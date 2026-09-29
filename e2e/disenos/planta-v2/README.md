# Handoff: Planta (tablet) · segunda pasada

## Overview

Segunda pasada **completa** de la app de planta, con sus dos modos (**Producción** y **Sala de masa**), hecha después de probarla en la tablet real. **Reemplaza a `design_handoff_planta_dos_modos`.** La estructura, el flujo y las reglas de negocio no cambian: están en ese README y acá se repiten solo en el mapa de navegación. Cambian tres cosas:

1. **El tamaño real.** Cada pantalla está dibujada exacta para el espacio útil de la tablet.
2. **El sistema visual**, que ahora es el del esqueleto nuevo de la app (`design_handoff_esqueleto_gestion`). Planta y app son una sola familia.
3. **Lo que marcó Facu al usarla** (color por sección, contexto de lote y máquina, planilla, agregar producto, abrir turno, receta, lotes, cerrar planilla, PIN y reloj).

## About the design files

`Planta v2.dc.html` es una **referencia de diseño en HTML**, no código de producción. `support.js` solo sirve para abrirlo en el navegador.

Cada pantalla aparece **dos veces, lado a lado**: horizontal (1000 × 540) y vertical (600 × 940). La medida va escrita arriba de cada una. Están agrupadas en Producción · Sala de masa · Acceso maestro y numeradas (1a…10c).

## Fidelity

Alta fidelidad en colores, tipografía, medidas y textos. Datos de ejemplo realistas. Las *decisiones de diseño* están marcadas.

---

## El tamaño (lo más importante)

- Samsung Galaxy Tab A11, instalada a pantalla completa (PWA / modo kiosco).
- **Horizontal: 1000 × 540 px útiles. Vertical: 600 × 940 px.**
- Cada pantalla ocupa **exactamente** ese lugar: ni de más (nada se desborda) ni de menos (sin franjas vacías abajo).
- **Nada de scroll.** Solo scrollean las listas largas, dentro de su recuadro: lo producido con muchos renglones, los conos, los lotes, las masas del turno y los operarios si no entran.
- **Cómo se llena el alto**: los bloques principales usan `flex: 1` y las grillas `grid-auto-rows: 1fr`. Si sobra lugar, **lo importante crece** (los nombres, las máquinas, los productos, los renglones de la receta, las teclas). Nunca queda un hueco.
- Implementar con `height: 100dvh` en el contenedor raíz y sin `min-height` fijas en px que sumen más que la pantalla.
- **Orientación**: el mismo contenido se reacomoda. En horizontal hay barra lateral; en vertical la barra pasa arriba (ver "Estructura").

---

## Sistema visual (el del esqueleto)

| Rol | Valor |
|---|---|
| Títulos y números | **Bricolage Grotesque** 600–800 |
| Texto | **Figtree** 400–800 |
| Fondo | `#F5F3EF` |
| Tarjeta | `#FFFFFF`, borde 1px `#E7E3DC`, radio **16** (bloques) / **12–14** (botones y opciones) |
| Divisor | `#EFEBE5` · renglón `#F3F0EB` · alternado `#FAF8F5` |
| Texto | `#1C1A17` · fuerte secundario `#3D3831` · secundario `#6B645A` · suave `#9A9287` |
| Acento (lo que se toca, lo elegido) | `#C2410C` · suave `#FDEEE4` · oscuro `#8F2F08` · fondo de zona `#FFF8F3` |
| Bien | `#2F7D4F` · suave `#E6F4EC` · texto `#205B39` |
| Mal / parada / bloquea | `#7A2E42` · suave `#F5E8EC` · texto `#5C2233` · borde `#E8CDD5` · renglón `#FBF1F4` |

**Cambios respecto de la v1**
- Inter → Bricolage + Figtree.
- Fondo `#eef1f6` → `#F5F3EF`, y los grises azulados → cálidos.
- Modo Producción: grafito `#3F4655` (azulado) → **`#2B2723`** (cálido), letra blanca.
- Modo Sala de masa: igual (`#F3D774` · borde `#B8961F` · letra `#3B2E00`).
- Radios de tarjeta de 20 → 16.

**Sin azules. El naranja nunca marca validez.** El contexto "Lote 7038 · Máquina 1" va en naranja porque es **lo elegido**.

### Identidad de cada sección (punto 1 de Facu)
Cada sección tiene su color. Va en el ícono, el título del bloque y el fondo suave del bloque, nunca en fondos chillones.

| Sección | Color | Dónde |
|---|---|---|
| **Operarios** | verde agua `oklch(0.45 0.09 185)` · suave `oklch(0.95 0.03 185)` | Tarjeta de operarios, Abrir turno, resumen |
| **Masas** | trigo `oklch(0.42 0.10 75)` · suave `oklch(0.97 0.035 90)` · letra `#3B2E00` | Tarjeta de masas, cabecera de la receta, lista de masas, resumen |
| **Paradas** | bordó `#7A2E42` · suave `#FBF3F5` | Tarjeta de paradas, Paradas, resumen |
| **Lo producido** | grafito `#2B2723` con letra blanca (cabecera) y los colores de producto adentro | Tabla de la planilla |

**Productos** (los de la configuración): Mini `oklch(0.78 0.15 95)`, Chico `oklch(0.60 0.14 145)`, Grande `oklch(0.68 0.16 50)`, Standard `oklch(0.52 0.15 300)`. El texto va en la versión oscura de cada uno: `oklch(min(L,0.5)−0.07 C×0.8 H)`. **Chocolate**: Mini `oklch(0.44 0.07 55)`, Chico `oklch(0.38 0.06 50)`, Standard `oklch(0.50 0.08 60)`, siempre como **pastilla marrón con letra blanca**.

**Conos**: cada cono lleva una pastilla de color. El tono sale de una paleta rotativa de 8 (`20, 150, 300, 70, 340, 120, 30, 280`): fondo `oklch(0.92 0.07 H)`, letra `oklch(0.35 0.10 H)`, borde `oklch(0.82 0.10 H)`. El color se fija por cono, así el mismo cono tiene siempre el mismo color. "sin cono" va en gris suave, sin pastilla.

### Medidas

| Elemento | Horizontal | Vertical |
|---|---|---|
| Texto mínimo | 13 px (detalles) · 15 px (datos) | igual |
| Acción principal | 54 px | 64 px |
| Botones y opciones | 44–50 px | 56–64 px |
| Teclas del PIN | 58 px | 84 px |
| Renglón de lo producido | 42 px (una línea) | 66 px (dos líneas) |
| Renglón de receta | se reparte el alto (≈ 40 px) | se reparte el alto (≈ 64 px) |
| Número de la receta | 26 px | 36 px |
| Números | siempre `tabular-nums` | |

---

## Estructura

### Horizontal (1000 × 540)
```
┌────────────┬──────────────────────────────────────────────┐
│ BARRA 200  │ Lote 7038 · Máquina 1 │ Título    28/09 · 15:58│ ← 36 px, una sola línea
│ [Ir a otro │──────────────────────────────────────────────│
│  modo]  48 │                                              │
│ persona    │  contenido (llena todo el alto)              │
│ Cambiar    │                                              │
│ secciones  │                                              │
│ 44 c/u     │                                              │
│ Salir   44 │  [ acción principal ]                        │
└────────────┴──────────────────────────────────────────────┘
```
- **Barra (200 px)**: botón al otro modo (48, con el tono de ese modo) · recuadro con el modo actual, la persona y "Cambiar de persona" (36) · secciones (44) · Salir (44).
- **Cabecera (36 px)**: **contexto en naranja** (Bricolage 24/800) · divisor · título de la pantalla (18/700, gris) · **reloj "28/09/2026 · 15:58"** a la derecha. El reloj **no tiene renglón propio** (punto 10).
- **Contenido**: padding `10px 14px 12px`, gap 8.

### Vertical (600 × 940)
- **Arriba (64 px)**: botón al otro modo · persona (tocar = Cambiar de persona) · reloj en dos líneas (15:58 grande, 28/09/2026 chico) · Salir (48 × 48).
- **Secciones (56 px)**: pestañas iguales con ícono y nombre corto (Inicio · Abrir · Planilla · Paradas · Cerrar). En Sala de masa: Inicio · Máq. 1 · Máq. 2 · Máq. 3, con la cantidad de masas.
- **Cabecera**: contexto en naranja (26 px) + título.
- Las columnas pasan a estar una arriba de la otra. Lo secundario (lista de masas, paradas del turno, resumen) queda abajo.

### ¿Quién sos? y Acceso maestro
Sin barra. Banda de 56 px con el tono del modo, el nombre, "Elegí tu nombre" y el reloj.

---

## Mapa de navegación

### Arranque
```
Tablet ──► 1a ¿Quién sos? de Producción ── tocar nombre ──► 1b PIN (ventana) ──► 2a Inicio
                                                              ├─ mal ×1–4 ──► 1c
                                                              └─ mal ×5 ────► 1d (5 min)
1a ── Acceso maestro ──► 10a PIN de 8 ──► 10b Dar acceso ──► 10c PIN temporal ──► 1a
Cambiar de persona (en cualquier modo) ──► ¿Quién sos? de ese modo
Salir (en cualquier modo) ──► 1a
```

### Producción
```
Barra: [Ir a Sala de masa] · Inicio · Abrir turno · Planilla · Paradas · Cerrar planilla

2a Inicio ── tocar máquina con turno ──► 4 Planilla (esa máquina queda elegida)
          ── "Abrir turno" (sin turno) ──► 3 Abrir turno ── Abrir ──► 4 Planilla
          (sin máquinas abiertas → 2b: Sala de masa apagada)
4 Planilla ── "+ Agregar producto" ──► 5a Producto ─(toca)─► 5c Cono ─(toca)─► 5d Presentación ─(toca)─► 5e Cajas ── Agregar ──► 4
           │                            └─ chocolate sin masa ──► 5b (aviso) ── Ir a Sala de masa ──► 8a
           ├─ Corregir / Anular (en el renglón) ──► 4
           └─ tocar tarjeta Paradas ──► 6
6 Paradas ── Paró ahora ──► 6 (parada) ── Volvió a andar ──► 6
7 Cerrar planilla ── bloquea ──► "Ir a Sala de masa" (8a) / "Corregir producto" (4, renglón abierto)
                  ── avisos ──► "Ir a Paradas" (6) / "Revisar"
                  ── Cerrar ──► 2a (la máquina sale de Sala de masa)
```

### Sala de masa
```
Barra: [Ir a Producción] · Inicio · Máquina 1 · Máquina 2 · Máquina 3 (con cantidad de masas)

8a PIN del masero ──► 9a Inicio
9a Inicio ── tocar tarjeta ("+ Nueva masa") ──► 9b Receta para esa máquina
Barra ── tocar una máquina ──► 9g Historial ── "+ Nueva masa para Máquina 1" ──► 9b
9b Receta ── Original / Anterior / Modificar ──► 9b / 9c
         ── tocar un lote ──► 9e Ventana de lotes (o 9f si no hay lotes con stock) ── Usar ──► 9b
         ── lote agotado ──► 9d (aviso, deja registrar)
         ── Otro ──► insumos que cumplen ese ingrediente (igual que v1) ──► 9b
         ── Registrar ──► 9b (masa siguiente)
         ── Anular la última masa ──► confirmación con motivo (igual que v1)
```

---

## Pantallas

### 1 · ¿Quién sos? y PIN
- **1a**: grilla pareja de nombres que **llena el alto** (4 columnas en horizontal y 2 en vertical, `grid-auto-rows: 1fr`). Cada nombre lleva un círculo con las iniciales: grafito para encargados, verde agua para operarios. Abajo, **Acceso maestro** discreto.
- **1b · PIN en ventana (punto 9)**: fondo oscurecido `rgba(28,26,23,.55)` y una ventana al centro (380 px en horizontal, 460 en vertical). Adentro: iniciales, "Hola, Luciano", 4 puntos de 18 px y **el teclado 3 × 4 entero** (58 / 84 px). La última fila es Borrar · 0 · ⌫. La ✕ cierra.
- **1c**: los puntos en bordó y "PIN incorrecto · te quedan 2 intentos".
- **1d**: recuadro bordó con la cuenta regresiva 4:32 y el teclado al 30 %.

### 2 · Inicio de Producción
- En horizontal, grilla de 6 columnas: las 3 primeras máquinas ocupan 2 columnas cada una y las 2 de abajo, 3 cada una. En vertical, 2 columnas, y la 5 va a todo el ancho. **No queda ningún hueco.**
- **Andando**: "Andando" en verde · Lote 7038 (40 / 52 px) · encargado y desde cuándo · pastillas "6 masas" (trigo) y "38 cajas".
- **Parada**: tarjeta entera en bordó con letra blanca.
- **Sin turno**: punteada, con **Abrir turno**.
- **2b**: sin máquinas abiertas, "Sala de masa" queda punteada y apagada, con "sin máquinas abiertas". Planilla, Paradas y Cerrar quedan al 40 %.

### 3 · Abrir turno (punto 5)
- Turno (Mañana / **Tarde** / Noche, elegido por la hora) y Encargado, en una fila.
- **Operarios**: grilla pareja de etiquetas **del mismo ancho** (4 columnas en horizontal y 3 en vertical, 50 / 60 px), con casilla y "Aguirre Fabrizio" (apellido y nombre).
- Dos grupos:
  - **"Trabajaron hace poco en Máquina 4"**, primero.
  - **"El resto"**, alfabético. Los que ya están en otra máquina hoy van en gris, con "en Máquina 2", y no se pueden tocar.
- Acción: **"Abrir turno de Máquina 4 · 3 operarios"**.

### 4 · Planilla (punto 3)
- **Arriba, fijas** (96 / 128 px), tres tarjetas:
  - **Operarios** (verde agua): los nombres, con ENCARGADO marcado.
  - **Masas** (trigo): el número grande, "1 de chocolate" y la última.
  - **Paradas** (bordó): el número, el total de minutos y la última.
- **Lo producido ocupa todo el resto.** Cabecera grafito "Lo producido · 12 renglones", encabezados en `#F3F0EB` y renglones alternados.
- Columnas (horizontal): `70px · 1.25fr · 1.15fr · 1.35fr · 54px · 72px · 90px` → **Sublote · Producto · Cono · Caja y bolsa · Cajas · Unidades · Corregir / Anular**.
  - **Producto**: cuadradito del color + nombre en negrita en la versión oscura del color. Chocolate: pastilla marrón con letra blanca.
  - **Cono**: pastilla de color con el nombre (BAHIA CHAJARI), o "sin cono" en gris.
  - **Nada se corta con "…"**: el texto pasa a dos líneas si hace falta.
  - Corregir (lápiz naranja) y Anular (círculo tachado), de 40 × 36.
- **Vertical**: cada renglón pasa a dos líneas (66 px): sublote + producto arriba; cono + caja y bolsa abajo; cajas grande y unidades a la derecha; Corregir / Anular apilados.
- **Pie**: "TOTAL DEL TURNO **38 cajas** 11.520 unidades" + **"+ Agregar producto"** (44 px, naranja).
- **Con pocos renglones (4a)**, el lugar libre es un **botón grande punteado "+ Agregar el próximo producto"**, así no queda un hueco. *Decisión de diseño.*
- **Con 12 (4b)** scrollea solo la tabla. El pie queda fijo.

### 5 · Agregar producto (punto 4)
- **Tres columnas**: la barra, **los pasos** (220 px) y **las opciones del paso actual**. Las dos últimas llegan hasta abajo.
- **Pasos**: Producto · Cono · Presentación · Cajas.
  - Hecho: círculo negro con ✓ y lo elegido en negrita. Tocarlo vuelve a ese paso.
  - Actual: naranja.
  - Pendiente: gris.
  - Abajo, Cancelar.
- En vertical, los pasos van en una fila arriba (4 iguales) y las opciones abajo.
- **Tocar una opción avanza sola.** Solo el último paso (Cajas) tiene botón.
- **5a · Producto**:
  - **Comunes** en 2 × 2: fondo suave del color, "Cucuruchón" chico y **"Mini"** grande (40 / 52 px), con el cuadradito del color.
  - **De chocolate**, aparte y en fila de 3: marrón con letra blanca, "Chocolate" chico y "Mini" grande.
- **5b · Chocolate sin masa de chocolate**: la opción queda marcada y aparece el aviso bordó **en el mismo paso**: "En este turno no hay masa de chocolate", con **Ir a Sala de masa** (con el tono de Sala de masa). No avanza.
- **5c · Cono**: **"Sin cono"** en blanco y el buscador, en la misma fila. Debajo, los conos como botones de 50 / 64 px, **cada uno en su pastilla de color**, en una grilla de 3 (2 en vertical) con scroll en su recuadro. Los más usados, primero.
- **5d · Presentación**: solo dos. **Caja completa · 320** y **Media altura · 160**, cada una con un dibujo de la caja alta o baja en el color del producto.
- **5e · Cajas**: − / número / + (84 px, número de 76 px), "= 1.280 unidades", atajos 1 · 2 · 3 · 5 · 10 · 20. Acción: **"Agregar 4 cajas a lo producido"**.

### 6 · Paradas
- Franja bordó "PARADA · desde las 15:40 · hace 18 min".
- **¿Por qué paró?**: 6 motivos en 2 columnas que llenan el alto.
- Acción: **Volvió a andar**.
- A la derecha (abajo en vertical): las **paradas del turno** (la actual en bordó), el total y **"+ Anotar una parada que ya pasó"**.

### 7 · Cerrar planilla (punto 8)
- **Izquierda**:
  - **Se apagó el fuego a las 15:58** (40 px), con −5 / +5 / Ahora.
  - **Scrap** con − / +.
  - **Observaciones** (crece).
  - **Cerrar planilla**.
- **Derecha**:
  - **Resumen**: 6 tarjetas en los colores de cada sección (Operarios, Masas, Cajas, Paradas, Scrap, Sublotes).
  - **Lo que falta**, en dos niveles:
    - **Bloquea** (bordó, con la etiqueta "NO DEJA CERRAR" y un botón para resolverlo). Ejemplo: "Hay Mini Chocolate y no hay masa de chocolate", con **Ir a Sala de masa** y **Corregir producto**.
    - **Avisos** (tono suave, con su acción en texto naranja): "El scrap es el doble del promedio", "La parada de las 10:05 dice 'Otro motivo' sin detalle". **No impiden cerrar.**
- Con algo que bloquea, **Cerrar planilla** queda gris y pegado arriba dice "Falta resolver 1 cosa para poder cerrar".

### 8–9 · Sala de masa
- **8a**: PIN del masero. Banda amarilla con Cancelar, solo maseros y la misma ventana de PIN.
- **9a · Inicio**: una tarjeta por máquina abierta que llena el alto (3 en fila en horizontal, apiladas en vertical). Nombre, turno, lote, **cantidad de masas grande** (72 / 88 px) y la última. Al pie, **"+ Nueva masa"** en naranja. La parada, con borde bordó y "se puede hacer masa igual".
- **9b · Receta (punto 6)**:
  - Fila de controles: **Masa 7** · Simple / Doble · **Original / Anterior / Modificar en una sola fila** (con "v3" e "igual a la 6" en chico) · pastillas Modificada / Chocolate.
  - **Tabla que ocupa todo el alto**: cada renglón `flex: 1 1 0`, así los renglones se reparten el alto. Columnas **Ingrediente · Cantidad · Lote · Otro**.
  - **Cantidad** en Bricolage 26 / 36 px, para leer de lejos.
  - **Lote** con lugar de sobra (la columna más ancha): el lote en **una línea** (16/800) y debajo, chico, **"quedan 6.100 kg"** o **"sin ingreso cargado"** (bordó). **El lote aparece una sola vez**: es el botón que abre la ventana de lotes.
  - Agua: "no lleva lote".
  - A la derecha (220 px; abajo en vertical, 180 px de alto), **las masas del turno** y "Anular la última masa".
- **9c · Modificar**: − / + en cada cantidad, el motivo (obligatorio) y **"+ Agregar ingrediente"** en una fila. El cacao entra como renglón con fondo trigo y "agregado". La diferencia (+200 g) va en bordó.
- **9d · Lote agotado**: renglón `#FBF1F4`, borde bordó en el lote y "figura agotado · podés registrar igual". **No bloquea Registrar.**
- **9e · Ventana de lotes con lotes (punto 7)**:
  - Arriba de todo, **"El lote no está en la lista: escribirlo"** (punteado naranja).
  - Filtros chicos por marca (Todas · Júpiter 3 · Chacabuco 2 · La Clásica 1).
  - **Una sola lista** con todas las marcas: el **más viejo arriba, destacado** en trigo con "EL MÁS VIEJO · USALO PRIMERO"; el **de la masa anterior, ya marcado** en naranja.
  - Cada renglón: marca · lote · cuándo ingresó · **quedan** (grande).
  - Acción: **"Usar Júpiter · lote 10/09/2026"**.
- **9f · Sin lotes con stock**: abre **directo con el campo para escribir el lote**, más la marca y la nota "Queda anotado como 'sin ingreso cargado' y le llega un aviso a administración. Podés registrar la masa igual." Acción: **Usar este lote**.
- **9g · Historial**: las masas del turno en grilla (la elegida en naranja) y el detalle con cada ingrediente, su cantidad y su lote. Acción: **"+ Nueva masa para Máquina 1"**.

### 10 · Acceso maestro
- **10a**: la misma ventana de PIN, con 8 puntos y "Al tercer error se bloquea 15 minutos."
- **10b**: Dar acceso por hoy / Asignar PIN · ¿A quién? (grilla con buscador) · ¿Qué puesto? (Encargado / **Masero** / Operario, cada uno con el color de su modo). Acción: **"Dar puesto de Masero a Paz Lucas por hoy"**.
- **10c**: el PIN temporal en 96 px, "Se muestra una sola vez", **Listo, ya se lo di**.

---

## Lo que no se volvió a dibujar
Otro insumo (4d de la v1), Agregar un ingrediente (4c2), Anular la última masa (4f) y Sin conexión (4g) mantienen la lógica de la v1. Se implementan con este sistema visual y estas medidas:
- Otro insumo y Agregar un ingrediente se abren en la **misma ventana centrada** que los lotes, con una lista en su recuadro.
- Anular la última masa se abre en una ventana chica con motivo obligatorio.
- Sin conexión va como recuadro bordó al pie de la barra (en vertical, un punto bordó junto al reloj).

## Decisiones de diseño para confirmar
1. En la planilla con pocos renglones, el lugar libre es un botón grande de "Agregar el próximo producto".
2. El color de cada cono sale de una paleta de 8 tonos, fija por cono.
3. En vertical, la barra lateral pasa a una franja de 64 px + pestañas de 56 px.
4. La acción principal mide 54 px en horizontal (antes 68), para que entre todo en 540 px de alto.

## Files
- `Planta v2.dc.html`: todas las pantallas, cada una en horizontal y vertical.
- `logo.png`, `support.js`.
