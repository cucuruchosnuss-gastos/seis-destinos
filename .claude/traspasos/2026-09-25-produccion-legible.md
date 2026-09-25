# Traspaso — Producción, terminar la tablet, parte 5: lo que se leía mal (25/09/2026)

Autocontenido: quien lo lee no vio nada del trabajo.

## Qué cambió

Solo `modulos/produccion.html` y sus suites. **Cero SQL corrido** (Supabase en solo lectura). Ninguna RPC, tabla, policy ni tarea cambió.

1. **El renglón de lo producido dice una sola vez qué es.** Antes: "Caja con cono · con cono · Común · caja ×320". Ahora: "Mini · con cono · Caserato · caja ×320 · Caja N°1 Nuss · bolsa grande". Lo arma `partesProducido()`, la misma en la planilla y en el historial.
2. **Listas de masas** (planilla, sala e historial): SIMPLE / DOBLE grande; chip "Modificada" en bordó solo cuando lo es; "Chocolate" solo con cacao; Original y Anterior sin chip.
3. **Buscador de conos**: filtra en cada tecla desde la primera letra, sin acentos; solo activos (aprobados y pendientes, estos con "nuevo, a revisar"); rechazados e inactivos nunca.

El detalle está en CLAUDE.md, módulo 10, bloque "LO QUE SE LEÍA MAL".

## Cómo se retomó

Commit del código: `5ca92bb`. La sesión anterior se cortó con el trabajo sin commitear, guardado en `traspasos-pendientes/tablet-parte5-a-medias/` (un patch contra `3918fd8` y copias de los archivos). El patch se aplicó limpio sobre `main` (`6fd89b6` solo tocaba docs) y el resultado quedó **igual byte a byte** a las copias. Se auditó contra a/b/c y se corrieron todas las suites, los controles y las mutaciones antes de commitear. **Las anclas de las `mut-*` de otras suites que el LEEME daba por "a medio acomodar" resultaron estar bien**: todas las mutaciones corren y se detectan (números abajo).

## Decisiones tomadas sin preguntar

- **"sin cono" solo aparece si ese producto tiene alguna presentación con cono.** En un Vaso o una Oblea no hay nada que distinguir y sería ruido.
- **Las unidades por caja salen del renglón guardado**, no del catálogo de hoy: cambiar una presentación no toca lo ya producido (la misma regla de la base).
- **"Sin bolsa" no se nombra** en el renglón (es lo que no se consumió).
- **Un cono que se dio de baja después de cargar el sublote se sigue nombrando**: la planilla lo lee por id. Si esa lectura falla, "Cono que ya no está", sin voltear la planilla.
- **Proponer un cono con el nombre de uno dado de baja**: `proponer_marca` devuelve `ya_existia: true` con el id del inactivo. Antes la pantalla lo agregaba a la lista (y se podía usar un cono inactivo); ahora dice *"Ese cono existe pero está dado de baja. Pedile a quien configura producción que lo reactive, o elegí otro."*. **No se reactiva desde la tablet**: es una decisión de configuración.
- **Uno nuevo de quien tiene `produccion:configurar` entra al catálogo local como `aprobada`**, igual que lo guarda la base (verificado en `pg_get_functiondef` de `proponer_marca`); antes se lo marcaba "a revisar" aunque no lo estuviera.
- **El chip de origen sigue en la cabecera de la receta que se está armando** (ahí dice de dónde sale esa masa), con "Modificada" también en bordó para que diga lo mismo en los dos lugares.
- **En la tablet vertical se esconde la hora y no el tamaño**, porque SIMPLE / DOBLE pasó a ser lo grande de la fila.
- **Andamio: `pruebas/controles-comun.js` ya no inventaría el `<style>`.** Al sumar a `controles-produccion.js` los baselines de las partes 1 a 4 (`fe90f24`, `672cf2b`, `7bf9846`, `3918fd8`), el comentario CSS *"ya no es un `<select>` del sistema"* de la parte 3 se leía como un control y aparecía como "perdido". El CSS no tiene controles. Se corrieron los cinco `controles-*` después del cambio: todos en verde, con los mismos totales en cheques, cobranzas, pedidos y stock.

## Lo verificado contra la base (25/09/2026, solo lectura)

- `marcas_personalizadas`: **351 conos, 26 activos (aprobados), 325 inactivos (aprobados), 0 pendientes, 0 rechazados.** CHECK de `estado_alta`: `aprobada` / `pendiente_revision` / `rechazada`.
- `proponer_marca`: si el nombre existe y está rechazado, lanza; si existe, devuelve `{marca_id, ya_existia: true}` **sin mirar si está activo**; si no, lo crea `aprobada` con `configurar` o `pendiente_revision` con solo `cargar`.

## Números al cerrar

Todo con `TZ=UTC`, las mutaciones **de a un runner por vez**.

