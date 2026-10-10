# Traspaso · Producción · abrir un turno con una planilla pendiente de completar (09/10/2026)

Rama `ci-prueba/abrir-con-pendiente` (sin push). Pedido: "en la planta, abrir turnos se frena si hay una planilla pendiente de completar".

## Lo que se leyó de la base (pg_get_functiondef, 09/10/2026, solo lectura)

- `abrir_turno(p_maquina_id, p_fecha, p_turno, p_encargado_id, p_operarios)`: rechaza solo si la máquina tiene un turno `estado = 'abierto'`. Una pendiente NO la frena.
- `ejecutar_tablet(p_client_uuid, 'abrir_turnos', p_params)`: solo delega en `abrir_turnos` (con su clave de idempotencia). No frena nada.
- **`abrir_turnos(p_fecha, p_turno, p_encargado_id, p_maquinas)` SÍ FRENA**: por cada máquina busca en la UNIDAD un turno con `t.estado <> 'cerrado'` y `(t.fecha <> p_fecha or t.turno <> p_turno)`, y corta con "La <máquina> sigue abierta en el turno <turno> del <dd/mm>. Cerrá primero las planillas de ese turno antes de abrir el turno <turno>.". `<> 'cerrado'` incluye `pendiente_completar`, así que **una planilla pendiente de otro día u otro turno impide abrir CUALQUIER máquina de esa fábrica** (y el mensaje dice "sigue abierta" de una planilla que no está abierta). Una pendiente del MISMO día y turno no frena (es el caso de "Volvió con lote nuevo").
- Al 09/10/2026 no había ninguna planilla `pendiente_completar` en la base (una sola `abierto`: Máquina 2, lote 6231).

## El arreglo de fondo es de la BASE (para el chat de la base)

En `abrir_turnos`, cambiar `t.estado <> 'cerrado'` por `t.estado = 'abierto'` en la búsqueda de `v_otro`. Una pendiente de completar no ocupa la máquina ni el turno (la máquina quedó libre: así lo dice `forzar_cierre_turno` y así la muestra la planta). Con ese cambio la pantalla abre sin tocar nada más (ya manda la llamada: lo prueban las suites).

```sql
-- CREATE OR REPLACE con la MISMA firma: leer antes el cuerpo real con pg_get_functiondef
-- y cambiar solo esta línea:
--   where t.unidad_negocio_id = v_m.unidad_negocio_id and t.estado <> 'cerrado'
-- por:
--   where t.unidad_negocio_id = v_m.unidad_negocio_id and t.estado = 'abierto'
```

Verificar después: `pg_get_functiondef` (una sola firma, `SECURITY DEFINER`, `search_path=public`) y que con una pendiente de ayer en la unidad se pueda abrir el turno de hoy.

## Lo que se hizo en la pantalla (modulos/produccion.html)

- **La pantalla NO frenaba**: el tablero lee solo `estado = 'abierto'`, así que la máquina con la pendiente se ve libre con su "Abrir turno", Abrir turno la ofrece y manda `ejecutar_tablet('abrir_turnos')`. Quedó fijado con pruebas.
- **Si la base rechaza el pedido** (cualquier error que no sea de red), debajo del error —que sigue TAL CUAL— se leen las planillas `pendiente_completar` de la fábrica y se ofrecen: "Hay 1 planilla pendiente de completar en esta fábrica. Completala desde acá:" con un botón "Completar Máquina 3 · lote 7030" (`#pr-abrir-pendientes`, `data-planilla`) que abre su planilla. No se lee el mensaje ni se repite la regla de la base: con la base arreglada simplemente no aparece. Si la lectura falla, no se dibuja nada; una respuesta que llega con otro formulario no se pinta; se limpia al reintentar y al volver a entrar a Abrir.
- **Decisión: la tarjeta de la máquina NO muestra la pendiente.** Se ve "Sin turno" con "Abrir turno" (es la verdad: no tiene turno abierto) y la pendiente sigue en el aviso de arriba del tablero ("N planillas quedaron pendientes de completar", con su botón). Repetirla en la tarjeta duplicaba el aviso.

## Pruebas

- `pruebas/test-produccion-abrir-pendiente.js` 35/35 (ejecuta el código con `sandbox-produccion`: con la pendiente se ofrece abrir y abrir manda la llamada; con la planilla `abierto` no se ofrece; el error de la base tal cual con las pendientes al lado, plural, red, lectura que falla, respuesta vieja, escapado). `mut-produccion-abrir-pendiente.js` 18/18 (+1 equivalente).
- `controles-produccion.js` 2032/2032: se sacó la declaración `MENOS_COPIAS` de `button[data-planilla]` (ya no aparece menos veces que en el baseline).
- Maqueta `produccion-pendiente` (la Máquina 3 con su planilla pendiente del turno Noche del día anterior) y `e2e/29-planta-abrir-pendiente.spec.js` a 1000×540 y 390×844: 4/4.
- `npm run pruebas` 227/227; e2e de la planta (0, 5, 8, 9, 25, 27, 29) 86/86 con `--workers=2` (con los workers por defecto, 8 y 9 dieron rojo una vez por carga de la máquina y pasaron al repetir).

## Lo que no se probó

- Nada en la tablet real ni contra la base (solo lectura). El rechazo de la base se simuló con su texto.
- A 390 px la planta ya se salía de sus recuadros antes de este cambio (cabecera de Abrir turno, nombre y lote de las tarjetas): la e2e a 390 mira solo lo nuevo y que no haya scroll de costado.

## Qué sección de CLAUDE.md tocar

Módulo 10 (Producción), cerca de "CERRAR A LA FUERZA UNA PLANILLA DE OTRO DÍA" / "Abrir turno" (el párrafo va en el informe del subagente).

## Qué automatizaría ahora

Una prueba de la BASE para las reglas que la pantalla da por sentadas: leer con `pg_get_functiondef` los cuerpos de `abrir_turnos`, `abrir_turno` y `forzar_cierre_turno` y exigir que coincidan en qué estados "ocupan" una máquina. Acá la pantalla y `forzar_cierre_turno` dicen "la máquina quedó libre" y `abrir_turnos` decía lo contrario, sin que nada lo marcara.
