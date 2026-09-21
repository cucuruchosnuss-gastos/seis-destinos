# Pruebas

Las suites de verificación del proyecto viven acá, versionadas, y **no en el scratchpad de una sesión de Claude**.

El motivo es el que las justifica: **una verificación que se borra con la sesión no impide nada mañana**, que es justo para lo que se escribió. Cuando se adoptó esta convención había cuatro módulos —Gastos, Caja, Cuentas Corrientes y Empleados— figurando en `CLAUDE.md` con su barrido de XSS "cerrado" y la prueba que lo demostraba ya no existía en ningún lado.

## Cómo se corre una suite

Desde cualquier directorio: las rutas se resuelven contra `__dirname`, no contra el directorio actual.

```bash
node pruebas/test-cobranzas-xss.js
```

Imprime `LEIDO:<n> de <archivo>`, el detalle de lo que falla y una última línea `N/N verde` o `N/N ROJO`. Sale con código distinto de cero si algo falla.

Para correrla contra otro archivo —una copia mutada, o una versión vieja sacada con `git show`— se apunta con `ARCHIVO_TEST`:

```bash
ARCHIVO_TEST=/ruta/a/otra-copia.html node pruebas/test-cobranzas-xss.js
```

Las suites de escapado tienen **dos mitades** y ninguna reemplaza a la otra: los renders EJECUTADOS con un `document` falso, y el chequeo estático que recorre el `<script>`. Se puede correr una sola con `SOLO=render` o `SOLO=estatico`, y eso sirve para medir cuánto aporta cada una — no para cerrar un commit, que se cierra con las dos.

Las mutaciones se corren aparte, y tardan bastante porque cada una levanta la suite entera:

```bash
node pruebas/mut-cobranzas-xss.js
```

## El archivo entero, como lo ve el navegador

```bash
node pruebas/check-scripts.js
```

Sin argumentos revisa **todos** los HTML del repo; con argumentos, solo los que se le pasen. Hace dos cosas que ninguna suite puede hacer: parsea **cada bloque `<script>` por separado** con `node --check` —cada uno tiene su propio scope, concatenarlos daría falsos positivos— y busca **identificadores duplicados en el top-level**, porque con dos `function` o dos `var` JavaScript los deja pisarse **en silencio**, que es peor que el `SyntaxError`: una de las dos implementaciones desaparece y nadie se entera.

**Se corre en el cierre de todo commit de módulo**, junto con las suites. El harness valida fragmentos; el navegador parsea el archivo completo antes de ejecutar una línea, y un choque de nombres deja el módulo muerto con las mutaciones en verde.

## Patrón de nombres

- `test-<modulo>-<tema>.js` — una suite. Ej.: `test-cobranzas-xss.js`.
- `mut-<modulo>-<tema>.js` — el runner de mutaciones de esa suite.
- El resto son helpers compartidos, con el nombre de lo que hacen: `escaner-interpolaciones.js` (tokeniza el `<script>` y devuelve cada `${...}` con su línea y si el template arma HTML; `analizar()` expone además el texto de cada template y los rangos de cada string), `clasificar.js` (dice si una expresión está escapada o por qué es segura), `sandbox.js` (arma el `document` falso y carga las funciones reales del módulo) y `extraer.js` (saca una función o una constante del `<script>`).

## El baseline se ancla a un COMMIT FIJO, nunca a `HEAD`

Una suite que compara contra `HEAD` **deja de probar en el momento en que el cambio se commitea**: el "antes" pasa a ser el propio cambio, las dos mitades se vuelven idénticas y toda aserción de "antes era X, ahora es Y" queda verde para siempre sin mirar nada.

Si una suite necesita comparar contra el estado anterior, el commit va escrito en el archivo:

```bash
git show 6654fac:modulos/cobranzas.html > /tmp/antes.html
ARCHIVO_TEST=/tmp/antes.html node pruebas/test-cobranzas-xss.js
```

**Nunca `git stash` para conseguir el archivo limpio.** En este repo el round-trip convierte el archivo a CRLF, y como las suites comparan contra lo que devuelve `git show` —que siempre viene en LF— se ponen todas en rojo a la vez y parece que el cambio rompió medio módulo.

## Si la suite no está verde sobre el archivo limpio, las mutaciones no corren

El runner decide "mutación detectada" preguntando si el sub-proceso falló. Si la suite **ya venía fallando** por cualquier otro motivo, entonces toda mutación se reporta como detectada y el `N/N` final no mide absolutamente nada.

Por eso el runner corre primero la suite sobre el archivo limpio y, si no está verde, **aborta diciéndolo** en vez de informar cobertura. Misma idea en los otros dos guards:

- Una mutación cuyo texto **no es único** en el archivo se aborta nombrándola, en vez de mutar el renglón equivocado y reportarse como escapada. Una mutación que escapa se investiga antes de asumir que falta cobertura.
- Una mutación que **no cambia nada** es un error del test, nunca cobertura. Y el sub-proceso informa cuántos caracteres leyó, para que el padre confirme que leyó el archivo mutado y no el original.

