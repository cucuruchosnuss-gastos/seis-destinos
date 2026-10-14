# Traspaso Producción — 14/10/2026: la tablet ya no abre un "lote nuevo" por error

Para el chat de arquitectura. Quien lo recibe no vio el trabajo: está todo acá.
Rama `ci-prueba/tablet-lote-nuevo` (sin integrar; toca `modulos/produccion.html`,
la tablet: se integra SOLO de noche, 23:36–05:30). **No hay cambios de base, de
permisos ni de RPCs**: es pantalla y pruebas. No hacen falta tareas nuevas.

Hay que hacer DOS cosas con este traspaso:
1. agregar el bloque de abajo ("Para docs/memoria/produccion.md") en
   `docs/memoria/produccion.md`, en la sección de la planta (arriba de "EL CIERRE
   SIMPLE, 'PARÓ' CON LISTA DESPLEGABLE…", porque manda sobre eso), y
2. completar el "Avance" de `.claude/pedidos/2026-10-14-tablet.md` con el
   bloque "Para el Avance del pedido".

El subagente de Producción no los escribió él mismo: `docs/memoria/` y
`.claude/` son territorio compartido del chat de arquitectura (su definición le
prohíbe tocarlos, salvo este archivo), aunque el encargo se lo pedía.

## Qué pasaba (pedido de Facu del 14/10)

Caso real 14/10 15:03, Máquina 2: la parada "Limpieza de planchas" (13:00–14:35)
se terminó con "Volvió con lote nuevo". `relanzar_con_lote_nuevo` cerró el lote
6241 y abrió otro como turno MAÑANA a nombre de Federico (abre con la misma
fecha, turno y encargado), justo en el cambio de turno; la tarde no pudo abrir
su planilla, cerró la otra con scrap 9.999.999 para salir y abrió otra más.

## Verificado en la base (14/10/2026, solo lectura, `pg_get_functiondef` y SELECT)

- `relanzar_con_lote_nuevo(p_parada_id uuid, p_hora timestamptz default null)` →
  `{lote_viejo, turno_id, lote}`: termina la parada, pasa el turno a
  `pendiente_completar` (le pone `hora_fin` = la hora de vuelta) y llama
  `abrir_turno(maquina, MISMA fecha, MISMO turno, MISMO encargado, operarios)`; a
  la planilla nueva le pone `hora_inicio` = la hora de vuelta.
- `anular_turno_vacio(p_turno_id uuid, p_motivo text)` → `{lote_anulado, motivo}`:
  exige `produccion:cargar` en la unidad; planilla `abierto`; más de 60 minutos
  desde `abierto_en` solo con `produccion:configurar`; sin `produccion_items`, sin
  `masas` (cuenta también las ANULADAS) y sin `orden_retiro_items` que la
  esperen; motivo de 3+ letras. Borra paradas, operarios y la planilla.
- `horarios_turno`: solo Cucuruchos Nuss — Mañana 06:00–15:00, Tarde 15:00–23:36.
  Las otras unidades no tienen horario cargado.
- Las planillas abiertas tienen `hora_fin` null (2 abiertas, 0 con hora_fin; las
  33 cerradas, todas con hora_fin y hora_inicio).
- `cerrar_turno` rechaza `p_scrap_kg > 100` con un mensaje que ya sugiere "6,7".

## Qué cambió en la tablet (`modulos/produccion.html`)

1. **El cartel de "Volvió con lote nuevo".** Desde "Volvió a las…" y desde el
   formulario de Paró, marcar el lote nuevo y tocar guardar ya no relanza: abre
   un cartel grande (`pedirConfirmaLoteNuevo`, el `#pr-confirma` de siempre con la
   clase `pr-confirma--grande`) con el texto armado con los datos de la planilla
   abierta (`textoConfirmaLoteNuevo`): "Se va a CERRAR el lote 7034 y se va a
   ABRIR el lote nuevo en Máquina 2, turno Mañana, encargado Federico Silva.
   ¿Confirmás?" (sin el nombre del encargado, no dice "encargado —"). Botones
   "Sí, abrir lote nuevo" (relanza) y "No, solo terminar la parada" (termina la
   parada a esa hora, sin lote nuevo: `editar_parada` o `registrar_parada` con
   `p_fin`). Tocar afuera o Escape solo cierra el cartel.
   `pedirConfirmacion` ganó `no` (texto del botón "No"), `grande` y `accionNo`;
   `responderConfirma(si, afuera)`: el botón "No" corre `accionNo`, afuera y
   Escape no. Sin `no`, el botón vuelve a decir "No, seguir" (lo de antes).
2. **El fin del turno.** `MINUTOS_SIN_LOTE_NUEVO = 30`. `loteNuevoSegunHorario(p,
   finParadaMs, ahora)` → `{ ofrecer, fin }`: NO se ofrece el lote nuevo si la
   hora en que terminó la parada **o la hora de ahora** (la más tarde) cae en los
   últimos 30 minutos del turno o después de su fin. El fin sale de
   `finTurnoPlanillaMs(p)`: `turnos_produccion.hora_fin` si la planilla la tiene
   y si no `horarios_turno` (que la tablet ya leía en `leerPlanilla`), con el día
   decidido por el horario ENTERO (inicio y fin del mismo lado: la planilla
   relanzada tiene `hora_inicio` 15:03 y con ella un fin de 15:00 pasaría al día
   siguiente). En su lugar se ofrecen **"Terminar parada"** (el botón de guardar
   de "Volvió a las…" cambia de texto; en Paró es "Guardar la parada") y
   **"Cerrar planilla del turno"** (`[data-hv-cerrar-planilla]` en la ventana,
   `[data-parada-cerrar-planilla]` en Paró: termina/guarda la parada y pasa al
   cierre de esa planilla, `irAlCierreDe`). La nota dice "El turno termina a las
   15:00: a esta hora no se abre un lote nuevo." (`textoFinDeTurno`). Si quedó
   marcado de antes, se desmarca solo al pintar, y al mandar se vuelve a revisar.
   La ventana de la hora guarda `abiertaEn` (la hora de referencia mientras está
   abierta). **Sin horario cargado** (todas las unidades menos Cucuruchos Nuss)
   la regla no se puede aplicar: se ofrece, siempre con el cartel del punto 1.
3. **"Anular, se abrió por error".** Arriba de la planilla (en
   `#pr-planilla-estado`), un aviso con el botón (`[data-anular-error]`), solo si
   `puedeAnularPorError`: planilla `abierto`, menos de 60 minutos desde
   `abierto_en` (`MINUTOS_ANULAR_POR_ERROR`; tolera el reloj de la tablet 5
   minutos atrasado), sin cajas (cuenta también las anuladas), sin masas, sin el
   cierre en la cola y sin nada de esa planilla esperando en la cola de la
   tablet. Abre `#pr-anular-planilla` (motivo de 3+ letras; sin internet no se
   manda) → `supabase.rpc('anular_turno_vacio', { p_turno_id, p_motivo })` directo
   (no va por la cola). Error de la base tal cual, en la ventana. Al anular:
   "Se anuló la planilla del lote N…", `maquinaCerrada` y vuelve al tablero (la
   máquina queda sin planilla abierta). Escape, tocar afuera, Cancelar y el
   botón de volver la cierran.
4. **El scrap con punto de miles.** El campo ya era de número argentino
   (`enlazarCampoNumero`, 3 decimales): la coma es decimal y el punto tipeado se
   vuelve coma ("6.7" queda "6,7"). Pero quien escribe 6700 pensando en 6,7 ve
   "6.700". `avisoScrapMiles(texto del campo)`: con punto y 1000 kg o más es un
   punto de miles; con UN grupo y sin coma ("6.700", "12.500") sugiere leer el
   punto como coma (6,7 · 12,5); con más grupos o con coma ("9.999.999",
   "6.700,5") pregunta sin sugerir. "6.7", "6.70" y "0.700" son decimales. Antes
   de mandar el cierre (`intentarCerrar`), el cartel grande: "¿Quisiste decir
   6,7 kg?" con "Sí, 6,7 kg" (corrige el campo y sigue cerrando) y "No, fueron
   6.700 kg" (manda igual: la base rechaza más de 100 con su mensaje, que se
   muestra tal cual); sin sugerencia, "¿Fueron 9.999.999 kg de scrap?" con
   "Corregir el número" / "Sí, fueron 9.999.999 kg". `leerNumeroAr` se importa
   ahora de `js/utils.js` (ya existía; no se tocó utils).

