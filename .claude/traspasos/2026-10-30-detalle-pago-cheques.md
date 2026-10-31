# Traspaso — Cuentas corrientes: el detalle del pago con sus cheques; sacar y agregar cheques (30/10/2026, rama `ci-prueba/detalle-pago-cheques`)

Para el chat de arquitectura. Quien lo recibe no vio el trabajo.

## El pedido (Facu, 30/10/2026; pegarlo en `.claude/pedidos/2026-10-30-detalle-pago-cheques.md`)
> DETALLE DEL PAGO A PROVEEDOR
> 1) La ventana "Detalle del pago" queda en DOS COLUMNAS iguales (en el celular, una abajo de la otra):
>    - Izquierda, "Con qué se pagó": el total, la fecha y, si fue con cheques de terceros, la LISTA de cheques. Uno por renglón: banco (nombre desde bancos_bcra), N°, importe, fecha de pago, a nombre de quién (titulares) y de qué cliente vino (la cobranza). Se leen de cobranza_cheques donde coalesce(pago_gasto_id, salida_gasto_id) = el gasto. Abajo, el crédito a favor que sobró, como hoy.
>    - Derecha, "Facturas que paga": como hoy.
>    Hoy los cheques salen como texto corrido ("N° 68994157, N° 00000042…") sin importes: eso se va.
> 2) En cada cheque, un botón "Sacar del pago" (solo con cuentas_corrientes:registrar_pago Y cobranzas:procesar):
>    - Pide el motivo (ej. "El proveedor no lo aceptó: tiene rechazos").
>    - Antes de confirmar, muestra qué va a pasar: el pago baja de $ X a $ Y; sale $ Z del crédito a favor; $ W vuelve a deberse en la factura N; el cheque vuelve a la cartera.
>    - Confirma con sacar_cheque_de_pago(p_cheque_id, p_motivo), que devuelve {pago_antes, pago_despues, del_credito, vuelve_a_facturas, pago_anulado}. Si pago_anulado es true (era el único cheque), avisá "El pago quedó anulado".
>    - Después de sacarlo, se relee la ventana y la cuenta del proveedor.
> 3) Si el gasto tiene observaciones (ahí queda anotado qué cheque se sacó y por qué), mostralas abajo del total.
> 4) "Agregar cheque" en la columna izquierda del detalle de un pago con cheques (mismos permisos que "Sacar del pago"):
> - Abre la lista de cheques EN CARTERA (procesados, en pesos), con banco, N°, importe, fecha de pago y cliente, y un buscador por número o importe.
> - Se pueden elegir varios. Antes de confirmar, la vista previa: el pago sube de $ X a $ Y; $ Z completa la factura N que este pago cubría; $ W queda como crédito a favor.
> - Motivo opcional (ej. "Reemplaza al cheque N° 16603539").
> - Confirma con agregar_cheques_a_pago(p_gasto_id, p_cheque_ids uuid[], p_motivo), que devuelve {pago_antes, pago_despues, a_facturas, credito_a_favor}.
> - Para reemplazar un cheque se hace en dos pasos: "Sacar del pago" del viejo y "Agregar cheque" del nuevo. Después de sacar uno, ofrecé "¿Lo reemplazás por otro de la cartera?", que abre la misma lista.
> PRUEBAS: pago con 5 cheques muestra la lista con importes; "Sacar del pago" muestra la vista previa y llama al RPC; con un solo cheque avisa que se anula; sin permisos no aparece el botón; agregar un cheque completa la factura y el sobrante queda como crédito; reemplazo (sacar + agregar) deja el pago y la factura bien.

## Qué cambió y por qué
Solo `modulos/cuentas-corrientes.html` (más pruebas, maqueta y doc). El modal "Detalle del pago":
- **Dos columnas iguales** (`.detalle-pago-columnas`, desde 720 px; el modal pasa de 480 a 920 px en la compu; en el celular, una abajo de la otra): "Con qué se pagó" (total, "fecha · Cheques de terceros (N)", "Este pago está anulado." si lo está, las **observaciones del gasto**, la **lista de cheques** y el crédito que sobró) y "Facturas que paga" (como antes).
- **Los cheques**: uno por renglón con banco (de `bancos_bcra`), importe, N°, "paga dd/mm" o "a la vista dd/mm", "A nombre de" los titulares y "De" el cliente (`v_cobranzas.cliente`). Se leen con dos consultas (`pago_gasto_id` y `salida_gasto_id` = el gasto), sin repetir, ordenados por número. Sin permiso para leerlos (la policy de `cobranza_cheques` pide ver su cobranza: propia o `cobranzas:ver_todo`) se dice y queda la etiqueta vieja. El texto corrido sin importes se fue.
- **"Sacar del pago"** (con `cuentas_corrientes:registrar_pago` Y `cobranzas:procesar`, bypass de super_admin, nunca en un pago anulado): motivo obligatorio (3 letras o más, sin llamar si falta, el mismo texto que la base), la vista previa y `sacar_cheque_de_pago`. El resultado de la base en un aviso verde; con `pago_anulado`, "El pago quedó anulado (era el único cheque)…" + toast "El pago quedó anulado"; si el pago sigue, "¿Lo reemplazás por otro de la cartera?".
- **"+ Agregar cheque"** (mismos permisos, solo `medio_pago = 'cheque'`): la cartera con las mismas reglas que el pago (`chequesParaPagar`: en cartera, cobranza asentada, en pesos, con empresa; sin la fábrica de pruebas), buscador por número o importe, varios tildados, vista previa (incluye el aviso de deuda entre empresas si el cheque es de otra), motivo opcional (vacío viaja null) y `agregar_cheques_a_pago`.
- **La vista previa se calcula en el navegador** porque la base no tiene una función de "simular" (busqué en `pg_proc`: no hay). Repite, en centavos, el orden exacto del SQL: sacar = primero el crédito `disponible` que dejó ese pago (el más nuevo primero), después las aplicaciones de la más nueva a la más vieja (a igual fecha, la de menor monto); agregar = las facturas que ese pago ya cubría con saldo y estado pendiente/parcial, de la más vieja (fecha_factura, created_at) a la más nueva, y el resto a favor. Lo que manda es la respuesta del RPC, que se muestra al terminar.
- Errores de la base tal cual, pegados al botón; doble toque manda una vez; después de cada cambio se relee el detalle y la cuenta (`refrescarCuentaTrasCambioPago`: `cargarSaldos` y, con la ficha abierta, saldos, movimientos, créditos y banner).
- "Ampliar" copia también las observaciones y los cheques; su grilla se llama "Facturas que paga".

