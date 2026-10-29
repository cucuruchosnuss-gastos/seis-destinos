# Pedido de Facu — 29/10/2026: recibir entre empresas y varios lotes por renglón

Rama: `ci-prueba/recibir-entre-empresas` (desde el origin/main más reciente, con remitos-autoguardado ya integrada;
copia aparte con git worktree). No toca `modulos/produccion.html`: se integra en cuanto esté en verde, con el candado
(`npm run candado -- tomar recibir-entre-empresas` / `soltar`).

## Parte 1 — Mercadería EN TRÁNSITO entre empresas del grupo
Toda orden entre empresas del grupo (cliente con `unidad_grupo_id`: una orden interna N-I-/D-I- de la Carga o un remito
de Rosario a "Paz Mirta" confirmado en Remitos Dolce) queda EN TRÁNSITO hasta que la empresa que recibe la acepta
(Franco/Emma en Córdoba, Manuel en Rosario). El chat de la base ya lo hizo (verificar con pg_get_functiondef /
information_schema): tablas `orden_grupo_recepciones` (en_transito | recibida | anulada) y
`orden_grupo_recepcion_items`; `_orden_grupo_espejar` arma la recepción en tránsito; `recepciones_grupo(p_unidad_negocio_id
default null, p_estado default 'en_transito')`; `recibir_orden_grupo(p_recepcion_id, p_items, p_observaciones)` (pide
stock:recibir_transferencia en la que recibe; errores tal cual); `anular_orden_retiro` cancela la recepción en tránsito.
1. `modulos/stock.html`: sección "En camino desde otra empresa" (arriba, con stock:ver o stock:recibir_transferencia en la
   fábrica de la barra): una tarjeta por envío; "Recibir" con cada renglón precargado y editable, motivo si cambia,
   "Confirmar recepción" → recibir_orden_grupo. Abajo "Recibidos" (últimos 30 días): quién, cuándo y las diferencias.
2. Tablero: burbuja "Mercadería en camino: N" para quien puede recibir, que lleva a esa sección. Si mis_pendientes no lo
   trae, describir qué haría falta en la base (no tocarla).
3. `modulos/administracion.html`, detalle de una orden interna: "En tránsito a <empresa>" / "Recibida por <nombre> el
   dd/mm" (con las diferencias), leyendo recepciones_grupo.
4. Remitos Dolce (Revisar) y la Carga: si el cliente es del grupo, antes de confirmar: "Es una orden interna: la
   mercadería va en tránsito hasta que <empresa> la reciba".

## Parte 2 — Varios lotes por renglón, para cualquier cliente
5. Remitos Dolce (Revisar): lotes con sus cajas, "+ Agregar lote", quitar; lo leído por la IA precargado; "Lotes: 25 de 31
   cajas" en vivo y en amarillo si no suman; lotes en mayúsculas, máx. 40 letras; con el autoguardado.
6. La Carga en las fábricas sin control: verificar varios lotes con su cantidad y que la suma dé el renglón; igualar si no.
7. La hoja y el PDF de la orden muestran cada lote con sus cajas.

Pruebas: suites y mutaciones (recibir completo, con diferencia y motivo, sin motivo da error, más de lo enviado, anulada;
varios lotes que suman, que no suman, agregar y quitar lote, lo leído precargado); e2e a 390 y 1280 px. `npm run
pruebas` en verde, check-scripts. Integrá.
