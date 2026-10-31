# Pedido de Facu — 30/10/2026: varios comprobantes en una cobranza, agrupados y sin repetidos

Rama: `ci-prueba/cobranza-muchos-comprobantes` (desde el origin/main más reciente, `e6e0c74`). Solo
`modulos/cobranzas.html` (más pruebas y docs). Base de datos SOLO LECTURA. No se integra, no se toma el candado
ni se corre el ensayo (lo corre quien lanzó la tarea).

Texto del pedido, tal cual:

> Primero mirá cómo funciona hoy subir comprobantes de transferencia (cob-file-comprobante-galeria / -archivo, ya
> con "multiple") y el lector ocr-cobranza-comprobantes, y reusalo: no armes otro flujo.
>
> VARIOS COMPROBANTES EN UNA COBRANZA, AGRUPADOS Y SIN REPETIDOS
>
> 1) Subir de a muchos: Yanina elige 6, 7 o más imágenes o PDF de una vez (Mercado Pago, Brubank, Banco Nación,
>    ticket de depósito en efectivo del Macro…). Se leen todas con el lector, mostrando el avance: "Leyendo 3 de
>    7…". Cada una propone medio (transferencia / depósito en efectivo), banco de origen, ordenante, fecha, importe y
>    número de operación (referencia). Si una foto trae varias operaciones, salen todas.
> 2) Resumen arriba de la lista, agrupado:
>    "Transferencias: Mercado Pago 3 · $ 450.000 — Banco Nación 2 · $ 300.000"
>    "Depósitos en efectivo: Macro 2 · $ 280.000"
>    "Total: $ 1.030.000"
>    Debajo, cada comprobante en su renglón: banco, ordenante, fecha, importe y "Op. N° 274845028", todo editable
>    como hoy.
> 3) Repetidos, antes de guardar:
>    - Antes de subir cada archivo, calculá su huella SHA-256 en el navegador (crypto.subtle.digest('SHA-256',
>      bytes) → hex en minúsculas) y mandala en cada foto de p_fotos como "sha256". La base la guarda y rechaza la
>      misma foto en otra cobranza que no esté anulada.
>    - Apenas termina la lectura, y cada vez que cambia un número de operación o un importe, llamá a
>      comprobantes_ya_cargados(p_items, p_cobranza_id). p_items: [{clave, referencia, importe, sha256}], donde
>      clave es el id local del renglón. p_cobranza_id: la cobranza que se está editando, o null. Devuelve una lista
>      con {clave, motivo ('mismo_numero' | 'misma_foto'), cobranza_id, cliente, fecha, importe, referencia,
>      cargada_por, cargada_en, estado}. (Con un pequeño retardo al tipear, y que una respuesta vieja no pise una
>      nueva.)
>    - El renglón con coincidencia se pinta en ROJO: "Ya cargada: cobranza de DUOLATE del 30/10/2026, la cargó
>      Godoy Yanina (op. 274845028, $ 928.559,01)", con un botón "Sacar" que lo quita de esta cobranza.
>      - Si coincide el número pero el importe es distinto: amarillo, "Mismo número de operación que una cobranza
>        de … con otro importe: revisalo". No bloquea.
>    - Mismo número de operación dos veces dentro de la misma tanda: rojo en el segundo.
>    - Con algún rojo, Guardar queda deshabilitado con "Sacá los comprobantes repetidos". La base igual lo frena:
>      si devuelve "ya está cargada en la cobranza de…", mostralo tal cual.

Pruebas pedidas: `pruebas/test-cobranzas-muchos-comprobantes.js`, `pruebas/mut-cobranzas-muchos-comprobantes.js`
(baseline FIJO = el commit de origin/main del que salió la rama) y `e2e/105-cobranza-muchos-comprobantes.spec.js`
(390 y 1280 px, en la maqueta). Docs en `docs/memoria/cobranzas.md` (sección en el medio) y el traspaso en
`.claude/traspasos/2026-10-30-cobranza-muchos-comprobantes.md`.
