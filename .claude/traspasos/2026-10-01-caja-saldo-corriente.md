# Traspaso — Caja: el saldo corriente, rehecho sobre main (01/10/2026)

Para el chat de arquitectura (dueño de CLAUDE.md). Autocontenido: quien lo lee no vio el trabajo.

## Qué es

La rama `ci-prueba/caja-saldo-corriente` (sin integrar; se integra de noche, cuando Facu lo diga) suma a Caja el **saldo corriente**: debajo del importe de cada movimiento, "Saldo $ X" = el saldo de SU cuenta después de ese movimiento, como en un extracto. Verde con cero o más, bordó si queda negativo, "—" si no se sabe (nunca "$ 0"). Está en la ficha de una persona, la ficha de Empresa, Retiros socios y Todos los movimientos; con un filtro de fechas, al pie va "Saldo al dd/mm/aaaa" (el saldo de cada cuenta antes del primer día del filtro).

La rama salía de un main viejo (`1bb50c5`) y chocaba con el caja.html de `0faf0ae` (filtrar por empresa) y `c1f1f52` (ingreso externo solo super_admin, ajustes). Se rebasó sobre `0faf0ae` y se ajustó.

## Cómo se calcula (sin cambios de fondo, del commit original)

- Por cuenta, en orden fecha → created_at → id; todo en centavos enteros.
- Signo = el de las vistas `v_caja_saldos*`: todo tipo que empieza con `ingreso` suma, el resto resta. **Incluye los ajustes** (`ingreso_ajuste` suma, `egreso_ajuste` resta): verificado con `pg_get_viewdef` el 01/10/2026 (`tipo ~~ 'ingreso%'`) y con pruebas que cierran contra la vista con ajustes de por medio.
- Sobre TODA la historia de cada cuenta (`leerHistoriaCaja`: de a 1000 filas con el conteo exacto, hasta 20 páginas), nunca sobre lo que se ve. Si no se pudo leer entera → "—" en esa lista y un aviso.
- El último saldo de cada cuenta tiene que dar `v_caja_saldos_cuenta`; si no da, esa cuenta no muestra saldos ("—") y se dice.

## Qué cambió al rehacerla sobre main

1. **Con una empresa elegida en la barra, la ficha de Empresa trae movimientos de cajas de otras personas** (`estado.movimientosPorUnidad`, de `0faf0ae`). El saldo de cada renglón sigue siendo **el de la cuenta ENTERA**: la historia se pide por `cuenta_id` sin el filtro de empresa ni de fechas. Ejemplo probado: un gasto de Nuss pagado desde la caja de Tito (de Dolce) dice el saldo de toda la cuenta de Tito (con lo de Dolce adentro), y no cambia al filtrar por fechas.
2. **Regla nueva — en una lista que mezcla cajas, el saldo va SOLO en los renglones cuya cuenta se puede leer entera** (`cuentaConSaldoLegible(cuentaId)`): se conoce de quién es la cuenta (`estado.cuentasPorId`) y quien mira puede leer TODOS sus movimientos — `puedeVerMovimientosDeTodos()` (ver_listado / retiros_todos / movimientos_todos, lo mismo que la policy de `caja_movimientos`) o es su propia cuenta. En los demás renglones **no se dibuja nada** (ni "—"), la historia no se pide para esa cuenta, y no entra al aviso ni al "Saldo al". Motivo: si la historia leída estuviera incompleta por RLS, `v_caja_saldos_cuenta` (que es `security_invoker` y respeta el mismo RLS) cerraría igual contra un número falso. Hoy, como el modo "toda la empresa" ya exige `puedeVerMovimientosDeTodos`, en la práctica solo saca las cuentas que no se pudieron cargar; es una red.
   - Dato verificado el 01/10/2026: en las 343 filas de `caja_movimientos` con cuenta, el `empleado_id` del movimiento es SIEMPRE el dueño de la cuenta (0 distintos), así que el RLS hoy deja ver una cuenta entera o nada. Es un dato de ese día, no una garantía estructural.
3. Los ajustes se ven en gris (de main) y su saldo conserva su color (verde/bordó): el gris solo pisa el importe y la descripción.

## Conflictos y cómo se resolvieron

- `modulos/caja.html` (CSS): se quedaron las dos cosas (entradas y salidas + ajustes de main, y los estilos del saldo de la rama).
- `modulos/caja.html` (`cargarMovimientosFichaEmpresa`): `estado.movimientosPorUnidad = porUnidad` de main y después `await cargarSaldoFicha(...)` de la rama.
- `modulos/caja.html` (`renderizarMovimientos`): `mostrarPersona: deTodasLasCajas` de main + el saldo de la rama, con `saldo: legible(m) ? sc : null` y las cuentas del aviso / "Saldo al" filtradas por `cuentaConSaldoLegible` en modo "toda la empresa". `cargarSaldoFicha` pide la historia de `cuentasConSaldoFicha()`.
- `pruebas/datos-maqueta/caja.js`: `mov()` lleva `unidad` (main) y `fecha` (rama), en ese orden; la historia de cada cuenta suma su unidad. Se ajustaron dos saldos iniciales (Beto 15.700, Banco Macro Nuss 1.562.500) para que cierren con el gasto de Nuss de Beto (`m-7`) y el ajuste de main (`m-6`), y se sumó un ajuste que suma (`e-1b`). `e2e/maqueta/datos/caja.json` regenerado con `npm run maqueta:datos`.
- `pruebas/test-caja-xss.js`: las entradas de la rama para `renderizarMovimientos`/Retiros/Todos (con el saldo) + `htmlEntradasYSalidas` y `renderizarTotalesFicha` de main.
- Además, suites de main que se rompieron con la rama: `test-caja-cobranza.js` y `test-caja-ingreso-externo.js` suman `htmlSaldoDeFila`/`htmlCentavos` a su lista de funciones; `test-caja-unidad-movimientos.js` toma la consulta de la LISTA (`consultasLista`, la que trae el gasto embebido) y no la última, que ahora es la de la historia del saldo.

