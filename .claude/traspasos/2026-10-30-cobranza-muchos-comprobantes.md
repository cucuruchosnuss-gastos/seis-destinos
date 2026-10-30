# Traspaso — 30/10/2026: varios comprobantes en una cobranza, agrupados y sin repetidos

Para el chat de arquitectura (dueño de CLAUDE.md y de `docs/memoria/`). Autocontenido: quien lo lee no vio el
trabajo.

## Qué cambió y por qué

Rama `ci-prueba/cobranza-muchos-comprobantes`, salida de `origin/main` = `e6e0c74`. Pedido:
`.claude/pedidos/2026-10-30-cobranza-muchos-comprobantes.md`. Yanina recibe 6, 7 o más comprobantes por cobranza
(Mercado Pago, Brubank, Nación, tickets de depósito del Macro) y hacía falta: verlos agrupados y que un comprobante
ya cargado se vea ANTES de guardar.

Solo `modulos/cobranzas.html` (más pruebas, la maqueta y docs). **Se reusó el flujo de hoy**: los mismos inputs
`cob-file-comprobante-galeria` / `-archivo` con `multiple`, `agregarFotos` → `procesarFoto` → `leerComprobante`,
la fila de a uno `esperarTurnoDelLector` y el mismo lector `ocr-cobranza-comprobantes` (sigue habiendo UNA sola
llamada en el archivo). Lo nuevo:

1. **Avance** "Leyendo 3 de 7…" arriba de las miniaturas (`textoAvanceLector`, `data-avance-lector`, `role="status"`),
   con "Sin señal: van N de M…" y "Listo: se leyeron los 7 comprobantes…". La tanda vive en
   `estado.tandaLector[tipo] = { formId, total, fotos }`. Con un solo archivo no dice nada.
2. **Resumen agrupado** `#cob-resumen-transferencias` (con 2 o más): "Transferencias: Mercado Pago 3 · $ 450.000,00 —
   Banco Nación 2 · $ 300.000,00", "Depósitos en efectivo: Macro 2 · $ 280.000,00", "Total: $ 1.030.000,00"
   (`gruposDeTransferencias`: por medio y por banco, sin distinguir mayúsculas ni espacios, en el orden en que
   aparecen, en centavos). Cada tarjeta lleva arriba su renglón "banco · quién · fecha · importe · Op. N° X"
   (`data-transf-linea`); todo sigue editable.
3. **Huella SHA-256** de cada archivo (`huellaSha256` / `huellaDeArchivo`, `crypto.subtle.digest`, hex minúsculas)
   sobre los bytes del archivo ORIGINAL; va en `p_fotos[].sha256` solo en las fotos nuevas (también las de cheques).
4. **Repetidos antes de guardar** con `comprobantes_ya_cargados(p_items, p_cobranza_id)`: al terminar cada lectura,
   al cambiar número o importe (400 ms) y al abrir un borrador o edición con transferencias; con turno; se guarda qué
   se preguntó por tarjeta para que una coincidencia vieja deje de aplicar si cambió el número o el comprobante.
   ROJO (bordó, con "Sacar") = misma foto, o mismo número con mismo importe, o el mismo número / mismo archivo que una
   tarjeta anterior de la tanda (rojo en la segunda). AMARILLO (`cob-aviso--revisar`, no bloquea) = mismo número con
   otro importe. Con algún rojo, Guardar deshabilitado con "Sacá los comprobantes repetidos.". Si la pregunta falla,
   aviso neutro `#cob-repetidos-aviso` y no bloquea. El rechazo de la base se muestra tal cual (camino de siempre).
5. La maqueta (`e2e/maqueta/supabase-falso.js`) acepta una rpc en vivo como función:
   `globalThis.__maqueta.rpc.<nombre> = (params) => respuesta | Promise`.

## Qué se verificó y contra qué (30/10/2026, base nuss-central, solo SELECT)

- `pg_get_functiondef('comprobantes_ya_cargados(jsonb,uuid)')`: SECURITY DEFINER, `search_path` public, exige
  `mi_empleado_id()` y `cobranzas:procesar` / `cargar` / `ver`; normaliza la referencia (`upper`, solo `[0-9A-Z]`,
  desde 4) y la huella (`lower(btrim)`); devuelve `{clave, motivo, cobranza_id, cliente, fecha, importe, referencia,
  cargada_por, cargada_en, estado}`, sin anuladas ni `p_cobranza_id`. Para `misma_foto`, `importe` y `referencia`
  vienen null. Grants: `authenticated` EXECUTE.
- `pg_get_functiondef('_cobranza_escribir_detalle(uuid,jsonb,jsonb)')`: inserta `cobranza_fotos.sha256` y rechaza
  "Esa foto ya está cargada en otra cobranza (<cliente> del DD/MM/AAAA). Sacala o anulá la otra." (solo fotos nuevas;
  una que ya está en la base hace `continue` antes).
- `pg_get_functiondef('_cobranza_escribir_transferencias(uuid,jsonb)')`: rechaza "Hay dos transferencias con el
  mismo número de operación en esta cobranza." y "Esa transferencia ya está cargada en la cobranza de <cliente> del
  DD/MM/AAAA (operación N, $ M). No se carga dos veces." (mismo número Y mismo importe en otra no anulada).
- `information_schema.columns`: `cobranza_fotos.sha256 text`, `cobranza_transferencias.referencia_norm` generada.
  `pg_indexes`: `cobranza_fotos_sha256_idx` (parcial) y `cobranza_transferencias_ref_norm_idx` (parcial).
