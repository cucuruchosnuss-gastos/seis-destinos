# Traspaso — Circuito inverso, burbujas de pendientes y carga sin empaque (24/09/2026)

Para el chat de arquitectura y para Facu. El detalle por módulo está en
`2026-09-24-materia-prima.md` y `2026-09-24-produccion.md`; este archivo junta
la tanda entera.

Tag de seguridad: `antes-de-circuito-inverso-2026-09-24` (sobre `fb3be49`).
Commits: `1b77df2` (Parte 1), `e8b8834` (Parte 2), `a26da57` (Parte 3) y el de doc.
**Cero SQL corrido**: Supabase en solo lectura. Ninguna RPC cambió de firma, ninguna tarea nueva.

## Lo que la base tiene que arreglar (no se tocó desde acá)

1. **`crear_ingreso_desde_comprobante` falla SIEMPRE.** Inserta
   `tipo_doc = coalesce(tipo_documento,'factura')` sin traducir; los valores reales son
   `'Factura A'`, `'Factura C'`, `'Factura X'`, `'Otro'` o null, y el CHECK
   `materia_prima_ingresos_tipo_doc_check` solo admite `remito` / `factura_a` / `factura_x` /
   `sin_comprobante`. Hay que mapear (`'Factura A'`→`factura_a`, `'Factura X'`→`factura_x`) y
   **decidir** qué va con `'Factura C'`, `'Otro'` y null (el CHECK no tiene `factura_c`: ¿se
   agrega, o van a `factura_a`/`factura_x`?). Esto es decisión de Facu. Mientras tanto
   "Cargar lo que entró" muestra: *"No se pudo crear el ingreso: la base rechazó el tipo de
   comprobante. Avisale a administración."*
2. **El mismo papel aparece dos veces en `facturas_sin_ingreso()`**: el gasto de un proveedor con
   cuenta corriente y su factura espejo (`origen_gasto_id`). 5 pares sobre 36 filas. La RPC solo
   mira su propia columna, así que se pueden cargar las dos → mercadería contada dos veces. La
   pantalla avisa (no bloquea). Arreglo: que la función excluya el espejo y la RPC rechace si la
   gemela ya tiene ingreso.
