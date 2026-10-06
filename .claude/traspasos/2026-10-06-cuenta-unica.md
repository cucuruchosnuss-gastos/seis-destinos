# Traspaso — Cliente y proveedor: la cuenta única (06/10/2026)

Rama `ci-prueba/cuenta-unica` (worktree `C:\Users\Facu\proyectos\sd-cuenta-unica`), desde `7ecf298` (main + la integración + las ramas B y C). **Sin push.** La base la hizo el chat de la base; acá solo se leyó (SELECT / `pg_get_functiondef`).

## Lo que se hizo

1. **`js/cuenta-unica.js`** (nuevo, undécima excepción a la regla de duplicar): la cuenta de alguien que es cliente y proveedor, igual en las dos pantallas. Reglas puras (neto = te_debe − le_debes, el tope = el menor de los dos saldos, el reparto de la factura más vieja a la más nueva, la validación, los parámetros de `compensar_cuentas`, la clasificación, el aviso de "se creó"), el HTML (neto grande, lista con chips por etiqueta, columnas Te debe / Le debés / Neto, filtro por etiqueta, el panel de Compensar) y los eventos (las dos pantallas delegan con un `ctx`). CSS `.cu-*` y `.chip-cliente-proveedor` en `css/main.css`.
2. **Administración** (`modulos/administracion.html`):
   - La ficha del cliente: "También es proveedor" pasó a **"Clasificación"** (Cliente / Proveedor apagado / Cliente y proveedor). Vincular → `vincular_cliente_proveedor`, con el buscador del padrón opcional; avisa "Se creó el proveedor X en Cuentas corrientes." Volver a "Cliente" o "No es proveedor" → confirmación propia → `desvincular_cliente_proveedor`.
   - El proveedor ya no viaja con "Guardar la ficha".
   - La cuenta de un cliente vinculado muestra arriba la cuenta única (`#ad-cuenta-unica`) con Compensar; la cuenta de cliente de siempre sigue abajo.
   - El chip de la lista dice "Cliente y proveedor" (también en Cuentas corrientes → Clientes, que es esta pantalla).
   - Lee las tareas de `cuentas_corrientes` y `clientes.proveedor_id`.
3. **Cuentas corrientes** (`modulos/cuentas-corrientes.html`):
   - En la ficha del proveedor, "Clasificación" (Proveedor / Cliente y proveedor), vincular con `vincular_proveedor_cliente` (pide la empresa si la ficha está en todas) y separar con confirmación.
   - Con una unidad elegida y vinculado, la cuenta única con Compensar.
   - El chip "Cliente y proveedor" en la lista de trabajo (por empresa) y en el padrón.
   - El pago de una compensación se nombra "Compensación con su cuenta de cliente".
   - Lee también las tareas de `pedidos`.
4. **CLAUDE.md**: las entradas de Arquitectura (undécima excepción), Cuentas Corrientes y Administración; y la **renumeración** de las excepciones (ver Decisiones).

## Decisiones tomadas sin consultar

