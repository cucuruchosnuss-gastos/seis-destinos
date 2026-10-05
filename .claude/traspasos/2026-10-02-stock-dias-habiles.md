# Traspaso — Stock: para cuántos días hábiles alcanza (02/10/2026)

Rama `ci-prueba/stock-dias-habiles`. Solo `modulos/stock.html` (más pruebas y maqueta). Cero cambios de base: lee `v_stock_cobertura`, que ya estaba.

## Qué hace
- Debajo de cada insumo: "Alcanza para ~N días hábiles". Rojo hasta 3, amarillo hasta 7, gris arriba de 7. Sin consumo, nada. Con pocos días de historia: "(estimado con N días)".
- El mismo insumo con varias marcas (Harina 000 Wali y Júpiter): una línea "Harina 000, todas las marcas: ~N días" (suma del stock ÷ suma del consumo diario).
- Arriba: "N insumos alcanzan para 7 días hábiles o menos". Al tocarlo, la lista muestra solo esos; otra vez, todos.
- Respeta la barra de fábricas.

## Decisiones tomadas sin consultar
- **El "rojo" es el bordó del sistema** (en Stock el rojo puro es el color de Accesos). Amarillo el de Caja, gris el de texto secundario.
- **El color va con el número que se ve**, redondeado: 7,1 días dice "~7" y sale amarillo (no gris).
- **Saldo cero o negativo con consumo**: "No alcanza ni para un día hábil", en rojo.
- **Con "Todas" las fábricas**, la tarjeta sumada de un insumo usa la suma del stock y del consumo de sus fábricas.
- **El aviso cuenta tarjetas**, no nombres: si la Wali alcanza para 2 días y la Júpiter para 20, el aviso cuenta la Wali (la línea de "todas las marcas" dice que en total alcanza).
- **La línea de "todas las marcas" va arriba de la primera tarjeta de ese nombre**, y se sigue viendo con el filtro puesto si alguna marca quedó en la lista.
- Si la vista no se puede leer, el stock se ve igual, sin cartelitos.

## Lo que no se pudo probar
- Con la cuenta de cada persona contra la base real (la lógica y la maqueta sí, en navegador a 390 y 1280 px). Hoy la base tiene `dias_base = 1` en Nuss (arrancó el 01/10), así que todo dice "(estimado con 1 día)".

## Guion para Facu
1. Abrí Stock con Nuss arriba: cada insumo con consumo tiene su cartelito.
2. Mirá la Harina 000: cada marca y la línea "todas las marcas".
3. Tocá "N insumos alcanzan para 7 días hábiles o menos": quedan solo esos.
4. Para cambiar los umbrales (3 y 7): es una sola línea, `UMBRALES_COBERTURA`.

## Qué automatizaría ahora
- Que el tablero del dashboard (tarjeta de Stock) y la burbuja usen la misma cuenta: hoy el aviso solo está adentro de Stock.
