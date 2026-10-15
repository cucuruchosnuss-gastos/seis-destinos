# Pedido del 14/10/2026 — Conos de papel: "+ Cono nuevo" también al anotar para pedir (rama `ci-prueba/conos-anotar-nuevo`)

No toca `produccion.html`: se integra cuando Facu autorice. Si la sesión se compacta, se retoma desde este archivo.

## El pedido (tal cual llegó)

Problema: en `modulos/conos.html`, el buscador de "Anotar para pedir" (input que pinta `#cn-anotar-resultados`, ~línea 2143) llama `htmlResultados(..., 'data-anotar-cono', null)`: nunca ofrece crear un cono que no existe. En "Agregar cono" a un pliego (~línea 1464) sí lo ofrece. Facu escribió "LE CREMME", no estaba y no pudo seguir.

1. En "Anotar para pedir", misma regla que en Agregar: si el texto tiene 2+ letras y no hay un cono con ese nombre exacto (sin importar mayúsculas/acentos/espacios), mostrar al final de la lista el botón "+ Cono nuevo: «TEXTO»". Si no hay ningún resultado, que ese botón sea lo único que se ve (no la lista vacía).
2. Al tocarlo: `rpc proponer_marca(p_nombre)` (ya existe; devuelve `{marca_id, ya_existia}`; si quien la crea configura producción queda aprobada, si no "nuevo, a revisar"). Con el `marca_id` que devuelve, dejar ese cono ELEGIDO en el formulario de anotar (no en el de agregar al pliego) y refrescar el catálogo. Hoy `proponerCono()` está atado al flujo de Agregar: generalizarlo para que sepa a qué formulario volver.
3. Revisar si hay otro buscador de conos en esta pantalla sin esta opción y aplicarle lo mismo.
4. Errores de la base tal cual (ej. "Ese cono está marcado como rechazado…").

Pruebas: unitaria de la regla de 1) (exacto vs. parecido); e2e a 1280, 390, 360 y tablet: escribir un nombre inexistente en Anotar → aparece el botón → se crea → queda elegido → se anota; mutaciones.

## Verificado en la base (14/10, solo lectura)

- `proponer_marca(p_nombre text)` → jsonb `{marca_id, ya_existia}`. Permiso: `produccion:cargar` o `produccion:configurar` o `conos:pedir` (sin alcance); si no, "No tenés permiso.". Nombre = `upper(btrim(p_nombre))`, 1 a 80 letras. Busca por `nombre =` exacto en MAYÚSCULAS (NO normaliza acentos ni espacios internos): si existe y está `rechazada` → "Ese cono está marcado como rechazado. Hablalo con quien configura producción."; si existe → `ya_existia: true`. Si no, la crea `activa = true` y `estado_alta` = `aprobada` (con `produccion:configurar`) o `pendiente_revision`.
- "LE CREMME" hoy YA existe en `marcas_personalizadas` (aprobada, activa): alguien la cargó después.

## Avance

- 14/10: prueba sola primero (`ae36926`: `test-conos-anotar-nuevo.js` y `e2e/46` en rojo), después el arreglo en la misma rama.
- Hecho: en Anotar para pedir aparece "+ Cono nuevo: «TEXTO»" con la misma regla que en Agregar (ahora una sola función, `conoNuevoOfrecido`, que busca el exacto en TODOS los conos); al tocarlo, `proponer_marca` y el cono queda elegido en Anotar (con el papel sugerido); errores de la base tal cual en el formulario de donde salió.
- Decidido: a la base viaja el texto sin bordes y con los espacios del medio colapsados; el botón solo a quien `proponer_marca` deja (conos:pedir, produccion:configurar o produccion:cargar); Stock, "¿En qué pliego está…?" y Todos los conos no llevan el botón (filtran, no eligen).
- Pruebas: suite 46/46, mutaciones 28/28, e2e 46 (7/7) y 32/42 en verde en la maqueta.
- **14/10/2026, ~23:45 (Argentina) — INTEGRADA** en la ventana de la noche: `respaldo/antes-de-conos-anotar-nuevo` = `4013ce1`, merge `73a8ff0`, `npm run pruebas` 262/262 y `check-scripts` OK antes del push. Ver `.claude/traspasos/2026-10-14-noche.md`.
