# Traspaso — Cuentas Corrientes con la barra de unidad de arriba (28/09/2026)

**Para:** el chat de arquitectura (dueño de CLAUDE.md). Autocontenido: quien lo lea no vio el trabajo.
**De:** el subagente de Cuentas Corrientes, tanda nocturna 27-28/09, Parte 4.
**Rama:** `worktree-agent-afe9618da593b32e1` (sin push; la integra el orquestador). Base: `5592f5a` (la barra de unidad, `js/barra-unidad.js`).
**Cero SQL corrido, cero cambios de base, de RPCs, de policies ni de permisos.** Solo lecturas de verificación (ver "Qué se verificó").

## Qué cambió y por qué

Facu elige la fábrica UNA vez, en la barra de unidad de arriba (`js/barra-unidad.js`, ya cargada en la página desde `5592f5a`), y Cuentas Corrientes muestra solo lo de esa unidad. `modulos/cuentas-corrientes.html` importa `unidadesDeLaBarra`, `alCambiarUnidad`, `pasaFiltroUnidad` y `estadoUnidad`.

1. **Se retiraron los tres selectores de unidad del módulo** (`#filtro-unidad-proveedores`, `#filtro-unidad-historial`, `#filtro-unidad-ficha`, y `poblarFiltrosUnidad()` / `renderizarSelectorUnidadFicha()`): lo decide la barra. Declarados RETIRADOS con su motivo en `pruebas/controles-cuentas-corrientes.js` (nuevo; baseline `5592f5a`).
2. **Todo se filtra donde se ARMA la lista, nunca en la consulta.** Las consultas de `v_saldo_proveedor`, `v_cuenta_corriente_movimientos` y `creditos_proveedor` (lista, historial, padrón y ficha) ya no llevan `.eq('unidad_negocio_id', …)`: traen todo lo que el RLS deja ver y la unidad se aplica al armar (`armarListaSaldos`, `armarHistorial`, `armarPadronSaldos`, y en la ficha `saldosFichaVisibles`, el filtro de `renderizarFichaMovimientos` y el de `htmlRemitosSinFacturar`). Con eso **cambiar la barra repinta sin volver a consultar** (`cambiarUnidad(elegida)`, suscripta con `alCambiarUnidad` ANTES de esperar las cargas del `init`), y una fila sin unidad no se pierde en un `.eq`. La búsqueda de proveedores y la del historial también filtran lo ya cargado (antes reconsultaban). `cargarSaldos` y `cargarHistorial` llevan un **turno** (una respuesta vieja que llega tarde no pisa la nueva), y las cargas de la ficha se descartan si la ficha cambió mientras tanto.
3. **"Todas" = la suma con el detalle por unidad:** la lista de trabajo dice la unidad de cada fila (ya lo hacía); el resumen de arriba suma, **debajo de "Saldo total a pagar" y de "Crédito a favor", el total de cada unidad** (`htmlDesgloseResumen`, solo con la barra en Todas y si hay más de una unidad con algo en ese campo); el historial y las facturas sin proveedor dicen la unidad de cada fila; el padrón suma todas ("Saldos sumando todas las unidades."); la ficha en todas las unidades desglosa el saldo por unidad (ya lo hacía).
4. **Una unidad elegida:** la lista de trabajo, el resumen, las facturas sin proveedor, el historial y la ficha muestran solo lo de esa unidad; el padrón lista TODOS los proveedores (un proveedor no es de una unidad) con **los saldos y las descargas sin importe de esa unidad**, y lo dice ("Saldos de Cucuruchos Nuss. La lista de proveedores es la misma en todas las unidades.").
5. **Lo sin unidad no desaparece (regla g):** se ve en cualquier unidad elegida, marcado **"Sin unidad"** (`etiquetaUnidad(id)`). En la ficha, un movimiento sin unidad no lleva saldo corrido (su corrido es el de "sin unidad", no el de la unidad mirada). Hoy no hay ninguna fila sin unidad (medido abajo); `facturas_pendientes.unidad_negocio_id` es nullable, así que puede haber.
6. **Operar necesita UNA unidad (regla f) — DECISIÓN: se elige EN LA FICHA, sin cambiar la barra.** Con la barra en "Todas" y la ficha en todas las unidades, "Registrar pago" y "Aplicar crédito" siguen deshabilitados, el banner dice *"Registrar un pago o aplicar un crédito es de una unidad: elegila abajo."* y debajo aparece `#ficha-unidad-operar`: *"Para registrar un pago o aplicar un crédito, elegí de qué unidad es la cuenta (la barra de arriba no cambia):"* con un botón por unidad del proveedor (de `facturas_pendientes`, sin la fábrica de pruebas: `unidadesDeFicha`). Tocarlo (`cambiarUnidadFicha`) pasa la ficha a esa unidad **y la barra sigue en Todas**. Cuando la ficha muestra otra cosa que la barra se dice: *"Esta cuenta muestra Cucuruchos Nuss; arriba están todas las unidades."* + "Ver todas las unidades".
   - **Por qué no "elegí una unidad arriba":** cambiar la barra para pagarle a UN proveedor cambiaría lo que se ve en toda la app (y en las otras pestañas del navegador, que la siguen); elegirla acá es local a la cuenta que se está pagando. Sin `registrar_pago` ni `aplicar_credito` el texto pasa a *"Para ver la cuenta de una sola unidad, con el saldo corrido, elegila…"*.
   - **Operar usa SOLO la unidad** (estricto, sin lo "sin unidad"): la moneda del pago sale de `saldosFichaDeUnidad()`, los créditos de `creditosFichaDeUnidad()`. Las RPCs y las consultas del modal de pago y de crédito no cambiaron (siguen con `.eq('unidad_negocio_id', estado.ficha.unidadId)`: un pago es de una unidad).