- `check-scripts.js`: OK.
- **Las 74 suites y chequeos de controles del repo, en verde.** Las de Producción: legible **99/99** (nueva), abrir 162, acceso 26, cierre 248, color 60, config 208, empaque 247, historial 121, lotes 74, masa 219, paradas 105, pin 144, quien 130, sesion 91, sin-empaque 118, xss 6; dashboard-produccion 27, accesos-produccion 20.
- Controles: produccion **2464/2464** (ahora con los baselines de las partes 1 a 4), cheques 181, cobranzas 327, pedidos 315, stock 991.
- Mutaciones: **legible 45/45 (+26 eq.)**, abrir 92/92 (+2), acceso 13/13, cierre 154/154 (+34), color 28/28, config 182/182 (+8), empaque 146/146 (+14), historial 99/99 (+14), lotes 41/41 (+2), masa 121/121 (+9), paradas 57/57 (+15), pin 71/71 (+2), quien 57/57 (+2), sesion 40/40 (+1), sin-empaque 51/51, dashboard-produccion 14/14.
- **Anclas reapuntadas** (apuntaban al código que la parte 5 reemplazó, y el runner abortaba con "NO EXISTE" antes de correr): cierre (el chip de origen → `chipsDeMasa`; el cono que ya existía → el aviso de dado de baja; el `select` de masas con `es_chocolate`), empaque (cinco: la caja, el embolsado y los dos escapes pasan a `partesProducido` / `nombreCajaItem`), historial (los dos del chip de chocolate → `chipsDeMasa`). **Y una de lotes que venía rota desde la parte 4**: "el foco no da la vuelta" dejó de ser única cuando el editor de paradas copió la trampa de foco; se ancló con el `querySelectorAll` propio del panel de lotes.

## Qué NO se pudo probar

- **Nada en un navegador real ni contra la base**: todas las suites corren contra un doble de supabase. No se miró renderizado a 1280×800 ni a 800×1280 (la tablet vertical) el renglón nuevo ni SIMPLE / DOBLE grande; tampoco el buscador tipeando en una pantalla táctil.
- Hoy no hay ningún cono pendiente ni rechazado en la base, así que en la tablet real no se va a ver el chip "nuevo, a revisar" hasta que alguien proponga uno sin `configurar`.

## Guion para que Facu pruebe la tablet de punta a punta

En la tablet (o en la compu a 1280×800), con una cuenta que tenga `produccion:cargar` en Cucuruchos Nuss. Recargá con Ctrl+Shift+R antes de empezar, para no correr el HTML viejo.

1. **Entrar con PIN.** Abrí Producción. Arriba tiene que decir PRODUCCIÓN (oscuro) y "Tocá para entrar". Tocá, elegí al encargado y poné su PIN en el teclado de la derecha. Si es la primera vez, te pide elegir uno propio dos veces.
2. **Abrir turno.** "Abrir turno" → la fecha de hoy, el turno, tildá una máquina y agregale un operario. Confirmá: tiene que aparecer el LOTE grande. Anotalo.
3. **Tres masas.** Tocá SALA DE MASA arriba (ya no tiene que estar punteada). Entrá con el PIN del masero; con una sola máquina abierta te lleva directo.
   - Masa 1: Simple → "Usar la original" → cargá los lotes (primera del día: vienen vacíos) → Registrar.
   - Masa 2: Doble → "Usar la anterior" → Registrar (los lotes tienen que venir puestos).
   - Masa 3: Simple → "Modificar" → cambiá una cantidad y poné cacao → Registrar.
   - **Qué mirar (parte 5):** en "Masas del turno", la columna de tamaño dice **SIMPLE / DOBLE / SIMPLE** en grande. La 1 y la 2 **sin ningún chip**; la 3 con **"Modificada" en bordó** y **"Chocolate"**.
4. **Cargar productos con su caja.** Volvé a PRODUCCIÓN (te pide el PIN del encargado otra vez). Entrá a la planilla de la máquina → "Agregar producto":
   - Producto (ej. Mini) → Con cono → la presentación → en el buscador de conos escribí **una sola letra**: la lista tiene que achicarse sin apretar nada, y **no** tiene que aparecer ningún cono dado de baja. Probá escribir sin acento. Elegí uno (ej. Caserato) → la caja viene puesta (Caja N°1 Nuss) → el embolsado → las cajas → Agregar.
   - **Qué mirar:** el renglón dice **"Mini"** arriba y abajo, en una sola línea, **"con cono · Caserato · caja ×320 · Caja N°1 Nuss · bolsa grande"**, sin nada repetido.
   - Cargá un segundo producto "Sin cono" y fijate que diga "sin cono" y no nombre ningún cono.
   - Opcional: "+ Agregar cono nuevo" con el nombre de un cono que sepas que está dado de baja → tiene que decir que está dado de baja y no agregarlo.
5. **Una parada anotada después.** En Paradas → "Anotar una parada": poné la hora en que paró y la hora en que volvió con − / + (o tocando el número), un motivo, Guardar. Tiene que aparecer en la lista. Tocá "Corregir", cambiá la hora de vuelta y guardá.
6. **Cerrar la planilla.** "Cerrar planilla" → hora en que se apagó el fuego, scrap, observaciones → Cerrar. Tiene que volver al tablero con la máquina libre; si era la única, SALA DE MASA se apaga (punteada) y el masero queda afuera.
7. **Historial, en la compu.** Con una cuenta con `produccion:ver`: Historial → el turno recién cerrado. Los sublotes tienen que decir lo mismo que en la planilla ("Mini · con cono · Caserato · caja ×320 · …") y la cuenta "N cajas = M unidades"; las masas con SIMPLE / DOBLE y los mismos chips que en la sala.

Si algo no se ve como dice acá, mandame una foto de la pantalla y en qué paso fue.