## Qué se verificó y contra qué

- `pruebas/test-produccion-lote-nuevo.js` (nueva): 133/133 — la regla del fin
  del turno con bordes (14:29 sí, 14:30 no, el caso real 14:35/15:03, ahora
  pasado el fin, Tarde hasta 23:36, Noche que cruza la medianoche, la planilla
  relanzada, `hora_fin` propia, sin horario), 35 textos de scrap, la regla de
  anular, y los cuatro flujos ejecutados en el sandbox con la base falsa.
- `pruebas/mut-produccion-lote-nuevo.js` (nueva): 64/64 mutaciones detectadas,
  de a una.
- `e2e/45-tablet-lote-nuevo.spec.js` (nueva): 28/28 en la maqueta (7 casos a
  1000×540, 1280×800, 390×844 y 360×780; sin scroll de costado ni errores de JS).
  Sobre el commit de la prueba sola, antes del arreglo: 24 rojas y 4 verdes (las
  4 verdes son "6.7 se lee 6,7", que ya andaba).
- Pruebas existentes que hubo que tocar (por el cambio de flujo, lo mínimo):
  - `pruebas/test-produccion-paradas-simple.js`: el bloque "Volvió con lote
    nuevo" corre a las 17:00 con el turno Mañana hasta las 15:00, así que ahora
    se arma SIN horario y pasa por el cartel (`responderConfirma(true)`); el
    chequeo de "Volvió a las…" a las 17:00 ahora espera "Cerrar planilla del
    turno" en vez de la casilla; y el de "en una pendiente no hay lote nuevo"
    se arma sin horario y exige que tampoco aparezca "Cerrar planilla del
    turno" (con horario, la mutación «lote nuevo también en una pendiente»
    escapaba: la regla del fin del turno la tapaba).
  - `e2e/pasos-planta.js` (paso `paradas-hasta`, lo usan 8, 16, 17, 28, 29, 30
    y `recorrer-planta.js`): HASTA es 16:00, después del fin del turno de la
    maqueta, así que el paso acepta la casilla O "Cerrar planilla del turno" (en
    la fábrica de pruebas, sin horario, sigue la casilla).
  - `pruebas/sandbox-produccion.js`: las 18 funciones y 2 constantes nuevas.
