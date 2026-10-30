# Traspaso 30/10/2026 — Valorizar más legible

Pedido: `.claude/pedidos/2026-10-30-valorizar-legible.md`. Rama `ci-prueba/valorizar-legible`, salida de `origin/main` =
e6e0c74, en un git worktree aparte. **Trae `ci-prueba/remitos-mas-simple` (302b351) con un merge** para reusar
`textoUnidadesRemito` de `js/remitos-comun.js` (el pedido dice no duplicarla): se integra DESPUÉS de remitos-mas-simple.
Toca solo `modulos/administracion.html` (más pruebas y docs). La base no se tocó.

## Qué cambió
1. **El nombre del renglón** al valorizar, en el detalle de la orden y en las hojas N1/N2: "Barquillo 40 x4 · Caja con
   cono **× 252 u.** · VENEZIA" y "Soft · Caja sin cono **× 224 u.**" (en negrita y sin partirse; sin el "· Sin cono"
   final; nada con 1 ni si el nombre ya trae el número, como en Remitos Dolce).
2. **El descuento**: la orden valorizada muestra "(−5 %)" al lado del precio por caja (`orden_retiro_items.descuento_pct`).
   Al valorizar, si `precio_venta` trae `descuento_pct`, va "(−5 % CASERATO · antes $ 35.830,80)" chico y en el color normal.
3. **La caja con cono en Listas** hace la misma cuenta que la base: sin redondear en el medio y con la aritmética de
   numeric (la caja de 23.990,80 se ve 23.990,80; comprobado contra la base con 10 casos).

## LO QUE NO SE HIZO, Y POR QUÉ (para el chat de la base)
- **`precio_venta` NO devuelve `descuento_pct` ni `precio_caja_sin_descuento`** (leída con pg_get_functiondef el
  30/10/2026). Su comentario de hoy dice: "el precio es el de la lista; los descuentos van por condición especial del
  cliente (al valorizar)". El descuento lo pone `valorizar_orden_retiro` desde `ordenes_retiro.condiciones_especiales`
  (`cliente_condiciones_especiales`, `valorizar_con_condiciones`, `guardar_condicion_especial`). La pantalla de valorizar
  ya está lista para mostrarlo si `precio_venta` lo devuelve, pero hoy nunca aparece.
- **El campo "Descuento en el precio de venta (%)" en Conos NO se hizo.** `guardar_descuento_marca` y
  `marcas_personalizadas.descuento_pct` existen, pero ninguna función de precios lee ese descuento: el campo guardaría un
  número que no cambia ningún precio. Si el chat de la base vuelve a usarlo, es una tarea corta (campo + sello "−5 %").
- No hay pantalla para elegir las condiciones especiales de una orden (`valorizar_con_condiciones`): queda para otro pedido.

## Pruebas
- Nueva `test-/mut-administracion-valorizar-legible.js` (baseline f3d7152); `test-administracion-ordenes.js` y
  `-link-remitos.js` ajustadas; seguras de XSS al día. `e2e/103-valorizar-legible.spec.js` (390 y 1280 px).

## Lo que no se pudo probar
- El "antes $ …" con datos reales: la base todavía no lo manda (solo con la maqueta).

## Qué automatizaría ahora
- Comparar en la suite la cuenta de la pantalla contra la base con un SELECT guardado: hoy los 10 casos de
  `precio_venta` están copiados a mano. Un script `npm run cuentas:base` que corra el SELECT (solo lectura) y regenere esa
  tabla avisaría solo cuando el chat de la base cambie la cuenta.