## Qué se verificó y contra qué (todo SELECT, 30/10/2026; nada se escribió en la base)
- `pg_get_functiondef('sacar_cheque_de_pago(uuid,text)')` y `('agregar_cheques_a_pago(uuid,uuid[],text)')`: SECURITY DEFINER; las dos piden `tiene_tarea('cuentas_corrientes','registrar_pago')` y `tiene_tarea('cobranzas','procesar')`; los mensajes, el orden del reparto, que agregar exige `medio_pago = 'cheque'` y cheques en cartera de cobranzas procesadas en pesos, y los jsonb que devuelven.
- `pg_policies`: `cobranza_cheques: leer si ve la cobranza`, `cobranzas: leer propias o con ver_todo`, `bancos_bcra: leer` (true).
- Suites: `test-cuentas-corrientes-detalle-pago-cheques.js` 117/117 (ejecuta el código real; la base falsa aplica las dos funciones con la lógica del SQL, así el reemplazo sacar + agregar se verifica de punta a punta y la vista previa tiene que coincidir con lo que hace la "base"); `mut-cuentas-corrientes-detalle-pago-cheques.js` 78/78 + 8 equivalentes justificadas. Ajustadas y en verde: `test-cuentas-corrientes-xss.js` (lista de seguras con las funciones nuevas), `mut-cuentas-corrientes-xss.js` 123/123 (las funciones nuevas en lugar de `abrirModalDetallePago`), `test-cuentas-corrientes-proveedores.js` (sus funciones vía `pruebas/detalle-pago-comun.js`), `mut-ampliar-pantallas.js` 44/44. `node pruebas/check-scripts.js` OK. `e2e/106-detalle-pago-cheques.spec.js` 6/6 (390 y 1280 px). `e2e/78-ampliar.spec.js`: los dos casos de **Gastos** fallan también sobre `origin/main` (`e6e0c74`) en este contenedor; no son de este cambio (no toca Gastos).

## Qué tocar en la documentación
- `docs/memoria/cuentas-corrientes.md`: YA tiene la sección "EL DETALLE DEL PAGO EN DOS COLUMNAS, CON SUS CHEQUES; SACAR Y AGREGAR CHEQUES (30/10/2026…)" debajo de "AMPLIAR" (en el medio del archivo). Revisarla al integrar.
- `docs/memoria/cheques.md` (si describe dónde se ve un cheque usado en un pago): sumar que desde Cuentas corrientes → Detalle del pago se puede sacar un cheque de un pago (vuelve a la cartera) y agregar cheques de la cartera a un pago existente.
- `CLAUDE.md`: nada.
- Para el chat de permisos: nada que hacer (sin tareas nuevas). Informativo: sacar/agregar cheques de un pago pide `cuentas_corrientes:registrar_pago` + `cobranzas:procesar` (las dos con bypass de super_admin, como la base).

## Decidido sin consultar
- La vista previa en el navegador (no hay función de simular).
- "+ Agregar cheque" solo en pagos con `medio_pago = 'cheque'` (la base rechaza los otros).
- Sin permiso para leer los cheques, se dice y queda la etiqueta vieja ("Cheques de la cartera N° …").
- Después de agregar no se ofrece "reemplazar".

## Qué automatizaría ahora
Las dos funciones de la base (sacar y agregar) las tuve que reescribir en JS dentro de la suite para probar el reemplazo de punta a punta y que la vista previa coincida. Si la base sumara `simular_sacar_cheque(p_cheque_id)` y `simular_agregar_cheques(p_gasto_id, p_cheque_ids)` (mismo cuerpo, sin escribir), la pantalla mostraría la vista previa EXACTA de la base y la suite no necesitaría una copia de la lógica: es el pedido para el chat de la base que más horas ahorra en la próxima corrección de estos repartos.
