# Traspaso · La tanda del sistema visual (28 y 29/09/2026)

Tag de antes: `antes-de-sistema-visual-2026-09-28`. Orden pedido por Facu: 0, 5, 6, 4, 1, 2, 3. Todo quedó en `origin/main`, parte por parte, con Actions en verde. Supabase se usó **solo para leer**: la tanda no escribió nada en la base.

Los traspasos de detalle de dos partes son aparte:
- [2026-09-29-tablero.md](2026-09-29-tablero.md): Parte 2, el tablero.
- [2026-09-29-produccion.md](2026-09-29-produccion.md): Parte 3, la Configuración de Producción.

## Qué se hizo

| Parte | Qué | Commit en main | Actions |
|---|---|---|---|
| 0 | La Sala de masa ya no se traba con "Se terminó" | `1ccc749` | verde (tanda anterior) |
| 6 | Baja de empleados, y los dados de baja fuera de toda lista de personas | `b601b15`, `074d7e1` (docs) | verde |
| 5 | **Planta v2** (el handoff "Planta v2" copiado a 1000×540 y 600×940) y los clientes con las tres funciones nuevas de la base | merge `eee2ccd` | [Pruebas](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/runs/36526416385) · [Navegador](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/runs/36526416347) |
| 4 | Skill `comparar-con-diseno`, enganchada en `aplicar-handoff-de-diseno`; comparadores `e2e/diseno.js` + `e2e/comparar.js` | entró con la Parte 5 (`473499f`) | — |
| 1 | **Sistema visual 2026**: tokens cálidos, Bricolage + Figtree, barra lateral y barra de arriba del diseño, "Mi cuenta", sin azules | merge `b3712a5` | [Pruebas](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/runs/36529757730) · [Navegador](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/runs/36529757713) |
| 2 | **Tablero de resúmenes**, Personalizar y el modo acomodar | merge `473187c` | [Pruebas](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/runs/36536692436) · [Navegador](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/runs/36536692413) |
| 3 | **Configuración de Producción** con el diseño nuevo | merge `04992ae` | ver el commit de este traspaso |

Al cerrar: 161/161 suites en verde, check-bytes y check-scripts OK. Las comparaciones con el diseño:
- `e2e/9` (planta): todas las pantallas por debajo del 30 %, salvo 5c, que tiene un desvío declarado (tope del 45 %).
- `e2e/10` (config): entre el 2 y el 21 %.
- `e2e/11` (esqueleto y tablero): entre el 0,4 y el 1,9 % en la compu.

## Parte 5 — la planta v2 (lo principal)

Está detallado en CLAUDE.md, módulo 10, "LA PLANTA V2".
- **Hallazgos que las pruebas convirtieron en arreglos:**
  - "Abrir turno" de la barra no hacía nada con todas las máquinas abiertas; ahora se apaga.
  - Los botones de la receta en Modificar medían 28 px; ahora miden 30.
  - "Anterior" y "Modificar" perdieron su detalle largo; ahora va en el `title`.
  - Las masas sin mandar quedaban al pie del historial; ahora van arriba.
  - La columna Cono decía "sin cono" en un Vaso.
  - Había tonos azules en los colores de producto.
  - El resumen del cierre decía "0 min" sin paradas.
  - "PRESENTACIÓN" se salía de su paso a 600×940, y había otros desbordes que midió el spec 8.
- **Desvíos del diseño, con motivo:**
  - La banda del acceso maestro lleva "Ir a Producción / Ir a Sala de masa": sin eso, no hay cómo entrar a un modo desde ahí.
  - En Abrir turno se conservó la fecha con ‹ ›.
  - Caja y embolsado van en una línea del paso Cajas.
  - Está el chip "Común" (cono sin marca).
  - La ventana de lotes marca el lote y "Usar …" lo pone.
  - El historial muestra las cantidades como salieron (×2 si la masa es doble).
  - **Los colores de conos y productos salen del NOMBRE**: la base no tiene columna de color, y así un cono no cambia de color cuando cambia de orden.
  - "Dar puesto por hoy" conserva "hasta el final del día".
