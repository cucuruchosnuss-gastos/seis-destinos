# Traspaso 29/10/2026 — Mercadería en tránsito entre empresas y varios lotes por renglón

Pedido: `.claude/pedidos/2026-10-29-recibir-entre-empresas.md`. Rama `ci-prueba/recibir-entre-empresas`, salida de main
497c393 (con remitos-autoguardado integrada). La sección de Stock la hizo el agente de Stock en
`ci-prueba/recibir-stock` (0e42ba8) y se unió acá; su traspaso: `.claude/traspasos/2026-10-29-stock.md`.

## Qué cambió
- **Stock** (`modulos/stock.html`): "En camino desde otra empresa" arriba (`#st-en-camino`, `?seccion=en-camino`), con
  stock:ver o stock:recibir_transferencia en la fábrica de la barra: una tarjeta por envío, "Recibir" con cada renglón
  precargado con lo enviado, motivo si cambia, "Confirmar recepción" → `recibir_orden_grupo` (errores tal cual); abajo,
  plegado, "Recibidos" de 30 días con quién, cuándo y las diferencias. Ver docs/memoria/stock.md.
- **Administración**: el detalle de una orden interna dice "En tránsito a <empresa>" / "Recibida por <nombre> el dd/mm"
  con las diferencias, leyendo `recepciones_grupo` (docs/memoria/administracion.md).
- **Remitos Dolce y la Carga**: con un cliente del grupo, antes de confirmar: "Es una orden interna: la mercadería va en
  tránsito hasta que <empresa> la reciba"; el aviso de confirmada también.
- **Tablero**: `stock:mercaderia_en_camino` en `RESOLVER_PENDIENTES`, a `stock.html#st-en-camino`. **`mis_pendientes()`
  todavía no la devuelve**: la burbuja aparece cuando la base la agregue (abajo, qué hace falta).
- **Lotes**: varios lotes por renglón ya funcionaban en Remitos Dolce y en la Carga sin control (con la suma controlada);
  Remitos Dolce ahora muestra "Lotes: 25 de 31 cajas" en amarillo mientras no suman. La hoja y el PDF ya mostraban cada
  lote con sus cajas.

## Pruebas
- Nuevas: test-/mut-stock-en-camino (173; 156/156 + 5 eq.), test-/mut-administracion-orden-recepcion (36; 25/25),
  test-/mut-remitos-dolce-interna-lotes (33; 15/15); test-/mut-tablero (+3; 76/76).
- Ajustadas: entre empresas de Administración (89; 45/45), de la Carga (52; 30/30), mandar-grupo (37; 23/23),
  mut-retiros-carga (118/123: los 5 que escapan ya escapaban en main —daba 118/124—, son textos fijos del código),
  revisar de Remitos Dolce, las de Stock que tocó el agente, la lista de seguras de XSS de Administración.
- e2e 97 (Stock) y 98 (Administración + Remitos Dolce) a 390 y 1280 px; 62, 68 y 71 ajustados.

## Decidido sin consultar
- El tablero queda listo para la clave nueva en vez de contar por su cuenta (la regla del dashboard: el número es
  siempre el de mis_pendientes()).
- En Administración, si recepciones_grupo no trae la orden (sin stock:ver ni recibir en la que recibe, u orden de antes
  del 29/10) se dice eso, sin inventar un estado.
- El aviso de confirmada en Remitos Dolce conserva "Ya se puede valorizar en Administración." y suma lo del tránsito.
- No hizo falta una pieza en js/ para los lotes: la Carga y Remitos Dolce ya hacían lo mismo, cada uno a su manera.
- Las decisiones de Stock (dónde se ve la sección, quien solo puede recibir, "Todas", etc.) están en su traspaso.

## Para el chat de la base
- **mis_pendientes()**: sumar `('stock', 'mercaderia_en_camino', count(*), 'Mercadería en camino')` de
  `orden_grupo_recepciones` en 'en_transito' cuyo `unidad_destino_id` cumpla
  `tiene_tarea_alcance('stock','recibir_transferencia', unidad_destino_id)`.
- **recepciones_grupo**: un `p_orden_id` (Administración hoy lee todas las de esa empresa y filtra), un límite de fecha
  para las recibidas (Stock filtra 30 días en la pantalla) y devolver las observaciones de la recepción (hoy devuelve las
  de la orden).

## Lo que no se pudo probar
- Con datos reales: la tabla de envíos estaba vacía. Todo con dobles y la maqueta.
- Safari.
- El humo "la planta sin sesión" falla en este contenedor también sobre main (no llega a la base real).

## Qué automatizaría ahora
- Un `pruebas/dom-falso.js` (el agente de Stock armó uno dentro de su suite para probar formularios sin navegador):
  ahorra ~80 líneas en cada suite de formulario.
- Un control que avise cuando se edita a mano un `e2e/maqueta/datos/*.json` generado (hoy lo dice test-maqueta-datos
  recién al correr todo): un pre-chequeo de `git diff` que nombre el archivo fuente en `pruebas/datos-maqueta/`.
