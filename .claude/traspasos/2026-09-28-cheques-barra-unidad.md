# Traspaso — Cheques: la cartera filtra por la barra de unidad (28/09/2026)

Prompt para el chat de arquitectura. Quien lo recibe no vio nada de este trabajo: todo lo necesario está acá.

## Qué cambió y por qué

Desde `5592f5a` toda la app tiene una **barra de unidad de negocio arriba** (`js/barra-unidad.js`: `unidadesDeLaBarra()`, `alCambiarUnidad(fn)`, `pasaFiltroUnidad(unidadId, elegida)`). La cartera de cheques —la región `<!-- ══ CHEQUES: inicio` … `<!-- ══ CHEQUES: fin` de `modulos/administracion.html`— tenía **su propio filtro "Unidad"** (`#chq-filtro-unidad`, del 22/09/2026). Dos filtros de unidad en la misma pantalla que pueden decir cosas distintas es justo lo que la barra vino a evitar, así que la cartera pasó a obedecer a la barra y el filtro propio se retiró.

Solo se tocó la región de Cheques. Cero SQL, cero RPCs nuevas, cero policies, cero permisos, cero datos. No se tocaron `js/barra-unidad.js`, `css/main.css`, `js/*`, `dashboard.html` ni CLAUDE.md.

### Commits (rama `worktree-agent-a4e224fa7e6c54b64`, sin push)

- `fbf1d6d` feat(cheques): la cartera filtra por la barra de unidad de arriba; se retira el filtro Unidad propio
- `abff54d` test(cheques): suite de la barra de unidad en la cartera; singular en la nota de los sin unidad
- (el tercero, con este traspaso) test(cheques): mutaciones de la barra de unidad

## Cómo quedó (lo que hay que escribir en CLAUDE.md)

- **La unidad elegida en la barra filtra la lista y la tabla** (`chequesDeLaUnidad(filas, elegida, cobranzas, mantener)`, con la MISMA regla de la barra: `pasaFiltroUnidad`). Un cheque es de la unidad de su cobranza (`v_cobranzas.unidad_negocio_id`).
- **Los cheques SIN unidad siempre se ven** (su cobranza no se asentó todavía, o no se ve): no desaparecen por no tener unidad. En la tabla siguen con su "Sin unidad" gris en la columna Unidad; **en el celular, con una unidad elegida, llevan "Sin unidad" al principio del segundo renglón** (`.chq-tarjeta__sin-unidad`, 600, no se corta). Con "Todas" no llevan esa marca (como antes).
- **La columna "Unidad" se queda**, ordenable, igual que antes.
- **El total en cartera es de la unidad elegida**: con una unidad, el total y la cantidad son SOLO los de esa unidad (es su plata) y el título dice "En cartera · <unidad>"; los sin unidad, que se ven en la lista, **no suman** y van en una línea aparte: "Además se ve(n) N cheque(s) sin unidad ($ X), que no suma(n) acá: su(s) cobranza(s) todavía no tiene(n) unidad." Con **"Todas"** es la suma de todo y, si hay más de un grupo, una línea con el **desglose por unidad** ("Cucuruchos Nuss $ … · Sin unidad $ …"), "Sin unidad" al final.
- **Antes de que lleguen las cobranzas** no se sabe de quién es cada cheque: con una unidad elegida se dice **"Calculando el total de la unidad…"** y NUNCA se muestra el total de todas como si fuera el de la unidad; si la carga falló, "No se pudo calcular el total en cartera" (no "calculando" para siempre).
- **"N cheques vencen esta semana"** cuenta, con una unidad elegida, los de la unidad **y los sin unidad** (es lo que muestra la lista al tocarlo), y lo dice: "· 1 sin unidad".
- **Cambiar la unidad en la barra repinta sin recargar y sin volver a consultar** (la unidad se filtra en la pantalla: `alCambiarLaBarra`). Si cambió de verdad, **limpia la selección** con el aviso de siempre (lo elegido podría quedar escondido y seguir contando); elegir la misma no limpia nada.
- **Al abrir**, la unidad de la barra se pide en paralelo con el catálogo de bancos y se aplica ANTES de la primera consulta, así la lista no aparece un instante con los cheques de todas las unidades.
- **La lista vacía con una unidad elegida lo dice**: "No hay cheques en cartera. Arriba está elegida <unidad>: con «Todas» se ven los de todas las unidades."
- **`?cheque=<uuid>` de otra unidad** se muestra igual (es el que se pidió) y se dice por qué: "El cheque que abriste es de <unidad>: se muestra aunque arriba esté elegida <otra>." No suma al total de la unidad elegida.
- **Dar salida con "Todas"** sigue andando: se pueden elegir cheques de dos unidades y darles salida juntos (la RPC no pide unidad).
- **La unidad NO es un filtro de la cartera**: no cuenta en "Limpiar filtros", "Limpiar filtros" no la toca, no se guarda en las preferencias (`sessionStorage`), y una preferencia vieja con `filtros.unidad` se ignora.
- **Todo texto de la base va escapado** (el nombre de la unidad en el título, el desglose y las notas; los avisos van por `textContent`).

