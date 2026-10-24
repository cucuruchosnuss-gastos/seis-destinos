# Traspaso — 23/10/2026: el esqueleto parejo (ninguna pantalla tapa las barras)

Rama `ci-prueba/modulos-esqueleto-parejo` (desde `origin/main` f32b687). **No se integra**: queda pusheada para auditoría. Tag de seguridad `antes-de-modulos-esqueleto-parejo-2026-10-23` (pusheado).
Documentación: `docs/memoria/estilo-visual.md` (entrada "EL ESQUELETO PAREJO") y una entrada corta en `gastos.md`, `caja.md` y `produccion.md`.

## La auditoría (todos los módulos menos `produccion.html`)
Se buscó cada regla con `position: fixed` en el CSS de cada módulo y en los estilos que pone el JS, y se confirmó en el navegador (maqueta, `document.elementFromPoint` en el centro de cada barra).

| Módulo | Selector | Qué es | ¿Tapaba? | Convertida |
|---|---|---|---|---|
| gastos | `#vista-wizard` | el wizard "Nuevo gasto" | sí, las tres barras | **sí**, vista dentro de la página |
| gastos | `#modal-detalle-gasto` | el detalle de un gasto | sí, las tres | **sí** |
| gastos | `#modal-detalle-factura` | el detalle de una factura pendiente (`?factura=`) | sí, las tres | **sí** |
| caja | `#vista-detalle-persona` | la ficha de una persona | sí, las tres | **sí** |
| produccion-gestion | `body.pg-menu-abierto .pg-menu` | el menú del celular (debajo de 900 px) | sí, la de arriba y la de abajo | **sí**, ocupa el lugar del contenido |
| cobranzas | `.cob-barra-fija` | la barra de abajo ("+ Nueva cobranza", el total) | en la compu, el pie de la barra lateral | **sí** (arranca después de la lateral) |
| administracion | `.chq-barra` | la barra de lo elegido en la cartera de cheques | en la compu el pie de la lateral; en el celular, la barra de abajo | **sí** (las dos) |
| produccion-gestion | `.pr-hoja` | la hoja de PINes para imprimir | sí | **no, a propósito**: se muestra una sola vez y los PINes se borran al cerrarla; tapando todo, nadie se va sin imprimirla |
| administracion / cobranzas | `.ad-visor` / `.cob-visor` | el visor de la foto de un cheque | sí (fondo oscuro) | no: es un visor de foto (como un modal), se cierra con ✕ o Escape |
| main.css (Gastos, CC…) | `.amp-fondo` | "Ampliar" (la ventana grande de la compu) | sí (fondo oscurecido) | no: es un modal grande a pedido |
| accesos | `#modal-permisos` | Aprobar / Editar permisos | modal | no: modal con el estilo de los de Stock |
| empleados | `#modal-ficha` | la ficha del empleado | modal | no: modal (bottom sheet) igual a Stock |
| caja | `#modal-movimiento`, `#modal-traspaso`, `#modal-desactivar-cuenta`, `#modal-rechazo`, `#modal-cuenta-nueva`, `#modal-renombrar-cuenta`, datos bancarios | formularios cortos y confirmaciones | modal | no: modales |
| gastos | `#modal-proveedor-nuevo`, `#modal-anular-gasto` | proveedor nuevo, anular | modal | no: modales |
| cuentas-corrientes | `.modal-cc` | los modales del módulo | modal | no |
| materia-prima | `.modal-mp` | el detalle de un ingreso | modal | no |
| stock | `.modal-stock` | los modales de Stock (la referencia) | modal | no |
| conos | `.cn-modal-fondo` | la ventana de cada acción | modal | no |
| taller | `.tl-velo` | facturar, cargar a la fábrica, valor de la hora | modal | no |
| retiros | `.rt-falt-fondo` | "¿De dónde salen?" | modal | no |
| retiros | `.rt-editor .rt-accion` | la acción del renglón (celular) | no: ya iba arriba de la barra de abajo | no hacía falta |
| produccion-gestion | (línea ~1001) el elegir lote | modal centrado | modal | no |
| caja / cc / gastos | `.multiselect__panel` | el desplegable de un filtro | no (popover chico) | no hacía falta |
| gastos | `.btn-fab` | el "+" | no (ya iba arriba de la barra de abajo) | no hacía falta |
| conos | `cont.style.cssText = 'position:fixed;left:-10000px…'` | el armado del PDF, fuera de la pantalla | no | no hacía falta |

