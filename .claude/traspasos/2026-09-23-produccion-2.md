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

