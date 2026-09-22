# Traspaso — Cobranzas: la vista Cheques en escritorio y el aviso de la banda magnética (noche del 21/09/2026, parte 9)

Para el chat de arquitectura (dueño de CLAUDE.md). Autocontenido: quien lo lea no vio el trabajo. **Sin cambios de base** (Supabase solo lectura esta noche) y **sin tareas ni permisos nuevos**. Sin commit: lo hace quien invocó. Solo se tocó `modulos/cobranzas.html` y `pruebas/` de Cobranzas.

## a) La vista "Cheques" en escritorio

**Qué pasaba:** en escritorio la planilla de Cheques quedaba con el ancho del celular (`.cob-contenedor` a 860 px): centrada y angosta, el nombre del banco partido en tres renglones y la columna Estado fuera de la vista (había scroll de costado: tabla de 1040 px en una caja de 826).

**Qué cambió** (todo adentro de los `@media` de escritorio; abajo de 1100 px no se tocó ninguna regla):
- En `@media (min-width: 1100px)`: `.cob-contenedor:has(#cob-vista-cheques:not([hidden])) { max-width: 1440px; padding-left/right: 1.25rem }`, **el mismo ancho que el listado en modo maestro** (`.cob-contenedor:has(.cob-maestro--activo)`). Engancha a la vista **visible**: un detalle abierto desde Cheques vuelve al ancho de siempre (sigue a pantalla completa, como antes).
- La celda del banco lleva `class="cob-tabla__texto cob-tabla__banco"` y **`title="${escCob(nombreBanco(...))}"`** con el nombre completo (texto de la base, escapado también en el atributo). En escritorio: `.cob-tabla__banco { max-width: 16rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis }` → una línea con puntos suspensivos.
- En `@media (min-width: 1100px) and (max-width: 1399px)`: `.cob-tabla__banco { min-width: 0; max-width: 10rem }`. **Hace falta:** con el banco a 16rem, a 1100 px la tabla se pasaba 77 px y volvía el scroll de costado. El `min-width: 0` suelta el `min-width: 11rem` de `.cob-tabla__texto`, que si no le gana al `max-width`.

**Verificado en un navegador** (Chrome del pane, página armada con el `<style>` real del módulo, `css/main.css`, el markup real de la vista y la tabla generada con `htmlTablaCheques` real sobre 12 cheques con nombres de banco, clientes y destinos largos; sin sesión):
- **1440 px:** caja 1383 px, `scrollWidth` 1383 = `clientWidth` → **todas las columnas sin scroll**; banco 256 px en una línea con ellipsis, `title` con el nombre completo. Antes: 1040 en 826.
- **1300 px:** 1243 = 1243. **1100 px:** 1043 = 1043 (la suma natural de columnas da ~1024, o sea ~19 px de margen); banco 160 px.
- **Abajo de 1100 (390, 768 y 1099 px):** la posición y el tamaño de **cada elemento** de la vista son idénticos a los del commit `d79765b` (comparación elemento por elemento); a 390 la tabla sigue scrolleando de costado dentro de su caja (1040 en 342) con la columna del número `sticky`, y la página no scrollea (375).

**Pendiente visual menor, no pedido:** en escritorio los filtros de la vista Cheques (N° de cheque, Banco) ahora se estiran al ancho completo de 1400 px. Funciona, pero un campo de número de 1400 px de ancho es feo; se puede acotar en una pasada de estilo. No se tocó por no inventar diseño.

## b) El aviso de `completado_desde_cmc7`

El pie de cada renglón de la banda magnética, cuando el cheque vino con `controles.completado_desde_cmc7`, pasa a decir **exactamente** (opción A del traspaso `2026-09-21-cobranzas.md`):

> "Puede que este renglón no se haya leído del papel: en este cheque el sistema completó datos desde la banda magnética y calculó su dígito. Comparalo con lo impreso."

