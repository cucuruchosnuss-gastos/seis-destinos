# Handoff: Proyectos Taller

## Overview
Rediseño de Proyectos Taller. El Taller vende máquinas, dispositivos, automatizaciones, mantenimientos y horas a clientes de afuera, y hace trabajos internos, con precio, para las otras fábricas. Lo usan tres personas:

- **Tomás** ve todo.
- **Edgar** trabaja sin ver precios ni márgenes.
- **Facu** tiene el mismo permiso que Tomás.

Usa el sistema de `design_handoff_esqueleto_gestion`: Bricolage Grotesque y Figtree, grises cálidos, fondo `#F5F3EF`, barra lateral y barra de fábricas (con **Taller** elegida). El color del módulo es el verde bosque `oklch(0.42 0.07 150)`. Está armado con los mismos bloques que `design_handoff_administracion` (paneles, tablas, pastillas, avisos, ventanas).

## About the design files
`Proyectos Taller.dc.html` es una referencia de diseño en HTML, no código de producción. Tiene 12 pantallas de compu a 1366 × 768 (1a–5c), el **diagrama de actividades** (7a–7c, compu; 7d, celular) y 2 de celular a 390 × 844 (6a–6b). Cada pantalla de compu dice arriba si es "como lo ve Tomás" o "como lo ve Edgar".

## Fidelity
Alta fidelidad. Las cuentas cierran:
- Costo = gastos + horas × valor de la hora. En el ejemplo: $ 2.748.000 + 112 h × $ 18.500 = $ 4.820.000.
- Margen = venta − costo.

---

## Permisos: qué ve cada uno

| | Tomás / Facu | Edgar |
|---|---|---|
| Lista: estado, entrega, horas | ✓ | ✓ |
| Barra de costo contra presupuesto | en $ | **solo el %** |
| Venta, facturado, cobrado, margen | ✓ | — |
| Importes de gastos y costo de las horas | ✓ | — |
| Facturar / Cargar a la fábrica | ✓ | — |
| Valor de la hora | ✓ | — |
| Cargar horas, notas y archivos | ✓ | ✓ |

*Decisión de diseño*: "sin ningún precio" se tomó en sentido estricto. Edgar no ve ningún $, ni siquiera el presupuesto de costo. Ve el avance en porcentaje y en horas. En lugar de "Plata", su bloque se llama **"Avance"**.

---

## Pantallas

### 1 · Lista de proyectos (1a Tomás, 1b Edgar)
- **Filtros** arriba, en una fila:
  - Estado (Todos · Presupuestados · Aprobados · En curso · Terminados · Entregados · Cancelados, con su cantidad).
  - Externos e internos.
  - Categoría.
  - A la derecha, **Valor de la hora · $ 18.500** y **+ Nuevo proyecto** (solo Tomás).
- **Tarjetas** en una grilla de 3 × 2 que llena el alto. Cada una lleva:
  - Nombre (Maq Barquillo 24 Carrizo).
  - Cliente, o "Interno → Cucuruchos Nuss", y la categoría.
  - Pastilla de estado: Presupuestado gris · Aprobado gris oscuro · **En curso** verde bosque · Terminado verde · Entregado grafito · Cancelado gris.
  - **Entrega prometida**. Si está atrasada, va en bordó con "atrasado 16 días" y la tarjeta lleva borde bordó.
  - **Horas**: cargadas de estimadas; en bordó si se pasó.
  - **Barra de costo contra presupuesto** (9 px). Va en verde bosque y **pasa a bordó al pasarse**, con "se pasó $ 100.000" (Tomás) o "108 % · se pasó" (Edgar).
  - Solo Tomás: **venta y cobrado**. En los internos, "precio a la fábrica" y "cargado".
- Tocar una tarjeta abre la ficha.

### 2 · Ficha
Grilla: `420px | 1fr`. Arriba, la cabecera a todo el ancho. A la izquierda, **Datos** y **Plata** (o **Avance**, para Edgar). A la derecha, las pestañas **Gastos · Horas · Notas · Archivos**.
- **Cabecera**:
  - Nombre (Bricolage 24), cliente o fábrica, externo o interno, categoría, entrega prometida, estado y "Atrasado N días".
  - Tomás tiene **Valor de la hora** y **Facturar al cliente** (externo) o **Cargar a la fábrica** (interno).
  - Edgar tiene **+ Cargar horas**.
