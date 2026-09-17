# Traspaso al chat de arquitectura — barrido de XSS de Cobranzas (17/09/2026)

**Qué hay que hacer con esto:** actualizar CLAUDE.md. NO hace falta nada del chat de
permisos: no cambiaron tareas, ni RPCs, ni policies, ni firmas.

**Resultado en una línea: el barrido no encontró NINGÚN sink abierto en
`modulos/cobranzas.html`. No se cambió una sola línea del módulo.** Lo que este
commit agrega es la verificación que lo demuestra y que impide que se abra uno
mañana. Es un resultado válido y no hay hallazgos inventados.

---

## 1. Qué se hizo

El barrido propio de `modulos/cobranzas.html`, que CLAUDE.md lista como PENDIENTE
en la regla de escapado de "Aprendizajes clave" (junto con `materia-prima.html` y
`stock.html`, que siguen pendientes). La regla dice que el módulo tiene helper
`escCob` desde que nació pero que **tener el helper no prueba que esté en todos
los sinks** — eso es justamente lo que se fue a verificar.

Se clasificaron **las 237 interpolaciones `${...}` del `<script>`, una por una**,
más las **14 asignaciones directas a `innerHTML`**. Ninguna quedó sin justificar.

(El punto de partida del pedido hablaba de 220 interpolaciones y 89 con `escCob`.
El **89 coincide exactamente**. La diferencia de 237 contra 220 es de método: el
escáner de este commit cuenta también las interpolaciones de las **plantillas
anidadas** dentro de otra plantilla, que un conteo por texto plano se pierde.)

### Clasificación — las 152 que entran a una plantilla que ARMA HTML

| cuántas | clasificación |
|---|---|
| 89 | **escapada** con `escCob(...)` |
| 33 | literal del código (una rama `? 'algo' : ''`, una clase CSS fija) |
| 16 | plantilla anidada / HTML de plantilla anidada, cuyas propias interpolaciones se verifican aparte |
| 15 | número calculado en el código (`i + 1`, `findIndex() + 1`, `.length`, literales) |
| 9 | HTML constante del código (`pieRenglon()`, `claseRenglon()`, los avisos fijos, `botones.join('')`) |
| 6 | HTML **ya escapado** más arriba en la misma función (`aviso`, `avisos`, `avisoNotas`, `avisoDuplicado`, `avisoLetras`) |
| 3 | HTML armado por otra función que escapa adentro (`htmlHistorial`, `htmlChequeDetalle`, `htmlDetalle`) |
| 2 | escapada elemento por elemento (`.map(escCob).join('<br>')`) |

### Las 85 que NO arman HTML

| cuántas | por qué es segura |
|---|---|
| 47 | arma una FRASE que se escapa recién al entrar al HTML (`escCob` o `.map(escCob)`) — los motivos, los errores del cheque, el texto del duplicado, el nombre del banco |
| 16 | arma los renglones del cheque como texto del estado, no HTML |
| 6 | selector CSS para `querySelector`, no HTML |
| 5 | mensaje de consola o de toast — **los toasts de `js/utils.js` usan `textContent`** |
| 3 | formato de fecha/importe, que después se escapa al mostrarlo |
| 3 | clave de un Set de permisos |
| 3 | ruta de Storage |
| 1 | clave del filtro `.like()` de PostgREST |
| 1 | texto de un `window.prompt()` |

### Las 14 asignaciones a `innerHTML`

Cuatro son literales del código, dos son `''` (vaciar), cinco llaman a una función
que escapa adentro, dos son plantillas cuyas interpolaciones ya están contadas
arriba, y una es `todo.map(escCob).join('<br>')`. **No se cuentan**: se clasifica
cada una, porque una assertion de conteo exacto se rompe sola con cualquier
cambio y después nadie sabe si fue una regresión de seguridad o un render nuevo.

---

## 2. Qué se verificó, y contra qué

Todo corrido con Node sobre el archivo real. La verificación tiene **dos mitades y
ninguna reemplaza a la otra**:

1. **Renders EJECUTADOS** con un `document` falso y **una marca distinta por
   campo** (`"><b data-xss="campo">`), afirmando las dos cosas: que **no aparece
   ninguna marca cruda** y que **aparecen escapadas todas las esperadas**. Se
   ejecutan `htmlFilaCobranza` (dos casos), `htmlDetalle` (tres casos),
   `htmlChequeDetalle`, `htmlTarjetaCheque` (abierta y plegada),
   `pintarEstadoFotos`, `pintarBannerLocal`, `cargarRepartidores`,
   `renderizarChipsEstado` y `pintarTotalYGuardado`.
2. **Chequeo ESTÁTICO** que recorre el `<script>` y exige que cada `${...}` que
   entra a una plantilla que arma HTML —y cada asignación a `innerHTML`— esté
   escapada o figure en la lista de seguras **con su motivo**. Una interpolación
   nueva sin escapar lo pone en rojo **nombrando la expresión y la línea**.
   Además chequea el **contexto**: que ninguna caiga en un atributo **sin
   comillas**, ni dentro de un `on*=`, ni dentro de un `href`/`src` — ahí escapar
   HTML no alcanza. (Hoy no hay ninguna de las tres; el chequeo es para mañana.)

