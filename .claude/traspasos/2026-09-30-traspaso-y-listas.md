# Tanda "Traspaso entre fábricas y listas de precios" (30/09/2026)

Tag de antes: `antes-de-traspaso-listas-2026-09-30`. Tres partes, cada una hecha por un subagente en su propia carpeta e integrada por cherry-pick. Cero SQL corrido: la base ya estaba (verificada con `pg_get_functiondef`, `pg_constraint` y `pg_policy` el 30/09/2026).

| Parte | Commit en main | Suites |
|---|---|---|
| Administración → Valorizar con `precio_venta()` | `2c33f2a` (+ doc `bcfbef2`) | `test-administracion-ordenes` 157/157, mut 77/77 (+31 eq.) |
| Gestión de Producción → etiqueta "Reventa · X" y "Traspasos entre fábricas" | `2ffa388` (+ doc `9fe70a9`) | `test-produccion-reventa` 47/47, mut 36/36 (+6 eq.) |
| Stock → "Traspaso a otra fábrica" | `071a7ce` (+ doc `551fec5`) | `test-stock-traspaso` 171/171, mut 86/86 (+33 eq.) |
| Arreglo: el botón "Cambiar a Sala de masa" no entraba en la barra de la planta | `a72eb60` | Navegador venía en rojo desde `536c802` (anterior a esta tanda) |

Suite completa: 174/174. Detalle de cada parte en sus traspasos: `2026-09-30-valorizar-precio-venta.md`, `2026-09-30-reventa-stock-terminado.md`, `2026-09-30-traspaso-fabricas.md`.

## Lo que Facu tiene que decidir
1. **No hay "lista interna".** `listas_precios` no tiene una columna que la marque. La pantalla de traspaso toma como interna una lista ACTIVA del origen cuyo nombre diga "interna". Hoy no hay ninguna, así que el precio por caja se escribe a mano (vacío = sin deuda entre fábricas). Para que proponga solo: crear en Dolce Pasta una lista "Interna Nuss" (y al revés) con los precios entre fábricas, o pedir una columna `es_interna`.
2. **La planta ofrece los productos de reventa para PRODUCIR** (Conos dulces en Nuss, cucuruchones en Dolce Pasta). No se tocó. Esconderlos es una línea en `leerCatalogoProductos()`.
3. **La grilla de Listas de precios de Administración** (y "Aumentar todo" y el importador) trabaja por presentación: con las listas nuevas no muestra el conito y deja sin precio las presentaciones con cono. Valorizar ya está bien; la grilla no.

## Huecos de base (para el chat de arquitectura)
- `traspasar_producto_terminado` **no tiene clave de idempotencia**: un corte de red y un reintento pueden pasar la mercadería dos veces. Hace falta un `p_client_uuid` (como `registrar_orden_retiro`). Mientras, la pantalla, ante un error de conexión, manda a revisar el stock del destino antes de reintentar.
- `traspasar_producto_terminado` no valida stock (la pantalla avisa y deja).
- `valorizar_orden_retiro` sin un precio cae en `precio_vigente()` viejo, sin conito (hoy no pasa: la pantalla manda todos).
- `precio_venta` convierte un conito que falta en 0 ("sin conito" y "conito $ 0" no se distinguen).

## Lo no probado
Nada con sesión real ni contra la base: ninguna de las RPCs se ejecutó. Las tres pantallas se miraron en la maqueta a 390 y 1280 px.

## Guion para Facu
1. Stock → "Traspaso a otra fábrica": origen Dolce Pasta, destino Nuss, un Cono dulce 35 x4 con un lote, precio a mano, ver la vista previa ("Cucuruchos Nuss le va a deber $ X a Dolce Pasta") y confirmar.
2. Producción → gestión → Stock terminado de Nuss: el producto dice "Reventa · Dolce Pasta" y aparece en "Traspasos entre fábricas"; lo mismo del lado de Dolce Pasta como salida.
3. Retiros de Nuss: el Cono dulce aparece con el stock que se acaba de pasar.
4. Administración → una orden de un cliente con lista, con un renglón con cono → Valorizar: al lado del precio dice "lista X · $ … por unidad + conito $ …".

## Qué automatizaría ahora
- **`pruebas/integrar-parte.js <hash>`**: cherry-pick + buscar baselines con el hash viejo + `check-bytes` + `correr-todo` + push + esperar Actions (con la API) y mostrar las anotaciones si falla. Es exactamente lo que se hizo tres veces en esta tanda, a mano.
- **`pruebas/esperar.js`** (lo propuso el subagente de Stock): en Windows `setTimeout(0)` tarda ~15 ms por tick; con `setImmediate` su suite pasó de 6 s a 0,5 s. Un helper común, con el corte por `beforeExit` para que una suite colgada no cuente como verde.
- **Que Navegador en rojo se vea antes de la próxima tanda**: esta vez venía rojo desde el commit anterior y nadie lo miró. `cerrar-tanda` ya pide Actions en verde; sumar al arranque de `reglas-de-tanda` "mirar el estado de Actions de HEAD antes del tag".
