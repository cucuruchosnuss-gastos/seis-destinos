# Inventario de números — Seis Destinos (21/09/2026, HEAD b00057c)

Solo lectura. Líneas contra el working copy limpio. Los helpers se ejecutaron con node
(`scratchpad/probar.js`, usando `pruebas/extraer.js`); los resultados de la tabla de
casos al final salen de esa corrida, no de leer el código.

Convención: **IMP** = importe (plata), **CANT** = cantidad, **ID** = identificador (no se toca).

---

## js/utils.js

- No tiene inputs, parsers ni formateadores de números. Solo `formatearFecha`, `calcularPeriodo`
  (`Number(mes)` sobre un 'YYYY-MM' — fecha, no importe), contraseñas y toasts.
- Almacenamiento local: ninguno. (`js/auth.js:25-36` usa localStorage solo para una bandera
  de recuperación de contraseña, `'1'`.)

---

## modulos/gastos.html

### 1. Inputs
| id | línea | type / inputmode | clase |
|---|---|---|---|
| `campo-importe` | 1875 | text / decimal | IMP |
| `campo-kilometraje` | 1984 | **type="number"** min=0 | CANT entera — DUDOSO (ver riesgos) |
| `edit-importe` (plantilla edición gasto) | 5710 | text / decimal | IMP |
| `edit-kilometraje` (plantilla) | 5719 | **type="number"** | CANT entera — DUDOSO |
| `edit-factura-importe` (plantilla edición factura) | 6022 | text / decimal | IMP |
| `campo-interes-monto` (plantilla modal interés) | 6150 | text / decimal | IMP |
| `campo-interes-tasa` (plantilla modal interés) | 6158 | text / decimal | porcentaje (tratado como IMP: 2 decimales, mismo parser) |
| `campo-numero-doc` | 1836 | text | ID (n° comprobante) |
| `campo-nuevo-prov-cuit` | 2094 | text | ID (CUIT) |
| `edit-numero-doc` | 5705 | text | ID |
| `edit-factura-numero` | 6019 | text | ID |

`formatearImporteEnVivo()` (2355) cableado a: `campo-importe` 6584, `edit-importe` 5764,
`edit-factura-importe` 6046, `campo-interes-monto` 6183, `campo-interes-tasa` 6184.

### 2. Lecturas
- `parseImporte(campo-importe)`: 4627 (validación paso Datos), 6618 (validación salida), 5097 (`armarGasto` payload), 5354 (payload factura pendiente).
- `parseImporte(edit-importe)`: 5806 (guardar edición gasto).
- `parseImporte(edit-factura-importe)`: 6084.
- `parseImporte(campo-interes-monto)`: 6200 (`actualizarInfoModoA`), 6258 (confirmar).
- `parseImporte(campo-interes-tasa)`: 6210 (`actualizarMontoModoB`), 6264 (confirmar).
- Kilometraje: `toNum('campo-kilometraje')` = `Number(v)` si no vacío — 5086/5108 y 5346/5361; edición `Number(edit-kilometraje.value)` 5810.
- `importeDeOcr(texto)` 4941: `Number(texto)`, rechaza ''/null, exige >0 (importe_ocr de Ingreso, texto de ocr_crudo).
- Otros `Number()` sobre datos de base (no inputs): 2765/2785 export y total, 6194-6195 base del interés.

### 3. Escrituras
- OCR → `campo-importe.value = Number(datos.importe).toLocaleString('es-AR',{min 2,max 2})` — 4814-4820 (string formateado "387.300,50"). Guard `datos.importe != null`.
- "Cargar gasto" desde ingreso → `poner('campo-importe', importe.toLocaleString(... 2/2))` 5031-5034 (string formateado; `importeDeOcr` ya filtró null).
- Plantilla edición gasto: `value="${Number(g.importe).toLocaleString(... 2/2)}"` 5710. **Con `g.importe` null daría "0,00"** (latente; gastos.importe hoy no es null).
- Plantilla edición factura: ídem con `f.importe` 6022. Solo se abre con `estado === 'pendiente'` (5949), donde el importe no es null; una `sin_importe` daría "0,00" si alguna vez se habilitara.
- Plantilla kilometraje: `value="${esc(g.kilometraje)}"` 5719 (número crudo).
- Limpiezas: `.value = ''` en 3701-3712 (btn-sin-foto) y en btn-cambiar-foto (mapaInverso, 6533-6545).

