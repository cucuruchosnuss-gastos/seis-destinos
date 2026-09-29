# Traspaso — Producción: la Configuración con el diseño "Producción · Configuración" (29/09/2026)

Para el chat de arquitectura. Autocontenido: quien lo lea no vio el trabajo.

## Qué cambió

Rama `ci-prueba/config-produccion` (creada desde `ci-prueba/sistema-visual`, Parte 3 de la tanda del sistema visual). Solo `modulos/produccion-gestion.html` y sus pruebas. **Cero SQL, cero RPCs nuevas, cero cambios de permisos.**

- La Configuración de la gestión de Producción copia el handoff `e2e/disenos/config-produccion/` (pantallas 1a…7b): un **segmentado de seis secciones** arriba (Productos · Máquinas · Recetas · Ingredientes · Conos · Personal y PINes) con su burbuja de lo que falta, migas, el selector de unidad a la derecha, y lista | detalle en Productos, Máquinas, Recetas e Ingredientes. En la compu esconde la barra de la gestión mientras se está en Configuración (`body.pg-en-config`).
- **Empaque dejó de ser una sección**: vive adentro de Productos (el menú dice "Productos y empaque"; un link viejo a `empaque` abre Productos por `ALIAS_CONFIG`). Ningún control se perdió: `controles-produccion-gestion.js` suma el baseline `e33da8c` y declara RETIRADO solo `select[data-receta-maquina]` (en Recetas la máquina se elige en la lista).
- **El color de cada producto sale del NOMBRE** (decisión de Facu): la base no tiene columna de color. Paleta cerrada de 20 del diseño; Grande en naranja durazno `oklch(0.68 0.16 50)`.
- **"Volver a una versión" de una receta crea una versión NUEVA** con `guardar_receta_original` y los ingredientes de esa versión (decisión de Facu), con nota "Vuelve a la versión N".
- **El Agua "no hace falta lote"**: se decidió por `ingredientes.descuenta_stock = false` (verificado en la base el 29/09/2026: el Agua lo tiene en false), no por el nombre.

## Qué se verificó y contra qué

- Base (solo lectura, 29/09/2026): columnas de `productos_terminados` (no hay `color`; sí `categoria`), `marcas_personalizadas` (no hay cliente ni sublote de origen), `unidades_negocio.caja_predeterminada_id` (ninguna función la escribe), `ingredientes` (Agua `descuenta_stock=false`), y `pg_get_functiondef` de `guardar_receta_original`, `guardar_empaque_presentacion`, `guardar_producto` y `guardar_presentacion`.
- `test-produccion-config-diseno.js` exige que los armadores de parámetros de las RPCs sean **idénticos a los de `e33da8c`** (lo que viaja a la base no cambió).
- Suites: config-diseno 85/85 (mut 52/52), config 243/243 (mut 243/243 +8 eq.), empaque 257/257 (mut 169/169 +13 eq.), gestion 163/163 (mut 94/94 +24 eq.), gestion-diseno 138/138 (mut 101/101 +22 eq.), sin-empaque (mut 49/49), quien (mut 79/79 +6 eq., se corrigió un ancla vieja de la planta v2), xss 12/12, controles de la gestión 750/750. `check-bytes`, `check-scripts` y `correr-todo` 157/157 en verde.
- Navegador: `e2e/10-comparar-config.spec.js` compara cada pantalla con el diseño (1a 5,5 %, 2a 2,4 %, 3a 3,4 %, 4a 4,8 %, 5a 3,6 %, 6a 2,2 %, 7a 11,4 %, 7b 20,8 %) sin scroll de costado; `e2e/5-maqueta.spec.js` recorre Configuración a 390 y 1280 px. Nada con sesión real.

## Qué tocar en CLAUDE.md

Ya está: una entrada nueva en el módulo 10 (Producción), debajo de "EL DISEÑO PRODUCCIÓN · GESTIÓN". Revisar si conviene actualizar en esa misma entrada vieja la lista del menú ("Catálogo: … Productos, Empaque …"), que ahora dice "Productos y empaque".

## Funciones de base que faltan (no se inventaron)

1. `productos_terminados.color` + su parámetro en `guardar_producto` (hoy el color sale del nombre).
2. Una RPC para cambiar `unidades_negocio.caja_predeterminada_id` (la pantalla muestra "Cambiar · pronto").
3. El cliente de cada cono y de qué sublote salió un cono por revisar (`marcas_personalizadas`).
4. Las condiciones de empaque "si es con cono" / "si lleva doble bolsa" (`presentacion_empaque.condicion` admite siempre / bolsa_grande / bolsa_individual).
5. (Ya anotado) `generar_pines_iniciales` no excluye las tablets.

## Qué automatizaría ahora

Comprobar las anclas de TODOS los `mut-*.js` antes de correrlos: en esta tanda un rediseño dejó una docena de anclas viejas en cinco runners, y cada una se descubre recién cuando el runner aborta después de minutos. Un `pruebas/check-anclas.js` que cargue cada runner con `mutar.js` falso y diga qué ancla no existe (o no es única) tarda un segundo y podría correr dentro de `correr-todo`.