3. **`facturas_sin_ingreso()` no filtra por `fecha_inicio_circuito_stock()`**: por eso los 36 viejos.
4. **`mis_pendientes()` — pendientes que se ven adentro y no cuenta**: las facturas por ingresar
   (`facturas_sin_ingreso()`, en Ingreso → "Facturas por ingresar"); las planillas
   `pendiente_completar` de Producción (tablero de la tablet: "N planillas quedaron pendientes de
   completar"); las facturas sin proveedor de Cuentas Corrientes (lista "Facturas sin proveedor
   asignado"); el recuento abierto de Stock ("En curso").
5. **`mis_pendientes()` — diferencias con lo que la pantalla puede resolver** (hoy hay 0 solicitudes
   de caja pendientes, así que no afecta a nadie todavía):
   - una solicitud Empresa↔persona cuenta en `solicitudes_mi_caja` Y en `solicitudes_empresa` (la
     tarjeta la suma doble), y en mi caja aunque la persona no pueda responderla
     (`responder_solicitud_movimiento_caja` exige super_admin cuando hay Empresa);
   - `solicitudes_empresa` usa `tiene_tarea('caja','ver_empresa')` (con bypass): un super_admin sin la
     tarea otorgada ve el número y no tiene el atajo a la Empresa. Lo alineado: `tiene_tarea_explicita`
     y exigir super_admin;
   - excluir `creado_por = yo` no coincide con que un super_admin puede aceptar su propia solicitud con Empresa;
   - `insumos_por_revisar` cuenta también insumos inactivos; Stock solo los activos (sumar `and activo`);
   - `transferencias_por_aceptar` sale con `recibir_transferencia` pero "En tránsito" de Stock pide `stock:ver`.
6. **Producción**: no hay RPC para corregir la caja/embolsado de un sublote ya cargado
   (`corregir_produccion_item` solo cambia cajas). Un renglón cargado "sin empaque descontado" se
   corrige hoy con una baja de Stock a mano. Y `agregar_produccion_item` no descuenta empaque.

## Decisiones tomadas sin preguntar

- **Ingreso**: el modo nuevo del wizard "completar ingreso existente" (no hay pantalla de edición de
  ingresos); si falla el insert de los renglones NO se borra la cabecera; los gastos que ya están en
  "Pagado sin ingresar" se sacan de "Facturas por ingresar"; aviso de gemelas sin bloquear;
  "Faltan los renglones" para el ingreso vacío que dejó quien abandonó; sin burbuja aparte para
  "Pagado sin ingresar" (su título ya cuenta lo mismo que la RPC).
- **Pendientes**: el número adentro de cada módulo es siempre el de `mis_pendientes()`; las claves
  que caen en la tarjeta de un módulo pero se resuelven en otro se muestran en los dos, con link
  (transferencias: Stock → Ingreso; insumos por revisar: Ingreso → Stock). `stock.html?vista=catalogo`
  nuevo. En Caja, las solicitudes que se pueden responder van arriba y la sección se abre sola.
  **No se tocó `dashboard.html`**: ya sumaba las claves; se agregó el test que lo exige.
- **Producción**: criterio de la marca bordó = sin caja, con embolsado y no anulado (los renglones
  anteriores al empaque no se marcan); el aviso manda a corregir el stock a mano porque no hay RPC.
  Arreglados de paso: la planilla sin nombres de caja y la sala sin `define_chocolate`.

## Pruebas (todas verdes al cerrar)

- `check-scripts.js`: OK. Las **68 suites** `test-*.js` y `controles-*.js` en verde (corridas juntas con `TZ=UTC`).
- Nuevas: materia-prima-por-ingresar 130/130 (mut 51/51), materia-prima-pendientes 38/38 (19/19 +1 eq.),
  caja-pendientes 92/92 (45/45), stock-pendientes 66/66 (28/28), produccion-sin-empaque 118/118 (51/51).
- Tocadas y re-corridas con mutaciones: dashboard-pendientes 69/69 (23/23), materia-prima circuito
  117/117 (33/33), xss 167/167 (124/124); caja xss 171/171 (59/59), números 379/379 (24/24); stock xss
  234/234 (189/189 +4 eq.), controles-stock 991/991; produccion empaque 247/247 (146/146), cierre 250
  (157/157), historial 122 (104/104), controles-produccion 1541/1541. Mutaciones de a un runner por vez.

## Lo que NO se pudo probar

Nada en un navegador con sesión ni contra la base real: todo contra un doble. El camino feliz de
"Cargar lo que entró" no se puede probar hasta que se arregle el hallazgo 1.

## Guion para Facu

1. **Ingreso** (con `materia_prima:cargar`): tiene que aparecer "Facturas por ingresar (36)" o parecido.
   Entrar: el aviso de no cargar lo ya contado arriba; las tarjetas con proveedor, fecha, número,
   importe y unidad; algunas con el aviso de papel repetido.
2. Tocar "Cargar lo que entró": **hoy tiene que salir** el mensaje de que la base rechazó el tipo de
   comprobante (hallazgo 1). Cuando la base esté arreglada: se abre con la foto arriba y los renglones
   propuestos por el OCR; confirmar; la factura sale de la lista y el ingreso aparece con sus renglones.
   Repetir con otra y salir sin cargar: el ingreso aparece con "Faltan los renglones".
3. **Caja**: crear una solicitud desde otra cuenta hacia vos y otra hacia la Empresa. La tarjeta del
   dashboard dice 2; adentro, 1 en "Mi caja" y 1 en el atajo "Empresa", y al entrar a cada ficha la
   solicitud está arriba con la sección abierta.
4. **Stock**: con una transferencia pendiente, la burbuja en "En tránsito" y la línea que manda a
   Ingreso; en Ingreso, la burbuja en "Ingresos internos". Probar `stock.html?vista=catalogo`.
5. **Producción**: con un cono propuesto, la burbuja en Configuración / Menú, que abre en "Marcas / Conos".
   Para el renglón sin empaque no hay forma fácil de provocar la falla de lectura: mirar que la
   planilla y el historial de un renglón normal no aparezcan en bordó.
6. Mirar todo en el celular a 375–390 px (las burbujas dentro de botones y títulos).
