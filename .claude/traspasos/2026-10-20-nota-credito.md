# Nota de crédito de un proveedor (20/10/2026) — PARA EL CHAT DE LA BASE

Rama `ci-prueba/nota-credito-proveedor` (desde `origin/main` ed25b0b). Archivo: `modulos/cuentas-corrientes.html`. La descripción de la pantalla está en `docs/memoria/cuentas-corrientes.md` (la entrada del 20/10/2026).

## Lo que falta en la base

La pantalla llama a UNA función que **no existe todavía**. Mientras no esté, dice "Todavía no se puede cargar: la base no tiene la función registrar_nota_credito_proveedor. Avisale al chat de la base." y no guarda nada. **No inserta nada a mano en `creditos_proveedor`** (tiene que ser atómico).

### La firma que usa la pantalla

```
registrar_nota_credito_proveedor(
  p_proveedor_id uuid,
  p_unidad_negocio_id uuid,
  p_comprobante text,        -- 'Nota de crédito A 0001-00001234' (tipo + número, sin espacios de más)
  p_fecha date,              -- no futura (la pantalla ya lo frena)
  p_importe numeric,         -- > 0, en PESOS
  p_aplicaciones jsonb,      -- [{factura_pendiente_id, monto_aplicado}]  ([] = todo a favor)
  p_ajustes_stock jsonb      -- [{insumo_id, lote (text o null), cantidad (con signo: negativa = sale del stock)}]  ([] = ninguno)
) → jsonb {credito_id, aplicado, a_favor}
```

### Definición propuesta (revisarla y aplicarla; no se corrió nada)

```sql
create or replace function public.registrar_nota_credito_proveedor(
  p_proveedor_id uuid, p_unidad_negocio_id uuid, p_comprobante text, p_fecha date,
  p_importe numeric, p_aplicaciones jsonb default '[]'::jsonb, p_ajustes_stock jsonb default '[]'::jsonb)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_credito uuid;
  v_comprobante text := nullif(btrim(p_comprobante), '');
  v_importe numeric := round(p_importe, 2);
  v_aplicado numeric;
  v_disponible numeric;
  v_a record;
  v_aj record;
begin
  if not tiene_tarea('cuentas_corrientes', 'aplicar_credito') then
    raise exception 'No tenés permiso para cargar notas de crédito.';
  end if;
  if p_proveedor_id is null or not exists (select 1 from proveedores where id = p_proveedor_id) then
    raise exception 'El proveedor no existe.';
  end if;
  if p_unidad_negocio_id is null or not exists (select 1 from unidades_negocio where id = p_unidad_negocio_id) then
    raise exception 'Elegí la fábrica.';
  end if;
  if v_comprobante is null then raise exception 'Escribí el número de la nota de crédito.'; end if;
  if p_fecha is null then raise exception 'Elegí la fecha.'; end if;
  if p_fecha > (now() at time zone 'America/Argentina/Buenos_Aires')::date then
    raise exception 'La fecha no puede ser futura.';
  end if;
  if v_importe is null or v_importe <= 0 then raise exception 'El importe tiene que ser mayor a cero.'; end if;

  -- La misma nota no se carga dos veces.
  if exists (select 1 from creditos_proveedor
             where proveedor_id = p_proveedor_id and origen_tipo = 'nota_credito' and estado <> 'anulado'
               and lower(btrim(comprobante)) = lower(v_comprobante)) then
    raise exception 'Esa nota de crédito ya está cargada: %.', v_comprobante;
  end if;

  select coalesce(sum(round((x->>'monto_aplicado')::numeric, 2)), 0) into v_aplicado
    from jsonb_array_elements(coalesce(p_aplicaciones, '[]'::jsonb)) x;
  if v_aplicado > v_importe then
    raise exception 'Lo aplicado a las facturas pasa del importe de la nota.';
  end if;

  insert into creditos_proveedor (proveedor_id, unidad_negocio_id, moneda, monto_original, monto_disponible, estado,
                                  origen_tipo, comprobante, fecha_comprobante)
  values (p_proveedor_id, p_unidad_negocio_id, 'ARS', v_importe, v_importe, 'disponible',
          'nota_credito', v_comprobante, p_fecha)
  returning id into v_credito;

  -- Cada aplicación con la función de siempre (valida proveedor, fábrica,
  -- moneda, estado de la factura y que no pase su saldo).
  for v_a in
    select (x->>'factura_pendiente_id')::uuid as factura, round((x->>'monto_aplicado')::numeric, 2) as monto
      from jsonb_array_elements(coalesce(p_aplicaciones, '[]'::jsonb)) x
  loop
    if v_a.monto is null or v_a.monto <= 0 then continue; end if;
    perform aplicar_credito_a_factura(v_credito, v_a.factura, v_a.monto);
  end loop;

  -- Devolvió mercadería o corrige cantidades: un ajuste por insumo, como
  -- corrección de carga (no entra al tablero de mermas).
  for v_aj in
    select (x->>'insumo_id')::uuid as insumo, nullif(btrim(x->>'lote'), '') as lote, (x->>'cantidad')::numeric as cantidad
      from jsonb_array_elements(coalesce(p_ajustes_stock, '[]'::jsonb)) x
  loop
    if v_aj.insumo is null or v_aj.cantidad is null or v_aj.cantidad = 0 then
      raise exception 'Un ajuste de stock está incompleto (insumo y cantidad).';
    end if;
    perform registrar_ajuste_stock(p_unidad_negocio_id, v_aj.insumo, v_aj.lote, v_aj.cantidad,
                                   'Nota de crédito ' || v_comprobante, null, null, 'correccion_carga');
  end loop;

  select monto_disponible into v_disponible from creditos_proveedor where id = v_credito;
  return jsonb_build_object('credito_id', v_credito, 'aplicado', v_importe - v_disponible, 'a_favor', v_disponible);
end $$;

revoke execute on function public.registrar_nota_credito_proveedor(uuid, uuid, text, date, numeric, jsonb, jsonb) from public, anon;
grant execute on function public.registrar_nota_credito_proveedor(uuid, uuid, text, date, numeric, jsonb, jsonb) to authenticated, service_role;
```

