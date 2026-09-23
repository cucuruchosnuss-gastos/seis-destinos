# Traspaso al chat de arquitectura — Producción, rediseño PARTE 1 de 7 (22/09/2026)

Sos el chat de arquitectura de Seis Destinos. Actualizá `CLAUDE.md` con lo que
sigue. Quien lo recibe no vio nada de este trabajo, así que está todo explicado.

**Contexto:** el módulo Producción (`modulos/produccion.html`, la tablet de la
fábrica) se está rehaciendo con un diseño nuevo, en 7 partes. Esta es la
**parte 1: la barra de modos y "¿Quién sos?" con PIN**. Las partes 2 a 7 van a
llegar con sus propios traspasos; si te llegan juntos, fusionalos en una sola
edición de la sección del módulo.

**Qué NO cambió:** ninguna RPC, ninguna tabla, ninguna policy. Todo lo de esta
parte es frontend contra RPCs que ya existían. Cero SQL corrido.

---

## 1. Sección "Módulos → 10. Producción": reemplazar la descripción de los modos

Donde hoy dice **"LOS MODOS DE LA TABLET"** (el párrafo que arranca "la tablet
usa una cuenta propia. Al abrir se elige el MODO del equipo…"), poner:

> - **LA BARRA DE MODOS Y EL PIN** (22/09/2026, rediseño parte 1). Arriba de
>   todo, fija, una barra de 64 px con **los dos modos repartiéndose el ancho**
>   —PRODUCCIÓN y SALA DE MASA— y, a la derecha, el rol y el nombre de quien
>   está adentro, la unidad y **Salir**. Sin nadie adentro dice "Nadie adentro"
>   y no hay Salir. **No hay "Volver": la tablet está en modo kiosco**, y
>   tampoco existe más la pantalla "¿Para qué se usa esta tablet?" ni el menú
>   "Cambiar el modo de esta tablet" — el cambio de modo son esos dos botones.
>   Una tablet sin modo guardado **arranca en PRODUCCIÓN**, que además es el
>   único modo usable mientras no haya ninguna máquina abierta.
>   - **El fondo de TODA la pantalla toma el color del modo** (`body.pr-modo-*`),
>     para reconocerlo desde la puerta sin leer la barra. Los dos modos se
>     separan por **luminosidad y no por tono** —Producción oscuro con letra
>     blanca, Sala de masa claro con letra oscura—, así se distinguen en escala
>     de grises, con el reflejo del galpón y para quien no distingue colores.
>   - **SALA DE MASA está DESHABILITADA mientras no haya ninguna máquina
>     abierta** en la unidad, con **borde punteado** (no solo otro color) y la
>     leyenda "· El encargado tiene que abrir el turno" adentro del mismo
>     botón. Se habilita sola al abrir la primera y se apaga al cerrar la
>     última. **TERCER ESTADO, y es el que importa: si todavía no se pudo
>     medir, el botón queda HABILITADO** — negarlo sin haberlo medido sería
>     mostrar un dato ausente como si fuera un dato, que es la familia de bugs
>     ya documentada en Aprendizajes. Lo decide `salaDeshabilitada()`, que exige
>     `estado.abiertasConocido === true`.
>   - **Entrar a un modo, o tocar el modo apagado, pide "¿Quién sos?"**: los
>     nombres a la izquierda con buscador (sin mínimo de caracteres, sin
>     acentos) y **el teclado del PIN siempre a la derecha**, para elegir y
>     tipear sin cambiar de pantalla. Aparece quien tenga ESE puesto **fijo o
>     temporal**, con la etiqueta **"hoy"** en los temporales; si la unidad no
>     restringe el puesto, todo el personal activo con un aviso. Es la misma
>     regla de la base en sus dos mitades: `unidad_restringe_puesto()` mira los
>     puestos **FIJOS** de la unidad y `tiene_puesto_produccion()` acepta fijo
>     **o** temporal vigente.
>   - **El teclado es PROPIO, 3×4 de 84 px, y nunca el del sistema**: ningún
>     campo del PIN es un `<input>`. Los puntos son **formas**, no el número.
>   - **EL PIN NO SE GUARDA EN NINGÚN LADO** — ni el común, ni el maestro, ni
>     el `pin_temporal`— fuera de la memoria: ni `localStorage`, ni
>     `sessionStorage`, ni el DOM. **La persona verificada sí** queda en
>     `sessionStorage` (`produccion.persona`), atada a SU puesto: cambiar de
>     modo cambia el puesto y obliga a verificar de nuevo.
>   - **Los mensajes salen del `motivo` que DEVUELVE la RPC**, no del texto de
>     un error: `sin_pin`, `sin_puesto`, `pin_vencido`, `pin_repetido`,
>     `bloqueado` (con "Probá de nuevo a las 10:42" en hora argentina más la
>     cuenta regresiva de 72 px en bordó, el teclado apagado y "Elegir otra
>     persona") y `pin_incorrecto` ("te quedan N intentos"). **Ninguno dice si
>     falló el nombre o el PIN.**
>   - **El bloqueo del PIN común es a los 5 errores** (así está la base), no a
>     los 3 que decía el handoff de diseño. **Y en el QUINTO la base devuelve
>     todavía `pin_incorrecto` con `intentos_restantes` en 0**, sin
>     `bloqueado_hasta` —ese llega recién en el intento siguiente—, así que ahí
>     la pantalla dice "quedó bloqueado unos minutos" **sin inventar la hora**.
>   - **Si la base devuelve `debe_cambiar`, NO se entra**: hay que elegir un PIN
>     propio, dos veces, con la barra de progreso de dos tramos, y recién
>     entonces `cambiar_pin_produccion`. **No hay ningún otro camino al modo**:
>     el único `entrar(...)` del flujo cuelga de `if (res.debe_cambiar)`.
>   - **"Acceso maestro"**, discreto abajo a la izquierda (texto subrayado de
>     18 px en un objetivo de 56 px): PIN de **8 números**, panel gris y tecla
>     de acción **en el gris de Producción y NO naranja** —es un acceso de
>     excepción y no tiene que competir con la acción de la pantalla—. Mientras
>     está activo, **un cartel fijo arriba lo dice**, esa persona entra a
>     cualquier modo sin volver a poner el PIN y **todo lo que haga queda a SU
>     nombre**. Se cierra solo a los 15 minutos sin uso.
>     - **NO se guarda en `sessionStorage`, a diferencia de la persona del
>       modo, y es una decisión:** su PIN tiene que quedar **en memoria** para
>       poder llamar a `otorgar_puesto_temporal`, así que la sesión del maestro
>       dura exactamente lo que dura la memoria. Recargar la tablet la cierra,
>       que es lo correcto para un acceso de excepción. El PIN vive en un `let`
>       del módulo (`pinMaestro`) y no en `estado`, para que se vea que es
>       volátil y no se serialice con el resto.
>   - **Con el maestro activo, "Dar acceso por hoy"**: persona, puesto y hasta
>     cuándo (por defecto hoy, y ahí se manda `p_hasta` en **null** para que la
>     medianoche argentina la ponga la base; otro día se manda el comienzo del
>     día siguiente con `-03:00`, que en Argentina es fijo). Se llama a
>     `otorgar_puesto_temporal` con `p_maestro_id` y `p_maestro_pin`. Si
>     devuelve `pin_temporal` se muestra **UNA vez**, grande, con "Anotalo y
>     pasáselo a &lt;nombre&gt;. No se va a volver a mostrar", y **se borra de
>     la memoria y de la pantalla al cerrar**. **`pin_temporal` puede venir
>     null** —esa persona ya tenía PIN—: ahí no se muestra ningún número y se
>     dice que entra con el suyo de siempre.
>   - **PRODUCCIÓN se cierra sola a los 15 minutos sin tocar la pantalla;
>     SALA DE MASA NO**, porque el masero la usa todo el turno y volver a poner
>     el PIN en cada masa sería insoportable. El acceso maestro también se
>     cierra a los 15 minutos, esté en el modo que esté.

## 2. En la misma sección, donde dice "Acceso"

Agregar, al final del párrafo que empieza "**Acceso:** con cualquiera de las
tres tareas…":

> La cabecera vieja con su menú (Cambiar de unidad, Historial, Stock terminado,
> Configuración, Volver al inicio) **queda solo para la oficina** —quien no
> tiene `produccion:cargar`— y para las pantallas que se usan en la compu
> (`VISTAS_OFICINA`). En la tablet manda la barra de modos y no hay ninguna
> otra cabecera. Para que **cambiar de fábrica** no quede inalcanzable en una
> tablet con dos unidades posibles, la pantalla "¿Quién sos?" lleva un
> "Cambiar de fábrica" discreto al lado de "Acceso maestro", visible solo si
> esta cuenta puede cargar en más de una.

## 3. Estilo visual — sumar los colores de modo

En **Estilo visual → "Colores de acento por módulo"**, debajo de la línea de
Producción, agregar:

> - **Producción — colores de MODO** (22/09/2026): trece variables **locales en
>   el `body {}` de `produccion.html`**, no en el `:root` global (precedente de
>   `--borde-tarjeta` en stock.html): son valores de una sola pantalla y el
>   `:root` se reserva para el acento del módulo, `--azul`, que ya existe.
>   `--pr-prod-activo` `#3F4655` · `--pr-prod-apagado-borde` `#9AA1AE` ·
>   `--pr-prod-apagado-letra` `#55617d` · `--pr-prod-fondo` `#E4E7EC` ·
>   `--pr-masa-activo` `#F3D774` · `--pr-masa-activo-borde` `#B8961F` ·
>   `--pr-masa-letra` `#3B2E00` · `--pr-masa-apagado-borde` `#D9C476` ·
>   `--pr-masa-apagado-letra` `#6B5A1E` · `--pr-masa-fondo` `#FBF4D9` ·
>   `--pr-masa-barra-borde` `#EADFAE` · `--pr-off-fondo` `#F1F2F4` ·
>   `--pr-off-borde` `#C3C8D1` · `--pr-borde-control` `#D5D9E0` ·
>   `--pr-panel-gris` `#F4F5F7`. **Donde el hex ya tiene nombre en
>   `css/main.css` se usa la variable global** (`--color-fondo`,
>   `--color-texto-suave`, `--naranja*`, `--bordo*`, `--color-borde`), nunca el
>   literal repetido. Contraste medido: blanco sobre `#3F4655` **9,6:1** y
>   `#3B2E00` sobre `#F3D774` **11:1**.
>   **El color de modo NUNCA marca validez**: verde y bordó siguen siendo del
>   sistema, y el naranja sigue siendo la acción de la pantalla.

## 4. Sección "Suites" del módulo

Reemplazar la línea de suites de Producción por:

> - **Suites:** `test-produccion-{acceso,quien,pin,abrir,cierre,masa,config,historial,xss}.js`
>   con sus `mut-*`, `sandbox-produccion.js`, `seguras-produccion.js`,
>   `controles-produccion.js`, `test-accesos-produccion.js` y
>   `test-dashboard-produccion.js`. Las suites corren con `TZ=UTC` para que una
>   hora sin la zona de Argentina dé rojo.
>   - **`test-produccion-pin.js` es nueva** (rediseño parte 1) y cubre los
>     cinco motivos del PIN, el cambio obligatorio que no se puede saltear, el
>     acceso maestro, "Dar acceso por hoy" y —lo que más importa— que **ni el
>     PIN común, ni el maestro, ni el `pin_temporal` queden en `localStorage`,
>     `sessionStorage` o el DOM**, barriendo todos los elementos del DOM falso.
>   - **`controles-produccion.js` ganó una lista `RETIRADOS`**: un control que
>     desaparece a propósito se declara ahí con su motivo y queda fuera de la
>     comparación contra los baselines. **Ningún control puede desaparecer sin
>     figurar ahí con una razón**, y un RETIRADO que ya no hace falta —porque
>     el control volvió— pone la prueba en rojo, para que la lista no se llene
>     de declaraciones muertas que tapen la próxima.

## 5. En "Aprendizajes clave" — dos entradas nuevas

Al final de la familia **"EL TEST VERDE QUE MIDE OTRA COSA"**:

> - **DOS RUNNERS DE MUTACIONES A LA VEZ SE PISAN EL ARCHIVO TEMPORAL, y el
>   resultado se lee como cobertura faltante.** Caso real (22/09/2026,
>   rediseño de Producción): se lanzaron dos corridas del mismo
>   `mut-produccion-quien.js` sin querer, en paralelo. Los dos usan el mismo
>   `mut-tmp-<suite>.html`, así que cada uno mutaba sobre lo que el otro
>   acababa de escribir. Salieron **nueve "ESCAPÓ"** y de esos **cinco eran
>   falsos**: verificados a mano, sus mutaciones sí se detectan.
>   - **El guard de "el sub-proceso leyó X y se escribieron Y" atajó solo una
>     parte** —los tres o cuatro casos donde los largos no coincidieron—, así
>     que **no alcanza** cuando dos mutaciones distintas dan archivos del mismo
>     tamaño.
>   - **REGLA: un runner de mutaciones por vez.** Y ante un "ESCAPÓ", antes de
>     agregar assertions, **reproducirlo a mano**: copiar el archivo, aplicar
>     esa única mutación y correr la suite. Es la misma lección ya escrita
>     ("una mutación que escapa se investiga antes de asumir que falta
>     cobertura"), con una causa nueva: el ruido no venía del ancla sino del
>     paralelismo.
> - **UNA ASSERTION SOBRE UN VALOR QUE LA PROPIA PRUEBA YA DEJÓ PUESTO NO
>   PRUEBA NADA.** Mismo trabajo: `marcarAbiertas()` marca el dato como
>   conocido, y la assertion que lo verificaba corría sobre un sandbox donde
>   la prueba **ya había puesto `abiertasConocido = true` a mano** unas líneas
>   antes para armar otro caso. Sacarle esa línea a la función no cambiaba
>   nada y la mutación escapaba. Se arregló midiendo en un sandbox NUEVO. Es
>   la hermana de "probar el helper no es probar su uso": acá el estado de
>   partida lo había fabricado el propio test.

## 6. Qué se verificó, y contra qué

- **Las RPCs, leídas con `pg_get_functiondef` el 22/09/2026** (solo lectura,
  cero escrituras): `verificar_pin_produccion`, `verificar_pin_maestro`,
  `cambiar_pin_produccion`, `otorgar_puesto_temporal`, `personal_produccion`,
  `unidad_restringe_puesto`, `tiene_puesto_produccion`, `_puede_ser_maestro` y
  `_pin_valido`. Las firmas se confirmaron contra `pg_proc`.
- **Una corrección que salió de esa lectura:** `personasParaPuesto()` miraba
  solo `puestos` (los fijos), así que **escondía a quien tuviera el puesto
  únicamente como temporal vigente** — y la base sí lo deja entrar
  (`tiene_puesto_produccion` acepta fijo **o** temporal). Ahora mira los dos
  arrays, y lo que decide si la unidad restringe sigue siendo solo el puesto
  FIJO, igual que `unidad_restringe_puesto()`.
- **Nada se probó con sesión en un navegador real.** Ni la tablet, ni el
  teclado del PIN en una pantalla táctil, ni el cierre por inactividad, ni las
  medidas a 1280×800. Las suites ejecutan los renders con un `document` falso.

---

# Registro de partes — hashes y números

Se va completando a medida que cada parte cierra. Todas las suites y
`check-scripts` en verde antes de cada commit.

## Parte 1 — barra de modos, colores y acceso · `f502c3d`

Barra fija de 64 px con los dos modos repartiéndose el ancho, fondo de pantalla
por modo, SALA DE MASA deshabilitada (punteada) sin máquinas abiertas, "¿Quién
sos?" + PIN con teclado propio, los cinco motivos de PIN, cambio obligatorio,
acceso maestro de 8 números y "Dar acceso por hoy".

`check-scripts` OK · acceso 23/23 · quien 129/129 · pin 144/144 (nueva) ·
abrir 59/59 · cierre 104/104 · config 104/104 · historial 68/68 · masa 143/143 ·
xss 6/6 · accesos 19/19 · dashboard 9/9 · **controles 586/586**.
Mutaciones: acceso 13/13 · quien 57/57 (+2 eq.) · pin 71/71 (+2 eq.) ·
abrir 33/33 · cierre 66/66 (+14) · config 99/99 (+1) · historial 50/50 (+12) ·
masa 92/92 (+12).

Decisiones tomadas sin preguntar: en el quinto error la base todavía devuelve
`pin_incorrecto` con `intentos_restantes: 0` y el `bloqueado_hasta` llega recién
en el intento siguiente, así que ese caso dice "quedó bloqueado unos minutos"
sin inventar una hora; `personasParaPuesto()` estaba mal y ahora mira también
los puestos temporales vigentes, igual que `tiene_puesto_produccion()`; el PIN
maestro vive en un `let` del módulo y recargar lo cierra; una tablet sin modo
guardado arranca en PRODUCCIÓN y se eliminó la pantalla "¿Para qué se usa esta
tablet?"; se agregó "Cambiar de fábrica" (solo con dos o más unidades), que si
no quedaba inalcanzable al esconder la cabecera.


---

# Traspaso de la PARTE 2 (el subagente lo dejó aparte; queda acá, fusionado)

# Traspaso al chat de arquitectura — Producción, rediseño PARTE 2 de 7 (22/09/2026)

Sos el chat de arquitectura de Seis Destinos. Actualizá `CLAUDE.md` con lo que
sigue. Quien lo recibe no vio nada de este trabajo, así que está todo explicado.

**Contexto:** el módulo Producción (`modulos/produccion.html`, la tablet de la
fábrica) se está rehaciendo con un diseño nuevo, en 7 partes. La **parte 1** (la
barra de modos y "¿Quién sos?" con PIN) está en el traspaso
`2026-09-23-produccion-2.md` y se commiteó en `f502c3d`. Esta es la **parte 2:
las máquinas y abrir turno**. Si te llegan varios traspasos del rediseño juntos,
fusionalos en una sola edición de la sección del módulo.

**Qué NO cambió:** ninguna RPC, ninguna tabla, ninguna policy, ninguna tarea.
Todo es frontend contra RPCs que ya existían. **Cero SQL corrido** — el conector
de este chat es de solo lectura y solo se usó para verificar contratos.

**Lo que se verificó contra la base el 22/09/2026** (con `pg_get_functiondef`,
`information_schema.columns` y `pg_policies`, leyendo el CUERPO de cada función):

- **`abrir_turnos(p_fecha, p_turno, p_encargado_id, p_maquinas jsonb)`** junta,
  por máquina, `x->'operarios'` (array de texto) **con** `x->>'operario_id'`
  (suelto), los deduplica con `distinct` y descarta los vacíos. O sea que
  **`operarios: [uuid, …]` es la forma buena y admite varios**. Una lista vacía
  queda en `'{}'` y viaja como `null` a `abrir_turno`, que en ese caso no
  inserta ningún operario.
- **`abrir_turnos` valida el puesto de ENCARGADO** (cuando la unidad lo
  restringe) y **NO valida el puesto de los operarios**. El único que lo valida
  es `agregar_operario_turno`.
- **`agregar_operario_turno`** rechaza el turno `cerrado`, valida el puesto de
  operario si la unidad lo restringe, y hace
  `on conflict (turno_id, empleado_id) do update set hasta = null`: **el
  reingreso reactiva la fila**.
- **`quitar_operario_turno`** hace `update … set hasta = now()`: **NO borra la
  fila**.
- **`cerrar_turno` NO rechaza un turno de otro día** (solo rechaza el ya
  `cerrado`), y el movimiento de stock terminado que inserta lleva **`v_t.fecha`,
  la fecha del TURNO y no la de hoy**. O sea que el botón "Cerrar planilla de
  ayer" lleva a la planilla de siempre y el cierre queda imputado al día en que
  se produjo. (Esto es para la parte 3, que rehace la planilla y el cierre; se
  verificó acá porque la parte 2 construye la puerta de entrada.)
- `turno_operarios` tiene `desde` (NOT NULL) y `hasta` (nullable);
  `produccion_items` tiene `anulado` (boolean NOT NULL); `turnos_produccion.fecha`
  es `date` NOT NULL. Las policies de `produccion_items` y `turno_operarios` son
  SELECT con `puede_ver_produccion()`, así que la cuenta de la tablet
  (`produccion:cargar`) las lee.

---

## 1. Sección "Módulos → 10. Producción": reemplazar la descripción del modo Producción

Donde hoy dice **"Modo Producción:"** (el párrafo que arranca "tablero con cada
máquina activa…" y termina en el borrador del cierre), reemplazar la parte de
**las máquinas y abrir turno** por esto (la planilla y el cierre los rehace la
parte 3, así que ese pedazo queda como está por ahora):

> - **LAS MÁQUINAS** (rediseño parte 2). Una tarjeta por máquina activa, en
>   grilla, con el turno y la fecha al lado del título ("Turno Mañana · martes
>   22/09") y **"+ Abrir otra máquina"** arriba a la derecha. **El LOTE es el
>   número más grande de cada tarjeta** porque es lo que se copia a la planilla
>   de papel. Tres formas:
>   - **Libre**: gris, con el borde **punteado** —que dice "acá no hay nada" sin
>     depender del color— y "Libre" en grande. No es un botón: no lleva a
>     ninguna planilla.
>   - **Abierta**: franja izquierda de 8 px en el gris del modo, chip "Abierta",
>     el lote, la hora de apertura y **"N masas · M sublotes"**. Toda la tarjeta
>     es el botón que abre su planilla.
>   - **Parada**: la misma tarjeta con la franja y el chip en **bordó** y
>     "Parada desde 10:32 · pulpo".
>   - **ABIERTA DE AYER**: un turno abierto con `fecha` anterior a hoy. Va
>     **a todo el ancho y ANTES que todas**, con borde bordó de 3 px, el sello
>     "ABIERTA DE AYER", el lote, cuándo se abrió y cuánto lleva, y el botón
>     **"Cerrar planilla de ayer"**. No se puede pasar por alto porque esa
>     máquina **no se puede volver a abrir hasta cerrarla**: `abrir_turno`
>     rechaza una máquina con turno abierto, nombrándola.
>   - **El orden lo decide `ordenTablero()`: de ayer → paradas → abiertas →
>     libres**, y es ESTABLE (dentro de cada grupo se conserva el `orden` de la
>     tabla `maquinas`).
>   - **Sin fecha legible NO se afirma "de ayer"** (`esDeAyer()` exige que la
>     fecha matchee `^\d{4}-\d{2}-\d{2}$`): la tarjeta queda como una abierta
>     normal. Decir "de ayer" sin poder saberlo es la familia de bugs del dato
>     ausente mostrado como dato. Hoy `turnos_produccion.fecha` es NOT NULL, así
>     que es código defensivo.
>   - **El encabezado no inventa el turno**: sale de las máquinas abiertas HOY;
>     si no hay ninguna queda solo la fecha.
>   - **Un turno `pendiente_completar` NO cuenta como abierto**: `leerTablero()`
>     filtra `estado = 'abierto'`, así que esa máquina se ve LIBRE — que es lo
>     que es, porque alguien forzó su cierre.
>   - Los sublotes se cuentan con una consulta más a `produccion_items` con
>     `anulado = false`.
> - **ABRIR TURNO** (rediseño parte 2). Grilla de dos columnas: a la izquierda
>   la fecha y el turno, a la derecha una fila por máquina.
>   - **La fecha va con ‹ › de 56×64 y el valor al medio** ("22/09/2026" y "hoy,
>     martes" / "ayer, lunes" / el día solo). **YA NO HAY `input[type=date]`**:
>     en la tablet, de pie y con harina en las manos, el calendario nativo no se
>     puede usar, y la fecha nunca se elige libre — va de hoy hacia atrás, de a
>     un día. **› queda deshabilitado en hoy**, porque `abrir_turno` rechaza una
>     fecha futura y no se ofrece lo que va a fallar. El valor vive en
>     `estado.abrir.fecha`.
>   - El turno son **tres botones de 64 px apilados**, el elegido en el gris del
>     modo Producción, sugerido por la hora.
>   - **VARIOS OPERARIOS POR MÁQUINA**, como chips de 56 px con × de 52×56. Se
>     agregan **de a uno con un buscador que se abre DENTRO de la fila que lo
>     pidió** —no en un modal, así no se pierde de vista a qué máquina se le
>     está poniendo el operario—, con la coincidencia **en negrita**. El que ya
>     está en otra máquina aparece **apagado y diciendo en cuál** ("· en Máquina
>     1"): apagado y no escondido, porque si no, buscar a alguien que ya está
>     puesto no devuelve nada y parece que el buscador no anda. El buscador
>     queda abierto después de agregar (casi siempre se cargan dos o tres
>     seguidos) y se cierra con "Cancelar".
>   - **Una máquina marcada SIN operarios se puede abrir**, y es una decisión:
>     `abrir_turnos` no los exige ni valida su puesto. Que falte alguno se ve en
>     el resumen **"N máquinas · M operarios"**, y se suman durante el turno.
>     (Antes era un `<select>` de UN operario con una opción "Sin operario", que
>     no podía representar lo que la RPC acepta.)
>   - **La abierta de ayer aparece al final, con la casilla punteada bordó
>     `disabled`** y "Abierta de ayer (lote 7019). Cerrala primero.". Aunque se
>     fuerce su estado, **no viaja en el payload ni cuenta como "al menos una
>     máquina"**.
>   - **UNA sola llamada a `abrir_turnos`**, con
>     `p_maquinas: [{maquina_id, operarios: [uuid, …]}]`.
>   - **El error de la base se muestra TAL CUAL** ("Esa persona no figura como
>     encargado de esta unidad.", "La Máquina 1 ya tiene un turno abierto…").
>   - **Los lotes asignados**: confirmación en verde y una tarjeta por máquina
>     con el **lote a 124 px** —para copiarlo a la planilla de papel sin
>     acercarse— y sus operarios abajo. Los operarios salen del formulario, no
>     de la RPC, que devuelve solo `{maquina_id, maquina, turno_id, lote}`.
>   - **SALA DE MASA se habilita EN ESA PANTALLA**, no al volver al tablero: las
>     máquinas se acaban de abrir, así que ya se sabe que hay alguna
>     (`marcarAbiertas(true)`). Esperar a la próxima lectura la dejaría apagada
>     un toque de más, justo cuando el masero está esperando para arrancar.
> - **LOS OPERARIOS SE SUMAN Y SE SACAN CON EL TURNO ABIERTO** (rediseño parte
>   2), desde la planilla, con `agregar_operario_turno` / `quitar_operario_turno`
>   y el MISMO buscador de Abrir turno.
>   - **EL QUE SE FUE SIGUE EN LA LISTA con su hora de salida, y no es un
>     detalle:** `quitar_operario_turno` **no borra la fila**, le pone `hasta`.
>     Esconderlo borraría de la pantalla quién estuvo en ese turno, que es
>     justo lo que la planilla tiene que poder contar después. Va como chip
>     apagado, "Marcos Vera · salió 12:40", sin ×.
>   - **Al que se fue se lo puede volver a sumar**: la RPC hace
>     `on conflict … do update set hasta = null`.
>   - `leerPlanilla()` trae ahora `empleado_id, desde, hasta` de
>     `turno_operarios`, y los operarios salieron del bloque de datos de la
>     planilla para tener el suyo.
>   - **El error de la RPC se muestra tal cual, pero el de la RELECTURA no.**
>     Después de sumar o sacar, la pantalla vuelve a leer la planilla; si esa
>     lectura falla, el cambio **YA está en la base**, así que mostrar ahí el
>     error crudo de la consulta haría creer que el operario no entró —y que hay
>     que cargarlo de nuevo—. Se dice "El cambio se guardó, pero no se pudo
>     actualizar la lista." y el crudo va a consola.

## 2. Sección "Estilo visual": nada que agregar

La tarjeta `.pr-maquina` la comparten el tablero, la elección de máquina de la
Sala de masa y el historial, así que **el rediseño del tablero va ACOTADO a
`.pr-tablero`**: las otras dos pantallas se ven exactamente como antes y se
rehacen en sus propias partes. La tira de chips de operarios se llama `.pr-ops`
—y no `.pr-abrir-fila__ops`— porque la comparten Abrir turno y la planilla.

No se tocó `css/main.css`. Todo el CSS nuevo vive en el `<style>` del módulo,
con variables locales del `body` (el precedente de `--borde-tarjeta` en
stock.html). La única variable nueva es **`--pr-bordo-borde: #C9A0AC`** —el
bordó aclarado para el borde punteado de "no se puede todavía"—, porque no hay
equivalente global. Se sumó **`.pr-btn--accion`** (64 px, `--naranja`), que es
la acción principal de una pantalla de tablet, con el precedente de la tecla
Entrar del PIN de la parte 1; y **`.pr-btn--peligro.pr-btn--accion`** para que
"Cerrar planilla de ayer" quede en bordó y no en naranja.

## 3. Sección "Aprendizajes clave": una entrada nueva

> - **UN `data-*` CUYO NOMBRE SALE DE UNA VARIABLE ES INVISIBLE PARA EL
>   INVENTARIO DE CONTROLES.** Caso real (22/09/2026, rediseño de Producción):
>   el buscador de operarios se escribió como un render compartido al que cada
>   pantalla le pasaba **los atributos armados** (`campo: 'data-buscar-op="0"'`,
>   `elegir: (id) => …`). El HTML salía bien, pero el escáner de
>   `pruebas/controles-*.js` tokeniza el fuente y ve un placeholder donde va la
>   interpolación, así que **ninguno de esos controles entraba al inventario** y
>   el chequeo de referencias los reportó como "referencia sin destino".
>   - **Lo que lo arregla es que el NOMBRE del atributo sea literal y lo variable
>     sea el VALOR**: `data-buscar-op="${ctx}"`, con `ctx` = el índice de la fila
>     en una pantalla y una constante (`CTX_PLANILLA = 'planilla'`) en la otra.
>     Los mismos nombres no se pisan porque cada pantalla escucha sobre su
>     propio contenedor.
>   - **El chequeo encontró un hueco real, no un falso positivo:** con los
>     nombres armados desde variables, un control que desapareciera al mover
>     código no lo habría notado nadie — que es exactamente para lo que existe
>     ese inventario.
> - **AL RESALTAR UNA COINCIDENCIA, NORMALIZAR LA CADENA ENTERA CORRE LOS
>   ÍNDICES.** `"José".normalize('NFD').replace(/[̀-ͯ]/g,'')` da
>   `"jose"`: **cuatro caracteres donde el original tiene cuatro pero con la
>   descomposición en el medio**, y con otros acentos el largo cambia. Un
>   `indexOf` sobre la cadena normalizada devuelve un índice que **no vale para
>   cortar el original**, y la negrita termina sobre las letras equivocadas —
>   sin ningún error. Se resuelve normalizando **carácter por carácter** y
>   guardando de cuál salió cada uno (`tramoCoincidencia()`).
>   - Y de ahí sale la otra mitad: la normalización tiene que **recortar los
>     bordes en un solo lugar**. `normalizarBusqueda()` pasó a ser
>     `textoPlano(t).trim()`, y `textoPlano()` es la que se aplica por carácter
>     — si se aplicara la que recorta, **los espacios del medio desaparecerían**
>     y una búsqueda de "ramon d" no matchearía nunca contra "Ramón Díaz".

> - **DOS RUNNERS DE MUTACIONES A LA VEZ SE PISAN EL ARCHIVO TEMPORAL, Y EL
>   RESULTADO SON FALSOS "ESCAPÓ".** `mutar.js` escribe la mutación en
>   `pruebas/mut-tmp-<suite>.html` y corre la suite apuntándole; dos procesos
>   sobre la MISMA suite escriben el mismo archivo, así que uno corre la
>   mutación del otro —o el archivo limpio— y la suite pasa. **Ya pasó dos
>   veces** (la parte 1 del rediseño de Producción se comió cinco; la parte 2,
>   nueve). El guard de "el sub-proceso leyó N caracteres" NO lo ataja: el otro
>   proceso escribe un archivo del mismo largo.
>   - **Lo peligroso es el diagnóstico**: un "ESCAPÓ" se lee como cobertura
>     faltante y empuja a agregar assertions para tapar un agujero que no
>     existe. En la parte 2, de los nueve, **siete estaban cubiertos** —se
>     comprobó corriendo cada mutación sola— y dos eran gaps de verdad.
>   - **REGLA: los runners se corren DE A UNO.** Y si varios escapan de golpe,
>     sospechar primero del andamio: es la misma familia que el insumo
>     corrompido (el pelado que se comía el 77% del archivo, el `git stash` que
>     lo devolvía en CRLF). Una falla que toca MUCHAS mediciones a la vez casi
>     nunca es el código.

Y **otra confirmación de "un test que parece cubrir la regla y no toca la
línea"**, que vale la pena sumar como ejemplo porque el caso es diáfano: la
assertion *"el buscador de la planilla no ofrece al que ya está adentro"* corría
con la búsqueda puesta en `"mar"`, y el operario que estaba adentro se llama
Ramón — o sea que **el filtro de texto ya lo dejaba afuera** y la afirmación
habría pasado igual sin el filtro de "ya está adentro". Lo destapó la mutación,
no la lectura. Se mide ahora con la búsqueda VACÍA, que es el único caso donde
los dos filtros se distinguen.

Y una CONFIRMACIÓN de una entrada que ya está, en su otra forma (vale sumarla
como renglón a la entrada de la variante CSS pisada por el orden): **dos
modificadores INDEPENDIENTES sobre el mismo elemento también se pisan, y gana el
que esté más abajo**. `class="pr-btn pr-btn--peligro pr-btn--accion"` salía
NARANJA y no bordó, porque `--accion` está definida después de `--peligro` y las
dos tienen la misma especificidad. Se arregla con una regla propia para la
combinación (`.pr-btn--peligro.pr-btn--accion`, especificidad 0,2,0). No es la
variante antes que su base: son dos variantes hermanas, y el modo de falla es el
mismo — el botón se ve, funciona, y dice lo que no es.

---

## Lo que cambió en el repo

- **`modulos/produccion.html`** — el CSS del tablero, de abrir turno y de los
  lotes; el HTML de las tres pantallas y el bloque de operarios de la planilla;
  y el JS: `leerTablero` (suma `produccion_items`), `estadoMaquinas` (suma
  `sublotes`), `textoSublotes`, `diaDeLaSemana`, `diaMes`, `esDeAyer`,
  `rangoTablero`, `ordenTablero`, `encabezadoTablero`, `htmlMaquina` (reescrita),
  `mostrarTablero`, `formularioAbrirVacio`, `textoFechaAbrir`, `nombreOperario`,
  `tramoCoincidencia`, `htmlResaltado`, `candidatosOperario`,
  `htmlResultadosOperario`, `htmlBuscadorOperarios`, `htmlChipOperario`,
  `htmlFilaAbrir` (reescrita), `faltanParaAbrir`, `resumenAbrir`,
  `parametrosAbrirTurnos`, `mostrarAbrir`, `pintarAbrir`, `pintarBotonAbrir`,
  `cambiarDiaAbrir`, `abrirBuscadorOperario`, `agregarOperarioFila`,
  `quitarOperarioFila`, `pintarResultadosOperario`, `confirmarAbrir`,
  `htmlLotesAsignados`, `htmlOperariosPlanilla`, `pintarOperariosPlanilla`,
  `pintarResultadosPlanillaOp`, `recargarPlanilla`, `cambiarOperarioTurno`,
  `textoPlano`. Se fueron `textoEstadoMaquina` y `htmlOpcionesOperario`, y la
  constante `SIN_OPERARIO`.
- **`pruebas/test-produccion-abrir.js`** y **`mut-produccion-abrir.js`**,
  reescritos para el diseño nuevo. La suite **ya no depende del día en que se
  escribió**: los fixtures pasan por `conHoy()`, que reescribe la fecha de hoy a
  la de verdad —si no, el turno "de hoy" del fixture sería "de ayer" mañana y la
  suite se pondría en rojo sola—. `conHoy()` deja pasar las tablas que son una
  FUNCIÓN (el fixture que hace fallar la lectura): por `JSON.stringify` se
  perderían y la consulta devolvería `[]` en vez del error.
  **Se comprobó solo:** el día cambió (pasó la medianoche) mientras corría esta
  tanda y la suite siguió en verde. Sin `conHoy()` se habría puesto en rojo
  ahí mismo, y el rojo no habría sido de ningún cambio de código.
- **`pruebas/sandbox-produccion.js`**, **`seguras-produccion.js`** y
  **`controles-produccion.js`** (baseline nuevo `f502c3d`, más dos RETIRADOS con
  su motivo escrito).
- **`pruebas/test-produccion-cierre.js`**: una assertion que miraba al operario
  dentro de los datos de la planilla ahora lo busca en su bloque propio.
- **`pruebas/mut-produccion-quien.js`** y **`mut-produccion-cierre.js`**: la
  mutación "el buscador no ignora acentos" se REAPUNTÓ a `textoPlano()`, que es
  donde quedó la normalización. **Los dos runners abortaron diciendo "el texto a
  reemplazar NO EXISTE"**, que es exactamente para lo que está ese guard: sin
  él, esa mutación habría dejado de medir en silencio. Verificado después: el
  ancla es única y las tres suites que la tocan la detectan.

## Una observación de andamio, medida (no se tocó nada)

`pruebas/test-produccion-abrir.js` tarda **~12 s**, y **8,1 s de esos son
construir 16 sandboxes** (0,5 s cada uno, casi todo el `new Function` que
compila las ~220 funciones extraídas). Con 8 runners de mutaciones, el cierre
del módulo pasa de una hora. **`construirCon()` se puede cachear por archivo:
`new Function(codigo)` se compila UNA vez y cada llamada al resultado crea un
scope nuevo**, que es justo lo que las suites necesitan (`estado`, `__tablas` y
los `var` del preludio se reinicializan en cada invocación). No se hizo acá por
dos razones: `pruebas/sandbox.js` es de todos los módulos y no de este chat, y
cambiar el andamio con la cola de mediciones corriendo es la mejor forma de
obtener un número que después nadie puede explicar.

## Decisiones que se tomaron sin preguntar

1. **Una máquina marcada sin operarios se puede abrir** (antes había que elegir
   uno, o elegir "Sin operario" a mano). Lo habilita el contrato de la RPC y lo
   hace visible el resumen "N máquinas · M operarios".
2. **La fila marcada NO se tiñe**: lo dicen la casilla llena de 56×56 y los
   chips. Un fondo de más competiría con el bordó de la bloqueada, que sí tiene
   que saltar.
3. **El buscador queda abierto después de agregar un operario** y se cierra con
   "Cancelar". Casi siempre se cargan dos o tres seguidos.
4. **El candidato ocupado dice "en Máquina 1" y no "en Máq. 1"** como el
   prototipo: el nombre de la máquina es un dato de la base y una máquina se
   puede llamar "Cortadora 3", donde "Máq." sería falso.
5. **Se sacó `textoEstadoMaquina()`** (el renglón "Lote 7023 · abierta desde
   06:02 · 5 masas"): la tarjeta nueva muestra esos datos por separado y en su
   jerarquía.
6. **El tablero pide una consulta más** (`produccion_items`) para contar los
   sublotes. Es la única forma de tener el "N masas · M sublotes" del diseño.

## Lo que NO se pudo probar

- **Nada con sesión en un navegador real.** Las suites ejecutan los renders con
  un `document` falso; el foco del buscador, el `:checked` dibujado de la
  casilla de 56×56 y el layout a 1280×800 no se verificaron en una tablet.
- **Ninguna RPC se ejecutó**: el conector es de solo lectura. Los contratos se
  leyeron de `pg_get_functiondef` y las suites los prueban con un doble.
- El **ancho real** de la grilla de máquinas con 7 máquinas y de la fila de
  abrir con 4 operarios largos no se midió en pantalla.
- **Del celular (P6f) se hizo lo que es CSS y no lo que mueve el DOM:** las
  tarjetas se apilan y bajan a los tamaños del diseño (nombre 22 px, lote
  40 px), pero **"+ Abrir otra máquina" NO queda fijo abajo**: vive en la
  cabecera de la tarjeta y habría que moverlo de lugar en el HTML. Se dejó para
  cuando se haga la pasada de celular; la tablet es el destino principal y ahí
  el botón está siempre a la vista.

## Guion para Facu (lo nuevo de esta parte)

1. En la tablet del encargado, con dos o tres máquinas libres: **"+ Abrir otra
   máquina"**. Probar ‹ para ir a ayer (tiene que decir "ayer, <día>") y que ›
   no deje pasar de hoy.
2. Marcar una máquina, tocar **"+ Operario"** y agregar **dos o tres** personas
   seguidas; sacar una con la ×. Marcar otra máquina y buscar a alguien que ya
   pusiste: **tiene que aparecer apagado y decir en qué máquina está**.
3. Abrir el turno y mirar la pantalla de lotes: **el número tiene que leerse
   desde un metro**, con los operarios de cada máquina abajo.
4. Entrar a la planilla de una máquina y **sumar un operario** con "+ Sumar" y
   **sacar otro** con la ×: el que sacaste tiene que quedar en la lista con
   "salió HH:MM", y tenés que poder volver a sumarlo.
5. **El caso de la máquina abierta de ayer**: dejá una máquina abierta y probá
   al día siguiente (o pedí que alguien deje una abierta). Tiene que aparecer
   arriba de todo, en bordó, y en "Abrir turno" al final con la casilla que no
   se puede marcar.

---

# Traspaso de la PARTE 3

# Traspaso al chat de arquitectura — Producción, rediseño PARTE 3 de 7 (23/09/2026)

Sos el chat de arquitectura de Seis Destinos. Actualizá `CLAUDE.md` con lo que
sigue. Quien lo recibe no vio nada de este trabajo, así que está todo explicado.

**Contexto:** el módulo Producción (`modulos/produccion.html`, la tablet de la
fábrica) se está rehaciendo con un diseño nuevo, en 7 partes. La parte 1 (barra
de modos y PIN) es `f502c3d` y la parte 2 (tablero y abrir turno) es `d3f8203`;
sus traspasos están en `.claude/traspasos/2026-09-23-produccion-2.md`. Esta es
la **parte 3: la planilla de la máquina, lo producido y el cierre**. Si te
llegan varios juntos, fusionalos en una sola edición de la sección del módulo.

**Qué NO cambió:** ninguna RPC, ninguna tabla, ninguna policy, ningún permiso.
**Cero SQL corrido.** Todo es frontend contra RPCs que ya existían, y todas se
leyeron con `pg_get_functiondef` antes de usarlas (el detalle, más abajo).

---

## 1. Sección "Módulos → 10. Producción": reemplazar lo de la planilla y el cierre

Donde hoy dice **"Modo Producción: tablero con cada máquina activa…"** —el
párrafo que describe la planilla y "Cerrar planilla"— poner:

> - **LA PLANILLA DE UNA MÁQUINA** (rediseño parte 3). La pantalla donde más
>   tiempo pasa el encargado. Arriba, el **LOTE en 64 px**, porque es lo que se
>   copia a la planilla de papel desde un metro; al lado la máquina, el turno y
>   la hora de apertura, y a la derecha **Cerrar planilla** y **Parada**.
>   Abajo, dos columnas: a la izquierda **lo que se MIRA** —operarios (se suman
>   y se sacan, como en la parte 2), **masas** y **paradas**— y a la derecha
>   **lo que se CARGA: lo producido**.
>   - **Las masas son SOLO LECTURA y lo dice la pantalla** ("las carga el
>     masero"): la cantidad en 40 px y **las dos últimas** con su hora, si fue
>     simple o doble y su chip de origen. No hay ni un control para editarlas,
>     y hay una prueba que se pone en rojo si aparece uno.
>   - **Las paradas: la EN CURSO primero y en bordó**, porque es la única que
>     sigue pasando; las terminadas con su rango y su duración. Mientras dura
>     una, una **franja fija de 80 px bajo la barra**, en bordó, con el sello
>     PARADA, "desde HH:MM · motivo", hace cuánto, y **Reanudar** (64 px,
>     blanco con letra bordó). Sin parada en curso la franja no existe y
>     aparece el botón **Parada**.
> - **LO PRODUCIDO SE CARGA DURANTE EL TURNO, no al cerrar** (el cambio más
>   grande de esta parte). Cada renglón se manda con
>   **`registrar_produccion_item`**, que **suma el stock terminado en el acto**
>   y devuelve el **sublote definitivo**: **ya no existen los sublotes
>   provisorios**. Un renglón se lee "7023-1 · Mini con cono · Caserato ·
>   35 cajas · 11.200 u", y el total del turno va al pie en 26 px.
>   - Se **corrige** con `corregir_produccion_item` y se **borra** con
>     `anular_produccion_item`, los dos **con motivo** (la base exige 3
>     caracteres). **Anular NO borra la fila: le pone `anulado`**, así que el
>     renglón **se sigue viendo, anulado** —ese sublote existió, se selló en una
>     caja y su stock entró y salió— y **no suma al total**.
>   - **Ya no se reordena nada**: el orden es el de carga y lo pone la base, así
>     que los botones de subir y bajar del cierre viejo no existen más.
>   - **`agregar_produccion_item` NO se usa acá**: es solo para un turno ya
>     CERRADO y con `produccion:configurar`.
> - **AGREGAR UN PRODUCTO, EN PASOS** (P5b y P5c). Pantalla propia con los
>   pasos a la izquierda como bloques de 64 px: el actual pintado, los hechos
>   **con lo elegido y tocables para volver**, los que faltan apagados y **sin
>   ningún valor**. Los pasos son **1 Producto → 2 Con o sin cono →
>   3 Presentación → 4 Cono → 5 Cajas**, y **el del cono desaparece al
>   contestar "Sin cono"**, con lo que Cajas pasa a ser el 4: la numeración
>   sale de la posición, no está escrita. **Los pasos del cono y de las cajas
>   comparten pantalla** para ahorrar un toque.
>   - **Paso 1: los de chocolate ABAJO y separados** por una línea de 3 px con
>     la palabra "Chocolate", en el marrón que el proyecto ya usa para el
>     chocolate. **Lo decide `tipo_masa`, no el nombre**: es el mismo dato con
>     el que la sala elige la receta.
>   - **Paso 2:** la opción que no tiene ninguna presentación queda **apagada y
>     dice por qué**, en vez de desaparecer.
>   - **Paso 4, el cono:** buscador de 64 px, resultados de 72 px con **la
>     coincidencia en negrita** (el mismo `htmlResaltado()` del buscador de
>     operarios) y **el usado en el sublote anterior marcado** ("el de
>     7023-1"), que es el que más se repite dentro de un turno. Se PROPONE,
>     nunca se aplica solo. **"Común" va primera y es una opción de verdad**
>     —un cono sin marca de cliente—, no un placeholder.
>   - **Un cono que no está: "+ Agregar cono nuevo"** (borde punteado) llama a
>     **`proponer_marca`**, que guarda el nombre en **MAYÚSCULAS** y, con solo
>     `produccion:cargar`, lo deja **`pendiente_revision`**. **Queda pendiente
>     y se puede usar igual**: lo dice un chip "nuevo, a revisar", no se
>     esconde. Un nombre **ya rechazado hace que la función LANCE**, y ese
>     mensaje ya viene escrito para una persona, así que se muestra tal cual.
>     Si el cono **ya existía**, no se le pone ningún chip: afirmar "a revisar"
>     sobre uno aprobado sería mentir.
>   - **Paso 5:** − / número / + de 96 px de alto, número de 56 px, y debajo el
>     cálculo "35 × 320 por caja = **11.200 u**". Las cajas no bajan de cero.
> - **CERRAR LA PLANILLA** (P5d). Dos columnas: a la izquierda los datos, a la
>   derecha el resumen (masas, paradas con su tiempo total, los sublotes y el
>   total) y el botón.
>   - **`p_productos` va VACÍO (`[]`)**: lo producido ya está cargado sublote
>     por sublote. La base continúa la numeración si alguna vez recibiera algo,
>     pero la pantalla no manda nada.
>   - **SE PUEDE CERRAR CON UNA PARADA ABIERTA, y eso cambió.** `cerrar_turno`
>     **primero** cierra la parada que quedó abierta con
>     **`hasta_fin_de_turno = true`** —"no volvió en todo el turno"— y recién
>     después valida hora y scrap. Antes la pantalla lo BLOQUEABA, con un
>     comentario que decía que "la base rechaza las dos cosas": **era falso**,
>     la base solo rechaza una segunda parada en curso. Ahora el botón se puede
>     tocar siempre, y **la pantalla avisa y hace confirmar** antes de mandar,
>     nombrando el motivo y la hora de la parada. La misma pregunta junta el
>     otro caso —"no cargaste nada producido"— así que es **una sola
>     confirmación** y no dos seguidas.
>   - **La casilla de 72 px "La máquina se rompió y no volvió"**: marcada,
>     cambia la etiqueta de la hora a "Hora en que se rompió" y hace
>     **obligatorio** "Qué pasó".
>   - **La hora va de a 5 minutos** con − / + de 64×72, y tocando el número se
>     escribe. El scrap en kg tiene el mismo control, de a 1 kg, y no baja de
>     cero. **Los dos son campos de `enlazarCampoNumero`** (kilos con 3
>     decimales, cajas enteras), enlazados **al abrir la planilla** y no al
>     cerrarla: a "Agregar producto" y a "Corregir" se llega sin pasar nunca
>     por el cierre.
>   - **El error va PEGADO al botón**, en bordó justo arriba de "Cerrar
>     planilla", **y el campo que falta se marca** con borde de 3 px bordó y su
>     propio texto debajo. Nunca un banner arriba de todo. **El botón NO se
>     deshabilita por lo que falta** (ver el aprendizaje nuevo, más abajo).
>   - El borrador del cierre sigue viviendo en la tablet por turno; ahora
>     guarda `{ hora, scrap, obs, rota }` y **ya no lo producido**, que está en
>     la base desde que se cargó.
> - **CERRAR A LA FUERZA UNA PLANILLA DE OTRO DÍA.** Una planilla abierta de
>   otro día lo dice en bordó y ofrece **cerrarla a la fuerza** con motivo:
>   **`forzar_cierre_turno(p_turno_id, p_persona_id, p_motivo)`**, donde
>   `p_persona_id` es **la persona de la tablet** (la que entró con su PIN), no
>   la cuenta con la que la tablet está logueada. La máquina **se libera**, la
>   planilla queda **`pendiente_completar`** y **NO suma nada al stock**.
>   - **El tablero solo muestra los turnos ABIERTOS**, así que sin un aviso una
>     planilla pendiente sería inalcanzable: arriba del tablero aparece
>     **"N planillas quedaron pendientes de completar"** con un botón por cada
>     una. Si esa consulta falla no se dibuja nada: un aviso inventado sería
>     peor que ninguno.
>   - **Completarla después es EL MISMO CIERRE**: `cerrar_turno` funciona sobre
>     un `pendiente_completar` y ahí completa `completado_por` /
>     `completado_en`. La planilla lo dice con quién la forzó y por qué, avisa
>     que **lo que produjo todavía no está en el stock**, deja seguir cargando
>     lo producido, y el botón pasa a decir **"Completar la planilla"**.

## 2. Sección "Estilo visual": nada que agregar

Todo lo nuevo son clases locales del módulo (`.pr-planilla`, `.pr-producido`,
`.pr-ag*`, `.pr-cierre`, `.pr-contador`, `.pr-rota`, `.pr-error-pegado`) sobre
variables que ya existían. **No se tocó `css/main.css`.** El único color que se
suma es `--marron-oscuro`, que ya está en el `:root` global, para la línea que
separa los productos de chocolate.

## 3. Sección "Aprendizajes clave": DOS entradas nuevas

> - **UN BOTÓN DESHABILITADO HACE INALCANZABLE EL ERROR QUE CUELGA DE ÉL.** Si
>   la regla del proyecto es *"el error va pegado al botón que lo provoca"*,
>   entonces **ese botón no se puede deshabilitar por lo que falta**: el error
>   aparece al intentar, y si no se puede intentar, no aparece nunca. La
>   persona queda mirando un botón apagado sin saber qué falta.
>   - **Caso real** (Producción, cierre de la planilla, 23/09/2026): el cierre
>     ponía `btn.disabled = faltan.length > 0` **y además** mostraba el texto de
>     lo que falta solo si `intentado`, que se pone en el handler del clic. Las
>     dos condiciones juntas hacían el mensaje **imposible de ver**.
>   - **Y la suite estaba en VERDE**, porque llamaba a `intentarCerrar()`
>     directo en vez de simular el clic: es la familia del **test que mide otra
>     cosa**. La assertion que lo cierra no es sobre el mensaje sino sobre el
>     botón — *"el botón sigue pudiéndose tocar"*— y tiene su mutación.
>   - **REGLA:** el botón se traba **solo mientras se está mandando**. Lo que
>     falta se dice al tocarlo, y además se marca el campo.
> - **UN REPINTADO POSTERIOR PUEDE TAPAR EL ERROR QUE ACABA DE ESCRIBIR EL
>   `catch`.** Con un `finally` que vuelve a pintar, el orden es
>   `catch` (escribe el error) → `finally` (repinta y lo borra), así que el
>   mensaje de la base **se ve un instante o no se ve nunca**.
>   - **Caso real** (mismo cierre): el `catch` hacía
>     `err.textContent = e.message; err.hidden = false` y el `finally` llamaba a
>     `pintarCierre()`, que recalcula `err.hidden` a partir de lo que falta. Sin
>     nada faltando, lo escondía. **La suite pasaba igual porque afirmaba sobre
>     `textContent` y no sobre `hidden`** — el texto quedaba puesto, invisible.
>   - **REGLA: el error va al ESTADO, no al DOM.** El `catch` guarda el mensaje
>     (`estado.cierre.errorBase`) y el único que escribe en el DOM es el
>     render, que decide qué mostrar: lo que falta, o lo que contestó la base.
>     Y la assertion afirma **`hidden === false`**, no solo el texto.

## 4. Sección "Suites" del módulo

`test-produccion-cierre.js` se reescribió entera para el diseño nuevo (pasó de
294 a ~700 líneas) y ahora cubre la planilla, lo producido, el paso a paso de
agregar, el cierre y el cierre forzado. Su `mut-produccion-cierre.js` también.
No hay suites nuevas: el archivo ya existía y creció.

En `controles-produccion.js` hay un mecanismo nuevo, **`MENOS_COPIAS`**, que
conviene nombrar en la doc junto a `RENOMBRADOS` y `RETIRADOS`:

> **`MENOS_COPIAS`** declara `[clave, cuántas veces ahora, motivo]` para un
> control que **sigue estando** pero que aparece **menos veces en el fuente**
> —por ejemplo, dos ramas de un render que pasaron a compartir el mismo
> botón—. No es una excepción al chequeo: la clave tiene que seguir existiendo,
> y **si aparece más veces que lo declarado, la declaración sobra y se dice**.

## 5. Qué se verificó, y contra qué

**La base, leída con `pg_get_functiondef` el 23/09/2026** (cuerpo completo, no
la firma):

- `registrar_produccion_item(p_turno_id, p_presentacion_id, p_marca_id,
  p_cajas)` → `{produccion_item_id, sublote, orden, unidades}`. Rechaza el
  turno `cerrado`, exige `produccion:cargar` en la unidad, valida que la
  presentación sea de esa unidad y esté activa, y **inserta en
  `stock_terminado_movimientos` en la misma transacción**.
- `corregir_produccion_item` y `anular_produccion_item`: motivo ≥ 3, escriben
  `produccion_correcciones` y ajustan el stock con un movimiento `ajuste`.
  Anular **solo pone `anulado = true`**.
- `cerrar_turno`: **el `update` de la parada abierta con
  `hasta_fin_de_turno = true` está ANTES de las validaciones de hora y scrap**
  — de ahí sale que cerrar con una parada en curso se pueda. `p_productos`
  puede ser `[]` y el orden arranca en `max(orden) + 1`.
- `forzar_cierre_turno`: solo sobre `abierto`, cierra las paradas **sin**
  marcar `hasta_fin_de_turno`, deja `pendiente_completar` y **no inserta ni un
  `produccion_items` ni un movimiento de stock**.
- `proponer_marca`: `upper(btrim())`, `pendiente_revision` sin `configurar`, y
  `raise` si el nombre ya está `rechazada`.
- Columnas de `produccion_items`, `marcas_personalizadas`,
  `paradas_produccion` y `turnos_produccion` contra `information_schema`.
- `productos_terminados.tipo_masa` en la base real: los valores son **`Común` y
  `Chocolate`**, que es lo que usa la separación del paso 1.

**El código, ejecutado:** las 12 suites del módulo y las 8 corridas de
mutaciones (números abajo). Los renders se ejecutan con un `document` falso y
datos de prueba; el escapado se verifica por las dos mitades (los renders con
HTML malicioso y el chequeo estático de interpolaciones).

## 6. Lo que NO se pudo probar

- **Nada se probó en la tablet ni en un navegador con sesión.** Las medidas del
  diseño (1280×800 sin scroll, 400 px de columna, 88/72/96 px de botón) están
  escritas en el CSS pero **no se miraron renderizadas**. Es lo mismo que en
  las partes 1 y 2.
- Se armó una **foto estática** de las cuatro pantallas (el CSS real del módulo
  más el HTML real con los renders ejecutados) para poder mirarlas sin sesión,
  pero **no se llegó a verlas**: el visor de este entorno no deja sacarles una
  captura. El script quedó en el scratchpad, no en el repo.
- **El circuito real contra la base no se corrió**: ninguna RPC se llamó de
  verdad, todo es contra el doble de `supabase`.
- La **recuperación del borrador del cierre con una tablet que se apaga** no se
  probó más allá del `localStorage` en memoria.

## 7. Decisiones que se tomaron sin preguntar

1. **El cierre ya no agrega productos.** El diseño (5d) no tiene "agregar" en
   el cierre y la parte 3 pide cargar durante el turno, así que `p_productos`
   va siempre vacío y el único lugar donde se carga es la planilla. Si alguna
   vez se quiere volver a agregar desde el cierre, la base lo soporta sin
   cambios (continúa la numeración).
2. **"Común" se mantiene en el paso del cono**, aunque el diseño no la muestra:
   `produccion_items.marca_id` es nullable y `registrar_produccion_item` acepta
   null, así que sacarla haría imposible cargar una producción con cono sin
   marca de cliente.
3. **El paso 2 muestra las dos opciones y apaga la que no tiene
   presentaciones**, en vez de ofrecer solo las posibles: una opción que
   desaparece se lee como que falta algo en la pantalla.
4. **El paso del cono se muestra mientras no se sepa** si lleva cono (son los 5
   del diseño en 5b) y desaparece recién al contestar "Sin cono".
5. **Una sola pregunta de confirmación** antes de cerrar, que junta la parada
   abierta y el "no produjo nada", en vez de dos diálogos seguidos. Por eso los
   botones pasaron de `pr-cierre-vacio-si/no` a `pr-cierre-confirmar-si/no`.
6. **El scrap tiene − / + de 1 kg** (el README dice "el mismo control" pero no
   el paso; la hora sí dice 5 minutos).
7. **El aviso de las planillas pendientes de completar vive en el tablero.** No
   estaba pedido explícitamente, pero sin él una planilla forzada es
   inalcanzable, y la parte 3 pide que "completarla después" sea posible.
8. **`htmlParadas()` es la misma de la planilla y del historial**, así que el
   detalle del historial ahora muestra las paradas con la hora primero
   ("09:00–09:45 · Cambio de molde · 45 min"). Se actualizó su assertion.

## 8. Lo que cambió en el repo

- `modulos/produccion.html` — único archivo del módulo tocado.
- `pruebas/test-produccion-cierre.js` y `pruebas/mut-produccion-cierre.js`,
  reescritos.
- `pruebas/sandbox-produccion.js` — la lista de funciones del módulo.
- `pruebas/seguras-produccion.js` — las hojas seguras nuevas, y se **unificaron
  dos claves duplicadas** (`botones` y `producido` estaban dos veces con
  motivos distintos: dos entradas con la misma clave son exactamente cómo
  alguien lee el motivo equivocado).
- `pruebas/controles-produccion.js` — `d3f8203` sumado a `BASES`, las
  declaraciones de esta parte y el mecanismo `MENOS_COPIAS`.
- `pruebas/test-produccion-historial.js` — la assertion de las paradas.
- `pruebas/mut-produccion-abrir.js` — **dos anclas dejaron de ser únicas** al
  sumar `confirmarCorregir()` y `confirmarAgregar()`, que usan el mismo patrón
  de `guardado` (a propósito: es la regla de no confundir un fallo de la
  RELECTURA con un fallo de la escritura). El runner **abortó nombrándolas**,
  que es para lo que está ese guard; se anclaron al renglón de
  `cambiarOperarioTurno`.

**No se tocó** `css/main.css`, `js/utils.js`, `js/auth.js`, `dashboard.html`,
`modulos/accesos.html` ni ningún otro módulo.

## 9. Controles declarados (para la doc, si se lleva el detalle)

- **Renombrados:** `pr-cierre-hora` de `type=time` a `type=text` (el reloj
  nativo no se puede usar con harina en las manos; ahora es − / + de 5
  minutos); `pr-cierre-vacio-si/no` → `pr-cierre-confirmar-si/no`.
- **Retirados:** los `<select>` de producto y presentación (pasaron a botones
  de 88 px, que es lo que permite separar los de chocolate); `data-subir` y
  `data-bajar` (no hay nada que reordenar: el sublote ya está sellado).
- **Menos copias:** `data-borrar`, de 2 a 1 (las dos ramas de `htmlProducido`
  comparten los mismos botones).

## 10. Números

```
node pruebas/check-scripts.js      OK (todos los bloques parsean)

test-produccion-acceso             23/23    verde
test-produccion-quien             129/129   verde
test-produccion-pin               144/144   verde
test-produccion-abrir             162/162   verde
test-produccion-cierre            249/249   verde
test-produccion-masa              143/143   verde
test-produccion-config            104/104   verde
test-produccion-historial          68/68    verde
test-produccion-xss                 6/6     verde
test-accesos-produccion            19/19    verde
test-dashboard-produccion           9/9     verde
controles-produccion              960/960   verde

mut-produccion-acceso              13/13
mut-produccion-quien               57/57    (+2 equivalentes)
mut-produccion-pin                 71/71    (+2 equivalentes)
mut-produccion-abrir               92/92    (+2 equivalentes)
mut-produccion-cierre             156/156   (+34 equivalentes)
mut-produccion-masa                92/92    (+12 equivalentes)
mut-produccion-config              99/99    (+1 equivalente)
mut-produccion-historial           50/50    (+12 equivalentes)
```

**Seis mutaciones escaparon en la primera corrida del cierre y ninguna era
falta de cobertura por sí sola: se investigaron una por una** (la regla de
"una mutación que escapa se investiga antes de asumir que falta cobertura").
Tres eran huecos reales que se cerraron con casos nuevos —la relectura que
falla después de una corrección que SÍ se guardó, el buscador de conos con un
nombre acentuado, y reanudar con una parada vieja adelante en la lista—; dos
eran assertions que faltaban (las masas se piden sin las anuladas; ningún campo
se marca antes de intentar); y **una estaba mal apuntada**: mutaba el `5` del
handler del clic, que el sandbox nunca engancha, así que no probaba nada. Se
movió a mutar el atributo `data-hora-paso="5"` del HTML, que es donde vive de
verdad el paso de 5 minutos.

## 11. Guion para Facu (lo nuevo de esta parte)

1. **Cargar producción durante el turno.** En la planilla de una máquina
   abierta, tocar **"+ Agregar producto"** y hacer el camino entero: producto →
   con cono → presentación → cono → cajas. Mirar que **los de chocolate estén
   abajo y separados**, que el cálculo de unidades cierre, y que al confirmar
   aparezca el **sublote que devolvió la base** (no uno provisorio).
2. **Corregir y borrar.** Corregir las cajas de un renglón con un motivo, y
   borrar otro. El borrado **tiene que quedar a la vista, tachado y sin
   botones**, y el total tiene que bajar. Después, mirar el stock terminado:
   tiene que haber entrado y salido.
3. **Un cono nuevo.** En el paso del cono, **"+ Agregar cono nuevo"**: se
   elige solo, dice **"nuevo, a revisar"** y **se puede usar igual**. Después
   aparece para aprobar en Configuración → Marcas.
4. **Cerrar con una parada abierta.** Parar la máquina y, sin reanudar, tocar
   **Cerrar planilla**: tiene que dejar seguir, avisar que la parada va a
   quedar como "no volvió en todo el turno" y **pedir confirmar**.
5. **El error pegado al botón.** Cerrar sin poner el scrap: el botón se tiene
   que poder tocar, el mensaje aparece **arriba del botón** y el campo del
   scrap se marca en bordó. Marcar **"La máquina se rompió y no volvió"** y
   probar que "Qué pasó" se vuelva obligatorio.
6. **Cerrar a la fuerza.** Dejar una máquina abierta de un día para el otro.
   Al día siguiente, entrar a su planilla: tiene que decir que quedó abierta de
   otro día y ofrecer **cerrarla a la fuerza**. Después de hacerlo, la máquina
   tiene que quedar **libre en el tablero** y arriba tiene que aparecer el
   aviso de **"pendiente de completar"**. Entrar por ahí, cargar lo producido y
   **completarla**: el stock tiene que entrar recién en ese momento.

---

## Parte 2 — máquinas y abrir turno · `d3f8203`

`check-scripts` OK · abrir 162/162 · cierre 105/105 · acceso 23/23 · quien 129/129 ·
pin 144/144 · config 104/104 · historial 68/68 · masa 143/143 · xss 6/6 ·
accesos 19/19 · dashboard 9/9 · **controles 753/753**.
Mutaciones: 539/539, +45 equivalentes.
Controles retirados: `input#pr-abrir-fecha[type=date]` (la fecha pasó a ‹ ›) y
`select[data-operario]` (un operario por máquina pasó a varios como chips).

## Andamio — caché del sandbox · `e0563b9`

`construirCon()` cachea la función compilada por **contenido** del archivo (no
por ruta ni por fecha: el runner de mutaciones escribe un archivo distinto por
mutación y a veces en el mismo milisegundo). Medido sobre test-produccion-abrir,
que arma 16 sandboxes: **12 s → 0,83 s**. Todas las suites del repo en verde y
mut-produccion-abrir sigue detectando sus 92.

## Parte 3 — la planilla · `108f7ef`

`check-scripts` OK · acceso 23/23 · quien 129/129 · pin 144/144 · abrir 162/162 ·
cierre 249/249 · masa 143/143 · config 104/104 · historial 68/68 · xss 6/6 ·
accesos 19/19 · dashboard 9/9 · **controles 960/960**.
Mutaciones: acceso 13/13 · quien 57/57 (+2 eq.) · pin 71/71 (+2 eq.) ·
abrir 92/92 (+2 eq.) · cierre 156/156 (+34 eq.) · masa 92/92 (+12 eq.) ·
config 99/99 (+1 eq.) · historial 50/50 (+12 eq.).

Dos bugs encontrados que no estaban en el pedido: **el botón de cerrar se
deshabilitaba cuando faltaba un dato y el error va pegado a ese botón**, o sea
que el mensaje era imposible de ver (la suite estaba verde porque llamaba a
`intentarCerrar()` directo en vez de simular el clic); y **el `finally` tapaba
el error de la base**, porque el repintado posterior lo escondía (la suite
pasaba porque afirmaba sobre `textContent` y no sobre `hidden`).
