# Tanda del 27-28/09/2026: automatizaciones, Proyectos Taller y la barra de unidad

Tag de antes: `antes-de-planta-taller-2026-09-28`. Supabase en solo lectura toda la tanda (la base del Taller y de la planta la había dejado lista el chat de arquitectura; la policy de clientes para el Taller la aplicó ese chat antes de arrancar, verificada).

Cada módulo tiene además su propio traspaso de la barra de unidad: `2026-09-28-<modulo>-barra-unidad.md` (gastos, caja, cobranzas, cheques, cuentas-corrientes, materia-prima, stock, pedidos). Ahí están sus decisiones finas y su guion.

## Qué se hizo (en main)

| Parte | Commit | Qué |
|---|---|---|
| 1 | `1867987` | `pruebas/imports.js` (las pruebas leen los imports de cada pantalla), el ruteo de mutaciones de `mutar.js`, el hook contra one-liners que editan, `cobranzas.md` al día |
| 4 a-c | `5592f5a` | `js/barra-unidad.js`: la barra de unidad, cargada en el dashboard y los 12 módulos |
| 3 | `daed9a4` | Proyectos Taller (`modulos/taller.html`), Accesos (51 claves), tarjeta del dashboard, el proyecto al asentar en Administración |
| 4 | `c9f6923` | Retiros y Administración siguen la barra; `controles-taller.js` |
| 4 d | `75964fb` … `f820016` | La barra en Cuentas corrientes, Ingreso, Cobranzas, Caja, Cheques, Gastos (+ proyecto obligatorio del Taller), Stock y Pedidos (subagentes, integrados por cherry-pick sin choques) |
| e2e | `e252b4d`, `4d2d101` | `e2e/7-barra-unidad.spec.js` con todas esas pantallas |
| hook | `28b46d3` | el hook también frena los heredocs a node/python que escriben |

Al integrar: `correr-todo` **143/143** en verde, `check-bytes` verde, y las pruebas de navegador sin credenciales **72/72** (humo, maqueta, planta que reanuda, barra de unidad).

## Lo que NO está terminado

1. **La planta con dos modos (Parte 2).** La tiene el subagente de Producción en su rama (`worktree-agent-a0c2b41813e37175a`); se cortó dos veces por el límite de uso y se retomó. **No está en main.** Al terminar, hay que integrarla por cherry-pick (reescribiendo los baselines de controles al hash nuevo si los fijó en su rama) y correr `e2e/6-planta-reanudar.spec.js`.
2. **La barra de unidad en la gestión de Producción** (`produccion-gestion.html`): espera a la planta, porque las dos pantallas comparten `sandbox-produccion.js`, `mutar-produccion.js` y los controles.

## Decisiones

- **Sala de masa no se cierra por inactividad** (decisión de Facu): solo Producción olvida a la persona a los 10 minutos.
- **Con UNA sola unidad la barra no aparece y no se filtra nada**: filtrar a la unidad propia escondería lo que la persona veía por una tarea sin alcance (gastos:ver_exportar, cobranzas).
- **La barra solo filtra lo que se ve.** Nada de `.eq()` que descarte nulls; donde se filtró en la consulta (Cobranzas, que pagina) va con `or(…, is.null)`.
- **Taller con la barra:** con "Todas" o "Taller", todos los proyectos; con otra fábrica, los trabajos internos para ella (los externos no son de ninguna fábrica del grupo).
- **Retiros:** la empresa de una orden es un registro NUEVO: la pregunta queda, pero arranca con la de la barra; una orden a medio cargar no cambia de empresa si la barra cambia.
- **Administración:** la barra decide la empresa; con "Todas" se elige ahí mismo (regla f).
- **Sin taller:precios no hay ningún precio en el DOM**: todo lo de venta se arma en JS con el permiso; el HTML estático no nombra precios, y una suite lo exige.
- **`gastos:gestionar_proyectos`** queda en el CHECK y en el catálogo (el passthrough conserva a quien la tenga) con el rótulo "ya no se usa".
- **El proyecto al asentar una cobranza** se busca por NOMBRE del cliente dentro del Taller, porque `proyectos_taller` no devuelve el id (el nombre es único por unidad).

