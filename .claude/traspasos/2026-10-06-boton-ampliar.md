# El botón "Ampliar" en los paneles de detalle (06/10/2026)

Rama `ci-prueba/boton-ampliar` (desde `d16e3c7`). Sin push: lo integra Facu con "INTEGRÁ". Cero cambios de base (Supabase solo lectura, no hizo falta).

## Qué se hizo

- **Una pieza común: `js/ampliar.js`** (módulo ES, con su escape `escAmp`) + su CSS al final de `css/main.css` (`.amp-boton`, `.amp-barra`, `.amp-barra--cabeza`, `.amp-barra--fija`, `.amp-fondo`, `.amp`, `.amp__*`). Décima excepción consciente a la regla de duplicar (entrada nueva en Arquitectura de `CLAUDE.md`).
- En la compu (desde 1100 px), un botón **"Ampliar"** arriba a la derecha del detalle abre una ventana grande en el medio (96 vw × 94 vh) con el fondo oscurecido: a la izquierda el resumen y las observaciones enteras, a la derecha la grilla de 2 o 3 por fila (3 desde 900 px de grilla; nunca más columnas que cosas), abajo las mismas acciones del panel. Se cierra con la X, Escape o tocando afuera; el foco queda atrapado y vuelve al botón. `role="dialog"`, `aria-modal`, título por `aria-labelledby`.
- **La ventana COPIA los nodos del panel** y tocar algo en la copia hace `original.click()`: los mismos handlers (también los delegados), nada duplicado. Antes de tocar, la ventana se cierra; los desplegables (`aria-expanded`, `<summary>`, o `quedarse`) la dejan abierta y la actualizan. Un `MutationObserver` sobre el panel la vuelve a copiar si el panel cambia, o la cierra si el detalle ya no está.
- **Dónde quedó el botón:**
  - **Cobranzas** (`#cob-btn-ampliar`): arriba a la derecha del panel de 468 px, en una barra pegada (`.amp-barra--fija`) que queda a la vista mientras se scrollea adentro del panel.
  - **Gastos** (`#btn-ampliar-gasto` y `#btn-ampliar-factura`): el detalle de un gasto y el de una factura pendiente son **pantallas completas también en la compu** (un `position: fixed; inset: 0`, no un panel al lado de la lista). El botón va en la cabecera, a la izquierda de Editar / Anular. El de la factura sirve también para Cuentas corrientes (su "ver factura" abre `gastos.html?factura=`).
  - **Cheques** (`#ad-cobranza-ampliar`): la cartera NO tiene un panel de detalle propio (tocar un cheque abre su cobranza en Cobranzas, que ya tiene el botón). En Administración, la cobranza de un cheque (`ad-vista-cobranza`, la que abren la cuenta de un cliente y `?seccion=cobranzas&cobranza=`) lleva el botón en su cabecera.
  - **Órdenes de retiro** (`#ad-orden-ampliar`): en la cabecera de la orden abierta (lista | detalle).
  - **Cuentas corrientes** (`#btn-ampliar-pago`): en el modal "Detalle del pago" (un modal centrado de 480 px), a la derecha de la X. La ficha del proveedor es una página entera y no lleva botón.
- Datos de maqueta nuevos, sin cambiar los compartidos: `pruebas/datos-maqueta/ampliar-gastos.js` (un gasto con observaciones largas y foto) y `ampliar-cc.js` (el pago g-1 con sus facturas y su sobrante).

## Decisiones tomadas sin consultar

1. **Cheques = la cobranza de un cheque en Administración**, porque la cartera no tiene detalle propio. Si Facu quería un detalle POR CHEQUE adentro de la cartera, eso es construir un panel nuevo (no estaba en el pedido).
2. **Cuentas corrientes = el detalle del pago** (el único detalle que es un modal en esa pantalla) + el de la factura, que vive en Gastos.
3. **Un solo corte, 1100 px**, en las cinco (Cobranzas pasa su `MQ_ESCRITORIO` y Administración su `MQ_LISTA_DETALLE`, que valen lo mismo). En Gastos y Cuentas corrientes el detalle no es un panel al lado de la lista; se usó el mismo corte de "compu" para que la regla sea una.
4. **Una acción tocada en la ventana la CIERRA antes de correr**: así un formulario (anular, valorizar, editar), una confirmación o un visor se ven donde siempre. La alternativa (dejarla abierta y copiar los campos) obligaba a sincronizar lo que se escribe entre la copia y el original.
5. **Las copias son de solo mirar**: sin `id` / `name` / `for` / `data-*` y con los campos deshabilitados. Mientras se valoriza, se anula, se asienta o se reabre, el botón no se ofrece.
6. **Sin marco doble**: en Cobranzas y Gastos lo de la grilla ya son tarjetas y van sin el marco de la ventana (`marcoCelda: false`).
7. **z-index 75**: arriba de los modales de los módulos (60) y de las barras; debajo de los visores (80-90) y los avisos (9999).

