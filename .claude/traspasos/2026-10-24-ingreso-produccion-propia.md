# Traspaso — Producción propia en el ingreso de producto terminado (Tanda C, 24/10/2026)

Rama: `ci-prueba/ingreso-produccion-propia` (desde `origin/main` `d2d1dc1`). No se integró a main: eso lo hace la sesión principal.
Supabase: solo lectura (SELECT de verificación). Ninguna escritura.

## Qué se hizo (en castellano simple)

En la gestión de Producción → Stock terminado → "Cargar ingreso", el "¿De dónde viene?" tiene ahora **tres** opciones. La nueva va **arriba de todo y a lo ancho**: **"Producción propia (Dolce Pasta)"** (con el nombre de la fábrica que recibe). Sirve para lo que una fábrica hace ella misma sin planilla, como los barquillos de Dolce Pasta.

- Al elegirla, a la base va "viene de esta misma fábrica" y ningún proveedor. La base no genera deuda entre empresas por eso.
- El lote se llama **"Lote de fabricación"** y es obligatorio. **No** se pregunta "Último lote: X. ¿Sigue siendo este?": cada tanda trae su lote. Sin lote no se guarda ("Renglón 1: poné el lote de fabricación.", el mismo texto que la base).
- No se pide precio. El remito sigue siendo opcional.
- Los productos marcados en la base como "se hacen en la fábrica" (`origen_tipo = 'fabrica'`, como los 7 "Cono dulce …" de Dolce Pasta) **traen elegida** la producción propia. Si alguien eligió el origen a mano, no se le cambia.
- Los errores de la base se muestran tal cual; el nombre de la fábrica va escapado.
- La pantalla "Salidas entre fábricas" no lista estas cargas (no son salidas hacia otra fábrica).

## Qué se verificó contra la base (24/10/2026)

- `pg_get_functiondef(ingresar_producto_terminado)`: firma `(uuid, date, uuid, uuid, text, jsonb, text, uuid)`, sin cambios de firma. Con `p_unidad_origen_id = p_unidad_negocio_id`: motivo "producción propia (<fábrica>)", lote obligatorio por renglón ("Renglón %: poné el lote de fabricación."), la deuda entre unidades solo con origen ≠ destino y precio > 0. Sigue exigiendo uno y solo uno entre proveedor y fábrica de origen.
- `information_schema.columns` de `productos_terminados`: `origen_tipo text` nullable, más `origen_unidad_id`, `origen_proveedor_id`, `origen_producto_id`. CHECK `chk_pt_origen` y `productos_terminados_origen_tipo_check` ('fabrica' / 'unidad' / 'proveedor').
- Datos: en Dolce Pasta, los 7 "Cono dulce …" activos con `origen_tipo = 'fabrica'` (y 18 productos más sin origen). En Cucuruchos Nuss, los 8 cucuruchones también tienen `'fabrica'` (ver "Decidido sin consultar").
- `pg_get_viewdef(v_salidas_entre_fabricas)`: toma todo `ingreso_externo` con `unidad_origen_id` no nulo, así que **incluye la producción propia** (origen = destino).

## Archivos

- `modulos/produccion-gestion.html`: `ORIGENES_INGRESO`, `elegirOrigenIngreso(ing, tipo, aMano)`, `soltarLoteDeOrigen`, `sugerirOrigenIngreso`, `origenTipoDe`, `origenParaBase` (rama 'propia'), `modoLoteIngreso(r, ing)` → `'fabricacion'`, `loteDeRenglon(r, ing)`, `faltaIngreso` (texto de origen y "poné el lote de fabricación"), `htmlLoteIngreso(r, ing)` (rótulo "Lote de fabricación"), el botón y la nota en `pintarIngreso`, el catálogo lee `origen_tipo`, `alCambiarIngreso` / `alTocarIngreso` vuelven a sugerir, `cargarSalidas` saca origen = destino, CSS `.pr-ing__op--propia` y `.pr-ing__nota`, y el subtítulo del ingreso.
- `pruebas/test-produccion-ingreso-propia.js` (nueva, 72/72; baseline fijo `d2d1dc1`: todos los controles del ingreso de antes siguen) y `pruebas/mut-produccion-ingreso-propia.js` (35/35).
- `pruebas/test-produccion-ingreso.js` (102/102) y `pruebas/mut-produccion-ingreso.js` (66/66 +5 equivalentes): el texto nuevo de "sin origen", las firmas nuevas y el equivalente `esc(rotulo)` (texto constante).
- `pruebas/datos-maqueta/ingreso-produccion-propia.js` + `e2e/maqueta/datos/ingreso-produccion-propia.json` (generado).
- `e2e/63-ingreso-produccion-propia.spec.js` (390, 360, 1000×540 y 1280, más "lo elegido a mano no se pisa"), y `e2e/44-ingreso-terminado.spec.js` con el texto nuevo de "sin origen".
- `docs/memoria/produccion.md`: un ítem nuevo debajo de "EL LOTE DEL INGRESO, DESDE EL 21/10/2026".

