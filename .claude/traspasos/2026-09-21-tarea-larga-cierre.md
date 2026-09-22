# Cierre — tarea larga de 4 partes (21/09/2026)

Cuatro partes, un commit y un push por parte, cada una verificada antes de subir. Todo hecho por Claude Code. Supabase en solo lectura. Sin `git stash`, `reset --hard` ni `force push`. Mutaciones de a una.

## Hashes (rama `main`, ya pusheados)
- **Parte 1** — subagentes que faltaban: `5826ac5`
- **Parte 2** — `.gitattributes` (CRLF): `6665dc1` + `ffc3ce6` (doc)
- **Parte 3** — retoques de Cobranzas: `af465fa`
- **Parte 4** — fechas en iPhone: `176b983`

## Parte 1 — Los ocho subagentes
Creados `caja.md`, `empleados.md`, `stock.md`, `accesos.md` copiando el molde (cobranzas/gastos/cuentas-corrientes/materia-prima). Cambié solo: territorio (su HTML), tablas separadas en **escribe** vs **solo lee** (sacadas de cada `.from`/`.rpc`/`.storage.from`/`.functions.invoke` del HTML y confirmadas con `pg_proc`: qué tabla escribe cada RPC), y Edge Functions. Límites/verificación/cierre/lenguaje idénticos.
- `css/main.css`, `js/auth.js`, `js/utils.js` y **`dashboard.html`** quedan como territorio compartido, escrito en los ocho.
- Compartidas anotadas en los dos lados: `empleados` (Empleados↔Accesos), `caja_movimientos` (Caja↔Gastos), e `insumos`/`proveedor_insumo_alias`/`stock_movimientos`/`stock_transferencias`/`stock_transferencia_items` (Stock↔Ingreso).
- `accesos.md` tiene la única excepción interna: el `CATALOGO_TAREAS` vive en su HTML pero lo decide el chat de permisos; las pantallas de auth y sus Edge Functions no son suyas.
- CLAUDE.md: lista de los ocho subagentes en la sección de `.claude/`.
- **Verificado:** ninguna Edge Function invocada desde caja/empleados/stock; empleados solo `empleados`; accesos invoca `quitar-mfa-empleado` y `rechazar-solicitud-acceso`; stock escribe vía RPC (cero policies de escritura de cliente salvo el update/delete directo de `proveedor_insumo_alias`).

## Parte 2 — CRLF
- `git ls-files --eol` antes: 65 archivos `i/lf w/lf`, 1 `i/lf w/crlf` (`ocr-comprobante/index.ts`), 6 png `-text`, 1 json `none`.
- `.gitattributes` creado (`* text=auto eol=lf` + binarios png/jpg/jpeg/webp/pdf/zip).
- `git add --renormalize .` **no cambió ningún blob** (el índice ya estaba en LF; el hash de `ocr-comprobante/index.ts` es idéntico antes y después: `7afad9c`). La copia de trabajo de esa función tenía CR; la reescribí a LF solo a ella. **No se tocó la función desplegada** (es un cambio de fin de línea en el working copy; el blob versionado no cambió).
- Después: `git ls-files --eol` da `i/lf w/lf` en los 67 de texto.
- Prueba: `git checkout -- modulos/cobranzas.html` y `git checkout -- CLAUDE.md` → **0 CR** en los dos.
- `check-scripts` y las 7 suites: mismos números que el rediseño.
- CLAUDE.md: anotado que la trampa quedó resuelta y cómo se verificó (en la entrada del `git checkout --` y en la regla de `git stash`).

## Parte 3 — Cobranzas (subagente `cobranzas`)
Trabajo del subagente sobre `modulos/cobranzas.html` + suites; yo verifiqué, hice el label en `accesos.html` y actualicé CLAUDE.md. Traspaso detallado del subagente: `.claude/traspasos/2026-09-21-cobranzas-2.md`.
- **a)** Estados renombrados SOLO en pantalla (registrada→Por controlar, procesada→Asentada). La base y las RPCs no cambian; hay test que se pone rojo si un valor enviado a la base pasa a "asentada". Label de `cobranzas:procesar` en accesos.html → **"Controlar y asentar cobranzas"** (lo hice yo; solo el texto y la descripción, no la clave).
- **b)** Tarjeta de cheque confirmado del formulario → fila compacta de 72px.
- **c)** Franja naranja = siempre "por controlar"; fila elegida solo con fondo + `aria-current`.
- **d)** Encabezado "Cheques" de escritorio arreglado (columna 72px, Estado 108px, corte de columnas 1279→1399px).
- **e)** Cifras de cabecera con `resumen_cobranzas()`: "Por controlar" (ignora filtro de estado) + "Total del mes"/"Total del período". Con "Anuladas" dice "Las anuladas no suman". Turno anti-respuesta-vieja, "…" al cargar, "No se pudo calcular" al fallar, nunca $0.
- **f)** `test-cobranzas-cabecera.js` + `mut-cobranzas-cabecera.js` nuevos.
- **PENDIENTE DE SERVIDOR (no tocado, Supabase solo lectura):** cuatro mensajes de las RPCs (`editar_cobranza`, `marcar_cobranza_procesada` ×2, `marcar_salida_cheque`, `reabrir_cobranza`) todavía dicen "procesada"/"registrada" y se muestran tal cual. Se corrigen cuando se autorice escribir esas RPCs.

