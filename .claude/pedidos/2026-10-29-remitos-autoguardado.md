# Pedido de Facu — 29/10/2026: Remitos Dolce, autoguardado

Rama: `ci-prueba/remitos-autoguardado` (desde el origin/main más reciente, en un git worktree aparte). No toca
`modulos/produccion.html`: se integra en cuanto esté en verde, con el candado
(`npm run candado -- tomar remitos-autoguardado` / `soltar`).

En `modulos/remitos-dolce.html`, pestaña "Revisar", hay dos botones, "Guardar" y "Confirmar", y confunden: tocó
Guardar, salió "guardado" y pensó que había confirmado.

1. Autoguardado: cada cambio en el remito (cliente, fecha, número, talonario, transporte, observaciones, un renglón,
   un cono, una cantidad, un lote, "No va en la orden") se guarda solo con `actualizar_remito_precarga` (verificala
   con pg_get_functiondef), con un pequeño retardo para los campos de texto (no una llamada por tecla) y que una
   respuesta vieja no pise a una nueva. Al lado, un estado chico: "Guardando…" / "Guardado" / el error de la base tal
   cual.
2. Sacá el botón "Guardar". Queda solo "Confirmar" (que crea la orden) y "Descartar". Confirmar primero espera que
   termine el guardado en curso (y si hay un cambio sin mandar, lo manda) y recién después llama a
   `confirmar_remito_precarga`.
3. Si se sale del remito con un cambio sin mandar, se manda igual.
4. Pruebas: suites y mutaciones (autoguardado de cada tipo de campo, el retardo, respuesta vieja que no pisa,
   Confirmar que espera el guardado, salir con cambio pendiente); ajustá las que miraban el botón Guardar; e2e a 390
   y 1280 px. `npm run pruebas` en verde, check-scripts. Integrá.

Al terminar: hash de la rama, lo decidido sin consultar, lo que no se pudo probar y "Qué automatizaría ahora".
