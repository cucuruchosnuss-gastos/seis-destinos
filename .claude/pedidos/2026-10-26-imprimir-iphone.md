# Pedido 26/10/2026 — URGENTE: imprimir en el iPhone y el PDF con las dos copias

Rama ci-prueba/imprimir-iphone. Integrarla apenas esté en verde (no toca modulos/produccion.html): respaldo, merge
--no-ff, pruebas completas, push, GitHub en verde.

PROBLEMA 1 — En iPhone (Safari), "Imprimir" de la orden de retiro no hace nada.
- Causa: imprimirOrden (modulos/retiros.html ~4432, y lo mismo en administracion.html imprimirOrden ~3840,
  imprimirDivision ~4105 e imprimirNotaDebito ~6221) hace await armarHoja(...) (espera fuente, logo y medición, hasta
  3 s) y RECIÉN DESPUÉS llama window.print().
- iOS Safari ignora window.print() si no está pegado al gesto del usuario.
- Arreglo:
  a) Armar la hoja ANTES del toque: apenas se muestra la orden (pantalla "hecho" y detalle de "Mis retiros"), llamar
     armarHoja en segundo plano y guardar que ya está lista para esa orden.
  b) En el click de Imprimir:
     · si la hoja ya está armada para esa orden → window.print() de inmediato, sin ningún await antes;
     · si todavía no está (llegó muy rápido) → armarla, y en iPhone/iPad mostrar un botón "Listo, imprimir" que llame
       window.print() en su propio click.
  c) Lo mismo en Administración: hoja de la orden, división y nota de débito.
  d) Prueba e2e con WebKit, si el proyecto lo tiene: window.print se llama en el mismo tick del click (stub de
     window.print que registra si la activación del usuario seguía viva, o que no hubo await entre el click y la llamada).

PROBLEMA 2 — "Enviar/Compartir PDF" de la orden saca solo el ORIGINAL.
- Cambiar COPIAS_PDF (js/retiros-comun.js:247) a ['ORIGINAL', 'DUPLICADO'], para que el PDF sea igual a la impresión:
  en media hoja, original y duplicado en la misma A4 con la línea de corte; en hoja entera, cada copia en sus hojas.
- Revisar que generarPdf lo arme bien en los dos modos y actualizar las pruebas que esperaban una sola copia.

Probar con la orden N-0032 (Fernández Ricardo, 42 cajas): imprimir y PDF tienen que dar original + duplicado en una
sola A4. npm run pruebas, check-scripts y check-bytes en verde. Resumen con rama, hash y main.