### 4. Formateadores
- `formatearImporte(importe, moneda='ARS')` 2251: null/undefined → `'—'`; `''` → `"$ 0,00"`; NaN/texto → `"$ NaN"`; string "1.500" → `"$ 1,50"` (Number lee el punto como decimal).
- `formatearImporteDuplicado(v)` 3824: null/undefined/'' → `null`; no finito → `null`; resto `"$1.234,5"` (sin mínimo de decimales).
- `formatearImporteEnVivo(input)` 2355: en cada `input` borra todo lo que no sea dígito o coma (**los puntos tipeados se descartan**), conserva la primera coma, re-pone puntos de miles y corta decimales a 2.

### 5. Almacenamiento local
Ninguno.

---

## modulos/caja.html

### 1. Inputs
| id | línea | type / inputmode | clase |
|---|---|---|---|
| `movimiento-monto` | 1555 | text / decimal | IMP |
| `traspaso-monto` | 1600 | text / decimal | IMP |
| `traspaso-monto-destino` | 1605 | text / decimal | IMP |
| `editar-bancarios-cbu` | 1495 | text | ID (CBU) |
| `editar-bancarios-alias` | 1499 | text | ID (alias) |
| `editar-bancarios-numero` | 1503 | text | ID (n° cuenta) |

`formatearImporteEnVivo` cableado a los tres montos: 4679-4681.

### 2. Lecturas
- `parseImporte(movimiento-monto)` 4353; `parseImporte(traspaso-monto)` 4531; `parseImporte(traspaso-monto-destino)` 4541.
- Bancarios: `.value.trim() || null` 2949-2951 (texto, sin conversión).
- `Number()` sobre saldos/montos de base (no inputs): 2123, 2264, 2502, 2579, 2587, 2596, 2634, 2993, 3819, 3995.

### 3. Escrituras
- Solo limpiezas: `movimiento-monto.value=''` 4322; `traspaso-monto(.destino).value=''` 4516-4517.
- Bancarios: `.value = c?.cbu || ''` etc. 2935-2937 (texto).

### 4. Formateadores
- `formatearImporte` 1919: igual a gastos (null → '—', '' → "$ 0,00", NaN → "$ NaN").
- `importeHtml` 1900 = `esc(formatearImporte())`.
- `formatearImporteCentavosSuaves` 1931: `Number(importe || 0)` → **null/undefined/''/0 → "$ 0<span>,00</span>"**; NaN → "$ NaN<span>,undefined</span>".
- `formatearImporteEnVivo` 1952: idéntica a gastos.

### 5. Almacenamiento local
Ninguno.

---

## modulos/cuentas-corrientes.html

### 1. Inputs
| id / selector | línea | type / inputmode | clase |
|---|---|---|---|
| `campo-monto-pago` | 1224 | text / decimal | IMP |
| `campo-monto-credito` | 1294 | text / decimal | IMP |
| `.monto-fifo[data-index]` (plantilla filas FIFO) | 3843 | text / decimal | IMP |
| `.campo-importe-sin` (plantilla "Cargar importe") | 3365 | text / decimal | IMP (total **o precio por unidad** según modo) |
| `campo-agregar-prov-cuit` | 1349 | text | ID (CUIT) |
| `campo-editar-prov-cuit` | 1389 | text | ID (CUIT) |

`formatearImporteEnVivo`: pago 4210, crédito 4234, cada `.monto-fifo` 3864, `.campo-importe-sin` al primer `focusin` 4147-4148.

### 2. Lecturas
- `parseImporte(campo-monto-pago)` 3781, 3872, 3890.
- `parseImporte(campo-monto-credito)` 3619.
- `.monto-fifo` → `facturasParaPago[i].monto = parseImporte(e.target.value) || 0` 3861 (vacío → 0).
- `.campo-importe-sin` → `form.texto = input.value` 4154 (string crudo en memoria); se parsea en `totalImporteFormulario(form)` 3338 → `parseImporte(form.texto)`; en modo `'unidad'` multiplica por la cantidad y redondea a centavos.
- Prefill del crédito: regex sobre el texto de la `<option>` (`saldo … ([\d.,]+)`) → `parseImporte(match[1])` 4228 (el texto viene de `formatearImporte`, formato es-AR: OK).
- CUIT: `.value.trim()` 2343, 2573 (texto).
- `Number()` sobre datos de base: 1862, 2207, 2408-2409, 2909, 2945, 3056, 3089-3090, 3174, 3195, 3220, 3321, 3331, 3809, 3816, 4230-4231.

