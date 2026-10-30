# Traspaso — 30/10/2026: aplicar las cobranzas a lo que debe el cliente, y el recibo

Autocontenido: quien lo lee no vio el trabajo. Dos partes:
- **A. Lo hecho en `modulos/cobranzas.html`** (para el chat de arquitectura: documentación).
- **B. PARA CUENTAS CORRIENTES**: lo que faltaba en la cuenta del cliente. No lo hizo el subagente de Cobranzas porque
  ese archivo no es su territorio (lo acordó el coordinador: "camino A"). **Corrección (30/10/2026): el lugar no era
  `cuentas-corrientes.html` sino `modulos/administracion.html`** (ver la nota al principio de la B).
- **C. Lo hecho en Administración**: la parte B, hecha en `modulos/administracion.html`.

Pedido completo: `.claude/pedidos/2026-10-30-aplicar-cobranzas.md`. Rama `ci-prueba/aplicar-cobranzas`, salida de
`origin/ci-prueba/cobranza-muchos-comprobantes` = `1aa4b4e` (se integra DESPUÉS de esa: las dos tocan
`cobranzas.html`).

## Lo que hay en la base (verificado con `pg_get_functiondef` el 30/10/2026, solo lectura)

Todas son `SECURITY DEFINER`, `search_path` public, EXECUTE para `authenticated`.

- **`cliente_pendientes(p_cliente_id uuid)` → jsonb.** Exige `mi_empleado_id()` y `_cliente_ve_imputaciones(cliente)`
  = `tiene_tarea('cobranzas','procesar')` **o** `tiene_tarea_alcance('retiros','precios', <unidad del cliente>)`.
  Error: "No tenés permiso sobre la cuenta de este cliente." / "El cliente no existe.". Devuelve:
  - `activo` (= `clientes.imputa_desde is not null`, "tiene corte"), `imputa_desde`, `saldo_cuenta` (suma de
    `cliente_movimientos.importe`: **positivo = debe, negativo = a favor**).
  - `docs[]` = `_cliente_docs`: `{doc_tipo, doc_id, parte, etiqueta, fecha, orden_id, monto, aplicado, pendiente}`,
    ordenados del más viejo al más nuevo (y N1 antes que N2). Tipos: `corte` ("Saldo de corte dd/mm/aaaa", parte
    `total`, solo si el saldo al corte es > 0), `orden` con parte `N1` ("N1-0042") y `N2` ("N2-0042") si la orden
    está entera después del corte y valorizada con división, o `total` ("Orden X…" o "(ajuste posterior al corte)"),
    `nota_debito` ("Nota de débito <código>"), `acopio` ("Acopio"), `movimiento` (observación o el tipo).
  - `creditos[]` = `_cliente_creditos`: `{credito_tipo, credito_id, etiqueta, fecha, monto, aplicado, libre,
    medios, aplicado_por_medio}`, por fecha. Tipos: `corte` ("Saldo a favor al corte", credito_id = el id del
    CLIENTE), `cobranza` ("Cobranza del dd/mm/aaaa", credito_id = id de la cobranza), `movimiento`, `orden`
    ("Orden X (a favor)"), `nota_debito` ("Nota de débito (a favor)"). `medios` = `_cobranza_medios` **solo en las
    cobranzas** (`{cheque, transferencia, efectivo}`: los e-cheques cuentan como cheque y un depósito en efectivo
    como transferencia); en los demás, null. `aplicado_por_medio` = `{cheque|transferencia|efectivo|sin_medio: n}`.
- **`sugerir_aplicacion(p_cliente_id uuid, p_monto numeric, p_parte text default null)` → `{items[{doc_tipo,
  doc_id, parte, etiqueta, monto}], sobra}`.** Recorre los docs con pendiente > 0 (filtrados por parte si viene) del
  más viejo al más nuevo; el último queda parcial. Mismo permiso que `cliente_pendientes`. **No sabe nada de lo que
  la pantalla eligió sin guardar.**
