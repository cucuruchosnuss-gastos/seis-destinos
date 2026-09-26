# Traspaso — insumos en los retiros, importador, Cheques en Administración y la maqueta (noche del 26/09/2026)

Tag de antes de empezar: `antes-de-importador-2026-09-26` (pusheado).

## Qué se hizo

| Parte | Commit | Actions |
|---|---|---|
| 1 — Retiros con insumos y en orden | `34235be` | Pruebas, Navegador y Pages en verde |
| 2 — Importador para la carga inicial | `e31b901` | en verde |
| 3 — Cheques se muda adentro de Administración | `2f0ebe7` | en verde |
| 4 — La maqueta para todo, con la hoja medida sola | `572cd04` | (ver el cierre) |

Corridas: `https://github.com/cucuruchosnuss-gastos/seis-destinos/actions` (filtrar por el hash).

**Base: solo lectura.** Se verificaron con `pg_get_functiondef` / `information_schema` los cambios que hizo el chat de arquitectura: `catalogo_para_retiro`, `lotes_para_retiro`, `registrar_orden_retiro` con insumos, `valorizar_orden_retiro` con `precio_vigente_insumo`, `guardar_precios` con `insumo_id`, `guardar_cliente` con `retiros:precios`, `cuenta_cliente` y `anular_orden_retiro` con el código, `mis_pendientes` con `administracion`, `orden_retiro_items.insumo_id/cantidad`, `lista_precios_items.insumo_id`, `productos_terminados.categoria` (17 cucuruchones, 7 barquillos, 7 especiales, 4 pasta), las razones sociales de las cuatro empresas. Cero órdenes, clientes y listas cargados.

### Parte 1
- **Carga** (`retiros.html`): el selector sale de `catalogo_para_retiro()`, un encabezado por categoría y al final "Materia prima e insumos"; un buscador por renglón filtra todo junto; un renglón de insumo pide cantidad en su unidad (kg/lt 3 decimales, unidades enteras) y viaja `{insumo_id, cantidad, lote?}`, sin cajas. Lotes de producto con `lotes_para_retiro()` (el depósito ya los ve); lotes de insumo con `v_stock_por_lote` solo con `stock:ver`.
- **Hoja** (`js/retiros-comun.js`): renglón de insumo con su cantidad y unidad ("25,5 kg"), encabezado "Cajas / cant." solo si hay insumos, "Total de cajas" sin sumar los insumos, precio "por kg" con precios; el texto para compartir los lista.
- **Administración**: insumos en el detalle, valorizar por cantidad ("Precio x kg"), hoja con insumos; la grilla de precios por categoría + "Materia prima e insumos".
- **Dashboard**: la tarjeta de Administración muestra la suma de sus pendientes.

### Parte 2 — Importar (Administración, `retiros:precios`)
Clientes, precios y saldos iniciales; plantillas `.xlsx`; vista previa con cada error; **nada se guarda hasta confirmar**; solo las filas buenas; resumen descargable. Detalle en CLAUDE.md (módulo 13).

### Parte 3 — Cheques en Administración
Movido tal cual a una región de `administracion.html`; `cheques.html` redirige. Detalle en CLAUDE.md (módulo 9).

### Parte 4 — La maqueta
Datos nuevos (`pedidos.json`, `produccion-gestion.json`, y cheques / orden de 12 renglones / importador en `administracion.json`); `5-maqueta.spec.js` recorre todo y mide la hoja (273,2 mm de 281 con 12 renglones, en las dos pantallas).

## Decisiones

- **La hoja de la Carga necesita los insumos y `mis_ordenes_retiro()` no los devuelve** (inner join con `producto_presentaciones`). Sin tocar la base: al confirmar, el celular recuerda los renglones de insumo con su posición (`localStorage retiros.insumos`, 40 días) y los intercala. Desde otro celular, "Mis retiros" avisa. **Arreglo de fondo, de la base:** que `mis_ordenes_retiro()` haga left join y devuelva `insumo`, `marca`, `cantidad`, `unidad` y sus lotes de `stock_movimientos`. Es lo primero a pedirle al chat de arquitectura.
- **Los lotes de un insumo en la Carga** piden `stock:ver` (no hay una RPC como `lotes_para_retiro` para insumos). Sin eso se dice y sale de los más viejos.
- **La cantidad de un insumo va en su unidad de medida** (kg, lt, un). El pedido decía "kg, unidades, bultos": `insumos.unidad_medida` no tiene bultos, así que no se ofrece cargar en bultos (la base descuenta en la unidad del insumo).
- **La grilla de precios y la plantilla de precios muestran TODOS los insumos activos** (el catálogo es uno para las cuatro empresas), no solo los que tienen stock: uno que hoy no tiene stock se puede revender mañana y necesita precio.
- **El orden por categoría se aplicó en la Carga y en la grilla de precios** ("si buscás por lista…"). El separador "Chocolate" de antes se fue en las dos.
- **Importar — nombres repetidos dentro del archivo: se marcan TODAS las filas**, no solo la segunda (no hay forma de saber cuál es la buena). Un CUIT que ya tiene otro cliente es **aviso**, no error. Se suman los **dígitos verificadores del CUIT (AFIP) y del CBU (BCRA)**, más estrictos que la base: probados con CUITs y CBUs reales.
- **Importar — el CSV se lee como texto** (UTF-8 o Windows-1252): la maqueta mostró que SheetJS convertía el CBU en número y perdía dígitos, y leía mal los acentos.
- **Cheques: un `<script type="module">` aparte dentro de Administración**, en vez de fundirlo con el de Administración: scope propio, cero choques de nombres, el código literalmente movido. La región va al final del archivo; las suites de Cheques la leen y la mutan sola (`fuente-cheques.js`, `mutar.js` con `region`), con los números de línea del archivo.
- **La sección Cheques no depende de la empresa** y deja entrar a Administración a quien solo ve Cheques (antes lo mandaba al dashboard por no tener `retiros`).
- **Cobranzas no se tocó**: su "Ver en Cheques" sigue yendo a `cheques.html` (redirige) y la cartera arma su `volver=` a `cheques.html`, así Cobranzas sigue diciendo "‹ Volver a los cheques".
- **El alta de clientes en Administración** ya no dice que pide Pedidos: `guardar_cliente` acepta `retiros:precios`.

