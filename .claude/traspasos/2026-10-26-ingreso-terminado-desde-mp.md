# Traspaso — Producto terminado desde el Ingreso de materia prima (26/10/2026)

Pedido: `.claude/pedidos/2026-10-26-ingreso-terminado-desde-mp.md`.
Rama: `ci-prueba/ingreso-terminado-desde-mp` (desde `origin/main` `d737a74`). Hash de la rama y de main: al final.
Supabase: solo lectura (SELECT de verificación). Ninguna escritura.

## Qué se hizo (en castellano simple)

En **Ingreso → Cargar ingreso**, en el paso **Ítems**, ahora se puede cargar **producto terminado** (como las 44 cajas de Capelina Grande que trae Rodrigo Arrascaeta):

- Si el proveedor elegido trae productos terminados a esa fábrica, aparece la sección **"Producto terminado"** con "RODRIGO ARRASCAETA también trae producto terminado. Tocá el que vino: ＋ Capelina Grande".
- También se encuentran **buscando** ("capelina" en el buscador de un renglón) o si **el papel** dice el nombre del producto: salen marcados **"Producto terminado"**, y al elegir uno el renglón deja de ser un insumo.
- El renglón es igual al de Producción: presentación (si hay una sola, ya viene elegida), cajas, **"Último lote: 310476. ¿Sigue siendo este?"** con **Sí** / **No, es otro** (si es otro se escribe, en mayúsculas, hasta 40 letras) y el **remito** (si el comprobante es un remito, propone su número).
- Se graba con la misma función de la base que usa Producción (`ingresar_producto_terminado`), que deja el lote como vigente para la próxima vez.
- Si hay insumos **y** producto terminado, se graban **por separado**: primero el producto terminado y después los insumos. La confirmación y el resultado muestran **las dos partes** ("Ingreso cargado: 1 insumo y 44 cajas de producto terminado." y un cartel arriba del listado con el detalle de cada parte).
- El "INGRESO DE PRODUCTO TERMINADO" de la gestión de Producción **no se tocó**: las dos entradas quedan y graban igual.

## Qué se verificó contra la base (26/10/2026)

- `pg_get_functiondef(ingresar_producto_terminado)`: firma `(p_unidad_negocio_id, p_fecha, p_proveedor_id, p_unidad_origen_id, p_remito, p_items, p_observaciones, p_client_uuid)`; pide `materia_prima:cargar` O `stock:ajustar_inventario` en la fábrica (`tiene_tarea_alcance`); un `p_client_uuid` repetido devuelve `{ingreso_id, reintento: true}`; guarda el lote como vigente salvo 'SIN LOTE'; de un proveedor **no genera deuda** en ningún lado; no exige que el proveedor esté activo.
- Datos: en **Cucuruchos Nuss**, "Capelina Grande" (`9a842997…`) con `origen_tipo = 'proveedor'`, `origen_proveedor_id` = RODRIGO ARRASCAETA (`1d2832ec…`), una presentación "Caja" activa y lote vigente **310476**. En Dolce Pasta hay otra "Capelina Grande" sin proveedor.
- `pg_policies`: `productos_terminados` / `producto_presentaciones` / `marcas_personalizadas` se leen con producción, `stock:ver`, pedidos o retiros; `producto_lote_vigente`, cualquiera. Las 4 personas con `materia_prima:cargar` tienen `stock:ver` (ver "Para el chat de la base").

## Archivos

- **`js/ingreso-terminado.js` (nuevo, decimosexta excepción)**: la lógica de la gestión **letra por letra** (`faltaIngreso`, `modoLoteIngreso`, `loteDeRenglon`, `parametrosIngreso`, `itemsParaBase`, `origenParaBase`, `presentacionDe`, `normalizarLoteIngreso`, `textoListoIngreso`, `ORIGENES_INGRESO`, `TAREAS_INGRESO`, `LARGO_MAXIMO_LOTE`) + `leerCatalogoIngresoTerminado(sb, unidadId)`. Lo importa Ingreso.
- `modulos/materia-prima.html`: el bloque "PRODUCTO TERMINADO EN EL INGRESO" (oferta, buscador, papel, renglón, lote, remito, validación, grabar, resumen, cartel), los enganches en `wizardVacio`, `htmlSugerenciasCatalogo`, `htmlItemAbierto`, `cablearItems`, `entrarAPasoItems`, `continuarDesdeItems`, `renderizarConfirmacion`, `confirmarIngreso`, `volverAtrasWizard`, `abrirWizard`, el HTML (`#wz-terminados`, `#wz-detalle-terminados`, `#mp-resumen-guardado`) y el CSS. La fila "Proveedor" de la confirmación muestra el del padrón si no se escribió razón social.
- Pruebas: `test-materia-prima-terminado.js` (nueva, 108) + `mut-materia-prima-terminado.js` (nueva, **64/64** —46 en Ingreso y 18 en `js/ingreso-terminado.js`— +30 equivalentes: los escapes, que mata `mut-materia-prima-xss.js`, **155/155**); `test-permisos-pantallas-ingreso.js` (suma `mostrarResumenGuardado` si la copia lo tiene); `test-ingreso-terminado-comun.js` (nueva, 36: las dos copias iguales y las dos entradas en pie); `test-materia-prima-xss.js` (lo nuevo con marcas, y su lista de seguras) + `mut-materia-prima-xss.js` (las 6 funciones nuevas); `test-materia-prima-barra-unidad.js` y `test-materia-prima-fabrica-pruebas.js` (suman `mostrarResumenGuardado`, que ahora llama `abrirWizard`).
- Maqueta: `pruebas/datos-maqueta/ingreso-terminado-mp.js` + su `.json`; `e2e/maqueta/supabase-falso.js` acepta `insert` / `delete` (los anota en la consola; antes un insert rompía la maqueta).
- `e2e/65-ingreso-terminado-desde-mp.spec.js`: 390, 360, 1000×540 y 1280 — "Sí" (solo producto terminado, el error de la base tal cual, el reintento con el mismo uuid, ningún insert) y "No, es otro" buscando "capelina" junto con un insumo (el orden de las grabaciones y las dos partes).
- Docs: `docs/memoria/materia-prima.md` (ítem nuevo al final), `docs/memoria/produccion.md` (aviso: la copia de la gestión tiene que quedar igual a `js/ingreso-terminado.js`), `docs/memoria/arquitectura.md` (decimosexta excepción).

