# Traspaso 23/10/2026 — tablet: lotes no registrados, aviso en Stock y la caja Dolce Pasta

Rama `ci-prueba/tablet-lote-y-caja` (desde `origin/main` f32b687). Se integra DESPUÉS de `ci-prueba/masa-tamano-sin-default` (e2a4485) y `ci-prueba/conos-parecidos` (b42ba2a). **Cero SQL: la base no se tocó** (solo SELECT de verificación).

## Integración con las otras dos ramas
La sesión principal integró `masa-tamano-sin-default` (5a39529) y `conos-parecidos` (1557f4f) a main antes; se trajo `origin/main` con merge (d784832): **sin conflictos** (las zonas de `produccion.html`, `sandbox-produccion.js` y `docs/memoria/produccion.md` no se pisan). Después del merge: `npm run pruebas` 277/277, check-scripts y check-bytes en verde; mutaciones `lotes-no-registrados` 36/36 (+1 eq.), `stock-lotes-sin-ingreso` 38/38 (+3 eq.), `produccion-lotes` 71/71, `produccion-masa` 170/170, `produccion-masa-tamano` 25/25, `produccion-conos-parecidos` 26/26; e2e 56 + 8-planta-tamanos + 54-conos-parecidos: 32/32.

## Para el chat de arquitectura (CLAUDE.md / docs/memoria)
Ya quedaron escritas dos entradas con fecha: el final de `docs/memoria/produccion.md` ("LOTES NO REGISTRADOS Y LA CAJA DOLCE PASTA") y el final de la sección de la pantalla de `docs/memoria/stock.md` ("LOTES USADOS SIN INGRESO CARGADO"). CLAUDE.md no cambia (es índice). Si se ordena la memoria, la entrada de producción MANDA sobre "Un lote que no figura en stock…" y "LOS LOTES VIENEN PUESTOS…" de la sala de masa.

## Qué se hizo
**a) Tablet, sala de masa (modulos/produccion.html).** La tablet recuerda, por máquina y por insumo, el ÚLTIMO lote no registrado que se usó (`localStorage['produccion.lotes-no-registrados']`; no toca la base). En la primera masa del día —que antes llegaba sin lotes— ese lote viene puesto, en rojo, con "Lote no registrado por administración"; se registra igual (la base lo marca `lote_fuera_de_stock`). En la ventana de lotes aparece arriba, en rojo, y se elige de un toque. Se olvida con "Se terminó", o cuando ese insumo se usa con un lote registrado; uno que administración ya cargó deja de proponerse. La anterior de HOY sigue mandando.

**b) Stock (modulos/stock.html).** En la vista Stock: "N lotes usados sin ingreso cargado" (bordó, se despliega): insumo, marca, lote, kg, cuántas masas y la fecha de la última (hora argentina), de los últimos 30 días, agrupado por fábrica + insumo + lote, respetando la barra de unidad. No lista los lotes que ya tienen algún movimiento positivo en el libro (tuvieron ingreso y se agotaron).

**c) La caja Dolce Pasta (investigación + arreglo de pantalla).** Ver la conclusión abajo. En el paso de la caja, cada caja dice nombre Y marca en grande ("Caja N°1 Dolce Pasta") y con qué bolsa va; si se cambia la bolsa y no la caja: "La caja sigue siendo la Caja N°1 Nuss: cambiar la bolsa no cambia la caja. Si es otra, tocala arriba." (no frena nada; no aparece con un cono de doble bolsa).

## c) Conclusión (lo que pasó el 21/10)
- El sublote **6254-2** (M1, Mañana, Agustín, Mini · Caja sin cono, 23 cajas) se registró el 21/10 a las 15:07 con **caja_insumo_id = Caja N°1 Nuss y embolsado = individual**: lo prueban los movimientos `consumo_produccion` de ese momento (−23 Caja N°1 Nuss, −460 Bolsa PPP 15x60). Es decir: se tocó "Bolsitas individuales" y NO la caja.
- La Caja N°1 Dolce Pasta **sí estaba habilitada** para esa presentación (`presentacion_cajas` de "Mini · Caja sin cono": Caja media altura, Caja N°1 Nuss, Caja N°1 Sin impresión y Caja N°1 Dolce Pasta) y a la tarde Federico la eligió (6256-1, Dolce Pasta + individual). El catálogo se relee al abrir cada planilla, no había un catálogo viejo.
- **No es un error de datos ni de la base, y el código dejaba elegirla**: la trampa era de pantalla. La caja de la unidad (`unidades_negocio.caja_predeterminada_id` = Caja N°1 Nuss) viene puesta y el paso se saltea; en "Cambiar" las tres decían "Caja N°1" en grande con la marca en gris chico, y la bolsa está en la misma pantalla. `cambiar_caja_predeterminada` es solo de Configuración (gestión), no interviene.
- Facu ya lo corrigió el 23/10 (`produccion_correcciones` tipo `datos`, 6254-2 pasó a Dolce Pasta; el empaque se devolvió y se volvió a descontar). No hay que cambiar nada en la base.
- **Cómo se elige la caja hoy:** viene puesta la de la unidad si está habilitada para la presentación; si no, la única habilitada; si no, hay que elegir. "Cambiar" (al lado de las cajas) vuelve al paso; tocar una caja trae la bolsa que ella sugiere. Si en Cucuruchos Nuss se usa mucho la Dolce Pasta para un producto, otra opción (de Facu, en Configuración) es dejar a ese producto solo con las cajas que corresponden.

