# Traspaso — Producción: el horario del turno, la hora de fin, la limpieza en tres momentos y "Volvió con lote nuevo" (01/10/2026)

**Para el chat de arquitectura (dueño de CLAUDE.md y de `.claude/`).** Lo hizo el subagente de Producción en la rama `ci-prueba/planta-horarios` (sale de `main` en `0faf0ae`). **No se tocó la base: cero SQL corrido.** Las cuatro RPCs nuevas que usa la pantalla ya estaban hechas; se verificaron con `pg_get_functiondef` y, el 01/10/2026, con `pg_proc` + `has_function_privilege` (las cinco con `authenticated` sí y `anon` no):

- `guardar_horario_turno(p_unidad_negocio_id uuid, p_turno text, p_hora_inicio time, p_hora_fin time, p_activo boolean)` → void.
- `corregir_horario_turno(p_turno_id uuid, p_hora_inicio time, p_hora_fin time)` → con `coalesce`: un null no toca esa hora.
- `registrar_limpieza_planchas(p_turno_id uuid, p_momento text ∈ arranque|medio|final, p_minutos integer default null)`.
- `relanzar_con_lote_nuevo(p_parada_id uuid, p_hora timestamptz default null)` → `{lote_viejo, turno_id, lote}`.
- `cerrar_turno(p_turno_id, p_hora_apagado, p_scrap_kg, p_observaciones, p_productos, p_hora_fin time)` (la firma de hoy, con `p_hora_fin`).
- Tablas: `horarios_turno` (unidad_negocio_id, turno, hora_inicio, hora_fin, activo, actualizado_por, actualizado_en; todas `time` NOT NULL) y `turnos_produccion.hora_fin` (time, null), verificadas contra `information_schema` el 01/10/2026.

## Qué cambió (en palabras de Facu)

1. **Gestión → Configuración → "Horarios de turno"** (séptima sección del segmentado, y en el menú de la compu bajo Catálogo). Por unidad, Mañana / Tarde / Noche, cada uno con inicio, fin y un interruptor de activo; "Guardar" por turno → `guardar_horario_turno` con los **cinco** parámetros siempre (también `p_activo`). El error de la base va tal cual, pegado al botón; nada de `confirm()`. Un turno sin horario cargado arranca vacío y no inventa horas.
2. **La planilla dice "Turno Mañana · 06:00 – 15:00"** (inicio de la planilla → si no, el del horario → si no, "abierta 06:02" con la hora en que se abrió). **"Corregir el inicio"** abre una ventana con el **teclado propio de la planta** (nunca un `input type=time`) y manda `corregir_horario_turno(p_turno_id, p_hora_inicio, p_hora_fin: null)`.
3. **Cerrar planilla: "¿A qué hora terminó el turno?" es obligatoria** (`#pr-cierre-fin`). Viene puesta la de la planilla (`hora_fin`) o la del horario; dos atajos: **inicio + 8 h** y **inicio + 9 h** ("14:00 · 8 h", "15:00 · 9 h"); se puede escribir otra. Se manda **SIEMPRE `p_hora_fin`**, con todos los parámetros explícitos. Con una parada abierta, "Lo que falta" dice antes de confirmar: *"La parada «Corte de cadena» se va a contar hasta las 15:00: de 13:20 a 15:00 (1 h 40 min)."* (si la hora de fin no es posterior a la parada, dice que se cuenta hasta el momento de cerrar).
   - **Convive con "Se apagó el fuego a las…" (`p_hora_apagado`), y son dos datos distintos**: el apagado es la máquina; el fin es el TURNO (la gente), y es el que termina una parada que no volvió. Por eso los dos quedan.