## Huecos de base (para el chat de arquitectura)

- `proyectos_taller()` debería devolver `cliente_id` y `unidad_destino_id` (hoy solo nombres).
- `resumen_proyecto()` no dice el id del responsable (se busca por nombre al editar).
- `resumen_cobranzas()` no recibe unidad: el total de Cobranzas no se puede separar.
- `reabrir_cobranza()` no limpia `cobranzas.unidad_negocio_id`.
- `mis_pendientes()` no dice de qué unidad es cada pendiente: las burbujas cuentan todas las unidades aunque adentro se filtre.

## Lo que NO se probó

Nada con sesión real ni contra la base: ninguna RPC del Taller se ejecutó (subir un archivo, facturar, cargar horas, guardar el valor de la hora). Todo está probado con suites que ejecutan el código real contra un doble, y mirado en la maqueta a 390 y 1280 px. Tampoco se probó la barra con un super_admin real con las cuatro fábricas, ni un cambio de barra desde otra pestaña en un navegador.

## Guion para Facu

1. Abrí el dashboard en la compu: arriba tiene que aparecer la barra "Todas · Nuss · Dolce Pasta · Mengui · Taller" con los logos.
2. Elegí **Nuss** y entrá a **Gastos**: la lista, las cifras y el Excel tienen que ser solo de Nuss. Volvé a **Todas**: aparece "Por unidad".
3. Con **Nuss** elegida, entrá a **Caja**, **Cobranzas**, **Cuentas corrientes**, **Ingreso** y **Stock**: cada una muestra solo lo de Nuss (y lo que no tiene unidad, marcado "Sin unidad").
4. Recargá la página: tiene que seguir en Nuss. Abrí otra pestaña: también.
5. Entrá a **Proyectos Taller** (la tarjeta gris con la llave). Tocá "+ Nuevo proyecto", cargá uno para un cliente de afuera (dale de alta un cliente con "+ Cliente nuevo"), con presupuesto de costo.
6. Tocá **"Valor de la hora"** y cargá el valor de hoy.
7. En el proyecto, **"Cargar horas"** a Edgar, y **subí un plano** (un PDF o una foto). Tocá "Ver" y tiene que abrirse.
8. **Facturar al cliente**: poné un anticipo, "Revisar", "Confirmar". El facturado tiene que subir.
9. Entrá con la cuenta de **Edgar**: el proyecto se ve, pero sin precio de venta, facturado, cobrado ni margen, y sin el botón "Valor de la hora".
10. En **Gastos**, cargá un gasto de la unidad **Taller**: tiene que pedir el proyecto o "Gasto general del taller".
11. En **Administración → Cobranzas por asentar**, asentá una cobranza a un cliente del Taller que tenga proyecto: tiene que ofrecer a qué proyecto va.

## Qué automatizaría ahora

**Un sandbox compartido para la barra de unidad** (`pruebas/barra-unidad-comun.js`): cada subagente armó su propio doble de `js/barra-unidad.js` en su suite (ocho copias). Una sola imitación, con la `pasaFiltroUnidad` real y un `elegir(unidad)` que dispara el aviso, hace que la próxima pantalla que filtre por unidad no escriba su doble, y que un cambio en la regla de la barra ponga en rojo todas las suites a la vez. Segundo: que la maqueta tome un puerto libre sola (tres subagentes chocaron por el 4180/4187 y usaron puertos a mano), y un `pruebas/anclas-rotas.js` que liste de una vez las anclas de mutación que ya no existen (varios subagentes tuvieron que reanclar mutaciones viejas de a una).