## b) ¿Se puede leer por RLS?
`pg_policies` (23/10/2026): `masa_items` → `_ve_turno((select turno_id from masas …))` → `_ve_produccion_en(unidad)` = `tiene_tarea_alcance('produccion','cargar'|'ver'|'configurar', unidad)`. **`stock:ver` NO alcanza** (super_admin sí). Sin permiso la base devuelve VACÍO, sin error: por eso la pantalla decide antes con la misma regla (`puedeVerMasasEn`), **no consulta** y lo dice ("No se pueden ver los lotes usados sin ingreso cargado de <fábricas>: la base deja leer las masas solo con un permiso de Producción…"). Hoy tienen `stock:ver` sin tareas de Producción: **Mauricio Alejandro Silva, Carlos Emanuel Romero y Franco Usabarrena**: ellos verán ese texto. Para que lo vean: darles `produccion:ver` en su fábrica (chat de permisos) o una RPC SECURITY DEFINER que pida `stock:ver` (chat de la base). No lo decidí: es de Facu.

## Lo decidido sin consultar
- La memoria guarda SOLO los lotes no registrados; los registrados siguen la regla de siempre (la primera masa del día llega vacía y se elige de la lista, un toque). Leí "aunque no esté registrado" como el caso a resolver: escribirlo cada día.
- El lote recordado se guarda al REGISTRAR la masa (también si queda en la cola sin señal), no mientras se arma.
- Si el único no registrado es el puesto y el insumo no tiene lotes con stock, la ventana abre directo con el campo, como antes.
- Stock: no lista lotes que ya tienen un movimiento positivo en el libro (si no, el aviso no se vacía nunca en 30 días) y cuenta las masas tiradas (lo usado quedó descontado); las anuladas no.
- El aviso de Stock va cerrado ("Ver cuáles"), para no tapar la lista de stock.
- La maqueta (`e2e/maqueta/supabase-falso.js`) ahora entiende filtros sobre tablas embebidas (`'masas.anulada'`) y `gt`/`lt` (ningún módulo usaba filtros con punto: no cambia nada de lo que ya estaba).

## Verificado en la base (SELECT, 23/10/2026)
- `pg_get_functiondef`: `datos_para_masa` (anterior por máquina y tipo, `es_de_hoy` = misma fecha de turno), `_masa_anterior`, `registrar_masa` (`lote_fuera_de_stock` = saldo del lote <= 0), `cambiar_caja_predeterminada`, `puede_ver_produccion`, `_ve_turno`, `_ve_produccion_en`.
- `pg_policies` de masa_items, masas, turnos_produccion, maquinas, ingredientes, insumos; `pg_constraint` (FKs de masa_items y masas, para el `masas!inner(turnos_produccion!inner)`); `information_schema` de produccion_items, stock_movimientos, produccion_correcciones, masa_items, masas, errores_app, empleado_tareas.
- Datos: masa_items con `lote_fuera_de_stock` de los últimos 10 días (colorante 35349771 en las dos máquinas, escrito de nuevo en la primera masa de cada día); produccion_items del 20 al 22/10; movimientos de empaque de 6254-1, 6254-2 y 6256-1; `produccion_correcciones`; `presentacion_cajas` de "Mini · Caja sin cono"; turnos 6254 a 6257; `errores_app` del 21/10 (la tablet: 1006×523, app instalada; solo cortes de tiempo real); quién tiene `stock:ver` y tareas de Producción.
- La consulta de Stock se probó contra PostgREST con la clave pública: llega a "permission denied" (la sintaxis y el embebido son válidos; con una columna inventada da 42703).

## Lo que no se pudo probar
- Nada con sesión real: ni la tablet de la fábrica, ni Stock con una cuenta de administración contra la base (el conector es de solo lectura y las suites corren contra dobles).
- Que PostgREST devuelva bien las filas filtradas por `masas.hora` / `masas.anulada` con `!inner` (validado solo hasta el permiso).

## Guion para Facu (2 minutos)
1. Tablet, Sala de masa, primera masa del día en la M1: el colorante 35349771 tiene que venir puesto, en rojo, "Lote no registrado por administración" (la primera vez hay que escribirlo una vez más: la tablet empieza a recordar desde la primera masa registrada con esta versión).
2. Producción → Agregar producto → Mini → Sin cono → Caja sin cono → "Cambiar": tienen que decir "Caja N°1 Nuss / Dolce Pasta / Sin impresión" en grande. Tocar "Bolsitas individuales" sin cambiar la caja: aparece "La caja sigue siendo la Caja N°1 Nuss".
3. Stock (con tu usuario): arriba de la lista, "N lotes usados sin ingreso cargado"; "Ver cuáles" muestra el colorante 35349771 con sus kg y la última fecha.

## Qué automatizaría ahora
La tarea repetida más cara fue **averiguar qué pasó en la fábrica un día puntual** (turnos, sublotes, movimientos de empaque, correcciones, errores de la tablet): ~10 SELECT a mano, con columnas que no existían (`creado_en` vs `created_at`). Propuesta: un script `pruebas/que-paso.js <fecha> [sublote]` (o una vista de solo lectura) que junte en una sola salida turnos + sublotes + caja/embolsado + movimientos de empaque por sublote + correcciones + `errores_app` de la tablet de ese día. Y segundo: el aviso de Stock sería más útil si `datos_para_masa` / una vista dijera "nunca tuvo ingreso" vs "se agotó" (hoy la pantalla lo deduce con una segunda consulta).
