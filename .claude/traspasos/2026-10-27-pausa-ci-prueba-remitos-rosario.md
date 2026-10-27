# Pausa 27/10/2026 — ci-prueba/remitos-rosario

Facu apagó la compu a mitad de la tanda. Nada se integró a main (main sigue en e698bc0). Tag de respaldo pusheado
antes de empezar: `antes-de-remitos-rosario-2026-10-27` (= e698bc0).

## Qué está hecho (en la rama ci-prueba/remitos-rosario, pusheada)
- f364914 / e6f2f8f — el pedido y su AGREGADO en `.claude/pedidos/2026-10-27-remitos-rosario.md`.
- a07a56c — une `ci-prueba/remitos-rosario-ocr` (b4dc862): **A) Edge Function `supabase/functions/ocr-remito/index.ts`**
  (sin desplegar; la despliega el chat de la base con verify_jwt y el secret OCR_REMITO_MODELO, default
  claude-sonnet-4-6), con el AGREGADO (talonario, omitir, reglas de lectura). `pruebas/test-ocr-remito.js` 125/125 (corre
  el index.ts de verdad con Deno/supabase/modelo simulados), `pruebas/mut-ocr-remito.js` 85/85 matadas. Sección en
  docs/memoria/arquitectura.md. correr-todo en esa rama: 304/304.
- `.claude/pedidos/2026-10-27-acopios.md` — la tarea siguiente de la cola, con su AGREGADO (lista de precios de Nuss).

## En qué iba
Paso: esperando las otras dos partes de remitos-rosario, que trabajaban en paralelo en carpetas propias
(`.claude/worktrees/agent-*`), cada una en su rama local:
- `ci-prueba/remitos-rosario-subir` — **B) Subir remitos Rosario** en modulos/retiros.html (+ test/mut-retiros-subir-
  remitos, maqueta retiros-remitos.json, e2e/70-subir-remitos.spec.js, sección en docs/memoria/retiros.md, sello
  "Acopio" en Mis remitos subidos).
- `ci-prueba/remitos-rosario-revisar` — **C) Revisar** en modulos/administracion.html (Remitos precargados · por revisar,
  foto con zoom, renglones editables, amarillos, Aceptar sugerencia, Guardar / Volver a leer / Confirmar / Descartar,
  listado por N° con solapas Oficial / Acopio, selector de talonario, "No va en la orden", botón "Descartar (ya
  ingresado)") y **D) "Remito N° X" / "Acopio N° X"** en la ficha, la hoja y el PDF (js/retiros-comun.js) (+ test/mut-
  administracion-remitos-precarga, test/mut-retiros-hoja-remito, maqueta administracion-remitos.json,
  e2e/71-revisar-remitos.spec.js, sección en docs/memoria/administracion.md).
Al pausar se les pidió commitear lo que tuvieran. Las dos quedaron en WIP y **pusheadas a origin** (solo la rama):

- **ci-prueba/remitos-rosario-subir = 3541693 (WIP)**, sale de f364914. Hecho: botón "Subir remitos Rosario" (solo con
  retiros:cargar en una fábrica sin control de stock; si hay varias, se elige), cámara + galería con varias fotos,
  1600 px JPEG 0,82, comprobantes/<uid>/remitos/<uuid>.jpg, crear_remito_precarga con client_uuid que se reusa y
  sobrevive a una recarga, ocr-remito sin esperar (de a dos), "Mis remitos subidos" de 7 días con miniatura, estados,
  Reintentar, sondeo y sello "Acopio". test-retiros-subir-remitos 143/143, e2e/70 4/4 a 390 y 1280, e2e 67 y 30 en
  verde, sección en docs/memoria/retiros.md. Cambio mínimo en e2e/maqueta/supabase-falso.js (upload acepta
  `globalThis.__maqueta.subir`), y sandbox-retiros.js y seguras-retiros.js con 4 nombres más.
  **Falta:** correr `node pruebas/mut-retiros-subir-remitos.js` (anclada a f364914; se cortó a mitad) y `npm run pruebas`
  completo; si dan verde, un commit nuevo sin "WIP".
  **Para el chat de la base:** quien solo tiene retiros:cargar (Manuel) no puede leer ordenes_retiro, así que en "Mis
  remitos subidos" ve "Confirmado: ya es una orden" sin el código de la orden. Para mostrarlo hace falta que la base
  le deje ver el código (por ejemplo, una columna orden_codigo en remitos_precarga o una RPC de lectura).