- `npm run pruebas`: 262/262 en verde. `node pruebas/check-scripts.js`: OK.
  `controles-produccion.js`: 2059/2059 (no se retiró ningún control; solo se
  agregaron).
- Mutaciones de las suites vecinas, de a una: paradas-simple 90/90 (+10 eq.;
  una escapaba por el cambio y se arregló la prueba, ver arriba), volver 15/15,
  atras 23/23, sin-internet 34/34, dos-planillas 9/9, sin-zoom 22/22, planta
  34/34, pantallas 81/81, operarios-fin 21/21, teclado 18/18, pestañas 29/29.
  **`mut-produccion-cierre.js` y `mut-produccion-tablet.js` ABORTAN igual en
  `origin/main`** (anclas que ya no existen: «un paso que falta ya muestra un
  valor», «Abrir turno no asegura el personal», «init no conecta el tiempo
  real»): es previo a esta rama, queda para otra tarea.
- e2e de planta en esta máquina (0-humo, 1, 5, 6, 8, 9, 12, 16, 17, 21, 25, 27,
  28 ×2, 29, 30, 31 y 45): 131 verdes, 2 salteadas, 17 rojas. **Las 17 rojas
  dan igual sobre el código de `origin/main`** (0-humo "planta sin sesión", todo
  6-planta-reanudar, 9-comparar-planta y 27-planta-sin-internet: puerto 4173
  fijo, CDN y diseños que esta máquina no tiene): son del entorno local, no del
  cambio. En GitHub (Navegador) tienen que pasar como siempre.

## Para pedirle al chat de la base (no se tocó la base)

- **Que `relanzar_con_lote_nuevo` también frene al final del turno** (los últimos
  30 minutos o después del fin según `horarios_turno`, mirando la hora de vuelta
  y `now()`), con un mensaje para una persona. Hoy la regla vive solo en la
  pantalla: una tablet con la versión vieja en caché todavía puede relanzar.
- `anular_turno_vacio` cuenta las masas ANULADAS como masas: una planilla con
  una masa registrada y anulada no se puede anular (la pantalla, que no ve las
  anuladas, ofrece el botón y muestra el error de la base tal cual). Decidir si
  está bien así.
- Cargar `horarios_turno` de Dolce Pasta, Taller y Mengui (es dato: lo carga
  Facu desde Gestión → Configuración → Horarios de turno) para que la regla 2
  valga ahí.

## Lo que no se pudo probar

- En la tablet real (Samsung) y contra la base real: todo fue en el sandbox y en
  la maqueta.
- `anular_turno_vacio` de verdad (borra filas): no se llamó; la maqueta imita
  su respuesta y su error.

## Para docs/memoria/produccion.md