### Lo que se RETIRÓ

- `#chq-filtro-unidad` (el `<select>`) y `#chq-campo-unidad` (su cajita), `pintarSelectorUnidades`, su `change`, `estado.filtros.unidad` y su lugar en las preferencias. Declarados retirados, con su motivo, en `pruebas/controles-cheques.js` (`RETIRADOS_CHEQUES` / `RETIRADOS_IDS_CHEQUES`). El baseline de controles sigue siendo `4435cdc`: **no hay que reescribir ningún baseline al integrar por cherry-pick.**

### Lo que no se puede filtrar (dicho en la pantalla o anotado)

- **El tope de 1000 filas de PostgREST** sigue igual: si la consulta llega, la pantalla ya lo avisa ("el total puede estar incompleto" / "el orden es solo sobre esas"); con una unidad elegida el filtro se aplica sobre esas mil.
- **La burbuja del dashboard `cheques/por_vencer`** (de `mis_pendientes()`) cuenta **todas las unidades**, no la de la barra: es de la base y del dashboard, no de esta región. Con una unidad elegida, el número de la tarjeta puede ser mayor que el "vencen esta semana" de adentro. Si se quiere que coincida, es trabajo de base (o del dashboard): anotado, no hecho.
- **Quien tiene `cobranzas:procesar` sin `ver_todo`** sigue viendo solo sus cobranzas (la policy): el aviso de cartera incompleta sigue.

## Qué se verificó y contra qué

- `node pruebas/check-bytes.js` y `node pruebas/correr-todo.js`: **126/126** en verde (check-scripts, todas las `test-*.js` y todos los `controles-*.js`); `check-bytes`: 415 archivos, 0 CR, 0 NUL.
- Suite nueva `pruebas/test-cheques-barra-unidad.js`: **66/66**, ejecutando los renders con un `document` falso sobre la región real (`sandbox-cheques.js` / `fuente-cheques.js`), baseline fijo `5592f5a` (exige que ahí existiera `#chq-filtro-unidad`, para que la prueba mida algo).
- Mutaciones, de a una: `mut-cheques-barra-unidad` **39/39**; `cargo` 7/7; `celular` 26/26 (+6 eq.); `colores` 52/52 (+2 eq.); `lote` 18/18; `orden` 24/24 (+6 eq.); `plazo` 23/23 (+1 eq.); `seleccion` 22/22; `unidad` 23/23 (+1 eq.); `vista` 53/53; `mut-administracion-cheques` 18/18.
  - **Tres runners viejos se ajustaron, sin aflojar nada:** `mut-cheques-plazo.js` («el error del resumen deja los vencimientos viejos») y `mut-cheques-vista.js` («la cartera con error queda en cero») abortaban porque su ancla dejó de ser única (`recalcularResumen()` tiene los mismos renglones); se anclaron a `estado.filasResumen = null`, el catch que siempre mutaron, y siguen detectando. `mut-cheques-celular.js` declara equivalente `esc(TEXTO_SIN_UNIDAD)` (la marca nueva del celular es una constante sin nada que escapar).
  - Una mutación se declaró EQUIVALENTE y no se corre (está escrita en el runner): pasar a `true` la guarda `estado.cobranzasListas` del desglose de "Todas". Antes de las cobranzas `estado.cobranzas` es un Map vacío, todo cae en "Sin unidad", queda un grupo y no hay desglose igual.