## Lo que no se probó

- Nada con sesión ni contra la base real: todo en la maqueta (Chromium).
- **Safari / iPad**: el e2e de la ventana corre en Chromium. Entre 1100 y 1280 px (una tablet apaisada) no se miró.
- "Ver foto del comprobante" de Gastos desde la ventana abre una pestaña nueva con `window.open` dentro del click sintético: en la maqueta Storage no firma, así que no se vio la pestaña.
- "Imprimir" y "Enviar" de una orden desde la ventana (en la maqueta solo se probó "Anular" y, en Cobranzas, "Editar").
- Un lector de pantalla real.

## Guion para Facu (en la compu, ventana de 1280 o más)

1. Cobranzas: tocá una cobranza con cheques → arriba a la derecha del panel, "Ampliar" → ventana grande; tocá "Titulares" (si tiene): se despliega sin cerrar; Escape cierra.
2. Gastos: abrí un gasto con observaciones largas → "Ampliar" en la cabecera → las observaciones se leen enteras; "Editar" desde la ventana abre la edición de siempre.
3. Administración → Órdenes → una orden → "Ampliar" → los renglones de a 2 o 3; "Anular" desde la ventana abre el panel de anular.
4. Administración → la cuenta de un cliente → una cobranza asentada → "Ampliar".
5. Cuentas corrientes → un proveedor → el 📋 de un pago → "Ampliar".
6. Achicá la ventana a menos de 1100 px: el botón desaparece (y la ventana, si estaba abierta, se cierra).

## Números

- `npm run pruebas`: 217/217 en verde, con `check-scripts` y `check-bytes`.
- `test-ampliar.js` 90/90, `mut-ampliar.js` 50/50; `test-ampliar-pantallas.js` 136/136, `mut-ampliar-pantallas.js` 44/44.
- `e2e/27-ampliar.spec.js` 12/12; `e2e/5-maqueta.spec.js` y `e2e/detalles-dispositivos.spec.js` en verde (170 pruebas junto con la nueva).
- **Las mutaciones de todas las suites que leen los archivos tocados** (72 runners: Cobranzas, Gastos, Administración, Cheques, Cuentas corrientes, clientes, barras, `main.css`): ninguna escapó; las que corrieron detectaron todas sus mutaciones.
- **ARREGLADO DESPUÉS (06-07/10/2026, al apilar las cuatro ramas):** las cuatro de abajo ya corren enteras (administracion-clientes 48/48, clientes-apagados 42/42, cheques-barra-unidad 39/39, buscar-clientes 72/72), y el 07/10 se reapuntaron dos más que el apilado dejó sin ancla (`mut-clientes-provisorios.js` 57/57 y `mut-cuenta-unica.js` 82/82: el select de clientes quedó con `proveedor_id, comision_habitual` en el medio). Las 11 que faltaban correr dieron todas sus mutaciones detectadas. Lo que sigue es cómo estaba:
- **Encontrado y NO arreglado — ya estaba roto en `d16e3c7`** (verificado: esas anclas tampoco existen en ese commit; no lo causó esta rama). Cuatro runners abortan por anclas viejas y hay que reescribir esas mutaciones:
  - `mut-administracion-clientes.js`: "ver alcanza para la ficha" y "la ficha se abre sin precios" (`abrirFicha` ahora dice `|| clientesEnTodas()`).
  - `mut-clientes-apagados.js`: "el interruptor con otro permiso" y "la cuenta no dice apagado" (no existen) y "un apagado que viene igual se mezcla con los prendidos" (aparece 2 veces).
  - `mut-cheques-barra-unidad.js`: las cuatro "cambiar la barra …" (no existen).
  - `mut-buscar-clientes.js`: "retiros: muestra el saldo" (no existe en `retiros.html`).

## Qué automatizaría ahora

- **La tarea repetida más cara de esta tanda fue correr las mutaciones de TODAS las suites de los archivos tocados** (72 runners, a mano con un `for`). Un `pruebas/mut-afectadas.js` que mire `git diff --name-only origin/main...HEAD`, elija los `mut-*.js` que leen esos archivos (por nombre, por `require` de un sandbox o por la ruta que nombran) y los corra de a uno, con un resumen final. Así un cierre de rama tiene su número de mutaciones sin elegirlas a ojo, y aparecen solas las que ya estaban rotas (como `mut-administracion-clientes.js`).
- **Una sola tabla de pantallas con "Ampliar"** (`pruebas/ampliar-pantallas.js`) que lean `test-ampliar-pantallas.js` y `e2e/27-ampliar.spec.js`: hoy están en dos listas y una pantalla nueva hay que sumarla en las dos.
