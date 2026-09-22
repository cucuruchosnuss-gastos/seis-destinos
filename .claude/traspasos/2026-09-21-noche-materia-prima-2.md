# Traspaso — Ingreso (materia-prima), noche del 21/09/2026, parte 10c

Para: el chat de arquitectura (SQL de estructura sobre un objeto de Ingreso que esta noche no se pudo aplicar, y la actualización de CLAUDE.md).
Quien lo recibe no vio nada de este trabajo: todo lo necesario está acá.

## El pedido

En el wizard de Ingreso, con la casilla **"Mercadería que ya estaba (se contó antes): no suma stock"** marcada (`materia_prima_ingresos.sin_stock_motivo` no nulo), los renglones **no deberían exigir lote**: no suman stock y esa mercadería ya se contó. El resto de las validaciones queda igual.

## Qué se encontró (verificado en solo lectura el 21/09/2026, noche)

**No se cambió nada. Ni código ni base.** El motivo es el trigger:

1. `pg_get_functiondef('fn_validar_item_materia_prima')` — `SECURITY DEFINER`, `SET search_path TO 'public'`, `RETURNS trigger`. Exige lote cuando `insumos.tipo = 'materia_prima'` **y** `new.ya_recibido_con_remito = false` **y** lote vacío **y** `lote_ilegible = false`. **No lee la cabecera: no mira `sin_stock_motivo`.** Lo que dice CLAUDE.md es correcto.
2. `pg_trigger` sobre `materia_prima_items`: `trg_validar_item_materia_prima` BEFORE INSERT OR UPDATE → esa función; `trg_espejar_stock_ingreso` AFTER INSERT/UPDATE/DELETE → `fn_espejar_stock_ingreso`.
3. **`fn_espejar_stock_ingreso` YA lee la cabecera** (`select ... ing.sin_stock_motivo ... from materia_prima_ingresos ing where ing.id = new.ingreso_id`) y suma solo si `ya_recibido_con_remito = false and v_sin_stock is null`. O sea: el trigger de lote y el de stock hoy usan criterios distintos para "este renglón suma", y el de lote es el que se quedó atrás.
4. **El orden de inserción permite que el trigger de lote mire la cabecera:** `confirmarIngreso()` inserta primero `materia_prima_ingresos` (con `sin_stock_motivo`, ~línea 7907/7932) y **después**, en otra llamada, `materia_prima_items` (~7945). La cabecera ya está commiteada cuando corre el BEFORE INSERT de los ítems. Y `trg_ingreso_sin_stock_inmutable` impide cambiar `sin_stock_motivo` después, así que un ítem validado con ese valor no puede quedar inválido más tarde.
5. Dato: hoy hay **0** ingresos con `sin_stock_motivo` no nulo.

**Por qué no se tocó el cliente:** si el wizard dejara pasar un renglón de materia prima sin lote con la casilla marcada, el `insert` de los ítems caería en el trigger **al confirmar, con todos los renglones cargados**, y `confirmarIngreso()` borraría el ingreso. Marcar `lote_ilegible = true` para esquivarlo sería un dato falso. Tampoco se dejó un cambio "inactivo" en el HTML: ver abajo, el cambio de cliente no es solo una condición en `validarItems` (la casilla está en el paso equivocado), y dejarlo a medias complicaba más de lo que ahorraba.

## SQL propuesto (NO aplicado — esta noche la base era solo lectura)

Misma firma, mismo `SECURITY DEFINER`, mismo `search_path`, sin `DROP` (la firma no cambia: `CREATE OR REPLACE` reemplaza, no crea sobrecarga):

```sql
create or replace function public.fn_validar_item_materia_prima()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_tipo text;
  v_sin_stock text;
begin
  select tipo into v_tipo from insumos where id = new.insumo_id;

  if v_tipo is null then
    raise exception 'El insumo indicado no existe en el catálogo.';
  end if;

  -- "Mercadería que ya estaba": el ingreso entero no suma stock
  -- (fn_espejar_stock_ingreso usa el mismo criterio), así que no pide lote.
  -- La cabecera se inserta antes que los ítems, y trg_ingreso_sin_stock_inmutable
  -- impide cambiar sin_stock_motivo después.
  select sin_stock_motivo into v_sin_stock
    from materia_prima_ingresos where id = new.ingreso_id;

  if v_tipo = 'materia_prima'
     and new.ya_recibido_con_remito = false
     and v_sin_stock is null
     and coalesce(btrim(new.lote), '') = ''
     and new.lote_ilegible = false then
    raise exception 'Este insumo es materia prima: cargá el número de lote o marcá "lote ilegible".';
  end if;

  return new;
end;
$function$;
```

Nota: el cuerpo actual está guardado con CRLF. El `CREATE OR REPLACE` lo deja en LF; no cambia el comportamiento.

### Cómo verificarlo después

