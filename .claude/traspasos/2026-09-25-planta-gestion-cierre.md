# Cierre — Producción en planta y gestión, y las tablets que no son personas (25/09/2026)

Resumen de todo el trabajo del día. El detalle de Producción está en
`2026-09-25-planta-gestion.md`; el de Caja en `2026-09-25-caja.md`. CLAUDE.md ya
está al día con los dos.

## Commits (todos en main)

| Parte | Hash | Qué |
|---|---|---|
| — | tag `antes-de-planta-gestion-2026-09-25` | punto de partida (`92dfda3`) |
| 1 | `f7554f7` | la PLANTA: solo tablets, acceso maestro sin lista, compacta, "← Atrás", manifest |
| 2 | `31f2bcb` | la GESTIÓN: indicadores, selector de unidad, accesos |
| 2e | `be6fcc6` | dashboard: la tablet entra derecho a la planta, la tarjeta lleva a la gestión |
| 3 | `2df8e8d` | Caja: las tablets no son personas |
| 3 | `2e846a6` | Empleados y Accesos: las tablets aparte, con la etiqueta "Tablet" |
| 3 | `32be78e` | Gastos: las tablets no son personas |
| doc | (este commit) | CLAUDE.md, la definición del subagente de Producción y este traspaso |

Al cerrar: **81 suites en verde** (todas las `test-*.js` y `controles-*.js` del
repo, con `TZ=UTC`) y `check-scripts` OK. Mutaciones, de a una: planta 28/28,
gestión 44/44 (+15 eq.), dashboard 14/14, empleados 18/18, accesos 14/14,
caja 9/9, gastos 12/12, y los 17 runners de Producción de siempre en verde (ver
el traspaso de la planta).

## Lo que se verificó en la base (solo lectura)

`mi_sesion_produccion`, `indicadores_produccion`, `personal_produccion`,
`verificar_pin_maestro`, `asignar_pin_produccion`, `otorgar_puesto_temporal`,
`estado_pin_produccion`, `_puede_ser_maestro`, `puede_ver_produccion` (cuerpos
con `pg_get_functiondef`), las tres cuentas de tablet con sus tareas y módulos,
`tipo` de todos los empleados (`sistema` ⇔ `es_dispositivo`), la definición de
`v_empleados_publico` y cuántos maestros hay (uno). Todo coincidió con el pedido
**salvo una cosa**, abajo.

## Decisiones tomadas sin preguntar

1. **"Asignar PIN" desde la tablet NO se construyó** — la base no lo permite:
   `asignar_pin_produccion` exige `produccion:configurar` a la cuenta que llama
   (la tablet solo tiene `cargar`) y no recibe el PIN maestro. Siempre fallaría.
   **Hace falta** que acepte `p_maestro_id` / `p_maestro_pin` y los valide con
   `verificar_pin_maestro`, como `otorgar_puesto_temporal`. En su lugar, "Dar
   acceso por hoy" ahora muestra a todos con su puesto y "sin PIN", y a un
   masero fijo sin PIN le arma un PIN de un día (lo hace la base).
2. **El acceso maestro no puede identificar a la persona solo por el PIN**:
   `verificar_pin_maestro` necesita saber quién, y probar el PIN contra cada
   maestro bloquearía a los otros. Con un solo maestro (hoy) no se elige nada;
   con varios, solo sus nombres, en el mismo panel.
3. **Completar una planilla pendiente sigue en la planta** (es el mismo cierre,
   de pie en la fábrica). La gestión las muestra y corrige sus paradas.
4. **La planta nunca manda al dashboard** (sería un bucle con la redirección de
   la tablet). Si no puede saber qué cuenta es, lo dice y ofrece reintentar o ir
   a la gestión.
5. **El dashboard decide por `es_dispositivo`, no por "solo tiene Producción"**,
   y sin la marca de una vez por sesión. Una persona con solo Producción ve el
   dashboard y su tarjeta la lleva a la gestión.
