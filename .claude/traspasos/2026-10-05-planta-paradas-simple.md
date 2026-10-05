# Traspaso — Las paradas de la planta, simples (05/10/2026)

Ramas: `ci-prueba/planta-paradas-simple` (la planta y la gestión) y
`ci-prueba/indicadores-arranque` (los indicadores de las máquinas, desde la
rama de la fase 3). **Ninguna se integró**: esperan el "INTEGRÁ" de Facu.
Cero SQL corrido: la base ya estaba hecha (la armó el chat).

## Qué cambió en la planilla (modulos/produccion.html)

Tres acciones grandes arriba, en lugar de todos los botones de parada,
limpieza, "Paró ahora", "se rompió" y el ± 5 minutos:

1. **Empezó a producir** → `registrar_hora_largada`. Aviso suave mientras no
   está cargada.
2. **Paró** → un solo formulario: desde / hasta o "todavía está parada",
   motivo agrupado (Limpiezas, Fallas, Organización, Otro con detalle) y, con
   hasta, "Volvió con lote nuevo" (`registrar_parada` abierta +
   `relanzar_con_lote_nuevo`). Una que sigue se termina con "Volvió a las…".
   La lista dice "15:00 a 16:00 · 1 h · motivo" y se toca para corregir.
3. **Terminó de producir** (el cierre) → la ventana de la hora; si es más de
   20 minutos antes del fin del turno y ninguna parada cubre el hueco, pide
   "¿Por qué paró antes?" y lo manda en `p_motivo_cierre`. `cerrar_turno`
   va SIEMPRE con los siete parámetros.

Todas las horas usan una sola ventana propia (`#pr-hora-ventana`), con el
teclado de la planta y la hora actual sugerida.

## Gestión

- "Horarios de turno" en Configuración (de `ci-prueba/planta-horarios`; su
  pregunta "¿A qué hora terminó el turno?" NO se usó).
- El historial: "empezó a producir 06:40 · terminó de producir 13:10";
  turnos relanzados nombrados; "Paradas de la semana" con organizativa.
- Rama de indicadores: "¿A dónde se va el turno?" separa el **arranque**
  (`minutos_arranque`, solo con `tiene_largada`) del **cierre y resto del
  horario**; la dona y las paradas tienen la categoría **organizativa**.

## Huecos de base (para el chat)

- `registrar_hora_largada` usa `_ts_turno`, que suma un día cuando la hora es
  ≤ `hora_inicio`: una largada IGUAL a la hora del turno (06:00 en un turno
  de 06:00) se toma como del día siguiente y se rechaza "a futuro". La
  pantalla lo replica, así que ese caso no se puede cargar. Probablemente
  debería ser `<` y no `<=` para la largada.
- `relanzar_con_lote_nuevo` solo acepta una parada ABIERTA: "desde / hasta +
  lote nuevo" se hace registrándola abierta y relanzando con la hora de
  hasta. Si el relanzar falla, la parada queda abierta (la pantalla lo dice).
- `editar_parada` no valida que la vuelta no sea futura (la pantalla sí).

## Pruebas

- `npm run pruebas`: 207/207 en verde (la rama de indicadores: 209/209).
- Navegador: `e2e/25-planta-paradas.spec.js` 10/10 (los cinco casos a
  1000×540 y 390×844); la corrida completa, 156 pasan y 8 se saltean (los
  que piden los secretos del robot). La comparación con el diseño declara
  la planilla (4a) como desvío: es la pantalla que el pedido cambió.
- Mutaciones de Producción, de a una: paradas-simple 79/79, cierre 178/178,
  paradas 64/64, historial 107/107, gestion-diseno 101/101, horarios-gestion
  16/16, tablet 46/46, legible 57/57, maquinas (rama de indicadores) 42/42;
  las demás sin cambios.
- **Venían rotas de main y se arreglaron de paso** (anclas viejas):
  `mut-produccion-legible.js` (el chip de cono suma `it.marca_id`),
  `mut-produccion-tablet.js` (la línea de `maquinaNombre`) y dos anclas de
  `mut-produccion-historial.js` (la masa tirada).
- **Venían rotas de main y siguen así** (no son de esta rama):
  `mut-produccion-color.js` y `mut-produccion-color-caja.js` abortan por
  anclas que ya no existen, y en `mut-produccion-pantallas.js` escapa
  `esc(textoStockLote(…))` de la sala de masa (80/81).

## Lo que no se probó

- Nada con sesión real ni contra la base (todo con la maqueta y dobles).
- La tablet de verdad (el teclado de la hora con los dedos, la vista parada).

## Qué automatizaría ahora

La tarea repetida más cara de esta tanda fue **arreglar a mano las anclas de
las mutaciones** cuando cambia el código que mutan (mut-produccion-cierre
quedó "ABORTADO" por anclas que ya no existían, y hubo que buscar cada una).
Propuesta: que `mutar.js`, cuando un ancla no existe, busque en el archivo el
renglón más parecido (por distancia de texto) y lo muestre al lado del ancla
vieja, así arreglarlas es copiar y pegar en vez de buscar. Y un comando
`npm run mut:produccion` que corra solo los runners cuyos archivos cambiaron
en la rama (por `git diff --name-only origin/main`), en vez de todos.