### 3. Escrituras
- `.monto-fifo`: `value="${f.monto ? formatearNumeroEditable(f.monto) : ''}"` 3843 (string "1.234,56"; 0 → vacío).
- Al tildar FIFO: `.value = formatearNumeroEditable(facturasParaPago[i].monto)` 3853 (saldo numérico).
- Crédito: `.value = formatearNumeroEditable(sugerido)` 4232.
- `.campo-importe-sin`: `value="${esc(form.texto || '')}"` 3365 (lo tipeado, crudo).
- Limpiezas: 3590, 3751.

### 4. Formateadores
- `formatearImporte` 1623 (igual gastos), `importeHtml` 1698.
- `formatearImporteCentavosSuaves` 1634: null/''→ "$ 0,00" (con span), NaN → "NaN,undefined".
- `formatearNumeroEditable(n)` 1654: `Number(n).toLocaleString(2/2)` → **null → "0,00", undefined → "NaN", '' → "0,00"**, NaN → "NaN".
- `parseImporte` 1643: **acá sí** rechaza `null`/`''` (a diferencia de gastos/caja, número 0 → 0).
- `formatearImporteEnVivo` 1662 (igual gastos).

### 5. Almacenamiento local
Ninguno.

---

## modulos/cobranzas.html

### 1. Inputs
| id / selector | línea | type / inputmode | clase |
|---|---|---|---|
| `cob-efectivo` | 1324 | text / decimal | IMP |
| `[data-importe]` (plantilla tarjeta cheque) | 4026 | text / decimal | IMP |
| `[data-r1]` banda CMC-7 renglón 1 | 3990 | text / numeric | ID |
| `[data-r2]` renglón 2 (n° cheque + DV) | 3996 | text / numeric | ID |
| `[data-r3]` renglón 3 (cuenta + DV) | 4001 | text / numeric | ID |
| `[data-tit-cuit]` (plantilla titulares) | 4047 | text / numeric, maxlength 13 | ID (CUIT) |
| `cob-filtro-cheque` | 1251 | search / numeric | ID (búsqueda n° cheque) |
| `cob-referencia` | 1330 | text | ID/texto (comprobante_referencia) |

**No usa `formatearImporteEnVivo`**: los campos quedan como se tipean.

### 2. Lecturas
- `parseImporteCobranza(crudo)` 1536 (parser propio, el más estricto del proyecto).
  - `ch.importe`: 3887 (render tarjeta), 4077 (`chequeParaBase` → payload), 4110 (comparación con `ocr_propuesto` para `origen_datos`), 4300 (total del formulario).
  - efectivo: `efectivoDelFormulario()` 4308 (vacío → **0**, ilegible → **0**); validación 4329-4331 (ilegible → motivo "El efectivo no se entiende").
- Renglones: `aplicarRenglones` 3701 → `.replace(/\D/g,'')` y reparte en strings; DV con `Number(d[i])` 3708-3714. Titulares CUIT → `.replace(/\D/g,'')` 4079.
- `numeroDeResumen(v)` 2046 para lo que devuelve `resumen_cobranzas` (null/''→null).
- `Number()` sobre datos de base: 1708, 2114-2115, 2303 (`Math.round(Number(ch.importe)*100)`), 2909-2910, 3157.

### 3. Escrituras
- `cob-efectivo.value = f.efectivo` 3738 (string del borrador, tal cual).
- `[data-importe]`: `value="${escCob(ch.importe)}"` 4026 (string del borrador).
- Desde OCR: `ch.importe = p.importe != null ? String(p.importe) : ''` 3673 → **"387300.5"** (número JS a string, punto decimal).
- Desde base (edición): `ch.importe = ch.importe != null ? String(ch.importe) : ''` 3375; `efectivo: Number(c.efectivo ?? 0) > 0 ? String(c.efectivo) : ''` 3357 → **"387300.5"**, punto decimal.
  - Hoy es seguro porque `parseImporteCobranza` trata "N.d" y "N.dd" (1-2 dígitos tras un único punto) como decimal. **Se rompería si el parser dejara de aceptar punto decimal**, o con un valor de 3 decimales (no ocurre: 2 decimales en base).
