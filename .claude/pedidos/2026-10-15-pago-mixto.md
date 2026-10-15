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

(el detalle va en `.claude/traspasos/2026-10-15-pago-mixto.md` dentro de la rama)

**15/10/2026 — hecho en `ci-prueba/pago-mixto` (`240b4b9` + memoria `3ddbace`), sin integrar.** Verificado en la base (15/10, solo lectura): `pagar_proveedor_con_cheques_cartera` acepta cheques de otra empresa e inserta en `movimientos_entre_unidades`; la policy de `cobranzas` es "propias o `cobranzas:ver_todo`" (sin `ver_todo` se ven solo los cheques de las cobranzas propias; hoy quien paga lo tiene). "Cheques de la cartera" lista los de todas las empresas agrupados (la que paga primero), con "de Dolce Pasta" y el aviso de Entre empresas; "Completar con" efectivo o transferencia por el resto; resumen antes de confirmar; dos pagos en orden (cheques con las facturas más viejas, después el resto); si el resto falla, "Los cheques ya quedaron pagados… Falta registrar el resto" y solo se reintenta el resto. Pruebas: `test-cuentas-corrientes-pago-mixto` 120/120 (mut 86/86 + 4 equivalentes), suites del módulo actualizadas en verde, `e2e/49-pago-mixto` 8/8 (0/8 contra `main`), `npm run pruebas` 264/264, GitHub Pruebas + Navegador en verde. **Para el chat de la base (opcional):** una RPC `pagar_proveedor_mixto` que haga los dos pagos en una sola transacción. Se une sin conflictos con las otras dos ramas del día.