4. **Limpieza de planchas en tres momentos: "Al arrancar", "En el medio", "Al terminar".** En el medio y al terminar se ofrece **"Empezó ahora"** (`p_minutos: null`: la base abre la parada y se termina con "Volvió con el mismo lote" o el cierre) o **"Ya terminó, duró…"** con los mismos chips de duración. **Se sacó el error que obligaba a poner duración en "Al terminar".** Nunca se calcula una hora de vuelta futura. Con otra parada abierta, "Empezó ahora" está apagado y lo dice.
5. **La parada en curso tiene dos salidas: "Volvió con el mismo lote"** (`terminar_parada`, el botón de siempre, `#pr-btn-reanudar`, renombrado) **y "Volvió con lote nuevo"** (`#pr-btn-relanzar`, solo con el turno abierto): la misma ventana de la hora, con "Ahora" (viaja `p_hora: null`) o la hora que volvió (no puede ser futura ni antes de la parada; si cruzó la medianoche, se toma la de ayer solo si la parada empezó antes). Después: *"Lote 6210 queda para completar · Ahora la Máquina 1 sigue con el lote 6212"* arriba de la planilla NUEVA, que se abre sola.
6. **Una planilla `pendiente_completar` SIN `forzado_por` (la dejó "Volvió con lote nuevo") dice "Falta completar (productos y scrap)"**: en el tablero ("1 planilla falta completar (productos y scrap)"), en el aviso de la planilla y en el historial de la gestión (estado y detalle). Se completa con el mismo `cerrar_turno`, con la hora de fin ya puesta (la de la planilla). La forzada sigue diciendo "Pendiente de completar". En la gestión, el historial distingue las dos **solo si la consulta trajo `forzado_por`** (si no, no adivina).
7. **Las paradas que no volvieron**: en la lista, con su duración real y "no volvió en todo el turno"; con el turno abierto, la que está en curso dice "en curso · se cuenta hasta las 15:00 si no vuelve" (sin hora de fin, no dice nada: no se inventa).

## Decisiones no obvias

- **"Turno 06:00 – 15:00" muestra también el nombre del turno** ("Turno Mañana · 06:00 – 15:00"): con tres turnos, el nombre ahorra preguntar.
- **La hora de fin es OBLIGATORIA en el cierre** (la pantalla no deja confirmar sin ella; el botón no se deshabilita, se dice al tocar — la regla de siempre). Mandar null dejaría a `cerrar_turno` decidir sola dónde termina una parada abierta.
- **"Ahora" en "Volvió con lote nuevo" viaja null**, así la hora la pone el servidor y no el reloj de la tablet (mismo criterio que "Paró ahora").
- **Una hora escrita que todavía no pasó se rechaza** ("Las 15:30 todavía no pasaron…") en vez de correrla al día anterior en silencio; solo se toma como de ayer si la parada empezó antes (cruzó la medianoche).
- **Los horarios son la SÉPTIMA sección de Configuración, al final**, para no mover las seis del diseño (la comparación `e2e/10-comparar-config.spec.js` sigue verde).
- **La franja de la parada en curso, a 1000 × 540**: con los dos "Volvió" no entraba; el motivo se corta con "…" (nunca menos de 6em) y los botones bajan a dos renglones. Debajo de 700 px (celular) la franja ocupa su renglón y "Ver" baja al siguiente. **La limpieza** pasó a "nombre arriba, tres botones parejos abajo": al costado no entraban a 1000 px.
- **Bug de CSS encontrado y arreglado en el camino**: `.pr-cierre-num--fin { font-size: 30px }` estaba ANTES de `.pr-cierre-num` (38 px) con la misma especificidad, así que no aplicaba y el campo mostraba "14:0" cortado (el aprendizaje de la variante antes de su base). Ahora el selector lleva las dos clases y el ancho es fijo (8.5rem). La prueba 19 mide que la hora entre en su campo (el medidor general no ve lo que se corta ADENTRO de un input).

## Qué se verificó