- **ci-prueba/remitos-rosario-revisar = a4349f3 (WIP)**, sale de f364914. Hecho: en administracion.html, Órdenes de una
  fábrica sin control: "Remitos precargados · por revisar" con contador; la pantalla de revisión (foto firmada con zoom
  100–300 %, encabezado con selector Oficial / Acopio y el buscador de clientes, renglones con el selector de la Carga,
  lotes, amarillo, Aceptar sugerencia, "No va en la orden" con deshacer, Guardar / Volver a leer / Confirmar /
  Descartar, "Descartar (ya ingresado)"); abajo las órdenes en solapas Oficial / Acopio por N°; "Remito N° X" y sello
  "Acopio" en la ficha; `textoRemitoHoja` en js/retiros-comun.js para la hoja, el PDF y el texto de compartir. 53
  suites de Administración y Retiros en verde, check-scripts y check-bytes OK.
  **En rojo:** `pruebas/test-administracion-xss.js` 5/6: faltan anotar en `pruebas/seguras-administracion.js` (cada una
  con su motivo) las interpolaciones de HTML ya escapado (`rmCab`, `rmDis`, `htmlFotoRemito(rm)` y otras).
  **Falta:** test/mut-administracion-remitos-precarga y test/mut-retiros-hoja-remito (baseline f364914), la maqueta
  administracion-remitos.json con renglones amarillos, e2e/71-revisar-remitos.spec.js, volver a correr e2e 67 y 69,
  mirar en la maqueta a 390 y 1280, la sección en docs/memoria/administracion.md, `npm run pruebas` y commit en verde.
  **Aviso para retiros.html:** si las órdenes guardadas en la Carga tienen que imprimir "Remito N°", al armar la hoja hay
  que pasarle `numeroRemito` y `talonario` a `htmlHoja`.
  Decidido sin consultar: el cliente se busca entre los activos de la fábrica que el módulo ya tiene cargados; los
  insumos se piden en su unidad (kg / un.), no en bultos; los insumos aparecen en el selector solo al buscar; zoom propio
  (js/ampliar.js no sirve para fotos).

Las carpetas de trabajo de cada parte siguen en `.claude/worktrees/agent-*` (se pueden retomar ahí o hacer checkout de
la rama).

## Qué falta de la cola
1. remitos-rosario: terminar lo que falta de B y C (arriba), unirlas con
   `git merge --no-ff` a ci-prueba/remitos-rosario, correr `npm run pruebas`, check-scripts, e2e 67/69/70/71, pushear la
   rama y esperar Pruebas + Navegador en verde. Después integrar (autorizado en el pedido): `npm run ensayo --
   ci-prueba/remitos-rosario`, respaldo `respaldo/antes-de-remitos-rosario`, merge --no-ff, pruebas, push, GitHub en verde.
   Recordar en el resumen: la Edge Function no está desplegada (la despliega el chat de la base).
2. acopios (`.claude/pedidos/2026-10-27-acopios.md`, base verificada el 27/10/2026): rama ci-prueba/acopios desde el
   origin/main que quede después de remitos-rosario (toca el mismo administracion.html). Sección Acopios, ficha del
   cliente, saldo del acopio en la revisión de un remito Acopio, Cuenta en el grupo, "(también en Nuss)" en el buscador
   y el AGREGADO de valorizar con la lista de otra empresa (_presentacion_en_unidad). Se integra apenas esté en verde.
3. Un solo resumen al final de las dos tareas.

## Aviso: otra sesión trabajó en la misma carpeta
A las 08:54 otra sesión cambió la carpeta compartida (`seis-destinos`) a main, hizo un merge local de
ci-prueba/mandar-filtro-fabrica (c5cbf50, main local sin pushear) y la pasó a ci-prueba/mandar-filtro-fabrica. Por eso
este traspaso cayó primero en esa rama (ad93ddc, ya pusheada por esa sesión con e61cd69 encima: son solo dos archivos de
.claude/, no se sacaron para no forzar trabajo ajeno). Acá quedó copiado en ci-prueba/remitos-rosario. Al retomar,
trabajar desde la carpeta `C:\Users\facun\proyectos\sd-remitos-rosario` (worktree de esta rama).

## Qué sigue
Retomar con la skill `retomar-sesion-cortada` si algo quedó sin commitear, y el punto 1 de arriba.

## Qué automatizaría ahora
La técnica de la suite de ocr-remito (correr el index.ts de una Edge Function con fetch, Deno y supabase falsos) a un
helper `pruebas/edge-falsa.js`: hoy las otras seis Edge Functions solo tienen pruebas que miran el texto.