1. `select pg_get_functiondef('public.fn_validar_item_materia_prima'::regproc);` → el cuerpo nuevo, `SECURITY DEFINER`, `search_path=public`.
2. `select count(*) from pg_proc where proname = 'fn_validar_item_materia_prima';` → **1** (sin sobrecargas).
3. `select tgname, pg_get_triggerdef(oid) from pg_trigger where tgrelid = 'public.materia_prima_items'::regclass and not tgisinternal;` → `trg_validar_item_materia_prima` sigue BEFORE INSERT OR UPDATE.
4. Prueba de comportamiento **sin dejar filas**, dentro de una transacción con `rollback` (con un `insumo_id` de tipo `materia_prima`, una unidad y un empleado reales):
   - cabecera con `tipo_doc='factura_a'`, `sin_stock_motivo = 'prueba'` + ítem de materia prima sin lote, `lote_ilegible=false`, `ya_recibido_con_remito=false` → **entra**, y `stock_movimientos` no gana fila para ese ítem.
   - la misma cabecera con `sin_stock_motivo = null` + el mismo ítem → **rechaza** con el mensaje de siempre.
   - `rollback` al final. (Esto inserta filas de prueba aunque se deshagan: requiere el OK de quien tenga escritura.)

## El cambio de cliente que va con el SQL (listo para aplicar, NO hecho)

Se aplica **después** de que el SQL esté arriba, nunca antes.

**Lo que no es obvio: la casilla está en el paso de CONFIRMACIÓN (`wz-paso-confirmar`, ~línea 2727/2747), que viene DESPUÉS del paso de ítems.** Cuando se valida el lote (`validarItems()`, paso de ítems) la casilla todavía no se marcó. Así que no alcanza con agregar `&& !w.sinStock` a la condición. Dos opciones:

- **A (recomendada):** mover el bloque `wz-bloque-sin-stock` (casilla + motivo + aviso de que no se puede cambiar) al paso **Datos** (encabezado), visible solo si `esFactura(tipoDoc)`. Así se sabe antes de cargar los renglones. La validación del motivo (`validarCircuitoAntesDeGuardar`, ~8144) puede quedarse donde está o pasar a la salida del paso Datos.
- **B:** dejarla en confirmación y, al **desmarcarla**, volver a correr `validarItems()` y mandar al paso de ítems si algún renglón quedó sin lote. Más frágil.

Con A, los cambios concretos:

1. `validarItems()` (~7482): la condición de lote pasa a
   `item.tipo === 'materia_prima' && !item.yaRecibido && !(esFactura(w.encabezado.tipoDoc) && w.sinStock) && !item.loteIlegible && !String(item.lote || '').trim()`.
   Conviene un helper `ingresoNoSumaStock(w)` usado también en el payload de la cabecera (~7932), así el cliente y la base miran lo mismo.
2. Tarjeta abierta (`loteHtml`, ~6834): con la casilla marcada, el bloque de lote se sigue dibujando (se puede cargar si se sabe) pero el badge dice **OPCIONAL** en vez de OBLIGATORIO, con un hint "No suma stock: el lote es opcional." El botón "Lote ilegible" sigue disponible pero **nada lo marca solo**.
3. Tarjeta plegada (`chipLote`, ~6320): con la casilla marcada y sin lote, **no** mostrar el chip "Sin lote" (no falta nada), igual que con `yaRecibido`.
4. Al cambiar la casilla (listener ~9236): re-renderizar la lista de ítems si ya hay renglones (para que el badge cambie) y, al desmarcarla, que la validación vuelva a exigir lote al avanzar.
5. El payload de ítems (~7734) **no cambia**: `lote` va como se tipeó y `lote_ilegible: !!item.loteIlegible`. Nada se inventa.
6. Detalle del ingreso (~4283): hoy muestra el chip "Sin lote" para materia prima que suma; con `sin_stock_motivo` en la cabecera no debería mostrarlo. Hay que pasarle al render si la cabecera tiene `sin_stock_motivo` (ya viene en el `.select()` del listado, ~3654).

Tests a escribir con el cambio (en `pruebas/`, ejecutando y no por regex): `validarItems()` con materia prima sin lote → error con casilla desmarcada, sin error con casilla marcada; el mismo caso en un remito (la casilla no aplica) → error; el payload de ítems con casilla marcada y sin lote → `lote: null`/vacío y `lote_ilegible: false`; el render de la tarjeta dice OPCIONAL. Mutaciones: sacar el `!ingresoNoSumaStock(w)` de la condición; sacar el `esFactura` del helper; cambiar el payload a `lote_ilegible: true` cuando no hay lote.

## Qué hay que tocar en CLAUDE.md

- Sección **Materia Prima / Insumos → `materia_prima_ingresos.sin_stock_motivo`**: hoy dice *"OJO: el trigger de lote (`fn_validar_item_materia_prima`) NO la mira, así que un renglón de materia prima que no suma igual pide lote."* Sigue siendo cierto al 21/09/2026 (re-verificado). Cuando se aplique el SQL de arriba, reemplazarlo por: el trigger de lote lee `sin_stock_motivo` de la cabecera con el mismo criterio que `fn_espejar_stock_ingreso`, y el orden (cabecera antes que ítems) más `trg_ingreso_sin_stock_inmutable` es lo que lo hace seguro.
- Entrada del trigger `trg_validar_item_materia_prima` (misma sección): sumar la condición `sin_stock_motivo is null`.
- Módulo Ingreso, párrafo "Mercadería que ya estaba": cuando se aplique el cliente, anotar que la casilla se mudó al paso Datos (si se elige la opción A) y que ahí el lote es opcional.
- Mientras no se aplique nada: no hay cambio de doc, salvo anotar este pendiente.

No hay tareas ni permisos nuevos. Ninguna RPC cambió de firma.