- **Datos**: tipo, cliente o fábrica, categoría, entrega prometida.
- **Plata (Tomás)**:
  - Presupuesto de costo y horas estimadas.
  - Barra de costo.
  - Gastos y horas: "112 h · × $ 18.500 la hora".
  - Bajo "CON PERMISO DE PRECIOS": **precio de venta, facturado, cobrado** (verde) y **margen hoy** (verde, o bordó si el costo se pasó).
- **Avance (Edgar)**: horas estimadas y cargadas, barras de costo y de horas en %, y la nota "Los precios, lo facturado y el margen los ve Tomás".
- **Gastos (2a)**: fecha, qué, proveedor, importe y total. Son los que se cargaron desde el módulo Gastos eligiendo el proyecto; acá solo se ven. Edgar los ve sin importe.
- **Horas (2b)**: fecha, quién, horas y para qué, más el costo (solo Tomás). Total al pie.
- **Notas (2c)**: la bitácora del avance, con lo más nuevo arriba, quién escribió, cuándo y si tiene foto. El campo para una nota nueva va arriba, con "Adjuntar foto".
- **Archivos (2d)**: planos, presupuestos y fotos, con filtro por tipo y buscador. Cada archivo con vista previa, quién lo subió y si vino "desde el celular". **Subir archivo**.

### 3 · Plata que sale del Taller
- **3a · Facturar al cliente** (externos):
  - Tipo: **Anticipo / Avance / Saldo final**.
  - **Importe**, con la ayuda "20 % del precio de venta".
  - **Concepto**.
  - Resumen antes de confirmar: "Facturado pasa de $ 5.880.000 a $ 7.840.000 · Falta facturar $ 1.960.000 de $ 9.800.000".
  - **Confirmar · $ 1.960.000**.
- **3b · Cargar a la fábrica** (internos): importe, concepto, resumen ("Cargado a Cucuruchos Nuss pasa de $ 1.200.000 a $ 1.900.000") y Confirmar.
- Atrás de 3b se ve el caso **atrasado y pasado de presupuesto**, todo en bordó.

### 4a · Valor de la hora
- Siempre a mano, en la lista y en la ficha.
- En la ventana: el valor actual en grande y desde cuándo; el **historial** (desde, valor, quién lo cambió); **nuevo valor** y **desde**.
- "Las horas cargadas antes del 01/10 siguen con su valor. Las nuevas toman el nuevo."

### 5 · Estados
- **5a · Sin valor de hora**:
  - El costo de las horas dice "**sin valor de hora**" en bordó, con "Cargá el valor para calcularlo".
  - La barra muestra solo los gastos, avisándolo.
  - El margen dice "falta el valor de hora".
  - El botón de arriba dice "Valor de la hora · sin cargar".
- **5b · Sin datos**: "No hay proyectos internos cancelados · Probá con otro estado o sacá los filtros", con **Sacar los filtros**.
- **5c · Cargando y error**: las tarjetas en gris mientras cargan. Si falla, el aviso bordó con **Reintentar**.
- **Atrasado / pasado**: siempre en bordó (tarjeta, entrega, barra, horas).

### 6 · Celular
- **6a · Lista**: filtro corto (Todos · En curso · Atrasados) y las tarjetas de a una.
- **6b · Ficha, Archivos (Edgar)**: arriba el avance en %, luego las pestañas Horas · Notas · Archivos. Botones grandes (56 px) **Sacar foto** y **Subir archivo**, y los últimos archivos.

---

