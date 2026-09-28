# Traspaso — Caja: la barra de unidad de negocio (28/09/2026)

Prompt para el chat de arquitectura (dueño de CLAUDE.md). Quien lo recibe no vio este trabajo: todo lo necesario está acá.

## Qué se hizo

Tanda nocturna 27-28/09/2026, parte 4. La barra de unidad de arriba (`js/barra-unidad.js`, commit `5592f5a`) ya la cargaba `modulos/caja.html`, pero Caja no filtraba nada. Ahora Caja muestra solo lo de la unidad elegida. **Solo cambió `modulos/caja.html` (presentación y filtrado en el cliente) y sus suites. Cero SQL, cero cambios de base, de RPCs, de policies o de permisos.** No se tocó `js/barra-unidad.js` ni `css/main.css`.

Rama del subagente: `worktree-agent-a60759cc8e4a5f205` (commits: ver el final).

## Las reglas que quedaron (y por qué)

**De qué unidad es cada cosa** (`unidadDeEmpleado`, `unidadDeCuenta`, `unidadDeMovimiento`):
- Una **persona** es de su unidad (`empleados.unidad_negocio_id`, por `v_empleados_publico`). La **Empresa** no es de ninguna unidad; sus **cuentas** sí.
- Una **cuenta** es de su propia unidad si la tiene y, si no, de la unidad de su dueño. Verificado contra la base el 28/09/2026: las **9** cuentas de Empresa tienen `unidad_negocio_id`; las **20** personales no tienen ninguna.
- Un **movimiento** es de la unidad de su **cuenta** y, si la cuenta no está cargada, de la de su **dueño**. **DECISIÓN pedida en el encargo (persona o cuenta): se eligió la CUENTA con la persona de respaldo**, porque la plata de la Empresa vive en cuentas que son por unidad (un ingreso de Empresa en "Banco Macro Nuss" es de Nuss aunque el dueño sea la Empresa), y la plata de una persona está en cuentas personales sin unidad, así que cae en la unidad de la persona. Por persona sola, todo lo de la Empresa quedaría "sin unidad". Verificado el 28/09/2026: los **313** movimientos tienen `cuenta_id` (cero sin cuenta), así que la regla se puede aplicar a todo.
- **Sin unidad** (`null`): se **ve siempre**, marcado con un chip neutro de borde punteado "sin unidad", pero **no se suma** en el total de una unidad, y se dice en chico cuántas cosas quedaron afuera. Hoy son: ninguna persona con acceso sin unidad, ninguna cuenta de Empresa sin unidad (verificado); el caso aparece si alguien crea una cuenta de Empresa "Sin asignar".
- Con **una sola unidad** la barra no aparece: no se filtra ni se marca nada (ninguna etiqueta de unidad).

