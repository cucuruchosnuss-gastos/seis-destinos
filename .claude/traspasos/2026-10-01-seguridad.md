# Revisión de seguridad — para el chat de arquitectura (noche del 30/09 al 01/10/2026)

**Solo un informe: no se cambió nada en la base.** Todo es de SELECT de solo lectura y de los advisors de Supabase, corridos entre las 23:30 y las 00:30 (hora de Argentina) del 30/09/2026. Ordenado por gravedad.

## Cómo se miró
- `get_advisors(security)`: 1 ERROR (`security_definer_view`, 4 vistas), 3 WARN (funciones SECURITY DEFINER ejecutables por `authenticated`, ~200; contraseñas filtradas sin chequear) y 1 INFO (5 tablas con RLS y sin policy).
- `pg_class.reloptions` de las 19 vistas, `has_table_privilege` / `has_function_privilege` para `anon` y `authenticated`.
- Las policies de `public` cuyo filtro NO pasa por `tiene_tarea*` / `puede_ver_produccion` / `_puede_taller` / `mi_empleado_id` / `auth.uid` / super_admin.
- Las funciones SECURITY DEFINER ejecutables por `authenticated` cuyo cuerpo NO tiene ninguno de esos chequeos (23 funciones), leyendo cada cuerpo.
- Las tareas y módulos de las cuentas de tablet (`empleados.es_dispositivo`).

## 1 · ALTA — los saldos de TODAS las cajas los lee cualquier cuenta, también las tablets

**`v_caja_saldos`, `v_caja_saldos_cuenta` y `v_caja_saldos_medio` NO tienen `security_invoker=true`** (`reloptions` en null; el advisor lo marca como ERROR). Las tres son un `sum()` sobre `caja_movimientos` **sin ningún filtro**, y `authenticated` tiene SELECT. Entonces cualquier persona con cuenta, **incluidas las cuatro tablets de la fábrica**, puede leer:
- el saldo de cada persona (`v_caja_saldos`, por `empleado_id` y moneda; con `v_empleados_publico` se sabe de quién es);
- el saldo de CADA CUENTA (`v_caja_saldos_cuenta`), y como `cuentas_caja` es legible por todos a propósito (nombre, medio, moneda, dueño), eso da **el saldo de cada cuenta de la Empresa y de cada persona, con su nombre**.

**Causa probable:** el arreglo del 29/09/2026 (las tres vistas pasaron a sumar `tipo like 'ingreso%'`) las recreó con `CREATE OR REPLACE VIEW` **sin repetir `WITH (security_invoker=true)`**, que resetea las opciones. Es exactamente la trampa que CLAUDE.md tiene escrita en Aprendizajes clave ("`CREATE OR REPLACE VIEW` sin repetir `WITH (security_invoker = true)` RESETEA las opciones"). CLAUDE.md, en Seguridad, todavía dice que 18 de 19 vistas lo tienen: hoy son **15 de 19** (las tres de caja + `v_empleados_publico`, que es la única a propósito).

**Arreglo (no aplicado):**
```sql
alter view public.v_caja_saldos        set (security_invoker = true);
alter view public.v_caja_saldos_cuenta set (security_invoker = true);
alter view public.v_caja_saldos_medio  set (security_invoker = true);
```
`ALTER VIEW … SET` no toca la definición. Después: verificar `reloptions`, y probar Caja con una cuenta común (tiene que ver sus saldos y los que el RLS de `caja_movimientos` le deja, como antes del 29/09) y con un super_admin. Ojo: la rama `ci-prueba/caja-saldo-corriente` de esta noche compara su último saldo con `v_caja_saldos_cuenta`.

## 2 · MEDIA — `precio_conito()` saltea el RLS de los precios del conito

`precio_conito(p_unidad_negocio_id, p_papel, p_colocado, p_fecha, p_lista_id)` es `LANGUAGE sql SECURITY DEFINER`, ejecutable por `authenticated`, **sin ningún chequeo de permiso**, y lee `precios_conito`, cuya policy pide `retiros:precios` o `pedidos:ver` en la unidad. O sea que **cualquier cuenta (también una tablet) puede leer el precio del conito** de cualquier fábrica (con el id de la unidad, que es público, y el papel), y de cualquier lista si conoce su id. Es información de precios, no de clientes.

**Arreglo sugerido:** que la llame solo quien la necesita (`precio_venta()` la usa por dentro: si es así, sacarle el EXECUTE a `authenticated`), o agregarle el mismo chequeo de la policy.

## 3 · MEDIA-BAJA — `buscar_comprobante_cargado()` devuelve importes a cualquier cuenta

Es SECURITY DEFINER **a propósito** (tiene que encontrar el duplicado aunque quien pregunta no vea el registro: ver CLAUDE.md), pero **no exige ninguna tarea**: cualquier `authenticated`, incluidas las tablets, puede preguntar por un proveedor + número de comprobante y recibir fecha, razón social, unidad e **importe** de gastos y facturas. Hace falta adivinar el número, así que no es un listado, pero una tablet no tiene por qué poder hacerlo.

