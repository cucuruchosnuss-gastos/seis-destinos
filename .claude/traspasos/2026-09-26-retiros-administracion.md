# Traspaso — Órdenes de retiro (la carga) y Administración (26/09/2026)

Tag de antes: `antes-de-administracion-2026-09-26` (en origin). Paso 0: no había trabajo de retiros a medias (árbol limpio, ninguna rama ni carpeta de `traspasos-pendientes` con retiros).

## Qué se hizo

| Parte | Commit | Actions |
|---|---|---|
| La CARGA en el depósito (`modulos/retiros.html`), la hoja (`js/retiros-comun.js`), Accesos (grupo Órdenes de retiro) y la tarjeta del dashboard | `b03cd8e` | Pruebas ✓ · Navegador ✓ ([36239362897](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/runs/36239362897)) |
| Administración: portada, Órdenes (valorizar, corregir, anular, imprimir/enviar con precios) y su tarjeta | `e8c0905` | ✓ ([36239960550](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/runs/36239960550)) |
| Administración: Clientes (saldos, cuenta, ficha, saldo inicial, ajuste, alta) | `ab577fc` | ✓ ([36240429255](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/runs/36240429255)) |
| Administración: Listas de precios | `85d1ab4` | ✓ ([36240854169](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/runs/36240854169)) |
| Playwright: carga + valorización en la fábrica de pruebas (se saltea sin la cuenta) | `bc4a7f3` | ✓ ([36240992301](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/runs/36240992301)) |
| La maqueta (`e2e/maqueta`) y la skill `mirar-en-maqueta` | `32958c6` | ✓ (con el siguiente) |
| `e2e/5-maqueta.spec.js`: la revisión visual en la maqueta, en cada push | `eeb3309` | ✓ ([36241401964](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/runs/36241401964)) |
| Trabajo 1 (del subagente de Producción, integrado por cherry-pick): la gestión con el diseño nuevo, y el stock terminado con lo que salió por retiros | `e211129`, `486ac1e` | ver el commit de cierre |
| CLAUDE.md y los traspasos | commit de cierre | ver abajo |

El detalle de cada pantalla está en CLAUDE.md (Arquitectura: la hoja; Base: Órdenes de retiro y Administración; Módulos 12 y 13; Permisos; Dashboard).

## Trabajo 1 — la gestión de Producción

Lo hizo el subagente de Producción en una copia aparte; su traspaso completo es `.claude/traspasos/2026-09-26-produccion-gestion-diseno.md` (decisiones, guion y huecos). Al integrarlo se auditaron las 13 suites de Producción que modificó: **ninguna se aflojó** — donde bajó la cantidad de assertions o mutaciones es porque el control ya no existe (dos botones "Configuración" que abrían en Marcas pasaron a ser un solo renglón que ES Marcas), y cada control retirado figura en `RETIRADOS` con su motivo. Su baseline apuntaba a `4005c90` (un commit de su rama que no existe en GitHub) y se reescribió a `e211129`. En `main`: 111/111 suites, y sus mutaciones nuevas 102/102 y 31/31, gestión 94/94.

## Decisiones tomadas (y por qué)

