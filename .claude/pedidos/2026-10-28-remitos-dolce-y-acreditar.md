# Pedido 28/10/2026 — Remitos Dolce (módulo aparte) y acreditar venta / depósito

Dos tareas EN ORDEN (las dos tocan modulos/administracion.html), cada una en su rama desde el origin/main más reciente, en
su worktree, e integrada en cuanto esté en verde con el candado (`npm run candado -- tomar|soltar <tema>`). Ninguna toca
modulos/produccion.html. En paralelo otra sesión hace `ci-prueba/modulo-buscar` (comparten la tarjeta del menú: si
chocan, se queda lo de los dos lados). Números de spec nuevos: `npm run spec:numero`.

## Tarea 1 — `ci-prueba/modulo-remitos-dolce`
Los remitos de Rosario en un MÓDULO APARTE, "Remitos Dolce", para que no se mezclen con la Carga ni con Administración.
1. `modulos/remitos-dolce.html` (vanilla, mismo estilo; color propio en estilo-visual.md) con su tarjeta en el menú
   principal, visible con retiros:cargar o retiros:ver en Dolce Pasta (tiene_tarea_alcance; sin tocar el CHECK ni
   CATALOGO_TAREAS).
   a. "Subir" (retiros:cargar): lo de retiros.html (fotos, cola sin señal, "Mis remitos subidos" con su estado).
      Confirmado: "Orden D-00XX" con `remitos_precarga.orden_codigo`.
   b. "Revisar": precargados arriba y abajo el listado por número de remito, el más nuevo primero. Corregir,
      confirmar, descartar, talonario Oficial / Acopio, saldo de acopio, zoom: lo mismo que en Administración.
   Mover el código, no duplicarlo: lo que usan dos pantallas, a js/ como excepción numerada.
2. Sacar "Subir remitos Rosario" / "Mis remitos subidos" de retiros.html y la revisión de administracion.html; en los
   dos, un link chico "Remitos Dolce →".
3. `mis_ordenes_retiro` devuelve numero_remito y talonario: la hoja y el PDF de la Carga dicen "Remito N° X".
4. `supabase/functions/ocr-remito/index.ts` igual a lo publicado (MODELO_POR_DEFECTO = 'claude-opus-5' y el comentario
   de la publicación del 28/10/2026). No publicarla.
5. Arreglar `pruebas/mut-administracion-remitos-precarga.js` (rota desde antes).
6. Suites y mutaciones del módulo; ajustar las de retiros y administración; e2e a 390 y 1280 px. `npm run pruebas` en
   verde, check-scripts. Integrar.

## Tarea 2 — `ci-prueba/acreditar-venta-deposito` (desde main con la tarea 1)
`acreditar_cheques(p_items, p_fecha)` ya acepta `{ cheque_id, acreditado }` (venta) o `{ cheque_id, gastos }`
(depósito) y crea solo el gasto en "Gastos bancarios y comisiones".
1. "En el banco": "Vendidos · esperando acreditación" y "Depositados · esperando acreditación", con su total.
2. Acreditar: venta → "Monto acreditado" (precargado con el importe) y en vivo "Diferencia $X (Y %) → se carga como
   gasto" (no más que el importe ni cero); depósito → "Gastos del banco" (0) y "Se acredita $importe · gasto $X". Parser
   argentino. Al terminar, qué gastos se crearon.
3. Sacar "Cargar el gasto del banco" (data-gastos-banco) y su ayuda; "Ver el gasto" también en depósitos.
4. Botones del envío "Depositar" y "Vender" (si ya están, no tocarlos).
5. test-cheques-* y mutaciones; `npm run pruebas` en verde, check-scripts. Integrar.

Al terminar las dos: un resumen (por tarea: rama, hash, integrada, qué se probó, decisiones, lo no probado y "Qué
automatizaría ahora"), nada corriendo en segundo plano, y como último mensaje: TERMINADO — mandar al chat