- **`aplicar_credito_cliente(p_cliente_id uuid, p_credito_tipo text, p_credito_id uuid, p_items jsonb)` →
  `{aplicado, a_cuenta}`.** Exige `cobranzas:procesar` (más estricto que leer) y corte. **BORRA todas las
  imputaciones de ese crédito y escribe las que vienen**: hay que mandar la lista ENTERA. Items `{doc_tipo, doc_id,
  parte, monto, medio}` (los de monto ≤ 0 se saltean; `medio` ∈ cheque/transferencia/efectivo/null). Un item
  `parte: 'total'` sobre una orden partida llena primero N1 y después N2. Errores (se muestran tal cual):
  - "No tenés permiso para aplicar cobranzas." · "El cliente no existe." · "Este cliente todavía no tiene corte: las
    cobranzas se aplican desde el corte." · "Ese pago no es de este cliente o es anterior al corte." · "Faltan los
    renglones." · "Medio de pago inválido."
  - "Uno de los renglones no está pendiente en la cuenta de este cliente."
  - "<etiqueta> tiene $ X pendientes y le querés aplicar $ Y." · "A la orden le quedan menos de $ X pendientes."
  - "Estás aplicando $ X y el pago es de $ Y." (contra `monto` del crédito)
  - Solo cobranzas: "Lo aplicado con un medio de pago supera lo que se cobró con ese medio (cheques $ …,
    transferencias $ …, efectivo $ …)."
- **`recibo_cobranza(p_cobranza_id uuid)` → jsonb.** Mismo permiso de lectura. Error si la cobranza no está asentada
  en un cliente ("La cobranza todavía no está asentada en un cliente."). **No mira el corte**: con un cliente sin
  corte devuelve el recibo con `aplicaciones` vacío. Devuelve `empresa{nombre, razon_social, cuit, domicilio,
  logo_url}`, `cliente{id, nombre, razon_social, cuit, solo_n2}` (`solo_n2` = `pct_parte_a = 0`), `fecha`, `estado`,
  `cheques[{banco (denominación o código), banco_codigo, numero, tipo, emision, pago, importe, echeq}]`,
  `transferencias[{medio, cuenta, banco_origen, referencia, fecha, importe}]`, `efectivo`, `medios`, `total`,
  `aplicaciones[{etiqueta, parte, doc_tipo, doc_id, fecha, monto_doc, aplicado, medios}]`, `a_cuenta`, `saldo_cuenta`.
- **Solo N2 y "N1":** `_orden_partes` arma N1 = parte A + **comisiones**. Con `division_pct_a = 0` la parte A da 0,
  pero una comisión podría dejar un renglón N1 para un cliente solo N2. La pantalla de Cobranzas lo muestra como
  "Orden 0042" en el recibo. El 30/10/2026 había **0 clientes con corte** (y 0 solo N2 con corte): nada de esto se
  ve en producción hasta cargar el primer corte.

## A. Lo hecho en `modulos/cobranzas.html`

Solo al asentar (`esFormAsentado`: cobranza NUEVA de alguien con `cobranzas:procesar`) y solo si el cliente tiene
corte. Sin corte, sin permiso, el chofer o una edición: **nada nuevo** y se asienta como siempre.

- **La sección** `#cob-aplicar` (después de las formas de pago, antes de "Datos del pago"): la cuenta se lee al
  elegir el cliente (`cargarPendientesCliente`, atada al cliente y al formulario; mientras lee no se muestra nada).
  Cifras Total cobrado / Aplicado / Queda a cuenta arriba y también en la barra fija de abajo (`#cob-barra-aplicar`,
  porque el `sticky` no funciona en el celular: la página scrollea en el documento). Renglones con pendiente > 0.
  - **"Aplicar todo"** (por defecto): `sugerir_aplicacion` con el total cobrado; se vuelve a pedir (400 ms) si cambia
    lo cobrado y nadie tocó a mano. "Sugerir" / "Solo N1" / "Solo N2" (cada uno solo si hay renglones de esa parte).
  - **"Por medio de pago"**: un bloque por medio cobrado, con su "Sugerir / Solo N1 / Solo N2". El reparto se
    calcula **en la pantalla** (`sugerirMedioLocal`, el mismo algoritmo de la base) sobre lo que los otros bloques no
    tomaron: la RPC no conoce lo elegido sin guardar. Los items llevan su `medio`.
  - Frena Guardar (bordó): un renglón con más que su pendiente (sumando los medios), un medio con más que lo cobrado
    con él, más aplicado que cobrado.
