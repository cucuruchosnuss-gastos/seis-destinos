# Traspaso — Automatizar el propio trabajo (26/09/2026)

Tag de antes de empezar: `antes-de-automatizar-2026-09-26`. Todo está en `main` y en `origin/main`. Supabase se usó solo en lectura: **cero SQL escrito, cero datos tocados**.

## Qué se hizo, parte por parte

| Parte | Commit | Qué |
|---|---|---|
| 1 | `b3beab9` | El **principio central** de Grupo Nuss como primera sección de CLAUDE.md. |
| 2 | `a089c25`, `85b0069` | **GitHub Actions**: `pruebas.yml` (check-bytes + check-scripts + todas las suites + todos los controles en cada push y PR), `mutaciones.yml` (a mano), badge en `README.md`. Runners nuevos `pruebas/correr-todo.js` y `pruebas/check-bytes.js`. |
| 3 | `1809ce4`, `b6d9548` | **Playwright** (`e2e/`): servidor estático local, humo de todas las páginas, recorridos de planta, gestión y Accesos con el robot, capturas como artefacto, workflow `navegador.yml` en cada push y a las 5 de la mañana. |
| 5 | `ec63a55` | Las skills `auditar-tanda`, `retomar-sesion-cortada`, `cerrar-tanda` y `aplicar-handoff-de-diseno` en `.claude/skills/`. |
| 4 | `e6d7449` | **La fábrica de pruebas no aparece para una cuenta real**: helper en `js/utils.js` y el filtro en 10 módulos (11 archivos), con una suite y sus mutaciones por módulo. |
| 6 | `fc079d4` | **"Asignar PIN" en la planta** con el acceso maestro (`asignar_pin_con_maestro`). |
| cierre | este commit | CLAUDE.md y este traspaso. |

**Verificado:** la corrida de *Pruebas* en verde en cada push (la primera: https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/runs/36211610601), y **en rojo** con una suite rota a propósito en la rama `ci-prueba/rojo` (https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/runs/36211674858), rama ya borrada. Al cerrar: **96/96** suites y controles en verde, **0 CR y 0 NUL**, humo del navegador **22 pasaron / 6 salteadas** (las que piden credenciales).

## Decisiones (y las que quedan para Facu)

1. **EL ROBOT NO PUEDE ENTRAR POR EL LOGIN, y es la decisión más importante de la tanda.** El login exige Cloudflare Turnstile y Supabase lo valida del lado del servidor (medido: un password grant sin token responde `captcha_failed`). Un robot no puede ni debe resolver un CAPTCHA, así que `E2E_PLANTA_PASSWORD` / `E2E_GESTION_PASSWORD` **no sirven**. `e2e/ayuda.js` arma la sesión con la **API de administración**: genera un enlace mágico con la clave de servicio, lo canjea y deja la sesión en `localStorage`. **Guarda: solo lo hace si el email es de un empleado `es_prueba`.**
   - **PARA FACU:** eso pide poner la **clave `service_role`** como secreto de GitHub. Un secreto de Actions no lo ven los forks ni los logs, pero es la llave maestra de la base. **Alternativa más cerrada** (necesita escritura en Supabase, que esta tanda no tenía): una Edge Function `sesion-robot` que emita la sesión **solo** para las dos cuentas del robot, con su propio secreto (`E2E_ROBOT_SECRETO`); el cambio en `ayuda.js` es chico. Decidí no adivinar: el código soporta la primera y deja la segunda anotada.
2. **Parte 4 va en el cliente** porque el servidor no filtra nada (`personal_produccion`, las `v_mis_unidades_*` con el bypass de super_admin, `v_empleados_publico` sin `es_prueba`) y la base estaba en solo lectura. Un helper compartido (cuarta excepción a la regla de duplicar) y el filtro donde se ARMA cada lista; los mapas para resolver nombres por id quedan completos. **Un super_admin real tampoco ve la fábrica de pruebas.** Si algún día la base filtra, los filtros del cliente quedan como red.
3. **El paso de "Asignar PIN" en Playwright no cambia ningún PIN**: intenta `1234`, que la base rechaza después de validar el maestro. Así prueba la cadena entera sin romper la fábrica de pruebas (`limpiar_fabrica_de_pruebas()` desbloquea pero **no restaura** un PIN cambiado). Necesita un maestro: **ningún robot lo es**, así que queda condicionado a `E2E_MAESTRO_NOMBRE` / `E2E_MAESTRO_PIN`.
4. **Humo con dos ruidos aceptados**, con motivo en el código: `[Cloudflare Turnstile] Error 110200` (localhost no está entre los dominios del sitio de Turnstile) y el `throw new Error('Sin sesión')` deliberado de dashboard.html y mfa.html.
5. **Un reintento de Playwright en CI.** Una corrida del humo falló una vez y la siguiente, con el mismo código, pasó; no quedó rastro de cuál fue porque el log del job no se puede leer sin credenciales. Ahora las fallas salen como **anotaciones** (legibles por la API pública) y lo que pasa al segundo intento queda marcado *flaky*.
6. La cuarta excepción volvió falsa una afirmación de CLAUDE.md: **`tipo='sistema'` ya no equivale a `es_dispositivo`** (los robots son `sistema` sin ser tablets). Caja y Gastos siguen reconociendo las tablets por `tipo`, y ahora esconden a los robots por los dos caminos.
7. `CLAUDE.md` decía 100/100 mutaciones de XSS en Cuentas Corrientes; son **98/98** también sobre el archivo anterior a la tanda (medido en un worktree de HEAD): el número estaba viejo, no se relajó nada.

