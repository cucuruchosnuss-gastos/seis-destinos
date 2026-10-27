# Traspaso 26/10/2026 — "Mandar a otra empresa del grupo" (rama `ci-prueba/mandar-a-otra-empresa`)

Pedido: `.claude/pedidos/2026-10-26-mandar-a-otra-empresa.md` (tarea 3 de la cola). Desde main `f751e10`.

## Qué quedó
- **Stock**: en la entrada, el tercer botón grande a lo ancho "Mandar a otra empresa del grupo" (`#btn-entrada-grupo`); en Insumos, `#btn-mandar-grupo` en el lugar de "Enviar a otra unidad". Visibles con `retiros:cargar` en la fábrica de la barra. Con una sola empresa del grupo como cliente va derecho a `retiros.html?cliente=<id>`; con varias, el panel "¿A qué empresa?"; sin ninguna, lo dice.
- **Carga**: `?cliente=<id>` abre una orden nueva en la fábrica de ese cliente y con él elegido; saca el parámetro de la dirección; una orden a medio cargar no se pisa (se sigue y se avisa). El aviso dice "Va al stock de <empresa> con los mismos lotes".
- Transferencias: solo se fue el botón de crear una nueva. El modal sigue en el código; "En tránsito", ver / aceptar / rechazar y el historial, igual. Ninguna tabla ni RPC tocada.

## Verificado en la base (solo lectura, 26/10/2026)
- `registrar_orden_retiro` llama a `_orden_grupo_espejar` (`pg_get_functiondef`).
- La policy "pedidos: leer clientes" deja leer `clientes` con `retiros:cargar` (`pg_policies`), y `unidades_negocio` se lee con cualquier usuario.
- La transferencia `38265780-833b-…` Nuss → Dolce del 26/10 sigue **pendiente**; se acepta en Ingreso → Ingresos internos (`materia-prima.html`), que esta rama no toca.

## Decidido sin consultar
- El tercer botón solo aparece en la ENTRADA (cuando la persona ve producto terminado e insumos); quien entra derecho a Insumos lo tiene en la barra de acciones en lugar de "Enviar a otra unidad". En la vista de solo producto terminado no hay botón.
- Un cliente cuyo `unidad_grupo_id` es su propia fábrica no cuenta como otra empresa.
- El aviso de la orden confirmada ("Entre empresas: lo que salió entra al stock de…") quedó como estaba: el pedido hablaba del aviso de arriba.
- De `e2e/25-cantidades.spec.js` se sacó el caso que abría el modal por "Enviar a otra unidad" (ya no hay botón); los de "Corregir stock" e Ingreso siguen.

## Pruebas
- `test-/mut-stock-mandar-grupo.js` 53 / 40 de 40; `test-/mut-retiros-mandar-grupo.js` 37 / 23 de 23; `mut-retiros-entre-empresas` 25 de 25 con el texto nuevo.
- Ajustadas: `test-stock-entrada`, `test-permisos-pantallas-stock`, `test-stock-xss`, `test-stock-ajustes-24-10`, `controles-stock`, `test-modulos-esqueleto-parejo`, `test-retiros-entre-empresas`, `e2e/62`, `e2e/25`.
- Maqueta `stock-mandar-grupo`; `e2e/68-mandar-a-otra-empresa.spec.js` a 390 y 1280 (más 62, 39, 25 y 53: 34 en verde).

## No se pudo probar
- Con la base real: una orden de verdad a Dolce Pasta desde este botón (no se escribe en la base desde acá).

## Qué automatizaría ahora
- **Un juego de maqueta que sirva a dos pantallas sale a mano** (acá, Stock + la Carga, mezclando dos módulos de datos): un helper `combinar(base, otro, { tablasDe })` en `pruebas/datos-maqueta/comun.js` para los recorridos que cruzan módulos.
