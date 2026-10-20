# Traspaso 20/10/2026 — Cuentas corrientes: pago a proveedores en los dos sentidos y orden de pago

Rama `ci-prueba/pago-mixto` (sigue a `240b4b9` y `3ddbace`, del 15/10/2026). Reemplaza al traspaso del 15/10 (`2026-10-15-pago-mixto.md`), que ya está en `docs/memoria/cuentas-corrientes.md` (corregido con este cambio, autorizado por el chat de la base).

## Qué cambió (todo en `modulos/cuentas-corrientes.html`)
- **"Registrar pago" en pesos: una pantalla, dos bloques en cualquier orden.** FACTURAS (las pendientes o parciales del proveedor en esa empresa, la más vieja arriba, sin tildar; tildar pone el saldo, se puede bajar para pagar una parte, nunca más que el saldo) y VALORES (el botón "Cheques de la cartera", que abre la lista de todas las empresas como el 15/10, y Efectivo / Transferencia / QR con monto y cuenta: efectivo solo cajas de efectivo, transferencia y QR solo bancos).
- **Abajo, pegado:** "Facturas $ X · Valores $ Y · Diferencia $ Z", el aviso (bordó "Faltan $ Z…", amarillo "Quedan $ Z a favor del proveedor", "Pago a cuenta: queda todo a favor"), el error pegado al botón y los botones.
- **"Completar con efectivo/transferencia"** suma la diferencia al monto. **"Aplicar a las facturas más viejas"** tilda de la más vieja a la más nueva hasta cubrir los valores, la última parcial. Todo queda editable.
- **Confirmar = UNA llamada a `pagar_proveedor_mixto`** con una sola lista de facturas tal como la eligió la persona (la base reparte). Se fueron `repartirAplicacionesPagoMixto`, las dos llamadas, "Completar con" de dos pagos y todo el "resto pendiente".
- **Campo "Observaciones de la orden"** → `p_observaciones`.
- **La orden de pago** (`datos_orden_pago`), en una ventana con "Imprimir / Guardar PDF" y "Cerrar"; al imprimir se ve solo la hoja A4. Sin la empresa del cheque ni la cuenta; total en letras con centavos.
- **Ficha del proveedor: "Órdenes de pago (N)"** con "Reimprimir".
- **Otra moneda:** el pago simple de siempre (`registrar_pago_proveedor`), sin cheques, sin QR y sin orden.

## Lo verificado en la base (SELECT, 20/10/2026)
- `pagar_proveedor_mixto(...)`, `datos_orden_pago(p_orden_id)`: como dice el pedido (`pg_get_functiondef`). SECURITY DEFINER, `search_path=public`, `authenticated` sí, `anon` no. `pagar_proveedor_mixto` no pide `cobranzas:procesar` por su cuenta: lo pide `pagar_proveedor_con_cheques_cartera`, que llama adentro cuando hay cheques.
- `ordenes_pago`: las 11 columnas del pedido; policy `ordenes_pago_select` = `registrar_pago` o `ver_todo`. 0 filas el 20/10.

## Decisiones tomadas sin consultar
1. Las facturas arrancan SIN tildar (el pedido dice "cada una con tilde"); ya no se usa `sugerir_facturas_fifo`: lo reemplaza "Aplicar a las facturas más viejas".
2. Escribir un monto en una factura la tilda sola.
3. "Cheques de la cartera" es un botón que abre y cierra la lista; cerrarla destilda (lo que no se ve no se paga).
4. En otra moneda se usa la misma pantalla (sin cheques ni QR), pero se manda como siempre (`registrar_pago_proveedor`, sin orden). Lo de "no tocar otras monedas" lo leí como "que sigan pagándose igual".
5. "Diferencia" se muestra sin signo; el aviso de abajo dice si faltan o sobran.
6. El botón de confirmar no se deshabilita por lo que falta: al tocarlo dice qué falta (regla del proyecto).
7. Si `datos_orden_pago` falla después de pagar, la ventana lo dice y la orden se reimprime desde la ficha.
8. "Generada por" usa el nombre que devuelve la base (`empleados.nombre`).

## Pruebas
- `pruebas/test-cuentas-corrientes-pago-mixto.js` reescrita: **199/199** (da rojo con el archivo de antes). `mut-cuentas-corrientes-pago-mixto.js`: **135/135** (+10 equivalentes declaradas).
- Al día: `test-…-cheques-pago` 75/75 (mut 48/48), `-numeros` 294/294 (mut 43/43), `-xss` 234/234, `-comisiones` 51/51 (mut 33/33), `-saldo-inicial` 130/130 (mut 75/75), `-barra-unidad`, `-cuenta-unica`, `controles-cuentas-corrientes` 859/859, `mut-detalles-viejos` 34/34. `npm run mutaciones:rama`: lo demás en verde.
- Navegador: `e2e/49-pago-mixto.spec.js` 12/12 (1280, 390, 360 y tablet), `e2e/26` y `e2e/27-comisiones` y `detalles-dispositivos` en verde.

## Lo que no se probó
- Nada con sesión real ni contra la base: ni un pago de verdad, ni la orden con datos reales, ni la impresión en papel (en el navegador se miró con `emulateMedia('print')`).

## Guion para Facu (3 minutos)
1. Cuentas corrientes → un proveedor de Nuss con deuda → "Registrar pago".
2. Tildá dos facturas (bajá una para pagar una parte). Abajo tiene que decir "Faltan $ …".
3. "Cheques de la cartera" → tildá uno de Dolce (aviso amarillo de la deuda entre empresas). "Completar con efectivo/transferencia" → Transferencia → la cuenta.
4. Confirmar → se abre la orden de pago: sin "Dolce Pasta", sin la cuenta, con el total en letras. "Imprimir / Guardar PDF".
5. En la ficha, "Órdenes de pago" → "Reimprimir".

## Qué automatizaría ahora
La tarea más cara fue **reapuntar a mano las mutaciones de OTRAS suites cuando cambia un renglón compartido** (comisiones, saldo inicial, detalles viejos, números, cheques: cinco archivos). Propuesta: que `npm run mutaciones:rama` corra primero un chequeo rápido de anclas (sin correr ninguna suite: solo "¿cada `de:` existe y es único?") y liste todas las que se cayeron juntas con su "lo más parecido", así se arreglan en una pasada en vez de descubrirlas de a una después de 6 minutos.
