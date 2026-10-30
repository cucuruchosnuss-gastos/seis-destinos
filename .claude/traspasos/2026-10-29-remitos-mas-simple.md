# Traspaso 29/10/2026 — Remitos Dolce más simple (un solo recorrido)

Pedido: `.claude/pedidos/2026-10-29-remitos-mas-simple.md`. Rama `ci-prueba/remitos-mas-simple`, salida de
`origin/ci-prueba/recibir-entre-empresas` = 2003aa3 y rebasada sobre ac11ce8 (la base se movió), en un git worktree aparte. **No se integró** (lo audita otro chat
y se integra de noche, después de `ci-prueba/recibir-entre-empresas`). Patch: `/tmp/remitos-mas-simple.patch`.

## Qué cambió (para Facu)
- **Subir es todo el recorrido**: Manuel saca la foto; cuando la IA termina, el remito queda en **naranja "Listo para
  cargar lotes"** (con el N°, el cliente y cuántos renglones). Lo toca y se abre el remito ahí mismo: corrige, carga los
  lotes ("Lotes: 25 de 31 cajas · falta repartir 6 cajas") y confirma. Vuelve solo a Subir y la tarjeta queda en
  **verde "Orden cargada · D-0042"**. "‹ Remitos" vuelve a donde estaba. El guardado automático sigue igual.
- **La otra pestaña se llama "Órdenes cargadas"**: arriba los que quedaron sin terminar (de cualquiera, para que otro
  los termine) y abajo las órdenes por N° de remito, con un buscador por número. Los links de la Carga y de
  Administración siguen andando (no se tocaron).
- **Conos**: ya no aparece la lista de 12 conos de entrada. Hay que escribir 2 o 3 letras; salen primero los que
  empiezan así, en una lista con scroll; al elegir se cierra y queda "Cambiar". El que leyó la IA ya viene elegido.
- **Unidades por caja**: cada renglón dice "Barquillo 40 x4 · Caja con cono **× 252 u.** · GLACE" (o "× 180 u." en la
  Caja N°2). Buscar "180" o "216" encuentra esas cajas. También se ve en Administración → Nuevo acopio.
- El sello del renglón dudoso dice "Controlar" (y ahora sí sale amarillo: antes los sellos de color salían grises).

## Detalle técnico
`docs/memoria/remitos-dolce.md`, sección "Un solo recorrido". Verificado en la base (SELECT, 29/10/2026):
`producto_presentaciones` (unidades_por_caja integer not null, media_caja), `remitos_precarga` (orden_codigo, cliente_id,
cliente_leido, items), la política de lectura de `remitos_precarga` y `clientes` (retiros:cargar alcanza) y el final de
`confirmar_remito_precarga` (devuelve `codigo`, `numero_remito`, `talonario`; deja `orden_codigo`).

## Pruebas
- Nueva `test-/mut-remitos-dolce-mas-simple.js` (112; mut 77/77 sobre el módulo y `js/remitos-comun.js`, baseline 2003aa3:
  da ROJO sobre ese commit).
- Ajustadas: `test-remitos-dolce-subir.js` (156; mut 125/125 +2 eq. — antes de reforzarla escapaban 4 escapes del
  botón nuevo), `test-remitos-dolce-revisar.js` (188; mut 98/98 +55 eq.; el escape del aviso de orden interna escapaba
  ya en la rama base), `test-remitos-dolce-interna-lotes.js` (33; 15/15), `mut-remitos-dolce-autoguardado.js` (42/42),
  `mut-remitos-dolce-acopio.js` (13/13), `mut-administracion-link-remitos.js` (20/20), `mut-administracion-acopios.js`
  (99/99 +25 eq.). `sandbox-remitos-dolce.js` y `sandbox-administracion.js` con las funciones nuevas.
- Navegador: `e2e/99-remitos-mas-simple.spec.js` (4/4, 390 y 1280 px, maqueta nueva `remitos-dolce-mas-simple`) y
  70/71/72/98 ajustadas (28/28). Capturas mirados: lista con naranja/verde, conos con scroll, editor, verde, Órdenes cargadas.

## Decidido sin consultar
- Por dentro la pestaña sigue llamándose `revisar` (ids, `?pestana=revisar`, preferencia guardada): solo cambian los
  textos. Así los links de la Carga y Administración y sus suites no se tocaron.
- "Órdenes cargadas" muestra arriba "Sin terminar · para cargar lotes" (precargados, leyendo y los que no se pudieron
  leer, de cualquiera, como antes Revisar) y, si no hay ninguno, esa sección no aparece.
