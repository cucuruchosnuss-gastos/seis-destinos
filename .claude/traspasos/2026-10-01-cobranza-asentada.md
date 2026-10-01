# Traspaso — la cobranza ya asentada y el ingreso externo de Caja (01/10/2026)

Tag de antes: `antes-de-cobranza-asentada-2026-10-01`.

## Qué se hizo
1. **Se integró `ci-prueba/cobranzas-formas`** (las cuatro formas de pago: e-cheques, transferencias, etiquetas, Caja con `cobranza_id`). El pedido era cargar esas formas ya asentadas, así que sin esa rama no se podía. Se integró sin conflictos (salía de `1bb50c5`). **Las otras ramas del arranque siguen sin integrar** (`saldo-inicial-proveedores`, `caja-saldo-corriente`, `listas-traspaso`): ojo, `caja-saldo-corriente` toca `caja.html`, que ahora cambió.
2. **Cobranzas, con `cobranzas:procesar`:** primero la empresa, después un cliente activo de esa empresa (`buscar_clientes` con `p_unidad_negocio_id`), con el Taller el proyecto, y al guardar `cargar_cobranza_asentada`. Aviso "Cobranza asentada · J&M (Dolce Pasta) · $ … · quedó debiendo $ …". Sin `procesar`, como siempre.
3. **Caja:** "Ingreso externo (préstamos, aportes)" solo para super_admin con la tarea explícita; en chico debajo del título "La plata de un cliente se carga en Cobranzas"; los ajustes (`ingreso_ajuste` / `egreso_ajuste`) como "Ajuste", en gris y sin editar.
4. **`pruebas/test-ids-unicos.js`**: el buscador nuevo nació con el id `cob-buscar-cliente`, que ya era el del buscador del listado. Las suites daban verde (DOM falso); lo vio el recorrido de la maqueta (`e2e/18`). Ahora una prueba revisa todos los HTML.

## Verificado contra la base (01/10/2026, solo lectura)
- `cargar_cobranza_asentada` (10 parámetros, `p_proyecto_id` default null): exige `procesar` y cliente activo; reintento con el mismo `p_id` ya asentado → `{id, reintento: true}`; si no, `guardar_cobranza_completa` + `asentar_cobranza` → `{importe, saldo_cliente, id, asentada}`.
- `guardar_cobranza_completa` le avisa a la base que trae transferencias (`sd.cobranza_trae_transferencias`): **una cobranza solo con transferencias ahora entra** (el hueco 3 de la rama de formas está cerrado en la base).
- `registrar_ingreso_externo_caja` exige `rol_app = 'super_admin'` y además la tarea explícita.
- `caja_movimientos_tipo_check` tiene `ingreso_ajuste` y `egreso_ajuste`.

## Decisiones tomadas sin preguntar
- **El proyecto del Taller es obligatorio de elegir** cuando el cliente tiene proyectos, con "Ninguno en particular" como opción (el pedido decía "pedir el proyecto"; la base lo acepta null). Sin permiso del Taller o sin proyectos, va sin proyecto y se dice.
- **"Ingreso externo" pide super_admin Y la tarea** (lo mismo que la base): un super_admin sin la tarea tampoco lo ve, porque la base lo rechazaría.
- **El chip del movimiento sigue diciendo "Ingreso externo"** (corto); el botón y el título del modal dicen el nombre largo.
- **Las empresas no aparecen hasta saber cuál es la fábrica de pruebas** (si no, una cuenta real la vería un instante).
- El importe del aviso usa `formatearImporte` ("$ 100.000,00", con centavos).

## Lo que NO se probó
- **Nada con sesión real ni contra la base**: las suites corren contra un doble y `e2e/18` contra la maqueta.
- Falta, con la cuenta de Yanina: cargar una cobranza de Dolce Pasta con efectivo y una transferencia, ver el aviso con el saldo, ver el movimiento en la caja de efectivo y en el banco de Dolce Pasta, y que en "Cobranzas por asentar" no aparezca. Una del Taller con proyecto. Cortar la señal al guardar y ver que se sube sola sin duplicar.
- Con la cuenta de Emanuel: que siga escribiendo el cliente y la cobranza quede por asentar.
- En Caja, con Pablo: el botón nuevo; con un usuario con la tarea y sin super_admin: que no lo vea.

## Guion para Facu
1. Entrá a Cobranzas → "+ Nueva cobranza": tiene que pedir la empresa (las cuatro, sin "Pruebas").
2. Tocá Dolce Pasta: aparece la lista de clientes de Dolce Pasta. Buscá "jm", elegí J&M.
3. Cargá un efectivo y "Guardar y asentar": tiene que decir "Cobranza asentada · J&M (Dolce Pasta) · $ … · quedó debiendo $ …".
4. En Caja → Empresa: el efectivo aparece como "Cobranza de J&M". Arriba, "Ingreso externo (préstamos, aportes)".

## Qué automatizaría ahora
- **La tarea repetida más cara de hoy fue sumar las funciones nuevas a la lista de cada suite que arma el formulario de Cobranzas** (cuatro suites con su propia lista de funciones; un `ReferenceError` en cada una). Lo siguiente: que `construirCon` siga solo las llamadas (armar el sandbox con TODAS las declaraciones del script, en vez de una lista a mano), así una función nueva no rompe suites que no la prueban.
- `test-ids-unicos.js` mira el HTML estático; podría sumar los ids de las plantillas del JS que se dibujan en el mismo contenedor.
