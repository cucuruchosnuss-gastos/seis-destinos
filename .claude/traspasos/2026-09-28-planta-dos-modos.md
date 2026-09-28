# Traspaso — Producción: LA PLANTA CON DOS MODOS (tanda nocturna 27-28/09/2026)

Para el chat de arquitectura (dueño de CLAUDE.md). Es autocontenido: quien lo lee no vio nada del trabajo.

## Qué se hizo

`modulos/produccion.html` (la planta, la tablet de la fábrica) se rehízo con el handoff de diseño
"Planta · Dos modos" (`design_handoff_planta_dos_modos`, reemplaza a `design_handoff_planta`). La
tablet es una Samsung Galaxy Tab A11 horizontal (1280×800) y se usa también parada (800×1280).
**Cero SQL corrido, cero RPCs nuevas, cero cambios de permisos**: todo usa lo que ya estaba en la base
(verificado contra `pg_proc` el 28/09/2026: `registrar_masa(p_turno_id, p_tipo_masa, p_doble,
p_masero_id, p_items, p_client_uuid, p_motivo)` → jsonb, `stock_para_masa(p_turno_id)` → jsonb,
`datos_para_masa`, `anular_masa`, `mi_sesion_produccion`, `asignar_pin_con_maestro`; todas SECURITY
DEFINER, `search_path` fijo, `authenticated` sí y `anon` no).

Trabajado en la rama `worktree-agent-a0c2b41813e37175a`, sin push. Commits, en orden:

| Commit | Qué |
|---|---|
| `11eaa37` | baseline fijo de controles (`1867987`, el punto de partida) en `BASES` de `pruebas/controles-produccion.js` |
| `34c45ae` | parte 1 — la barra lateral y "¿Quién sos?" |
| `b9b7ad0` | parte 2a — la Sala de masa (4a–4g) |
| `122356a` | parte 2b — el historial de una máquina (4h) |
| `f1472f4` | parte 3a — el inicio de Producción (el tablero) |
| `be2a5a3` | parte 3b — la parada (6b), el cierre (7) y Asignar PIN dos veces (8b) |
| `27c3e63` | la planta en la maqueta a 1280×800 y 800×1280 (y lo que la maqueta encontró) |
| (este) | el traspaso |

**Al integrar por cherry-pick en `main`:** `11eaa37` agrega el baseline `1867987`, que es un commit de
`main` (existe en los dos lados): no hay que reescribirlo. Ningún otro baseline nuevo. `main` avanzó
mientras tanto (barra de unidad, Taller); el único archivo que tocaron los dos lados es
`e2e/5-maqueta.spec.js`, en zonas distintas (main agregó la entrada de Taller en `PANTALLAS`; esta rama
agregó el bloque de la planta al final, antes de "la planta no carga la barra lateral").

## Qué cambió, para la entrada "10. Producción" de CLAUDE.md

Reemplaza a "LA BARRA DE MODOS Y EL PIN (parte 1)" y a partes de "LA SESIÓN DE CADA MODO", "EL
TABLERO", "LA PLANILLA" y "LA SALA DE MASA". Lo que no se nombra acá sigue igual (la regla del uuid,
las paradas con horarios, lo producido en pasos, el empaque, el login adentro de la planta, el
acceso maestro sin "¿Quién sos?", Asignar PIN desde la planta).