### Números

| verificación | resultado |
|---|---|
| suite completa sobre el archivo actual | **90/90 verde** |
| suite contra `6654fac` | **90/90 verde — porque `6654fac` ES el archivo actual, byte a byte** |
| suite con un solo `escCob` sacado (prueba negativa) | **85/90 ROJO**, nombrando el render y la línea 1313 |
| mutaciones (saca cada `escCob`) | **90/90 detectadas**, más **2 equivalentes** contadas aparte |
| mutaciones **sin** el chequeo estático | **71/90** — el estático aporta 19 |
| chequeo del archivo entero como lo ve el navegador | **OK**: el bloque `<script>` parsea y no hay identificadores pisados (104 top-level) |

**Sobre el "X/N contra el anterior":** el pedido pedía correr la prueba contra el
archivo anterior, donde "tiene que fallar". Acá no falla, y el motivo es el
resultado del trabajo: `modulos/cobranzas.html` tiene **un solo commit en toda su
historia** (`6654fac`) y **no hubo ningún sink que cerrar**, así que el "antes" y
el "después" son el mismo archivo. Se verificó que son idénticos byte a byte y
que los dos tienen **0 CR** (no hubo conversión a CRLF; nunca se usó `git stash`,
se extrajo con `git show`). Lo que prueba que la suite **no es vacua** son las
mutaciones y la prueba negativa de arriba, no el número contra el commit anterior.

### Las 2 mutaciones equivalentes

Son las dos apariciones de `escCob(ch.tipo === 'diferido' ? 'Diferido' : 'Común')`
(líneas 1544 y 2188). Las dos ramas son literales del código sin ningún carácter
escapable, así que `escCob('Diferido') === 'Diferido'` y `escCob('Común') ===
'Común'`: la página sale **idéntica** con o sin el escape. No es un hueco de
cobertura. Están declaradas a mano en el runner, con ese motivo, para que la
lista no crezca sola y tape un hueco de verdad.

### Los dos controles de calibración (los pidió Facu, y dan lo esperado)

1. El aviso de cheque duplicado **se escapa bien** (línea 2235) — ✓.
2. Los tres `${f.cliente}` de `mostrarExito`/`mostrarError` **NO son sink**:
   verificado contra `js/utils.js`, el toast usa `toast.textContent` — ✓.

### Dato de la base (verificado el 17/09/2026)

El módulo **ya está en uso real**: 11 cobranzas de 2 personas, 11 cheques, 10
fotos y 21 eventos de historial. **Ninguna fila cargada tiene `<`, `>`, `"` ni
`'`** en cliente, observaciones, referencia, beneficiario, importe en letras ni en
la denominación de los 59 bancos. O sea: no hay nada guardado que hubiera
explotado, y por eso el barrido no era urgente — pero el escapado ya estaba bien
puesto desde el primer día.

---

## 3. Qué tocar en CLAUDE.md

### 3.1 En "Aprendizajes clave", la regla de escapado

Donde dice:

> **PENDIENTE — el mismo barrido propio en `materia-prima.html`, `stock.html` y
> `cobranzas.html`.** Los tres tienen helper desde que nacieron (`esc` /
> `escCob`), pero tener el helper no prueba que esté en todos los sinks.

Reemplazar por algo de esta forma:

> **PENDIENTE — el mismo barrido propio en `materia-prima.html` y `stock.html`.**
> Los dos tienen helper desde que nacieron (`esc`), pero tener el helper no prueba
> que esté en todos los sinks.
>
> - **`cobranzas.html` — BARRIDO HECHO el 17/09/2026, y NO había ningún sink
>   abierto: cero líneas cambiadas.** Es el primer módulo del proyecto donde el
>   barrido no encuentra nada, y tiene una explicación: nació con su `escCob`
>   —los cinco viejos lo sumaron después— así que el escapado se escribió junto
>   con cada render en vez de agregarse encima. Se clasificaron las **237**
>   interpolaciones del `<script>` (las **152** que entran a una plantilla que arma
>   HTML y las **85** que no) más las **14** asignaciones a `innerHTML`, ninguna
>   sin justificar; **89 llevan `escCob`**. La prueba ejecutada da **90/90** y
>   **85/90 con un solo escape sacado**, con **90/90 mutaciones detectadas** (más 2
>   equivalentes: las dos ramas de `'Diferido'`/`'Común'` no tienen ningún carácter
>   escapable, así que la página sale idéntica).
> - **Que el barrido no encuentre nada NO lo vuelve inútil, y conviene dejarlo
>   escrito**: es el único resultado que se puede afirmar después de mirar, y lo
>   que queda del trabajo es la verificación que impide que se abra un sink mañana
>   — que es el mismo valor que en los módulos donde sí había agujeros.
> - **La moneda no es sink en este módulo, por una razón propia:** `formatearImporte()`
>   de `cobranzas.html` tiene `currency: 'ARS'` **hardcodeado en el código**, así que
>   ningún valor de la columna `moneda` entra nunca al HTML — a diferencia de Caja y
>   Cuentas Corrientes, donde la moneda venía de la base y hubo que escaparla.
>   Sumado al CHECK `= 'ARS'` de la tabla, son dos barreras independientes.