- El lector: `leerComprobante` lo llama con `supabase.functions.invoke('ocr-cobranza-comprobantes', { body: {
  storage_path, tipo } })`, de a uno; no se tocó.

## Qué hay que tocar en la documentación

- `docs/memoria/cobranzas.md`: **ya está escrito en esta rama** (sub-entrada "VARIOS COMPROBANTES EN UNA COBRANZA…",
  insertada en el medio, después de "V2 DEL LECTOR" y antes de "LA COBRANZA YA ASENTADA"). Revisarla al integrar.
- `docs/memoria/estilo-visual.md` / la escala de avisos de Cobranzas: ahora hay UNA excepción amarilla,
  `.cob-aviso--revisar` (tokens `--amarillo*` de main.css), pedida por Facu. Si se documenta la escala en otro lado,
  sumarla.
- `docs/memoria/pruebas-y-ensayo.md` (maqueta): una rpc en vivo puede ser una función que recibe los parámetros.
- `docs/memoria/administracion.md`: nada que cambie para Administración (las tablas se escriben igual; `sha256` lo
  pone la base). Cheques: sin impacto.

## Decidido sin consultar

- **Amarillo**: el módulo había retirado el ámbar (rediseño 3.4, 21/09/2026: "con el naranja quedaba a un paso y
  dejaba de leerse como aviso") y el caso análogo de cheques (mismo número en otra cuenta) se pinta NEUTRO. Facu pidió
  amarillo explícito, así que se implementó como única excepción, acotada en el test. Si al verlo se confunde con el
  naranja del módulo, volverlo a neutro es cambiar una clase.
- La huella es del archivo ORIGINAL, no del JPEG comprimido que se sube (más robusta para "la misma foto otra vez").
- La huella va también en las fotos de cheques del chofer (la base las rechaza igual si se repiten en otra cobranza).
- El resumen aparece con 2 o más transferencias, en el orden en que aparecen (no por importe).
- Mismo número sin importe todavía cargado: amarillo (no se sabe si es el mismo).
- Además de lo pedido: el mismo archivo elegido dos veces en la misma cobranza (misma huella, otra foto) es rojo en el
  segundo, aunque el lector no haya leído número.
- Al abrir un borrador o una edición con transferencias también se pregunta (lo sabido no viaja en el borrador).

## Lo que no se pudo probar

- Contra la base real (la sesión es de solo lectura): la llamada a `comprobantes_ya_cargados` y los rechazos se
  probaron con dobles que responden lo que dice `pg_get_functiondef`.
- El cálculo de la huella en un celular real (en la maqueta y en Node sí, con `crypto.subtle` de verdad).

## Pruebas

- `pruebas/test-cobranzas-muchos-comprobantes.js`: 106/106. `pruebas/mut-cobranzas-muchos-comprobantes.js`: 67/67
  (+4 equivalentes), baseline `e6e0c74` en rojo.
- Mutaciones vecinas, en verde después del cambio: `mut-cobranzas-ocr-tickets.js` 33/33,
  `mut-cobranzas-echeque-pdf.js` 32/32, `mut-cobranzas-formas.js` 75/75, `mut-cobranzas-cuatro-botones.js` 54/54
  (+3 equivalentes: se sumaron `escCob(tipo)` y `escCob(avance)` de `htmlComprobantes`, que no llevan nada
  escapable). El código nuevo se acomodó para NO romper anclas de mutaciones existentes (`test-anclas-mutaciones.js`
  245/245).
- Ajustadas: `test-cobranzas-xss.js` (seguras nuevas con motivo; el chequeo "no queda ámbar" permite solo
  `.cob-aviso--revisar`) y `test-cobranzas-escritorio.js` (las reglas CSS nuevas en ENTRARON). `pruebas/sandbox.js`:
  las funciones nuevas en `FUNCIONES_PAGO` y dos constantes en `CONSTANTES_PAGO`.
- `e2e/105-cobranza-muchos-comprobantes.spec.js`: 2/2 (1280 y 390). También en verde 18, 41 y 94.
- **`e2e/94-cobranzas-ocr-tickets.spec.js` se ajustó**: subía tres veces la MISMA imagen (mismos bytes), y ahora eso
  es "lo elegiste dos veces" (rojo) y Guardar no se habilita. Cada imagen lleva bytes propios después del final del
  PNG. Es el comportamiento pedido, no una regresión.

## Qué automatizaría ahora

- **Lo más caro que se repitió**: cada función nueva del formulario de Cobranzas obliga a sumarla a mano en
  `pruebas/sandbox.js` (y en las listas `FUNCIONES` de cada suite) o las suites viejas que llaman a
  `motivosParaNoGuardar` revientan con ReferenceError. Propuesta: que el sandbox extraiga, además de las nombradas,
  todas las funciones que ellas llaman (cierre transitivo sobre los identificadores del script), así una suite nombra
  solo lo que prueba.
- **Las listas de "seguras" del escáner XSS** se escriben a mano con la expresión literal (incluida una plantilla
  entera). Propuesta: que `clasificar.js` acepte una marca en el código (`/* seguro: motivo */` al lado de la
  interpolación) y el test la lea, así el motivo vive junto al código y no se desincroniza.
- **Un doble de la base que lea las firmas reales**: un script que, con `pg_get_functiondef`, genere el texto exacto
  de los `raise exception` de las RPCs de Cobranzas a un JSON de fixtures, para que las suites y la maqueta usen los
  mensajes verdaderos y den rojo si la base los cambia.
