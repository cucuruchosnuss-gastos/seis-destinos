# Pedido 27/10/2026 — inicio tarde de producción en la tablet

Rama: `ci-prueba/tablet-largada-tarde` (desde el `origin/main` más reciente; trabajá en una copia aparte con git worktree). Toca `modulos/produccion.html`: se integra SOLO de noche. Si la rama `ci-prueba/tablet-sin-internet-pin` no está integrada todavía, partí de ella para no chocar.

Caso real (27/10, lote 6270, Máquina 2, tarde): el turno era de 15:00 pero faltó un operario y se empezó a producir a las 17:53. El encargado quiso cargarlo como parada 15:00–17:53 y la tablet dijo "La hora en que paró no entra en el turno". No es una parada: es un INICIO TARDE DE PRODUCCIÓN.

1. Bug: `limitesParada()` (~línea 8003) toma el piso como `abierto_en − 1 h`. La base (`registrar_parada`) usa `least(abierto_en, fecha + hora_inicio) − 1 h`. Igualalo a la base con `instanteAr(fecha, hora_inicio)`. Prueba con este caso exacto.
2. Botón nuevo "Inicio tarde de producción" en la planilla, junto a "Empezó a producir / Paró / Terminó" (mismo estilo de las tres acciones). Abre una ventana con:
   - "¿A qué hora empezaba el turno?" (precargada con `hora_inicio` del turno)
   - "¿A qué hora se empezó a producir?"
   - en vivo: "Empezó X h Y min tarde"
   - motivo, obligatorio: botones "Falta de operario", "Falta de masa", "Mantenimiento / arreglo", "Otro" (con texto)
   Con el teclado de horas de la planta (nunca input type=time). Manda `registrar_inicio_tarde(p_turno_id, p_hora_inicio, p_hora_largada, p_motivo)`, que ya existe en la base (verificala con `pg_get_functiondef`): corrige `hora_inicio`, guarda `hora_largada` y `turnos_produccion.largada_motivo`, y devuelve `minutos_tarde`. Sin internet va por la cola: `ejecutar_tablet` ya acepta la operación `'registrar_inicio_tarde'`.
3. En la planilla mostrá "Inicio tarde: 15:00 → 17:53 (2 h 53 min) · Falta de operario". Si ya está cargado, el botón abre la ventana para corregirlo.
4. `modulos/produccion-gestion.html`: en la planilla y el historial del turno, mostrá el inicio tarde (horas, demora y motivo) con `largada_motivo`.
5. Pruebas: suite + mutaciones del piso de la parada, de la cuenta de la demora (también cruzando medianoche en el turno noche) y del motivo obligatorio; e2e en la maqueta a la medida de la tablet. `npm run pruebas` en verde, check-scripts.

Al terminar: hash de la rama, lo que decidiste sin consultar, lo que no pudiste probar y "Qué automatizaría ahora". UN solo resumen completo y, como último mensaje solo: TERMINADO — mandar al chat
