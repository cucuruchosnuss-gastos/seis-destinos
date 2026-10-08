# Traspaso para el chat de arquitectura — Producción: los operarios cuando termina una planilla (08/10/2026)

Rama `ci-prueba/operarios-fin-planilla` (desde `origin/main` `c2731c7`). Pedido de Facu del 08/10/2026, paso 4. Cero SQL escrito: Supabase solo lectura.

## Qué dice la base (leído con `pg_get_functiondef` / `pg_trigger` el 08/10/2026)

- **Trigger `trg_turno_cierra_operarios`** (AFTER UPDATE OF estado ON `turnos_produccion`, función `_turno_cierra_operarios()`): si la planilla pasa de `'abierto'` a otra cosa (cerrar, forzar el cierre, relanzar con lote nuevo), a cada `turno_operarios` de ese turno con `hasta IS NULL` le pone `hasta = greatest(desde, least(now(), <fin del horario>))` (el fin sale de `hora_fin` del turno o de `horarios_turno`, con `_ts_turno`).
- **`relanzar_con_lote_nuevo`** junta `array_agg(empleado_id) … where turno_id = viejo and hasta is null` ANTES de pasar el turno a `pendiente_completar`, y se los pasa a `abrir_turno` del lote nuevo.
- **`abrir_turno` / `abrir_turnos` NO validan que un operario esté en otra máquina**: no hay rechazo de la base por "ocupado". `agregar_operario_turno` tampoco (hace `on conflict … set hasta = null`).
- Datos al 08/10/2026: `turno_operarios` de turnos `cerrado`: 34 filas, 0 sin `hasta`; de turnos `abierto`: 4, las 4 sin `hasta`. No hay datos viejos (sin `hasta` en una planilla no abierta).

## Qué cambió en la pantalla (solo `modulos/produccion.html`, la planta)

- **Abrir turno · "los que están en otra máquina"** (`leerOcupadosYRecientes`): antes tomaba los turnos del TABLERO (que podía estar viejo) y dejaba afuera la planilla abierta de un día anterior; ahora lee en el momento `turnos_produccion` con `.eq('unidad_negocio_id')` y `.eq('estado','abierto')`, y `turno_operarios` con `.in('turno_id', abiertos).is('hasta', null)`, y vuelve a mirar las dos cosas (y la fábrica) en el cliente. **OCUPADO = sin `hasta` Y la planilla `'abierto'`.** El operario de la planilla de la mañana, ya cerrada, se elige en el turno siguiente. Firma nueva: `leerOcupadosYRecientes(unidadId, maquinaIds, nombresMaquina)` (el nombre de la máquina sale del tablero; sin nombre, "en otra máquina"). Si falla la lectura, nadie aparece ocupado (como antes).
- **El rótulo** pasó de "EN GRIS, LOS QUE YA ESTÁN EN OTRA MÁQUINA HOY" a **"EN GRIS, LOS QUE ESTÁN AHORA EN OTRA MÁQUINA"** (las dos variantes del grupo).
- **Adentro de una planilla**: helper nuevo `operarioAdentro(o, turno)` = sin `hasta` y la planilla `'abierto'` (sin estado leído, abierta). Lo usan el resumen de operarios (4a), la lista con la × para sacar y el buscador de "+ Sumar". En una planilla que no está abierta nadie queda adentro; un `hasta` vacío ahí se ve como "· sin hora de salida" (antes no aparecía en ningún lado). El que salió sigue con su hora.
- **Sin cambios**: la gestión (`produccion-gestion.html`): el detalle del historial sigue mostrando a todos con su rango (desde → hasta, o "desde HH:MM · sigue"); los indicadores "Ahora" (`indicadores_produccion`) no tratan operarios.

## Verificación