- **Una sola hoja para las dos pantallas** (`js/retiros-comun.js`, quinta excepción a la regla de duplicar): el pedido decía "con la misma hoja", y copiada serían dos hojas que divergen. Sin precios salvo `conPrecios: true` estricto.
- **Varias empresas preguntan SIEMPRE al empezar una orden**, con la última usada primera y marcada (un toque). Con una, no pregunta. Así se cumplen a la vez "varias preguntan primero" y "se recuerda la última", sin arriesgar que el camión se cargue en la empresa equivocada por un recuerdo silencioso.
- **Los lotes para "Elegir lote" se leen de `stock_terminado_movimientos`**, que solo lee Producción o `stock:ver`. Sin eso la pantalla NO consulta (las filas no llegarían y diría "no hay") y dice que descuenta de los más viejos. El depósito (Emanuel, Franco, Manuel, Mauricio) hoy no tiene ninguna tarea de retiros ni de stock: para elegir lote necesitan `stock:ver` o que la base exponga los lotes (ver huecos).
- **La fecha del retiro es HOY** (no se ofrece elegirla en la carga): `p_fecha = hoyArgentina()`.
- **El borrador de la orden (con su uuid) se guarda en el celular**: si se bloquea o se recarga con el camión a medio cargar, sigue donde estaba y un reintento no duplica.
- **Valorizar trae los precios de la lista en el cliente** (la misma regla que `precio_vigente`, que no es ejecutable por `authenticated`) y **manda el precio de CADA renglón**: la base valoriza exactamente lo que está en pantalla.
- **El aviso de límite de crédito avisa y no bloquea** (la mercadería ya se fue). Se calcula antes (saldo − lo ya valorizado + el total nuevo) y después con lo que devuelve la base.
- **El código en la cuenta corriente**: `cuenta_cliente` devuelve "Orden de retiro N° 12"; la pantalla lo reemplaza por el código leyendo `ordenes_retiro` por id.
- **El alta de clientes** solo se ofrece con `pedidos:configurar` (lo que pide `guardar_cliente`); con solo `retiros:precios` se dice por qué no está.
- **Una mutación de Listas se sacó por equivalente**: "borrar el campo no saca lo pendiente" deja un `null` que `preciosAGuardar` y el resaltado ya ignoran.
- **`test-dashboard-pedidos.js` dejó de exigir que Pedidos sea la ÚLTIMA tarjeta** (ahora vienen Órdenes de retiro y Administración); sigue exigiendo que vaya después de Producción. Es la única prueba preexistente que se aflojó, y es por posición, no por comportamiento.
- **`pruebas/mutar.js`** (y los dos runners de Cobranzas) reemplazan con una función: con un string, `$'` / `$$` se expandían. Las cinco mutaciones viejas afectadas (Caja, Cuentas Corrientes, Ingreso) se volvieron a correr: se siguen detectando, ahora por lo que dicen medir.

## Pendientes de BASE (para el chat de arquitectura; nada se tocó: Supabase en solo lectura)

1. **Módulo Administración con permisos por sección** (pedido de Facu): una fila `administracion` en `modulos` y tareas propias por sección (por ejemplo `administracion:ordenes`, `:clientes`, `:precios`, y las de las secciones que se muden: cheques, cuentas corrientes, cobranzas). Hoy las secciones usan `retiros:ver` / `retiros:precios` / `retiros:anular`. Cuando existan: agregarlas al CHECK leyendo el real, a `CATALOGO_TAREAS`, y cambiar el `permiso` de cada entrada de `SECCIONES` en `administracion.html` y la tarjeta del dashboard.
2. **Los lotes para la carga**: una RPC (por ejemplo `lotes_para_retiro(p_unidad, p_presentacion, p_marca)`) que devuelva los lotes con stock a quien tiene `retiros:cargar`, o sumar `retiros:cargar` a la policy de `stock_terminado_movimientos`. Hoy el depósito no puede elegir lote.
3. **Los lotes en el detalle de Administración**: lo mismo con `retiros:ver` (hoy solo con Producción o `stock:ver`).
4. **`mis_ordenes_retiro` sin `cliente_id`**: la hoja busca el cliente por nombre (único por empresa, así que funciona, pero es frágil si alguien renombra).
5. **`cuenta_cliente` y `anular_orden_retiro` nombran el NÚMERO** ("Orden de retiro N° 12"): deberían usar el código.
6. **El alta de clientes pide `pedidos:configurar`**: que `guardar_cliente` acepte también `retiros:precios`, o una RPC de alta de Administración.
7. **`limpiar_fabrica_de_pruebas()` no limpia órdenes de retiro, clientes, listas ni `cliente_movimientos`** de la unidad de pruebas.
8. **Datos de las empresas para la hoja** (`razon_social`, `cuit`, `domicilio`, `telefono` están en null en las cinco): no hay RPC ni pantalla para cargarlos.
9. **`mis_pendientes()` no devuelve nada de retiros**: una clave "órdenes sin valorizar" pondría la burbuja en la tarjeta de Administración (la portada ya lo cuenta).
10. **Para Playwright**: una cuenta del robot con `retiros:cargar/ver/precios/anular` en "Pruebas (robot)" y su email en el secreto `E2E_RETIROS_EMAIL`, un cliente activo en esa unidad y un producto con presentación. Hasta entonces `e2e/4-retiros.spec.js` se saltea.
11. **Permisos del depósito**: otorgar `retiros:cargar` (y el módulo `retiros`) a Emanuel Romero, Franco, Manuel Romero y Mauricio Silva en su empresa. (Al 26/09/2026 ninguno tiene tareas de retiros; "Manuel Romero" y "Mauricio Silva" no aparecieron con esos nombres en `empleados`.)

