# Estado de la tanda "CC y cheques" (29-30/09/2026) — para retomar en otra sesión

Escrito el 30/09/2026 al cerrar una sesión que se quedó sin contexto. **Lo que sigue es el punto exacto donde quedó y los comandos para seguir.** Todo lo afirmado acá se verificó con `git` al escribirlo.

## El pedido (palabras de Facu)

> "Seguí las reglas de tanda. Tag antes-de-cc-cheques-2026-09-29. Orden: 1, 2, 3, 4, 5, 6. Un commit y push por parte. Voy a estar probando la app mientras trabajás: si algo es imposible o ambiguo, NO lo adivines: saltealo, seguí y explicalo en el traspaso."
>
> "LA BASE CAMBIÓ HOY (verificala y leé los cuerpos; Supabase en solo lectura)."

Más un pedido suelto en el medio, ya cumplido: sumar a la skill `reglas-de-tanda` que las partes grandes van a un subagente en su propia carpeta de trabajo y devuelven solo el resumen (`d211abf`).

**Reglas vigentes** (skill `reglas-de-tanda`): Supabase SOLO LECTURA; nunca `git stash`, `git reset --hard` ni `push --force`; mutaciones de a una; scripts de edición en un archivo (el hook frena `node -e`, heredocs a python/node y `sed -i`); todo texto de la base escapado; la fábrica de pruebas nunca aparece a cuentas reales; subagentes con `isolation: "worktree"`; commits que terminan en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

- Tag de seguridad: **`antes-de-cc-cheques-2026-09-29`** (existe en origin).

## Dónde está cada parte

| Parte | Qué | Commit | Estado |
|---|---|---|---|
| 1 | Buscador de clientes (`buscar_clientes`) al asentar, en Retiros y en Pedidos | `e7a7f93` | **en main**, Actions verde |
| 2 | Endosar un cheque a un proveedor paga su cuenta corriente | `3483618` | **en main**, Actions verde |
| 3 | "Cuentas corrientes · Proveedores", colores, cheque endosado, clientes de todas las fábricas | `09d9b2d` | **en main**, Actions verde |
| — | Arreglo: un chocolate con color elegido conserva la marca | `f457581` | **en main** |
| — | URGENTE: el "atrás" de Android nunca saca de la planta | `b36e744` | **en main** |
| — | Skill `reglas-de-tanda`: partes grandes a subagentes | `d211abf` | **en main** |
| 4 | Diseño "Órdenes de retiro" (Carga y hoja) | `d1a3043` | **en main**; Actions `Pruebas`, `Navegador` y `pages build` = **completed / success** (verificado) |
| 5 | Diseño "Administración" (pestañas de sección y portada) | `d902be2` | **SIN INTEGRAR** — rama `origin/ci-prueba/parte5-admin` (Actions verde en la rama); worktree `.claude/worktrees/agent-ac6c70842fcb63c0c` |
| 6 | Proyectos Taller con el diseño nuevo y el diagrama de actividades | `d9a838d` | **SIN INTEGRAR** — ya rebasado sobre `09d9b2d`; rama local `integ6` y, desde este cierre, **`origin/ci-prueba/integ6-taller`** (el original del subagente es `a5d9760` en `origin/ci-prueba/parte6-taller`) |

**`origin/main` = `d1a3043`.** La carpeta principal `C:\Users\Facu\proyectos\seis-destinos` está en `main` pero **2 commits atrás** (`09d9b2d`): hacer `git pull --ff-only` ahí antes de trabajar.

Traspasos por parte ya escritos: `2026-09-29-parte1-clientes.md`, `-parte2-endoso.md`, `-parte3-cc.md`, `2026-09-30-parte4-retiros.md` (en main); `2026-09-29-parte5-admin.md` (viaja en `d902be2`) y `2026-09-29-parte6-taller.md` (viaja en `d9a838d`).

## Lo que falta, en orden

### 1. Integrar la Parte 5 (`d902be2`) en main

Base de `d902be2` = `09d9b2d`; main ya tiene `d211abf` y `d1a3043` encima. **Conflicto probable en `CLAUDE.md`** (la Parte 4 y la 5 editan el documento; la 5 suma 9 líneas en Administración) y quizás en `pruebas/sandbox-administracion.js` / `seguras-administracion.js` (la Parte 4 no los tocó, pero verificarlo).

```bash
cd C:/Users/Facu/proyectos/seis-destinos/.claude/worktrees/agent-a9681cff88e46baef   # rama integ4 = origin/main
git fetch origin && git merge --ff-only origin/main
git cherry-pick d902be2          # si CLAUDE.md choca: resolver a mano conservando las dos entradas
git grep -n "d902be2" pruebas/   # los baselines (BASES / ARCHIVO_BASE) que apunten a d902be2 pasan al hash NUEVO (no está en main)
node pruebas/check-bytes.js && node pruebas/correr-todo.js
git commit --amend               # solo si hubo que reescribir baselines, sobre el commit que el cherry-pick acaba de crear
git push origin HEAD:main
```

Después: esperar **Pruebas** y **Navegador** en `completed / success` (ver "Cómo leer Actions"). Mutaciones nuevas de la parte: `FILTRO=mut-administracion-diseno node pruebas/correr-todo.js mut` (de a una).