- Renglones: `renglonComoImpreso(partes, dv)` 3691 → "285-386-3218 6" (texto).
- Listeners: `ch[prop] = inp.value` (conectarTexto) 4199; `estado.form[prop] = el.value` 4692 (efectivo, crudo).

### 4. Formateadores
- `formatearImporte(n)` 1596: `Number(n)` + `Number.isFinite` → **null → "$ 0,00"** (pendiente conocido), `''` → "$ 0,00", undefined/NaN/texto → "—". Negativo → "-$ 3,00". Moneda ARS fija (currency).
- `numeroDeResumen` 2046: null/undefined/'' → null.

### 5. Almacenamiento local — **IndexedDB `cobranzas-offline` v1**
- Stores: `borradores` (clave = id de la cobranza) y `cache` (solo `'bancos'`, 1821/1825).
- Se guarda el objeto `estado.form` ENTERO con `dbGuardar(STORE_BORRADORES, f.id, f)` (`guardarBorrador` 3298-3303; también 4552, 4570 del sincronizador).
- Forma (`formularioVacio` 3258 / `chequeVacio` 3274):
  - `efectivo: ''` → **string tal cual se tipeó** ("12.500,50", "12500", "12500.5"…), o `String(numero)` ("387300.5") si vino de la base.
  - cada cheque `importe: ''` → **string tipeado**, o `String(p.importe)` del OCR / `String(ch.importe)` de la base (punto decimal).
  - `r1/r2/r3`: string tal cual; `banco_codigo`, `numero`, `cuenta`… strings con ceros; `dv_*` números.
  - `titulares[].cuit`: string tipeado.
- Restaurar: `abrirFormularioLocal` 3322 → `estado.form = f` (sin transformar) → `pintarFormulario` 3733 escribe `f.efectivo` y `ch.importe` directo en los inputs. El número recién se calcula al leer (`parseImporteCobranza`) — no se re-parsea ningún texto formateado por la app.
- Sincronizador 4532: arma el payload con `efectivoDelFormulario()` y `chequeParaBase()` (números).

---

## modulos/materia-prima.html

### 1. Inputs
| id / data-campo | línea | type / inputmode | clase |
|---|---|---|---|
| `campo-total-factura` | 2741 | text / decimal | IMP |
| `.campo-reintento-total` (plantilla detalle circuito) | 8258 | text / decimal | IMP |
| `[data-campo="numeroPapel"]` | 6402 | text / decimal | CANT (entero si interpretación = 'bultos'; si no, decimal salvo unidad `un`) |
| `[data-linea-campo="bultos"]` (mixtas) | 6517 | text / decimal | CANT entera (`enteros:true`) |
| `[data-linea-campo="contenido"]` (mixtas) | 6520 | text / decimal | CANT (decimal salvo `un`) |
| `[data-campo="contenido"]` | 6559 / 6561 | text / decimal | CANT (decimal salvo `un`) |
| `[data-campo="bultosPapel"]` | 6569 | text / decimal | CANT entera |
| `[data-campo="recibido"]` | 6710 | text / decimal | CANT (entera si modo bultos y no `recibidoEnUnidades`) |
| `[data-rec="bultos"]` (recepción transferencias) | 8688 | text / numeric | CANT entera |
| `[data-rec="base"]` (recepción) | 8698 | text / decimal | CANT (decimal salvo `un`) |
| `campo-numero-doc` | 2611 | text | ID (n° comprobante) |
| `[data-campo="lote"]` | 6789 | text (sin type) | ID (lote) |

`formatearImporteEnVivo`: `campo-total-factura` 9156; `.campo-reintento-total` al primer focusin 9175-9177.