1. **La barra de modos de arriba YA NO EXISTE: hay una barra LATERAL de 240 px** (`#pr-barra`,
   `aside.pr-lateral`, la pinta `pintarLateral()` con `htmlLateral()`), fija a la izquierda mientras hay
   alguien adentro de un modo. De arriba hacia abajo: el botón al OTRO modo con el tono de ese modo
   ("Ir a Sala de masa · PIN del masero" / "Ir a Producción · PIN del encargado"; apagado y punteado
   sin máquinas abiertas, HABILITADO si todavía no se midió), dónde estás y quién (nombre, puesto,
   unidad, "Cambiar de persona"), el cuerpo del modo, "Sin conexión" si corresponde y Salir.
   - Producción: la máquina elegida (nombre, LOTE grande, turno) y las secciones Inicio · Abrir turno ·
     Lo producido · Paradas · Cerrar planilla (las tres últimas apagadas sin máquina elegida; "en
     curso" en bordó al lado de Paradas).
   - Sala de masa: "Inicio" y una fila por máquina abierta (nombre, lote o "Parada", cantidad de masas);
     tocarla abre su HISTORIAL (4h).
   - **Tablet parada (≤ 1000 px): la barra pasa ARRIBA y compacta** (el otro modo y Salir en una fila,
     quién está en otra, las secciones o las máquinas como botones que se reparten el ancho). Medido
     en la maqueta a 800×1280: apilada entera ocupaba 640 px y dejaba la receta debajo del borde.
2. **"¿Quién sos?" es a pantalla completa, sin barra**, con una banda de 76 px en el tono del modo. En
   Producción tiene "Ir a Sala de masa" (el masero no necesita al encargado para entrar).
3. **Inactividad (decisiones de Facu):** Producción, a los **10 minutos** sin tocar, olvida a la persona
   pero la deja ELEGIDA (vuelve a "¿Quién sos?" con ella fija y solo pide el PIN). **Sala de masa no se
   cierra nunca por inactividad.** El acceso maestro se cierra a los 10 minutos en los dos modos.
   (Antes eran 15 y el de Producción sacaba a la persona.)
4. **El inicio de Producción (2): las máquinas en ORDEN FIJO por número** (la abierta de AYER sigue
   primera, en bordó, con "Cerrar planilla de ayer"). Andando: "Andando", LOTE grande, el encargado,
   masas y **cajas** (de `produccion_items`). Parada: **la única tarjeta oscura** (bordó entero), "PARADA",
   "Hace 12 min · motivo". Sin turno: gris punteada con "Abrir turno", que abre Abrir turno con esa
   máquina ya elegida. **Tocar una máquina la elige y lleva a Lo producido** (antes llevaba a la
   planilla). Grilla de 3 columnas desde 1100 px.
5. **La parada (6b):** la franja dice "desde 10:32 · hace 14 min" y "¿Por qué paró? motivo"; el botón
   pasó de "Reanudar" a **"Volvió a andar"** (mismo id `#pr-btn-reanudar`, misma RPC `terminar_parada`).
6. **Cerrar planilla (7): "Lo que falta"** a la derecha (`htmlFaltaCierre`, `#pr-cierre-falta`): lo del
   formulario (hora, scrap, qué pasó), en bordó recién después de intentar, y lo de otra sección con
   su botón ("Ir a Paradas" si hay una parada sin terminar, "Ir a Lo producido" si no hay nada
   cargado). **Sigue sin bloquear**: se puede cerrar con una parada abierta (la base la cierra con
   `hasta_fin_de_turno`) y el botón no se deshabilita por lo que falta.
7. **LA SALA DE MASA (4a–4g):**
   - 4a: una tarjeta por máquina abierta (turno, lote, masas, la última masa o "Primera masa · cargá
     los lotes", la parada que "se puede hacer masa igual", "+ Nueva masa"); con UNA sola máquina se
     entra derecho.
   - 4b: arriba de la receta, "Masa N", Tamaño Simple / Doble y **Original / Anterior / Modificar**.
     **Con Original o Anterior las cantidades NO se tocan** (se muestran fijas).
   - 4c: **Modificar** habilita − / + y pide **"¿Por qué la modificás?"**: el motivo es OBLIGATORIO y
     viaja como **`p_motivo` de `registrar_masa`** (null con Original / Anterior), ADENTRO del payload
     congelado; **la regla del uuid no cambió** (un uuid al empezar la masa, el mismo en cada reintento).
     El botón Registrar no se deshabilita: lo que falta se dice pegado a él. "+ Agregar ingrediente"
     (4c2) agrega un ingrediente de la lista con la guía **"600 a 700 g" solo para el cacao**.
   - 4d: **"Otro"** en cada renglón abre el panel de lotes de ese insumo (tarjetas, "Otro lote").
   - 4e: **"quedan" = lo que hay en el lote ANTES de esta masa**, de `stock_para_masa(p_turno_id)`
     (antes salía de `datos_para_masa` y la fecha de `v_stock_por_lote`, que pedía `stock:ver`; **ya no
     pide `stock:ver`**). Un lote que no alcanza se avisa pegado a Registrar con "Registrar igual"; **si
     `stock_para_masa` falla, la masa se registra igual con un aviso** (nunca frena la carga).
   - 4f: a la derecha, las masas del turno (SIMPLE/DOBLE grande, chips Modificada/Chocolate) y
     **"Anular la última masa"** (con motivo; el error de la base tal cual).
   - 4g: sin conexión sigue funcionando como antes (la banda y el reintento con el mismo uuid).
   - Registrar deja lista la masa siguiente de la MISMA máquina.
8. **EL HISTORIAL DE UNA MÁQUINA (4h, `#pr-hist-maq`, nuevo):** se abre tocando una máquina en la barra
   de Sala de masa. Las masas del turno en botones de 72 px ("Masa 2 · Doble", "07:40 · Modificada" y
   sus pastillas); a la derecha el detalle de la elegida (número y hora, tamaño, quién la hizo, el
   motivo, cada ingrediente con marca, cantidad y lote, "agregado" si la receta lo tenía en 0 y la
   diferencia contra SU receta en bordó; sin `receta_id` no se compara). **Solo se anula la ÚLTIMA**
   ("Anular esta masa", motivo, error de la base tal cual). "+ Nueva masa para Máquina N" abre 4b.
   La lectura de masas suma `masero_id, motivo, receta_id`; los ingredientes salen de `masa_items`
   (con `ingredientes(nombre, orden)` e `insumos(nombre, marca)`) y la receta de `receta_items`.
9. **Asignar PIN (8b): el PIN nuevo se carga DOS veces** ("Seguir" → "Guardar el PIN"); si no coinciden,
   "Los dos PIN no coinciden. Ponelo de nuevo." y vuelve a empezar. El primero vive solo en
   `estado.asignar.primero` (nunca en el DOM ni en ningún storage) y se borra al elegir otra persona,
   al volver, al guardar y en cada error.

## Controles (ningún control perdido sin declarar; `controles-produccion.js` en verde)

- **RETIRADOS:** `#pr-btn-entrar` ("Tocá para entrar", vivía en la barra de arriba, que ya no existe:
  sin nadie adentro la tablet MUESTRA "¿Quién sos?") y `#pr-btn-barra-maestro` (el atajo al acceso
  maestro de la barra de arriba; queda `#pr-btn-maestro` en "¿Quién sos?", el único lugar del handoff).
- **MENOS_COPIAS:** `button[data-modo]` 1 (la barra lateral tiene UN botón, el del otro modo) y
  `button[data-planilla]` 2 (la tarjeta andando/parada lleva a Lo producido con `data-producido`;
  `data-planilla` sigue en la de ayer y en el aviso de planillas pendientes).
- Texto cambiado de un control con id (no hace falta declararlo): `#pr-btn-reanudar` "Reanudar" →
  "Volvió a andar".

## Lo que encontró la maqueta (y se arregló en `27c3e63`)

- A 1280×800 el botón **"Otro"** de cada renglón de la receta **se salía de la tarjeta**: la fila pedía
  706 px en 642 y el documento no scrolleaba, así que el chequeo de scroll no lo veía. Columnas nuevas
  `minmax(120px,1fr) 250px minmax(150px,1.1fr) 84px` y la columna derecha a 280 px; el spec de la
  maqueta ahora exige que ningún renglón se salga.
- El título y la explicación de Original / Anterior / Modificar se pegaban en una línea
  ("Originalla vigente"): `.pr-como__titulo` y `__detalle` van en bloque.
- En vertical, la barra apilada entera tapaba la receta (ver el punto 1).

## Huecos de base (no se inventó nada: se muestra solo lo que la base devuelve)

- `_lotes_con_stock` / `datos_para_masa` siguen sin distinguir "se agotó" de "nunca tuvo ingreso" (el
  panel de lotes marca "sin ingreso cargado" en los dos casos).
- El historial (4h) no refresca las cantidades de la barra lateral al anular hasta volver al inicio de
  la sala (es un recuento local; la base está bien).
- No hay RPC para corregir la CAJA ni el embolsado de un sublote ya cargado (pendiente de antes).
- En 4h el renglón dice "07:40 · Modificada" y además la pastilla "Modificada": es lo que pide el
  handoff ("07:52 · Modificar, con sus pastillas"); si se ve redundante, sacar el texto del origen en
  `htmlMasaHist()` es una línea (y su assertion en `test-produccion-historial-maquina.js`).

## Qué se verificó y contra qué

- `node pruebas/check-bytes.js` y `node pruebas/check-scripts.js`: verde.
- `FILTRO=produccion node pruebas/correr-todo.js`: **28/28 en verde** (incluye `controles-produccion.js`
  1924/1924 y `controles-produccion-gestion.js` 612/612). Suites que cambiaron o nacieron:
  `test-produccion-masa` 320/320 (mut 170/170 +14 eq.), `test-produccion-lotes` 77/77 (mut 42/42),
  `test-produccion-historial-maquina` 62/62 (mut 49/49 +5 eq., nueva), `test-produccion-abrir` 171/171
  (mut 105/105 +3 eq.), `test-produccion-cierre` 257/257, `test-produccion-asignar-pin` 106/106
  (mut 42/42), más `quien`, `sesion`, `planta`, `acceso`, `color` y `empaque` al día. Los números de la
  corrida completa de mutaciones, de a una, están al pie.
- Playwright: `0-humo`, `5-maqueta` (con el bloque nuevo de la planta a 1280×800 y 800×1280) y
  `6-planta-reanudar` en verde (49 pasan); `1-planta` parsea y se saltea sin los secretos del robot.
- Maqueta: `pruebas/datos-maqueta/produccion.js` → `e2e/maqueta/datos/produccion.json`
  (`test-maqueta-datos.js` 20/20). Las fechas van en **2099-12-31** para que ninguna se lea como "de ayer".

## Números de cierre (corridos al final, en la rama)

- `node pruebas/correr-todo.js`: **125/125 en verde** (todo el repo, no solo Producción).
- `check-bytes`: 414 archivos de texto, 0 CR, 0 NUL, sin comillas abiertas.
- Mutaciones, de a una (ningún runner en paralelo): abrir 105/105 (+3 eq.) · acceso 25/25 · asignar-pin
  42/42 (+2) · cierre 165/165 (+37) · color 29/29 · config 193/193 (+7) · empaque 146/146 (+14) ·
  fabrica-pruebas 13/13 · gestion-diseno 102/102 (+21) · gestion 94/94 (+24) · historial-maquina 49/49
  (+5) · historial 104/104 (+15) · legible 47/47 (+28) · lotes 42/42 (+2) · masa 170/170 (+14) · paradas
  61/61 (+30) · pin 69/69 (+2) · planta 28/28 · quien 79/79 (+5) · sesion 40/40 (+2) · sin-empaque 47/47 ·
  stock-retiros 31/31 (+3) · dashboard-produccion 14/14 · empleados-pin 23/23.
- Dos runners abortaron en la primera pasada por un ancla que dejó de ser única (el guard funcionó): en
  `mut-produccion-acceso.js` el `minmax(min(100%, 15rem), 1fr)` ahora aparece también en la regla del
  tablero del handoff, y en `mut-produccion-masa.js` el "Escribí por qué (al menos 3 letras)" aparece
  también en el anular del historial (4h). Se anclaron con más contexto y dieron 25/25 y 170/170. La
  assertion de `test-produccion-acceso.js` sobre el tablero pasó de "cuatro columnas en 1280" a lo que
  pide el handoff (15rem por debajo de 1100 px y grilla de 3 desde 1100).

## Lo que NO se probó

- Nada con sesión real ni contra la base (ninguna RPC se ejecutó; Supabase en solo lectura).
- Nada en la tablet real: ni el tacto, ni el cierre por inactividad de 10 minutos, ni girarla con una
  persona adentro, ni el Wake Lock.
- `e2e/1-planta.spec.js` (el turno completo contra la fábrica de pruebas) se actualizó al recorrido nuevo
  leyendo el código, y **nunca corrió** (faltan los secretos del robot): es esperable que pida ajustar
  algún selector la primera vez.

## Guion para Facu, en la tablet

1. Abrí la planta: tiene que aparecer "¿Quién sos?" de Producción a pantalla completa, con la banda
   gris. Elegí al encargado y poné su PIN.
2. A la izquierda está la barra: arriba "Ir a Sala de masa". En el medio, las máquinas en orden: la que
   está andando dice "Andando" y sus cajas; si una está parada, es la única oscura.
3. Tocá una máquina andando: tiene que abrir "Lo producido" de esa máquina.
4. "Paró ahora" y después mirá la franja: "desde … · hace …" y el botón "Volvió a andar".
5. "Cerrar planilla" sin llenar nada: a la derecha "Lo que falta" dice qué falta y te lleva a Paradas si
   quedó una parada abierta.
6. "Ir a Sala de masa", PIN del masero. Con una sola máquina entra derecho. Probá "Modificar": sin
   motivo, Registrar te dice que falta; con motivo, registra. Mirá que "quedan" diga lo del lote antes
   de la masa.
7. En la barra de Sala de masa tocá la máquina: el historial con sus masas; tocá una y mirá el detalle.
8. Dejá la tablet 10 minutos en Producción: tiene que volver a "¿Quién sos?" con el encargado ya
   elegido y pedir solo el PIN. En Sala de masa no tiene que salir nunca.
9. Girá la tablet (vertical): la barra va arriba, compacta, y la receta entra debajo.
10. Acceso maestro → Asignar PIN: tiene que pedir el PIN nuevo DOS veces.

## Qué automatizaría ahora

**Un chequeo de "algo se sale de su tarjeta" en todas las pantallas de la maqueta, no solo en la
receta.** Hoy `5-maqueta.spec.js` mide el scroll del documento, y el bug más visible de esta tanda (el
"Otro" afuera de la tarjeta) no movía el documento: lo encontró mirar la captura. Una función que
recorra cada `.tarjeta-lista` / `.pr-card` / contenedor con borde y exija que ningún hijo termine a la
derecha de su borde, corrida en cada paso de cada pantalla de la maqueta, lo atraparía en todos los
módulos a la vez, sin que nadie tenga que abrir las fotos.