- **Suites que cambiaron** (no se aflojaron: lo que se sacó era del selector retirado y lo exige ahora la suite nueva, con la barra):
  - `test-cheques-unidad.js` (44/44): se fue el bloque del filtro, el selector, su `change` y las preferencias; el resto (columna, orden, "Sin unidad" gris, desglose de la selección, consultas) sigue igual.
  - `mut-cheques-unidad.js`: de 43 a 23 mutaciones; las 20 que se fueron mutaban el selector y su filtro, que ya no existen. Lo que protegían (filtrar en la pantalla, los sin unidad, limpiar la selección, no volver a consultar) está en `mut-cheques-barra-unidad.js` (39 mutaciones).
  - `test-cheques-vista.js`: un renglón que miraba el selector.
  - `sandbox-cheques.js`: las funciones nuevas en su lista, y un doble de `js/barra-unidad.js` (`__barra`, `__oyentesBarra`, `__elegirEnBarra`) con la `pasaFiltroUnidad` real.
  - `seguras-cheques.js`: las interpolaciones nuevas ya escapadas o constantes, con su motivo.
- **Mirado en la maqueta** (`node e2e/maqueta/servir.js`, `?maqueta=administracion&seccion=cheques`, con los datos que ya existían: cheques de Cucuruchos, de Dolce Pasta y sin unidad) a **1280 y 390 px**: sin scroll horizontal (390/390; 1265/1280), sin errores de JavaScript; con "Todas" el total 1.022.601,00 con su desglose; con Cucuruchos 537.300,50, 2 cheques y la línea de los 3 sin unidad; con Dolce Pasta "$ 0,00 · 0 cheques" (un cero de verdad: no tiene cheques en cartera) y los 3 sin unidad a la vista; en el celular la marca "Sin unidad" primero, sin desbordar el renglón. **No hizo falta un juego de datos nuevo** (`administracion.json` ya trae las tres situaciones).

## Lo que NO se probó

- Nada con sesión real ni contra la base (cero RPCs ejecutadas; Supabase en solo lectura).
- La barra de verdad en un navegador con una cuenta real de varias unidades (en la maqueta la barra es la real, con datos falsos).
- `e2e/5-maqueta.spec.js` y `e2e/7-barra-unidad.spec.js` no se editaron (no son de este territorio). **Sugerencia para el coordinador:** en `5-maqueta.spec.js`, la entrada de Cheques de `PANTALLAS` (`administracion.html?maqueta=administracion&seccion=cheques`) podría recorrer además un clic en `.barra-unidad__chip[data-unidad="u-n"]` y en `[data-unidad="u-d"]` a 390 y 1280, y en `7-barra-unidad.spec.js` sumar la cartera de Cheques a las pantallas que obedecen a la barra. Datos: `administracion`.

## Guion para Facu (en la app, con tu cuenta)

