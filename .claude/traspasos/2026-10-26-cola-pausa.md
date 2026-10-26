# Pausa de la cola — 26/10/2026 (Facu apaga la compu)

Sesión que arrancó con el pedido de **producto terminado desde el Ingreso de materia prima** y siguió con la **COLA DE TAREAS** (1 iPhone, 2 Rosario, 3 Mandar a otra empresa, 4 Hoja nueva). El resumen único de la cola **todavía no se mandó**: va cuando terminen las cuatro.

## Terminado e integrado en main

| Tarea | Rama (hash) | Main después de integrar | GitHub en main |
|---|---|---|---|
| Producto terminado desde el Ingreso de MP (pedido `.claude/pedidos/2026-10-26-ingreso-terminado-desde-mp.md`) | `ci-prueba/ingreso-terminado-desde-mp` (`2b3b62c`) | `8c42d68` (respaldo `respaldo/antes-de-ingreso-terminado-desde-mp` = `d737a74`) | Pruebas ✓, Navegador ✓, Pages ✓ |
| 1 · Imprimir en el iPhone + PDF original y duplicado (pedido `.claude/pedidos/2026-10-26-imprimir-iphone.md`) | `ci-prueba/imprimir-iphone` (`afd972e` + `12eeeae`, commit vacío para volver a correr el Navegador de la rama: la 1.ª vez la mitad 1 se colgó instalando WebKit en GitHub) | `b11b0cd` (respaldo `respaldo/antes-de-imprimir-iphone` = `8c42d68`) | Pruebas ✓, Pages ✓, Salud ✓, Navegador: ver al final |

Traspasos de cada una: `.claude/traspasos/2026-10-26-ingreso-terminado-desde-mp.md` y `.claude/traspasos/2026-10-26-imprimir-iphone.md`.

## En la que iba: 2 · Rosario (`ci-prueba/orden-sin-stock-rosario`)

- Hecha y probada: commit `b688e9c` (la Carga en una fábrica sin control de stock: lotes escritos a mano, "+ Agregar lote", "Va sin lote"; `test-/mut-retiros-sin-control` 57 / 32 de 32, `e2e/67` a 390 y 1280, `npm run pruebas` en verde salvo las anclas, que se arreglaron después: `mut-retiros-lotes` 82/82 y `mut-retiros-devoluciones` 68/68). GitHub de la rama en `b688e9c`: Pruebas ✓, Navegador ✓.
- El 1.er ensayo contra main `b11b0cd` **chocó en `docs/memoria/retiros.md`** (las dos ramas agregaron su sección al final). Se trajo main a la rama quedándose con las dos secciones: commit `80a0a4e`, pusheado. Las suites de Retiros con todo junto dieron verde.
- El 2.º ensayo **se cortó a propósito** por la pausa (su carpeta de descarte se borró). **NO se integró.**
- **Lo que falta, en orden:**
  1. `npm run ensayo -- ci-prueba/orden-sin-stock-rosario` contra el main de ese momento.
  2. GitHub (Pruebas + Navegador) en verde sobre el último commit de la rama (este archivo lo cambia: hay que esperar esa corrida).
  3. `respaldo/antes-de-orden-sin-stock-rosario` en el main de ese momento, pusheado y confirmado con `git ls-remote`.
  4. `git merge --no-ff`, `npm run pruebas`, push, GitHub (Pruebas, Navegador, Pages) en verde en main.
- Traspaso propio: `.claude/traspasos/2026-10-26-orden-sin-stock-rosario.md`.

## Lo que sigue (sin arrancar, sin rama)

### 3 · `ci-prueba/mandar-a-otra-empresa` (desde el main que quede después de Rosario)
Verificado en la base el 26/10/2026 (`pg_get_functiondef`): `_orden_grupo_espejar(p_orden_id)` mete en la empresa de `clientes.unidad_grupo_id` los `'traspaso_entrada'` de producto terminado (misma presentación por nombre, cono, media caja y unidades) y los `'transferencia_entrada'` de insumos, **con los mismos lotes**; `registrar_orden_retiro` lo llama si el cliente tiene `unidad_grupo_id`. Clientes de grupo hoy: en Nuss **DOLCE PASTA SRL** (`dc26e600…` → Dolce Pasta) y en Dolce **PAZ, MIRTA** (`010f816d…` → Cucuruchos Nuss). Transferencia pendiente: `38265780…` Nuss → Dolce del 26/10 (tiene que poder aceptarse: eso vive en Ingreso → Ingresos internos y no se toca).
Diseño pensado (no aplicado):
- **Stock** (`modulos/stock.html`): tercer botón `#btn-entrada-grupo` "Mandar a otra empresa del grupo" en `#stock-eleccion` (a lo ancho), y `#btn-mandar-grupo` en lugar de `#btn-enviar-transferencia` ("Enviar a otra unidad"; el modal de transferencia queda en el código, solo se saca el botón y su listener). Visibles con `retiros:cargar` en la fábrica de la barra (`puedeTareaEn`; con "Todas", en alguna de la barra). Al tocar: leer `clientes` de esas fábricas con `unidad_grupo_id` no nulo (+ nombres de `unidades_negocio`); con uno → `retiros.html?cliente=<id>`; con varios → panel `#stock-grupo` para elegir; sin ninguno → se dice. Recalcular al cambiar la barra.
- **Carga** (`modulos/retiros.html`): en `init`, `?cliente=<id>` → leer el cliente (`unidad_negocio_id`), si es de una fábrica donde se carga: empresa = esa, orden nueva, `elegirCliente(id)`; sacar el parámetro de la URL; si hay una orden a medio cargar, NO pisarla (seguirla y avisar). El aviso de arriba (`textoEntreEmpresas`) pasa a decir "Va al stock de <empresa> con los mismos lotes" (hay que actualizar las pruebas de la orden entre empresas que esperan el texto viejo).
- **Pruebas**: suites test-/mut- de Stock (entrada, el botón, el panel) y de la Carga (`?cliente`), maqueta, e2e a 390 y 1280; **`e2e/25-cantidades.spec.js` usa `#btn-enviar-transferencia`**: ese caso se saca (el botón ya no existe). Docs: `docs/memoria/stock.md` y `retiros.md`.

### 4 · `ci-prueba/hoja-orden-nueva` (después de la 3; reemplaza a cualquier "hoja-insumos-prolija")
El pedido completo está en el chat del 26/10/2026 (columnas CANT. | PRODUCTO | DESCRIPCIÓN | TOTAL | LOTE, la fila TOTAL, P. UNIT. e IMPORTE con precios, casos de prueba incluidas N-0031 y N-0032). **Copiarlo a `.claude/pedidos/` al arrancar.** Verificado el 26/10/2026 con `information_schema`: `insumos.nombre_bulto` existe (`text`, nullable, sin default).

## Qué automatizaría ahora

- **Reintentar solo el Navegador de GitHub cuando se cuelga la instalación** (hoy hubo que pushear un commit vacío porque no hay `gh` ni token): un `timeout-minutes` propio en el paso `playwright install` (5 min) con un reintento, en `.github/workflows/navegador.yml`.
- **El ensayo debería resolver solo los choques de "las dos agregaron su sección al final" en `docs/memoria/*.md`** (quedarse con los dos lados), que es lo que pasó con Rosario y es la regla de siempre.