## Lo que NO se probó

- **Nada con sesión real ni contra la base**: ninguna RPC de retiros se ejecutó (el conector estaba en solo lectura y hay cero órdenes, clientes y listas). Todo corre contra un doble.
- **La impresión real** (el diálogo de imprimir de Chrome/Safari, AirPrint, Mopria, guardar como PDF): se midió la hoja renderizada en pantalla en Chromium, no impresa.
- **El PDF real** con jsPDF + html2canvas (las librerías de cdnjs no se bajaron en las pruebas; se probó con dobles) ni `navigator.share` con archivos en un celular real.
- Se miró renderizado en una **maqueta con Supabase falso**, a 375, 1024 y 1280 px.

## Guion para Facu

1. En Accesos, darle a tu usuario el módulo **Órdenes de retiro** y las cuatro tareas en una empresa (por ejemplo Cucuruchos Nuss). En el dashboard tienen que aparecer **Órdenes de retiro** y **Administración**.
2. En **Administración → Clientes**, si tenés `pedidos:configurar`: "+ Cliente nuevo", poné un nombre y guardá: se abre la ficha. Completá razón social, CUIT, mail y una lista de precios; guardá. (Si no tenés ese permiso, la pantalla dice por qué no está el alta.)
3. En **Administración → Listas de precios**: "+ Lista nueva", y en la grilla poné precio a un par de productos. Guardar pide confirmar; confirmá. Probá "Aumentar todo un 10%": tiene que mostrar los precios nuevos sin guardar hasta que confirmes.
4. Abrí **Órdenes de retiro** desde el celular: si tenés una sola empresa no pregunta nada. Elegí el cliente, un producto y 2 cajas, "Revisar la orden": **no tiene que aparecer ningún $**. Confirmá: ves el código grande (N-0001).
5. Tocá **Imprimir**: una hoja A4 con dos copias y la línea de corte, el logo de la empresa y "Documento interno. No válido como factura." **Sin precios.** Probá **Enviar** (en el celular se abre compartir con el PDF; en la compu se descarga y se abre el mail).
6. En **Administración → Órdenes**, la orden aparece "sin valorizar" en bordó. Abrila → **Valorizar**: trae los precios de la lista; cambiá uno y mirá el total. Valorizá. Imprimila desde acá: **ahora con precios**.
7. En **Clientes**, el cliente muestra su saldo y, en su cuenta, "Orden de retiro N-0001". Poné un límite de crédito menor al saldo en la ficha: aparece en bordó "Pasa su límite".
8. **Anulá** la orden con un motivo: vuelve el stock y la cuenta queda en cero.

## Qué automatizaría ahora

**La tarea repetida más cara de esta tanda fue armar a mano una maqueta** (un sitio con Supabase falso y datos) para mirar cada pantalla sin sesión: se hizo cinco veces en el scratchpad. **Ya quedó automatizada** en `e2e/maqueta/` (`npm run maqueta`, `?maqueta=<datos>`, skill `mirar-en-maqueta`) y **corre sola en cada push**: `e2e/5-maqueta.spec.js` abre Retiros y Administración a 390 y 1280 px, recorre sus vistas, falla si hay scroll horizontal o un error de JavaScript y guarda las capturas como artefacto, sin credenciales.

**Lo próximo a automatizar**: sumar a la maqueta los datos de los demás módulos (Pedidos, Cheques, la gestión de Producción) — cada uno es un JSON y una entrada de `PANTALLAS` —, y que la hoja de impresión se mida sola en ese mismo recorrido (hoy se midió a mano: 123 mm por copia).
