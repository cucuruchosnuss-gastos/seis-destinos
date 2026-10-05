# Traspaso — detalles viejos (05/10/2026)

Rama `ci-prueba/detalles-viejos`, creada desde `origin/main` = `be86456`. No toca `main`. Supabase solo lectura (no se escribió nada).

## Qué se hizo

Se armó primero la PRUEBA (`e2e/detalles-dispositivos.spec.js`, el mismo molde que `filtros-dispositivos`: Android en Chromium a 360 y 412 px, iPhone en WebKit a 390 px y la compu a 1280 px, sobre la maqueta) y se arregló lo que encontró:

| Pantalla | Qué estaba mal | Dispositivo | Arreglo |
|---|---|---|---|
| Administración · ficha del cliente | "Guardar la ficha" quedaba DEBAJO de la barra de abajo al traerlo a la vista | Android 360 y 412, iPhone 390 | `main.css`: con la barra de abajo, `html` lleva `scroll-padding-bottom` de su alto (64 px + área segura + 8) |
| Administración · ajuste de la cuenta | "Cargar el ajuste" tapado por la barra de abajo con el teclado abierto | Android 360 y 412, iPhone 390 | el mismo `scroll-padding-bottom` (vale para toda la app) |
| Gastos · cargar un gasto (paso Datos) | "Fecha de pago" se salía por la derecha de la pantalla | Android 360 | la grilla de las dos fechas con `repeat(2, minmax(0, 1fr))` en vez de `1fr 1fr` |
| Gastos · la lista (barra de filtros) | la fecha "Hasta" se pisaba 27 px con "Categoría" | compu 1280 | `.lista-filtros input[type="date"] { width: auto }` (el `width: 100%` general no le daba ancho a su cajita) |
| Administración · Órdenes y Listas de precios | no había lista \| detalle (pendiente del diseño 3a y 6a) | compu | lista a la izquierda con su propio scroll, detalle a la derecha, fila abierta marcada; en el celular, de a una (ver Decisiones) |
| Administración · Cheques (tarjeta del celular) | el banco y el cliente quedaban en 0 a 8 px; "paga 28/09/26" se salía 5 px; el estado "En cartera" se cortaba | Android 360 y 412, iPhone 390 | solo CSS en la región de Cheques: `flex-wrap` en los dos renglones y, debajo de 520 px, número + estado en un renglón y banco · cliente en el de abajo |
| Toda la app · campos de plata | se revisaron TODOS: ninguno era `type="number"` y todos ya estaban enlazados con `enlazarCampoNumero` | — | nada que arreglar; ahora lo vigilan la prueba de node (26 campos) y la del navegador (tipear 1234567 → 1.234.567) |

Pruebas nuevas:
- `e2e/detalles-dispositivos.spec.js` — 31 paneles o pantallas × 4 dispositivos (el valor de la hora del Taller, solo en la compu) + la tarjeta de cheques (3 celulares) + lista \| detalle (4) = **128 pruebas**, todas en verde en la maqueta (Chromium y WebKit).
- `pruebas/test-detalles-viejos.js` **93/93** y `pruebas/mut-detalles-viejos.js` **34/34** detectadas.
- `navegador.yml` instala WebKit (para el iPhone).
- Se ajustaron: `pruebas/test-cheques-celular.js` (la regla de "una sola línea" pasó a "lo que no entra baja"), `pruebas/sandbox-administracion.js` (las funciones nuevas), `pruebas/test-administracion-cobranzas.js` (la maqueta contesta `cuenta_cliente` según el cliente) y la maqueta `administracion` (Kiosco Pepe, `c2`, sin movimientos: así aparece "Saldo inicial").
- `npm run pruebas`: 207/207 en verde antes del primer push (y las de Administración, Cheques y Gastos de nuevo después). Local también `e2e/5-maqueta` (30/30) y `13-comparar-administracion` (todas entre 9 y 20 %; 3a 15,8 %).