### 2. Lecturas
- Cantidades: `parsearCantidad(el.value, {unidad, enteros: campoEsEntero(item,campo)})` 7164 (los 4 campos del ítem); líneas mixtas 7092 (`enteros: campo==='bultos'`); recepción bultos 8764 (`enteros:true`), base 8775 (`unidad`).
- Del OCR: `numeroDesdeOcr()` 5682-5683 (bultos/contenido), 5778/5780/5786 (cantidad_total).
- Importe: `campoTotal` input → `estado.wizard.totalFactura = campoTotal.value` 9158 (string crudo); `parseImporte(textoTotalFactura(w))` 7832 (payload `registrar_factura_de_ingreso`) y 8092 (validación); reintento `parseImporte(input.value)` 8271.
- `w.importeOcr` 4637: se acepta solo si `typeof datos.importe_total === 'number'` y finito.
- Recepción: `baseDesdeBultos` 8480 (`Number(bultos)+Number(fraccion)` × `Number(contenido)`), 8744-8746.
- `Number()` sobre base: 3708, 4081, 4085, 4247, 4250, 4276-4277, 8587, 8645-8646, 8661.

### 3. Escrituras
- Cantidades: `value="${esc(textoParaInput(x))}"` 6403, 6518, 6521, 6560, 6562, 6570, 6711, 8689, 8699 → `String(n).replace('.', ',')` ("1500,5", sin miles; null → '').
- Total factura: `campo-total-factura.value = textoTotalFactura(w)` 8077 = lo tipeado, o `textoImporteInput(w.importeOcr)` ("1.234,5").
- Reintento: `value="${esc(textoImporteInput(c.importe_ocr))}"` 8258 (`importe_ocr` es texto de `ocr_crudo`; `Number("1.234,50")` → NaN → '' = campo vacío, seguro).

### 4. Formateadores
- `formatearCantidad(n, unidad)` 3112 y `formatearNumero(n)` 3120: `Number(n ?? 0)` → **null/undefined/'' → "0"** / "0 kg"; NaN → "NaN".
- `formatearImporteDuplicado(v)` 4903: null/''→null.
- `textoImporteInput(n)` 8019: null/''/no finito → `''`; resto `toLocaleString` máx 2 decimales ("1.234,5").
- `textoParaInput(n)` 3390: null/undefined → ''; resto `String(n).replace('.', ',')` (pensado para números JS; con un string "2.000.000" daría "2,000.000").
- `importeConMoneda` ~8026.
- `formatearImporteEnVivo` 7999 (igual gastos).

### 5. Almacenamiento local
Ninguno (el wizard vive en `estado.wizard`, en memoria).

---

## modulos/stock.html

### 1. Inputs
| id | línea | type / inputmode | clase |
|---|---|---|---|
| `campo-tolerancia` | 2337 | text / decimal | porcentaje 0-100 (decimal) |
| `rec-contenido` | 2549 | text / decimal | CANT (contenido por bulto, decimal) |
| `mov-contenido` | 2741 | text / decimal | CANT (decimal) |
| `mov-cantidad` | 2766 | text / decimal | CANT (con signo en ajuste; entera si unidad `un`) |
| `ti-cantidad` | 2882 | text / decimal | CANT (entera si `un`) |
| `.rec-input[data-cantidad]` (plantilla recuento) | 4198 | text / decimal | CANT (entera si `un`) |
| `rec-lote` | 2530 | text | ID (lote) |
| `mov-lote` | 2726 | text | ID (lote) |

### 2. Lecturas
- `parsearCantidad(crudo, {unidad})` 4295 (conteo), 4541 (`rec-contenido`), 5879 (`mov-contenido`), 5917 y 5988 (`mov-cantidad`, `permitirNegativos` en ajuste), 7375 (`ti-cantidad`), 6572 (tolerancia, `permitirNegativos:true` y rango 0-100 aparte).
- `parsearTolerancia(crudo)` 6766 (import de Excel): `Number(texto.replace(',', '.'))`.
- `Number()` sobre base: 3175-3180, 3705-3725, 3818, 3826, 3873, 3892, 4062, 4069, 4071, 4103, 4500, 4527, 4662, 4747, 4996-4997, 5015, 5081, 5867, 5906, 6181, 7344, 7369, 7601, 7609.

### 3. Escrituras
- Recuento: `value="${esc(textoParaInput(i.cantidad_contada))}"` 4200 (coma, sin miles).
- **Tolerancia: `campo-tolerancia.value = i?.tolerancia_merma_pct ?? ''` 6496 → número crudo con PUNTO** ("0.5"). Funciona porque `parsearCantidad` acepta un punto como decimal; es inconsistente con el resto (se muestra con punto).
- Limpiezas: 4443, 4528, 4635, 5474, 5476, 5774, 5865, 7187.

