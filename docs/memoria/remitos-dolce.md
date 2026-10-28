# Remitos Dolce (modulos/remitos-dolce.html)

Desde el 28/10/2026 (rama `ci-prueba/modulo-remitos-dolce`, pedido de Facu: "los remitos de Rosario en un MÓDULO
APARTE, que no se mezclen con la Carga ni con Administración"). Antes (27/10/2026) subir vivía en la Carga
(retiros.md, "Subir remitos Rosario") y revisar en Administración → Órdenes (administracion.md, "Remitos
precargados de Rosario"): esas dos secciones describen el código que se MUDÓ tal cual acá.

## Cómo está armado
- Un HTML vanilla como los demás. El código se movió (no se copió) con un script que lo saca por anclas; los nombres
  de clase quedaron como venían: `rt-*` lo de Subir, `ad-*` lo de Revisar; `rd-*` es lo propio del módulo (pestañas,
  link). El CSS de base que usan (botones, filas, sellos) se copió de la Carga y de Administración (regla de duplicar).
- Lo que usan dos pantallas está en **`js/remitos-comun.js`** (decimoséptima excepción, arquitectura.md):
  `talonarioDe`, `textoNumeroRemito`, `htmlSelloAcopio`, y el catálogo de un renglón (`GRUPOS_REMITO`,
  `presentacionRemito`, `nombreRenglonRemito`, `opcionesRemito(cat, categorias)`, `gruposRemito(cat, busqueda,
  categorias)`). Administración lo importa para "Nuevo acopio" y la ficha de la orden.
- Color propio: el azul de Rosario, `PALETA_MODULO['remitos-dolce'] = [0.50, 0.13, 250]`; ícono del remito
  (`ICONOS['remitos-dolce']`); en la barra, después de Órdenes de retiro.
- La tarjeta del menú (js/modulos.js): `requiereModulo: 'retiros'`, `requiereTareas: ['retiros:cargar',
  'retiros:ver']` y **`alcanceEn`** = el id de Dolce Pasta (`118b348c-…`, verificado el 28/10/2026):
  `moduloVisible` pide que esa tarea alcance esa fábrica (la regla de `tiene_tarea_alcance`: `{"todas": true}` o el id
  en `unidades`; null no). El dashboard y la barra lateral pasan `misAlcances` (leen `alcance` de `empleado_tareas`);
  sin alcances leídos la tarjeta no se ve. Ningún otro módulo usa `alcanceEn`.
- `<meta name="sd-unidad" content="no-filtra">`: la pantalla elige sola la fábrica (las sin control de stock).

## Arranque y permisos
- `cargarPermisos` (empleados + `empleado_tareas` del módulo `retiros` con su alcance) y `cargarFabricas`
  (`unidades_negocio`: todas para nombrarlas —"(también en Nuss)"— y las **sin control de stock** donde la persona
  carga o ve retiros, sin la de pruebas para una cuenta real).
- Pestañas (`pestanasVisibles`): **Subir** con `retiros:cargar`, **Revisar** con `retiros:ver` (en esa fábrica). Con
  una sola, la barra de pestañas no se ve. Sin ninguna: "No tenés permiso…" y vuelve al dashboard. `?pestana=subir|revisar`
  (los links de la Carga y de Administración) o la última usada (`remitos-dolce.pestana`). Adentro de un remito no hay
  pestañas (se sale con "‹ Revisar"; con cambios sin guardar avisa una vez).

## Subir
Lo de retiros.md "Subir remitos Rosario", con estos cambios: sin el botón de entrada ni la flecha de volver (es su
pestaña); la fábrica: la elegida, con una sola esa, si no la última usada (ya no la de la barra); el estado vive en
`estado.subida`; **"Confirmado: Orden D-0012"** con la columna **`remitos_precarga.orden_codigo`** (verificada con
information_schema el 28/10/2026; antes un embed de `ordenes_retiro` que Manuel, sin `retiros:ver`, no podía leer).

## Revisar
Lo de administracion.md "Remitos precargados de Rosario" (corregir, confirmar, descartar, talonario Oficial / Acopio,
saldo de acopio, zoom de la foto, Volver a leer), con estos cambios: después de confirmar o descartar vuelve a Revisar;
el aviso dice "Ya se puede valorizar en Administración.". **Abajo, las órdenes por N° de remito** (`cargarOrdenesRemito`:
`ordenes_retiro` de la fábrica de los últimos 120 días, tope 400, con `numero_remito`, `numero_remito_n` y `talonario`),
en solapas Oficial / Acopio, el más nuevo primero y las sin número al final, **de solo lectura** (sello Valorizada /
Por valorizar / Anulada, sin plata) y "Valorizar en Administración →" con `retiros:precios`.

## Lo que quedó afuera
- **La Carga** (retiros.html): un link chico **"Remitos Dolce →"** (`#rt-link-remitos`, a `?pestana=subir`), con la
  misma regla de antes (retiros:cargar en una fábrica sin control; `pintarEntradaRemitos`).
- **Administración**: en Órdenes de una fábrica sin control, la lista DE SIEMPRE (sin solapas ni orden por remito) y un
  link chico **"Remitos Dolce →"** (`pintarLinkRemitos`, a `?pestana=revisar`). La ficha y la hoja siguen diciendo
  "Remito N° X" / "Acopio N° X".
- **La hoja de la Carga** (28/10/2026): `mis_ordenes_retiro` devuelve `numero_remito` y `talonario`
  (pg_get_functiondef el 28/10/2026) y `ordenParaHoja` los pasa: la hoja y el PDF impresos desde la Carga dicen
  "Remito N° X".
- **ocr-remito**: publicada por el chat de la base el 28/10/2026 con `MODELO_POR_DEFECTO = 'claude-opus-5'`; el repo
  quedó igual a lo publicado.

## Pruebas
- `test-/mut-remitos-dolce-subir.js` (151; mut 127, baseline la Carga de 133555d), `test-/mut-remitos-dolce-revisar.js`
  (177; mut 145 + 6 derivadas a js/remitos-comun.js, baseline Administración de 133555d; la vieja
  mut-administracion-remitos-precarga estaba ROTA desde el 27/10: un ancla repetida por los Acopios),
  `test-/mut-administracion-link-remitos.js` (26), `test-/mut-retiros-link-remitos.js` (25),
  `test-/mut-modulos-remitos-dolce.js` (21, la tarjeta y el alcance), `test-retiros-hoja-remito.js` (+6 de la Carga).
- Arnés: `pruebas/sandbox-remitos-dolce.js`; `fuente-cobranzas.js` pega `js/remitos-comun.js` si el módulo lo importa
  (`ARCHIVO_COMUN_REMITOS` para mutarlo).
- Navegador: `e2e/70-subir-remitos.spec.js` (maqueta `remitos-dolce-subir` + la Carga) y `e2e/71-revisar-remitos.spec.js`
  (maqueta `remitos-dolce-revisar` + Administración), a 390 y 1280 px.