### Cosas para decidir en la base

1. **El ajuste de stock pide además `stock:ajustar_inventario` en la fábrica**: `registrar_ajuste_stock` lo revalida con el usuario que llama. Con la definición de arriba, alguien con `aplicar_credito` sin ese permiso que cargue un ajuste hace fallar TODA la nota (se revierte entera, y la pantalla muestra el error de la base tal cual). Alternativas: dejarlo así (lo más seguro), o validarlo al principio con un mensaje propio ("Para ajustar el stock hace falta el permiso de ajustar inventario en esta fábrica.").
2. `registrar_ajuste_stock` exige lote en materia prima; la pantalla ya lo pide.
3. Solo pesos (la firma no tiene moneda). Si hace falta otra moneda, sumar `p_moneda` y la pantalla lo agrega.
4. `aplicar_credito_a_factura` ya pide `aplicar_credito` y bloquea la fila del crédito: alcanza para el reparto.

## Decisiones tomadas sin consultar (pantalla)

- Deshabilitado con "Todas las unidades" (la nota es de una fábrica, como "Aplicar crédito").
- Los tipos que se ofrecen: Nota de crédito A / B / C / X.
- "Aplicar a las más viejas" reparte desde la factura más vieja; tildar una factura propone lo que falta del importe, hasta su saldo.
- El ajuste ofrece los dos sentidos: "Sale del stock (se devolvió)" (cantidad negativa) y "Entra al stock (se contó de menos)" (positiva).

## Lo que no se pudo probar

- Nada contra la base real (la función no existe). Todo con un doble y la maqueta con la función simulada.

## Qué automatizaría ahora

Cuando una pantalla se arma contra una función que la base todavía no tiene, el mensaje "falta la función" lo escribe cada pantalla a mano (`mensajeErrorNota`). Un helper en `js/utils.js` (`esFuncionQueFalta(error)`) + un texto común ahorraría repetirlo y haría que el chequeo de la base ("¿ya existe?") se pueda correr solo: una prueba que lea `supabase/esquema.md` y avise cuando aparezca.