## Un hallazgo del cierre

Los subagentes de la Parte 4 corrieron las mutaciones de SU suite nueva y algunas de las viejas, pero no todas: el de Producción envolvió una línea de `produccion-gestion.html` con el filtro de la fábrica y **`mut-produccion-config.js` quedó abortando** (su ancla ya no existía; en el tag de antes daba 182/182). Se arregló el ancla, sin cambiar la mutación: vuelve a **182/182**. Y `mut-produccion-quien.js` necesitó un comentario en `produccion.html` para que su ancla siguiera siendo única (el código nuevo de Asignar PIN repetía `if (!p) return`). Las 19 `mut-produccion-*.js`, corridas de a una al cerrar, dan todas en verde. **Es el motivo de fondo para correr el workflow *Mutaciones* después de cada tanda grande.**

## Lo que NO se probó

- **Los recorridos de planta, gestión y la mitad de Accesos NUNCA corrieron contra la base**: faltan los secretos, y yo no puedo crear cuentas ni entrar con contraseñas. Se escribieron leyendo `produccion.html` y `produccion-gestion.html`; **es esperable que el primer intento pida ajustar algún selector o una espera.** Las capturas del recorrido todavía no existen: la única es la del login (humo).
- **La Parte 4 no se miró en un navegador con una sesión real**: son suites que ejecutan el código real con dobles de Supabase.
- **"Asignar PIN" no se tocó en una tablet**, ni con un maestro real.
- `mutaciones.yml` no se corrió en GitHub (se probó `correr-todo.js mut` localmente sobre una suite).
- El `cron` de las 5 de la mañana todavía no disparó.

## Guion para Facu

**A. Cargar los secretos** (GitHub → el repo → *Settings* → *Secrets and variables* → *Actions* → *New repository secret*), uno por uno:
1. `E2E_PLANTA_EMAIL` = el email de la cuenta **"Robot · tablet de planta"**.
2. `E2E_GESTION_EMAIL` = el email de la cuenta **"Robot · gestión"**.
3. `E2E_SERVICE_ROLE_KEY` = la clave `service_role` (Supabase → *Project Settings* → *API keys*) — **solo si decidís ir por este camino** (ver Decisión 1).
4. Opcionales, para "Asignar PIN": `E2E_MAESTRO_NOMBRE` (el nombre tal cual lo muestra la tablet) y `E2E_MAESTRO_PIN` (sus 8 dígitos). Lo más limpio sería hacer maestro a **Robot Encargado** con un PIN maestro solo de prueba.
5. *Actions* → *Navegador* → *Run workflow*. Al terminar, en la corrida: el resumen dice si faltaron secretos; abajo, el artefacto **capturas** trae una foto por paso (`e2e/resultados/capturas/NN-paso.png`) y el informe HTML.

**B. Mirar la Parte 4 en la app** (con tu cuenta de super_admin): Empleados, Accesos (Usuarios y roles, el alcance de una tarea), Caja, Gastos (el filtro de unidad y el wizard), Stock (chips), Pedidos, Cobranzas (asentar), Cuentas Corrientes (filtros de unidad), Ingreso, y la gestión de Producción. **En ninguna tiene que aparecer "Pruebas (robot)" ni un "Robot …".**

**C. "Asignar PIN" en la tablet**: entrá con el acceso maestro → "Asignar PIN" → elegí a alguien → marcá 4 números → "Guardar el PIN". Tiene que decir "PIN guardado para …" y la lista pasar a "Pendiente de cambiar". Probá `1234`: tiene que mostrar el mensaje de la base ("no tan obvio"). Y un PIN maestro equivocado: el mensaje del maestro, sin cambiar nada.

## Qué automatizaría ahora

**La tarea repetida más cara de esta tanda fue esperar y leer GitHub Actions a mano**: cada push necesitó un bucle de `curl` escrito de cero para saber si *Pruebas* y *Navegador* terminaron, y cuando el Navegador falló no había forma de saber por qué. Lo sacaría con un **script `pruebas/esperar-actions.js <sha>`** que espere a que terminen todas las corridas de ese commit, imprima el resultado y, si alguna falla, baje sus **anotaciones** (el reporter `github` ya las deja) — y sumarlo al paso 3 de la skill `cerrar-tanda`. Segundo candidato: **que la base filtre la fábrica de pruebas** (una columna `es_prueba` en `v_empleados_publico` y el filtro en `personal_produccion` y las `v_mis_unidades_*`), así un módulo nuevo queda cubierto sin acordarse del helper.
