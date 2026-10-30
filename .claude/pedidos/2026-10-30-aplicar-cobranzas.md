# Pedido de Facu — 30/10/2026: aplicar las cobranzas a lo que debe el cliente, y el recibo

Rama: `ci-prueba/aplicar-cobranzas`, sale de `origin/ci-prueba/cobranza-muchos-comprobantes` (`1aa4b4e`): las
dos tocan `modulos/cobranzas.html` y esta se integra después de aquella. Spec `e2e/108-aplicar-cobranzas.spec.js`.
Base de datos SOLO LECTURA. No se integra, no se toma el candado ni se corre el ensayo.

**Alcance acordado con el coordinador (camino A):** el subagente de Cobranzas hace SOLO lo que vive en
`modulos/cobranzas.html` (punto 1 y el recibo del punto 3). `modulos/cuentas-corrientes.html` no es territorio
de Cobranzas: el punto 2 (y el botón "Recibo" de la cuenta del cliente) va por traspaso, en la sección
"PARA CUENTAS CORRIENTES" de `.claude/traspasos/2026-10-30-aplicar-cobranzas.md`.

Texto del pedido, tal cual:

> La base ya tiene:
> - cliente_pendientes(p_cliente_id) → {activo, imputa_desde, saldo_cuenta, docs[{doc_tipo, doc_id, parte
>   ('N1'|'N2'|'total'), etiqueta (ej. "N1-0042", "Saldo de corte 02/11/2026", "Nota de débito N-ND-0001"), fecha,
>   monto, aplicado, pendiente}], creditos[{credito_tipo ('cobranza'|'corte'|'movimiento'|…), credito_id, etiqueta,
>   fecha, monto, aplicado, libre, medios{cheque, transferencia, efectivo}, aplicado_por_medio}]}. Los docs ya
>   vienen ordenados del más viejo al más nuevo.
> - sugerir_aplicacion(p_cliente_id, p_monto, p_parte default null ('N1'|'N2')) → {items[{doc_tipo, doc_id, parte,
>   etiqueta, monto}], sobra}
> - aplicar_credito_cliente(p_cliente_id, p_credito_tipo, p_credito_id, p_items jsonb[{doc_tipo, doc_id, parte,
>   monto, medio ('cheque'|'transferencia'|'efectivo'|null)}]) → {aplicado, a_cuenta}. Reemplaza lo que ese pago
>   tenía aplicado.
> - recibo_cobranza(p_cobranza_id) → {empresa, cliente{…, solo_n2}, fecha, cheques[], transferencias[], efectivo,
>   medios, total, aplicaciones[{etiqueta, parte, monto_doc, aplicado, medios}], a_cuenta, saldo_cuenta}
> Solo funciona para clientes con corte (activo = true). Sin corte: no muestres nada nuevo.
>
> 1) AL ASENTAR UNA COBRANZA (solo quien tiene cobranzas:procesar; los cobradores siguen igual), si el cliente tiene
> corte, en la misma pantalla, después de cargar cheques, transferencias y efectivo:
> - Lista de PENDIENTES del cliente (docs con pendiente > 0): etiqueta, fecha, monto, pendiente y un campo "Aplicar".
> - Dos modos:
>   a) "Aplicar todo" (por defecto): reparte el total con sugerir_aplicacion, del más viejo al más nuevo (el último
>      queda parcial). Botones rápidos "Solo N1" / "Solo N2" (p_parte).
>   b) "Por medio de pago": un bloque por medio que haya en la cobranza (Cheques $ X, Transferencias $ Y, Efectivo
>      $ Z). Cada uno se reparte en los renglones que se elijan (con su propio "sugerir" y "Solo N1 / Solo N2"), y
>      los items van con su "medio".
> - Arriba, siempre a la vista: Total cobrado / Aplicado / Queda a cuenta. No deja aplicar a un renglón más que su
>   pendiente, ni con un medio más que lo cobrado con ese medio (la base igual lo frena: mostrá su mensaje tal cual).
> - Guardar asienta la cobranza como hoy y después llama a aplicar_credito_cliente('cobranza', <id de la cobranza>,
>   items).
> - Después ofrece "Ver / enviar recibo".
> 2) EN LA CUENTA DEL CLIENTE (cuentas-corrientes.html):
> - Una pestaña o sección "Pendientes" con cliente_pendientes: los renglones con su pendiente y los pagos con algo
>   "a cuenta" (libre > 0), cada uno con "Aplicar", que abre el mismo selector del punto 1 para ese crédito. Sirve
>   también para el saldo a favor del corte y para cobranzas cargadas por los cobradores.
> - En la línea de cada cobranza, "Recibo".
> 3) RECIBO (A4, UNA sola hoja, mismo estilo que la ORDEN DE PAGO):
> - Logo y datos de la empresa; título "RECIBO" centrado y grande; cliente, CUIT y fecha.
> - Izquierda, "Con qué pagó": bloques Cheques (banco corto, N°, tipo, emisión, vence, importe), Transferencias
>   (cuenta, banco de origen, N° operación, fecha, importe) y Efectivo; solo los que existan.
> - Derecha, "Qué cancela": los renglones aplicados con su etiqueta (N1-0042, N2-0042, Saldo de corte…), monto del
>   renglón y lo aplicado.
> - Totales en dos cajas a la misma altura: izquierda, un subtotal por medio y TOTAL COBRADO; derecha, TOTAL
>   APLICADO. Franja con "Queda a cuenta del cliente $ X" si sobra.
> - Al pie, una sola línea: "Saldo de la cuenta: $ X a pagar" (o "a favor del cliente") con saldo_cuenta.
> - Si cliente.solo_n2 es true: no muestres nada que diga N1 (los renglones N1 no existen para esos clientes, pero
>   verificalo).
> - "Enviar": navigator.share con el PDF o descarga "Recibo - <CLIENTE> - <dd-mm-aaaa>.pdf".
> PRUEBAS: aplicar todo (el último queda parcial); por medio (cheques a N2, transferencia a N1); medio excedido
> muestra el error; queda a cuenta; aplicar después desde la cuenta del cliente; recibo con los tres medios y con un
> solo medio; cliente sin corte no ve nada nuevo. Ensayo y CI en verde. Integración de noche (23:36 a 05:30), con
> auditoría del .patch.

Indicaciones del coordinador: el selector del punto 1 y el de la cuenta del cliente son el mismo comportamiento en
dos módulos: se duplica (nada en `js/` compartido sin preguntar). El PDF, con html2canvas + jsPDF de cdnjs como
otros módulos. Para el recibo, copiar el estilo de la orden de pago impresa sin modificarla.