- El buscador de órdenes busca los DÍGITOS escritos en cualquier parte del N° ("3100" encuentra 0001-00003100).
- La tarjeta naranja dice "Cargar ›" a la derecha. El cliente: el elegido si ya se leyeron los clientes de esa fábrica
  (una lectura al costado), si no lo que leyó la IA, si no "sin cliente".
- Si el nombre de la presentación ya trae el número ("Vaso CERO · Caja ×1800", "Caja x 48") no se agrega "× N u."
  (quedaría repetido). Los miles con punto ("× 1.600 u."). Buscar "180" también encuentra "Caja ×1800" (lo contiene).
- Elegir el cono no saca el amarillo (como antes; elegir el producto sí). "Cambiar" en el cono abre el buscador vacío
  (con la pista) y ofrece "Dejar <cono>".
- El selector de producto ya tenía scroll: quedó igual, con la misma altura máxima que los conos (16rem).
- Los sellos de color (`.ad-sello.ad-sello--x`): la regla base los pisaba y salían grises; arreglado en el módulo.
- Rebasada sobre `origin/ci-prueba/recibir-entre-empresas` = ac11ce8 (la base se movió mientras trabajaba: trajo Stock
  "En camino" y el `c-d-paz` de la maqueta en su generador, que yo había arreglado igual: quedó el de la base). Las
  mutaciones siguen ancladas a 2003aa3 (el hash al empezar).

## Ensayo y suite completa
- `npm run pruebas`: 330/330 en verde (sobre ac11ce8 + esta rama). Antes del rebase daba rojo `test-administracion-xss.js`
  (la recepción de la base, sin justificar): lo arregló la propia base en abcb7b6.
- `npm run ensayo -- ci-prueba/remitos-mas-simple` con `BASE=origin/ci-prueba/recibir-entre-empresas`: se une sin chocar,
  suites VERDE; navegador ROJO en las dos mitades por specs de pantallas que esta rama no toca (Gastos 58/61, dashboard y
  Empleados en 5-maqueta, 13-comparar-administracion, 31, 66, 78, 89, dispositivos, 0-humo "la planta sin sesión").
  Las mismas specs (5, 13, 58, 61) fallan IGUAL sobre ac11ce8 sin esta rama en este contenedor (no llegan a lo de afuera):
  no son de acá. Las de Remitos Dolce (70, 71, 72, 98, 99) y Stock en camino (97): 36/36 en verde.

## Lo que no se pudo probar
- Contra la base real (Claude Code solo lee): todo con el doble de la suite y la maqueta.
- En un celular real: el scroll de la lista de conos se midió en Chromium a 390 px (overflow-y: auto, altura 16rem,
  se desplaza), no en un teléfono táctil.
- Que la lectura de clientes para nombrar la tarjeta ande con la cuenta real de Manuel (la política de `clientes` deja
  leer con retiros:cargar, verificada; no probada con su sesión).

## Qué automatizaría ahora
- **Un chequeo de "textos a la vista prohibidos" por módulo**: en este pedido hubo que buscar a mano cada "Revisar",
  "Precargado", "‹ Revisar" en el HTML, el script y 6 suites/specs. Una suite chica (`controles-textos.js`) con una
  lista por módulo de palabras que no pueden quedar en los strings visibles (sacando comentarios, ids y clases)
  lo haría en segundos y evitaría que vuelva una palabra vieja.
- **El arnés de escape que arma solo las marcas para cada `esc()` nuevo**: la mutación de Subir encontró 4 escapes sin
  prueba en el botón nuevo; un generador que, para cada función html listada en la mutación, pase marcas en todos los
  campos del objeto de entrada daría esa prueba sin escribirla a mano.

## Agregado del 30/10/2026: el cono de papel ilustración a la vista
Pedido de Facu (también en ci-prueba/valorizar-legible, cada rama en lo suyo): donde se nombre el cono de un renglón, si
es de papel ilustración (`marcas_personalizadas.papel_ilustracion`), "(ilustración)": "Barquillo 40 x4 · Caja con cono
× 252 u. · MARBET (ilustración)". En esta rama: el renglón y el buscador de conos de Remitos Dolce
(`nombreConoRemito` en js/remitos-comun.js) y la hoja de la Carga (`conoParaHoja` en modulos/retiros.html). Leído junto con
el catálogo de conos, nunca copiado a mano. Suites `test-/mut-remitos-dolce-ilustracion.js` (17; 14/14).
