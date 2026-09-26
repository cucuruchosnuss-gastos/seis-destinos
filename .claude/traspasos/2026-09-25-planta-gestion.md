# Traspaso — Producción partida en PLANTA y GESTIÓN (25/09/2026)

Para el chat de arquitectura: actualizar CLAUDE.md con esto. Quien lo recibe no vio el trabajo; todo lo de abajo está verificado contra el código de este commit y, lo de la base, contra `pg_get_functiondef` el 25/09/2026. **Cero SQL corrido: Supabase estuvo en solo lectura.**

## Qué cambió y por qué

Producción era un solo archivo (`modulos/produccion.html`, ~9.700 líneas) que servía a la vez de tablet de la fábrica y de oficina. Se partió en dos:

- **La PLANTA — `modulos/produccion.html`**: solo la tablet. **Entra SOLO una cuenta de dispositivo** (`empleados.es_dispositivo`, leído con `mi_sesion_produccion()`), con `produccion:cargar` en SU fábrica.
- **La GESTIÓN — `modulos/produccion-gestion.html`** (archivo NUEVO): compu y celular, **cuentas personales con `produccion:ver` o `produccion:configurar`**, sin PIN ni "¿Quién sos?". Tiene la Configuración, el Historial (con las planillas pendientes de completar y la corrección de las paradas de una planilla cerrada), el Stock terminado y, desde la parte 2, los INDICADORES.

### Parte 1 — la planta

1. **Arranque (`init`)**: `verificarSesion` → `cargarPermisos` → `mi_sesion_produccion()`:
   - si la RPC falla: **NO se redirige a ciegas**; se dice "No se pudo saber qué cuenta es esta" con dos links fijos: "Volver a intentar" (`produccion.html`) y "Soy de la oficina: ir a la gestión" (`produccion-gestion.html`);
   - `destinoDeSesion(ses)`: una cuenta que no es `es_dispositivo === true` (o null) → `location.replace('produccion-gestion.html')`; un dispositivo sin `unidad_negocio_id` → se dice "no tiene una fábrica asignada"; un dispositivo sin `produccion:cargar` en su fábrica (misma regla que `tiene_tarea_alcance`) → se dice; si no, entra.
   - La fábrica es la de la cuenta: `estado.unidadesPosibles = [unidad]`, `estado.unidadId = unidad`. **No se pregunta nunca.**
   - **`sinAcceso()` de la planta NO manda al dashboard** (la cuenta de la tablet no tiene nada que hacer ahí, y el dashboard la manda de vuelta: sería un bucle). La gestión sí sigue volviendo al dashboard.
