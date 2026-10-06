# Traspaso — Las comisiones de las órdenes de retiro (06/10/2026)

Rama `ci-prueba/comisiones` (worktree `sd-comisiones`), sobre `7ecf298` (main + la integración + las ramas B y C). **Sin push.** La base ya estaba hecha por el chat de arquitectura; acá solo se LEYÓ (SELECT, `pg_get_functiondef`).

## Qué se hizo

1. **Administración → la orden de retiro valorizada** (`modulos/administracion.html`):
   - Debajo del total: "Comisión: sin cargar (la habitual de este cliente es 5 %)", o "Comisión: sin comisión", o **Subtotal / Comisión 5 % / Total** cuando está cargada.
   - **"Cargar comisión" / "Cambiar comisión"** (con `retiros:precios` en la empresa de la orden **o** `cobranzas:procesar`, que es lo que pide la base): Porcentaje (propone la habitual del cliente) / Monto fijo / Sin comisión, y el cálculo antes de guardar. Llama a `cargar_comision_orden`. El error de la base va tal cual pegado al botón; un doble toque manda una vez.
   - Aviso si la comisión es un porcentaje y la valorización cambió después (la base no la recalcula).
   - Filtro **"Con comisión sin cargar"** en la lista (no convive con "sin valorizar"), con el sello en cada fila.
   - En la cuenta del cliente, el movimiento `comision` se llama "Comisión".
   - **Ficha del cliente: "Comisión habitual (%)"** (2 decimales, 0–100).
2. **Cuentas corrientes → la ficha del proveedor COMISIONES** (`modulos/cuentas-corrientes.html`): cada comisión con **"Pagar"** (abre el Registrar pago de siempre con esa factura sola tildada) y **"Se la queda la empresa"** (panel propio en la fila → `quedarse_comision`).
3. Suites y e2e (abajo).

## Decisiones tomadas sin consultar

- **La hoja impresa / PDF / texto para compartir NO muestran la comisión**, ni con precios: es un dato interno. Ojo con la tensión: la base SÍ se la cobra al cliente (un `cliente_movimientos` tipo `comision`, positivo), así que el cliente la ve en su cuenta corriente pero no en la hoja de la orden. Si Facu quiere que figure en la hoja, es un renglón más en `js/retiros-comun.js`.
- **"Pagar" no tiene un panel extra**: su confirmación es el propio modal "Registrar pago" (nada se paga hasta tocar su botón). "Se la queda la empresa" sí tiene su panel.
- **Sin comisión habitual, el panel no elige nada solo** (hay que tocar Porcentaje, Monto fijo o Sin comisión). Con habitual, arranca en Porcentaje con ese valor.
- **Cambiar de modo vacía el valor** (un 5 escrito como porcentaje no pasa a ser $ 5); volver a Porcentaje propone la habitual.
- **"Se la queda la empresa" solo en una comisión `pendiente`**: con pagos (parcial) la base la frena igual, así que no se ofrece.
- **La fila de una comisión en CC no tiene ✏️ ni ✕**: editarla desde Gastos o anularla como factura común la desincronizaría de la orden y de la cuenta del cliente.
- **La fila de la lista de órdenes muestra el total CON comisión** cuando está cargada (es lo que debe el cliente por esa orden).
- **Los datos de la maqueta no se tocaron**: la e2e suma la comisión habitual y el proveedor COMISIONES con `maqueta.cambios`, así no se mueven las comparaciones con el diseño.
- **De paso, un arreglo**: en la cuenta del cliente, el código de la orden salía DOS veces ("Orden de retiro N-0013Orden de retiro N-0013 · …") porque `cuenta_cliente()` ya manda el código desde el 26/09 y `detalleMovimiento` solo sacaba la forma vieja con número. Arreglado y con prueba.
- **De paso, otro**: tres runners de mutaciones ya estaban en rojo en `7ecf298` por anclas viejas (el código cambió y el runner no): `mut-administracion-clientes.js` (dos anclas: `abrirFicha` y el botón Ficha, por "Todas las fábricas"), `mut-clientes-apagados.js` (tres: el aviso "Cliente apagado", `puedePrenderApagar` y el filtro de `leerSaldos`, más `esc(TEXTO_ELEGI_FABRICA)` como equivalente) y `mut-buscar-clientes.js` (el 4º parámetro `apodo_coincide` de Retiros). Se actualizaron las anclas; ninguna prueba se aflojó. `mut-administracion-ordenes.js` también, por el select que cambió acá.

## Huecos de base (para el chat de arquitectura)

