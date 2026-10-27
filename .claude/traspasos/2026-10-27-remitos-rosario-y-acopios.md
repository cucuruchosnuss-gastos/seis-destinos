# Traspaso 27/10/2026 — remitos-rosario y acopios (las dos integradas)

Cola de la tanda del 27/10/2026: `ci-prueba/remitos-rosario` y después `ci-prueba/acopios`. Ninguna toca
modulos/produccion.html. Pedidos: `.claude/pedidos/2026-10-27-remitos-rosario.md` y
`.claude/pedidos/2026-10-27-acopios.md`. Estado de la pausa del mediodía:
`2026-10-27-pausa-ci-prueba-remitos-rosario.md`.

## 1. remitos-rosario — integrada
- Rama `ci-prueba/remitos-rosario` = `e9d8140`. Partes: A) ocr `b4dc862`, B) subir `d30b731`, C+D) revisar `2dbdf16`.
- Integrada en `main` = `d3fcd9c` (respaldo `respaldo/antes-de-remitos-rosario` = `dd1397d`; tag de la tanda
  `antes-de-remitos-rosario-2026-10-27` = `e698bc0`). GitHub en `d3fcd9c`: Pruebas, Navegador y Pages en verde.
- Qué hay: A) Edge Function `supabase/functions/ocr-remito/index.ts` (talonario oficial/acopio, renglones a omitir,
  reglas de lectura de Rosario). B) "Subir remitos Rosario" en la Carga (modulos/retiros.html) con "Mis remitos
  subidos". C) Revisión de precargados en Administración → Órdenes (foto con zoom, encabezado y renglones editables,
  amarillos, Aceptar sugerencia, No va en la orden, Guardar / Volver a leer / Confirmar / Descartar, "Descartar (ya
  ingresado)", solapas Oficial / Acopio por N°). D) "Remito N° X" / "Acopio N° X" en la ficha, la hoja y el PDF
  (`textoRemitoHoja` en js/retiros-comun.js).
- Probado: `npm run pruebas` 310/310 en la rama y en la integración; test/mut-ocr-remito (125, 85/85),
  test/mut-retiros-subir-remitos (154, 116/116), test/mut-administracion-remitos-precarga, test/mut-retiros-hoja-remito;
  e2e 70 y 71 a 390 y 1280; GitHub verde en la rama y en main.
- Salió mal: el ensayo dio rojo cuatro veces, siempre por la compu (sin red un rato; suites de 23 min contra un tope de
  20; el navegador cortado a los 42 min con 885 en verde, 0 fallas y 61 sin correr). En el último, la única suite roja
  fue test-ensayo porque yo había subido el tope a 30 para esa corrida.

## 2. acopios — integrada
- Rama `ci-prueba/acopios` = `4d37eeb` (código `bb0c2ae`, después traer main dos veces: con remitos `94e9d1b` y con
  ocr-cobranzas-tickets de la otra sesión). Integrada en `main` = `4c68f45` (respaldo `respaldo/antes-de-acopios` =
  `b03c70a`). GitHub en `4c68f45`: Pruebas, Navegador y Pages en verde.
- Qué hay: sección Acopios (lista con "Quedan N de M cajas", detalle con cada retiro, Nuevo acopio, Anular con motivo),
  acopios activos y "Cuenta en el grupo" en la cuenta del cliente, saldo del acopio al revisar un remito Acopio (amarillo
  "No hay acopio de esto para el cliente"), "(también en Nuss)" en los buscadores y valorizar con la lista de otra
  empresa (`_presentacion_en_unidad`). Detalle en docs/memoria/administracion.md, "Acopios (27/10/2026)".
- Probado: 312/312 con main en d3fcd9c (rama e integración) y 313/313 con main en b03c70a; mut-administracion-acopios 113/113 (+27
  equivalentes), mut-administracion-lista-otra-empresa 11/11; e2e 72 a 390 y 1280; GitHub verde en la rama y en main.
- Choques al traer main: valorizar (la lista de otra empresa de acopios y el precio por unidad de venta-por-unidad,
  quedaron los dos) y una línea de mut-administracion-ordenes.

## Decidido sin consultar
- Integrar con el ensayo en rojo por la compu: lo que entró a main es idéntico (0 líneas de diferencia) a la rama que dio
  310/310 (remitos) y 313/313 (acopios) en verde acá y Pruebas + Navegador en verde en GitHub. En acopios no se repitió el ensayo por lo mismo.
- Acopios se integró dos veces: el primer merge (0d3f619, sin pushear) quedó viejo porque main avanzó (b03c70a) mientras
  corría `npm run pruebas`. En el segundo no se repitieron los 20 min: el merge era idéntico (0 líneas) a la rama
  4d37eeb que acababa de dar 313/313 + check-bytes y GitHub en verde; se corrieron check-bytes y check-scripts y se
  pusheó solo si main seguía en b03c70a.
- El merge `e9d8140` quedó con el mensaje automático de git (sin la línea Co-Authored-By); no se enmienda.
- Remitos: el cliente se busca entre los activos de la fábrica; los insumos se piden en su unidad (kg / un.); zoom propio
  para la foto. Acopios: la equivalencia de la lista de otra empresa la hace la pantalla (precio_venta no la usa).

## Lo que no se pudo probar / falta en la base (para el chat de la base)
- `ocr-remito` NO está desplegada: desplegar con verify_jwt y el secret `OCR_REMITO_MODELO` (si falta, usa
  claude-sonnet-4-6). Sin eso, la foto sube y queda "sin leer" (Volver a leer la reintenta).
- Manuel (solo retiros:cargar) no puede leer ordenes_retiro: en "Mis remitos subidos" ve "Confirmado: ya es una orden"
  sin el código. Hace falta una columna `orden_codigo` en remitos_precarga o una RPC de lectura.
- `mis_ordenes_retiro` no devuelve `numero_remito`: en la Carga, una orden guardada no imprime "Remito N°" hasta eso.
- Nada se probó con fotos reales ni con las sesiones reales de Manuel y Yanina: todo con la maqueta y suites.
- FERNANDEZ RICARDO con la Lista 1 de Nuss: probado con datos de prueba armados como la base (verificada 27/10), no
  valorizando una orden real.

## Qué automatizaría ahora
1. El tope del navegador del ensayo según la compu: hoy 955 pruebas no entran en 45 min acá (en GitHub sí). Que el
   ensayo corra el navegador en dos mitades en paralelo con dos puertos, o que con GitHub ya en verde sobre el mismo
   árbol solo corra los specs que alcanza el cambio (`npm run pruebas:rama` para e2e).
2. El script de choques "los dos lados con la misma cola" (dos funciones nuevas que terminan igual) a una skill:
   pasó dos veces hoy (remitos y acopios).
3. `pruebas/edge-falsa.js`: correr el index.ts de cualquier Edge Function con fetch, Deno y supabase falsos (lo de
   test-ocr-remito), para las otras seis.