**Informar en el traspaso final lo que la Parte 5 NO hizo:** el armado **lista | detalle** de las pantallas 2a–8a del handoff de Administración (el subagente hizo las pestañas de sección y la portada; el resto quedó con el armado viejo). Leer `2026-09-29-parte5-admin.md` para el detalle y el guion.

### 2. Integrar la Parte 6 (`d9a838d`)

Ya está rebasada sobre `09d9b2d`, pero main avanzó: hay que traerla sobre main igual que la 5 (`git cherry-pick d9a838d` después de integrar la 5). 19 archivos, +8536/−934 (taller.html, `pruebas/sandbox-taller.js` nuevo, `test-taller.js` reescrito). Mismo control de baselines (`git grep -n "d9a838d\|a5d9760" pruebas/`), suite completa, push, Actions verde. Traspaso de la parte: `2026-09-29-parte6-taller.md`.

### 3. Cierre de la tanda (skill `cerrar-tanda`)

- **Mutaciones** de las suites nuevas de las partes 5 y 6, de a una.
- **Controles** (`controles-administracion.js`, `controles-taller.js`) con los controles MOVIDOS/RETIRADOS declarados.
- **`comparar-con-diseno`** en las partes 4, 5 y 6 (la 4 ya tiene `e2e/15-comparar-retiros.spec.js`; revisar que 5 y 6 traigan el suyo).
- **HTML malicioso en cada render** nuevo (las `test-*-xss.js`).
- **Prueba de Taller: costos sin venta** (sin `taller:precios` no aparece ningún precio en la página).
- **CLAUDE.md**: faltan las entradas de los dos arreglos sueltos —verificado con grep: no están—:
  - `b36e744` "atrás" de Android en la planta: la planta tiene siempre una entrada de historial propia (`history.pushState({ planta: ESTADO_ATRAS })`, `popstate` en `modulos/produccion.html` ~10430); cada atrás cierra lo abierto / vuelve un paso / va al Inicio del modo, y en el Inicio no hace nada y dice cómo salir; se re-arma con cada toque (Chrome saltea las entradas agregadas sin toque); red en `js/salud.js`: la pestaña de la planta instalada que termina en otra página vuelve sola a `produccion.html`; `e2e/12-planta-atras.spec.js` y `test-/mut-produccion-atras.js` (39/39, 23/23).
  - `f457581` chocolate con color elegido: `colorProducto()` dice siempre si es de chocolate; con color elegido la etiqueta toma ese color y conserva borde marrón y la palabra Chocolate; `test-/mut-produccion-choco-marca.js`.
- **Traspaso general de la tanda** con guion para Facu y "Qué automatizaría ahora" (la Parte 4 propuso: que el handoff de diseño traiga un JSON de datos por pantalla y un generador de maqueta con esos datos).
- **`git branch -r --contains <hash>`** de cada commit de la tabla: todos tienen que estar en `origin/main`.

### 4. Limpieza (después de integrar, no antes)

Worktrees que quedan sueltos: `agent-ac6c70842fcb63c0c` (Parte 5), `scratchpad/integ6` de la sesión vieja (`C:/Users/Facu/AppData/Local/Temp/claude/C--Users-Facu-proyectos-seis-destinos/dc0fed82-95d6-4b97-ac31-52d3828a4125/scratchpad/integ6`), `agent-a33b4cd8e1b242f51` (Parte 1), `agent-a9ddd0039aa0cc3e3` (Parte 2), `agent-a8c0b7c1aeb974074` (Parte 3), `agent-a5482d8ea62d3f37f` (Parte 6 original) y este mismo `agent-a9681cff88e46baef` (rama `integ4`). Ramas temporales: `integ4`, `integ6`, `ci-prueba/parte*-*`, `ci-prueba/integ6-taller`. **Borrar recién con cada hash confirmado en main** (`git worktree remove <ruta>`, `git branch -d <rama>`, `git push origin --delete <rama>`); ninguna tiene trabajo sin commitear (verificado: `git status` limpio en `integ4`).

## Herramientas

- **Cómo leer Actions** (sin `gh`; el repo es público): cada 20 s hasta que Pruebas y Navegador digan `completed`:
  ```bash
  curl -s "https://api.github.com/repos/cucuruchosnuss-gastos/seis-destinos/actions/runs?head_sha=<sha>" \
    | grep -E '"name"|"status"|"conclusion"'
  ```
  (En la sesión vieja estaba en `scratchpad/actions.sh`; el scratchpad es de esa sesión.)
- **Maqueta**: `node e2e/maqueta/servir.js 4180` y `?maqueta=<nombre>`; Playwright con `npx playwright test --config e2e/playwright.config.js <spec> --reporter=line`.
- **Suite completa**: `node pruebas/check-bytes.js && node pruebas/correr-todo.js` (al cerrar la Parte 4: 171/171).

## Qué automatizaría ahora

Integrar una parte hecha por un subagente siempre fue el mismo baile a mano: cherry-pick sobre el main que avanzó, resolver `CLAUDE.md`, buscar los baselines que apuntan al hash viejo, reescribirlos, correr todo, push y esperar Actions. Un script `pruebas/integrar-parte.js <hash>` que haga el cherry-pick, reescriba solo los `BASES`/`ARCHIVO_BASE` que apunten a hashes que no están en `origin/main`, corra la suite y deje el commit listo para el push (y avise si `CLAUDE.md` chocó) saca la mitad del trabajo de cada integración y el error típico (baselines colgados que en GitHub no existen).
