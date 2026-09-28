# Tanda del 27/09/2026 — cobranzas en Administración, la planta que se colgaba, la barra lateral y la seguridad

Tag de antes: `antes-de-cobranzas-admin-2026-09-27`. Supabase en SOLO LECTURA toda la tanda: cero SQL de escritura, cero datos tocados. Todo lo de la base que se usa acá lo creó el chat de arquitectura y se verificó con `pg_get_functiondef` / `pg_proc` antes de escribir código.

## Qué se hizo

| Parte | Commit | Actions |
|---|---|---|
| 1. Automatización: skills `reglas-de-tanda` y `editar-archivos`, el chequeo de comillas sin cerrar, los datos de la maqueta como fuente, la foto del esquema | `d95d174` | [Pruebas](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/runs/36353819289) ✅ · [Navegador](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/runs/36353819352) ✅ |
| 2. Retiros: los renglones de insumo vienen de la base; el lote de un insumo sin permiso de Stock | `9c07d5b` | [Pruebas](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/runs/36354373913) ✅ · [Navegador](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/runs/36354373876) ✅ |
| 3. Cobranzas por asentar en Administración (el chofer no ve ninguna lista de clientes) | `5482a94` | [Pruebas](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/runs/36357291998) ✅ · [Navegador](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/runs/36357291836) ✅ |
| URGENTE: la planta que se colgaba al bloquear la tablet | `0311ebc` | [Pruebas](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/runs/36359214075) ✅ · [Navegador](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/runs/36359214068) ✅ — detalle y evidencia en `2026-09-27-planta-bloqueo.md` |
| 4. Barra lateral de la compu + accesos directos en Administración | `1ab75bb` (+ `5e737ae`, que saca `test-results/` que se había colado) | Pruebas de `1ab75bb` quedó *cancelled* porque el push siguiente la reemplazó; `5e737ae` tiene el mismo código: [Pruebas](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/runs/36360736342) ✅ · [Navegador](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/runs/36360736416) ✅ |
| 5. Seguridad visible: sesiones abiertas y cerrarlas, registro de seguridad, chequeo de salud cada 30 min | `f0bcbf9` | [Pruebas](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/runs/36361929815) ✅ · [Navegador](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/runs/36361929875) ✅ |

Al cerrar: `check-bytes` verde, `check-scripts` OK, **122/122** suites y controles en verde, Playwright local **48 pasan y 8 esperan los secretos del robot**. Todas las mutaciones corridas de a una (números en CLAUDE.md, sección de pruebas).

### Parte 4, en corto
- `js/modulos.js`: el catálogo de módulos salió de `dashboard.html`; lo comparten el dashboard, la barra y Administración.
- `js/barra-lateral.js` + CSS: desde 1024 px, fija, logo, un ícono por módulo permitido (la regla del dashboard), burbuja de pendientes escapada, el actual marcado, se achica y lo recuerda, "Mis sesiones". No existe en el celular, ni en la planta, ni para una tablet, ni al imprimir.
- Administración: la fila de accesos directos (Cheques, Cobranzas, Cuentas corrientes, Gastos, Caja) con la misma regla.

### Parte 5, en corto
- a) Accesos: "Sesiones" en la tarjeta de cada usuario → sus sesiones (dispositivo legible, última actividad, IP) y "Cerrar todas sus sesiones" en rojo, con motivo y confirmación.
- b) Mi cuenta: "Mis sesiones abiertas" en el menú de perfil (y `dashboard.html?cuenta=sesiones`) y en la barra lateral; cerrar las propias avisa que cierra también esta y va al login.
- c) Sesión cortada / dado de baja → login con "Tu sesión fue cerrada. Volvé a iniciar sesión." (en `js/salud.js`, compartido; ya estaba desde la parte urgente y ahora lo usa también el panel).
- d) Administración → Seguridad (solo super_admin): el `registro_seguridad`.
- e) `.github/workflows/salud.yml`: cada 30 min, páginas + Auth + la base con la clave pública; falla si algo no contesta.
- f) TOTP obligatorio para super_admin: NO implementado; los pasos están abajo.

## Decisiones

