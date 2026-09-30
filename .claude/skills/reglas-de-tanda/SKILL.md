---
name: reglas-de-tanda
description: Las reglas fijas de toda tanda de trabajo de Seis Destinos (tag antes de empezar, un commit y push por parte, todo en verde, Supabase en solo lectura, nada de stash/reset/force, mutaciones de a una, mirar en la maqueta, escapar, números y fábrica de pruebas). Usala al empezar cualquier tanda, y siempre que el pedido diga "seguí las reglas de tanda".
---

# Reglas de tanda

Desde el 27/09/2026 los pedidos dicen solo **"seguí las reglas de tanda"**: son estas. Valen para toda la tanda y para cada parte.

## Trabajar sin frenar

Facu suele estar afuera. **Trabajá sin frenar a preguntarle.** Si algo es imposible o ambiguo, **NO lo adivines**: saltealo, seguí con lo que no dependa de eso y explicalo en el traspaso (qué faltó, por qué, y qué decisión o qué cambio de base hace falta).

## Antes de empezar

1. Leé el **PRINCIPIO CENTRAL** de CLAUDE.md y usá las skills del proyecto (`auditar-tanda`, `retomar-sesion-cortada`, `editar-archivos`, `mirar-en-maqueta`, `aplicar-handoff-de-diseno`, `cerrar-tanda`).
2. `git status --short` vacío (si no, `retomar-sesion-cortada`).
3. **Tag de seguridad pusheado ANTES de tocar nada**:
   ```bash
   git tag antes-de-<tema>-<AAAA-MM-DD> && git push origin antes-de-<tema>-<AAAA-MM-DD>
   ```

## Durante

- **Un commit Y PUSH a `main` por parte**, con `check-scripts`, TODAS las suites y los controles en verde (`node pruebas/check-bytes.js && node pruebas/correr-todo.js`), y **Actions en verde después de cada push** (Pruebas y Navegador; se espera `completed success`, no alcanza con que haya arrancado).
- **Supabase SOLO LECTURA** salvo que el pedido diga otra cosa. Todo dato de la base se verifica con un SELECT antes de usarlo o escribirlo, con fecha. Si falta algo en la base, no se inventa: se dice en la pantalla y en el traspaso.
- **Nunca `git stash`, `git reset --hard` ni `push --force`.**
- **Mutaciones de a una** (`FILTRO=mut-<modulo>-<tema> node pruebas/correr-todo.js mut`). Dos runners a la vez se pisan el archivo temporal.
- **Mirá cada pantalla en la maqueta a 390 y 1280 px** (skill `mirar-en-maqueta`): sin scroll horizontal y sin errores de JavaScript.
- **Todo texto de la base se escapa** (`esc()` del módulo) antes de entrar a `innerHTML`, a un atributo o a un `href`.
- **Números** con `enlazarCampoNumero` / `leerNumeroAr` / `ponerNumero` de `js/utils.js`; los identificadores (CUIT, CBU, número de cheque, teléfono) van como texto.
- **La fábrica de pruebas nunca aparece para cuentas reales** (`sinUnidadesDePrueba` / `sinPersonasDePrueba` donde se arma cada lista).
- Los scripts de edición se escriben en un archivo y se corren (skill `editar-archivos`), nunca por heredoc.
- **Subagentes en paralelo: cada uno que haga commits o cambie de rama va con `isolation: "worktree"`** (su propia carpeta). Nunca un `git checkout` en la carpeta compartida mientras otro trabaja: en la tanda del 29/09/2026 un subagente cambió la rama de la carpeta compartida y un commit cayó en la rama equivocada (llegó a main sin su CLAUDE.md).
- **Una parte grande que se puede trabajar sola (un módulo entero, un handoff de diseño) va a un subagente en su propia carpeta de trabajo** (`isolation: "worktree"`), con un pedido que se entienda sin esta conversación, y que **devuelva solo el resumen de lo hecho**: el hash, la rama, los números de las suites y lo que quedó pendiente, no los archivos. La sesión principal **coordina**: integra, corre las pruebas y cierra. **No lee archivos enteros cuando alcanza con una parte** (un `grep`, un rango de líneas, el `git diff --stat`). Así la sesión no se llena y no hay que compactar a mano cada hora.
- Al cerrar, cada commit de la tanda tiene que estar en `main`: `git branch --contains <hash>` lo dice.
- Suites nuevas con mutaciones, en `pruebas/`, con el baseline anclado a un commit FIJO.

## Al cerrar

Cerrá cada parte y la tanda con la skill **`cerrar-tanda`**: hashes, estado de Actions, CLAUDE.md al día, la foto del esquema si la tanda tocó la base, y el traspaso con **"Qué automatizaría ahora"**.