- **La cuenta vive en `js/cuenta-unica.js`** (undécima excepción a la regla de duplicar) y no copiada en las dos pantallas: es "la misma cuenta" y copiada divergiría (el neto o el tope).
- **"Proveedor" solo, en la ficha de un cliente, va APAGADO** (con un `title` que dice por qué), y "Cliente" solo en la de un proveedor también: la ficha de un cliente no puede dejar de ser cliente desde ahí. Las tres opciones se ven, como pidió Facu.
- **En Administración la cuenta única va ARRIBA y la cuenta de cliente de siempre sigue ABAJO** (no se reemplazó): la de abajo tiene "Ver la cobranza" y "Reabrir", el límite de crédito y "También es cliente de…".
- **El proveedor ya no se guarda con "Guardar la ficha"**: `guardar_ficha_cliente` con `proveedor_id` se saltearía `desvincular_cliente_proveedor` (que no deja separar con compensaciones) y no marcaría la cuenta corriente del proveedor. Se actualizaron 3 assertions de `test-administracion-clientes.js` y 1 mutación de `mut-administracion-clientes.js` a esta regla (ahora exigen que NO viaje).
- **"Se creó…" se deduce**: las funciones de vincular devuelven solo el id. Se compara contra lo que se pudo leer ANTES con los mismos permisos (todo el padrón de proveedores, que cualquiera lee; los clientes de esa empresa, si se pueden leer). Si no se puede leer, el aviso no afirma que se creó.
- **Las facturas para compensar salen de `sugerir_facturas_fifo` con un monto enorme** (`TOPE_FACTURAS_CU`): así aparecen TODAS las abiertas sin pedir `cuentas_corrientes:ver_todo`, y su suma es el "le debés" del tope, como en la base (`v_saldo_proveedor.deuda_pendiente`), y no la columna Le debés de la cuenta (que también cuenta créditos).
- **Lo aplicado a las facturas tiene que ser IGUAL a lo que se compensa** (en "Registrar pago" un sobrante queda a favor; acá no se deja, para que la compensación no deje un crédito escondido con el proveedor).
- **Compensar se ofrece aunque el neto esté en cero**, si los dos saldos son > 0 (es justo cuando más sentido tiene).
- **Renumeración de CLAUDE.md**: había dos "octava excepción". La del período (`js/periodo.js`) pasó a **novena** y la de los gráficos (`js/graficos.js`), que era la novena, a **décima**; la nueva de la cuenta única es la **undécima**. También se corrigió el comentario del encabezado de `js/periodo.js` y `js/graficos.js` para que digan lo mismo (no se tocaron los traspasos viejos).
- Se arreglaron de paso **dos mutaciones viejas de `mut-administracion-clientes.js` cuyas anclas ya no existían** desde "Todas las fábricas" ("ver alcanza para la ficha" y "la ficha se abre sin precios"): esa suite de mutaciones abortaba antes de esta tanda.
- En `test-cuentas-corrientes-xss.js` se declaró seguro `CHIP_CLIENTE_PROVEEDOR` (HTML fijo del código) y `htmlClasificacionCC()` (escapa adentro; la suite nueva lo ejecuta con marcas).

## Huecos de base encontrados (para el chat de la base)

1. **CERRADO el 06/10/2026 por la base: `vincular_cliente_proveedor` ya NO le prende la cuenta corriente a un proveedor que ya existía** (solo el que crea nace con `cuenta_corriente = true`). La pantalla nunca lo avisaba, así que no hubo aviso que sacar. Lo que decía antes: **Vincular le prende la cuenta corriente al proveedor, también a uno que ya existía** (`update proveedores set cuenta_corriente = true`). Eso cambia el circuito de ese proveedor en Ingreso y Gastos (sus facturas pasan a ir a su cuenta). Y **desvincular no se lo saca**. La pantalla no lo dice. ¿Es lo que se quiere?
2. **`cuenta_unificada` es SECURITY INVOKER**: quien no tiene `retiros:ver` en esa empresa ve el lado del cliente en cero (y no se ofrece Compensar); quien no tiene `cuentas_corrientes:ver_todo` ve solo sus propias facturas en el lado del proveedor. **Sin ningún error**: la cuenta sale incompleta.
3. **No hay forma de saber si un proveedor es también cliente sin poder leer `clientes`** (su policy pide `pedidos:ver/cargar` o `retiros:ver/cargar`). Cuentas corrientes lo dice ("no se puede ver"); el chip de las listas no aparece. Una función SECURITY DEFINER que devuelva los vínculos (proveedor → empresas) lo resolvería.
4. **Las funciones de vincular no dicen si crearon la otra ficha**: la pantalla lo deduce. Devolver `{ id, creado }` sería exacto.
5. `compensar_cuentas` acepta aplicaciones que suman menos que el monto (el resto queda como crédito a favor del proveedor, por `registrar_pago_proveedor`). La pantalla no lo deja; la base sí.

## Lo que NO se probó

