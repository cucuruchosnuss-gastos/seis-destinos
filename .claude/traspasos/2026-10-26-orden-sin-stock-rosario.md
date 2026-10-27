# Traspaso — La orden de retiro en una fábrica sin control de stock (Dolce Pasta, 26/10/2026)

Pedido: `.claude/pedidos/2026-10-26-orden-sin-stock-rosario.md`.
Rama: `ci-prueba/orden-sin-stock-rosario` (desde `origin/main` `8c42d68`, como dice el pedido). Se integra DESPUÉS de `ci-prueba/imprimir-iphone` (las dos tocan `modulos/retiros.html`, en lugares distintos). Hashes: en el resumen del chat.
Supabase: solo lectura (verificado el 26/10/2026: `controla_stock_terminado` = false solo en Dolce Pasta; `registrar_orden_retiro` y `catalogo_para_retiro` con `pg_get_functiondef`).

## Qué se hizo (en castellano simple)

En **Órdenes de retiro → Nuevo retiro**, si la fábrica es **Dolce Pasta** (que todavía no carga su producción):
- Los productos aparecen **todos**, sin "sin stock" ni grisados, sin tener que buscarlos.
- Al elegir uno, se ponen las **cajas totales** y abajo **se escriben los lotes** a mano: Lote + Cajas, y "**+ Agregar lote**" para otro. Abajo dice "**Asignado 69 de 84 · faltan 15 cajas**". No deja agregar el renglón hasta que la suma da el total.
- Si no se escribe ningún lote, dice "**Va sin lote**" y se puede seguir (la base lo anota como SIN LOTE).
- Ya no aparecen "¿De dónde salen?", el aviso de faltante, "Completar con los más viejos" ni "Que salga sola…" para el producto de Dolce.
- Los **insumos** de Dolce, igual que antes (con su stock).
- La hoja y el PDF muestran los lotes escritos.
- En **Cucuruchos Nuss y Mengui no cambia nada**.

## Decidido sin consultar

1. **Si no se puede leer** si la fábrica controla el stock, la pantalla sigue como una fábrica con control (lo de siempre): nunca deja de pedir lotes por un error de lectura.
2. **Una fila con cajas tiene que tener lote** (y una con lote, cajas): la base aceptaría un lote vacío como 'SIN LOTE', pero mezclado con otros lotes sería confuso. Sin ninguna fila escrita sí se puede ("Va sin lote").
3. **Con cono**: sin control no hay stock por cono, así que se ofrece la presentación una vez y el cono se elige después (todos los conos).
4. **La reposición** en Dolce también escribe sus lotes (sale del stock como un retiro); la devolución, como siempre (no lleva lotes).
5. Los lotes escritos **se sueltan si se cambia el producto, la presentación o el cono** (como la respuesta de "¿De dónde salen?").

## Lo que no se pudo probar

- Contra la base real (Claude Code solo lee): el ajuste automático, el despacho y el espejo a Nuss con PAZ, MIRTA los hace la base; en la maqueta se miró lo que la pantalla manda. La primera orden real de Dolce conviene mirarla en Stock terminado de Dolce (tiene que quedar en 0 con un ajuste y un despacho por lote).

## Guion para Facu

1. Órdenes de retiro → Nuevo retiro → **Dolce Pasta** → un cliente.
2. Tocá **Capelina Grande** (aparece sin buscar) → 84 cajas → Lote **10430**: 30 → **+ Agregar lote** → **10433**: 39 → abajo dice "faltan 15" → otro lote **10440**: 15 → Agregar → Revisar → Confirmar.
3. Imprimí: la hoja tiene que decir 10430 ×30 · 10433 ×39 · 10440 ×15.
4. Probá una orden sin escribir lotes: dice "Va sin lote" y confirma igual.
5. En Cucuruchos Nuss, todo igual que antes.

## Qué automatizaría ahora

- **Un "lote de hoy" sugerido** para Dolce: si las cajas salen de la tanda del día, el lote podría venir propuesto (el lote vigente del producto, `producto_lote_vigente`), con la misma pregunta "¿Sigue siendo este?" del ingreso de producto terminado (`js/ingreso-terminado.js`).
- Cuando Dolce empiece a cargar su producción: poner `controla_stock_terminado = true` y la pantalla vuelve sola al modo con stock (no hay que tocar código).
