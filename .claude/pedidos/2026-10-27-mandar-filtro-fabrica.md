# Pedido 27/10/2026 — Mandar a otra empresa: solo la fábrica de la barra

Rama `ci-prueba/mandar-filtro-fabrica` desde `origin/main` `e698bc0`. No toca `produccion.html`: se integra apenas está en verde (ensayo, respaldo, merge --no-ff, pruebas, push, GitHub en verde).

**Problema (auditoría del 27/10):** en `modulos/stock.html`, `leerClientesGrupo(fabricas)` traería todos los clientes de grupo que deja ver RLS, de todas las fábricas y sin mirar activo. Con la barra en Nuss y permisos en Nuss y Dolce, "Mandar a otra empresa del grupo" ofrece "DOLCE PASTA SRL desde Nuss" y "PAZ, MIRTA desde Dolce", en vez de elegir solo Dolce.

**Arreglo:** filtrar `clientes.unidad_negocio_id` in (fábricas con `retiros:cargar` que correspondan a la barra: con una fábrica elegida, solo esa; con "Todas", las que tengan `retiros:cargar`) y `activo = true`. Con una sola opción, que quede elegida sola.

**Prueba:** test-/mut- que falle si vuelve a traer clientes de otra fábrica o inactivos. `npm run pruebas`, check-scripts y check-bytes en verde. Resumen corto con rama, hash y main.
