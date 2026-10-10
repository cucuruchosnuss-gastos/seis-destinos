# Traspaso — Producción: corregir TODO un sublote (planta y gestión) · 08/10/2026

Para el chat de arquitectura: actualizar CLAUDE.md, sección **Módulos → 10. Producción** (en "LA PLANTA EN LA TABLET REAL", donde dice que Corregir abre los mismos pasos, y en "LA GESTIÓN → Historial de un turno: Corregir / Anular un sublote"), más la lista de suites de `pruebas/`. Rama `ci-prueba/corregir-sublote-completo` (sin push: esta compu no tiene sesión de GitHub). **No toca la base: Supabase solo lectura, cero SQL corrido.**

## Qué cambió

"Corregir" un renglón de lo producido permite cambiar TODO —producto/presentación, cono, caja, embolsado y cajas— y siempre va por **`corregir_produccion_item_completo(p_item_id uuid, p_datos jsonb, p_motivo text) → void`** con **solo las claves que cambiaron**.

### La base (leída con `pg_get_functiondef` el 08/10/2026)
- SECURITY DEFINER, `search_path=public`; `authenticated` sí, `anon` no.
- Claves de `p_datos`: `presentacion_id`, `marca_id`, `caja_insumo_id`, `embolsado`, `cajas`. **Una clave que no viene queda como estaba**; `marca_id: null` = sin marca (Común), `caja_insumo_id: null` = sin caja, `embolsado` `''`/null = null.
- Permisos: planilla `cerrado` → `produccion:configurar` en la unidad ("La planilla está cerrada: solo quien configura producción puede corregirla."); si no, `produccion:cargar` ("No tenés permiso."). Un anulado: "Ese sublote está anulado.". **Motivo: 3 letras o más** ("El motivo es obligatorio.").
- Valida: presentación de la fábrica del turno ("El producto no es de esta fábrica."), chocolate con `_chequear_masa_chocolate` si cambia la presentación, cajas > 0 ("…para sacarlo, anulalo"), con cono exige marca ("Esa presentación lleva cono: elegí cuál."), sin cono pone la marca en null, el cono existe, la caja habilitada si la presentación tiene alguna ("Esa caja no corresponde a la presentación elegida."). Sin cambios: `return` sin hacer nada.
- Hace: devuelve el empaque viejo (`_descontar_empaque(-cajas)`), saca el stock terminado viejo (ajuste), actualiza el renglón con el MISMO sublote (recalcula unidades con las de la presentación nueva), descuenta el empaque nuevo, entra el stock nuevo, y escribe `produccion_correcciones` tipo `datos` con `detalle {antes, despues}`.

### La planta (`modulos/produccion.html`)
Ya existía casi todo (28/09/2026: Corregir abre los pasos de la carga y manda a la RPC completa solo lo que cambió). Se ajustó:
- **Un renglón con `embolsado` null** (anterior al empaque) que no se toca ya no manda `embolsado: 'ninguno'` "de regalo" al cambiar otra cosa (`datosCorregirCompleto`).
- **Sin catálogo** (el panel viejo de solo cajas): ahora también va por la **RPC completa** con `p_datos: { cajas }`, y si las cajas son las mismas no llama y dice "No cambiaste nada". `corregir_produccion_item` (solo cajas) **ya no se usa en ninguna de las dos pantallas**.

### La gestión (`modulos/produccion-gestion.html`)
"Corregir" en el renglón del historial de un turno abre el **formulario de la oficina** en el mismo renglón: **Producto** (comunes, después "Chocolate"; sin la reventa) · **Presentación** · **Cono** (solo si la presentación lleva cono: "Común (sin marca)" y los **ofrecibles** — aprobados y pendientes de revisar, nunca rechazados ni inactivos; el que tenía el renglón y ya no se ofrece se ve como "(el que tiene; ya no se ofrece)") · **Caja** (solo las habilitadas para la presentación) · **Embolsado** (los de la caja; con un cono de **doble bolsa** queda "Las dos", trabado, y lo dice) · **Cajas** · **Motivo**.
- Las reglas del empaque, las de la planta al agregar: otra presentación trae su caja inicial (la predeterminada de la unidad si está habilitada; si no la única; si no "Elegí la caja") y el embolsado sugerido; otra caja trae su embolsado; sin cono suelta el cono; otro producto con una sola presentación la elige sola.
- El catálogo se lee al abrir (`leerCatalogoCorreccion`: productos activos sin reventa, presentaciones activas, conos activos, `presentacion_cajas`, la caja predeterminada y los nombres de las cajas). Mientras carga: "Cargando los productos…". **Si falla, solo se corrigen las cajas** (lo dice); **si falla solo el empaque**, la caja y el embolsado quedan como estaban (no viajan).
- Lo que falta se dice pegado al botón (motivo, presentación, caja, cajas, "No cambiaste nada"); el botón solo se traba mientras manda (un doble toque manda una vez); el error de la base va TAL CUAL.
- Permisos: el botón se ofrece donde ya se ofrecía (`puedeCorregirSublote`: cerrado → configurar, si no cargar); la barrera es la base.
- Funciones nuevas: `conoOfrecible`, `cajasDe`, `cajaInicial`, `embolsadoSugerido`, `conoDobleBolsa`, `opcionesEmbolsado` (copias de las de la planta), `leerCatalogoCorreccion`, `presentacionCorr`, `embolsadoCorreccion`, `datosCorreccionSublote`, `opcion`, `htmlCamposCorreccion`, `cargarCatalogoCorreccion`, `cambiarCampoCorreccion`. Ids nuevos `pr-hist-corr-producto/-presentacion/-cono/-caja/-embolsado`.

