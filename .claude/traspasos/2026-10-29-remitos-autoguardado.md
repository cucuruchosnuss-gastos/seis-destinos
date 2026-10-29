# Traspaso 29/10/2026 — Remitos Dolce: autoguardado (sin botón Guardar)

Pedido: `.claude/pedidos/2026-10-29-remitos-autoguardado.md`. Rama `ci-prueba/remitos-autoguardado`, salida de
`origin/main` = 2d04d3e, trabajada en un git worktree aparte.

## Qué cambió (modulos/remitos-dolce.html, pestaña Revisar, adentro de un remito)
- **Ya no hay botón "Guardar".** Quedan Confirmar (crea la orden), Volver a leer y Descartar. Al lado de Confirmar, un
  estado chico: "Los cambios se guardan solos." al abrir, "Guardando…", "Guardado" o el error de la base tal cual (en
  bordó).
- Cada cambio se guarda solo con `actualizar_remito_precarga` (verificada con pg_get_functiondef el 29/10/2026). Lo que
  se toca, en seguida; lo que se escribe, 800 ms después de la última tecla y al salir del campo.
- Una sola llamada a la vez; la que vuelve manda lo que cambió mientras tanto. Una respuesta vieja no pisa lo nuevo.
- Confirmar espera el guardado en curso, manda lo pendiente y recién después confirma; si el guardado falla, no confirma.
- "‹ Revisar" con algo sin mandar lo manda y sale cuando la base respondió (si la base lo rechaza, se queda con el
  error; el segundo toque sale igual). Al esconder la página se manda ya; al cerrarla con algo sin llegar, el
  navegador pregunta.
- Volver a leer y Descartar esperan la llamada en curso y no mandan lo que estaba esperando (se pisa o se tira).
- El detalle: `docs/memoria/remitos-dolce.md`, "El autoguardado".

## Pruebas
- Nueva `test-/mut-remitos-dolce-autoguardado.js` (140; mut 42/42, baseline el módulo de 2d04d3e).
- `test-remitos-dolce-revisar.js` ajustada (185; mut 98/98 + 55 equivalentes). Sus 6 mutaciones de
  `js/remitos-comun.js` NUNCA habían medido nada ("error del test"): el runner mandaba la copia por
  `ARCHIVO_JS_REMITOS_COMUN` y el arnés lee `ARCHIVO_COMUN_REMITOS`. Arreglado con un alias en `pruebas/imports.js`
  y la línea `COMUN` en la suite; ahora 6/6.
- `mut-remitos-dolce-acopio.js` 13/13. `e2e/71-revisar-remitos.spec.js` 12/12 y `70-subir-remitos` 4/4 (390 y
  1280 px), con un test nuevo: salir con algo sin mandar, y Confirmar con la base que no responde.
- `e2e/72-acopios.spec.js` miraba el aviso viejo "cambios sin guardar" al salir del remito: lo encontró el ensayo; ahora
  comprueba que sale guardando las cajas.
- En el ensayo local, `0-humo` "la planta sin sesión" da rojo: falla IGUAL sobre main 2d04d3e en este contenedor (la
  planta no llega a la base real desde acá); en GitHub pasa. No es de esta rama.

## Decidido sin consultar
- El retardo: 800 ms. Al salir de un campo se manda sin esperar.
- "Volver a leer" sigue en su lugar (el pedido nombra solo Confirmar y Descartar, pero no pide sacarlo).
- El estado va inmediatamente después de Confirmar; al abrir dice "Los cambios se guardan solos." (para que no se
  vuelva a confundir con confirmar). El texto de "Volver a leer" ahora dice "pisa todo lo de este remito, también lo
  que ya corregiste."
- La fecha se trata como campo de texto (con retardo): mientras se escribe a mano, el campo vacío no se manda por tecla.
- Lo idéntico a lo último guardado no se vuelve a mandar (por ejemplo, agregar un lote vacío).
- El guardado NO rearma el formulario con lo que devuelve la base (pisaría lo que se escribe o un lote a medio
  cargar); sí lo rearma Confirmar antes de confirmar, así el amarillo de la base se ve si confirmar lo rechaza.
- Sin `retiros:cargar` en la fábrica no se intenta guardar.
- `beforeunload` pregunta al cerrar la pestaña solo si quedó algo sin llegar a la base.

## Lo que no se pudo probar
- Contra la base real: todo fue con el doble de la suite y la maqueta (Claude Code solo lee la base).
- En un celular real que se queda sin señal a mitad del guardado (se probó el error de la base, no un corte de red
  real) ni que el navegador mande el último guardado al cerrar la pestaña (eso depende del navegador).
- El tag `antes-de-remitos-autoguardado-2026-10-29` quedó local: el servidor corta los push de tags desde esta
  sesión ("remote end hung up"); las ramas se pushean bien. Para la integración vale el respaldo en rama.

## Qué automatizaría ahora
- **Un helper de autoguardado compartido.** Ya hay dos pantallas con la misma maquinaria hecha a mano (la división en
  Administración, `fc.enCamino` / `fc.otraVez`, y esto): un `js/autoguardado.js` con `crearAutoguardado({ guardar,
  retardo, alVolver })` (una llamada a la vez, versión, retardo, pausa, esperar) y UNA suite de reloj de mentira la
  probaría una sola vez para todas. Sería la excepción numerada que sigue en arquitectura.md.
- **Un chequeo de variables de mutación**: que `test-anclas-mutaciones.js` (o una suite nueva) avise cuando un runner
  manda un archivo por una variable que ningún arnés lee (lo que tuvo 6 mutaciones sin medir desde el 28/10).