## Para el chat de arquitectura (CLAUDE.md / docs)

`docs/memoria/produccion.md` ya está actualizado en esta rama (sección Stock terminado → "Cargar ingreso", ítem "PRODUCCIÓN PROPIA EN EL INGRESO"). CLAUDE.md no necesita cambios (es un índice). No hay tareas ni permisos nuevos: el ingreso sigue pidiendo `materia_prima:cargar` o `stock:ajustar_inventario` en la fábrica que recibe, igual que la base.

## Decidido sin consultar

1. **Cuándo viene elegida la producción propia.** Como el origen se elige antes que los productos, la pantalla la elige **al elegir un producto con `origen_tipo = 'fabrica'`**, mientras nadie haya tocado un origen a mano. Si después no queda ningún renglón de fábrica, se suelta. Lo elegido a mano nunca se pisa.
2. **Vale en todas las fábricas**, no solo en Dolce: en Cucuruchos Nuss los cucuruchones también tienen `origen_tipo = 'fabrica'`, así que un ingreso de cucuruchones en Nuss también la trae elegida. Allí lo normal es que entren por la planilla (cierre de turno), así que este ingreso casi no se usa para eso; si Facu prefiere que la opción aparezca solo en fábricas sin planilla, hace falta decir cuáles.
3. **Al pasar de proveedor u otra fábrica a producción propia**, un lote aceptado con "Sí" (el último) se borra y se pide el de la tanda; lo escrito a mano queda.
4. **Salidas entre fábricas**: la pantalla saca las filas con origen = destino (después de contar el tope de 1000 filas). Lo correcto es que lo haga la vista (ver "Pendiente para el chat de la base").
5. Se agregó una nota corta debajo de los botones cuando está elegida ("Lo hizo esta fábrica: cada producto lleva el lote de fabricación de la tanda. No genera deuda entre empresas.") y el subtítulo del ingreso nombra las tres opciones.
6. No se creó el tag `antes-de-…` de reglas-de-tanda: el pedido decía "pusheá solo esa rama". La rama sale de `d2d1dc1`, que ya está en main.

## Lo no probado

- No se cargó un ingreso real contra la base (Supabase solo lectura): lo de la base se probó leyendo el cuerpo de la RPC; la pantalla, con la maqueta y las suites.
- Cómo se ve la fila "Ingreso desde producción propia (…)" en el detalle de movimientos del stock terminado: el texto lo arma la base y la pantalla lo muestra escapado, sin cambios.

## Pendiente para el chat de la base

- **`v_salidas_entre_fabricas`** debería excluir la producción propia: agregar `AND s.unidad_origen_id <> s.unidad_negocio_id` al WHERE. Hoy la pantalla la filtra, pero el tope de 1000 filas cuenta también esas filas, y cualquier otro lector de la vista (un informe, Excel) las vería como "salidas".
- Opcional: que `ingresar_producto_terminado` rechace `precio_caja` en producción propia (hoy lo acepta y no lo usa para nada; la pantalla no lo manda).

## Qué automatizaría ahora

La tarea repetida más cara fue **ajustar a mano las mutaciones de la suite vieja** (`mut-produccion-ingreso.js`) cada vez que cambia la firma o un renglón de una función: 7 anclas quedaron viejas por cambios chicos (`modoLoteIngreso(r)` → `modoLoteIngreso(r, ing)`). El runner ya dice "lo más parecido (línea N, 79 %)"; el paso siguiente es un `node pruebas/mutar.js --proponer mut-x.js` que, para cada ancla que no está, escriba la propuesta de reemplazo con la línea parecida (sin aplicarla), así se revisa y se acepta en un minuto en vez de buscar cada una.