### 7 · Diagrama de actividades (nuevo)
Tipo Gantt. Lo arma Tomás; Edgar y los demás operarios ven solo lo suyo (7d). Es una pestaña del módulo: **Proyectos · Diagrama de actividades**. La burbuja bordó cuenta atrasadas + superpuestas.
- **Rango**: 2 semanas de lunes a sábado (12 columnas; sin domingos), con ‹ Hoy › y "2 semanas ▾" (1 semana / 2 semanas / mes). **Hoy** va en naranja: la cabecera dice "HOY" y la columna tiene fondo `#FFF8F3`. El cambio de semana lleva una línea más gruesa y el sábado va más tenue.
- **Barras**: una por actividad, ocupando sus días, **del color de su proyecto**. El fondo es el tono suave del proyecto y lo más oscuro, de izquierda a derecha, es el **avance** (%). A la izquierda llevan un borde de 5 px del color del proyecto. Adentro: el nombre (hasta 2–3 renglones en las de un día) y, abajo, el proyecto · horas · avance. En la vista por proyecto la barra dice solo quién y cuántas horas (iniciales en las de un día), porque el nombre ya está en el renglón. Cada actividad tiene un **nombre corto** opcional ("Instalación M3", "Medir Duomo") que se usa en las barras de un día; el nombre completo aparece al tocar. Los sábados van más angostos (0,6 del ancho de un día).
- **Colores de proyecto**: Maq Barquillo 24 Carrizo ciruela `oklch(0.52 0.13 330)`, Dosificador M3 ámbar `oklch(0.62 0.13 70)`, Automatización empaque oliva `oklch(0.55 0.11 125)`, Soporte Persicco rosa `oklch(0.58 0.14 0)`, Cinta Duomo violeta `oklch(0.52 0.14 290)`. Se asigna uno por proyecto al crearlo, de una paleta cerrada sin azules.
- **Bordó**: **atrasada** (borde lleno: tenía que terminar y no llegó al 100 %) y **se superpone** (borde punteado: la misma persona tiene dos cosas el mismo día). Arriba, un aviso bordó con cuántas hay y dónde.
- **7a · Por operario**: un renglón por persona del Taller, con sus iniciales, su nombre y cuántas horas tiene en el período sobre las disponibles (96 h en 2 semanas). Si dos actividades se pisan, el renglón se abre en dos carriles. Los huecos blancos son días libres.
- **7b · Por proyecto**: una franja por proyecto (color, estado, entrega y "Atrasado" si corresponde) y debajo sus actividades, con las iniciales de quién la hace.
- **7c · Editar**: con el panel abierto, el diagrama pasa a 1 semana para que las barras se lean. Tocar una barra la marca con un borde naranja de 3 px y abre el panel a la derecha (380 px), con la franja del color del proyecto. **¿Quién la hace?** muestra qué tiene ya cada operario ese día. Si hay choque, aparece el aviso bordó. Desde, hasta, horas estimadas y avance. Eliminar / Cancelar / Guardar.
- **Arrastrar**: la barra se mueve de día; desde el borde derecho, se alarga o se acorta. "+ Actividad" abre el mismo panel vacío.
- **7d · Celular, Mis actividades**: cada operario ve lo suyo por día. Cada actividad va en una tarjeta con la franja del color del proyecto, cuándo, horas y avance, más **Cargar horas** (va a Horas del proyecto) y **Marcar avance**. Sin precios.
- El diagrama **no muestra plata**, así que lo que ve Edgar y lo que ve Tomás es lo mismo, salvo que Edgar no edita.

## Reglas
- Sin azules. **Naranja** para lo que se toca y lo elegido; **verde** para lo cobrado y el margen bueno; **bordó** para atrasado, pasado de presupuesto y lo que falta cargar.
- Todo lo que mueve plata muestra antes de confirmar cómo va a quedar.
- Castellano rioplatense, sin "usted".

## Decisiones para confirmar
1. Edgar no ve ningún $ (tampoco el presupuesto de costo); ve porcentajes y horas.
2. Cambiar el valor de la hora rige desde una fecha y no recalcula las horas viejas.
3. El margen se calcula con el costo real de hoy (gastos + horas), no con el presupuesto.
4. Diagrama: cada actividad la hace una sola persona; si la hacen dos, se cargan dos actividades.
5. Diagrama: lunes a sábado, jornada de 8 h para calcular las horas disponibles.

## Files
- `Proyectos Taller.dc.html` · `logo.png` · `support.js`
