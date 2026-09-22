# Traspaso — Cobranzas: la cartera de cheques sale del módulo (22/09/2026)

Para el chat de arquitectura. Quien lo recibe no vio el trabajo: está todo acá.
Va junto con el traspaso de `modulos/cheques.html` (2026-09-22-cheques.md), que
escribió el agente principal; este cubre SOLO lo que cambió en
`modulos/cobranzas.html` y sus pruebas.

## Qué cambió y por qué

Facu decidió que la cartera de cheques (la vista "Cheques", la salida de
cartera y volver a cartera) sea un módulo propio, `modulos/cheques.html`. En
`cobranzas.html`:

1. **Helpers compartidos importados de `js/cobranzas-comun.js`** (lo creó el
   agente principal): `dvBcra`, `formatearImporte`, `ZONA_AR`, `hoyArgentina`,
   `esFechaIso`, `diasEntre`, `formatearFechaCob`, `ETIQUETA_ESTADO_CHEQUE`,
   `nombreBancoDe`, `textoSalidaCheque`. Se borraron sus definiciones locales.
   `nombreBanco(codigo)` quedó como `return nombreBancoDe(estado.bancos, codigo)`.
   El import de `formatearNumeroAr` desde utils.js salió (solo lo usaba
   `formatearImporte`).
2. **Sacada la vista Cheques completa**: HTML de `#cob-vista-cheques`,
   `#cob-pestanas` y `#cob-modal-salida`; su CSS (pestañas, `.cob-cartera*`,
   `.cob-tabla*`, `.cob-tabla__accion`, `.cob-btn--elegido`, las reglas de
   escritorio de la vista Cheques); el estado (`estado.cheques`,
   `estado.bancosDeCheques`, `estado.salida`, `estado.detalleOrigen`) y las
   funciones `TOPE_FILAS_POSTGREST`, `FILTROS_CHEQUES_DEFECTO`,
   `ESTADOS_FILTRO_CHEQUES`, `filtroNumeroCheque`, `aplicarFiltrosCheques`,
   `hayFiltrosCheques`, `fechaDeCobroCheque`, `ordenarCheques`, `resumenCartera`,
   `cargarResumenCheques`, `pintarSelectorBancos`, `pintarCartera`,
   `htmlCartera`, `pintarFiltrosCheques`, `limpiarFiltrosCheques`,
   `cargarCheques`, `renderizarCheques`, `htmlTablaCheques`, `htmlFilaCheque`,
   `htmlAccionCheque`, `LARGO_MAXIMO_DESTINO`, `erroresSalida`,
   `parametrosSalida`, `abrirModalSalida`, `cerrarModalSalida`,
   `pintarModalSalida`, `confirmarSalida`, `abrirVolverACartera`, más sus
   listeners. `.cob-salida-tipos` y `.cob-btn--grande` quedaron (los usa el
   diálogo de elegir foto). `#cob-modal-motivo` quedó (reabrir / anular).
   **Este archivo ya no llama a `marcar_salida_cheque` ni a
   `volver_cheque_a_cartera`** (hay un test que lo exige).
   - `refrescarListado()` ahora recarga solo el listado (y sus cifras).
   - `enModoMaestro()`: listado o detalle, sin la condición de "detalle abierto
     desde Cheques" (ya no existe). `abrirDetalle(id)` perdió el parámetro
     `origen` y siempre deja la cobranza elegida.
3. **Link "Cartera de cheques →"** arriba del listado:
   `<div id="cob-acceso-cheques"><a id="cob-link-cheques" href="cheques.html">`.
   Visible solo con `cobranzas:ver_todo` o `cobranzas:procesar` (o
   super_admin): `puedeVerCartera()` + `pintarAccesoCheques()` al arrancar.
   44 px táctil, naranja oscuro.
4. **Link directo** `cobranzas.html?cobranza=<uuid>&volver=<url>`: al arrancar
   se limpia `?cobranza` y `?volver` de la barra con `history.replaceState`
   (antes de abrir) y se abre el detalle de esa cobranza. Un id que no es uuid
   se avisa ("El link no apunta a una cobranza válida.") y no se consulta. Si
   no existe o el RLS no deja verla, el detalle dice "No se encontró la
   cobranza. Puede que no exista o que no tengas permiso para verla." (mensaje
   que ahora vale para cualquier apertura).
   - `volver=` se valida IGUAL que `volverOrigenSiCorresponde()` de gastos.html
     (8f73654): `new URL(decodeURIComponent(v), location.href)`, solo
     http/https y mismo origen; si no pasa, se ignora (`destinoVolver()`).
   - Con un volver válido, el botón del detalle dice "‹ Volver a los cheques"
     si el destino es `cheques.html` (si no, "‹ Volver") y navega ahí
     (`irAtrasDelDetalle()`). Vale SOLO para la cobranza del link: otra
     cobranza abierta después vuelve al listado como siempre.
   - Escritorio (≥1100 px): la cobranza del link va al panel derecho y **no se
     suelta** cuando llega el listado aunque no esté en la primera página
     (`soltarSeleccionFueraDelListado` la exceptúa). El botón de volver, que en
     escritorio se esconde, se muestra con la clase `cob-btn--volver-externo`.
5. **Detalle**: cada cheque sigue mostrando su estado y, si salió, fecha y
   destino, solo lectura; **sin ningún botón de salida** (verificado por test).
   Suma "Ver en Cheques" → `cheques.html?cheque=<encodeURIComponent(id)>`, con
   comillas DOBLES, solo con `ver_todo` o `procesar`. El aviso de cheques afuera
   termina en "(desde Cheques)".