- `pruebas/test-produccion-operarios-fin.js` **36/36** (ejecuta el código real en `sandbox-produccion.js` con un Supabase falso que aplica o IGNORA los filtros): mañana cerrada → no ocupado y elegible; sin `hasta` en planilla abierta → ocupado "en Máquina 2"; sin `hasta` en `pendiente_completar` → no ocupado; otra fábrica no cuenta; las consultas piden `.eq('estado','abierto')`, la unidad y `.is('hasta', null)`; Abrir turno de punta a punta y el payload de `abrir_turnos`; `operarioAdentro` y los renders de la planilla. `mut-produccion-operarios-fin.js` **21/21**.
- `mut-produccion-abrir.js` **115/115 (+6 eq.)**: tenía TRES anclas viejas en `main` (`supabase.rpc('abrir_turnos', …)` y el texto del error, de antes de que abrir fuera por `ejecutar_tablet`) que lo hacían ABORTAR; se reapuntaron. Al correr aparecieron dos que escapaban desde antes ("lee turnos de todas las unidades", "lee también los pendiente_completar" del tablero): `test-produccion-abrir.js` (188/188) suma una assertion sobre la consulta del tablero.
- `node pruebas/correr-todo.js` 227/227, `check-bytes` y `check-scripts` en verde, `controles-produccion*.js` sin pérdidas.
- E2E `e2e/28-planta-operarios-fin.spec.js` con la maqueta nueva `produccion-operarios` (pruebas/datos-maqueta/produccion-operarios.js): a 1000×540 y 390×844, Gómez Rodrigo (planilla de la mañana cerrada) se elige, Sosa Marcela (dato viejo) también, Ramón Díaz (Máquina 1 abierta) apagado "en Máquina 1".

## Qué tocar en CLAUDE.md

Sección **10. Producción**, en "LA PLANTA V2 → Abrir turno" (o una viñeta nueva): "**Ocupado** en Abrir turno = sin `hasta` en `turno_operarios` Y la planilla `'abierto'` (08/10/2026): la base cierra a los operarios al sacar la planilla de `'abierto'` (`trg_turno_cierra_operarios`) y `relanzar_con_lote_nuevo` pasa solo a los que seguían; la pantalla lee los turnos abiertos en el momento (no del tablero) y el rótulo dice «los que están ahora en otra máquina». Adentro de una planilla, `operarioAdentro()` mira las dos cosas. Suites `test-/mut-produccion-operarios-fin.js`, `e2e/28-planta-operarios-fin.spec.js`, maqueta `produccion-operarios`."

Nota honesta: el caso principal (el de la mañana cerrada) ya andaba con el código anterior, porque se tomaban los turnos abiertos del tablero; lo que cambia son los bordes (tablero viejo, planilla abierta de otro día, dato viejo sin `hasta`, la planilla no abierta) y que la regla quedó escrita y probada. También corridas sin regresiones: `8-planta-tamanos`, `9-comparar-planta` y `17-planta-pestanas` (17 pasan), con `CI=1`.

## Huecos de base (anotados, no tocados)

1. **`agregar_operario_turno` y `quitar_operario_turno` aceptan una planilla `pendiente_completar`** (solo rechazan `'cerrado'`). Sumar a alguien ahí le deja `hasta` NULL en una planilla que ya no está abierta (y el trigger no vuelve a correr). La pantalla no lo cuenta como ocupado, pero el dato queda raro. Sugerencia: exigir `estado = 'abierto'`.
2. **`abrir_turnos` frena si otra máquina sigue en un turno distinto con `estado <> 'cerrado'`**, o sea también con una planilla `pendiente_completar` de la mañana: "La Máquina X sigue abierta en el turno Mañana…". No es de operarios, pero una planilla forzada o relanzada sin completar traba abrir el turno siguiente. Confirmar si es lo buscado.
3. La base no valida que un operario esté en dos máquinas abiertas a la vez (es solo de la pantalla).

## Decisiones tomadas sin consultar

- Una planilla abierta **de un día anterior** cuenta para ocupar (antes se excluía por fecha): la regla es estado + `hasta`, no la fecha. En la práctica `abrir_turnos` igual rechaza abrir con una planilla de otro turno abierta.
- El texto del rótulo ("AHORA" en vez de "HOY"): se aparta del diseño planta-v2 en una palabra.

## Lo no probado

Nada en la tablet real ni contra la base (ninguna RPC ejecutada).

## Qué automatizaría ahora

Un chequeo en `mutar.js` que, cuando un runner ABORTA por anclas que no existen, lo cuente como rojo en `correr-todo.js mut` y no como un aviso: `mut-produccion-abrir.js` estaba abortado en `main` y escondía dos mutaciones que escapaban.