**Dónde se aplica:**
- **Listado (pestaña Caja):** con una unidad, solo su grupo y el de "Sin empresa asignada" (las personas sin unidad no desaparecen). Con Todas, todos los grupos con su subtotal (como antes).
- **Tarjeta del total:** con Todas, el total de siempre **más el detalle por unidad** (una línea por unidad, con las personas de esa unidad y las cuentas de Empresa de esa unidad; "Sin unidad" al final). Con una unidad: la etiqueta dice "Total · <unidad>", el monto es **solo** lo de esa unidad (sus personas por `v_caja_saldos` + las cuentas de Empresa de esa unidad por `v_caja_saldos_cuenta`; la Empresa se suma por sus cuentas porque son por unidad), el desglose por medio trae solo las cuentas de la unidad, "No incluye N cajas o cuentas sin unidad" en chico si hay, y "Con saldo" cuenta las personas de la unidad (y la Empresa si tiene saldo en una cuenta de la unidad).
- **"Mov. del mes":** ahora se cuenta aparte, con turno (`contarMovimientosDelMes()`). Con Todas, la MISMA consulta de siempre. Con una unidad, un conteo `head` con `.or('empleado_id.in.(personas de la unidad),cuenta_id.in.(cuentas de Empresa de la unidad)')`: no descarta nada que no deba (todo movimiento tiene dueño y cuenta). Si falla, **"—"** (antes quedaba en 0).
- **"Pendientes" NO se separa por unidad, a propósito:** son las solicitudes que TENÉS que responder, y coincide con la burbuja de `mis_pendientes()`. Con una unidad elegida dice en chico "tuyos, de todas las unidades".
- **Ficha de Empresa:** con una unidad, las cuentas de esa unidad y las sin unidad (marcadas); el **saldo es solo el de las cuentas de la unidad** (y el desglose por medio no suma la sin unidad), con la nota si hay alguna sin unidad. Los movimientos, el filtro de cuentas y el Excel, recortados igual. Con Todas: todo, y cada movimiento dice su unidad.
- **Ficha de una persona: NO se recorta.** La caja de una persona no se separa por unidad (sus cuentas no tienen unidad). Si la persona es de otra unidad (o de ninguna), se dice en chico: "La caja de una persona no se separa por unidad: se ve entera."
- **Retiros socios y Todos los movimientos:** la lista, el total y el Excel son **lo que se ve**; los filtros de persona y de cuenta ofrecen solo lo de la unidad (y lo sin unidad). Con Todas, cada fila dice su unidad y el total trae el detalle por unidad.
- **Directorio:** las personas de la unidad, las sin unidad y la Empresa; las cuentas de la Empresa recortadas. Con Todas, cada persona dice su unidad.
- **Operar (modales de ingreso, egreso, retiro, traspaso):** las cuentas de la **Empresa** que se ofrecen son las de la unidad elegida (y las sin unidad) —`cuentasOperables()`—; con Todas, todas, y la etiqueta de cada una dice su unidad. **Las cuentas personales no se recortan.** Consecuencia buscada: con "Nuss" elegido no se puede elegir una cuenta de Dolce Pasta de la Empresa; para un traspaso entre cuentas de Empresa de DOS unidades hay que poner Todas arriba (el mensaje de "no tiene ninguna cuenta" lo dice).
- **La contraparte de un movimiento NO se recorta por unidad:** es a quién se le da o de quién se recibe la plata, no una lista para mirar; recortarla trabaría un movimiento legítimo entre unidades.

**Cambiar la barra con la pantalla abierta repinta sin recargar** (`alCambiarUnidad(alCambiarUnidadCaja)` → `repintarPorUnidad()`): las listas se recortan donde se arman, así que casi nada vuelve a la base. Solo vuelven: "Mov. del mes" (con turno) y un filtro que tenía elegida una persona o una cuenta que ya no se ofrece (se poda y se vuelve a consultar). Además, `cargarMovimientos`, `cargarMovimientosFichaEmpresa`, `cargarRetiros` y `cargarTodosMovimientos` ahora llevan **turno**: una respuesta vieja no pisa la nueva.

**Selector retirado:** **ninguno.** Caja no tenía ningún selector de unidad para MIRAR (verificado contra el baseline `5592f5a`: el único `<select>` de unidad es el de la cuenta nueva de Empresa). Por eso no hay suite de controles de Caja que actualizar.

**Registro nuevo:** el campo "Unidad de negocio" de una cuenta nueva de Empresa **queda** (no es un filtro) y **viene puesto con la unidad de la barra** si hay una elegida; con Todas, "— Sin asignar —" como siempre.

**Operación que pide una unidad con Todas:** **ninguna en Caja.** La única que elige unidad es la cuenta nueva de Empresa, y ahí la unidad es optativa en la base ("Sin asignar" vale), así que no se inventó un paso obligatorio.

**Lo que no se pudo filtrar por unidad y lo dice la pantalla:** "Pendientes" (ver arriba) y la caja de una persona. Nada más quedó sin separar.

**La fábrica de pruebas y las tablets siguen afuera**: no se tocaron esos filtros (`sinPersonasDePrueba`, `sinUnidadesDePrueba`, `esCuentaDeTablet`); la barra ya saca la unidad del robot para una cuenta real.

