# Traspaso 30/10/2026 — Condición de venta sin valor por defecto

Pedido: `.claude/pedidos/2026-10-30-condicion-venta-sin-defecto.md`. Rama `ci-prueba/condicion-venta-sin-defecto`, salida
de `origin/main` = e6e0c74, en un git worktree aparte. **Trae `ci-prueba/division-cero-y-factura` (94b89fe) con un merge**
(tocan las mismas funciones de la pantalla de facturar): se integran en ese orden, o juntas. Solo
`modulos/administracion.html` (más pruebas y docs). La base no se tocó.

## Qué cambió
1. **Sin condición no se inventa el 100/0.** `pctInicialFacturar` = orden → cliente → null. Con null la pantalla de
   facturar arranca con N1 y N2 vacíos, el aviso en naranja con el texto de Facu, sin N1/N2 que imprimir ni compartir y
   sin llamar a la base. Hay dos campos ("Otro % del N1-…" y "% del N2-…"): escribir uno completa el otro, como en la
   ficha. Al lado, el tilde "Guardar también como condición del cliente" → `guardar_condicion_venta_cliente` con el %
   guardado en la orden (sin tocar las comisiones del cliente).
2. **La ficha no pierde la condición.** Elegí lo más simple: **se guarda sola, sin preguntar**, al tocar "Guardar la
   ficha" y al salir de la ficha (por cualquier lado). Si al salir no se puede, aparece el aviso "No se guardó la condición
   de venta de <cliente>: <motivo>". Cerrar o recargar la página con algo sin guardar: el navegador pregunta. Después de
   guardar: "Condición guardada: N1 X% / N2 Y%" (aviso y escrito al lado del botón).
- Detalle: `docs/memoria/administracion.md`, "Sin condición no se inventa el 100/0, y la ficha no la pierde".

## Decidido sin consultar
- El aviso naranja solo para el cliente SIN condición. Si un cliente con condición vacía el %, no se guarda y lo dice
  ("Sin el % de N1 y N2 no se puede guardar…"), sin el aviso (su texto no aplica).
- Vaciar el % ya no es un error rojo: se espera a que lo completen.
- El texto de "vacío" en la ficha: "Vacío: sin condición (se pone el % en cada orden, al facturar)." (antes decía 100/0).

## Pruebas
- `test-administracion-valorizar-con-division.js` 204 (cliente sin condición, el tilde, el error de la base, ICARDI
  sin aviso), `test-administracion-division-orden.js` 108 (salir guarda, "Guardar la ficha" guarda, error al salir,
  inválido no llama, beforeunload). `orden-entre-empresas` ajustada.
- Mutaciones: `mut-administracion-division-orden` 47/47, `mut-administracion-clientes` 48/48 (ancla al día),
  `mut-administracion-valorizar-con-division` (ver el resumen del cierre).
- `e2e/102-condicion-sin-defecto.spec.js` (390 y 1280 px, aviso naranja medido con su color) y `e2e/53` ajustada.

## Lo que no se pudo probar
- Con datos reales: no hay sesión en el contenedor (todo en la maqueta).

## Qué automatizaría ahora
- Las suites viejas que miran un texto de la pantalla se rompen cada vez que Facu pide cambiar una frase (acá, el aviso
  de "Condición de venta guardada"). Un archivo `pruebas/textos-administracion.js` con los textos de Facu, que usen el
  módulo y las pruebas, haría que cambiar una frase sea un solo lugar.