## Qué se hizo
- **Las 5 pantallas, vistas dentro de la página**: sin `fixed`, ocupan el lugar de la lista (que el JS ya escondía), scrollea la página, arrancan arriba y al volver la lista queda a la altura donde estaba. En Gastos los pasos del wizard ya no tienen scroll propio (los botones de cada paso quedan al final, en su tarjeta). Los ids no cambiaron (`modal-detalle-gasto` sigue llamándose así, con la clase `.vista-en-pagina`).
- **Las 2 barras fijas de abajo** (Cobranzas y cheques) arrancan después de la barra lateral en la compu; la de cheques va arriba de la barra de abajo en el celular.
- **El encabezado de los módulos** (`.cab-modulo` en `css/main.css`): "‹ Volver", el ícono del módulo (los trazos de la barra lateral) en su color (`PALETA_MODULO`), el nombre en Bricolage y la vista al lado ("Cobranzas / Listado"). En el celular, una franja blanca de lado a lado, como Órdenes de retiro. Lo llevan Gastos (lista, wizard y los dos detalles), Caja (lista, ficha con las iniciales y el nombre, directorio), Cobranzas, Cuentas corrientes (lista, ficha, padrón), Ingreso, Stock, Pedidos, Conos, Accesos y Empleados. Se borró el CSS de los encabezados viejos.
- Cero cambios de lógica, RPC o permisos. Lo único de JS: anotar la altura de la lista y `window.scrollTo` al abrir/cerrar (Gastos, Caja, el menú de la gestión).
- Pruebas: `pruebas/test-modulos-esqueleto-parejo.js` + `mut-modulos-esqueleto-parejo.js` y `e2e/54-esqueleto-parejo.spec.js` (las 7 pantallas a 1280, 768, 390 y 360; los 10 encabezados a 1280 y 390). Se actualizaron `test-cobranzas-escritorio.js` (el CSS de abajo de 1100 px declara que salió `.cob-header` y entró `.cab-modulo`) y `test-cuentas-corrientes-proveedores.js` + su mutación (la cabecera y su color ahora en `.cab-modulo`; mutación nueva para el color).

## Decisiones tomadas sin consultar
- **La hoja de PINes queda encima de todo** (ver la tabla). La prueba la tiene como única excepción, con el motivo.
- **Los visores de foto y "Ampliar" quedan encima**: son modales grandes (fondo oscurecido), no pantallas.
- **No se tocaron los encabezados de Órdenes de retiro, Administración, Taller ni la gestión de producción**: tienen el suyo, de su handoff de diseño, y los comparan `e2e/1x-comparar-*`. Los "nuevos" de referencia son esos.
- **El "‹ Volver" se quedó con texto** (no la flecha sola de Retiros): así lo pedía el pedido ("← Volver" en el header) y los controles de cada módulo no cambian (el chequeo de controles los nombra por su texto).
- Los encabezados de las pantallas de adentro de Ingreso (`.wz-header`, "Ingresos internos", etc.) y los "‹ Volver al stock" de Stock **no se tocaron**: son renglones de volver dentro del contenido, debajo del encabezado del módulo, que sigue a la vista.
- En Accesos y Empleados el encabezado dejó de ser la barra pegajosa con blur: ahora va adentro del contenedor, como en el resto.

## Lo que no se pudo probar
- Todo se miró en la maqueta (sin sesión real) a 1280, 768, 390 y 360 px. No se probó en un celular de verdad.
- Las pantallas de un usuario sin permisos de admin (por ejemplo la entrada directa a la ficha propia en Caja, rol `usuario`) usan el mismo código; no se miraron con esa cuenta.
- No se tocó la base: no hubo nada que verificar en ella.
- Números: `npm run pruebas` 271/271 (después de traer main); suite nueva 146/146, mutaciones 44/44; `mut-cuentas-corrientes-proveedores` 53/53, `mut-cobranzas-escritorio` 45/45, `mut-produccion-gestion-diseno` en verde; `e2e/54-esqueleto-parejo.spec.js` 30/30 (y rojo contra el código de antes, servido desde el tag: Gastos, Caja y el menú de la gestión, a todos los anchos). La e2e entera en local dio 720 pasadas y 19 caídas: 3 de `27-planta-sin-internet` (usa el puerto 4173 fijo, no el de esta carpeta) y 16 de `detalles-dispositivos` / `filtros-dispositivos` por un corte de internet ("lucide is not defined", el CDN); vueltas a correr con internet, esas dos más la 53 y la 54: 230/230.
- Se trajo `origin/main` (df19453, la división de órdenes) con merge; el spec nuevo pasó a llamarse `54-…` porque main trajo un `53-division-orden`.

## Guion para Facu
1. Gastos → "+": el wizard se abre y la barra de la izquierda (o la de abajo en el celular) y la de las fábricas siguen ahí. "‹ Volver" vuelve a la lista.
2. Gastos → tocá un gasto: el detalle, con las barras. Volver deja la lista donde estaba.
3. Caja → tocá una persona: la ficha, con las barras; arriba dice "Caja / (iniciales) Nombre".
4. Producción (gestión) en el celular → "Menú": el menú ocupa la pantalla del contenido y la barra de abajo sigue.
5. Cobranzas en la compu: la barra naranja de abajo ya no tapa "Personalizar".
6. Mirá los encabezados de Gastos, Caja, Cobranzas, Cuentas corrientes, Ingreso, Stock, Pedidos, Conos, Accesos y Empleados: el mismo dibujo que Órdenes de retiro (ícono del color del módulo + nombre).