### 4. Formateadores
- `formatearCantidadStock(n, unidad)` 3070: `Number(n ?? 0)` máx 3 decimales → **null/undefined/'' → "0 kg"**; NaN → "NaN kg".
- `textoParaInput(n)` 3140 (igual materia-prima).
- `equivalenteEnBultos` / `cabezaBultos` / `textoBultos` (~3175+): no inventariados en detalle (CLAUDE.md documenta que rechazan null antes de convertir).

### 5. Almacenamiento local
Ninguno.

---

## modulos/empleados.html
- Inputs numéricos: ninguno de cantidad/importe. ID: `edit-telefono` 836, `edit-contacto-telefono` 858 (text, sin inputmode). CUIL no es editable en formulario.
- Formateador: `formatearCuil` 580 (11 dígitos → "20-12345678-9"; si no, devuelve crudo o '—').
- Almacenamiento local: ninguno.

## modulos/accesos.html
- Sin inputs numéricos. `formatearCuil` 1070 (igual empleados). Almacenamiento local: ninguno.

## registro.html
- ID: `cuil` 45 (text; leído 284 como `cuilCrudo`), `telefono` 130 (type=tel; `.value.trim()` 382). Sin importes ni cantidades. Sin almacenamiento de números.

## dashboard.html
- ID: `mfa-codigo` 256 (text / numeric, one-time-code; leído 696 `.value.trim()`). `mfa-secreto` 250 (readonly). Sin importes ni cantidades.

---

# RESUMEN

## Conteo por archivo (inputs)
| archivo | IMP | CANT | ID |
|---|---|---|---|
| gastos.html | 5 (importe, edit-importe, edit-factura-importe, interés monto, interés tasa*) | 2 (kilometraje ×2, dudoso) | 4 |
| caja.html | 3 | 0 | 3 |
| cuentas-corrientes.html | 4 | 0 | 2 |
| cobranzas.html | 2 (efectivo, importe cheque) | 0 | 6 (r1, r2, r3, CUIT titular, filtro cheque, referencia) |
| materia-prima.html | 2 (total factura, reintento) | 8 | 2 |
| stock.html | 0 | 6 (incl. tolerancia %) | 2 |
| empleados.html | 0 | 0 | 2 |
| accesos.html | 0 | 0 | 0 |
| registro.html | 0 | 0 | 2 |
| dashboard.html | 0 | 0 | 1 |
| js/utils.js | — | — | — |
\* tasa es un porcentaje, pero usa el parser y el formateo en vivo de importes.

## Helpers de parseo (resultados ejecutados con node)
| entrada | `parseImporte` gastos/caja | `parseImporte` CC/MP | `parseImporteCobranza` | `parsearCantidad` MP/stock (kg) | ídem (un) | `numeroDesdeOcr` |
|---|---|---|---|---|---|---|
| "1.500" | 1500 | 1500 | 1500 | **1.5** | null | 1.5 |
| "1,5" | 1.5 | 1.5 | 1.5 | 1.5 | null | null |
| "387300.50" | **38730050** | **38730050** | 387300.5 | 387300.5 | null | 387300.5 |
| "2.000.000" | 2000000 | 2000000 | 2000000 | null | null | null |
| "387.300,50" | 387300.5 | 387300.5 | 387300.5 | null | null | null |
| "1250.5" | **12505** | **12505** | 1250.5 | 1250.5 | null | 1250.5 |
| "8 5" | **8** | **8** | null | null | null | null |
| "-3" | -3 | -3 | null | null (stock con negativos: -3) | null | -3 |
| "" / null | null | null | null | null | null | null |
| número 0 | **null** (`!str`) | 0 | 0 | 0 | 0 | 0 |
| número 1500.5 | **15005** | **15005** | 1500.5 | 1500.5 | null | 1500.5 |