- **Guardar**: si la cuenta todavía se está leyendo, espera; si resulta con corte, frena ("Revisá a qué se aplica la
  cobranza y volvé a tocar Guardar."). Una sugerencia pendiente se termina antes. Después `cargar_cobranza_asentada`
  (igual que antes) y `aplicar_credito_cliente(cliente, 'cobranza', <id>, items)` (también con la lista vacía).
  Arriba del listado `#cob-recien-asentada`: lo aplicado y lo que quedó a cuenta, o "No se pudo aplicar: <mensaje
  de la base tal cual>" con "Volver a intentar aplicar", y "Ver / enviar recibo". Sin señal: queda en el celular y
  avisa que lo elegido no se aplica (queda a cuenta).
- **Recibo** `#cob-modal-recibo` con `recibo_cobranza`: estilo COPIADO de la orden de pago de Cuentas corrientes
  (`htmlOrdenPago`, `.op-*` → `.rc-*`; la orden de pago no se tocó). Todo lo que pide el punto 3. UNA hoja: más de 14
  renglones → `rc-hoja--compacta`; el PDF se escala a A4; al imprimir `html.rc-imprimiendo` deja solo la hoja.
  "Enviar": html2canvas 1.4.1 + jsPDF 2.5.1 de cdnjs (como Conos) → `navigator.share` o descarga
  "Recibo - <CLIENTE> - dd-mm-aaaa.pdf".
- **Pruebas**:
  - `pruebas/test-cobranzas-aplicar.js`: 110/110. `pruebas/mut-cobranzas-aplicar.js`: 68/68 (+13 equivalentes),
    con baseline `1aa4b4e` en rojo.
  - `e2e/108-aplicar-cobranzas.spec.js` (390 y 1280): aplicar todo, solo N2, por medio, medio pasado, guardar,
    recibo en una hoja A4 y descarga; el error de la base; un cliente sin corte. También en verde 18, 94 y 105.
  - Ajustadas: `pruebas/sandbox.js` (funciones nuevas en `FUNCIONES_PAGO` y constantes en `CONSTANTES_PAGO`),
    `test-cobranzas-xss.js` (seguras nuevas con motivo), `test-cobranzas-escritorio.js` (CSS nuevo en ENTRARON) y
    `test-cobranzas-numeros.js` (el importe aplicado también se enlaza como número).
- **Documentación**: `docs/memoria/cobranzas.md` ya tiene la sub-entrada "A QUÉ SE APLICA LA COBRANZA Y EL RECIBO",
  en el medio (después de "VARIOS COMPROBANTES…"). Falta, cuando exista la parte B, la entrada en
  `docs/memoria/cuentas-corrientes.md` (no se escribió: es del dueño de CC).

### Decidido sin consultar
1. El reparto "por medio" se calcula en la pantalla (la RPC no puede saber lo elegido en los otros bloques). Usa el
   mismo algoritmo que `sugerir_aplicacion`.
2. Mientras se lee la cuenta no se muestra nada (ni "Leyendo…"), para que un cliente sin corte no vea nada nuevo. Si
   la lectura FALLA, sí se muestra un aviso con "Volver a intentar" (no se sabe si tiene corte); no frena.
3. "Aplicar todo" vuelve a sugerir solo, si cambia lo cobrado, hasta que alguien toca un monto a mano.
4. Se llama a `aplicar_credito_cliente` aunque no se haya elegido nada (todo queda a cuenta), para que un reintento
   reemplace limpio.
5. El recibo en el celular tiene ancho de papel y se desplaza dentro de su marco (se ve igual que impreso).
6. El recibo solo se ofrece justo después de asentar (no en el detalle de cobranzas viejas: para saber si el
   cliente tiene corte habría que leer su cuenta; queda para la cuenta del cliente, parte B).
7. Para un cliente solo N2, un renglón N1 (posible por comisiones) se muestra como "Orden 0042".

### Lo que no se pudo probar
- Contra la base real (solo lectura): las RPCs se probaron con dobles que hacen lo que dice `pg_get_functiondef`.
- `navigator.share` con el PDF en un celular real; la impresión real en papel (sí el alto en modo impresión: entra en
  una A4). La carga de html2canvas/jsPDF desde cdnjs (en la prueba se reemplazan por dobles: no hay red).

## B. PARA CUENTAS CORRIENTES (`modulos/cuentas-corrientes.html`, para su dueño)

> **Corrección (30/10/2026): el lugar era Administración.** La cuenta del cliente NO vive en `cuentas-corrientes.html`:
> vive en `modulos/administracion.html` (se arma con `cuenta_cliente` / `cuenta_cliente_consolidada` dentro de
> `#ad-cliente-cuerpo`), y Cuentas corrientes → Clientes la muestra en un iframe de
> `administracion.html?seccion=clientes&embebido=cc`. Todo lo de esta sección se hizo en `administracion.html` y llega a
> los dos lados; `cuentas-corrientes.html` no se tocó. Donde abajo dice "CC", leer "Administración" (por ejemplo, ahí no
> existen `logoSeguroCC` ni `cuitConGuiones`: se usó `logoSeguro` de `js/retiros-comun.js` y una copia propia del CUIT).
> La documentación va en `docs/memoria/administracion.md`, no en `cuentas-corrientes.md`. Lo hecho: sección C.

Ojo con las ramas abiertas en ese archivo: `ci-prueba/detalle-pago-cheques`, `ci-prueba/cc-proveedor-una-lista`
(orden de pago, nota de débito, lista del proveedor) y `ci-prueba/cc-orden-n1-n2` (desplegable N1/N2). Código en
lugares nuevos y sin reacomodar.

1. **Sección o pestaña "Pendientes" en la cuenta del CLIENTE**, solo si `cliente_pendientes(cliente).activo` es true
   (sin corte: nada nuevo). Muestra:
   - los `docs` con `pendiente > 0` (etiqueta, fecha, monto, pendiente);
   - los `creditos` con `libre > 0`, cada uno con "Aplicar". Sirve para el saldo a favor del corte
     (`credito_tipo 'corte'`, credito_id = id del cliente) y para las cobranzas que cargaron los cobradores (se
     asientan en Administración sin aplicar: todo queda a cuenta).

   Leer exige `cobranzas:procesar` o `retiros:precios` en la unidad; **aplicar exige `cobranzas:procesar`**: sin él,
   "Aplicar" no se ofrece.
2. **"Aplicar" abre el mismo selector de Cobranzas, DUPLICADO** (regla del proyecto: cada módulo duplica sus
   helpers; nada en `js/` compartido sin preguntar). En `cobranzas.html` están, para copiar y adaptar:
   - estado y cálculo: `aplicacionVacia`, `claveDocAplicar`, `centavosAplicar`, `docsParaAplicar`, `montoElegido`,
     `itemsDeAplicacion`, `resumenAplicacion`, `sugerirMedioLocal`;
   - pintado: `htmlCifrasAplicar`, `htmlBotonesParte`, `htmlFilaAplicar`, `htmlCuerpoAplicar`;
   - eventos: `alTocarEnAplicar`, `alEscribirEnAplicar`;
   - CSS: `.cob-aplicar*`.

   Adaptaciones:
   - Lo "cobrado" es el `monto` del crédito; sus `medios` (solo en una cobranza) dan los bloques de "Por medio de
     pago". En los demás créditos, solo "Aplicar todo".
   - **`aplicar_credito_cliente` REEMPLAZA todo lo aplicado de ese crédito**: hay que mandar lo que ya tenía MÁS lo
     nuevo. Para una cobranza, lo que ya tenía sale de `recibo_cobranza(id).aplicaciones` (doc_tipo, doc_id, parte,
     aplicado, medios por medio).
   - **HUECO DE BASE**: para un crédito que NO es cobranza (corte, movimiento, orden o nota a favor) con
     `aplicado > 0` y `libre > 0`, ninguna RPC devuelve qué renglones tenía aplicados. Mandar solo lo nuevo
     BORRARÍA lo anterior. Hasta que el chat de la base agregue una lectura de las imputaciones por crédito (o un
     "agregar" en vez de "reemplazar"), en esos créditos ofrecer "Aplicar" solo si `aplicado = 0`, o pedir antes esa
     RPC.
   - Los pendientes que se muestran ya descuentan lo aplicado por ESE crédito. Al editarlo, su pendiente disponible
     es `pendiente + lo que ese crédito ya tenía en ese renglón`.
   - Errores de la base: tal cual (lista arriba). Después de aplicar, volver a leer `cliente_pendientes`.
3. **"Recibo" en la línea de cada cobranza** de la cuenta del cliente (las que tienen `cobranza_id`): abre el recibo
   de `recibo_cobranza(cobranza_id)`. Copiar de `cobranzas.html`:
   - `htmlRecibo`, `bancoCorto`, `etiquetaRecibo`, `textoSaldoCuenta`, `filasRecibo`, `fechaRecibo`,
     `cuitConGuionesCob`, `nombreArchivoRecibo`;
   - `abrirRecibo`, `cerrarRecibo`, `imprimirRecibo`, `generarPdfRecibo`, `enviarRecibo`;
   - el modal `#cob-modal-recibo` (renombrar ids) y el CSS `.rc-*` con su `@media print` (`html.rc-imprimiendo`).

   En CC ya existen `logoSeguroCC` y `cuitConGuiones` (de la orden de pago): se pueden usar en lugar de
   `logoUnidad` / `cuitConGuionesCob`. **No modificar la orden de pago.**
4. **Pruebas pedidas para esa parte**: aplicar después desde la cuenta del cliente (una cobranza de un cobrador y el
   saldo a favor del corte); "Recibo" en la línea de la cobranza; un cliente sin corte no ve nada nuevo. e2e con
   número propio (`npm run spec:numero`, revisando también las ramas `ci-prueba/*` remotas).
5. **Documentación**: la entrada en `docs/memoria/cuentas-corrientes.md`, en el medio.

### Un hallazgo de las mutaciones de XSS
La lista de "seguras" de `test-cobranzas-xss.js` es **por nombre de expresión**. Una entrada genérica (`linea`)
tapaba el `escCob(linea)` de otra función (`htmlTransferenciaForm`): `mut-cobranzas-xss.js` lo encontró (346/347).
Se renombró la variable nueva (`lineaAplicado`). Ahora da 347/347. En la lista quedan nombres genéricos de antes
(`html`, `cabecera`, `opciones`, `tope`…) con el mismo riesgo.

## Qué automatizaría ahora
- **La lista de seguras por nombre es frágil**: que `test-cobranzas-xss.js` acepte la entrada junto con la FUNCIÓN
  donde vive (`htmlRecienAsentada:lineaAplicado`). Así un nombre genérico no tapa otro igual en otra función.
- **El "camino A" se repite**: el pedido mezcló dos territorios y hubo que frenar, preguntar y partirlo. Propuesta:
  un chequeo previo (script) que, con la lista de archivos que nombra un pedido, diga qué subagente es dueño de cada
  uno según `.claude/agents/*`. Así se parte antes de lanzar.
- **`spec:numero` no mira las ramas remotas**: dijo "106" y el 106 ya lo tenía `ci-prueba/detalle-pago-cheques`. Se
  resolvió con un script que lee `git ls-tree` de cada `origin/ci-prueba/*`. Propuesta: que `pruebas/spec-numero.js`
  haga eso solo.
- **Las guardas redundantes las encontraron las mutaciones** (tres veces una condición repetida en dos funciones
  hacía "escapar" una mutación). Propuesta: que `mutar.js` diga, cuando una mutación escapa, si el mismo texto
  condicional aparece en otra función del archivo, para ir directo a la redundancia en vez de agregar pruebas
  inútiles.

## C. Lo hecho en Administración (`modulos/administracion.html`, 30/10/2026)

La parte B, hecha donde de verdad vive la cuenta del cliente: `#ad-cliente-cuerpo` de `administracion.html`.
Cuentas corrientes → Clientes la ve igual (iframe `?seccion=clientes&embebido=cc`). `cuentas-corrientes.html` no se
tocó. Commit encima de `f6c87c1` en la misma rama. Detalle técnico: `docs/memoria/administracion.md`, sección
"Pendientes desde el corte, aplicar y el recibo en la cuenta del cliente" (en el medio del archivo, antes de Acopios).

### Qué cambió
- **"Pendientes desde el corte"** (`#ad-pend`), entre la cabecera de la cuenta (saldo, acopios) y los movimientos:
  solo si `cliente_pendientes(cliente).activo`. "Lo que debe" (docs con pendiente > 0) y "A favor, sin aplicar"
  (créditos con libre > 0). Cada crédito: "Aplicar" (solo con `cobranzas:procesar`) y, en las cobranzas, "Recibo".
- **"Aplicar"** abre debajo del crédito el selector de Cobranzas, DUPLICADO con prefijo `Ad` (funciones `…Ad`, CSS
  `.ad-apl*`). Al abrir sugiere "Aplicar todo" con lo libre; "Solo N1 / Solo N2"; "Por medio de pago" solo en una
  cobranza. Se manda lo que ya tenía (de `recibo_cobranza(id).aplicaciones`) MÁS lo nuevo, sumado por renglón y medio.
  El error de la base, tal cual; si sale bien, se releen `cliente_pendientes` y la cuenta.
- **El hueco de la base**: en los créditos que no son cobranza, "Aplicar" solo con `aplicado = 0`; si no, el texto
  "Este crédito ya tiene una parte aplicada: para seguir aplicando falta una función de la base". No se inventó
  ninguna lectura.
- **"Recibo"** en la línea de la cobranza de la cuenta y en Pendientes: ventana `#ad-rc` con la hoja copiada
  (`.ad-rc-*`), UNA hoja A4 (compacta con más de 14 renglones), Imprimir (por `#ad-impresion`, como la nota de débito)
  y Enviar (PDF a una A4: compartir o descargar "Recibo - <CLIENTE> - dd-mm-aaaa.pdf").
- **`cuenta_cliente` NO trae el id de la cobranza** (leído con `pg_get_functiondef` el 30/10/2026: devuelve fecha,
  tipo, detalle, importe, saldo y orden_retiro_id). La línea ya lo tenía por `aparearCobranzas` (lee
  `cliente_movimientos` en el mismo orden y, si los dos listados no cierran uno a uno, no pone ninguno: nunca se
  adivina). Por eso el "Recibo" va en la línea cuando el id está apareado, y TAMBIÉN en Pendientes (en los créditos
  de tipo cobranza, con su `credito_id`), que no depende del apareo.
- Enganches mínimos en lo existente (por los choques con valorizar-legible, condicion-venta-sin-defecto,
  division-cero-y-factura, corregir-orden y cc-proveedor-una-lista): una llamada más en `htmlCuenta` (dos puntos),
  en `pintarCliente`, en el `Promise.all` de `abrirCliente` y en la inicialización. Todo lo demás es nuevo y en
  lugares que esas ramas no tocan (el CSS después del visor de fotos, la ventana después del visor, las funciones
  después de `abrirCliente`).
- Pruebas: `pruebas/test-administracion-aplicar-cobranzas.js` (157/157), `pruebas/mut-administracion-aplicar-cobranzas.js`
  (92/92 detectadas, +22 equivalentes; baseline `f6c87c1` en rojo, 12/33), `e2e/110-aplicar-cuenta-cliente.spec.js`
  (7/7; el 102 a 109 ya estaban tomados en las ramas remotas). La primera corrida de mutaciones dio 86/91: escaparon
  una lectura vieja que pisaba a la nueva, el aviso escondido, el "listo" con lo que ya tenía sin leer, el banco
  largo y una guarda redundante (`creditoAplicableAd` mira el libre, que `creditosLibresAd` ya filtra): se sumaron
  pruebas. Y `test-anclas-mutaciones` encontró que la línea de imprimir el recibo era IGUAL a la de la nota de
  débito (rompía el ancla única de `mut-retiros-imprimir-iphone.js`): se escribió distinta (`reglaA4`), sin tocar
  esa mutación. Ajustadas: `pruebas/sandbox-administracion.js` (`FUNCIONES_PENDIENTES_AD` y sus constantes en la
  base, con reemplazos que no hacen nada para copias viejas) y `pruebas/seguras-administracion.js` (las
  interpolaciones nuevas, con su motivo).

### Decidido sin consultar
1. El selector reparte solo **lo libre** del crédito; lo que ya tenía se manda tal cual, sumado. No se ofrece
   editar ni sacar lo ya aplicado (para eso haría falta otra pantalla).
2. Si no se puede leer lo que la cobranza ya tenía, o su suma no da el `aplicado` de `cliente_pendientes`, se dice
   y **no se deja aplicar** (mandar menos lo borraría).
3. Si `cliente_pendientes` falla, un aviso chico con "Volver a intentar" (como en Cobranzas), aunque el cliente no
   tenga corte: no se sabe.
4. "Recibo" en la línea solo si el cliente tiene corte (sin corte, nada nuevo), aunque `recibo_cobranza` funcione
   sin corte.
5. Leer se pide con `cobranzas:procesar` o `retiros:precios` en la fábrica elegida (la misma con la que se abre la
   cuenta).
6. El selector va adentro de la sección (debajo del crédito), no en una ventana: en el celular se lee mejor.
7. La sección se lee después de las otras cuentas, junto con los acopios: no demora la cuenta.

### Lo que no se pudo probar
- Contra la base real (solo lectura y 0 clientes con corte): las RPCs se probaron con dobles que hacen lo que dice
  `pg_get_functiondef`.
- La impresión real en papel (sí el alto en modo impresión: entra en una A4), `navigator.share` en un celular real y
  la carga de html2canvas/jsPDF desde cdnjs (la red de esta sesión no llega a cdnjs: en la prueba son dobles). Por
  eso mismo `e2e/60-cheque-rechazado` "Compartir PDF" da rojo acá (no es de este cambio: baja las librerías).
- El orden de las imputaciones "efectivas": al reescribir lo que ya tenía, sus renglones quedan con fecha nueva; si
  algún día un documento baja de monto, la base podría repartir lo efectivo distinto que antes. No pasa hoy.

### Qué automatizaría ahora
- **El traspaso nombró el archivo equivocado** (la cuenta del cliente en Cuentas corrientes) y hubo que corregirlo a
  mano. Propuesta: un script `pruebas/donde-vive.js <id o texto>` que diga en qué módulo se ARMA una pantalla
  (busca el id en el markup y en los `innerHTML`, y avisa si está dentro de un iframe embebido de otro módulo). Que
  el coordinador lo corra antes de partir un pedido.
- **Sumar una función al sandbox de Administración es a mano** (la lista, las constantes y los reemplazos para
  copias viejas). Propuesta: que `sandbox-administracion.js` acepte un bloque marcado en el HTML
  (`// ═══ SANDBOX: pendientes-ad ═══`) y extraiga todas sus funciones solo, con reemplazos generados.
- **`spec:numero` sigue sin mirar las ramas remotas** (dijo 109 y estaba tomado; el primero libre era el 110): se
  volvió a usar un script de `git ls-tree` por rama. Ya estaba propuesto arriba: es la segunda vez, así que va.