Antes decía "Este dígito lo calculó el sistema desde la banda magnética: no se leyó del papel. Contralo contra el cheque.", que era **falso en los renglones que sí se leyeron**, porque el flag es **por cheque** y no por renglón. El nuevo texto no afirma de qué renglón se trata. **El arreglo de fondo sigue pendiente** (que `ocr-cheques` devuelva qué renglones completó, p. ej. `completado_desde_cmc7_renglones`): con eso el aviso podría ir solo en el renglón completado.

## Qué tocar en CLAUDE.md

Sección **Módulos → 8. Cobranzas**:
1. En **"VISTA CHEQUES"** agregar: *"Desde 1100 px (`MQ_ESCRITORIO`) la vista usa el mismo ancho que el listado en modo maestro (`.cob-contenedor:has(#cob-vista-cheques:not([hidden]))`, 1440 px) y el banco va en una línea con puntos suspensivos y el nombre completo en el `title` (escapado): 16rem desde 1400, 10rem entre 1100 y 1399 (con `min-width: 0`, si no a 1100 volvía el scroll). Medido en Chrome: sin scroll de costado a 1100, 1300 y 1440; abajo de 1100 la vista es idéntica elemento por elemento a `d79765b`."*
2. En **"SALIDA DE CHEQUES"**, el renglón *"El pie de `completado_desde_cmc7` puede afirmar algo falso…"*: reemplazar por *"El pie de `completado_desde_cmc7` dice (desde el 21/09/2026) «Puede que este renglón no se haya leído del papel: en este cheque el sistema completó datos desde la banda magnética y calculó su dígito. Comparalo con lo impreso.» — no afirma de qué renglón se trata, porque el flag es por cheque. Pendiente de fondo: que `ocr-cheques` diga qué renglones completó."*
3. En **Cómo trabajar → Las suites de verificación viven en `pruebas/`**, actualizar los números de Cobranzas (abajo).

## Suites y números (al cerrar)

- `node pruebas/check-scripts.js` → OK (todos los bloques parsean, sin identificadores pisados).
- `test-cobranzas-escritorio.js` → **61/61** (eran 45; +16 de la vista Cheques). Sobre `d79765b` da **50/61 rojo**. Lo nuevo: la regla del contenedor existe en `@media (min-width: 1100px)` con el **mismo `max-width`** que el listado y engancha a la vista visible; toda regla de `.cob-tabla__banco` vive adentro de un `@media (min-width: 1100px)`, con `nowrap`, `overflow: hidden`, `text-overflow: ellipsis` y `max-width`; entre 1100 y 1399 suelta el `min-width` y es más angosta; **el CSS fuera de los bloques de escritorio es idéntico al de `d79765b`** (baseline fijo, leído con `git show`, y la prueba falla si no lo pudo leer); y `htmlTablaCheques` **ejecutado** con un nombre de banco malicioso: la celda lleva la clase, el `title` escapado y ninguna marca sale cruda.
- `mut-cobranzas-escritorio.js` → **45/45 detectadas** (eran 35; +10: sin `title`, `title` sin escapar, sin `nowrap`, sin ellipsis, sin la clase, ancho distinto del listado, ancho enganchado aunque la vista esté oculta, `nowrap` o el ancho aplicados también en celular, y sin el `min-width: 0` entre 1100 y 1399).
- `test-cobranzas-xss.js` → **323/323** (el pie CMC-7 ahora exige el texto exacto nuevo y que no quede el viejo). `mut-cobranzas-xss.js` suma la mutación "vuelve el texto viejo"; la del `if (false)` del pie sigue.
- `controles-cobranzas.js` → **354/354**. El resto de `pruebas/test-*.js`: todos verdes (cabecera 72, fotos 70, numeros 146, y los de los otros módulos sin cambios).
- `mut-cobranzas-xss.js` → **222/222 detectadas** + 1 equivalente declarada (eran 221 + 1; la nueva es la del texto viejo del pie CMC-7). Las automáticas de `escCob` no se volvieron ambiguas con el `title` nuevo.