7. **La ficha abre en:** la unidad que se le pasa (la tarjeta de la lista, o el `&unidad=` del link) o, si no, la de la barra (`unidadId || estado.unidadElegida || null`). Cambiar la barra con la ficha abierta la pasa a esa unidad y re-sincroniza la URL. **El deep link `?proveedor=X&unidad=Y` sigue andando**, también si la barra dice otra (se dice y se ofrece "Ver <la de la barra>"); sin `&unidad=`, abre en la de la barra.
8. **Lo que no se puede filtrar lo dice (regla h):** la pestaña "Pendientes de aceptación" (los proveedores no son de una unidad): con una unidad elegida aparece *"Los proveedores no son de una unidad de negocio: esta lista es la misma en todas."*. El contador de pendientes tampoco se filtra.
9. `contarSinImporte()` no cambió (la lista, por grupo proveedor+unidad); nueva `contarSinImporteVisible()` con la regla de la barra para el padrón y el banner de la ficha.

## Qué NO se pudo filtrar / límites

- **Proveedores pendientes de aceptación y su contador**: la tabla `proveedores` no tiene unidad. Se dice en chico.
- **El padrón** lista siempre todos los proveedores (no tienen unidad); lo que se filtra son sus saldos.
- **El tope de 1000 filas de PostgREST**: al sacar la unidad de la consulta del historial, con una unidad elegida se traen también las filas de las otras. Hoy son 61 movimientos en total (medido); si crecen a cientos por rango de fechas conviene una consulta con `.or('unidad_negocio_id.eq.X,unidad_negocio_id.is.null')`. En "Todas" el tope ya existía igual.
- `js/barra-unidad.js` no se tocó. Nada que pedirle.

## Qué se verificó y contra qué

- Base (solo lectura, 28/09/2026): `facturas_pendientes.unidad_negocio_id` es **nullable** (0 de 43 en null), `creditos_proveedor.unidad_negocio_id` **NOT NULL**, 0 filas sin unidad en `v_saldo_proveedor` y en `v_cuenta_corriente_movimientos` (61 filas), 0 facturas sin proveedor abiertas, 0 descargas `sin_importe`.
- Suites (todas en verde en la rama): `test-cuentas-corrientes-barra-unidad.js` **87/87** (nueva; ejecuta los renders reales con la unidad elegida, lo sin unidad, el cambio de barra sin consultar, el turno con una respuesta vieja que llega tarde, la ficha en Todas / local / con la barra / por deep link, el pago y el crédito solo de la unidad) con `mut-cuentas-corrientes-barra-unidad.js` **44/44**; `controles-cuentas-corrientes.js` **463/463** (nuevo, baseline `5592f5a`, los tres selectores declarados RETIRADOS); `test-cuentas-corrientes-xss.js` **199/199** (era 183; mut **108/108**); `test-cuentas-corrientes-circuito.js` **107/107** (mut **48/48**); `test-cuentas-corrientes-numeros.js` **291/291** (mut **42/42**); `test-cuentas-corrientes-fabrica-pruebas.js` **28/28** (era 41: los chequeos de los dos filtros de la lista se fueron con los filtros; la fábrica en la barra la cubre `test-barra-unidad.js`; queda la elección de unidad de la ficha; mut **10/10**). `check-bytes` y `check-scripts` en verde; `correr-todo.js` completo en verde (ver el cierre).
- **Mirado en la maqueta** (Playwright headless, sin sesión real) a **390 y 1280 px**: sin scroll horizontal, sin errores de JavaScript; la barra muestra Todas / Nuss / Dolce Pasta (sin la de pruebas); la lista, el desglose del resumen, la ficha en Todas con la elección de unidad, la ficha local, la ficha siguiendo a la barra y la nota del padrón. Datos nuevos: `pruebas/datos-maqueta/cuentas-corrientes.js` → `e2e/maqueta/datos/cuentas-corrientes.json` (un usuario con unidad propia Nuss + una tarea con alcance en Dolce Pasta).