## Las suites del circuito Ingreso ↔ Gastos ↔ Cuentas Corrientes

```bash
node pruebas/test-materia-prima-circuito.js
node pruebas/test-gastos-circuito.js
node pruebas/test-cuentas-corrientes-circuito.js
node pruebas/mut-materia-prima-circuito.js
node pruebas/mut-gastos-circuito.js
node pruebas/mut-cuentas-corrientes-circuito.js
```

Cubren **los renders nuevos del circuito, no el archivo entero**: el chequeo estático se acota a las funciones que cada suite nombra (`estaticoAcotado()` de `circuito-comun.js`), porque `materia-prima.html` todavía tiene su barrido de XSS pendiente y el archivo entero daría rojo por sinks que no son de este trabajo. Si una función nombrada deja de existir, eso es rojo.

`mutar.js` es el runner genérico: saca cada `esc()` de esas funciones y aplica las mutaciones de comportamiento que declara cada `mut-*.js`, con los mismos tres guards de arriba. Las mutaciones corren de a una: cada sub-proceso termina antes de escribir la siguiente.

`construirCon()` de `sandbox.js` y las opciones `{ escape, seguras, segurasRegex }` de `clasificar()` existen para esto; sin opciones, las dos hacen lo mismo que antes para Cobranzas.

## Los estados de las fotos al cargar una cobranza

```bash
node pruebas/test-cobranzas-fotos.js
node pruebas/mut-cobranzas-fotos.js
```

EJECUTA `procesarFoto`, el render de cada estado (`htmlAvisoFoto` / `pintarEstadoFotos`), el contador de la lectura y los reintentos con el formulario abierto, con **timers falsos, un `Date.now` controlado, un `window` con listeners contables y un supabase falso** cuyas respuestas (subida, OCR) se resuelven desde la suite con promesas diferidas. Lo que afirma:

- con señal y una subida en curso, la palabra "señal" **no aparece**; solo aparece sin red o con un error clasificado como de red (`esErrorDeRed`);
- dos `procesarFoto` a la vez sobre la misma foto llaman **una** vez al OCR y no duplican los cheques, y la marca `enCurso` se libera aunque la subida o el OCR fallen;
- el intervalo del contador se apaga cuando no queda ninguna foto leyendo, y el aviso de más de 90 s aparece sin cancelar la lectura;
- las marcas en memoria (`enCurso`, `fase`, `leyendoDesde`, `errorRed`, `intentosLector`) **no llegan al borrador**: `dbGuardar` falso clona con `structuredClone`, que es el mismo algoritmo que usa IndexedDB;
- con el formulario abierto se reintenta en `'online'` y cada 30 s, y todo se limpia al salir del formulario.

El runner saca cada `escCob()` de `htmlAvisoFoto()` —dos son equivalentes declaradas, con su motivo— y aplica mutaciones de comportamiento de a una.

## Ningún control de Cobranzas se pierde

```bash
node pruebas/controles-cobranzas.js
```

Existe para el rediseño visual del módulo: reacomodar HTML y estilos es justo el trabajo donde un botón, un id o un `data-*` desaparece sin que nada se queje — el JS que lo buscaba hace `?.` o un `querySelectorAll` vacío y la pantalla sigue andando sin esa acción.

Inventaría, del baseline y del archivo actual, **cada id**, **cada atributo `data-*`** (todos: es un superconjunto de "los que disparan acciones", así no hay que decidir a mano cuál cuenta) y **cada control** (`button`, `input`, `select`, `textarea`, `a`), del HTML estático y de las plantillas y strings del `<script>` —leídos con el tokenizador de `escaner-interpolaciones.js`, así los comentarios no cuentan—. La clave de un control **no depende de clases ni estilos**: id, nombres de `data-*`, `type`, `name`, `href`; y solo si no tiene nada de eso, su texto literal.

- Compara **cantidades**: todo lo que estaba tiene que seguir estando al menos las mismas veces, o ROJO nombrándolo. Lo nuevo se permite y se lista.
- Sobre el archivo actual, cada `getElementById('x')`, `querySelector` con `#x` o `[data-x]` y cada `.dataset.x` literal tiene que apuntar a algo que exista: un id renombrado en el HTML y no en el JS es una acción que deja de estar sin ningún error.
- El baseline es el commit fijo `BASE_COMMIT` del archivo (hoy `fba6396`), nunca `HEAD`. `ARCHIVO_TEST` cambia el archivo bajo prueba y `ARCHIVO_BASE` reemplaza el baseline por un archivo ya extraído. `LISTAR=1` imprime el inventario completo.
- Si una parte del rediseño cambia **a propósito** el texto de un control sin id ni `data-*`, el cambio va declarado en `RENOMBRADOS`, con su motivo, y la salida lo lista.

## Qué NO va acá

Archivos de un solo uso: scripts que aplican una edición, generadores de vistas para mirar en el navegador, volcados intermedios. Esos siguen viviendo en el scratchpad de la sesión. Acá va lo que tiene que poder volver a correrse dentro de seis meses.
