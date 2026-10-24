# Pedido del 16/10/2026 — Sala de masa: el tamaño sin elegir (rama `ci-prueba/masa-tamano-sin-default`)

**Toca `modulos/produccion.html` (la tablet): se integra SOLO de noche, 23:36–05:30.** Commit sin push (lo pidió Facu). Si la sesión se compacta, se retoma desde este archivo.

## El pedido (resumido)

En la Sala de masa el tamaño (Simple/Doble) venía preelegido y los maseros registraban masas dobles como simples sin darse cuenta → el stock de harina descontaba de menos (recuento 15/10: faltaron 8 bolsas).

1. El tamaño pasa a ser tri-estado: null (sin elegir) | false (Simple) | true (Doble). `salaDoble` y `borrador.doble` arrancan en null en TODA masa nueva, incluida la "masa siguiente" (no copiar `prev.doble`). Con null, ningún botón presionado.
2. Retomar un borrador ya empezado conserva el tamaño de ESE borrador; si era null, sigue null. Nada de `!!` que convierta null en false.
3. Con null: Registrar no registra, aviso "Elegí SIMPLE o DOBLE" arriba de los botones, y Simple/Doble con borde de aviso hasta que se elija.
4. Los ×2 no muestran cantidades engañosas con null; `p_doble` siempre true/false, jamás null.
5. Las pendientes guardadas antes con true/false se suben como están.
6. No tocar nada más del flujo.

Pruebas: masa nueva sin tamaño no registra y con Doble manda `p_doble=true`; la masa siguiente a una Doble vuelve a quedar sin elegir; recargar con un borrador que tenía Simple lo conserva; `check-scripts.js` sin colisiones.

## Avance

Ver `docs/memoria/produccion.md` ("EL TAMAÑO ARRANCA SIN ELEGIR") y el resumen de la sesión.