## Qué verificar / cómo se verificó

- SELECTs contra la base (28/09/2026): cuentas por tipo de dueño y unidad (9 de Empresa con unidad, 20 personales sin), movimientos sin `cuenta_id` (0), personas con acceso sin unidad (0), unidades y logos.
- Suite nueva `pruebas/test-caja-barra-unidad.js`: EJECUTA las funciones reales de caja.html (y `pasaFiltroUnidad` real de `js/barra-unidad.js`, que `extraer.js` encuentra por el import) con un document falso: Todas muestra todo y el detalle por unidad, una unidad muestra solo lo suyo, lo sin unidad se ve siempre y no se suma, el cambio repinta (y poda filtros), el turno de "Mov. del mes" y de Retiros, el selector viejo no existe, la cuenta nueva viene con la unidad, los nombres de unidad se escapan. Contra el baseline `5592f5a` da rojo.
- Suites existentes actualizadas sin aflojar lo que protegían: `test-caja-fabrica-pruebas.js` (el sandbox suma los helpers nuevos con la barra en Todas: sigue probando SOLO la fábrica), `mut-caja-fabrica-pruebas.js` (el ancla del Promise.all del init suma `promesaUnidad`), `test-caja-xss.js` y `test-caja-pendientes.js` (la clausura reconoce lo importado de `js/barra-unidad.js`; `test-caja-xss.js` justifica cada interpolación nueva en su lista de seguras).
- Maqueta: `pruebas/datos-maqueta/caja.js` → `e2e/maqueta/datos/caja.json` (super_admin, personas en Nuss y Dolce Pasta, la Empresa con cuentas de las dos y una sin unidad). Mirado a **1280 y 390 px**: listado, total, ficha de Empresa, Retiros y Todos los movimientos, con Todas, Nuss y Dolce Pasta; **sin scroll horizontal** y **sin errores en la consola**. Los totales cierran (Todas $ 3.136.500 = Nuss 2.207.000 + Dolce 928.500 + sin unidad 1.000).

## Números finales

- `node pruebas/check-bytes.js`: verde (0 CR, 0 NUL, sin comillas abiertas). `check-scripts`: OK.
- `node pruebas/correr-todo.js`: **126/126 en verde**.
- Suites de Caja: `test-caja-barra-unidad` **122/122** (nueva), `test-caja-fabrica-pruebas` 82/82, `test-caja-xss` 171/171, `test-caja-pendientes` 92/92, `test-caja-tablets` 35/35, `test-caja-numeros` 379/379; `test-maqueta-datos` 20/20.
- Mutaciones, de a una: `mut-caja-barra-unidad` **61/61** (nueva), `mut-caja-fabrica-pruebas` 7/7, `mut-caja-numeros` 24/24, `mut-caja-pendientes` 45/45, `mut-caja-tablets` 9/9, `mut-caja-xss` 60/60.
- Dos mutaciones escaparon en la primera corrida y se investigaron antes de tocar nada: (1) "el conteo del mes sin turno" — el doble de supabase armaba la respuesta al correr el `then`, así que la consulta vieja traía el dato nuevo y los dos turnos daban lo mismo; ahora la respuesta se toma al ARMAR la consulta. (2) "el desglose de Empresa suma también la sin unidad" — la assertion buscaba "$ 600,00", que también aparece en la fila de la cuenta; ahora mira el resumen del medio.

## Lo que NO se probó

- Nada con sesión real ni contra la base (el conector está en solo lectura; las suites corren contra un doble y la maqueta ignora `.or()` y el `count`, así que ahí "Mov. del mes" dice 0).
- El `.or()` con dos `in.(…)` de `contarMovimientosDelMes()` no se ejecutó contra PostgREST real. La forma es la documentada (`empleado_id.in.(a,b),cuenta_id.in.(c)`), pero hay que mirarlo una vez con sesión.
- La barra en el celular real (Facu).

## Guion para Facu

