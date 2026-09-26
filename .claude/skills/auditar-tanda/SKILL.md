---
name: auditar-tanda
description: Auditar una tanda de trabajo ya subida (de otra sesión, de un subagente o de la noche) antes de construir encima. Usala cuando Facu dice "revisá lo que se hizo" o "auditá la tanda", al retomar después de una tanda nocturna, o antes de aceptar un traspaso.
---

# Auditar una tanda

Objetivo: saber, con mediciones y no con el resumen de quien la hizo, si lo que está en `main` está sano. El traspaso dice lo que se quiso hacer; esto mide lo que quedó.

## Pasos

1. **Traer lo último**
   ```bash
   git pull
   git status --short   # tiene que estar vacío; si no, usá la skill retomar-sesion-cortada
   ```

2. **Qué entró en la tanda.** Ubicá el primer commit de la tanda (el tag `antes-de-…` si hay, o el último commit ya auditado):
   ```bash
   git log --oneline <desde>..HEAD
   git diff --stat <desde>..HEAD
   ```

3. **Fines de línea y bytes raros, medidos en BYTES.** Nunca con `grep -c $'\r'` adentro de `"$( )"`: la comilla puede no procesarse y devuelve la cantidad de LÍNEAS.
   ```bash
   node pruebas/check-bytes.js
   ```

4. **El archivo entero como lo ve el navegador**
   ```bash
   node pruebas/check-scripts.js
   ```

5. **Todas las suites y todos los controles**
   ```bash
   node pruebas/correr-todo.js
   ```
   Tiene que terminar en `N/N en verde`. Anotá el N: si bajó respecto de la tanda anterior, desapareció una suite.

6. **Si la tanda tocó pruebas que YA existían, confirmá que no se relajaron.**
   ```bash
   git diff --name-status <desde>..HEAD -- pruebas/     # M = preexistente modificada, A = nueva
   git diff <desde>..HEAD -- pruebas/<suite-modificada>.js
   ```
   En el diff de cada suite PREEXISTENTE (las `M`, no las `A`) buscá:
   - assertions borradas o comentadas, un `chk(` que pasó a `true`, umbrales aflojados, casos de prueba sacados;
   - mutaciones borradas de un `mut-*.js`, o pasadas a "equivalentes" sin un motivo verificable;
   - el baseline de un `controles-*.js` cambiado de commit, o entradas nuevas en `RENOMBRADOS` / `RETIRADOS` / `MENOS_COPIAS` sin motivo;
   - un baseline anclado a `HEAD` en vez de un commit fijo.
   Cada una es una prueba que dejó de medir: pedí el motivo o revertila.

7. **GitHub Actions en verde para el último commit**
   ```bash
   curl -s "https://api.github.com/repos/cucuruchosnuss-gastos/seis-destinos/actions/runs?head_sha=$(git rev-parse HEAD)" \
     | python -c "import sys,json;[print(x['name'],x['status'],x['conclusion'],x['html_url']) for x in json.load(sys.stdin)['workflow_runs']]"
   ```

8. **Informe**: una tabla con lo medido (bytes, check-scripts, N/N suites, Actions), las suites preexistentes que cambiaron y si se relajaron, y lo que el traspaso dice que NO se probó.
