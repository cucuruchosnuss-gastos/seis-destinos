# Pedido del 15/10/2026 — Cuentas corrientes: pagar a un proveedor con cheques de cualquier empresa y con medios combinados (rama `ci-prueba/pago-mixto`)

**No toca `produccion.html` (la tablet): se integra cuando Facu autorice.** Si la sesión se compacta, se retoma desde este archivo.

## El pedido (tal cual llegó)

Base (ya cambiada hoy): pagar_proveedor_con_cheques_cartera(p_proveedor_id, p_unidad_negocio_id, p_cheque_ids, p_fecha, p_aplicaciones) YA acepta cheques en cartera de OTRA empresa; por cada uno inserta en movimientos_entre_unidades (acreedora = empresa dueña del cheque, deudora = la que paga), y aparece en movimientos_entre_empresas. Verificalo con pg_get_functiondef antes de usar.

1) En modulos/cuentas-corrientes.html, medio "Cheques de la cartera": listar los cheques EN CARTERA de TODAS las empresas (cobranzas procesadas, en pesos), agrupados por empresa, primero la del proveedor. Los de otra empresa con la etiqueta "de Dolce Pasta" y, al tildarlos, el aviso: "Este cheque es de Dolce Pasta: queda como deuda de Cucuruchos Nuss con Dolce Pasta (Entre empresas)".
2) Pago mixto en un solo formulario: además de los cheques tildados, permitir "Completar con" efectivo o transferencia (cuenta) por el resto. Al confirmar: primero pagar_proveedor_con_cheques_cartera con las aplicaciones que cubren los cheques (facturas más viejas primero, como hoy), después registrar_pago_proveedor por el resto aplicado a lo que quedó. Si el segundo falla, avisar claro que los cheques ya quedaron pagados y que falta registrar el resto (no reintentar solo los cheques).
3) Resumen antes de confirmar: "Cheques $X (N cheques, 1 de Dolce Pasta) + Efectivo $Y = $Z aplicado a facturas …".
4) Errores de la base tal cual.

Pruebas: unitaria del reparto de aplicaciones entre los dos pagos y del agrupado por empresa; e2e a 1280, 390, 360 y tablet (cheques de dos empresas + efectivo, y que el segundo pago falle); mutaciones. No toca produccion.html: se integra cuando Facu autorice.

## Avance

(se completa al cerrar; el detalle va en `.claude/traspasos/2026-10-15-pago-mixto.md` dentro de la rama)
