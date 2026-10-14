# Módulos planificados

> Movido tal cual desde CLAUDE.md el 14/10/2026 (CLAUDE.md quedó como índice). Los "ver más abajo / arriba" se refieren al CLAUDE.md original: buscá con grep en docs/memoria/.

### Planificados
1. **Materia Prima — lo que falta**: la pantalla de edición de un ingreso (la columna `editado_en` y su trigger ya existen, esperándola) y el gateo de UI por tareas dentro del módulo. El alta/edición del catálogo de insumos **ya no es de este módulo**: se mudó a Stock.
2. **Cobranzas — pantalla de ASIGNACIÓN DE PAGOS.** Es la que cierra el circuito. Lo decidido y lo propuesto van separados, para que nadie construya sobre algo que todavía no se confirmó:
   - **DECIDIDO por Facu:**
     - **Genera el ingreso en la caja de EMPRESA de la unidad** que corresponda. Hoy Cobranzas no toca Caja a propósito, y este es el lugar donde eso pasa a existir.
     - ~~La unidad de negocio la pone la ASIGNACIÓN~~ — **cambió el 22/09/2026: la pone el ASENTAR** (`marcar_cobranza_asentada`), porque para pagar la deuda de una unidad con un cheque de otra primero hay que saber de quién es cada cheque. La asignación de pagos parte de esa unidad.
   - **PROPUESTO, pendiente de confirmar con Facu:**
     - **Que asignar pase la cobranza a `procesada` automáticamente**, en vez de pedir dos acciones separadas para un solo hecho.
     - **Que anular la asignación la deshaga**: revertir el ingreso de caja y devolver la cobranza a `registrada`. Si se confirma, con el mismo criterio que `anular_gasto` y la misma trampa a evitar — las dos puntas tienen que resolver la caja **igual**, o la plata entra por un camino y no vuelve por el otro.
3. Salamasa (futuro)
4. Mantenimiento de máquinas (futuro)
5. Trazabilidad de lotes (futuro)