## Decidido sin consultar

1. **La gestión NO importa el archivo compartido** (conserva su copia). El pedido decía no tocarla; además `pruebas/mutar-produccion.js` no sabe derivar mutaciones a `js/` (abortaría). En cambio, `test-ingreso-terminado-comun.js` da rojo si las dos copias dejan de ser iguales letra por letra. Pasar la gestión a importar el archivo es el paso siguiente natural (ver "Qué automatizaría ahora").
2. **Primero el producto terminado, después los insumos.** Es lo único que se puede reintentar sin duplicar (`p_client_uuid`); los insumos, si fallan, se borran enteros como siempre. Si fallan los insumos, el producto terminado queda grabado, se avisa, y el reintento no lo manda de nuevo.
3. **Solo producto terminado = no se crea ingreso de materia prima** (sería un ingreso sin ítems). Consecuencias, avisadas en la confirmación: no pasa a Cuentas corrientes ni a Gastos (igual que cargado desde Producción) y la foto del comprobante no se guarda. Si vino desde un gasto ("Pagado sin ingresar"), ese gasto sigue esperando su ingreso.
4. **Sin precio por caja**: el pedido no lo pidió (en la gestión es opcional y de un proveedor no genera deuda).
5. **El proveedor tiene que ser uno del padrón** (la base pide su id): con un proveedor nuevo que se da de alta al confirmar, la sección pide volver a "Datos" y elegirlo del buscador.
6. **Al completar un ingreso existente** (el que crea Gastos desde una factura) no se ofrece producto terminado: esa cabecera es de insumos y ya está en el circuito.
7. **El papel propone un producto terminado solo si nombra el producto entero** ("CAPELINA GRANDE X 44"): con medio nombre no, para no proponer de más.
8. **El número del papel pasa a cajas** si es entero (se ve y se puede corregir).
9. **El cartel de lo guardado** aparece solo cuando hubo producto terminado; sin él, todo como antes ("Ingreso cargado.").

## Para el chat de la base

- Con **solo** `materia_prima:cargar` (sin `stock:ver`, producción, pedidos ni retiros) la lectura de `productos_terminados` / `producto_presentaciones` vuelve vacía sin error y no se ofrece ningún producto terminado, aunque la RPC sí lo dejaría grabar. Hoy no afecta a nadie (las 4 personas con `materia_prima:cargar` tienen `stock:ver`). Si se quiere que alcance con `materia_prima:cargar`, hay que sumarlo a esas dos policies de SELECT.

## Lo que no se pudo probar

- Contra la base real: todo se probó con la maqueta y con las funciones reales ejecutadas en las suites (la base es solo lectura para Claude Code). La primera carga real de Rodrigo conviene mirarla en el Stock terminado de Cucuruchos Nuss (debería sumar 44 cajas con el lote elegido).
- El camino con foto y lectura del comprobante (OCR) con un renglón "CAPELINA GRANDE": cubierto por la suite (`terminadosParecidos`), no en el navegador.

## Guion para Facu

1. Ingreso → **Cargar ingreso** → sacale foto al remito de Rodrigo (o "Sin comprobante").
2. En Datos, elegí a **RODRIGO ARRASCAETA** y la fábrica **Cucuruchos Nuss** → Continuar.
3. En Ítems, abajo dice "RODRIGO ARRASCAETA también trae producto terminado": tocá **＋ Capelina Grande** (o, si la foto trajo el renglón, tocá "Capelina Grande — Producto terminado" en "¿Es alguno de estos?").
4. Poné **44** en Cajas. Si el lote es el de la vez pasada (310476), tocá **Sí**; si no, **No, es otro** y escribilo.
5. Continuar → Confirmar. Tiene que decir "Ingreso cargado: 44 cajas de producto terminado." y en Producción → Stock terminado aparecen las 44 cajas.

## Qué automatizaría ahora

- **Pasar la gestión de Producción a importar `js/ingreso-terminado.js`** y borrar su copia: falta que `pruebas/mutar-produccion.js` derive a `js/` las mutaciones que no encuentra en los dos HTML (como ya hace `mutar.js` con `planificarMutaciones`). Son ~20 líneas en el runner; después la comparación letra por letra deja de hacer falta.
- **El recorrido del wizard de Ingreso en la maqueta** (abrir, sin comprobante, fecha, fábrica, proveedor del buscador, Continuar) lo escribí a mano en el e2e; un helper `e2e/pasos-ingreso.js` lo dejaría listo para las próximas pruebas de Ingreso.