## Qué automatizaría ahora
- **La regla "ninguna pantalla tapa las barras" ya corre sola** sobre todos los módulos (`test-modulos-esqueleto-parejo.js`, sección 1 y 2): un módulo nuevo con un `position: fixed` a pantalla completa y fondo lleno, o una barra fija de abajo sin revisar, da rojo sin que nadie lo pida. Lo próximo: **un recorrido del navegador que abra cada botón de cada módulo en la maqueta y mida las barras** (hoy la e2e conoce 7 pantallas por nombre); con el inventario de controles de `controles-comun.js` se puede generar la lista de botones, tocarlos de a uno y fallar si alguno deja una barra tapada.
- **El encabezado de los módulos viejos se escribió 17 veces a mano** (el mismo HTML con otro ícono y otro nombre). Una función `htmlCabeceraModulo(clave, titulo, sub)` no conviene (cada módulo duplica sus helpers y el HTML está estático), pero sí **un generador** en `pruebas/` que, a partir de `ICONOS` y `PALETA_MODULO`, reescriba el bloque `<header class="cab-modulo">` de cada módulo y la regla de color: así, cambiar un ícono en la barra lateral se propaga con un comando y la suite ya avisa si quedó distinto.

## 24/10/2026: preparada para integrar (pedido de Facu)
- **Merge de `origin/main`** (3fd2abe: tablet-lote-y-caja, masa-tamano, conos-parecidos y la tanda del 23/10). Único choque: `docs/memoria/produccion.md`, quedaron los dos párrafos (el menú del celular de la gestión y "LOTES NO REGISTRADOS Y LA CAJA DOLCE PASTA").
- **El spec pasa a `e2e/57-esqueleto-parejo.spec.js`**: el 54 ya lo usan `54-conos-parecidos` y `54-hoja-sin-cortes` en main y `54-devoluciones-retiro` (la rama que entra antes); el 55 se dejó libre por si otra rama lo toma, el 56 es de tablet-lote-y-caja.
- **Gastos: "Anterior / Siguiente" del wizard pegada abajo.** `.wizard-nav` es `position: sticky; bottom: 0`, una barra de lado a lado de la vista con el fondo del contenido (`--color-superficie`), `border-top` y la sombra suave de la barra de Cobranzas (`0 -2px 12px rgba(28, 26, 23, 0.08)`), z-index 5 (debajo de las barras de la app). Debajo de 1024 px: `bottom: calc(68px + env(safe-area-inset-bottom, 0px))`, el mismo `padding-bottom` que main.css le da al body por la barra de abajo.
- **Decidido sin consultar:**
  - Para que el sticky se pegue hizo falta que el body no sea un contenedor de scroll: con el wizard abierto, `body:has(> #vista-wizard:not([hidden])) { overflow-x: clip; }` (como Conos y la gestión de producción; con el `hidden` de main.css nada se pega, lo que ya había pasado en Órdenes de retiro). **Efecto visible:** con el wizard abierto, la barra de arriba (fábricas y usuario) también queda pegada arriba al bajar. Se limitó al wizard para no cambiar la lista ni los detalles.
  - Se agregó `scroll-padding-bottom` (88 px; en el celular 76 + 88 + safe-area) con el wizard abierto: sin eso, un campo que queda debajo de los botones al tocarlo o con el teclado no subía (el navegador lo daba por visible).
  - En la tablet (768 × 1024) el paso Datos de la maqueta entra justo (por 4 px): la prueba lo alarga con un estilo para mirar la barra en un paso largo.
- **Pruebas:** `test-modulos-esqueleto-parejo.js` 166/166 (sección 6 nueva, +20), mutaciones 59/59 (+15, todas de la barra); `e2e/57-esqueleto-parejo.spec.js` 34/34 (las 4 nuevas a 1280, 768, 390 y 360: los dos botones dentro de la ventana y con `elementFromPoint` en su centro devolviendo el botón, sin bajar, a mitad de camino y al final; la barra de abajo de la app a la vista; un campo con el foco sube por encima de la barra). Las 4 se vieron en ROJO con el código de antes, con `hidden` en el body, sin los 68 px y sin el scroll-padding. Los specs que pasan por Gastos (7, 24, 26, 27, 30, 31, 35, 37, 43, 57, detalles- y filtros-dispositivos): 341/341. `npm run pruebas` 278/278, check-scripts y check-bytes en verde.
- **Lo que no se pudo probar:** un celular de verdad (iPhone con safe-area); todo en la maqueta.
- **Qué automatizaría ahora:** muchos specs viejos tienen `http://localhost:4180` de respaldo y solo miran `MAQUETA_URL`, no `E2E_PUERTO_MAQUETA`: con dos subagentes a la vez, el que se olvida de `MAQUETA_URL` prueba contra el servidor del otro (o contra nada) y ve 300 rojos falsos. Un cambio de una línea en cada spec (`process.env.MAQUETA_URL || \`http://localhost:${process.env.E2E_PUERTO_MAQUETA || 4180}\``, como ya hace este spec) y una prueba en `pruebas/` que lo exija a todo spec nuevo.
