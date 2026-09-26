---
name: cerrar-tanda
description: Cerrar una tanda o una parte de una tanda: correr todo, commitear y pushear, confirmar que main = origin/main y que Actions quedó en verde, actualizar CLAUDE.md y dejar el traspaso con decisiones, lo no probado, un guion para Facu y "Qué automatizaría ahora". Usala al terminar cada parte y al final de la tanda.
---

# Cerrar una tanda

Una tanda no está terminada hasta que está en `origin/main`, Actions está en verde, CLAUDE.md la refleja y el traspaso existe. Nada queda sin subir: Facu deja tandas largas de noche y cada parte tiene que quedar publicada por su cuenta.

## Pasos

1. **Correr todo, en verde**
   ```bash
   node pruebas/check-bytes.js
   node pruebas/correr-todo.js          # check-scripts + suites + controles → N/N en verde
   ```
   Si la parte tocó código con mutaciones, sus `mut-*.js` **de a una**:
   `FILTRO=mut-<modulo>-<tema> node pruebas/correr-todo.js mut`.
   Si tocó pantallas: `npm run e2e` (el humo corre sin credenciales).

2. **Commit y push**
   ```bash
   git add -A
   git status --short     # que no entre nada de más: node_modules, e2e/resultados, commit*.patch
   git commit -m "<tipo>(<módulo>): <qué, en castellano>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
   git push origin main
   git fetch -q && test "$(git rev-parse main)" = "$(git rev-parse origin/main)" && echo "main = origin/main"
   ```

3. **Actions en verde** (no alcanza con que haya arrancado): esperar `completed success` en *Pruebas* y *Navegador*.
   ```bash
   curl -s "https://api.github.com/repos/cucuruchosnuss-gastos/seis-destinos/actions/runs?head_sha=$(git rev-parse HEAD)" \
     | python -c "import sys,json;[print(x['name'],x['status'],x['conclusion'],x['html_url']) for x in json.load(sys.stdin)['workflow_runs']]"
   ```
   Para esperar sin bloquear, correr ese curl en un bucle en segundo plano. Si algo da rojo, se arregla antes de seguir.

4. **CLAUDE.md al día**: cada decisión, tabla, RPC, suite o regla nueva, en su sección. Todo dato de la base se verifica con un SELECT antes de escribirlo, con fecha.

5. **El traspaso**, en `.claude/traspasos/<AAAA-MM-DD>-<tema>.md`:
   - **Qué se hizo**, con los hashes y los links a las corridas de Actions.
   - **Decisiones** tomadas y por qué, y las que quedan para Facu.
   - **Lo que NO se probó**, sin maquillar ("nada con sesión real" si es así).
   - **Guion para Facu**: pasos numerados para probarlo en la app y qué tiene que ver en cada uno.
   - **Qué automatizaría ahora**: la tarea repetida más cara que se vio y cómo sacarla (skill, script o prueba).

6. **Commit y push del CLAUDE.md y el traspaso**, y otra vez el paso 3.
