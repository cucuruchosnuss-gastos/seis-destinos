# Traspaso — Bultos o kilos en la tablet, como en Stock (02/10/2026)

Rama `ci-prueba/vista-preferida-tablet`. Cero cambios de base.

## Qué hace
- La regla de "bultos o su unidad" (según `insumos.vista_preferida`) salió de Stock a **`js/cantidades.js`**, compartido. Stock ya no tiene su copia.
- La **sala de masa** dice lo que queda de cada lote como Stock: "quedan 97 bultos" para la harina que Facu eligió ver en bultos, en el renglón de la receta, en la ventana de lotes, en las opciones de lote y en "+ Agregar ingrediente". El aviso "no alcanza" dice "le quedan 2 bultos (50 kg) y esta masa lleva 60 kg".
- La **planta** (Producción, al agregar lo producido) dice lo que hay del empaque como Stock en el aviso de faltantes.

## Decisiones tomadas sin consultar
- **Las cantidades de la receta (lo que lleva cada masa) siguen en kilos.** Son pesos para pesar, y en bultos se redondean a cuartos (un cuarto de bolsa de harina son 6 kg): cambiaría la receta. Lo que pasa a bultos es el STOCK (cuánto queda). Si Facu quiere también la dosis en bultos, es un cambio chico.
- **Qué contenido tiene un lote**: el de su única presentación. Un lote que entró en dos presentaciones, o una parte suelta, no tiene "un" bulto: se dice en su unidad (la misma regla que Stock).
- **De dónde sale**: la preferencia de `insumos` (la lee cualquiera) y el contenido de `v_stock_por_lote` (pide `stock:ver`, que la tablet tiene en su fábrica). Si alguna lectura falla, todo sigue en kilos.
- **El aviso de faltantes del empaque**: lo que falta y lo que se necesita siguen en unidades; lo que HAY dice "3 bultos (1.500 un)". Hoy ningún insumo de empaque está marcado en bultos, así que en la práctica no cambia.
- Una prueba vieja (`test-produccion-lotes.js`) exigía que la sala no leyera `v_stock_por_lote`; ahora exige que la lea SOLO para el contenido del bulto y solo con permiso (lo que queda y la fecha siguen saliendo de `stock_para_masa`).

## Lo que no se pudo probar
- En la tablet real con la base. Lo probado: la lógica con datos falsos y la maqueta en un navegador real (Stock a 390 y 1280 px, la sala a 1000×540 y 1280×800).

## Guion para Facu
1. En Stock, la Harina 000 dice "N bultos".
2. En la tablet, Sala de masa → una máquina → tocá el lote de la harina: cada lote dice "quedan N bultos".
3. Un insumo en kilos (por ejemplo la lecitina) sigue en kilos.

## Qué automatizaría ahora
- `stock_para_masa` podría devolver la preferencia y el contenido de cada lote: la sala haría una sola consulta en vez de tres. Es un cambio de base (para el chat).
