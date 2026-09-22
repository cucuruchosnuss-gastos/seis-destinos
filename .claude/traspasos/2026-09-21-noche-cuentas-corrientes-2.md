# Traspaso — Cuentas Corrientes, noche del 21/09/2026 (parte 10b)

Prompt para el chat de arquitectura. Autocontenido: quien lo lea no vio el trabajo.

## Qué cambió

En la ficha de un proveedor, "Cargar importe" de una descarga sin importe (factura en estado `sin_importe`) mostraba la mercadería leyendo `materia_prima_ingresos` + `materia_prima_items`. Esas tablas tienen el RLS de Ingreso (`materia_prima:ver_todo`), así que un administrador de Cuentas Corrientes sin esa tarea veía el aviso "No se pueden ver las cantidades…" y **solo podía cargar el total**.

Ahora la mercadería sale de la RPC **`items_de_factura_pendiente(p_factura_id uuid)`**, una llamada por descarga sin importe (en paralelo). Archivo: `modulos/cuentas-corrientes.html`, funciones `cargarCantidadesSinImporte`, `resumenCantidades`, `productoUnicoConCantidad` (nueva), `textoCantidadInsumo`, `totalImporteFormulario`, `htmlFilaSinImporte` y la llamada en `renderizarFichaMovimientos`. **El archivo ya no lee ninguna tabla de Ingreso.** No se tocó la base.

## La RPC, verificada en solo lectura (22/09/2026, `pg_get_functiondef` + `pg_proc`)

- Firma: `items_de_factura_pendiente(uuid)`, parámetro `p_factura_id`.
- Devuelve `TABLE(insumo text, marca text, unidad_medida text, cantidad numeric, cantidad_bultos numeric, contenido_por_bulto numeric)`.
- `LANGUAGE sql STABLE SECURITY DEFINER`, `search_path = public`.
- EXECUTE: `authenticated` y `service_role`; `anon` no.
- Permiso: filtra con `tiene_tarea('cuentas_corrientes','ver_todo') or tiene_tarea('cuentas_corrientes','registrar_pago')` (con bypass de super_admin). **Sin ninguna de las dos devuelve CERO filas, no un error.**
- Junta todos los ingresos con `factura_pendiente_id = p_factura_id` y ordena por nombre del insumo.
- **CLAUDE.md no la menciona en ningún lado**: falta sumarla a la lista de RPCs del circuito (no se sabe qué chat la creó; conviene anotarlo en el registro de escrituras si alguien lo sabe).

## Reglas de la pantalla (cómo quedó)

- **Un solo producto con cantidad > 0** → se ofrece "Precio por <unidad>"; la pantalla multiplica y manda el TOTAL, redondeado al centavo, a `completar_importe_factura`. Probado: 2.000 kg × "1.234,50" manda `p_importe = 2469000` exacto.
- **Varios productos** → solo total, con "Son varios productos: cargá el total."
- **Un producto con cantidad null** → se muestra "— kg de …" (nunca 0) y NO se ofrece precio por unidad.
- **La RPC falla (error o excepción de red)** → la descarga queda con `null` en el Map y la fila dice "No se pudieron traer los productos de esta descarga: se puede cargar el total igual." El formulario y "Guardar importe" siguen andando.
- **La RPC devuelve vacío** → "No se encontraron los productos de esta descarga: se puede cargar el total."
- **Sin `ver_todo` ni `registrar_pago`** → ni se llama a la RPC, y la fila dice "Las cantidades de esta descarga se ven con permiso para ver todas las cuentas corrientes o para registrar pagos." (Esa persona igual no puede cargar el importe: el botón exige `registrar_pago`.) El aviso viejo que mandaba a pedir permiso de materia prima **se sacó**: ya no es cierto.
- La fila ahora muestra también la **marca** entre paréntesis y, si todos los renglones del producto son de la misma presentación, los **bultos** ("2.000 kg de Harina 000 (Jupiter) · 80 bultos de 25 kg"). Con presentaciones mezcladas no se inventan bultos. Se agrupa por nombre + marca + unidad (la RPC no devuelve `insumo_id`; `insumos` tiene índice único por nombre + marca).
- Todo lo de la RPC (insumo, marca, unidad) se escapa con `esc()`: el texto se arma plano en `textoCantidadInsumo` y se escapa al entrar a HTML; la unidad de "Precio por" también. Los números van por `formatearNumeroAr`.

## Qué se verificó

- `pruebas/test-cuentas-corrientes-circuito.js`: **107/107** (antes 78). Ejecuta los renders con la RPC mockeada: un producto, varios, error, excepción de red, vacío, sin permiso, solo `ver_todo`, y texto malicioso en insumo/marca/unidad (marcas escapadas). Falla contra el archivo de `HEAD`.
- `pruebas/mut-cuentas-corrientes-circuito.js`: **48/48** mutaciones detectadas (antes 39). Nuevas: volver a leer de `materia_prima_items`, sacar el escape de la mercadería y de la unidad, precio por unidad con varios productos o con cantidad null, error tratado como vacío, excepción de red que traba, llamar sin permiso, sacar el aviso de error, sacar la marca, inventar bultos con presentaciones mezcladas. Una escapó en la primera corrida (bultos con dos presentaciones distintas): era cobertura faltante de verdad y se agregó el caso.
- `pruebas/test-cuentas-corrientes-numeros.js`: 284/284 (solo se sumó `productoUnicoConCantidad` a su lista de funciones); `mut-cuentas-corrientes-numeros.js`: 37/37. `textoCantidadInsumo` sin marca ni bultos sigue dando exactamente lo mismo que antes.
- `pruebas/check-scripts.js`: OK en todos los HTML. Todas las `test-*.js` en verde y `controles-cobranzas.js` 354/354.
- Nada probado en un navegador ni contra una descarga real (no hay sesión).

## Qué tocar en CLAUDE.md

1. Módulo 3 (Cuentas Corrientes), párrafo del circuito: reemplazar **"LAS CANTIDADES NECESITAN PERMISO DE INGRESO …"** por: la mercadería sale de `items_de_factura_pendiente` (SECURITY DEFINER, exige `cuentas_corrientes:ver_todo` o `registrar_pago`), así que cualquiera que pueda cargar importes ve las cantidades y puede usar precio por unidad; si la RPC falla o viene vacía se degrada a solo total con aviso; sin esas tareas, aviso de permiso. Borrar "Resolverlo es una RPC `SECURITY DEFINER` nueva, que no existe".
2. Lista de RPCs del circuito: sumar `items_de_factura_pendiente(p_factura_id)` con su firma, su retorno y su permiso (arriba).
3. `pruebas/`: actualizar los números de las suites de CC del circuito (107/107, mutaciones 48/48).

## Pendientes / anotado sin resolver

- La RPC **no filtra por unidad de negocio ni por dueño**: cualquiera con `registrar_pago` ve la mercadería de cualquier descarga. Hoy es coherente (las tareas de CC no tienen alcance), pero si algún día se les pone alcance, esta RPC tiene que respetarlo.
- No se sabe qué chat creó la RPC ni cuándo: no figura en el registro de escrituras.
- Sin commit ni push, por pedido.
