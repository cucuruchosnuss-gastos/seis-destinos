# Traspaso — 15/10/2026: la hoja de la orden ya no dice "faltan" ni "pendiente de revisión"

Rama `ci-prueba/orden-impresa-faltante` (sin integrar: se integra cuando Facu
autorice). Pedido: `.claude/pedidos/2026-10-15.md`, punto 1. **No toca
`produccion.html` (la tablet) ni la base**: solo `js/retiros-comun.js` (la hoja
compartida de Carga, Mis retiros y Administración) y pruebas.

## Qué pasaba

N-0013 (Nuss, DUOLATE S.A.S., 15/10 08:47): 35 cajas, 30 del lote 6242-2 y 5
de la planilla abierta de Máquina 1. Mientras la planilla no cargó esa
producción, la base deja esas 5 en el lote interno `'SIN STOCK'`. La hoja lo
traducía a "6242-2 ×30 · faltan 5" en LOTE y a "Faltante: 5 cajas de …,
pendiente de revisión." abajo. El cliente firmaba eso.

Verificado en la base (15/10, solo lectura): hoy N-0013 ya está conciliada
(`stock_terminado_movimientos` despacho: 6242-2 −30 y 6244-1 −5;
`orden_retiro_items.revision = 'aceptada'`). `mis_ordenes_retiro()` ya lee los
lotes de `stock_terminado_movimientos` (tipo 'despacho', `orden_retiro_id`) y
pide `retiros:cargar` (el depósito la puede leer): **no hizo falta nada del chat
de la base**. Administración ya leía la misma tabla (con permiso de Producción
o Stock).

## Qué cambió

- `js/retiros-comun.js`:
  - `lotesRealesHoja(lotes, unidad)` (nueva): los lotes sumados por lote, sin
    `'SIN STOCK'`, sin `'sin lote'` ni vacíos, sin lo que suma cero o menos.
  - `textoLotesHoja(lotes, unidad, total)`: usa esos lotes. Dos o más:
    "6242-2 ×30 · 6244-1 ×5". Uno que cubre todo el renglón: "6242-2". Uno que
    cubre una parte: "6242-2 ×30" (sin texto de faltante). Ninguno: "—".
  - `htmlNotasHoja`: solo las observaciones; se fue la línea del faltante
    (`faltanteDeRenglon` ya no existe).
  - `textoOrden` (Compartir como texto / WhatsApp): los mismos lotes reales.
  - El PDF (Enviar) usa `htmlHoja`: queda arreglado con lo mismo.
- CAJAS y TOTAL DE CAJAS ya eran las cajas del renglón (35): ahora una prueba lo fija.
- En PANTALLA no cambió nada: Carga, Mis retiros ("Esperando la planilla de
  Máquina 1 (lote 6244)"), Administración (la orden muestra "SIN STOCK (2)") y
  Por revisar siguen mostrando el faltante.

## Pruebas

- `pruebas/test-retiros-hoja.js`: 192/192 (casos nuevos: un lote, dos lotes,
  parte sin lote, todo sin lote, mismo lote repetido, compensado a cero,
  insumo, hojas enteras, con precios, PDF, texto para compartir; y que nunca
  aparezca "pendiente de revisión" / "faltan" / "Faltante" / "SIN STOCK").
- `pruebas/mut-retiros-hoja.js`: 85/85 (12 mutaciones nuevas; se fueron las 3
  del faltante viejo y la de "un lote solo repite su cantidad", reemplazada).
- `e2e/47-orden-impresa-faltante.spec.js`: 9/9 (Mis retiros → Imprimir y
  Compartir a 1280, 390, 360 y tablet 1000 × 540; N-0013 conciliada;
  Administración → Imprimir a los cuatro tamaños). **Contra `origin/main`
  fallan 8 de 9** con la hoja del caso real ("6242-2 ×30 · faltan 5" y
  "Faltante: … pendiente de revisión"); la de la orden conciliada pasaba antes
  también (es de guarda).
- También en verde: `e2e/28-hoja-retiro`, `e2e/34-faltante-retiro`.
- `npm run pruebas`: 263/263 (ver el informe final de la sesión).

## Decidido sin consultar

- Un solo lote conocido que cubre una PARTE del renglón lleva su cantidad
  ("6242-2 ×30"), para que la trazabilidad no diga que las 35 salieron de ahí.
  Si cubre todo, va solo, como antes.
- Lo que en Administración llega como `'sin lote'` (un insumo sin lote) tampoco
  va a la hoja.
- El detalle en pantalla de Mis retiros y de Administración sigue con
  `textoLotes` crudo (muestra "SIN STOCK (5)"): es para la oficina.

## No probado

- El PDF real (html2canvas + jsPDF bajan del CDN): se probó el HTML que
  fotografía (`htmlHoja` con `COPIAS_PDF`), no el archivo.
- iPhone/Safari: la hoja es la misma en todos los navegadores.
