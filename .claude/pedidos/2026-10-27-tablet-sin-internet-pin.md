# Pedido 27/10/2026 — la tablet sin internet con el wifi conectado y el PIN sin internet

Rama: `ci-prueba/tablet-sin-internet-pin` (desde el `origin/main` más reciente). Toca `modulos/produccion.html` (la tablet): **se integra SOLO de noche**. La base no se toca; si hace falta algo de base, se describe en el resumen.

Problema real (27/10): se cortó internet con el wifi conectado (`navigator.onLine` sigue en true). La tablet volvió por inactividad a "¿Quién sos?" y el masero no pudo poner el PIN (`verificar_pin_produccion` necesita red), así que no pudo cargar la masa hasta que volvió internet.

Ya existe: `js/sin-internet.js` (cola en IndexedDB, copia de lecturas, `crearCola`, `sesionGuardada`), `sinInternet()`, `revisarInactividad()` y `MINUTOS_INACTIVIDAD = 10`.

Tareas:
1. Detección real: un chequeo liviano contra Supabase con timeout corto que marque "sin red" aunque `navigator.onLine` diga true. `revisarInactividad` NO cierra si el chequeo falla o no contesta en ~5 s. El cartel de la cola tiene que mostrar "sin internet" en ese caso.
2. PIN sin internet: después de cada `verificar_pin_produccion` OK (online), guardar en IndexedDB, por persona + unidad + puesto, un hash del PIN (PBKDF2 con WebCrypto, sal por tablet+persona, muchas iteraciones) y la fecha. Sin red, el teclado verifica contra ese hash si tiene menos de 7 días; si coincide, entra en "modo sin internet" (visible en la cabecera). Si no hay hash o venció: "Sin internet. Esta persona tiene que haber entrado con internet en los últimos 7 días". Nunca el PIN en claro, ni en localStorage. Un PIN marcado `debe_cambiar` no entra sin red. Al volver la red, la próxima acción que necesite base revalida normal. Lo mismo para el masero en Sala de masa.
3. Masas sin internet: verificar de punta a punta (con la red cortada en Playwright, `context.setOffline` y también bloqueando solo el dominio de Supabase con wifi "conectado") que se pueda registrar una masa con lotes ya cargados, que quede en la cola y que se mande sola al volver, sin duplicar (`p_client_uuid`). Si un lote nuevo no se puede crear sin red, mensaje claro y que no se pierda lo tipeado.
4. Pruebas: suite `test-produccion-sin-internet-pin.js` (hash, vencimiento, debe_cambiar, inactividad con red caída) + mutaciones + e2e con los dos tipos de corte. `npm run pruebas` en verde, check-scripts, maqueta a la medida de la tablet.

Al terminar: hash de la rama, lo decidido sin consultar, lo que no se pudo probar y "Qué automatizaría ahora". UN solo resumen completo y, como último mensaje solo: TERMINADO — mandar al chat
