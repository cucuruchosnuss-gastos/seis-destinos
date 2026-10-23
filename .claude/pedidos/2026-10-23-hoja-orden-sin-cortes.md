# Pedido del 23/10/2026 — la hoja de la orden sin cortes de más (URGENTE)

Rama: `ci-prueba/hoja-orden-sin-cortes` (desde `origin/main` `df19453`). La integra la sesión principal apenas esté en verde.

## Pedido de Facu, textual

PROBLEMA (js/retiros-comun.js, la hoja impresa / PDF de la orden de retiro). La N-0025 (SALVADOR LOFORTE, 5 renglones + observaciones):
- No entró en media hoja (original + duplicado en una A4).
- Y en hoja entera la partió en "HOJA 1 DE 2" (4 renglones) y "HOJA 2 DE 2" (1 renglón), cuando entraba de sobra en una sola.
En Chromium con Archivo, el chat de la base midió: copiaEntera ≈ 129,2 mm (límite de media hoja 136), fijo 45,7, final 33,3, filas ≈ 49,6 en total. Para que planHoja partiera así, en el equipo de Facu "final" tuvo que medir más de ~185 mm, o algo midió muy distinto.

QUÉ HACER:
1. Reproducí con los datos reales de la N-0025 (leelos de la base con SELECT: orden_retiro / orden_retiro_items y lo que use la hoja; o con la RPC que use la pantalla si hay forma de leerla): Chromium a 1280 y 390 px. Si podés, también WebKit/Safari (Playwright webkit, si está instalado; si no, anotalo), y el flujo real de generarPdf (html2canvas + jsPDF) y de imprimir. Encontrá qué medida sale mal y por qué (pistas a revisar: medir antes de que cargue la fuente Archivo / document.fonts.ready; medir en un contenedor con ancho distinto al de la hoja impresa —p. ej. el ancho del celular a 390 px o del contenedor oculto—, display:none, imágenes/logo sin cargar, min-height de .rh-hoja--entera / .rh-copia que infla "final", zoom del navegador, unidades px→mm). Contalo en el traspaso.
2. planHoja: si la copia entera (copiaEntera) entra en una hoja (≤ ALTO_UTIL_A4_MM), va en UNA hoja por copia, sin "Sigue en la hoja". Partir solo si de verdad no entra. Además, que nunca quede una hoja con un solo renglón cuando el total de renglones entraba en una. Prueba: con las medidas de arriba, y con "final" inflado, el plan nunca parte una orden de 5 renglones.
3. Media hoja con más lugar: achicá un poco la cabecera, los espacios entre bloques y el alto de los renglones, y bajá la letra de los renglones de 16 a 14 px (las cajas de 22 a 18). Que una orden de hasta 8 renglones con observaciones entre en media hoja con al menos 10 mm de margen. Comprobalo con la N-0025 real y con una de 8 renglones de prueba. Sigue en blanco y negro, mismo diseño.
4. Si una medida da algo absurdo (una parte más alta que la hoja entera), usar media hoja si copiaEntera entra, o una hoja entera si no. Y registrarlo en el log de errores con las medidas, para verlo después (usá el registro de errores que ya existe en el proyecto: buscá cómo se registran los errores del front —docs/memoria/seguridad.md "registro de errores"— y verificá la RPC/tabla con SELECT; no cambies la base).
5. Pruebas unitarias de planHoja (los casos de arriba) + mutación + e2e de la hoja de la N-0025 a 390 y 1280 (y 360 y tablet 768): media hoja y una sola página. npm run pruebas, check-scripts y check-bytes en verde.
Ojo: la hoja también la usan Administración y la Carga (sandbox-administracion / sandbox-retiros / test-retiros-hoja / e2e/28-hoja-retiro): que todas sigan en verde sin relajar asserts preexistentes (si un assert viejo mide el tamaño de letra 16/22, actualizalo al nuevo valor pedido y decilo).
Hay una rama vieja sin integrar, origin/ci-prueba/orden-impresa-faltante (3123244), que también tocó la hoja ("hojas partidas", letra más chica): NO la integres ni la mergees; podés mirarla como referencia y en el traspaso decí si lo tuyo la pisa o la vuelve innecesaria en parte.
En el resumen final devolvé además: la causa encontrada (3-5 líneas) y los mm medidos de la N-0025 y de la de 8 renglones en media hoja.
