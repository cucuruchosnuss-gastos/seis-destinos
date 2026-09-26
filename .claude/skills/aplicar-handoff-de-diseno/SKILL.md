---
name: aplicar-handoff-de-diseno
description: Aplicar un handoff de Claude Design (un .zip o carpeta con README, prototipos y tokens) a una pantalla existente sin perder ningún control. Usala cuando Facu pasa un handoff de diseño o un mockup, o dice "aplicá este diseño".
---

# Aplicar un handoff de diseño

## Pasos

1. **Descomprimir AFUERA del repo** (en el scratchpad de la sesión), nunca adentro:
   ```bash
   D="<scratchpad>/handoff-<tema>"; mkdir -p "$D" && unzip -q <archivo.zip> -d "$D" && ls -R "$D" | head -50
   ```

2. **Leer el README ENTERO** antes de tocar nada, y los prototipos que nombra. Armar la lista de lo que pide, pantalla por pantalla.

3. **Responder las decisiones abiertas.** Todo lo que el README deja abierto o contradice CLAUDE.md (colores de validez, medidas mínimas, textos, reglas del módulo) se decide con las reglas del proyecto y se ANOTA en el traspaso con el motivo. Lo que no se puede decidir con lo que hay se saltea y se explica: no se adivina.

4. **Mapear tokens a variables existentes.** Cada color, radio, sombra y tamaño se busca primero en el `:root` de `css/main.css` y en el `body {}` del módulo. Un hex que ya existe se usa por su variable, nunca repetido (antes de copiar un valor del mockup, verificar que no lo tengamos ya con el mismo hex). Solo lo que no existe se crea, como variable local del módulo, con el contraste medido si es texto. Verde y bordó son del sistema (validez / alerta): el acento del módulo no los reemplaza.

5. **Fijar el baseline de controles ANTES de editar**:
   ```bash
   git rev-parse HEAD     # ese commit va como baseline FIJO en pruebas/controles-<modulo>.js (nunca HEAD)
   ```
   Si el módulo no tiene `controles-<modulo>.js`, crearlo con `controles-comun.js` (molde: `controles-stock.js`).

6. **Aplicar el diseño** manteniendo ids, `data-*` y textos de acción. Ningún control se pierde sin declarar:
   - cambió de texto → `RENOMBRADOS`, con su motivo;
   - se mudó de pantalla o de archivo → lista de MOVIDOS (`controles-movidos.js` / `controles-produccion-movidos.js`), con su destino;
   - se retira a propósito → `RETIRADOS`, con motivo.

7. **Verificar**: `node pruebas/controles-<modulo>.js`, `node pruebas/check-scripts.js`, las suites del módulo (`FILTRO=<modulo> node pruebas/correr-todo.js`), y mirarlo renderizado con `node e2e/servidor.js` + navegador a 390 px y a 1280/1440 px. Cerrar con la skill cerrar-tanda.
