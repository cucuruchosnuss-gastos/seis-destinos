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

## Patrón de nombres

- `test-<modulo>-<tema>.js` — una suite. Ej.: `test-cobranzas-xss.js`.
- `mut-<modulo>-<tema>.js` — el runner de mutaciones de esa suite.
- El resto son helpers compartidos, con el nombre de lo que hacen: `escaner-interpolaciones.js` (tokeniza el `<script>` y devuelve cada `${...}` con su línea y si el template arma HTML), `clasificar.js` (dice si una expresión está escapada o por qué es segura), `sandbox.js` (arma el `document` falso y carga las funciones reales del módulo) y `extraer.js` (saca una función o una constante del `<script>`).

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

## Qué NO va acá

Archivos de un solo uso: scripts que aplican una edición, generadores de vistas para mirar en el navegador, volcados intermedios. Esos siguen viviendo en el scratchpad de la sesión. Acá va lo que tiene que poder volver a correrse dentro de seis meses.