- Suites (TZ=UTC): `test-produccion-horarios.js` (nueva) y las de producción que cambiaron (`-cierre`, `-paradas`, `-paradas-motivos`, `-empaque`, `-xss`); `controles-produccion.js` y `controles-produccion-gestion.js` en verde (los controles nuevos se permiten; `#pr-btn-reanudar` conserva su id). Números al final.
- Mutaciones: `mut-produccion-horarios.js` (nuevo) y todas las `mut-produccion-*` de a una (números al final).
- Navegador (maqueta, sin credenciales): `e2e/19-planta-horarios.spec.js` (nuevo; 390 × 844, 1000 × 540, 600 × 940 y 1280 × 800), `8-planta-tamanos` (con los pasos nuevos: corregir el inicio, la limpieza "al terminar", los atajos de 8/9 h), `16-planta-sin-zoom`, `17-planta-pestanas`, `12-planta-atras`, `9-comparar-planta`, `6-planta-reanudar`, `5-maqueta`, `10-comparar-config`, `7-barra-unidad`: todo en verde. Un `0-humo` de `gastos.html` falló una vez ("Cannot read properties of null (reading 'user')") y pasó al repetirlo: es de Gastos, no se tocó, queda anotado como intermitente.
- Maqueta: `pruebas/datos-maqueta/produccion.js` suma `horarios_turno` (Mañana 06:00–15:00, Tarde 15:00–23:36) y `hora_inicio`/`hora_fin` en sus turnos; nuevo `produccion-horarios.js` (una planilla `pendiente_completar` sin `forzado_por`, la parada abierta de la Máquina 2 y la respuesta de `relanzar_con_lote_nuevo`). `npm run maqueta:datos` regenerado; `test-maqueta-datos.js` en verde.

## Lo que NO se probó

- **Nada con sesión ni contra la base real**: ninguna de las cuatro RPCs se ejecutó desde la pantalla (Supabase en solo lectura; todo contra el doble y la maqueta).
- **La tablet real**: ni el teclado de la hora con los dedos, ni "Volvió con lote nuevo" de punta a punta (que la planilla nueva tenga los mismos operarios es de la base).
- **Un turno que cruza la medianoche (Noche)** solo está probado en las suites (`instanteFinTurno` toma el día siguiente si la hora de fin no es posterior al inicio, la regla de `_ts_turno`).
- La pantalla de horarios de la gestión no se miró a 390 px con datos reales (sí en la maqueta de la gestión, sin horarios cargados).

## Guion para Facu (en la tablet de Nuss, con un turno de prueba)

1. Gestión → Configuración → **Horarios de turno**: mirá que Mañana diga 06:00 – 15:00. Cambiá el fin a 15:30, Guardar, y volvé a ponerlo en 15:00.
2. En la tablet abrí un turno de la Mañana en una máquina. En la planilla tiene que decir **"Turno Mañana · 06:00 – 15:00"**. Tocá **"Corregir el inicio"**, poné 0630 y guardá: tiene que decir 06:30.
3. **Paradas → Limpieza de planchas → "Al terminar" → "Empezó ahora"** → Guardar. Arriba aparece PARADA con **"Volvió con el mismo lote"** y **"Volvió con lote nuevo"**. Tocá "Volvió con el mismo lote".
4. Anotá otra parada que siga abierta. Tocá **"Volvió con lote nuevo" → "Ahora"**. Tiene que aparecer "Lote X queda para completar · Ahora la Máquina N sigue con el lote Y" y abrirse la planilla nueva con los mismos operarios.
5. En el Inicio tiene que decir **"1 planilla falta completar (productos y scrap)"**. Abrila, cargá lo producido y **Cerrar planilla**: la hora de fin ya viene puesta.
6. En la planilla nueva, dejá una parada abierta y andá a **Cerrar planilla**: tocá **"14:00 · 8 h"** y fijate que "Lo que falta" diga hasta qué hora se cuenta la parada. Cerrala.
7. En la gestión → Historial, la planilla del paso 4 dice "Falta completar (productos y scrap)" hasta que la completes.

## Qué tocar en CLAUDE.md

En **Módulos → 10. Producción**, arriba de "LA PLANTA V2", agregar una entrada nueva (texto propuesto):