2. **Se fueron de la planta** (y están en la gestión, sin reescribirse: mismas RPCs, mismos ids, mismos textos): Configuración (`#pr-config`, la hoja de PINes `#pr-cfg-hoja`), Historial (`#pr-historial`), Stock terminado (`#pr-stock`), la cabecera de oficina (`#pr-header`), el menú (`#pr-menu`, con "Volver al inicio de la app") y los accesos del inicio (`#pr-oficina`). **La planta no tiene ningún link al dashboard.**
3. **Retirados** (en ningún archivo): "Cambiar de fábrica" (`#pr-btn-cambiar-unidad`), "Cambiar de unidad" del menú (`#pr-menu-unidad`) y la pantalla "¿En qué fábrica está esta tablet?" (`#pr-elegir-unidad`, `data-unidad`). Motivo: cada tablet es de UNA fábrica. Funciones que se fueron con ellos: `unidadInicial`, `mostrarElegirUnidad`, `elegirUnidad`, `unidadesDeCarga`, `olvidarTodas`, y las constantes `TAREAS_PRODUCCION`, `puedeEntrar`, `CLAVE_UNIDAD`.
4. **Completar una planilla pendiente queda en la PLANTA** (decisión): es el mismo cierre de siempre (`cerrar_turno` sobre `pendiente_completar`, con la hora de apagado, el scrap y las paradas), se hace de pie en la fábrica y la tablet ya lo mostraba en el tablero ("N planillas quedaron pendientes de completar"). En la gestión esas planillas **se ven** (historial filtrado por "Pendientes de completar") y se les corrigen las paradas, como antes.
5. **Acceso maestro sin "¿Quién sos?"**: "Acceso maestro" está también en la barra (sin nadie adentro, y mientras no haya un maestro activo). Abre un panel con **solo el teclado de 8 números** (la columna de la lista, `#pr-quien-col`, se esconde). Quién es sale de `personal_produccion()` (`es_maestro`): con **uno** solo no se elige nada; con **varios**, una fila chica **con solo sus nombres** (`#pr-pin-maestros`, `data-maestro`) adentro del mismo panel. **Nunca se prueba el PIN contra cada maestro**: a los otros les sumaría intentos fallidos (3 errores = 15 min de bloqueo). Verificado, entra directo al modo como esa persona; cambiar de modo con el maestro activo no pasa por "¿Quién sos?" (ya era así). Cancelar vuelve al modo si había alguien adentro, o a "¿Quién sos?".
   - **Límite**: `verificar_pin_maestro(p_empleado_id, p_pin)` necesita saber QUIÉN, y no hay una RPC que identifique por el PIN solo. Hoy hay un solo maestro en `pines_maestros`, así que en la práctica no se elige nada.
6. **"Dar acceso por hoy"**: cada persona muestra su puesto fijo y, en bordó, si **no tiene PIN**; con un puesto elegido, primero los que lo tienen fijo SIN PIN. Una nota dice qué va a pasar. **Darle acceso por hoy a un masero FIJO SIN PIN le arma un PIN de un día**: `otorgar_puesto_temporal` genera `pin_temporal` cuando la persona no tiene PIN vigente, tenga o no el puesto fijo (leído con `pg_get_functiondef` el 25/09/2026). Es la única forma, hoy, de que un masero sin PIN entre desde la tablet.
7. **BLOQUEADO POR LA BASE — "Asignar PIN" desde la planta NO se construyó**: `asignar_pin_produccion(p_empleado_id, p_pin)` exige `tiene_tarea('produccion','configurar')` a la **cuenta que llama** y no recibe `p_maestro_id` / `p_maestro_pin`. La cuenta de la tablet solo tiene `cargar`, así que desde la tablet fallaría siempre. **Para habilitarlo hace falta que `asignar_pin_produccion` acepte `p_maestro_id` y `p_maestro_pin` y los valide con `verificar_pin_maestro`, como `otorgar_puesto_temporal`.** Hay una assertion que exige que la planta no llame a esa RPC.
8. **Más compacta**: un bloque `/* ── LA PLANTA MÁS COMPACTA` AL FINAL del `<style>` (pisa por orden): texto base 16 px, `--pr-alto-boton: 48px`, barra de 56 px con modos de 48, tablero en 4 columnas (`minmax(15rem)`) con tarjetas de 112 px y el lote en 2,5rem. **Quedan grandes**: los renglones de la receta (64 px), el teclado del PIN (84 px) y `--pr-alto-boton: 56px` adentro de `#pr-receta`, `#pr-otro`, `#pr-lote-panel` y `#pr-pin`. **MEDIDO** en un navegador (foto estática con el CSS y los renders reales, 1280×800): con las **cinco máquinas abiertas** (dos paradas), el aviso de planillas pendientes y "Sacar al masero" a la vista, **la quinta tarjeta termina en y = 617 px** (antes del cambio: 840 px, o sea fuera de la pantalla). Botón más chico medido: 48 px; texto más chico: 16 px.
9. **"← Atrás"** arriba a la izquierda en la planilla (`#pr-planilla-volver`) y en Masas del turno (`#pr-masas-volver`), en lugar de "‹ Máquinas". Mismos ids y destinos.
10. **Se instala como su propia app**: `<link rel="manifest" href="../manifest.webmanifest">` (SOLO en la planta; la gestión sigue con `../manifest.json`), `theme-color #3F4655` y `apple-touch-icon ../icons/planta-192.png`. `manifest.webmanifest` (raíz): `display: standalone`, `start_url: modulos/produccion.html`, `scope: ./`, íconos 192 y 512. Verificado en un navegador servido localmente: el manifest carga (200, `application/manifest+json`), `start_url` resuelve a `/modulos/produccion.html` y los dos íconos cargan con su tamaño. **"Instalar app" solo se puede confirmar en Chrome real.**

