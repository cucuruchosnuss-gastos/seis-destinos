# Revisión en el celular — 10/10/2026 (rama `ci-prueba/revision-celular`)

Pedido de Facu del 10/10/2026, paso 3: recorrer TODAS las pantallas en el
celular (360×780 y 390×844), listar lo que se corta, se encima o se sale, y
arreglar con CSS lo simple. La planta (`modulos/produccion.html`) quedó afuera:
la arregla `ci-prueba/planta-360` en paralelo.

## Cómo se recorrió

Un script de una sola vez (en el scratchpad, no en el repo) abrió en Chromium,
con la maqueta (`e2e/maqueta`, sin sesión ni base), **103 vistas por ancho**:
dashboard (tablero, Personalizar, acomodar, Mi cuenta, hoja "Más", menú del
usuario), Gastos (lista, wizard con y sin foto, facturas sin gasto), Caja
(listado, mi caja, egreso, traspaso, cuenta nueva, retiros, todos, directorio,
Empresa), Cobranzas (lista, detalle, nueva, con formas abiertas),
Administración (portada, cobranzas, asentar, órdenes, una orden, valorizar,
revisar, clientes, un cliente, ficha, listas, una lista, importar, cheques,
emitidos, errores, seguridad), Cuentas corrientes (proveedores, pendientes,
historial, ficha, pago, padrón, agregar proveedor), Ingreso (lista, detalle,
wizard, datos, internos), Stock (lista, detalle, catálogo, insumo nuevo, alias,
recuento, historial, mermas, tránsito, corregir, enviar, traspaso, costos y la
lista con costos), Pedidos (lista, detalle, clientes, nuevo), Órdenes de retiro
(inicio, orden, renglón), Taller (lista, ficha, editor, diagrama), Empleados
(lista, ficha), Accesos, la gestión de Producción (tabla, indicadores,
pendientes, planillas, stock, menú, personal, conos, productos, recetas,
máquinas) y las de auth (login, registro, recuperar, restablecer; servidas sin
maqueta).

En cada una midió: scroll de costado de la página; elementos que se salen de la
pantalla (sin un contenedor que scrollee a propósito); texto que no entra en su
caja (sin contar los que scrollean ni los "…" con `title`); controles cuyo
centro tapa otra cosa (`elementFromPoint`), pares de controles que se pisan,
algo fijo o pegado encima de la barra de abajo de la app, y el punto de la
versión (`#version-banner`) encima de un control. Se corrió contra el código de
antes (copia limpia de `febafa9`) y contra el arreglado.

**Ninguna pantalla tenía scroll de costado de la página** a 360 ni a 390.

## Lo que se arregló (todo CSS, solo en el celular; la compu no cambia)

Todas las reglas nuevas están adentro de `@media (max-width: …)` de 1023.98 px
o menos, así que a 1280 no cambia nada por construcción. Cada una con su caso
en `e2e/30-revision-celular.spec.js` (22 pruebas: 11 casos × 360 y 390), que
**contra el CSS de antes da 22 rojos** (verificado sirviendo la copia limpia) y
con el arreglo 22 verdes.

| Pantalla | Ancho | Qué pasaba | Arreglo |
|---|---|---|---|
| Todas (barra de abajo) | 360 y 390 | La burbuja de "Más" ("22") quedaba 2–5 px afuera de la pantalla | `main.css`: `left: min(50% + 8px, 100% − 30px)` en la burbuja |
| Todas (barra de abajo) | 360 y 390 | "Producción" y "Cobranzas" cortados con "…" | `main.css` (≤ 430 px): el nombre sigue en 12,5 px (decisión del 05/10, que exige `26-barra-abajo`), con `letter-spacing: -0.04em`, sin padding y hasta 2 renglones |
| Todas (barra de abajo) | 360 y 390 | "Cuentas corrientes", "Órdenes de retiro", "Proyectos Taller" cortados | lo mismo: bajan a un segundo renglón |
| Todas (punto de la versión) | 360 y 390 | El punto quedaba ENCIMA de la pestaña "Más" y de los botones de abajo ("Siguiente" del wizard de Gastos, "Guardar y asentar" de Cobranzas, "Registrar" y "Enviar" de Stock, "Guardar los cambios" de Producción, la fila de una orden…) | `main.css`: con la barra de abajo, el punto va arriba a la derecha (`top`), al lado del círculo del usuario. Solo con `body.con-barra-lateral`: la planta no lo tiene y no cambia |
| Gastos | 360 y 390 | El "+" (nuevo gasto) encima de la barra de abajo, tapando el ícono de "Más" | `gastos.html`: el "+" va 68 px + 1rem arriba |
| Cobranzas | 360 y 390 | La barra "+ Nueva cobranza" y la del formulario ("Total… Guardar") TAPABAN entera la barra de abajo: en Cobranzas no se veían ni "Inicio" ni "Más" | `cobranzas.html`: la barra de la pantalla va arriba de la de la app (bottom 68 px). `test-cobranzas-escritorio.js` declara la regla en `ENTRARON` |
| Producción · Personal y PINes | 360 y 390 | "Guardar los cambios" (el pie pegado abajo) quedaba DEBAJO de la barra de abajo, y el pie se salía 4 px por cada costado | `produccion-gestion.html`: el pie va arriba de la barra y al ras de la tarjeta |
| Producción · Configuración | 360 | El título "Personal y PI…" cortado | baja de renglón (≤ 520 px) |
| Producción · Conos | 360 | El segmentado "Todos / Activos / Apagados / Por revisar" se salía de la tarjeta | `flex-wrap` (≤ 520 px) |
| Producción · Conos | 360 y 390 | "ACTIVO" no entraba en su columna; el texto de "Doble bolsa" quedaba apretado al lado de "Cono nuevo", palabra por renglón | `letter-spacing: 0` en la cabecera; el texto en su renglón |
| Cuentas corrientes | 360 y 390 | Los nombres de proveedor ("Cartonera del S…") y, en el padrón, "CUIT · dirección" cortados | bajan de renglón (≤ 520 px) |
| Ingreso | 360 y 390 | Proveedor, "fecha · fábrica" (con dos chips la fecha quedaba con 0 px) y "COMPROBANTE" en los pasos del wizard, cortados | bajan de renglón; la fila de chips y fecha con `flex-wrap`; los pasos con letra un poco más chica y sin espaciado |
| Empleados | 360 y 390 | Nombre ("Usabarrena Fac…", "Tablet Producción · …") y subtítulo cortados | bajan de renglón (≤ 520 px) |
| Órdenes de retiro | 360 y 390 | Mientras se carga, el título ("Cucuruchos …") y el chip de la fábrica ("Cucu… Cambiar") repetían el nombre y los dos se cortaban | el chip lleva solo el logo y "Cambiar" (≤ 420 px, solo en la carga y el resumen); el botón conserva su `aria-label` con el nombre |