1. Abrí Administración → Cheques con "Todas" arriba. Anotá el total en cartera y mirá que abajo diga cuánto es de cada unidad.
2. Tocá arriba una unidad (por ejemplo Cucuruchos). Sin recargar, la lista tiene que quedarse con los cheques de esa unidad **y** los que dicen "Sin unidad"; el total tiene que decir "En cartera · Cucuruchos Nuss" y ser solo de esa unidad, con una línea aparte para los sin unidad.
3. Mirá el botón "N cheques vencen esta semana": si alguno es sin unidad, tiene que decir "· 1 sin unidad".
4. Tocá "Seleccionar", marcá dos cheques y cambiá la unidad de arriba: la selección se tiene que limpiar con un aviso.
5. Con "Todas", marcá dos cheques de unidades distintas (ya asentados) y fijate que "Dar salida" te deje (no lo confirmes si no querés sacarlos).
6. En el celular, con una unidad elegida: los cheques sin unidad tienen que decir "Sin unidad" al principio del segundo renglón, sin que se corte.
7. Elegí una unidad que no tenga cheques: la pantalla tiene que decir que arriba está elegida esa unidad y que con «Todas» se ven los demás.
8. Abrí un cheque desde Cobranzas ("Ver en Cheques") que sea de otra unidad que la elegida arriba: se tiene que ver igual, con un aviso que diga de qué unidad es.

## Qué automatizaría ahora

Lo más caro que se repitió en esta parte fue **ajustar a mano el doble de `js/barra-unidad.js` en el sandbox de cada módulo** (cada subagente de esta tanda arma el suyo). Propuesta: un `pruebas/barra-unidad-comun.js` con el doble compartido (`unidadesDeLaBarra` que devuelve lo que se le da, `alCambiarUnidad` que guarda los oyentes, un `emitirCambio(eleccion)` y la `pasaFiltroUnidad` REAL leída del archivo), para que cada sandbox lo pegue en una línea y la regla probada sea la de la barra y no una copia. Segundo: que `5-maqueta.spec.js` recorra la barra (Todas + cada unidad) en toda pantalla que la obedece, en vez de una lista a mano.

## Prompt de actualización de CLAUDE.md

En la sección **Módulos → 9. Cheques**, reemplazar el renglón que empieza con **"La unidad de negocio de cada cheque** (22/09/2026, `f4d1a0f`, A2)" por uno que diga, en este orden:

- **La unidad de cada cheque** es la de su cobranza (`v_cobranzas.unidad_negocio_id` / `unidad_negocio_nombre`). Columna "Unidad" ordenable ("Sin unidad" en gris, siempre al final) y, en el resumen de la selección, el desglose por unidad cuando los marcados son de más de una.
- **Desde el 28/09/2026 la cartera obedece a la BARRA DE UNIDAD de arriba** (`js/barra-unidad.js`) y **se retiró su filtro propio** (`#chq-filtro-unidad` / `#chq-campo-unidad`, declarados en `controles-cheques.js`): filtra con `pasaFiltroUnidad` en la pantalla, sin volver a consultar, y repinta al cambiar la barra (limpia la selección si cambió). **Los sin unidad siempre se ven** (en el celular, con una unidad elegida, "Sin unidad" al principio del segundo renglón). **El total en cartera es el de la unidad elegida** ("En cartera · <unidad>"), los sin unidad aparte y sin sumar; con "Todas", la suma con el desglose por unidad; antes de las cobranzas, "Calculando el total de la unidad…", nunca el total de todas. "Vencen esta semana" cuenta la unidad y los sin unidad y lo dice. El vacío y un `?cheque=` de otra unidad se explican. La unidad no es un filtro (ni en "Limpiar filtros" ni en las preferencias). **La burbuja `cheques/por_vencer` del dashboard sigue contando todas las unidades.** Suite `test-cheques-barra-unidad.js` (66/66; mut 39/39). Detalle en `.claude/traspasos/2026-09-28-cheques-barra-unidad.md`.

Y en **REGLA DE ORO — Las suites de verificación viven en `pruebas/`**, en el renglón de la tanda del 28/09/2026 (o uno nuevo): `test-/mut-cheques-barra-unidad.js`; `sandbox-cheques.js` trae un doble de `js/barra-unidad.js` con la `pasaFiltroUnidad` real.

No hacen falta tareas ni permisos nuevos: no hay segundo archivo para el chat de permisos.