- **Lo que el diseño bajó y queda para que decidas:**
  - El borde del botón secundario, #E7E3DC, da ~1,25:1 sobre blanco (antes se exigía 3:1).
  - Los renglones de la ventana de lotes están separados 4 px (la regla de la tablet pedía 8).
- **Retirados, con su motivo en los controles:** 14 controles viejos (lista en CLAUDE.md).

## Parte 1 — el sistema visual

Está detallado en CLAUDE.md, "Estilo visual → EL SISTEMA VISUAL 2026".
- El acento de toda la app pasó del azul marino al **naranja**. Los tintes azulados escritos a mano en 20 archivos pasaron a cálidos.
- Barra lateral:
  - Muestra Inicio, los fijados, el resto y Personalizar.
  - Los íconos son los del diseño.
  - La burbuja va en bordó si es urgente.
  - En el celular hay una barra abajo y la hoja "Más".
- Barra de arriba:
  - Muestra las fábricas y el usuario con su menú (Mi cuenta, Mis sesiones, Salir).
  - La barra blanca vieja del dashboard se eliminó.
- **Preferencias por persona**: se guardan **en el dispositivo**, porque la base no tiene dónde (ver "Funciones de base que faltan").
- Los módulos conservan su propia cabecera ("‹ Volver" + título). No se tocaron sus pantallas por dentro, más allá de los tokens.

## Parte 6 y clientes

- **Baja de empleados**: ver CLAUDE.md, Empleados.
- **Clientes**:
  - "Mostrar apagados" usa `clientes_con_saldo(p_incluir_apagados)`.
  - El interruptor usa `cambiar_activo_cliente`.
  - La Carga de retiros toma los conos de `catalogo_para_retiro().conos`, así que el depósito ve el stock por cono sin permiso de Stock.
  - **El cono "Común" (sin marca) no viene en `conos`**: la pantalla lo deduce restando.

## Funciones de base que faltan (para el chat de arquitectura)

1. **Preferencias en el servidor**: una tabla `preferencias_usuario(empleado_id, datos jsonb, actualizado_en)` más `mis_preferencias()` y `guardar_mis_preferencias(p_datos)`. Hoy la barra, el tablero y Personalizar se guardan en `localStorage` (`sd.prefs.<id>`): no se ven iguales en la compu y en el celular.
2. **`catalogo_para_retiro().conos` sin el cono común**: sumar la fila `marca_id null`.
3. **Color de producto**: `productos_terminados.color` y su parámetro en `guardar_producto` (el diseño pide que lo elija el admin de una paleta cerrada).
4. **Cambiar la caja predeterminada** de una unidad (`unidades_negocio.caja_predeterminada_id`).
5. **Conos**: guardar su cliente y de qué sublote salió uno por revisar. Las condiciones de empaque "con cono" / "doble bolsa".
6. **Tablero** (detalle en el traspaso del tablero):
   - Mínimos y consumo de insumos (`insumos_por_agotarse`).
   - Vencimiento de facturas de proveedores.
   - Facturado y cobrado por proyecto.
   - Sesiones abiertas de toda la app.
   - `mis_pendientes(p_unidad)`, y que devuelva máquina parada, pedidos y proyectos atrasados y deuda vencida.
7. **`v_caja_saldos` / `v_caja_saldos_cuenta` restan `ingreso_reversion_gasto`**: la devolución de un gasto anulado baja el saldo en vez de subirlo. Son 4 filas por $ 85.466,88, así que los saldos están corridos el doble de eso. **Es un error de la base (Caja)**: lo encontró el subagente del tablero y no se tocó (solo lectura).
8. Ya anotado de antes: `generar_pines_iniciales` no excluye las tablets.

## Decisiones que quedan para Facu

- El contraste del borde del botón secundario y la separación de 4 px en la ventana de lotes (los dos son del diseño).
- Si los módulos pierden su "‹ Volver" ahora que la barra lateral y la de abajo llevan a todos lados. No se tocó: ningún control se retiró sin pedirlo.
- La barra de abajo del celular está en **todas** las pantallas de gestión. Las barras fijas de abajo de algunos módulos (la selección de Cheques, el pie del importador) quedan **por encima** de ella.