6. **Edge Function `ocr-cheques`**: solo el COMENTARIO de `dvBcra` en
   `supabase/functions/ocr-cheques/index.ts` ahora dice que la copia del cliente
   vive en `js/cobranzas-comun.js`. **NO se desplegó**: la versión desplegada
   conserva el comentario viejo ("dvBcra() en cobranzas.html"). No cambia
   ningún comportamiento; se actualiza en el próximo deploy de esa función.

Base de datos: **nada**. Cero SQL, cero datos. RPCs, policies y firmas sin
cambios. Sin tareas ni permisos nuevos (el link usa `ver_todo`/`procesar`, que
ya existen), así que no hay traspaso al chat de permisos.

## Pruebas (todas en verde al cerrar)

- `node pruebas/check-scripts.js` → OK (parsean, sin identificadores pisados,
  cada import existe).
- `node pruebas/controles-cobranzas.js` → 315/315 verde (los MOVIDOS de
  controles-movidos.js se reconocen; `cob-acceso-cheques` y `cob-link-cheques`
  están).
- test-cobranzas-cabecera 71/71 · dialogos 68/68 · escritorio 57/57 ·
  fotos 70/70 · numeros 145/145 · xss 282/282.
- mut-cobranzas-cabecera 45/45 · dialogos 19/19 · escritorio 45/45 ·
  fotos 27/27 (+2 equivalentes) · numeros común 2/2 + 20/20 ·
  xss común 5/5 + 191/191 (+1 equivalente).

Cambios en el andamio:
- `pruebas/sandbox.js`: listas FUNCIONES/CONSTANTES y PRELUDIO sin lo de la
  cartera; con `location`, `history` y `__llamadas.orden` para el link directo.
- **Nuevo `pruebas/mutar-cobranzas-comun.js`**: muta `js/cobranzas-comun.js` y
  le pasa la copia a la suite por `ARCHIVO_COMUN` (la variable de
  fuente-cobranzas.js), con los mismos tres guards de mutar.js; las suites
  imprimen `COMUN <ruta> (N bytes)` para confirmar qué leyeron. Lo usan
  mut-cobranzas-numeros (formatearImporte) y mut-cobranzas-xss (nombreBancoDe,
  textoSalidaCheque, ETIQUETA_ESTADO_CHEQUE, formatearFechaCob).
- `mut-cobranzas-xss.js` ahora **termina en rojo** si una mutación escapa o es
  ambigua. Antes solo lo imprimía y salía 0, y así estaban **salteadas en
  silencio dos mutaciones viejas** (anclas que ya no existían o no eran únicas:
  "la plegada pierde Ver la foto" y "sin franja naranja en lo registrado"); se
  re-anclaron.
- El chequeo estático de test-cobranzas-xss acepta UNA sola interpolación en
  un href: `cheques.html?cheque=${encodeURIComponent(ch.id)}` (literal fijo +
  encodeURIComponent), y exige que sea la única.
- `test-cobranzas-escritorio`: el control "abajo de 1100 px el CSS es idéntico
  a d79765b" pasó a comparar regla por regla contra **f3633ba** (el commit
  anterior a la mudanza), descontando SOLO las reglas de la cartera que se
  fueron y las del link que entraron.
- Pendiente de limpieza (no es mío tocarlo según el encargo): las entradas de
  la vista Cheques en la lista por defecto de `pruebas/clasificar.js`
  (`cantidadCartera`, `celdaSalida`, `htmlTablaCheques…`, `htmlAccionCheque…`,
  las regex de `htmlFilaCheque`/`ESTADOS_FILTRO_CHEQUES`) quedaron sin uso en
  Cobranzas. La hoja nueva `htmlLinkChequeEnCartera(ch)` se justifica localmente
  en test-cobranzas-xss (`SEGURAS_LOCALES`).

Qué NO se verificó: el flujo en un navegador real con sesión (no se puede
iniciar sesión desde acá). La lógica del link directo y del escritorio está
EJECUTADA en el sandbox con document falso, no mirada por regex.

## Qué tocar en CLAUDE.md

- Sección **8. Cobranzas**: sacar "VISTA CHEQUES" y "SALIDA DE CHEQUES" (van a
  la sección del módulo Cheques) y reemplazar por: el link "Cartera de cheques
  →" (ver_todo o procesar), el "Ver en Cheques" del detalle y el link directo
  `?cobranza=&volver=` (validación de volver= igual a gastos 8f73654; se limpia
  la barra; en escritorio no se suelta).
- En la parte del rediseño (3.3/3.5) sacar las menciones a "un detalle abierto
  desde la vista Cheques sigue a pantalla entera" y a la tabla de Cheques.
- En la tabla `cobranza_cheques` / SALIDA DE CARTERA: dónde se hace ahora
  (cheques.html) — "La pantalla lo muestra TAL CUAL" del trigger sigue valiendo
  para editar/anular desde Cobranzas.
- En Arquitectura → OCR de cheques / `dv_bcra`: la copia del cliente de
  `dvBcra()` vive en `js/cobranzas-comun.js` (y la función desplegada de
  ocr-cheques conserva el comentario viejo hasta el próximo deploy).
- En "Las suites de verificación viven en pruebas/": sumar
  `mutar-cobranzas-comun.js` y los números de arriba.