## Qué se verificó y contra qué
- `pg_get_functiondef` de la RPC (arriba) y un conteo de datos: **de 40 sublotes vivos, 11 son "Común" en una presentación con cono** (ver huecos).
- **Suite nueva `pruebas/test-produccion-corregir-completo.js`: 62/62**, ejecuta el código real de los dos archivos (sandbox) con un Supabase falso: solo cajas → `{cajas}`; solo cono → `{marca_id}`; cono de doble bolsa → `{marca_id, embolsado:'doble'}`; otra presentación → presentación, cono null y la caja nueva; sin cambios y sin motivo no llama y lo dice; error tal cual; doble toque una sola llamada; conos rechazados/inactivos fuera (planta y gestión); la reventa fuera; cajas no habilitadas fuera; planilla CERRADA con configurar en la gestión; catálogo y empaque caídos; escape con `<b data-xss>` en producto, presentación, cono, caja, error, motivo y sublote.
- **`mut-produccion-corregir-completo.js`: 44/44 detectadas** (10 en la planta, 34 en la gestión; de a una). `npm run pruebas` entero: **227/227 en verde** (check-bytes, check-scripts, todas las suites y los controles).
- Suites al día sin aflojar lo que medían: `test-produccion-cierre.js` (294/294: el panel sin catálogo, ahora con la RPC completa y el caso "mismas cajas"), `test-produccion-gestion-diseno.js` (138/138: ahora espera `{"p_datos":{"cajas":33}}` y "No cambiaste nada"), `mut-produccion-gestion-diseno.js` (dos anclas puestas al día), `seguras-produccion.js` (7 hojas nuevas con motivo), `sandbox-produccion.js` (las funciones nuevas). `controles-produccion*.js` en verde (ningún control perdido).
- **E2E `e2e/28-planta-corregir.spec.js`** en la maqueta (con `CI=1`, servidor propio) a **1000×540 y 390×844**: entra con el PIN, abre la planilla, Corregir en 7033-3, "No cambiaste nada", cambia el cono a CASERATO y las cajas a 30, guarda; la maqueta (`pruebas/datos-maqueta/produccion.js`, `rpc.corregir_produccion_item_completo: null`, regenerado con `npm run maqueta:datos`) recibe exactamente `{ p_item_id:'pi-3', p_datos:{ marca_id:'mc-1', cajas:30 }, p_motivo }`. 2/2.

- Otras mutaciones vecinas: `mut-produccion-gestion-diseno.js` **101/101** (+23 eq.), `mut-produccion-cierre.js` **179/179** (+34 eq.; dos que escapaban por el "No cambiaste nada" nuevo se recuperaron haciendo que la suite pruebe el motivo con cajas CAMBIADAS), `mut-produccion-pantallas.js` **80/81**: la que escapa (`sin esc() en esc(textoStockLote(…))`, la ventana de lotes de la sala) **ya escapaba en `origin/main`** (verificado corriendo la misma tanda contra el archivo de main): no es de esta parte, queda anotada.

## Lo no probado
- Nada con sesión real ni contra la base (la RPC no se ejecutó: solo lectura).
- El formulario de la gestión no se miró renderizado en la maqueta (solo en el sandbox); falta mirarlo a 390 y 1280 px.
- La planta sin catálogo en un navegador.

## Huecos de base (para el chat de la base)
1. **Un sublote "Común" en una presentación CON cono no se puede corregir en NADA**: la RPC calcula `v_marca = v_i.marca_id` (null) y `if v_p.con_cono and v_marca is null then raise 'Esa presentación lleva cono: elegí cuál.'` aunque no se toque el cono. Hoy son **11 de 40** sublotes vivos. La planta y `registrar_produccion_item` sí aceptan "Común". La pantalla muestra el mensaje tal cual. Arreglo: aceptar marca null con cono (como al registrar) o validar solo si cambió.
2. **La RPC no fuerza la doble bolsa** de un cono `doble_bolsa` (registrar sí). Lo hace la pantalla; un cliente que no lo haga deja el embolsado como estaba.
3. (Pantalla, CERRADO en esta parte) `produccion_correcciones` tipo `datos` se veía en el historial con su clave cruda ("datos"): ahora dice "Corregido" y, si cambiaron, "· cajas X → Y". Lo que cambió adentro (`detalle {antes, despues}`) no se lee: la consulta no trae `detalle` (pendiente si se quiere el detalle fino).

## Guion para Facu
1. En la tablet, abrir una planilla, tocar el lápiz de un renglón, cambiar el cono y las cajas, poner un motivo y guardar: tiene que decir "Sublote X corregido." y el renglón cambiar sin cambiar el número de sublote.
2. En la gestión, Historial → un turno cerrado → Corregir: cambiar la presentación y mirar que la caja y el embolsado se ajusten solos; con un cono de doble bolsa, el embolsado tiene que quedar "Las dos" trabado.

## Qué automatizaría ahora
La tarea repetida más cara de esta parte fue **mantener a mano las listas de funciones de `pruebas/sandbox-produccion.js`** (EN_AMBOS / NUEVAS_GESTION / FUNCIONES_BASE): cada función nueva obliga a decidir en qué lista va, y un error da duplicados o un ReferenceError lejos. Un generador que lea los dos HTML (como `pruebas/imports.js` ya hace con los imports) y arme las listas por archivo sacaría ese paso. Segunda: el scratchpad de la sesión es COMPARTIDO entre copias que trabajan en paralelo (otro agente pisó un `editar-gestion.js`): la skill `editar-archivos` debería pedir una subcarpeta por tarea.