- **La barra se carga en el `<head>`**, no al final del `<body>`: la región de Cheques de Administración y la planilla de Stock tienen pruebas que exigen ser el último bloque del body. Es un módulo, así que corre igual después de armar la página.
- **La página se corre con `margin-left` del body**, no con `padding`: cada módulo tiene su propio padding y se lo pisaría.
- **La barra muestra lo mismo que el dashboard**: si una tarjeta no aparece, tampoco aparece en la barra. Lo que pide tareas (Cheques, Retiros, Administración) no aparece si las tareas no se pudieron leer.
- **En los accesos directos, Cheques es un botón** que abre su sección sin recargar; los demás son links. Un href tiene que pasar por `encodeURIComponent` (regla del chequeo de escapado), y `administracion.html?seccion=cheques` no pasa entero.
- **"Mis sesiones" también en la barra lateral**: el pedido decía "en el menú de cada usuario", y los módulos no tienen menú de usuario; en la compu la barra está en todas las pantallas. En el celular está en el menú de perfil del dashboard.
- **Un solo componente de sesiones (`js/sesiones.js`)** para Accesos, el dashboard y la barra: el user agent y la IP los manda quien se conecta, así que el escapado vive en un solo lugar.
- **El chequeo de salud acepta como "la base contestó" el 401 con código `42501`**: es Postgres mismo diciendo "permiso denegado". Un 200 (una tabla que se deja leer sin sesión) también lo pone en rojo.

### Para decidir Facu
1. **TOTP obligatorio para super_admin** (pasos abajo).
2. **Los secretos del robot** para que los 8 recorridos con sesión corran (ver `2026-09-26-automatizar.md`).
3. **Territorio de los subagentes**: el asentar de cobranzas ahora vive en `administracion.html` (el subagente `cobranzas` no lo sabe; `.claude/agents/` es territorio compartido y no se tocó).
4. **`marcar_cobranza_asentada` y `asignar_unidad_cobranza` ya no las llama ninguna pantalla** (la unidad sale del cliente en `asentar_cobranza`). Dropearlas es de la base; conviene verificar antes que nadie más las use.

## TOTP obligatorio para super_admin — pasos (sin implementar)

Hoy MFA es opcional y hay **un solo factor verificado en todo el sistema** con **dos super_admin**; el rescate (`quitar-mfa-empleado`) exige aal2 y no deja rescatarse a uno mismo, así que sirve recién con dos super_admin con MFA. El orden importa: si se exige antes de que los dos lo tengan, alguien queda afuera.

1. **Los dos super_admin activan la verificación en dos pasos**: Dashboard → avatar → "Verificación en dos pasos" → Activar, y agregan **un segundo dispositivo** (no hay códigos de recuperación). Verificar con un SELECT: `select count(*) from auth.mfa_factors where status='verified'` tiene que dar al menos 2, uno por cada super_admin.
2. **La app**: en `verificarSesion()` de `js/auth.js`, si la persona es super_admin y no tiene factores verificados, mandarla a dar de alta el factor (hoy `mfa.html` solo pide el código; habría que sumarle el alta, igual que el modal del dashboard). Con factor y sesión en aal1 ya la manda a `mfa.html` (eso existe).
3. **La base (el chat de arquitectura)**: que el bypass de super_admin exija aal2. En `tiene_tarea`, `tiene_tarea_alcance` (y donde se mira `rol_app = 'super_admin'`: `cerrar_sesiones`, `sesiones_de`, la policy de `registro_seguridad`, `errores_app`, las RPCs de Accesos) cambiar `rol_app = 'super_admin'` por `rol_app = 'super_admin' and coalesce(auth.jwt()->>'aal','aal1') = 'aal2'`. Es lo que recomienda Supabase para "exigir MFA a ciertos usuarios" (policies con el claim `aal`). Verificar después con `pg_get_functiondef` y probar entrando con cada super_admin.
4. **Recién ahí** avisar al equipo. Si alguien pierde el celular, el otro super_admin lo rescata desde Accesos ("Quitar verificación en dos pasos").

## Lo que NO se probó

