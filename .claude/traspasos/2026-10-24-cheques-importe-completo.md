# Traspaso — Cheques: al banco entra el importe completo (24/10/2026)

Rama `ci-prueba/cheques-importe-completo` (desde `origin/main` 4d29b9d). Tanda B, tarea 2. **No se integra**: la integra la sesión principal.

## Qué se hizo

La base cambió el 24/10/2026: al vender, depositar y acreditar cheques entra SIEMPRE el importe completo en la cuenta y ya no se carga el gasto de intereses. Los gastos o intereses del banco se cargan a mano en Gastos, en la categoría que antes se llamaba "Intereses-Venta de cheques" y ahora se llama "Gastos bancarios y comisiones" (mismo id).

- **Cartera de cheques (Administración):**
  - **Vender "Ya se acreditó":** se fueron los campos Acreditó / Descuento / Tasa (y su cálculo atado).
  - **«En el banco» → "Cargar lo acreditado":** se fueron el "Total acreditado", la "tasa" y el "Acreditó $" de cada cheque (y el reparto). Queda la fecha y la lista de los cheques.
  - **El resumen** (vender y depositar "Ya se acreditó", y acreditar) dice: "Entran $ X a <cuenta>. Los gastos o intereses del banco se cargan aparte en Gastos, categoría 'Gastos bancarios y comisiones'." Si se acreditan cheques de varias cuentas, un "Entran" por cuenta.
  - **El botón "Cargar el gasto del banco"** lleva a `gastos.html?nuevo=1&categoria=<id>&unidad=<fábrica de la cuenta>`. Antes de confirmar se abre en otra pestaña (así no se pierde lo que se está cargando); en el resultado de acreditar, en la misma.
  - **Lo que viaja a la base:** `vender_cheques` con `p_neto` = el importe completo (la firma no tiene default, la base lo ignora); `acreditar_cheques` con `p_items: [{cheque_id}]` (ya sin "acreditado").
  - Una venta nueva se lee "Vendido el dd/mm · <cuenta>" (sin "acreditó … ($ 0,00 de interés)"). Las ventas viejas con interés siguen igual, con su "Ver el gasto".
- **Gastos:**
  - El mapa de íconos usa 'Gastos bancarios y comisiones' → `landmark` (se fue el nombre viejo).
  - El filtro de categoría la ofrece sola (sale de las categorías activas de la base).
  - **Deep link nuevo (no existía ninguno para preelegir categoría):** `gastos.html?nuevo=1&categoria=<id o nombre>&unidad=<id>` abre el wizard con la categoría y la fábrica ya elegidas (`categoriaDeURL` + `abrirWizardConCategoria`, igual que "Cargar gasto" desde Ingreso). Lo que no coincide se ignora. `?gasto=` y `?factura=` mandan.
- **Pruebas:** `test-/mut-cheques-importe-completo.js` nuevas; `test-cheques-banco.js`, `mut-cheques-banco.js`, `test-cheques-vista.js`, `seguras-cheques.js`, `sandbox-cheques.js` y `test-modulos-esqueleto-parejo.js` (los controles que se fueron, declarados con su motivo) actualizadas; `e2e/61-cheques-importe-completo.spec.js` nuevo y `e2e/37-cheques-banco.spec.js` actualizado. Maqueta: `cheques-banco` responde como la base nueva; `gastos-bancarios` nueva.
- **Docs:** entradas con fecha en `docs/memoria/cheques.md` y `docs/memoria/gastos.md`.

## Lo que verifiqué en la base (24/10/2026, solo lectura)

- `pg_get_functiondef('_cheques_salida_banco')`: `p_neto := v_bruto; v_desc := 0;` (comentario "24/10/2026 (pedido de Facu)"), el ingreso es por el bruto y el bloque del gasto ya no corre (`v_desc > 0` nunca).
- `acreditar_cheques(p_items jsonb, p_fecha date)`: `v_acr := ch.importe` (lee solo `cheque_id`), el gasto solo si `v_desc > 0` (nunca). Todavía hace `select id into v_cat from categorias where nombre = 'Intereses-Venta de cheques'` (queda null y no se usa): inofensivo, lo anoto para el chat de la base.
- `vender_cheques(p_cheque_ids, p_cuenta_id, p_fecha, p_neto, p_detalle default null)` y `depositar_cheques(p_cheque_ids, p_cuenta_id, p_fecha)`: pasan a `_cheques_salida_banco`.
- La tabla es `categorias` (no `categorias_gasto`): `7041825a-5a0c-484b-be07-17f9978a0d97` · "Gastos bancarios y comisiones" · activa · `icon` = 'landmark'. Coincide con el pedido.

## Decidido sin consultar

1. **Depositar "Ya se acreditó" también muestra la frase y el botón** (el pedido nombra vender y acreditar; el banco también cobra comisiones por depósito). "Mandar al banco" sin acreditar no la muestra: ahí no se mueve plata.
2. **`p_neto` = el importe completo** (y no null): la firma no tiene default y es lo que de verdad entra. En acreditar se dejó de mandar "acreditado" (la base solo lee `cheque_id`).
3. **El botón manda el id de la categoría, no el nombre** (el nombre ya cambió una vez); Gastos acepta id o nombre. Suma la fábrica de la cuenta (`&unidad=`), vacía si se acreditan cuentas de fábricas distintas.
4. **Antes de confirmar, el botón abre Gastos en otra pestaña** (`target="_blank"`), para no perder el diálogo ni la elección; después de acreditar, en la misma.
5. **El deep link deja la categoría resaltada en su paso** (no se saltea el paso de la categoría), igual que "Cargar gasto" desde Ingreso: el wizard sigue foto → datos → fábrica → categoría.
6. El aviso al terminar una venta dice "Los gastos del banco se cargan aparte en Gastos." (el toast no tiene botón).

## Lo que no se pudo probar

- Nada con sesión real ni contra la base de verdad (solo maqueta y sandbox).
- En el celular instalado (PWA), cómo abre el `target="_blank"` (probablemente una pestaña del navegador fuera de la app; la sesión es la misma).
- El guion para Facu: Administración → Cheques → elegir un cheque → Mandar al banco → Vender → tildar "Ya se acreditó": ya no pide lo acreditado, el resumen dice "Entran $ X a …" y el botón "Cargar el gasto del banco" abre Gastos con "Gastos bancarios y comisiones" ya marcada en el paso de la categoría.

## Números

(se completan abajo)

## Qué automatizaría ahora

(se completa abajo)
