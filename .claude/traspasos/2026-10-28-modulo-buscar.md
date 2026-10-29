# Traspaso 28/10/2026 — Módulo Buscar (lote de una caja y precios de compra)

Rama `ci-prueba/modulo-buscar`, desde `origin/main` `133555d`. Pedido: `.claude/pedidos/2026-10-28-modulo-buscar.md`. Detalle técnico: `docs/memoria/buscar.md`. **Integrada** en `main` `706d5ca` (respaldo `respaldo/antes-de-modulo-buscar` = `133555d`), con el candado `integrando/modulo-buscar`.

## Lo hecho
- **`modulos/buscar.html`**, tarjeta "Buscar" en el menú (sin fila en la tabla `modulos`; se ve con produccion:ver, stock:ver, stock:ver_costos o retiros:precios), ícono de lupa en la barra lateral, color propio (óxido oscuro, `estilo-visual.md`) y su tarjeta en el tablero ("Acceso rápido", sin cifras).
- **Lote**: "6262-1" (o "6262" = todo el turno) → `trazabilidad_lote()` con la fábrica de la barra (con Todas, todas donde puede ver). Tarjetas en el orden pedido: turno (con operarios desde/hasta, las cuatro horas, el inicio tarde con su motivo, scrap y observaciones), lo producido (con totales), masas (tipo común/chocolate · simple/doble, masero y por insumo kg, lote y de qué ingreso vino, o "sin ingreso encontrado"; los de 0 kg no salen), paradas (con lo que duró) y hacia adelante (stock que queda y salidas con el total). "Imprimir / PDF" sale en A4 con solo el resultado (un turno completo ocupa 2 hojas). Sin resultados y el error de la base, como pidió.
- **Precios**: `precios_compra()` de la fábrica de la barra (con Todas, chips para elegir), buscador que filtra mientras se escribe por nombre y marca (sin acentos, cada palabra), sin IVA, IVA, final, por bulto con IVA y de dónde salió; tocando un insumo, su historial (compras de esa fábrica y cargados a mano).
- Suites `test-buscar-lote.js` (101; mut 53/53 +13 equivalentes) y `test-buscar-precios.js` (83; mut 42/42 +1), maqueta `buscar`, `e2e/96-buscar.spec.js` (390 y 1280).

## Decidido sin consultar
- **Las funciones de Precios son COPIA IGUAL de las de Stock** (la regla de duplicar helpers), no una excepción nueva en `js/`: `test-buscar-precios.js` compara el texto de las 13 con las de `stock.html` y da rojo si una se aparta. Así no se tocó `stock.html`.
- Precios también se ve con `retiros:precios` (lo deja `precios_compra`).
- Con "Todas" en la barra, Lote busca en todas las fábricas donde la persona puede ver (la base lo filtra) y cada resultado dice su fábrica; el mensaje sin resultados dice "en ninguna de tus fábricas".
- Un insumo de masa SIN dato de kg se muestra (con "—"); solo se esconden los de 0 kg.
- `?lote=6262-1` en la dirección busca derecho (para el buscador general que viene) y `?vista=precios` abre esa pestaña.
- El historial de Precios es solo para mirar (sin Anular: eso queda en Stock).
- La tarjeta va al final del tablero y de la barra lateral (no la metí en el orden del diseño). En las comparaciones con el diseño 2a y 3a va escondida, como Administración, porque esos diseños son de antes; el tablero del dueño pasó de 15 a 16 tarjetas en `5-maqueta` y `11-comparar-esqueleto`.
- `test-correr-rama.js`: `test-buscar-clientes.js` / `mut-buscar-clientes.js` (el buscador de clientes del 29/09/2026) empiezan con "test-buscar-" y ahora se confundían con esta pantalla: van como excepción con su motivo.

## No probado
- Contra la base real: `trazabilidad_lote` no se pudo llamar desde acá (pide un usuario logueado); se codificó contra su `pg_get_functiondef` del 28/10/2026 y se probó con la maqueta. Puede que un lote real traiga algo que la maqueta no tiene (por ejemplo, un insumo con un ingrediente libre sin nombre de insumo: sale el nombre del ingrediente).
- Imprimir en un iPhone real (el print va en el toque, igual que la Carga).

## Guion para Facu
1. Inicio → tarjeta **Buscar** (o la lupa de la barra).
2. Pestaña **Lote**: escribir el lote de una caja real (por ejemplo uno de esta semana, "62xx-1") → Buscar. Mirar que salgan el turno, las masas con los proveedores de cada insumo, las paradas y a qué clientes salió.
3. **Imprimir / PDF** → "Guardar como PDF": tiene que salir solo el lote, en hojas A4.
4. Pestaña **Precios**: escribir "hari" → aparece la harina con su precio; tocarla → su historial.

## Qué automatizaría ahora
- **Las pruebas de navegador corridas a mano apuntaban a OTRA maqueta**: `5-maqueta` y `11-comparar-esqueleto` leen `MAQUETA_URL` (no `E2E_PUERTO_MAQUETA`), y con el 4180 de otra carpeta abierto pasaron en verde mintiendo; el error recién lo vio GitHub. Un `npm run e2e:aca -- <specs>` que elija puertos libres y ponga las cuatro variables (como hace el ensayo) lo evitaría; o que los specs tomen `MAQUETA_URL` de `E2E_PUERTO_MAQUETA` cuando no está.
- **Un módulo nuevo toca siete lugares** (catálogo, ícono, color, cargador del tablero, la lista del sandbox del tablero, los conteos del dueño en dos specs, las excepciones de nombres de `test-correr-rama`). Un script `npm run modulo:nuevo -- <clave>` que arme el esqueleto (HTML con encabezado, datos de maqueta, suite y spec vacíos) y cambie esos lugares ahorraría la vuelta de rojo en GitHub.
- `npm run ensayo -- --limpiar` borra también carpetas de ensayo de OTRAS ramas (borró la de `sd-valorizar-division`, de una rama ya integrada): convendría que pregunte o que solo toque las de la carpeta actual.