## Lo que NO se probó

- Nada con sesión real ni contra la base (ninguna RPC se ejecutó).
- La barra cambiada desde OTRA pestaña (evento `storage` de `js/barra-unidad.js`): el módulo solo escucha `alCambiarUnidad`, que la barra dispara también en ese caso.
- Un pago o un crédito aplicados de verdad después de elegir la unidad en la ficha.

## Guion para Facu

1. Entrá a Cuentas Corrientes con la barra de arriba en **Todas**. Debajo de "Saldo total a pagar" tiene que aparecer el total de cada unidad.
2. Tocá **Nuss** en la barra: la lista, el resumen, las facturas sin proveedor y el historial quedan solo con lo de Nuss (y lo que no tenga unidad, marcado "Sin unidad"). No tiene que recargar.
3. Volvé a **Todas**, entrá a un proveedor con deuda en dos unidades por "Ver todos los proveedores". "Registrar pago" tiene que estar apagado y abajo del saldo te pide elegir la unidad. Tocá una: se habilita "Registrar pago" y **la barra de arriba sigue en Todas**. Tocá "Ver todas las unidades" para volver.
4. Con la ficha abierta, tocá **Dolce Pasta** en la barra: la ficha pasa a Dolce.
5. Registrá un pago de prueba chico en una unidad y fijate que se aplique a las facturas de ESA unidad.
6. En "Pendientes de aceptación" con una unidad elegida tiene que decir que esa lista es la misma en todas.

## Qué sección de CLAUDE.md tocar

- **Módulo 3, Cuentas Corrientes**: reemplazar lo de *"se entra siempre en 'Todas las unidades' … y hay un filtro de unidad adentro"* por la barra (puntos 1-8 de arriba, en particular la decisión de la regla f y que la ficha abre en la unidad de la barra o la del link).
- **Fábrica de pruebas, tabla "Dónde se aplica"**, fila Cuentas Corrientes: ya no son "los tres filtros de unidad (`poblarFiltrosUnidad()`, `unidadesDeFicha()`)" sino **la elección de unidad de la ficha (`unidadesDeFicha()`)**; los filtros los reemplaza la barra. Suite 28/28 · 10/10.
- **Estilo visual / pruebas**: sumar `controles-cuentas-corrientes.js` (baseline `5592f5a`) y `test-/mut-cuentas-corrientes-barra-unidad.js` a la lista de `pruebas/`, y `cuentas-corrientes` a los datos de la maqueta.

## Qué automatizaría ahora

- **Un helper de sandbox para la barra**: cada suite de módulo va a necesitar `pasaFiltroUnidad` y un `estado.unidadElegida`; hoy cada una lo agrega a su lista de funciones a mano. Un `preludioBarraUnidad()` en `pruebas/` (el código real de `js/barra-unidad.js` + un doble de `alCambiarUnidad` que dispare el cambio) ahorraría eso en los doce módulos.
- **Pedir puertos libres a la maqueta**: `e2e/maqueta/servir.js` con un puerto fijo choca cuando varios subagentes miran a la vez (me pasó con 4187 y 4263, ocupados por otros); que acepte `0` (puerto libre) e imprima la URL.
- **Sumar esta pantalla a `e2e/5-maqueta.spec.js`** (no lo edité: lo integra el orquestador): `modulos/cuentas-corrientes.html`, datos `cuentas-corrientes`, vistas: la lista, "Ver todos los proveedores", la ficha de Harinera Uno SA (tarjeta Nuss).
