# Parte 5 · Administración (diseño) — 29/09/2026

Rama `ci-prueba/parte5-admin` (base `main` en `09d9b2d`). Handoff "Administración" de Claude Design, copiado en `e2e/disenos/administracion/` (README + `administracion.dc.html`, que usa `../support.js`; el `logo.png` es el de la raíz, md5 igual).

## Qué se hizo

1. **Encabezado del diseño**: ícono uva (`oklch(0.45 0.14 305)`, solo en el ícono), "Administración" en Bricolage 21 y **las pestañas de sección** en un segmentado de 30 px (`#ad-pestanas`, `button[data-pestana]`): Inicio · Cobranzas · Órdenes · Por revisar · Clientes · Listas de precios · Importar · Cheques · Seguridad · Errores, **solo las que la persona ve** (Inicio siempre), la actual con `aria-current="page"` (una orden marca Órdenes, un cliente o su ficha marca Clientes, una lista marca Listas, una cobranza marca Cobranzas). Burbuja **bordó** en Cobranzas (por asentar) y Órdenes (sin valorizar); **gris** en Por revisar, Cheques (en cartera) y Errores (7 días); nada con 0 o sin dato; "99+" arriba de 99. En el celular: "Administración" chico arriba, la sección grande y las pestañas en su fila, que scrollea de costado ADENTRO.
2. **Portada (1a)**: accesos directos con el ícono y el color de cada módulo (`colorDeModulo` de `js/modulos.js`, los trazos del diseño, sin Lucide) y la grilla 3 × 3 en el orden del diseño (`enOrdenDePestanas`): ícono con color, título, **número grande** (Bricolage 40, bordó si urgente) y renglones. Datos:
   - Cobranzas: por asentar + "$ X que cargaron los choferes" + la más vieja (fecha · quién) + "Ir a asentar ›".
   - Órdenes: sin valorizar.
   - Por revisar: cuántos + los dos primeros (cliente: cantidad de qué).
   - **Clientes: el número grande son los ACTIVOS** (como el diseño), con "N pasados de su límite de crédito" en bordó y "Nos deben $ X en total" (suma de saldos > 0), de `clientes_con_saldo` (`leerResumenClientes`; `contarSobreLimite` sigue existiendo y la usa).
   - Listas: cuántas y sus nombres.
   - Importar: "— nada pendiente".
   - **Cheques (nuevo)**: `cobranza_cheques` en cartera → cantidad, total, plazo promedio ponderado por importe y "N vencen esta semana" con la regla de `cheque_plazo_presentacion` (`resumenCheques`), solo si la persona ve Cheques.
   - **Seguridad**: cierres de sesiones de 7 días (`registro_seguridad`), solo super_admin.
   - **Errores**: errores de 7 días (`errores_app`), bordó, chip "super_admin".
   - Mientras carga: barras grises + "Contando…". Si falla: "—", "No se pudo contar" y "Puede ser la conexión. El resto anda bien." (las demás siguen). Un dato ausente nunca es "$ 0" (`plataPortada`).
3. **`?seccion=<cualquier sección que la persona ve>` abre esa sección** (Clientes desde Cuentas corrientes, Seguridad desde la barra lateral de un super_admin, y el resto); se limpia la dirección antes de abrir; una que no ve cae en la portada. Abriendo derecho una sección igual se cuentan las burbujas (`contarPortada`, separada de `mostrarInicio`).
4. **Tokens**: `--ad-texto-secundario` pasó del gris azulado `#4a5670` a `var(--color-texto-2)`; los bloques con el borde del sistema (`--color-borde`) y sin sombra; filas de radio 12. En la compu se esconde el "‹ Volver" al dashboard (la barra lateral lo reemplaza). **Desvío:** los "‹ Portada" / "‹ Órdenes" / "‹ Clientes" de cada sección quedan aunque el diseño no los dibuja: vuelven a la vista de antes (una orden → la lista de órdenes con sus filtros), cosa que una pestaña no hace, y los usan los recorridos de `e2e/5-maqueta.spec.js`.
5. **Comparación con el diseño**: `e2e/13-comparar-administracion.spec.js` + `e2e/pasos-comparar-administracion.js` (1a, 2a, 3a, 4a, 5a, 6a, 7a, 8a a 1366 × 768 y 10a a 390 × 844; maqueta `administracion-super`, Nuss elegida). Medido: 1a 11,1 % · 2a 15,7 · 3a 15,8 · 4a 14,1 · 5a 12,7 · 6a 11,5 · 7a 17,8 · 8a 9,5 · 10a 19,6.

## Lo que NO se hizo (y por qué)