- **Nada con sesión real ni contra la base de verdad**: `cerrar_sesiones`, `sesiones_de`, `asentar_cobranza`, `cobranzas_por_asentar`, `lotes_insumo_para_retiro` y `registrar_error_app` no se ejecutaron nunca desde la app (el conector estaba en solo lectura y todas las suites corren contra un doble). Sí se leyeron sus definiciones.
- **La barra lateral y los paneles se miraron solo en la maqueta** (1024, 1280 y 390 px): sin sesión real, con datos fijos.
- **El chequeo de salud** se corrió a mano contra producción (5/5 responden; y apuntando a una base inexistente, 2/5 y sale 1). **El workflow programado todavía no corrió**: la primera corrida es la próxima media hora después del push.
- **La tablet**: ver `2026-09-27-planta-bloqueo.md`.

## Guion para Facu

1. **Compu, cualquier módulo**: a la izquierda tiene que aparecer la barra con tus módulos y el que estás mirando marcado. Tocá "Achicar": quedan solo los íconos (el nombre aparece al pasar el mouse). Recargá: sigue achicada. Si hay algo pendiente (por ejemplo cobranzas por controlar), el número rojo está al lado de su módulo.
2. **Celular**: la barra NO aparece. La tablet de la planta: tampoco.
3. **Administración**: arriba, la fila "Accesos directos" con Cheques, Cobranzas, Cuentas corrientes, Gastos y Caja (los que tengas). Tocá Cheques: abre la cartera sin recargar.
4. **Accesos → Usuarios y roles**: en cada tarjeta, "Sesiones". Abrí la de alguien: ves en qué aparatos tiene la sesión abierta ("Chrome en Android", la IP, cuándo fue la última vez). Probá "Cerrar todas sus sesiones" con una cuenta de prueba: pide motivo, pide confirmar, y dice cuántas cerró. Esa persona, en su celular, al tocar cualquier cosa, tiene que terminar en el login con "Tu sesión fue cerrada. Volvé a iniciar sesión.".
5. **Tu menú de perfil (dashboard, el avatar) → "Mis sesiones abiertas"**: ves las tuyas. Si cerrás todas, te avisa que también cierra esta y te manda al login con el aviso.
6. **Administración → Seguridad** (solo super_admin): aparece lo del paso 4 y 5, con quién, a quién, cuándo y el motivo.
7. **GitHub → Actions → "Salud"**: tiene que haber una corrida verde cada media hora. Si un día falla, te llega un mail.
8. **Cobranzas por asentar** (parte 3): el chofer carga una cobranza escribiendo el cliente como quiera; en Administración → Cobranzas por asentar aparece con los clientes sugeridos arriba; elegí uno y asentá: dice en qué cuenta se descontó.

## Qué automatizaría ahora

**La tarea repetida más cara de esta tanda fue armar, a mano y otra vez, cómo leen y mutan las pruebas un archivo compartido.** Ya van tres versiones del mismo andamio: `fuente-cobranzas.js` (pega `js/cobranzas-comun.js` y `js/retiros-comun.js`), `mutar-produccion.js` (reparte mutaciones entre planta y gestión) y, en esta tanda, `fuente-dashboard.js` + `mutar-dashboard.js` (el dashboard + `js/modulos.js`), más el pegado de `js/modulos.js` en `fuente-cobranzas.js`. Cada vez que un helper se muda a `js/`, hay que tocar cinco suites a mano.

**Cómo sacarla:** un `pruebas/fuente-modulo.js` genérico que lea los `import ... from '../js/x.js'` del `<script>` y pegue solo las declaraciones que el módulo no declara (lo mismo que hace `fuente-cobranzas.js`, pero para cualquier archivo), y un `pruebas/mutar-varios.js` que reparta cada mutación en el archivo donde está su ancla (lo que hacen `mutar-produccion.js` y `mutar-dashboard.js`). Con eso, mudar un helper a `js/` no toca ninguna suite.

**Y la segunda:** las ediciones con `node -e` / heredoc se rompieron tres veces más (una comilla invertida o un `\n` comidos). La skill `editar-archivos` ya lo dice; el chequeo de comillas de `check-bytes` atrapó una. Lo que falta es un **hook de Claude Code** que rechace un `node -e` con comillas invertidas o `\n` antes de correrlo.