## Qué se verificó

- `node pruebas/check-bytes.js` y `node pruebas/correr-todo.js`: **195/195 en verde**.
- `test-caja-saldo-corriente.js` 115/115 (casos nuevos: ajustes que suman y restan y cierran contra la vista; con Nuss elegido el saldo es el de la cuenta entera y no cambia al filtrar por fechas; con Dolce el mismo criterio; un renglón de una cuenta que no se puede leer no muestra saldo; `cuentaConSaldoLegible` con y sin `movimientos_todos`). `mut-caja-saldo-corriente.js` 50/50 detectadas.
- Mutaciones de Caja de a una (`FILTRO=mut-caja node pruebas/correr-todo.js mut`): **11/11 runners, 311/311 mutaciones detectadas**. `mut-caja-unidad-movimientos.js` abortó la primera vez con dos anclas que ya no existían (el render y la línea de `movimientosPorUnidad` cambiaron con el saldo): se reanclaron al código nuevo, con la misma mutación, y dio 20/20.
- Base, solo lectura (01/10/2026): las tres `v_caja_saldos*` con `security_invoker=true` y `tipo ~~ 'ingreso%'`; la policy "leer movimientos propios o con tarea" de `caja_movimientos`.
- Maqueta (`?maqueta=caja`, Nuss elegido, ficha de Empresa) a 1280 y 390 px: sin scroll horizontal, ninguna tarjeta desbordada, sin errores de consola; el gasto de Nuss de Beto dice "Saldo $ 8.500,00" (su cuenta entera).

## Lo no probado

- Nada con sesión real ni contra la base de verdad (las suites corren contra un doble; la maqueta es datos fijos).
- No se corrieron las pruebas de navegador (`npm run e2e`): en las ramas `ci-prueba` no corren. Correrlas al integrar.
- Rendimiento con cuentas de muchos movimientos en "toda la empresa": la historia se pide para todas las cuentas que aparecen en la lista (puede ser bastantes). Sigue el tope de 20.000 filas → "—" y aviso.

## Texto propuesto para CLAUDE.md (módulo Caja, una viñeta nueva)

> - **EL SALDO CORRIENTE** (01/10/2026, rama `ci-prueba/caja-saldo-corriente`; traspaso `.claude/traspasos/2026-10-01-caja-saldo-corriente.md`): debajo del importe de cada movimiento, "Saldo $ X" de SU cuenta después de ese movimiento (verde; bordó si negativo; "—" si no se sabe, nunca "$ 0"), en la ficha de una persona, la de Empresa, Retiros socios y Todos los movimientos, y "Saldo al dd/mm/aaaa" al pie con filtro de fechas. Por cuenta, en orden fecha / created_at / id, en centavos, con el signo de `v_caja_saldos*` (los ajustes suman y restan como cualquiera), sobre TODA la historia de la cuenta (`leerHistoriaCaja`, de a 1000 con el conteo exacto), **nunca sobre lo filtrado**: con una empresa elegida el saldo de un renglón de la caja de otra persona es el de su cuenta entera y no cambia al filtrar. El último tiene que dar `v_caja_saldos_cuenta`; si no, "—" y la pantalla lo dice. **En una lista que mezcla cajas, el saldo va solo donde la cuenta se puede leer entera** (`cuentaConSaldoLegible`: cuenta conocida + `puedeVerMovimientosDeTodos()` o cuenta propia); en los demás renglones no se dibuja nada. Suite `test-caja-saldo-corriente.js` (115; mut 50/50).

## Qué automatizaría ahora

Cada rama `ci-prueba` que toca un módulo muy activo (Caja) choca con main al día siguiente, y los conflictos se repiten en los mismos tres lugares: el CSS, el render de la lista y los datos de la maqueta. Un script `pruebas/rebasar-rama.js <rama>` que haga el rebase en un worktree, regenere `e2e/maqueta/datos/*.json` cuando el conflicto es solo en `pruebas/datos-maqueta/`, corra `FILTRO=<modulo> correr-todo` y liste qué suites de main se rompieron por funciones nuevas que les faltan en su lista `FUNCIONES` (el caso de `htmlSaldoDeFila` en dos suites de main), ahorraría la mitad del tiempo de esta tarea.
