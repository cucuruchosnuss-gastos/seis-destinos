# Traspaso — Stock se actualiza solo (02/10/2026)

Rama `ci-prueba/stock-se-actualiza`. Solo `modulos/stock.html` (más las pruebas y la maqueta). Cero cambios de base.

## Qué hace
- Relee los datos al volver a la pestaña (visibilitychange y focus) y cada 2 minutos mientras la pestaña se ve.
- Arriba, en chico: "Actualizado recién / hace X min" y el botón "Actualizar".
- Con un formulario abierto (cualquier ventana de Stock abierta, un recuento con conteos sin guardar o guardándose, el dedo en un casillero del recuento, el traspaso a otra fábrica) NO refresca: solo pregunta si cambiaron las cantidades y, si cambiaron, dice "Hay datos nuevos" con el botón en naranja.

## Decisiones tomadas sin consultar
- **"Hay datos nuevos" se dice solo si de verdad cambió algo**: se leen las cantidades de `v_stock_insumos` y se comparan con lo que está dibujado. Si no se pudo preguntar (sin señal), no se dice.
- **Qué cuenta como "formulario abierto"**: todas las ventanas (`.modal-stock`), también la del detalle por lote, que no es un formulario — mejor de más que pisar algo. Y la vista del traspaso entera, aunque esté vacía.
- **El botón "Actualizar" sí refresca aunque haya un recuento sin guardar**: primero guarda el conteo. Si el guardado falla, lo contado sigue en pantalla (ya lo garantizaba `cargarItemsRecuento`).
- **Qué se relee**: el stock siempre (lo usan varias vistas); historial, mermas, tránsito, catálogo y recuento solo si son la vista abierta. El traspaso nunca.
- **Sin señal no se intenta solo** (cada intento serían carteles de error); el botón sí intenta.
- **Un error no mueve la hora**: dice "No se pudo actualizar · hace X min" en bordó.
- En la maqueta se sumó `globalThis.__maquetaTablas` para que una prueba cambie una tabla con la página abierta.

## Lo que no se pudo probar
- Con la base real y dos personas (una cargando una masa en la tablet, otra mirando Stock). Lo probado: la lógica con datos falsos y la maqueta en un navegador real a 390 y 1280 px con el reloj adelantado.
- En un celular de verdad que se bloquea y se desbloquea.

## Guion para Facu
1. Abrí Stock en la compu y dejalo abierto.
2. En la tablet, cargá una masa.
3. Esperá 2 minutos (o cambiá de pestaña y volvé): el stock de la harina baja solo, y arriba dice "Actualizado recién".
4. Abrí "Corregir stock", cargá otra masa en la tablet, volvé a la compu: tiene que decir "Hay datos nuevos" y NO cambiar nada debajo de la ventana.

## Qué automatizaría ahora
- El refresco "cuando vuelvo a la pestaña + cada X minutos + no pisar formularios" ya existe en el tablero, en la planta y ahora en Stock, cada uno con su versión. Pasarlo a un helper de `js/` (`refrescarCuandoSeVea(fn, { cadaMs, bloqueado })`) y usarlo en los módulos que faltan (Cobranzas, Caja, Administración).
