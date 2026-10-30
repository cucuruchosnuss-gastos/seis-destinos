# Traspaso 30/10/2026 — Valorizar más legible

Pedido: `.claude/pedidos/2026-10-30-valorizar-legible.md` (con el CAMBIO del punto 2). Rama `ci-prueba/valorizar-legible`,
salida de `origin/main` = e6e0c74, en un git worktree aparte. **Trae `ci-prueba/remitos-mas-simple` (302b351) y
`ci-prueba/corregir-orden` (da0c835) con merges**: la primera por `textoUnidadesRemito` (no duplicarla), la segunda porque
el punto d) cambia Corregir orden. **Se integra después de esas dos.** Toca solo `modulos/administracion.html` (más
pruebas y docs). La base no se tocó.

## Qué cambió
1. **El nombre del renglón** al valorizar, en el detalle y en las hojas N1/N2: "Barquillo 40 x4 · Caja con cono **× 252
   u.** · VENEZIA" y "Soft · Caja sin cono **× 224 u.**" (en negrita y sin partirse; sin el "· Sin cono" final).
2. **Las condiciones especiales del cliente** (el punto 2 nuevo): sección en la ficha (lista, interruptor Activa, Editar,
   "Agregar condición" con buscador de conos y productos); tildes al valorizar con el precio con descuento en vivo y el
   total, guardando con `valorizar_con_condiciones` y los precios de LISTA; "(−5 % · nombre)" en la orden valorizada y en
   las hojas N1/N2; Corregir orden con `precio_lista` y el total estimado con las condiciones. El descuento de
   `precio_venta` y el campo de Conos se sacaron (anulados).
3. **La caja con cono en Listas** hace la misma cuenta que la base (sin redondeo intermedio y con la aritmética de
   numeric: la caja de 23.990,80 se ve 23.990,80; comprobado contra la base con 10 casos).

4. **El cono de papel ilustración** (agregado): "… · MARBET (ilustración)" al valorizar, en el detalle, en las hojas N1/N2 y
   en la hoja de la orden, y "conito ilustración $ 47,00 por unidad" en chico al valorizar. Lo de Remitos Dolce y la hoja
   de la Carga está en `ci-prueba/remitos-mas-simple` (esta rama la trae de nuevo, 2f3ce1e).

## Decidido sin consultar
- Al revalorizar se propone `precio_lista` (no `precio_caja`, que ya viene descontado: si no, la base descontaría dos veces).
- Una condición tildada que después se desactivó no se manda al revalorizar (solo se ofrecen y mandan las activas).
- Los nombres de las condiciones en el detalle se leen solo con retiros:precios (la función lo exige): sin eso, "(−5 %)".
- La hoja de retiro impresa (js/retiros-comun.js, compartido) no muestra el descuento: el precio impreso ya es el
  descontado. Si Facu lo quiere ahí, es un cambio en el js compartido.

## Pruebas
- Nueva `test-/mut-administracion-valorizar-legible.js` (134; 81/81 + 2 equivalentes, baseline f3d7152): el nombre, la regla
  de las condiciones, valorizar con y sin tildes ("toda la orden" sin la reposición), revalorizar con precio_lista y los
  tildes, la ficha (alta, edición, activa/inactiva, validaciones, error de la base, escapes) y Corregir orden.
- Ajustadas: las que simulaban `valorizar_orden_retiro` (devoluciones, lista-otra-empresa, orden-entre-empresas, ordenes,
  valorizar-con-division y los e2e 57, 59, 62, 95), `test-administracion-ordenes.js`, `-link-remitos.js`, seguras de XSS
  y las anclas de `mut-administracion-devoluciones/-ordenes/-lista-completa` y `mut-faltante-retiro`.
- `e2e/103-valorizar-legible.spec.js` (390 y 1280 px): valorizar con el tilde, la orden valorizada y la ficha.

## Lo que no se pudo probar
- Con datos reales (no hay sesión en el contenedor): todo con la maqueta y respuestas simuladas.

## Qué automatizaría ahora
- Comparar en la suite la cuenta de la pantalla contra la base con un SELECT guardado: hoy los 10 casos de
  `precio_venta` están copiados a mano. Un script `npm run cuentas:base` que corra el SELECT (solo lectura) y regenere esa
  tabla avisaría solo cuando el chat de la base cambie la cuenta.