## Lo que NO se probó

- **Nada con sesión real ni contra la base**: cero RPCs ejecutadas (Supabase en solo lectura). Todo en suites contra un doble y en la maqueta.
- **La descarga de las plantillas y del resumen** no se probó en un navegador (el panel descargaría archivos): el armado de filas está probado; `XLSX.writeFile` no.
- **Subir un .xlsx real hecho en Excel** (se probaron CSV en la maqueta). En particular: cómo llega un CBU tipeado en una celda con formato General (la plantilla lo formatea como texto; si igual llega como número, la vista previa lo marca).
- **La cartera de cheques dentro de Administración con datos reales** (dar salida, volver a cartera, la barra de selección fija): probada en la maqueta y en sus 9 suites.
- **"Instalar app" / el dashboard en el celular**, sin cambios.

## Guion para Facu

1. Dashboard → **Administración**: la tarjeta muestra un número si hay órdenes sin valorizar o clientes sobre su límite.
2. Administración → **Importar → Clientes** → "Descargar la plantilla": se baja `Clientes plantilla - <empresa>.xlsx` con las columnas de la ficha y la hoja "Cómo llenarla".
3. Completá tres filas: una bien, una con un CUIT inventado (cambiale el último número a uno real) y una con un nombre que ya existe. Subila: tiene que decir "3 filas: 1 bien, 2 con errores", cada error en bordó con su motivo.
4. "Guardar la fila buena" → aparece la confirmación → "Confirmar y guardar". Tiene que decir "Listo: se guardaron 1 de 1" y ofrecer "Descargar el resumen".
5. **Importar → Precios**: elegí una lista y la fecha, bajá la plantilla (trae productos y "Insumo"), poné un par de precios y subila. Confirmar guarda en una sola vez; la lista muestra los precios nuevos, incluida la sección "Materia prima e insumos".
6. **Importar → Saldos iniciales**: bajá la plantilla, poné el saldo de un cliente y subila. Si ya tenía saldo inicial, tiene que salir en bordó.
7. **Órdenes de retiro** (el depósito, en el celular): nuevo renglón → buscá "harina" → elegí el insumo → cantidad "25,5" → confirmar. El resumen, la hoja impresa y el texto compartido muestran "25,5 kg".
8. En **Administración → Órdenes**, abrí esa orden: el insumo dice "25,5 kg · Harina…"; **Valorizar** pide "Precio x kg".
9. Dashboard → **Cheques**: abre Administración en la cartera, con todo lo de siempre. Un link viejo a `cheques.html` (o el "Ver en Cheques" de Cobranzas) lleva al mismo lugar y destaca el cheque.

## Pendientes para otros chats

- **Chat de arquitectura (base):** `mis_ordenes_retiro()` con los renglones de insumo (ver Decisiones); una RPC de lotes de insumo para el depósito; `limpiar_fabrica_de_pruebas()` con órdenes, clientes y listas.
- **Chat de permisos (`.claude/`):** la definición del subagente `cheques` (`.claude/agents/cheques.md`) dice que es dueño de `modulos/cheques.html`: ahora es dueño de la **región de la cartera en `modulos/administracion.html`** y `cheques.html` es solo una redirección. Actualizarla (no la toqué: `.claude/agents/` no es de los chats de módulo).

## Qué automatizaría ahora

**La tarea repetida más cara de esta tanda fue escribir scripts de edición por heredoc y pelear con las barras invertidas**: cuatro veces un `'\\n'` terminó como un salto de línea real adentro de un string de JavaScript (en una suite, en `mutar.js`, en una mutación), y cada vez hubo que encontrarlo por un `SyntaxError`, leer el archivo y arreglarlo a mano. Propuesta: **una skill `editar-con-script`** que diga "los scripts de edición van en un archivo del scratchpad escrito con Write, nunca por heredoc", más un **chequeo en `check-bytes.js`** que marque en `pruebas/*.js` un string abierto con comilla simple que termina en la misma línea sin cerrar (el síntoma exacto), para que el error aparezca con su archivo y su línea en vez de como un `SyntaxError` lejos de la causa.

Segunda: **armar los datos de la maqueta desde los datos de las suites**. Para Pedidos y la gestión de Producción copié a mano los objetos que las suites ya tienen (`test-produccion-gestion.js` tiene el `indicadores_produccion` completo). Un script `e2e/maqueta/armar.js` que importe esos objetos de un módulo compartido (`pruebas/datos-de-prueba/*.js`) y genere los `.json` haría que la maqueta y las suites nunca diverjan.
