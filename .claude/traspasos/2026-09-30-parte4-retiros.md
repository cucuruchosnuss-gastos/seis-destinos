# Parte 4 — Órdenes de retiro con el diseño 2026 (30/09/2026)

Handoff "Órdenes de retiro" de Claude Design en `e2e/disenos/retiros/`, aplicado a la Carga (`modulos/retiros.html`) y a la hoja (`js/retiros-comun.js`) a 390 × 844 y 1366 × 768. **La lógica y las RPCs no cambiaron**; cero SQL (Supabase en solo lectura).

## Lo que se hizo

- **Pantalla** con el armado del diseño: empresa, cliente, catálogo en tres grupos, varios lotes por renglón, faltante, la orden armada, el resumen sin precios, el código grande y "Mis retiros".
- **Las tres decisiones de Facu:**
  1. "sin stock" aparece **solo al buscar**;
  2. **sin señal la orden queda guardada en el celular sin número**, con el mismo `client_uuid` (reintentar no duplica);
  3. **más de 12 renglones pasan a otra hoja** con el mismo encabezado ("Hoja 1 de 2"); total, observaciones y firma en la última; el PDF, una página por hoja.
- **Bugs encontrados comparando con el diseño y arreglados:**
  - a 390 px `.rt-pie-orden` estaba en `display: none` y **escondía "Agregar" y "Revisar"**: ahora es `display: contents`;
  - en el celular se veía suelto el texto "ProductoLotesCantidad" (el encabezado de columnas de la compu): `.rt-orden-cab` va escondido fuera de la compu.
- **Comparación con el diseño**: `e2e/15-comparar-retiros.spec.js` + `e2e/pasos-comparar-retiros.js`.

| Pantalla | Diferencia |
|---|---|
| 1a Elegir la fábrica | 14,2 % |
| 1b Cliente | 15,2 % |
| 1c Catálogo en tres grupos | 27,7 % |
| 1d Varios lotes en un renglón | 37,8 % (desvío declarado) |
| 1e Faltante | 36,3 % (desvío declarado) |
| 1f La orden armada | 32,9 % (desvío declarado) |
| 1g Resumen sin precios | 32,9 % (desvío declarado) |
| 1h Confirmado | 29,0 % |
| 1i Mis retiros | 15,0 % |
| 2a Nuevo retiro en la compu | 17,5 % |
| 2b Mis retiros en la compu | 6,5 % |

**Por qué 1d–1g pasan del 30 % (tope 40 % declarado):** el armado es el del diseño; lo que difiere es el CONTENIDO. El diseño muestra Cucuruchón Mini ×320 CASERATO, 50 cajas, lotes 7031/7038, cuatro renglones y "será N-0012"; la maqueta tiene Cucurucho grande · Caja x 100 sin cono, 30/20 cajas, lotes 7010-2/7030-1 y un renglón. Además la app suma su barra de arriba y la barra de abajo del celular, que el diseño no dibuja.

## Lo que NO se comparó (y por qué)

- **1j "Sin datos", 1k "Cargando", 1l "Error al confirmar"**: piden otro juego de datos de la maqueta (catálogo vacío, una rpc que no contesta, un error de la base). Se puede sumar con `"ESPERAR"` y `"ERROR:…"` de la maqueta en un juego `retiros-estados`.
- **3a / 3b "Hoja impresa"**: la hoja la mide `medirHoja()` de `e2e/5-maqueta.spec.js` (dos copias y el corte dentro de una A4), que es lo que importa del papel.

## Diferencias menores con el diseño (a decidir, no se tocaron)

- El encabezado dice "Cucuruchos N… · Cambiar" donde el diseño dibuja una pastilla "Nuss".
- La app muestra el link "Que salga sola de los más viejos" y el aviso "No hay más en stock…", que el diseño no dibuja (son funciones reales de la base: se dejaron).
- En el celular, "Agregar igual · N cajas" queda tapado por la barra de abajo cuando el faltante es largo: hay que hacer scroll.

## Números

- `test-retiros-carga.js` 249/249, `mut-retiros-carga.js` 106/106 (+25 equivalentes); se sumaron dos mutaciones (el encabezado de columnas visible en el celular, el pie escondido).
- Resto de las suites de retiros y `test-buscar-clientes.js` al día; suite completa en verde antes del commit.

## Guion para Facu (celular)

1. Abrí Órdenes de retiro en el celular, elegí la empresa y un cliente.
2. Agregá un producto con cono, poné más cajas de las que hay en un lote: tiene que repartir en varios lotes y, si no alcanza, decir el faltante en bordó sin frenarte.
3. "Revisar": el resumen no tiene ningún precio. Confirmá: el código grande.
4. Con el celular en modo avión, confirmá otra: tiene que decir que quedó guardada sin número; al volver la señal, "Reintentar" no la duplica.
5. Una orden con 13 renglones: al imprimir, dos hojas con el mismo encabezado.

## Qué automatizaría ahora

La tarea repetida más cara de esta parte fue **llevar la app a cada pantalla del diseño a mano** (escribir `pasos-comparar-*.js` leyendo el `.dc.html` y los ids del módulo, probar, ajustar). Se hizo igual para Planta, Configuración, Esqueleto, Administración y ahora Retiros. Lo que lo saca: que el handoff de Claude Design traiga, por pantalla, el estado de datos que dibuja (un JSON por pantalla), y un generador que arme el juego de la maqueta con ESOS datos. Con los mismos datos del diseño, la diferencia baja a lo que realmente difiere en el armado, y los desvíos declarados por "datos distintos" dejan de hacer falta.
