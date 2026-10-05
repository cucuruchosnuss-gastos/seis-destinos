# Traspaso — Cuentas corrientes con Clientes y los cheques en un pago (05/10/2026)

Rama `ci-prueba/cc-proveedores-clientes-cheques`, desde `main` en `be86456`. **No se integra esta noche** (salvo "APROBADO" de Facu). Supabase: solo lectura (las funciones nuevas ya estaban hechas; se verificaron con `pg_get_functiondef`).

## Qué se hizo

1. **Cuentas corrientes con dos pestañas**: Proveedores (lo de siempre) y Clientes. Clientes es la pantalla de Administración → Clientes abierta adentro (un iframe del mismo sitio con `administracion.html?seccion=clientes&embebido=cc`). La barra de fábricas de afuera manda adentro.
2. **Registrar pago con cuatro medios**: efectivo, transferencia, cheques de la cartera (tildados, la suma es el monto, no mueve caja) y cheque / e-cheque propio (el banco se debita el día de pago).
3. **Cheques → pestaña Emitidos**: los cheques propios pendientes y debitados, por cuenta y fecha de pago, con lo pendiente por cuenta. En la cartera, los usados en un pago dicen a qué proveedor fueron y tienen "Ver el pago".
4. **Caja** nombra el movimiento nuevo `egreso_cheque_propio` ("Cheque propio").

## Decisiones

- **Clientes por iframe y no copiando código**: la pantalla de Administración tiene ~800 líneas de clientes (lista, todas las fábricas, agrupar, ficha, apodos, saldo inicial, ajuste) y la otra tarea de esta tarde (`ci-prueba/detalles-viejos`) está rehaciendo su armado lista/detalle. Sacarla a un `js/` común ahora chocaba con esa rama; el iframe reusa lo que haya en Administración, también lo que cambie mañana. Embebida no dibuja su encabezado, su barra lateral ni su barra de fábricas, no tiene portada y no se va al dashboard.
- **Administración → Clientes no tiene un link nuevo a la pestaña**: el pedido decía "puede llevar"; la portada de Administración ya tiene el acceso directo a Cuentas corrientes y `?pestana=clientes` abre la pestaña. Se dejó afuera para no tocar la zona que está rehaciendo la otra rama.
- **El nombre del módulo vuelve a "Cuentas corrientes"** (era "Cuentas corrientes · Proveedores").
- **Cheque suelto ya no se ofrece**: va por una de las dos funciones nuevas.
- **La fecha general del pago se esconde con el cheque propio**: el gasto lleva la fecha de emisión (la pone la base).
- **El período de Emitidos son dos fechas sueltas**: `js/periodo.js` todavía no está en `main`. Al integrar con `ci-prueba/filtros-en-todos-lados`, pasarlas a `crearPeriodo`.
- **Los `<select>` del modal de pago** (la cuenta de caja que ya estaba y la de banco nueva) tienen ahora el aspecto de los demás campos.

## Huecos de base (no se tocaron)

- La policy de `cheques_emitidos` pide `tiene_tarea('cuentas_corrientes','ver')`, una tarea que **no existe** en el CHECK: esa rama no hace nada. Probablemente quería `ver_todo`. Hoy leen quien registra pagos o procesa cobranzas.
- No hay cómo **anular** un cheque emitido ni deshacer un pago con cheques de la cartera desde la pantalla (`volver_cheque_a_cartera` no revierte el gasto; la pantalla no lo ofrece).
- `cobranza_cheques.pago_gasto_id` deja `salida_proveedor_id` en null: la pantalla trata las dos marcas igual (`pagoAProveedor`).

## Lo que no se pudo probar

- **Nada contra la base real**: ninguna de las dos funciones se ejecutó (solo lectura). Lo probado es lo que la pantalla manda, en suites con una base falsa y en la maqueta.
- El débito real de las 06:00 (`debitar_cheques_emitidos`) y que Caja muestre el movimiento ese día.
- El iframe en un celular de verdad (scroll adentro del marco, teclado al buscar un cliente).

## Pruebas

- `npm run pruebas`: 208/208 en verde.
- Nuevas: `test-/mut-cuentas-corrientes-cheques-pago.js` (93/93; 53/53 +1 eq.) y `test-/mut-cheques-emitidos.js` (51/51; 28/28 +8 eq.). Incluyen las dos mutaciones pedidas: un pago con cheques de la cartera que mandara una cuenta de caja, y un cheque propio con la fecha de emisión como fecha de pago (se debitaría antes), dan rojo.
- Al día: las suites de Cuentas corrientes, Cheques, la barra de fábricas y Administración (y sus mutaciones de a una: endoso 66/66, barra 33/33, proveedores 52/52, xss CC 109/109, números CC 43/43, barra CC 44/44, vista de cheques 53/53, cheques de Administración 18/18).
- Navegador: `e2e/26-cc-clientes-cheques.spec.js` (6 casos, 390 y 1280 px, maqueta `cc-cheques`) y 0-humo, 5-maqueta, 7-barra-unidad y 13-comparar-administracion pasan (76).

## Guion para Facu

1. Cuentas corrientes: arriba, "Proveedores | Clientes". Tocar Clientes: tienen que aparecer los clientes de la fábrica elegida arriba; cambiar la fábrica arriba los cambia.
2. Abrir un proveedor con deuda en Nuss → Registrar pago → "Cheques de la cartera": tildar dos; el monto es la suma. Confirmar: los cheques quedan endosados a ese proveedor (en Cheques dicen "Pagó su cuenta corriente · Ver el pago") y la caja no se mueve.
3. Registrar pago → "Cheque / e-cheque propio": cuenta de banco, número, fecha de pago dentro de un mes. Tiene que decir "El banco se debita el DD/MM". Confirmar y mirar Cheques → Emitidos: aparece pendiente, en su cuenta.
4. El día de pago, a las 06:00, en Caja tiene que aparecer "Cheque propio" en esa cuenta.

## Qué automatizaría ahora

Las suites de cada módulo listan a mano qué funciones extraen del HTML (`FUNCIONES`), y cada función nueva rompe varias suites viejas a la vez con un `ReferenceError` (hoy: cinco suites de Cuentas corrientes y doce de Cheques por dos o tres funciones nuevas). Un extractor que **siga solo las llamadas** (si `confirmarPago` llama a `esMedioCheque`, la trae aunque no esté en la lista, igual que `pruebas/imports.js` ya sigue los imports) sacaría ese trabajo de cada tanda.