## Lo que quedó sin arreglar, y por qué

- **"Administración" en la barra de abajo sigue con "…" (360 y 390).** Es una
  sola palabra más larga que la pestaña (72 px en 60–65). Pide un nombre corto
  para la barra (p. ej. "Admin.") en `js/barra-lateral.js` / `js/modulos.js`,
  o achicar la letra, que contradice la decisión del 05/10 (12,5 px). No es CSS
  simple: queda para decidir.
- **Órdenes de retiro · la acción de abajo del renglón** ("Agregar igual · 30
  cajas / Quitar de la orden") es `position: sticky` pero no queda pegada (su
  contenedor termina con ella), así que a mitad de scroll pasa por debajo de la
  barra de abajo; al final de la página se toca bien. No se pisa con nada: es
  scroll normal. Si se quiere que quede SIEMPRE a la vista arriba de la barra,
  es cambiar el armado de la pantalla.
- **Falsos positivos descartados** (no son problemas): el menú del usuario
  abierto tapa los chips de fábrica (es un menú desplegable); el "ojito" va
  adentro del campo de contraseña en login (a propósito); en el wizard de
  Gastos los medios de pago quedan debajo de "Atrás / Siguiente" hasta que se
  scrollea (se scrollea y se tocan bien, medido); los íconos de las cuentas de
  Empresa en Caja están adentro de un `<details>` cerrado; los rótulos para
  lector de pantalla (`.tl-solo-lector`, `.chq-oculto`, `.pc-unidad__rotulo`)
  miden 1 px a propósito.
- **Vistas que el recorrido no pudo abrir** (el selector del paso no apareció
  en la maqueta del celular): el detalle de un gasto, la comisión de una orden,
  "Dar salida" de un cheque en el celular, el modal de un costo de Stock, "Mis
  retiros" en el celular, el detalle de una planilla y la sección Ingredientes
  de la gestión, y "Pagado sin ingresar" de Ingreso. No se midieron.
  `e2e/detalles-dispositivos.spec.js` ya cubre "Dar salida" de cheques y
  varios paneles a 360 y 390.

## Archivos

`css/main.css`, `modulos/gastos.html`, `modulos/cobranzas.html`,
`modulos/produccion-gestion.html`, `modulos/cuentas-corrientes.html`,
`modulos/materia-prima.html`, `modulos/empleados.html`, `modulos/retiros.html`,
`pruebas/test-cobranzas-escritorio.js` (declara la regla nueva),
`e2e/30-revision-celular.spec.js` (nuevo), CLAUDE.md (Estilo visual).

## Lo que no se probó

- Nada en un celular de verdad (todo en Chromium con la maqueta, en una ventana
  de 360 y 390 px). Safari / iPhone no se miró en este recorrido.
- La planta, a propósito (otra rama).

## Qué automatizaría ahora

El recorrido de este paso (103 vistas × 2 anchos, con las seis medidas) vive en
el scratchpad. Convertirlo en `e2e/31-recorrer-celular.spec.js` con una lista de
vistas y una lista declarada de falsos positivos aceptados haría que cualquier
pantalla nueva que se corte en el celular dé rojo sola, sin que nadie tenga que
pedir la revisión. Lo que hay que resolver antes: los selectores de las vistas
que no abrieron y que la lista de aceptados no se vuelva un tacho.