- **Nada con sesión real ni contra la base**: ninguna de las funciones nuevas se ejecutó (Supabase en solo lectura). Todo corre contra un doble y la maqueta.
- No se probó que `compensar_cuentas` acepte exactamente las aplicaciones que arma la pantalla con datos reales, ni el mensaje real de la base cuando el monto supera un saldo.
- No se probó un cliente vinculado con movimientos en dólares (la cuenta muestra un neto por moneda; Compensar es solo en pesos).
- La CC "Clasificación" en la ficha de un proveedor **sin movimientos** no se puede ver: esa ficha no abre ("todavía no tiene movimientos"). Para vincularlo hay que hacerlo desde el cliente.

## Guion para Facu (en la app, con su usuario)

1. Administración → Clientes → un cliente que también te vende → Ficha → Clasificación → "Cliente y proveedor" → Vincular. Tiene que decir si se creó el proveedor o con cuál quedó vinculado.
2. Volver a la cuenta del cliente: arriba, "Te debe / Le debés", la lista con chips y el filtro "Ver".
3. Compensar: tiene que sugerir el menor de los dos saldos; probá poner más (lo dice y no deja); poné menos, mirá "El cliente queda debiendo… · Le debés…" y confirmá.
4. Cuentas corrientes → Proveedores: el chip "Cliente y proveedor" en ese proveedor; abrí su ficha con la unidad elegida: Clasificación y la misma cuenta.
5. Probá separar (volver a "Cliente" o a "Proveedor"): después de una compensación la base no deja, y el mensaje tiene que verse tal cual.

## Números

- `npm run pruebas`: check-bytes verde (749 archivos) y **217/217 en verde**; check-scripts OK.
- `test-cuenta-unica.js` 189/189; `mut-cuenta-unica.js` 82/82 (+10 equivalentes declaradas, aparte).
- `test-cuentas-corrientes-cuenta-unica.js` 99/99; `mut-cuentas-corrientes-cuenta-unica.js` 41/41.
- Mutaciones de las suites tocadas, en verde: `mut-administracion-clientes` 48/48 (+14 eq.), `-cliente-grupo` 37/37, `-clientes-todas` 46/46, `-cobranzas` 73/73 (+9 eq.), `mut-clientes-apodos` 6/6 y 8/8, `mut-cuentas-corrientes-barra-unidad` 44/44, `-circuito` 48/48, `-saldo-inicial` 75/75, `-xss` 109/109, `-proveedores` 53/53, `-cheques-pago` 53/53 (+1 eq.).
- e2e: `27-cuenta-unica` 6/6 (390 y 1280 px, maqueta `cuenta-unica`); además `5-maqueta`, `13-comparar-administracion`, `22-clientes-apodos`, `26-cc-clientes-cheques` y `0-humo` (73 en verde) y `detalles-dispositivos` + `filtros-dispositivos` (190 en verde).
- Para no romper suites ajenas se movió una línea propia en `cambiarUnidadFicha` (el ancla de `mut-cuentas-corrientes-barra-unidad`) y se dio vuelta el orden de `puedeCompensarCC` (el de `mut-cuentas-corrientes-cheques-pago` dejaba de ser único).

## Qué automatizaría ahora

- **Que el runner de mutaciones acepte `equivalente` en las mutaciones a mano** (hoy solo en las automáticas del HTML): para las de un `.js` hubo que filtrar las equivalentes a mano en `mut-cuenta-unica.js`. Es una línea en `mutar.js` (`mutaciones.push({ ..., equivalente: m.equivalente })`).
- **Una prueba que avise cuando una mutación vieja deja de tener ancla** sin esperar a que alguien corra su `mut-*` (acá dos de `mut-administracion-clientes.js` llevaban días rotas): un `test-anclas-mutaciones.js` que, sin correr nada, verifique que cada `de:` de cada `mut-*.js` exista una sola vez en su archivo. Corre en segundos y entraría en `correr-todo.js`.
- **Un doble de Supabase compartido para las suites** (hoy cada suite arma el suyo: el de Administración no tiene `.not()`, el de Cuentas corrientes otro): un `pruebas/supabase-falso.js` con todos los filtros, que anote lo que se pidió, evitaría reescribirlo en cada suite nueva.