### 3.2 Sumar a esa misma regla, en la parte de "CÓMO SE VERIFICA"

Tres cosas que salieron de este barrido y no estaban escritas:

> - **PELAR COMENTARIOS NO ES LA FORMA DE ANALIZAR EL FUENTE: hay que TOKENIZARLO.**
>   La regla ya dice que un `replace` de `/* */` sobre un HTML es inseguro por el
>   `accept="image/*"`. La salida no es pelar con más cuidado: es que el analizador
>   sepa distinguir código de string, de template, de comentario y de regex —
>   **entre otras cosas porque sin eso no se puede saber qué es una plantilla que
>   arma HTML y qué no**, y ahí se pierden las interpolaciones de las plantillas
>   ANIDADAS, que en Cobranzas son 16 de las 152.
> - **NO ALCANZA CON PREGUNTAR SI LA EXPRESIÓN EMPIEZA CON `esc(`: hay que mirar
>   las POSICIONES DE VALOR.** Un ternario escapa en sus ramas y no afuera
>   (`cond ? \`…${esc(x)}…\` : ''`), un `a || b` puede imprimir cualquiera de los
>   dos, y un `a && b` solo imprime `b` (si imprimiera `a` sería falsy y no sale
>   nada). El chequeo estático descompone la expresión en lo que puede llegar a la
>   página y clasifica CADA hoja. Sin eso, la mitad de las interpolaciones de un
>   render con ramas queda sin verificar o hay que meterlas a mano en una lista de
>   seguras, que es peor.
> - **EL CONTEXTO IMPORTA TANTO COMO EL ESCAPE.** `esc()` alcanza para el contenido
>   y para un atributo **entre comillas**. NO alcanza para un atributo **sin
>   comillas** —un espacio ya rompe afuera—, ni dentro de un `on*=`, ni dentro de
>   un `href`/`src`, donde el contenido es código y lo que hace falta es otra cosa.
>   El chequeo estático de Cobranzas mira también eso; hoy no hay ninguno de los
>   tres casos en el archivo, y la verificación existe para que siga siendo así.

### 3.3 En la sección del módulo Cobranzas, en sus PENDIENTES

**Sacar** el barrido de XSS de la lista de pendientes si figurara, y **dejar como
están** todos los demás, que no se tocaron a propósito (`window.prompt` de elegir
foto, `window.confirm` de descartar borrador, `formatearImporte(null)` devolviendo
`$ 0,00`, el control de concurrencia, `guardarBorrador()` leyendo `estado.form`).

**Y corregir una afirmación que quedó vieja**, que es de la familia del comentario
que promete algo que ya no es cierto: la sección dice **"NADA DEL MÓDULO SE PROBÓ
CON UN CHEQUE REAL"**. Verificado contra la base el 17/09/2026: hay **11 cobranzas
cargadas por 2 personas** (3 registradas, 7 procesadas, 1 anulada), **11 cheques**,
**10 fotos** y **21 eventos de historial**, del 16 y el 17 de septiembre. El
módulo **está en uso en producción**, y eso cambia el costo de cualquier cambio
que se le haga: una regresión se ve el mismo día, en la mano de alguien que está
cobrando en la calle.

---

## 4. Lo que encontré de paso y NO arreglé (no estaba en el alcance)

Ninguno es un sink. Van anotados para que alguien decida, no para que se
arreglen de apuro:

- **Seis interpolaciones arman un SELECTOR CSS**, no HTML: por ejemplo
  `document.querySelector(\`[data-titulares="${btn.dataset.plegarTitulares}"]\`)`
  (~1691), `[data-tit-caja="${...}"]` (~2490) y el `enfocar(\`[data-${attr}="${ch.id}"]\`)`
  (~2445). **No es XSS** —`querySelector` no ejecuta nada— y los valores son
  uuids (`crypto.randomUUID()` o columnas uuid de la base), así que ni siquiera
  pueden llevar una comilla. Queda dicho porque un día alguien puede meter ahí un
  id que no sea uuid, y entonces `CSS.escape()` pasa a hacer falta.
- **El harness vive en el scratchpad de la sesión y se borra con ella.** Es la
  convención del proyecto —CLAUDE.md dice "`check-scripts.js` del scratchpad"— y
  los otros cinco módulos hicieron lo mismo, así que **no lo cambié por mi
  cuenta: dónde viven las suites es una decisión de todo el proyecto y no de un
  módulo.** Pero vale decirlo derecho: una verificación que se borra con la
  sesión **no impide nada mañana**, que es justamente para lo que se escribió.
  Hoy el repo no tiene un solo archivo de test. **Es una decisión para Facu:** si
  se quieren conservar, el lugar y la convención los tiene que fijar el chat de
  arquitectura, de una vez para los ocho módulos.
