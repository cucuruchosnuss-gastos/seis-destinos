# "¿De dónde salen?" ANTES de confirmar una orden de retiro (20/10/2026)

Rama `ci-prueba/faltante-antes-de-confirmar` (desde `origin/main` ed25b0b). Archivos: `modulos/retiros.html` y `js/faltante-retiro.js`. La descripción entera está en `docs/memoria/retiros.md` (la entrada del 20/10/2026).

## Qué hace

- Un renglón de producto terminado que pide más cajas de las que hay pregunta "Hay X, faltan Y. ¿De dónde salen?" en el mismo renglón, antes de confirmar. Sin contestar no se puede agregar el renglón ni confirmar.
- Fábrica: una planilla abierta; sin ninguna, "Se produjo antes y no está cargado" con nota obligatoria.
- De afuera: "Vienen de <origen habitual>" u "Otro origen" (otra fábrica o un proveedor).
- Sin origen conocido: las dos cosas.
- Al confirmar: planilla → `faltante_en_produccion`; afuera → `ingresar_producto_terminado` (lote `<PREFIJO>-ddmm`, uuid estable por renglón) y `faltante_a_lote`.
- Si algo falla, la orden ya está confirmada: el error tal cual, "Volver a intentar" con el mismo uuid, y el renglón queda en el cartel (que dice "Cerrar").

## Quién tiene cada permiso (leído de la base el 20/10/2026)

Para cargar el ingreso de lo que vino de afuera hace falta `materia_prima:cargar` o `stock:ajustar_inventario` en la empresa (lo exige `ingresar_producto_terminado`):

| Persona | retiros:cargar | materia_prima:cargar | stock:ajustar_inventario | ¿Carga el ingreso? |
|---|---|---|---|---|
| Godoy Yanina | sí | no | no | **No**: queda pendiente con "Viene de X, falta cargar el ingreso" |
| Mauricio Alejandro Silva | sí | sí | sí | Sí |
| Romero Caballero Manuel Enrique | sí | sí | sí | Sí |
| Romero Carlos Emanuel | sí | sí | sí | Sí |
| Usabarrena Franco | sí | sí | sí | Sí |
| Facundo y Pablo Usabarrena | super_admin | — | — | Sí |

(Faltaría confirmar contra la base el ALCANCE por empresa de cada uno: la pantalla lo mira con la misma regla de `tiene_tarea_alcance`.)

## Decisiones tomadas sin consultar

1. **La nota de "Se produjo antes" y la de "falta cargar el ingreso" van a las OBSERVACIONES de la orden** ("Renglón 1 (Cucurucho grande · Caja x 100): …"), debajo de lo que se escribió. Es el único lugar donde Administración la ve, porque `registrar_orden_retiro` no recibe una nota por renglón. **Consecuencia: sale impresa en la hoja de la orden** (la hoja imprime las observaciones). Si molesta, hace falta un hueco de base: una nota por renglón (`p_items[].nota` que vaya a `revision_motivo`) o una RPC para anotar el faltante pendiente. **CERRADO el 21/10/2026 (rama `ci-prueba/faltante-nota-renglon`):** la base creó `anotar_faltante_retiro(p_item_id, p_nota)` y la nota va al renglón; las observaciones de la orden ya no la llevan.
2. Un producto que se hace en la fábrica NO ofrece "Otro origen" (el pedido decía solo planillas o "se produjo antes"). Con origen null sí.
3. "Agregar" (cerrar el renglón) también pide la respuesta, no solo "Confirmar".
4. Si los lotes del producto no se pudieron leer, no se pregunta (no se sabe si falta): queda el cartel de siempre al confirmar.
5. En un reintento de la orden (la base no dice qué faltó), la respuesta se aplica al leer la orden con `mis_ordenes_retiro`, por el número de renglón, con el mismo uuid de ingreso.
6. El texto del botón de la planilla es "Máquina 1 · Tarde · lote 6249" (`textoPlanillaBoton`), sin "turno".

## Huecos de base

- No hay dónde guardar la nota de un faltante pendiente (ver la decisión 1).
- `ingresar_producto_terminado` + `faltante_a_lote` son dos llamadas: si la segunda falla, el ingreso ya entró. El reintento manda el mismo `p_client_uuid`, así que no se duplica (verificar que la base devuelva lo mismo con la misma clave; se asumió por el diseño de la tanda).

## Lo que no se pudo probar

- Nada con sesión real ni contra la base (todo con un doble y la maqueta).
- La hoja impresa con la nota en las observaciones (no se miró).

## Qué automatizaría ahora

Las pruebas de navegador de Retiros arman los datos con `maqueta.cambios` leyendo `/maqueta/datos/retiros.json` y reemplazando tablas a mano en cada spec (`e2e/34` y `e2e/50` repiten el mismo `abrirCarga`). Un helper en `e2e/ayuda.js` (`abrirConCambios(page, maqueta, { tablas: f => …, rpc })`) sacaría ese código repetido de cada spec nuevo.