1. **CERRADO el 06/10/2026: la base sumó `guardar_comision_habitual(p_cliente_id, p_porcentaje)` y la ficha la usa** (la comisión ya no viaja en `guardar_ficha_cliente`; se fue la relectura `comisionHabitualGuardada`). Lo que decía antes: **`guardar_ficha_cliente` NO acepta `comision_habitual`**: ignora la clave en silencio y no hay otra RPC ni policy de UPDATE para escribirla. La ficha ya la manda; mientras tanto, después de guardar relee la fila y **dice** "La comisión habitual NO se guardó: la base todavía no la guarda." Cuando la función acepte la clave (`if d ? 'comision_habitual' then … end if`, con el CHECK 0–100), anda sola sin tocar la pantalla.
2. **`valorizar_orden_retiro` no recalcula una comisión en porcentaje** si se corrige la valorización: queda el importe viejo. La pantalla avisa para volver a cargarla.
3. **La factura y el movimiento usan el NÚMERO de la orden** ("Orden 13", "Comisión de la orden N° 13 · …", "Comisión orden N° 13 (5%)"), no el código (`N-0013`). Administración y CC lo reemplazan por el código cuando lo pueden leer; en CC sin `retiros:ver` se ve el número.
4. `anular_orden_retiro` devuelve `-total` (sin la comisión): está bien porque el trigger `trg_orden_anulada_saca_comision` borra el movimiento de la comisión aparte, pero conviene saberlo al leer la cuenta.

## Lo que NO se probó

- **Nada con sesión real ni contra la base** (cero RPCs ejecutadas: base en solo lectura). Las pruebas corren contra dobles y la maqueta.
- El "Registrar pago" de una comisión hasta el final (que `registrar_pago_proveedor` cree el gasto con la categoría "Comisiones" y baje la factura).
- Que el permiso `cobranzas:procesar` sin `retiros:ver` alcance para VER la orden (no: la orden se lee con `retiros:ver`; quien solo tiene `cobranzas:procesar` no llega a esa pantalla).

## Guion para Facu

1. Administración → Órdenes → tildá **"Con comisión sin cargar"** (hace falta un cliente con comisión habitual: se carga en su ficha, "Comisión habitual (%)").
2. Abrí una orden valorizada: debajo del total, "Comisión: sin cargar". Tocá **Cargar comisión**, mirá el cálculo, Guardar: tiene que pasar a Subtotal / Comisión / Total.
3. Cuentas corrientes → proveedor **COMISIONES**: la comisión aparece con **Pagar** y **Se la queda la empresa**. Probá "Pagar": el monto y esa sola factura tildada.

## Pruebas

- `test-administracion-comisiones.js` 100/100; `mut-administracion-comisiones.js` 37/37 (+10 equivalentes).
- `test-cuentas-corrientes-comisiones.js` 51/51; `mut-cuentas-corrientes-comisiones.js` 33/33.
- `e2e/27-comisiones.spec.js`: 6/6 (390 y 1280 px).
- Mutaciones de lo tocado: toda la tanda de Administración (19), Cuentas corrientes (9) y clientes (7) en verde, con las anclas viejas corregidas (`mut-administracion-ordenes` 77/77, `-clientes` 47/47, `mut-clientes-apagados` 42/42, `mut-buscar-clientes` 72/72).
- e2e relacionadas (humo, maqueta, comparar Administración, apodos, CC con clientes y cheques, barra de unidad, detalles y filtros en dispositivos): 271/272; la que falló (filtros · compu 1280 · Pedidos, pantalla que no se tocó) pasó sola al repetirla — la compu se suspendió en el medio.
- `npm run pruebas`: 217/217 en verde (con `check-scripts`); `check-bytes` y `test-baselines` en verde.

## Qué automatizaría ahora

- **Un chequeo de "clave que la RPC ignora"**: cada pantalla que manda un jsonb a una RPC de actualización parcial (`guardar_ficha_cliente`, `guardar_proyecto`, `guardar_tarea_taller`) podría tener una prueba que compare las claves que manda contra las que la función lee (`d ? 'clave'` en `pg_get_functiondef`, guardado en `supabase/esquema.md`). Hoy esto se encontró a mano; la próxima vez sería un rojo.
- **Un helper de prueba para el `$` con espacio duro**: `importeHoja` pone U+00A0 y cada suite nueva tropieza con lo mismo (acá, 13 fallas falsas). Un `plata('$ 1.000,00')` en `circuito-comun.js` que lo convierta.
