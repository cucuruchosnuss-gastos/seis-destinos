# Traspaso — Clientes, listas de precios y la planta (30/09/2026)

Tag de antes: `antes-de-clientes-listas-2026-09-30`.

## Lo que se hizo (en `main`)

| Parte | Commit | Suite | Mutaciones |
|---|---|---|---|
| 1 · Etiqueta de empresa con color; "Todas las fábricas" no cambia clientes | `3a57c86` | `test-administracion-clientes-todas.js` 60/60 | 46/46 |
| 2 · Asignar clientes desde la lista de precios | `5def88d` | `test-administracion-lista-clientes.js` 46/46 | 28/28 |
| Urgente · La planta sin zoom ni "deslizar para recargar", botón Recargar | `e5ddb89` | `test-produccion-sin-zoom.js` 29/29 + `e2e/16-planta-sin-zoom.spec.js` | 16/16 |
| 3 · El cliente completo (agrupar por cliente, "También es cliente de…") | `37dfe4f` | `test-administracion-cliente-grupo.js` 49/49 | 37/37 |
| Errores de la app en castellano, por tipo (Administración, tablero y `js/salud.js`) | `aacf17f` | `test-administracion-errores.js` 54/54 · `test-salud-tiempo-real.js` 14/14 | 40/40 · 8/8 |

Lo que siguió esa noche (Sala de masa, el tiempo real, la Etapa 2 y la Etapa 3 en ramas) está en `2026-10-01-arranque.md`. **Ojo con la fila de Recargar:** la Etapa 2 (rama `ci-prueba/planta-paradas`) lo saca, a pedido de Facu.

## Decisiones

- **La etiqueta de la empresa** usa el nombre corto y el color de la barra de arriba (`MARCA_FABRICA` de `js/barra-unidad.js`), en un punto: el texto sigue en tinta (se lee sobre cualquier fondo). En las **cobranzas por asentar** la empresa ya iba en cada opción como texto: no se tocó (sus pruebas fijan ese texto).
- **"Todas las fábricas" no cambia nada**: interruptor y Ficha deshabilitados con "Elegí una fábrica arriba para cambiarlo". **Saldo inicial y Ajuste** de una cuenta abierta desde Todas **siguen habilitados** (el pedido nombraba prender/apagar y la ficha). Si Facu quiere, se bloquean igual con una línea.
- **Asignar clientes desde la lista**: el desplegable "Asignar o sacar clientes" para que la lista de clientes no empuje la grilla de precios. Destildar a uno que tiene OTRA lista no le saca la suya.
- **El cruce de clientes**: CUIT de 11 dígitos; sin CUIT, el nombre normalizado (sin acentos ni mayúsculas, pero con la puntuación: "J&M" y "JyM" no cruzan). Un nombre que es de dos clientes con CUIT distinto no se adivina.
- **"También es cliente de…"**: solo las empresas donde la persona ve clientes (`retiros:ver`). Con otra unidad elegida en la barra, la otra fábrica se nombra pero no se abre (la barra decide la empresa).
- **Zoom**: además de los tres campos que se sabían chicos, la suite encontró un cuarto (el buscador del acceso maestro, 15 px). "Recargar" pregunta solo en las pantallas de carga (`VISTAS_A_MEDIO_CARGAR`).

## Lo no probado

- Nada con sesión real: todo en la maqueta (a 390 y 1280 px) y con Supabase falso.
- El zoom en la tablet real: Playwright no hace el gesto de "deslizar para recargar" ni el doble toque; se probó que el viewport y el CSS están.
- `guardar_ficha_cliente` con `lista_precio_id` no se ejecutó (Supabase en solo lectura); se leyó su cuerpo: acepta `""` como sin lista y valida la unidad.

## Guion para Facu

1. Administración → Clientes → "Todas las fábricas": cada renglón con su fábrica y su color; el interruptor apagado con "Elegí una fábrica arriba…". Tildá "Agrupar por cliente".
2. Abrí un cliente que exista en Nuss y en Dolce Pasta: arriba "También es cliente de Dolce Pasta: debe…"; tocá "Dolce Pasta" y fijate que abra esa cuenta.
3. Listas de precios → una lista: "Clientes de esta lista", el aviso de los que no tienen ninguna, y tildá uno (al 30/09 **ningún cliente tiene lista**).
4. En la tablet: que ya no se pueda agrandar la pantalla ni recargar deslizando; "Recargar" en la barra lateral.

## Qué automatizaría ahora

- **Los datos de maqueta se comparten entre suites sin que se note**: sumar un cliente a `datos-maqueta/administracion.js` para mirar una pantalla rompió `test-administracion-cobranzas.js` (que busca "anatolia"). Un chequeo en `test-maqueta-datos.js` que liste qué suites leen cada archivo de datos, para saber qué correr al tocarlo.
- **El chequeo de letra de 16 px en los campos** (`test-produccion-sin-zoom.js`) sirve para toda pantalla de celular: pasarlo a una suite general sobre todos los HTML.
