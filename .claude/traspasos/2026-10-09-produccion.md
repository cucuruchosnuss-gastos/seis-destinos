# Traspaso para el chat de arquitectura — La tabla de producción (09/10/2026)

Rama `ci-prueba/produccion-tabla` (desde `origin/main` 26d4624). Sin integrar: `main` no se tocó. Cero SQL corrido: Supabase solo lectura.

## Qué cambió

En la gestión de Producción (`modulos/produccion-gestion.html`) hay una pantalla nueva, **"Tabla de producción"**, la PRIMERA entrada del bloque "Control" del menú (antes de Planillas pendientes). Los indicadores siguen siendo lo que se ve al entrar.

## Qué sección de CLAUDE.md tocar

Módulo 10 (Producción), en "DESDE EL 25/09/2026 SON DOS PANTALLAS…", después del párrafo **"LAS MÁQUINAS, CON GRÁFICOS (04/10/2026…)"**, agregar este párrafo tal cual:

> - **LA TABLA DE PRODUCCIÓN (09/10/2026, rama `ci-prueba/produccion-tabla`; traspaso `.claude/traspasos/2026-10-09-produccion.md`).** Primera entrada de "Control" en el menú (`#pr-menu-tabla`, `data-menu="tabla"`, sección `#pr-tabla`, con `ver` o `configurar`); los indicadores siguen siendo lo que se ve al entrar. Sale de **`produccion_resumen(p_unidad_negocio_id, p_desde, p_hasta)`** → `(fecha, turno, maquina_id, maquina, producto, presentacion_id, presentacion, planillas, cajas, unidades)` (SECURITY DEFINER, `search_path=public`, `authenticated` sí, `anon` no; pide `produccion:ver/configurar/cargar` en la fábrica; desde y hasta obligatorios, hasta − desde ≤ 400 días —"El período no puede pasar de 400 días."—; sin anulados; incluye planillas abiertas; `planillas` = `count(distinct turno_id)` dentro del grupo; verificado con `pg_get_functiondef` el 09/10/2026). Los bigint pueden llegar como texto (`normalizarResumen`). **UNA consulta por período**: la de las cuatro tarjetas va del 1º del mes pasado a hoy (`rangoBaseTabla`) y la tabla la reusa si su período entra ahí; si no, una consulta de ese período. Arriba, **Ayer · Esta semana (lunes a hoy) · Este mes · Mes pasado** en unidades (hora de Argentina; con los MISMOS filtros que la tabla, así tocar una da una tabla con su mismo total; sin producción: "—" y "Sin producción", nunca "0 u"). Filtros: Período (`crearPeriodo`, fechas obligatorias; más de 400 días se avisa sin consultar), Máquina, Turno y Producto (los valores salen de los datos del período). **Filas y Columnas**: Día, Semana (del lunes), Mes, Máquina, Turno (Mañana · Tarde · Noche), Producto o Ninguna; por defecto Día × Máquina; elegir en una lo que tiene la otra las intercambia. Medida SIEMPRE unidades, con fila y columna de Total y punto de miles; un día sin producción no aparece; una celda sin datos dice "—". Debajo, "Promedio por día con producción · por planilla": las planillas se cuentan por (fecha, turno, máquina) tomando el MAYOR `planillas` de esa clave (dos presentaciones de la misma planilla son una; una máquina relanzada con lote nuevo en el mismo turno son dos), nunca sumando la columna. Se recuerdan filas, columnas, filtros y el período (como tarjeta si era una) en `localStorage` `produccion.gestion.tabla` (con try/catch; la máquina se suelta al cambiar de unidad). La unidad es la de la gestión (barra de arriba; con "Todas", el selector de la gestión). En el celular la tabla scrollea de costado adentro de su caja (`.pt-scroll`) con la primera columna fija (`position: sticky`). Suites `test-produccion-tabla.js` (137; ejecuta la lógica con datos falsos: las 49 combinaciones de Filas × Columnas dan el mismo total, Máquina × Turno, filtros, tarjetas en bordes de mes y año, promedio por planilla, la consulta única, el turno, el error con Reintentar) / `mut-produccion-tabla.js` (51/51) y `e2e/29-produccion-tabla.spec.js` (maqueta `produccion-gestion`, que suma `produccion_resumen`, a 390 y 1280 px).

## Qué se verificó y contra qué

- `pg_get_functiondef('public.produccion_resumen(uuid,date,date)')` y `has_function_privilege` (anon false, authenticated true), el 09/10/2026.
- `node pruebas/check-scripts.js` OK; `npm run pruebas` 227/227 en verde; `mut-produccion-tabla` 51/51; las `mut-produccion-gestion*` corridas de a una.
- `e2e/29-produccion-tabla.spec.js` en verde local: sin scroll horizontal de la página, la tabla scrollea adentro, primera columna sticky y pegada al borde al correr la caja, Filas/Columnas recordadas al recargar, sin errores de JS.

## Decisiones tomadas sin consultar

- Va como primera entrada de "Control" y NO reemplaza a los indicadores como pantalla de entrada (muchas pruebas y el dashboard cuentan con que la gestión abre en los indicadores).
- Las tarjetas aplican los filtros de Máquina / Turno / Producto.
- El período por defecto es "Este mes".
- Promedio por planilla con el máximo de `planillas` por (fecha, turno, máquina).
- La pantalla recorta las filas al período aunque la RPC ya lo haga (red, y la maqueta devuelve todo).

## Cambio del mismo día: la gestión ABRE en la tabla (pedido de Facu)

En el párrafo de la tabla en CLAUDE.md, reemplazar "Primera entrada de "Control" en el menú (...); los indicadores siguen siendo lo que se ve al entrar." por: **"La gestión de Producción ABRE en la tabla (`INICIO_GESTION = 'tabla'`; antes abría en los indicadores). En el menú, "Control" empieza con Tabla de producción y sigue Indicadores (`#pr-menu-inicio`, ya no suelto arriba). `?vista=indicadores | pendientes | historial | stock | conos` abre derecho en esa sección (`vistaDeEntrada`; se saca de la dirección); el tablero del dashboard (`js/tablero.js`) lleva la máquina parada y el peor lote a `?vista=indicadores`, las planillas por completar a `?vista=pendientes` y los conos por revisar a `?vista=conos`. "Salir sin guardar", las migas "Producción" de Configuración y una unidad de la barra sin Producción vuelven a la tabla (que con esa unidad abre y lo dice, sin consultar)."** Y en la tarjeta del dashboard / tablero: el link de la tarjeta sigue siendo `modulos/produccion-gestion.html` (abre en la tabla).

## Qué automatizaría ahora

La maqueta devuelve las rpc sin mirar sus parámetros salvo con `__segun`, que exige igualdad exacta: para pantallas por período convendría que `supabase-falso.js` aceptara una rpc con `"__filtrar": { "fecha": ["p_desde", "p_hasta"] }` para recortar por rango sola, y así ninguna pantalla tiene que meter un recorte "de red" para que la maqueta se vea bien.
