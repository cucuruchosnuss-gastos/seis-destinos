# Traspaso 28/10/2026 — Valorizar con la división en una sola pantalla (N1 / N2)

Rama `ci-prueba/valorizar-con-division`, desde `origin/main` `ac3cb25` (con `main` traído después: `ensayo-confiable`, `2f944a0`). Pedido: `.claude/pedidos/2026-10-28-valorizar-con-division.md`. Detalle en `docs/memoria/administracion.md` ("VALORIZAR CON LA DIVISIÓN EN UNA SOLA PANTALLA") y el bug del listado en `docs/memoria/aprendizajes.md`.

## Lo hecho
- **Una sola pantalla**: debajo de la orden valorizada, "Órdenes de pedido para facturar en ARCA" con la condición ("N1-0036: 40 % · N2-0036: 60 %"), los botones 100/0, 80/20, 50/50, 40/60, "Otro % del N1-0036", los 3 vendedores y un recuadro por punto con sus totales, Imprimir, Compartir PDF y la factura de ARCA (número + PDF). Con 100/0 o 0/100, un solo recuadro. Entre empresas del grupo: no aparece.
- **Se guarda solo**: al valorizar, la condición del cliente (o 100/0 si no tiene); al cambiar la condición o un vendedor, 400 ms después de la última tecla, con "Guardando…" / "Guardado." y el error de la base tal cual. Una respuesta vieja no pisa la pantalla y nunca hay dos guardados a la vez.
- **Los nombres** N1-0036 / N2-0036 (D-0045 → D1-0045 / D2-0045) salen de una sola función (`codigoPunto`). En la base siguen siendo 'A' / 'B'.
- **El papel**: un punto por hoja, igual a los dos PDF que aprobó Facu (recuadro redondeado, "ORDEN DE PEDIDO" y el código grandes y centrados, cliente y CUIT, "Fecha dd/mm/aaaa", la tabla, y abajo en el N1 Total productos / cada vendedor sin % / Total comisiones / TOTAL; en el N2 solo TOTAL). Sin número de factura, sin "TOTAL PARTE A/B", sin el pie. El PDF se llama "Orden de pedido N1-0036 - ICARDI.pdf".
- **Sale la comisión común**: ni el botón, ni el panel, ni el filtro, ni el sello "Comisión sin cargar". Ya no existe la ventana "Dividir para facturar".
- **El listado al día**: la fila cambia en el momento al valorizar, anular, guardar la condición o cargar una factura (el bug del 28/10: decía "sin valorizar" hasta recargar), y la lista se relee sola al volver a la pestaña y cada 60 s si está a la vista.

## Decidido sin consultar
- Abrir una orden YA valorizada que no tiene condición guardada solo la lee y avisa "Todavía no se guardó en esta orden: tocá la condición para guardarla." (no escribe en la base sin que nadie toque nada).
- Una orden vieja que YA tenía la comisión común cargada sigue mostrando Subtotal / Comisión / Total (es plata que está en la cuenta del cliente). Las funciones y los datos de la comisión común quedan, sin uso.
- El campo "Comisión habitual (%)" de la ficha del cliente quedó (el pedido no lo nombraba).
- Un vendedor con monto negativo (por una devolución) no sale en el papel: el pedido dice "monto mayor a 0".
- Imprimir y Compartir esperan mientras se está guardando; salir de la orden con un cambio esperando lo guarda igual.
- Si la orden no entra en una hoja A4, el PDF sigue en otra página.
- La ficha del cliente dice "Punto de venta 1 %" / "Punto de venta 2 %".
- Quien solo VE la orden (sin `retiros:precios`) sigue viendo el bloque de solo lectura "Facturas de ARCA", con los códigos nuevos.
- El spec 31 (vistas del celular) medía la comisión común: ahora mide los botones de la condición de la misma orden a 360 y 390 px. El spec nuevo quedó con el número 95.

## No probado
- Guardar de verdad en la base (Claude Code solo la lee): todo se probó con la base falsa de las suites y la maqueta.
- Compartir PDF con las librerías reales en un iPhone (probado con dobles en las suites; el armado del papel, en el navegador).
- La orden real N-0036 de Icardi: se usó una copia en la maqueta con los mismos números.

## Guion para Facu
1. Administración → Órdenes → una orden sin valorizar de Icardi → Valorizar → Guardar.
2. Debajo tiene que aparecer "Órdenes de pedido para facturar en ARCA" con "N1-…: 40 % · N2-…: 60 %" y "Guardado.". En la lista de la izquierda la orden ya dice Valorizada.
3. Tocar 50/50: los dos recuadros cambian solos y vuelve a decir "Guardado.".
4. Imprimir el N1 y el N2: cada uno sale en su hoja, como los PDF de ejemplo.
5. Compartir PDF del N2: el archivo se llama "Orden de pedido N2-… - ICARDI.pdf".

## Qué automatizaría ahora
- **Renombrar o sacar funciones e ids de un módulo** fue lo más caro de la tanda: hubo que tocar a mano la lista de funciones del sandbox, las interpolaciones "seguras", los ids retirados de `controles-*`, `test-detalles-viejos`, `test-modulos-esqueleto-parejo` y las anclas de varias `mut-*`. Un script `npm run renombrar -- <módulo> <viejo> <nuevo>` (o `--sacar <id>`) que actualice todos esos registros a la vez y diga qué anclas de mutación quedan rotas ahorraría la mitad de ese trabajo.
- **Un spec que espera un botón que ya no existe consume 5 minutos por prueba** y en el ensayo se comió el tope de 45 min (60 pruebas sin correr). Un control rápido (segundos) que cruce los `#id` que nombran los `e2e/*.spec.js` con los ids que existen en los módulos encontraría eso antes del ensayo.
- Sigue rota, de antes, el ancla 'el buscador con apagados' de `mut-administracion-remitos-precarga.js` (no es única, igual en main).
