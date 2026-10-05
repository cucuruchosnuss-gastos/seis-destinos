# Indicadores de máquinas con gráficos (04/10/2026)

Rama `ci-prueba/indicadores-maquinas`, desde `ci-prueba/filtros-en-todos-lados` (`fa1f815`). Fase 3 del pedido del fin de semana. Detalle en CLAUDE.md (módulo Producción, "Las máquinas, con gráficos", y la novena excepción, `js/graficos.js`).

## Qué se hizo

- La caja "Máquinas" en la gestión de Producción, arriba de los indicadores del día: tarjetas por máquina, cuatro gráficos y "¿Cómo se calcula?".
- La fuente es `v_turno_metricas` (leída, no tocada) y `paradas_produccion`. `indicadores_produccion` no se tocó.
- `js/graficos.js`: SVG propio (barras agrupadas, líneas, barras apiladas, dona, barras contra una referencia, leyenda, cifra exacta al tocar).
- El rendimiento por kilo de harina se dibuja en barras por lote contra el promedio, en la tarjeta que ya estaba, arriba de su lista. La lista queda como texto exacto, y sus pruebas no se tocaron.
- Suites:
  - `test-graficos.js` 66 / `mut-graficos.js` 28/28
  - `test-produccion-maquinas.js` 105 / `mut-produccion-maquinas.js` 35/35, con las dos mutaciones de "promedio de promedios"
  - `e2e/indicadores-maquinas.spec.js` (390 y 1280)
- Se actualizaron:
  - `sandbox-produccion.js` (las funciones nuevas);
  - `seguras-produccion.js` (las piezas de HTML ya escapadas);
  - `mut-produccion-gestion.js` (una equivalente nueva: el índice del grupo).

## Decisiones que tomé

- **Día / Semana / Mes** agrupa la línea de tendencia: 30 días, 12 semanas o 12 meses hasta el fin del período. El período de las tarjetas lo elige el control de período (Hoy, Esta semana, Este mes, Mes pasado, fechas), con las dos fechas obligatorias, y arranca en "Este mes".
- **La variación** compara con el período anterior del mismo largo, pegado antes.
- **"¿A dónde se va el turno?"** cuenta las paradas mientras la máquina andaba (recortadas a la ventana real). Así la barra suma exactamente el horario del turno.
- **La dona** cuenta la parada entera (lo que ya da `parada_por_categoria`). Las dos cosas están dichas en "¿Cómo se calcula?".
- **Una planilla sin minutos productivos** no suma sus unidades a la u/h productiva (no tiene horas contra qué dividirlas). Sí suma a las unidades y a la u/h del turno.
- **La caja Máquinas va arriba de todo** (las "tarjetas grandes arriba" del pedido).

## Lo que NO se probó

- **Con datos reales**: al 04/10/2026 hay solo 6 planillas cerradas (01 y 02/10). Mi usuario de la base (solo lectura) no puede leer la vista: falla con "permission denied for function _ts_turno". `authenticated` sí tiene EXECUTE (verificado en el ACL), así que en la app debería andar, pero no lo vi con una sesión.
- Nada con sesión real. Se miró en la maqueta a 390 y 1280.

## Para la base (no lo toqué)

- `v_turno_metricas.parada_por_categoria` cuenta la parada entera y `minutos_parada_en_marcha` la recortada. Si algún día se quiere una sola cuenta, la vista podría dar también las categorías "en marcha", y la pantalla dejaría de leer `paradas_produccion` para eso.

## Qué automatizaría ahora

Cada pantalla nueva con datos de la base pide sumar a mano sus funciones a `sandbox-produccion.js` y sus piezas de HTML a `seguras-produccion.js`. Fueron cuatro vueltas de "falta X" en esta tanda. Propuesta: que el sandbox tome solas todas las funciones de nivel superior del `<script>` (con el escáner que ya existe) en vez de listas a mano. Y que el chequeo de XSS liste TODAS las interpolaciones sin justificar de una vez, no de a una.