1. Entrá a Caja con tu usuario. Arriba tiene que estar la barra con "Todas" y las unidades.
2. Con **Todas**: la tarjeta "Total de la empresa" tiene que traer, debajo del número grande, una línea por unidad (Nuss, Dolce Pasta, Mengui, Taller) con su plata. Sumadas tienen que dar el total.
3. Tocá **Nuss**: la tarjeta pasa a decir "Total · Cucuruchos Nuss" y el listado muestra solo el grupo de Nuss. "Mov. del mes" cambia. "Pendientes" dice "tuyos, de todas las unidades".
4. Tocá **Empresa**: con Nuss elegido, solo las cuentas de Nuss y sus movimientos; el saldo es el de esas cuentas.
5. Cambiá a **Dolce Pasta** sin salir de la ficha: se repinta sola, con las cuentas de Dolce Pasta.
6. Volvé y abrí tu propia caja con una unidad que NO sea la tuya: tiene que verse entera, con la nota chica de que la caja de una persona no se separa por unidad.
7. **Retiros socios** y **Todos los movimientos**: con una unidad elegida, solo lo de esa unidad; el filtro de persona ofrece solo gente de esa unidad. Con Todas, cada fila dice de qué unidad es.
8. Probá un **Egreso desde la ficha de Empresa** con Nuss elegido: el selector de cuenta ofrece solo las de Nuss.
9. Creá (o empezá a crear, y cancelá) una **cuenta nueva de Empresa** con Nuss elegido: la unidad tiene que venir puesta en Nuss.

## Qué sección de CLAUDE.md tocar

- **Módulos → 2. Caja:** una viñeta nueva "LA BARRA DE UNIDAD (28/09/2026)" con las reglas de arriba (de qué unidad es cada cosa, dónde se recorta, lo que no se separa y por qué, la decisión cuenta-y-después-persona para los movimientos, "Pendientes" sin separar, las cuentas de Empresa recortadas al operar y la contraparte no, cero selectores retirados, los turnos nuevos y "Mov. del mes" en "—" si falla).
- **Tablas → Caja → `cuentas_caja.unidad_negocio_id`:** anotar que hoy solo las de Empresa la tienen (9 de 9) y las personales no (0 de 20), medido el 28/09/2026, y que Caja la usa para la barra.
- **Reglas de oro → Las suites viven en `pruebas/`:** sumar `test-/mut-caja-barra-unidad.js` y los datos de maqueta `caja`.

## Pedido al integrador (no a arquitectura)

- Si se quiere Caja en `e2e/5-maqueta.spec.js` o `e2e/7-barra-unidad.spec.js`: pantalla `modulos/caja.html`, datos **`caja`** (`?maqueta=caja`). La barra aparece (super_admin, tres unidades activas, sin la de pruebas). Vistas útiles: listado (Todas / `u-n` / `u-d`), `#btn-empresa-atajo` (ficha de Empresa), pestañas `retiros` y `todos-movimientos`.
- **No hay baseline de controles de Caja que reescribir** (Caja no tiene `controles-caja.js`). El baseline `5592f5a` de `test-caja-barra-unidad.js` es el commit de la base de esta rama, que ya está en `main`: no hace falta reescribirlo al integrar.

## Qué automatizaría ahora

La tarea repetida más cara de esta parte fue **actualizar a mano las listas de funciones de los sandboxes** de cada suite vieja cuando un render empieza a llamar a un helper nuevo (acá: `test-caja-fabrica-pruebas.js` con su lista fija, y la clausura de `test-caja-xss.js` / `test-caja-pendientes.js`, que no veía lo importado de `js/`). La solución: que `sandbox.js` ofrezca UNA clausura compartida (`clausura(src, entradas, stubs)`) que ya incluya lo que el script importa de `js/` (usando `pruebas/imports.js`), y que las suites dejen de mantener listas fijas. Hoy cada módulo tiene su copia de la clausura y cada uno se rompe por separado cuando un módulo empieza a importar algo.