- **El armado lista | detalle de las secciones** (2a Cobranzas, 3a Órdenes con valorizar al lado, 5a Clientes como tabla con columnas y 5b/5c, 6a Listas con historial a la derecha, 7a Importar con pasos, 8a Seguridad y errores juntos, 9b vacío en verde, 10b asentar apilado): las secciones quedaron con su lógica y su armado de tarjetas de antes, con los tokens nuevos. Rehacerlas es reescribir el render de cada una con sus suites (Cobranzas 159 verificaciones, Clientes 91, Órdenes 132…), y en esta parte no entró. **La comparación da menos del 30 % igual** (el número mide bloques de 8 × 8 px): no alcanza para decir que están iguales. Es lo próximo.
- **Datos que la base no tiene y el diseño dibuja**: "21 sesiones abiertas" (no hay una función que cuente las sesiones de todos: se muestran los cierres de 7 días), "1 nuevo" en errores (no hay "visto"), "último aumento" de las listas, "la última importación" y "11 órdenes este mes · 576 cajas".
- **Reintentar dentro de cada tarjeta de la portada (9a)**: la tarjeta entera es un `<button>` y no puede tener otro adentro; queda el texto de error. Para reintentar se vuelve a Inicio.
- **La hoja con precios** no se tocó (decisión 2: ya es la del depósito con dos columnas; `js/retiros-comun.js` lo cambia otra parte).
- **Decisiones de Facu (SÍ a las tres)**: el límite avisa sin bloquear (ya era así), la hoja con precios es la misma (ya era así), los sugeridos vienen ordenados de `cobranzas_por_asentar` (ya era así). Lo de hoy (buscador de Asentar, endoso a proveedor, "Todas las fábricas") no se tocó.

## Suites

- Nueva `test-administracion-diseno.js` + `mut-administracion-diseno.js`.
- Al día (mismo rigor, textos del diseño): `test-administracion-cobranzas` ("por asentar"), `-ordenes` (el ícono del acceso es el trazo del diseño, "sin valorizar"), `-clientes` (el número grande son los activos; "1 pasado de su límite" en bordó), `-revisar` ("se llevaron sin stock"), `-seguridad` (la explicación con el número de cierres). Sus `mut-*` con las anclas nuevas; en `mut-administracion-ordenes` se declararon equivalentes los escapes nuevos de constantes (colores, chip, número) y `esc(c.unidad)`, que prueba la suite nueva con una empresa con HTML.
- `sandbox-administracion.js` suma las funciones y constantes nuevas; `seguras-administracion.js` las interpolaciones nuevas, cada una con su motivo.

**Números al cerrar:** `correr-todo` 172/172 (y, después del último ajuste, las 15 de Administración en verde); `test-administracion-diseno` 45/45; mutaciones de a una: diseño 24/24 (+11 equivalentes), órdenes 61/61 (+31), cobranzas 73/73 (+8), clientes 47/47 (+15), revisar 35/35 (+1), seguridad 15/15 (+2). `check-bytes` verde. Playwright: `13-comparar-administracion` pasa; las pantallas de Administración de `5-maqueta` y `7-barra-unidad` pasan (una corrida larga con la máquina cargada dio fallas de tiempo en páginas ajenas, que pasan solas).

## Lo que no se probó

Nada con sesión real: todo en la maqueta (1366 × 768 y 390 × 844, sin scroll de costado ni errores de JavaScript).

## Guion para Facu

1. Abrí Administración en la compu con Nuss arriba: tienen que verse las pestañas con sus burbujas y la portada de 3 × 3 con los números grandes.
2. Tocá cada pestaña: la actual queda en blanco; "Inicio" vuelve a la portada.
3. Desde Cuentas corrientes, "Administración → Clientes": tiene que abrir Clientes directo. Como super_admin, "Seguridad" en la barra lateral: tiene que abrir Seguridad.
4. Mirá la tarjeta de Cheques: el total y "vencen esta semana" tienen que coincidir con la sección Cheques.
5. En el celular: "Administración" chico, la sección grande y las pestañas deslizables.

## Qué automatizaría ahora

**Un generador de datos de maqueta desde el `.dc.html` del diseño.** Cada comparación con un diseño pide armar a mano un juego de datos igual al dibujado (acá no se hizo y la comparación vigila solo el armado). Los `.dc.html` tienen los datos de ejemplo en arreglos JS (`COBS`, `ORD`, `CLIENTES`, `PRECIOS`…): un script que los lea y los vuelque a `pruebas/datos-maqueta/<nombre>-diseno.js` con la forma de las tablas y RPC reales dejaría la comparación midiendo también los números, sin trabajo a mano.