> - **EL "LOTE NUEVO" POR ERROR (14/10/2026, rama `ci-prueba/tablet-lote-nuevo`; pedido `.claude/pedidos/2026-10-14-tablet.md`). MANDA SOBRE LO DE ABAJO de "Volvió con lote nuevo".** Caso real: Máquina 2, parada 13:00–14:35 terminada a las 15:03 con lote nuevo → `relanzar_con_lote_nuevo` abrió un lote de la Mañana (misma fecha, turno y encargado) en el cambio de turno.
>   - **El cartel:** marcar "Volvió con lote nuevo" y guardar (en "Volvió a las…" y en Paró) abre `pedirConfirmaLoteNuevo`: "Se va a CERRAR el lote N y se va a ABRIR el lote nuevo en <máquina>, turno <turno>, encargado <nombre>. ¿Confirmás?" (`textoConfirmaLoteNuevo`, datos de la planilla abierta), "Sí, abrir lote nuevo" / "No, solo terminar la parada" (la termina a esa hora, sin relanzar). `pedirConfirmacion` tiene `no`, `grande` y `accionNo`; `responderConfirma(si, afuera)`: afuera y Escape no corren el "No".
>   - **El fin del turno:** `MINUTOS_SIN_LOTE_NUEVO = 30`; `loteNuevoSegunHorario` no ofrece el lote nuevo si la hora de vuelta **o la de ahora** cae en los últimos 30 minutos del turno o después (fin: `hora_fin` de la planilla o `horarios_turno`, con el día del horario entero, `finTurnoPlanillaMs`). En su lugar: "Terminar parada" y "Cerrar planilla del turno" (termina la parada y pasa al cierre, `irAlCierreDe`). **Sin horario cargado** (hoy, todas menos Cucuruchos Nuss) se ofrece, siempre con el cartel.
>   - **"Anular, se abrió por error"** (`#pr-planilla-estado`, `[data-anular-error]`, ventana `#pr-anular-planilla`): con la planilla abierta hace menos de 60 min (`MINUTOS_ANULAR_POR_ERROR`), sin cajas, masas ni nada en la cola → `anular_turno_vacio(p_turno_id, p_motivo)` directo (no por la cola), motivo de 3+ letras, error de la base tal cual; al anular, la máquina queda sin planilla y vuelve al tablero.
>   - **El scrap:** `avisoScrapMiles` sobre el texto del campo: con punto y ≥ 1000 kg pregunta antes de mandar; "6.700" → "¿Quisiste decir 6,7 kg?" ("Sí, 6,7 kg" corrige y sigue; "No, fueron 6.700 kg" manda y la base rechaza > 100); "9.999.999" o "6.700,5" preguntan sin sugerir; "6.7", "6.70" y "0.700" son decimales (el campo ya convierte el punto tipeado en coma).
>   - Suites `test-/mut-produccion-lote-nuevo.js` (133/133; 64/64) y `e2e/45-tablet-lote-nuevo.spec.js` (28/28, a 1000×540, 1280×800, 390 y 360). `e2e/pasos-planta.js` (`paradas-hasta`) acepta la casilla o "Cerrar planilla del turno".

## Para el Avance del pedido (`.claude/pedidos/2026-10-14-tablet.md`)

> **14/10/2026 — hecho en `ci-prueba/tablet-lote-nuevo` (sin integrar; de noche).** Los cuatro puntos en la tablet: (1) el cartel con los datos reales de la planilla y "Sí, abrir lote nuevo" / "No, solo terminar la parada"; (2) en los últimos 30 minutos del turno o después (por la hora de vuelta o la de ahora) no se ofrece el lote nuevo: "Terminar parada" y "Cerrar planilla del turno"; sin horario cargado se ofrece con el cartel; (3) "Anular, se abrió por error" con `anular_turno_vacio`; (4) el scrap "6.700" pregunta "¿Quisiste decir 6,7 kg?". Pruebas: unitaria 133/133, mutaciones 64/64, e2e 28/28. Pendiente: cargar `horarios_turno` de Dolce Pasta, Taller y Mengui (Gestión → Configuración → Horarios de turno) para que la regla 2 valga ahí; y que la base también frene el relanzar al final del turno (ver el informe).

## Qué automatizaría ahora

La tarea repetida más cara de hoy fue **levantar el navegador local**: cada
ayudante copia `pw.config.js`, apunta a su worktree, levanta el CDN falso y
arma una segunda copia del repo para ver la prueba en rojo antes del arreglo.
Un `npm run e2e:local -- <specs>` (o una skill) que haga todo eso solo —
`PLAYWRIGHT_BROWSERS_PATH`, puertos libres, el CDN falso si no está y el mapeo de
hosts— y un `npm run e2e:antes -- <commit> <spec>` que corra la spec sobre un
`git worktree` del commit "prueba que falla" ahorrarían ~15 minutos por rama y
varios errores de configuración.