6. **Caja y Gastos reconocen la tablet por `tipo === 'sistema'`** porque
   `v_empleados_publico` no tiene `es_dispositivo` y la base estaba en solo
   lectura. Filtran en el cliente (un `.neq` en SQL perdería los `tipo` null).
   **Pendiente de base, opcional:** sumar `es_dispositivo` a la vista y pasar
   los dos filtros a mirarla.
7. **En Accesos las tablets siguen en "Usuarios y roles"** (después de las
   personas, con "Tablet"): sus permisos se editan ahí.
8. **El manifest de la planta es aparte** (`manifest.webmanifest`, `id: planta`,
   horizontal, `start_url` a la planta, `scope` la raíz para que el login quede
   adentro). Solo la planta lo enlaza; el resto sigue con `manifest.json`. Los
   íconos 192 y 512 salen de `logo.png`.
9. Actualicé `.claude/agents/produccion.md` para que el subagente sea dueño
   también de `produccion-gestion.html`.

## Lo que NO se pudo probar

- **Nada con sesión real ni contra la base**: ninguna RPC se ejecutó (solo
  lectura) y todas las suites corren contra un doble.
- **"Instalar app"**: solo en Chrome real. Se verificó que el manifest carga
  (200), que `start_url` resuelve a la planta y que los íconos cargan.
- **La medida de 1280×800** se hizo sobre el tablero (la quinta máquina termina
  en y = 617 px); la sala de masa y "Abrir turno" quedaron más compactas pero
  sin medir.
- La gestión se miró renderizada a 1280 y 390 px con un Supabase falso.

## Guion para Facu

**A. Instalar la planta en la tablet**
1. En la tablet, abrir Chrome y entrar a
   `https://cucuruchosnuss-gastos.github.io/seis-destinos/modulos/produccion.html`
   (si pide login, entrar con la cuenta de la tablet de esa fábrica).
2. Menú de Chrome (⋮) → **"Instalar app"** (o "Agregar a la pantalla
   principal" → Instalar). Tiene que llamarse **"Planta"** y tener el logo.
3. Abrirla desde el ícono: tiene que verse **a pantalla completa, sin la barra
   de Chrome**, y horizontal.

**B. Entrar con la cuenta de la tablet**
1. Cerrar sesión y entrar con la cuenta de la tablet desde `login.html`: tiene
   que ir **derecho a la planta**, sin mostrar el dashboard y **sin preguntar
   la fábrica**.
2. Revisar que no haya "Volver al inicio", ni Configuración, Historial o Stock
   terminado.
3. Con cinco máquinas (o las que haya), el tablero tiene que entrar **sin
   scroll**. En una planilla, arriba a la izquierda dice **"← Atrás"**.
4. **Acceso maestro** desde la barra: tiene que pedir solo los 8 números y
   entrar directo, sin la lista de "¿Quién sos?".
5. Con el maestro activo, **"Dar acceso por hoy"**: un masero sin PIN tiene que
   aparecer con "sin PIN"; darle acceso le muestra un PIN de un día.

**C. Entrar a la gestión desde el celular**
1. Entrar con tu cuenta. En el dashboard, la tarjeta **Producción** tiene que
   llevar a la gestión (sin PIN, sin "¿Quién sos?", tamaño normal).
2. Arriba, si tenés varias fábricas, el selector de unidad; cambiarla y volver a
   entrar: tiene que recordarla.
3. Mirar las cinco tarjetas (Ahora, Hoy, Semana, Rendimiento, Para resolver).
   Tocar un pendiente: tiene que llevar al historial filtrado o a Marcas / Conos.
4. Abrir Personal y PINes, Recetas, Empaque, Historial y Stock terminado: son
   las mismas pantallas de antes.
5. Con tu cuenta, abrir a mano `modulos/produccion.html`: tiene que mandarte a
   la gestión.

**D. Las tablets no son personas**
1. Empleados: al final, "Tablets de la fábrica", con la etiqueta Tablet; su
   ficha sin PIN.
2. Accesos → Usuarios y roles: las tablets después de las personas, con Tablet.
3. Caja (contraparte) y Gastos (cargar a nombre de otro): las tablets no
   aparecen.