## Lo que NO se probó

- **Nada con sesión real ni en la tablet real.** Todo se miró en la maqueta (Supabase falso con datos fijos) y con las suites contra dobles. El recorrido `e2e/1-planta.spec.js` se actualizó a los selectores nuevos pero **nunca corrió** (faltan los secretos del robot).
- El arrastre con el dedo en un celular real (Personalizar y acomodar).
- Las fuentes nuevas (Google Fonts) en la tablet sin red: sin red caen a la del sistema.

## Guion para Facu

1. Abrí la app en la compu. A la izquierda tiene que estar la barra nueva: logo "Seis Destinos · GROUP", Inicio, tus módulos con un cuadradito de color cada uno y Personalizar abajo. Arriba, las fábricas en una pista y tu nombre de pila con tus iniciales. **Ningún azul.**
2. Tocá tu nombre arriba a la derecha. Tiene que abrirse un menú con tu nombre completo y tu mail, Mi cuenta, Mis sesiones ("N abiertas") y Salir. Mi cuenta abre las opciones de siempre (email, contraseña, dos pasos).
3. Inicio: tiene que decir "Buen día, <tu nombre>" y mostrar la franja bordó "Para resolver ya" si hay algo urgente. Debajo, una tarjeta por módulo con sus números. Tocá una tarjeta: abre el módulo. Tocá un renglón del pie: lleva a donde se resuelve.
4. Personalizar: fijá Cobranzas y Caja; tienen que quedar arriba en la barra, entre divisores. En Tablero, poné Gastos en "Ancha" y apagá Pedidos, y volvé a Inicio.
5. Achicá la barra (« abajo). Al pasar el mouse sobre un ícono tiene que salir un cartel negro con el nombre y lo pendiente.
6. En el celular: abajo tienen que estar Inicio, 3 módulos y "Más". "Más" abre la hoja con todos los módulos.
7. En la tablet de la planta (Nuss), apaisada y parada:
   - ¿Quién sos? → tu PIN se manda solo con el cuarto número.
   - Inicio → tocá una máquina → Planilla.
   - "+ Agregar producto" → Producto, Cono, Presentación, Cajas.
   - Paradas → "Paró ahora" → un motivo.
   - Cerrar planilla: si hay producto de chocolate sin masa de chocolate, "Enviar" queda apagado y lo dice.
8. Acceso maestro (abajo en ¿Quién sos?): tu PIN de 8 abre la pantalla "Dar acceso por hoy". Elegí persona y puesto: el botón dice "Dar puesto de X a Y por hoy".
9. Gestión de Producción → Configuración → Productos: cada producto con su color, sus presentaciones y el empaque en una línea. Las que no tienen empaque dicen "Falta el empaque".

## Qué automatizaría ahora

**Una carpeta de trabajo por subagente, siempre.** La tarea repetida más cara de esta tanda fue coordinar agentes en paralelo sobre la MISMA carpeta. Un subagente cambió la rama de la carpeta compartida mientras otro trabajaba. Mi commit de CLAUDE.md cayó en la rama equivocada y la Parte 1 llegó a main sin su documentación; hubo que rescatarla con un cherry-pick. El subagente de la Parte 3 se salvó armando una copia aparte a mano.

**Cómo sacarlo:**
- Lanzar SIEMPRE los subagentes que cambian de rama con `isolation: "worktree"` (la herramienta lo permite).
- Sumar a la skill `reglas-de-tanda` la regla: "un subagente que va a hacer commits trabaja en su worktree; nunca `git checkout` en la carpeta compartida".
- Un chequeo en `cerrar-tanda`: `git branch --contains <cada commit de la tanda>` tiene que incluir `main`, para que ningún commit quede huérfano en una rama.

La segunda tarea más cara fue **poner al día ~20 suites de Producción** después del rediseño: tres subagentes, horas. Eso lo abarataría una suite de "contrato" separada de las de "forma": que las pruebas de reglas de negocio (payloads, uuid, PIN, escapado) no se anclen al marcado, y que las de marcado se generen desde la comparación con el diseño.