Semántica:
- **`parseImporte`** (gastos 2344, caja 1941, CC 1643, MP 7991): borra TODOS los puntos, cambia la primera coma por punto, `parseFloat`. Asume formato es-AR estricto. `parseFloat` corta en el primer no-número ("8 5" → 8, "12abc" → 12). Gastos/caja devuelven null para el número 0 (`if (!str)`).
- **`parseImporteCobranza`** (cobranzas 1536): coma = decimal y puntos = miles (validados de a 3); sin coma, un solo punto con 3 dígitos detrás = miles, con 1-2 = decimal; varios puntos = miles; rechaza espacios internos, negativos, >2 decimales y más de una coma.
- **`parsearCantidad`** (MP 3371, stock 3104): un único separador, siempre decimal ("1.500" = 1,5); con unidad entera (`un`…) o `enteros:true` solo dígitos. Stock admite `-` con `permitirNegativos`.
- **`numeroDesdeOcr`** (MP 3347): `Number()` puro; ''/null → null.
- **`parsearTolerancia`** (stock 6766): `Number(texto.replace(',', '.'))` + rango 0-100.
- `importeDeOcr` (gastos 4941): `Number()` puro, exige > 0.

## Riesgos concretos
1. **`parseImporte` sobre un punto decimal multiplica por 100/10**: "387300.50" → 38.730.050, "1250.5" → 12.505. Hoy lo tapa `formatearImporteEnVivo`, que borra los puntos al tipear y re-formatea (el usuario VE "38.730.050"), pero es visible, no bloqueado. Afecta a todo importe de gastos, caja, CC y el total de materia-prima. Pegar un número copiado de otro lado con punto decimal es el caso real.
2. **`parseImporte` con `parseFloat` acepta basura final**: "8 5" → 8, "1.000abc" → 1000. Enmascarado por el formateo en vivo (borra no-dígitos), pero el parser por sí solo no es estricto.
3. **Gastos/caja `parseImporte(0)` → null y `parseImporte(1500.5)` → 15005** si alguna vez recibe un número en vez del texto del input. Hoy todas las llamadas le pasan `.value` o texto es-AR (CC 4228 parsea texto de `formatearImporte`: OK).
4. **Tres parsers de importe con reglas distintas**: "1250.5" da 12505 en gastos/caja/CC/MP y 1250.5 en cobranzas; "1.500" da 1500 en importes y 1,5 en cantidades. Unificar importes sin revisar cobranzas cambia qué acepta el formulario offline.
5. **Cobranzas guarda en IndexedDB strings mixtos**: lo tipeado ("12.500,50") y, para datos del OCR y de la base, `String(n)` con punto decimal ("387300.5"). Solo funciona porque `parseImporteCobranza` acepta un punto con 1-2 decimales como decimal. Cambiar ese parser a "punto = siempre miles" rompería borradores existentes y ediciones (387300.5 → 3873005).
6. **Kilometraje `type="number"`** (gastos 1984, 5719): en un teclado es-AR, "85.000" km puede entrar como 85 (el punto como decimal) y la coma se descarta. Lectura `Number(v)`. Dudoso, no es plata, pero sí el bug documentado de `type="number"`.
7. **Formateadores que convierten ausencia en cero**: `formatearImporte` de cobranzas (null → "$ 0,00"), `formatearImporteCentavosSuaves` de caja y CC (null/'' → "$ 0,00"), `formatearNumeroEditable` (null → "0,00", undefined → "NaN"), `formatearCantidad`/`formatearNumero` de MP y `formatearCantidadStock` (null → "0"). Los de gastos/caja/CC `formatearImporte` sí dan "—" con null, pero "$ 0,00" con '' y "$ NaN" con texto.
8. **Plantillas de edición de gastos** escriben `Number(g.importe/f.importe).toLocaleString()` sin guard de null → "0,00" (latente: la de factura solo abre en `pendiente`).
9. **CC "precio por unidad"** (`.campo-importe-sin`, modo 'unidad') pasa por `formatearImporteEnVivo`, que corta a 2 decimales: un precio unitario de 3+ decimales ($/kg) se trunca en silencio antes de multiplicar.
10. **Stock `campo-tolerancia`** se precarga con el número crudo con punto (6496), a diferencia del resto que usa `textoParaInput` con coma. Funciona hoy (un punto = decimal en `parsearCantidad`); es una inconsistencia.
11. **`formatearImporte("1.500")`** (string es-AR) da "$ 1,50": ningún formateador acepta texto es-AR; si alguno recibe el texto de un input en vez del número, muestra 1000 veces menos.