> - **EL HORARIO DEL TURNO, LA HORA DE FIN Y "VOLVIÓ CON LOTE NUEVO" (01/10/2026; traspaso `.claude/traspasos/2026-10-01-planta-horarios.md`).** Base (ya estaba; verificada el 01/10/2026): `horarios_turno` (unidad, turno, hora_inicio, hora_fin, activo) con `guardar_horario_turno(p_unidad_negocio_id, p_turno, p_hora_inicio, p_hora_fin, p_activo)`; `turnos_produccion.hora_fin`; `corregir_horario_turno(p_turno_id, p_hora_inicio, p_hora_fin)` (coalesce); `registrar_limpieza_planchas(p_turno_id, p_momento arranque|medio|final, p_minutos)`; `relanzar_con_lote_nuevo(p_parada_id, p_hora)` → `{lote_viejo, turno_id, lote}`; y `cerrar_turno` con `p_hora_fin`. **Gestión → Configuración → "Horarios de turno"** (séptima sección): Mañana/Tarde/Noche con inicio, fin y activo, un Guardar por turno, error tal cual. **Planta:** la planilla dice "Turno Mañana · 06:00 – 15:00" (planilla → horario → "abierta HH:MM") y "Corregir el inicio" (teclado propio, `p_hora_fin` null). **El cierre pide "¿A qué hora terminó el turno?" (obligatoria; viene la de la planilla o la del horario; atajos inicio + 8 h y + 9 h) y manda SIEMPRE `p_hora_fin`**; con una parada abierta dice hasta qué hora se cuenta. Convive con "Se apagó el fuego a las…": el apagado es la máquina, el fin es el turno. **Limpieza: Al arrancar / En el medio / Al terminar**; en el medio y al terminar, "Empezó ahora" (`p_minutos` null) o "Ya terminó, duró…"; ya no se exige duración al terminar. **La parada en curso: "Volvió con el mismo lote" (`terminar_parada`) y "Volvió con lote nuevo"** (solo turno abierto; "Ahora" viaja null; una hora futura se rechaza; después, "Lote X queda para completar · Ahora la Máquina N sigue con el lote Y" y se abre la planilla nueva). **Un `pendiente_completar` sin `forzado_por` dice "Falta completar (productos y scrap)"** en el tablero, la planilla y el historial de la gestión, y se completa con el mismo `cerrar_turno`. Las paradas en curso dicen "se cuenta hasta las HH:MM si no vuelve" (sin hora de fin, nada). Suites `test-/mut-produccion-horarios.js`; `e2e/19-planta-horarios.spec.js` (390, 1000×540, 600×940, 1280×800, maqueta `produccion-horarios`). **Nada con sesión real.**

Y en la línea de "Paradas" de LA PLANTA V2: donde dice *"Paró ahora" / "Volvió a andar"*, cambiar por *"Paró ahora" / "Volvió con el mismo lote" / "Volvió con lote nuevo"*.

## Para la definición del subagente (`.claude/agents/produccion.md`, territorio del chat de arquitectura)

La lista de RPCs del territorio no tiene las cuatro nuevas: **`guardar_horario_turno`, `corregir_horario_turno`, `registrar_limpieza_planchas` y `relanzar_con_lote_nuevo`**, ni la tabla **`horarios_turno`** (la escribe `guardar_horario_turno`; solo lectura para la pantalla). Sumarlas.

## Qué automatizaría ahora

**Medir que un campo no corte su propio texto.** `e2e/medir-pantalla.js` mira lo que se sale de su recuadro, pero no lo que se corta ADENTRO de un `<input>` (pasó con "14:0"). Sumarle a `medirPantalla()` una pasada por los `input`/`textarea` visibles con `scrollWidth > clientWidth + 1` lo haría valer para todas las pantallas de la planta y de la maqueta sin tocar ninguna prueba. Y, segundo, un chequeo estático en `check-scripts.js` de **"variante CSS antes de su base"** (`.x--m` definida antes que `.x` en el mismo `<style>`): ya mordió cuatro veces en el proyecto.
