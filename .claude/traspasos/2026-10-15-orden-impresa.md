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

---

# Sumado el 15/10/2026: el caso N-0014 (FERNANDEZ RICARDO, 10:51)

Verificado en la base (15/10, solo lectura): N-0014 tiene 3 renglones, los tres
"Caja sin cono" (`con_cono = false`), subtotal 1.007.613,60 y total
2.220.140,16; lotes 6235-1 ×42 · (6241-2 ×1 + SIN STOCK 20) · INICIAL ×21.
En `stock_terminado_movimientos` hay lotes INICIAL (inventario inicial, ajustes
y 4 despachos) y también **CORTE-1010** y **CORTE-1010-PY**.

## Qué cambió (`js/retiros-comun.js`; detalle en `docs/memoria/arquitectura.md`)

1. **Los números nunca se parten.** La causa: la regla general de las celdas
   (`.rh-tabla td { white-space: normal }`) le ganaba por especificidad a la de
   los importes, y la columna era angosta. Cada número va en un bloque que no
   baja de renglón (tabular-nums) y, si no entra, se achica la letra de esa
   columna (la mide `medirHoja` antes de imprimir y la aplica `htmlHoja`).
2. **Letra ~22 % más chica** en toda la hoja; CAJAS, LOTE, PRECIO X CAJA y
   SUBTOTAL de ancho fijo; el producto puede ir en dos renglones.
3. **Siempre partida al medio**: si no entra, sigue en otra hoja también
   partida ("ORIGINAL · HOJA 1 DE 2"), repitiendo cabecera, N°, fecha y
   cliente, con el TOTAL y las firmas solo en la última. Medido: 1 y 8
   renglones en una hoja; 15 en 11 + 4; 30 en 11 + 10 + 9.
4. "Caja sin cono · sin cono" → "Caja sin cono" (y lo mismo con "con cono");
   también en el texto para compartir.
5. Lote "INICIAL" → "—" (si hay otro lote real, va solo el real).

## Pruebas

- `pruebas/test-retiros-hoja.js` 245/245 (las de 1) y 4), los tamaños, el
  plan de hojas, INICIAL); `mut-retiros-hoja.js` 114/114.
- `e2e/28-hoja-retiro.spec.js` 9/9: A4 en Chromium con 1, 8, 15 y 30
  renglones, sin y con precios (importes grandes), y N-0014: ningún número en
  dos renglones ni afuera de su celda, el total entero, cada hoja partida con
  sus rótulos, total y firmas solo en la última, PDF con una página por hoja.
  **Contra el código anterior fallan 8 de 9.**
- Ajustadas: `test-administracion-ordenes.js` (el total ahora va en su bloque),
  `seguras-retiros.js` (los valores nuevos que entran al HTML, justificados),
  `e2e/5-maqueta.spec.js` (solo comentarios). `e2e/47` y `e2e/34` en verde.
- `npm run pruebas` 263/263.

## Decidido sin consultar

- "Seguir en otra hoja" = **cada hoja sigue partida** (ORIGINAL arriba y
  DUPLICADO abajo, con los mismos renglones). Antes, si no entraba, cada copia
  iba en hojas enteras; se sacó.
- La cantidad de un insumo en la columna CAJAS ("1.250,5 kg") se achica aparte,
  para no achicar las cajas de los productos. Con 1.250,5 kg queda chica
  (~8,6 px) pero entera.
- **CORTE-1010 / CORTE-1010-PY** se siguen imprimiendo: parecen lotes del corte
  como INICIAL, pero el pedido nombra solo INICIAL. **Para Facu**: ¿también
  "—"? Es agregarlos a `LOTES_QUE_NO_SON_LOTE`.
- Los rótulos van en mayúscula ("ORIGINAL · HOJA 1 DE 2"), como el resto del
  diseño.

## No probado

- La impresora de verdad (se midió en Chromium en modo impresión A4 y con
  `page.pdf`). Safari/iPhone imprimiendo: no.
- El PDF de "Enviar" (html2canvas desde el CDN): se probó el HTML que fotografía.