## Decisiones (tomadas sin consultar)

1. **Clientes NO va lado a lado**: el diseño 5a (la lista) y 5b (la cuenta) van a todo el ancho.
2. **Cobranzas por asentar sigue con su tarjeta y el panel de asentar ADENTRO** de la tarjeta. Partirla (lista de 380 px + detalle, diseño 2a) es reescribir cómo se abre el panel de asentar; queda para una tanda propia.
3. **Lista \| detalle desde 1100 px**, y solo si la persona pasó por la lista (si llega a una orden desde otro lado —p. ej. la cuenta de un cliente—, la lista no está leída: se ve el detalle solo).
4. **"‹ Órdenes" y "‹ Listas" siguen a la vista en la compu** (vuelven a la lista sola, a todo el ancho). Se probó esconderlos y rompía el recorrido de `5-maqueta`.
5. **La tarjeta de cheques pasa de 2 renglones a 3 (a veces 4)** en el celular: lo pedido era "que no se corte ni se pise", y con la etiqueta de la forma de pago (30/09) dos renglones no alcanzan a 360–412 px. A 390 px entran unas 6 tarjetas sin scroll (antes 8, pero con el banco y el cliente invisibles). El diff en la región de Cheques es SOLO CSS (dos propiedades y un bloque `@media (max-width: 520px)`).
6. **"Con el teclado abierto" se simula con la pantalla a 480 px de alto**: Playwright no abre un teclado de verdad.

## Lo que NO se probó

- **Nada en un celular de verdad.** El iPhone es WebKit de Playwright (sin la barra de Safari ni el área segura), y el teclado se simula achicando la pantalla.
- **Accesos**: no tiene datos de maqueta, no entró en la prueba.
- **Órdenes de retiro (la Carga)**, la gestión de Producción y el detalle / la edición de un gasto: no entraron (la maqueta de Gastos no muestra gastos con el filtro de hoy; la Carga pide más pasos). Sus pantallas sí las recorren `5-maqueta` y `15-comparar-retiros`.
- La rama **`ci-prueba/filtros-en-todos-lados` NO está en main**: cuando se integre, sus cambios en `navegador.yml` (el mismo `webkit`) y en las barras de filtros van a tocar líneas vecinas a las de esta rama. Las fechas de los filtros que mide esta prueba van a quedar escondidas detrás del botón "Período" (la prueba sigue sirviendo: mide lo que se ve).

## Guion para Facu

1. En la compu, Administración → Órdenes → tocá una orden: la lista queda a la izquierda, la orden a la derecha y la fila tocada en naranja suave. Tocá otra: cambia la de la derecha.
2. Lo mismo en Listas de precios.
3. En el celular, Administración → Clientes → un cliente → Ficha: bajá hasta "Guardar la ficha": se tiene que ver entero, por arriba de la barra de abajo.
4. En el celular, Administración → Cheques: cada tarjeta muestra el número, el banco y el cliente (cortados con "…" si son largos), sin nada pisado.
5. En el celular, Gastos → + → "Sin comprobante": "Fecha de factura" y "Fecha de pago" entran las dos en la pantalla.
6. En la compu, Gastos: "Hasta" no se pisa con "Categoría".

## Qué automatizaría ahora

- **Que TODAS las pruebas de navegador lean `MAQUETA_URL`** (hoy `7`, `18`, `22`, `23`, `24` y `11` tienen el puerto 4180 fijo). Con eso se pueden correr enteras en una carpeta de trabajo propia mientras otra sesión usa 4180; hoy hay que esperar a GitHub para saber si dan verde, que fue lo más caro de esta tanda.
- **Un recorredor de modales automático**: buscar cada `[role=dialog]` / panel `position: fixed` de cada pantalla, abrirlo con su botón y medir el botón de abajo sin tener que escribir una entrada a mano por modal (hoy `ENTRADAS` se arma leyendo cada pantalla).