## Parte 4 — Fechas en iPhone (`css/main.css`, lo hice yo)
- Regla global para `input[type=date/time/datetime-local]`: `appearance:none` + `min-width:0` (sueltan el ancho mínimo nativo de iOS), `width:100%`, `max-width:100%`, `box-sizing:border-box`, `display:block`, borde/alto/fuente base, y `::-webkit-date-and-time-value{text-align:left}`.
- **Por qué el borde/alto base no rompe los módulos:** el `<style>` de cada módulo carga después de main.css y gana en empate de especificidad, así que un campo de fecha con estilo propio conserva su borde; lo que aporta la global (appearance, min-width, etc.) ningún módulo lo pisa.
- **Dos fechas lado a lado, revisado en TODOS los HTML:**
  - Cobranzas `.cob-filtros__fila > *`: ya tenía `flex:1 1 8rem; min-width:0`. Sin cambios.
  - **Cuentas Corrientes `.filtros-cc`**: las dos fechas son hijas directas del flex sin base → agregué `.filtros-cc input[type="date"] { flex: 1 1 8rem; min-width: 0; }` (una línea en su `<style>`) para que compartan la fila. Territorio del subagente CC, editado por asignación explícita de Facu.
  - Gastos y Caja: barras `flex-wrap` con las fechas en wrappers `flex-shrink:0`; con el arreglo global las fechas quedan compactas y no desbordan. Sin cambios.
  - Materia Prima (`campo-fecha`) y registro (`fecha-nacimiento`): fechas sueltas de formulario, cubiertas por la global. Sin cambios.

## Decisiones tomadas sin preguntar
1. **dashboard.html como territorio compartido** en los ocho subagentes (el pedido lo nombraba junto a css/js; lo traté igual).
2. **`accesos.md`**: además del CATALOGO_TAREAS, marqué como no-suyas las pantallas de auth y sus Edge Functions (`crear-solicitud-acceso`, `buscar-empleado-cuil`), porque son de auth/registro, no del módulo Accesos.
3. **Label de `cobranzas:procesar`**: cambié el texto Y su descripción (que también decía "procesada"), no solo el label. La clave sigue siendo `procesar`.
4. **Parte 4, borde/alto en la regla global**: los puse como pide el spec, sabiendo que el `<style>` de cada módulo los sobrescribe donde ya estiliza el campo. Es lo que da "el mismo borde que el resto" sin imponer un borde único a los seis módulos.
5. **`width:100%` global en fechas**: lo dejé como pide el spec. El único lugar donde eso apilaría dos fechas es CC, resuelto con el `flex` de arriba.
6. Todo el subagente de Cobranzas trabajó con sus propias decisiones (ver su traspaso); las revisé y las dejé.

## Qué NO se pudo verificar
- **iPhone real**: no hay Playwright/WebKit en la máquina (`npx playwright` pide instalar). La Parte 4 se apoya en el comportamiento conocido de WebKit; la prueba final la hace Facu.
- **Cobranzas en un navegador con sesión**: el subagente midió con el CSS real y el HTML de las funciones reales, pero no abrió la app logueada ni llamó a `resumen_cobranzas` desde el navegador.
- Ningún SQL de escritura (Supabase solo lectura): `resumen_cobranzas` ya existía (migración `20260922000832`); no la creé.

## Números al cierre (todo verde)
| | |
|---|---|
| check-scripts | OK, sin identificadores pisados |
| controles-cobranzas (baseline `fba6396`) | 351/351 |
| test-cobranzas-xss | 320/320 |
| test-cobranzas-fotos | 70/70 |
| test-cobranzas-escritorio | 45/45 |
| test-cobranzas-cabecera (nuevo) | 72/72 |
| test circuito: materia prima / gastos / CC | 113/113 · 57/57 · 78/78 |
| mut-cobranzas-cabecera (nuevo) | 45/45 |
| mut-cobranzas-escritorio | 35/35 |
| mut-cobranzas-xss / fotos | 221/221 (+1 eq.) · 27/27 (+2 eq.) — corridos por el subagente |

## Guion para Facu

**En la compu (Chrome, con sesión):**
1. **Cobranzas** → listado: arriba tienen que verse **"Por controlar: N"** y **"Total del mes"**. Cambiá un filtro (cliente, fecha, repartidor) y mirá que las dos cifras se recalculan y muestran "…" un instante. Filtrá por **"Anuladas"**: el total debe decir **"Las anuladas no suman"**, no $0.
2. El segmentado de estado tiene que decir **Por controlar / Asentadas / Anuladas / Todas**. Abrí una cobranza sin asentar: el botón dice **"Controlada, asentar"**. Asentala y mirá el historial: **"Asentada · nombre · fecha"**.
3. Cargá una cobranza con **tres cheques**: al confirmarlos, cada uno queda en una **fila compacta** (importe, "Nº … · paga …", banco cortado con "…"), con Editar y Quitar a la derecha. Los tres tienen que entrar sin scroll.
4. Ventana **ancha** (>1100px): la tabla master-detail no debe cortar el encabezado **"Cheques"**. Elegí una fila: se marca con **fondo naranja claro**; la franja naranja del borde izquierdo tiene que quedar **solo en las "por controlar"**, elegidas o no.
5. **Accesos** → permisos de una persona: la tarea de Cobranzas dice **"Controlar y asentar cobranzas"**.

**En el iPhone (Safari):**
6. **Fechas** en Cobranzas (filtro Desde/Hasta y fecha de cobranza), Caja (retiros, movimiento), Gastos (fecha, fecha de pago, filtros), Cuentas Corrientes (filtros de historial y de ficha) y el registro (fecha de nacimiento): **ningún campo de fecha se sale de la tarjeta ni empuja la pantalla de costado**. En Cuentas Corrientes las dos fechas del filtro tienen que compartir la fila (o apilarse limpias si no entran), sin desbordar.

**Nada más para tocar en la base**: no corrí ningún SQL de escritura.