### Para la gestión en la parte 1

Es la pantalla de oficina que ya existía (quien no carga desde la tablet): el inicio con los accesos, el menú, y las tres pantallas. Una cuenta de **dispositivo** que llega se manda a la planta (`location.replace('produccion.html')`); si `mi_sesion_produccion` falla, se sigue y deciden los permisos. Sin `ver` ni `configurar` → "No tenés acceso…" y vuelta al dashboard; **con solo `cargar` (una cuenta personal) → "Tu usuario carga desde la tablet de la planta: acá no hay nada que ver"** y vuelta al dashboard.

## Verificación (pruebas/)

- `check-scripts.js` verde (los dos archivos parsean; sin identificadores pisados).
- **Sandbox por archivo**: `sandbox-produccion.js` elige la lista de funciones por la ruta (`EN_AMBOS`, `SOLO_GESTION`, `NUEVAS_PLANTA`, `RETIRADAS`, escritas a mano) — una que falte sigue tirando `ReferenceError`.
- Suites que prueban la gestión leen `ARCHIVO_GESTION` (config e historial por defecto; empaque, legible, paradas, sin-empaque, color y acceso, las dos puntas).
- **Mutaciones sobre dos archivos**: `mutar.js` ganó `variable` y `salir` (compatible con los 66 runners que ya lo usan) y `correrMutacionesEnVarios`; `mutar-produccion.js` reparte cada mutación en el archivo donde está lo que muta (una función que está en los dos se muta en los dos; una mutación de texto que está en los dos va a la planta salvo `archivo: 'gestion' | 'ambos'`), y solo usa la gestión si la suite la lee.
- **Controles**: `controles-produccion-movidos.js` (103 claves, cada una con su destino y motivo), `controles-produccion.js` (suma el baseline `5ca92bb`, declara los tres RETIRADOS y los dos "Atrás" en RENOMBRADOS, y exige que ningún movido quede en la planta) y el NUEVO `controles-produccion-gestion.js` (exige cada movido en la gestión, al menos las mismas veces que en el último baseline que lo tenía, y que cada referencia del JS tenga destino).
- Suites nuevas: `test-produccion-planta.js` + `mut-produccion-planta.js`.

## Lo que NO se probó

Nada con sesión real ni contra la base (el conector estaba en solo lectura y las suites corren contra un doble). Lo medido en un navegador fue una foto estática del tablero. Falta la pasada de Facu: instalar la planta en la tablet (Chrome), entrar con la cuenta de dispositivo, el acceso maestro desde la barra, y que una cuenta personal que abre `produccion.html` termine en la gestión.

## Qué tocar en CLAUDE.md

- Módulo 10 (Producción): partirlo en planta y gestión; lo de "Acceso", "La barra de modos y el PIN" (acceso maestro desde la barra, sin lista), "Dar acceso por hoy", "Configuración", "Historial y stock terminado" (ahora en la gestión), la cabecera de oficina y el menú (ahora en la gestión), el tamaño (el bloque compacto: 16 px / 48 px, con la receta y el PIN grandes), y el manifest propio.
- Dashboard: la tarjeta de Producción abre la gestión para cuentas personales (lo hace la otra sesión).
- Suites: las nuevas y los cambios de `mutar.js`.
- Pendiente de base: `asignar_pin_produccion` con `p_maestro_id` / `p_maestro_pin`.