**Arreglo sugerido:** exigir alguna de `gastos:*`, `materia_prima:cargar`, `cuentas_corrientes:*` (las pantallas que la usan son Gastos e Ingreso).

## 3b · MEDIA-BAJA — `guardar_cobranza_completa` no exige `cobranzas:procesar` (hallado por la rama `ci-prueba/cobranzas-formas`)

`guardar_cobranza_completa` (y su interna `_cobranza_escribir_transferencias`) solo delegan en `guardar_cobranza` / `editar_cobranza`, que piden `cobranzas:cargar`. Así que **un chofer con solo `cargar` puede, llamando a la función a mano, sumar transferencias a una cobranza propia**, que al asentarse entran a una cuenta de banco de la Empresa. Pasan por "Cobranzas por asentar", así que alguien lo ve antes de que se mueva la plata, pero la barrera de "solo Administración carga transferencias" hoy la pone únicamente la pantalla. **Arreglo sugerido:** que `guardar_cobranza_completa` exija `cobranzas:procesar` cuando `p_transferencias` no viene vacío (o cuando hay e-cheques).

## 4 · BAJA — `proveedores` la lee cualquier cuenta

La policy de SELECT es `true` para `authenticated`: razón social, CUIT, dirección, nombre de fantasía y si tiene cuenta corriente, **también para las tablets**. Hoy hace falta para los selectores de Gastos e Ingreso. Si se quiere cerrar, que la policy pida alguna tarea de esos módulos (y revisar el resto de los lectores antes).

## 5 · BAJA — una tablet puede dar de alta un proveedor pendiente

`crear_proveedor_pendiente()` solo exige tener fila en `empleados`. Una tablet podría crear proveedores "pendientes de aceptación" (quedan para aprobar en Cuentas Corrientes, no se activan solos). Sugerencia: exigir `materia_prima:cargar` o alguna de `gastos`.

## 6 · BAJA — no se chequean contraseñas filtradas

El advisor `auth_leaked_password_protection`: Supabase Auth puede rechazar contraseñas que aparecen en HaveIBeenPwned. Se prende en el panel de Auth (Facu). El cliente ya exige 10 caracteres y las cinco clases.

## 7 · Lo que se miró y está bien

- **Las cuentas de tablet** (Cucuruchos Nuss, Dolce Pasta, Mengui y la del robot): solo `produccion:cargar` y `stock:ver` **en su unidad**, y los módulos `produccion` y `stock`. **No leen clientes, cuentas de clientes, órdenes, listas de precios, cobranzas, cheques, gastos ni facturas** (todas esas policies piden tareas que no tienen). Lo único de plata a su alcance son los puntos 1, 2 y 3. Leen además lo que lee cualquier cuenta: los catálogos abiertos (`bancos_bcra`, `categorias`, `modulos`, `motivos_parada`, `productos`, `proyectos` por columnas, `unidades_negocio`, `vehiculos`), `proveedores` (punto 4), `cuentas_caja` (nombres de cuentas, sin saldo; abierta a propósito) y `v_empleados_publico` (nombres; a propósito). La planta ya no les ofrece los productos de reventa (policy con `_soy_dispositivo()`).
- **`anon` no ejecuta ninguna función ni lee ninguna tabla** de `public`.
- **Todas las tablas tienen RLS.** Las 5 sin policy (`_respaldo_urls_comprobantes_20260916`, `numeradores`, `pines_maestros`, `pines_produccion`, `preferencias_usuario`) están cerradas a propósito: se leen y escriben solo por funciones.
- **Ninguna función SECURITY DEFINER queda sin `search_path` fijo** (el pendiente de las 17 de CLAUDE.md está cerrado: CLAUDE.md lo sigue listando como abierto).
- `sumar_permiso` / `quitar_permiso` no tienen chequeo propio, pero delegan en `actualizar_permisos_empleado`, que exige super_admin. `_soy_dispositivo`, `_ve_produccion_en`, `_ve_turno`, `mi_empleado_id`, `mi_rol_app`, `mis_preferencias`, `guardar_mis_preferencias`, `registrar_error_app`, `mi_sesion_produccion` y `obtener_mi_solicitud_acceso` solo responden sobre quien llama. `guardar_cobranza_completa`, `marcar_cobranza_asentada`, `marcar_salida_cheques` y `abrir_turnos` delegan en funciones que sí chequean. `registrar_retiro_caja` y `cancelar_solicitud_movimiento_caja` exigen que la cuenta o la solicitud sean propias. `sincronizar_pago_directo_proveedor` no valida permiso (ya documentado en CLAUDE.md: solo actualiza un espejo existente).
- Los ~200 avisos de "SECURITY DEFINER ejecutable por authenticated" son el diseño del proyecto (toda escritura por RPC que re-verifica permisos); revisados los 23 que no tienen ningún chequeo reconocible: los problemas son los de arriba.
- `v_empleados_publico` sin `security_invoker` es la excepción justificada de CLAUDE.md.

## Para actualizar en CLAUDE.md (Seguridad)
- Las vistas con `security_invoker`: hoy 15 de 19 (hasta que se aplique el punto 1).
- Cerrar el pendiente de las funciones SECURITY DEFINER sin `search_path` (hoy cero).
