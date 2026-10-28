# Pedido 28/10/2026 — Valorizar con la división en una sola pantalla (N1 / N2)

Rama: ci-prueba/valorizar-con-division (desde el origin/main más reciente; trabajá en una copia aparte con git worktree). No toca modulos/produccion.html: se puede integrar en cuanto esté en verde. Puede haber otra sesión moviendo código de remitos fuera de administracion.html (ci-prueba/modulo-remitos-dolce): antes de integrar hacé git fetch, traé main y si chocan se queda lo de los dos lados.

Caso real (28/10, N-0036, ICARDI, clientes.pct_parte_a = 40): Yanina valorizó (valorizar_orden_retiro), después tuvo que entrar a "Dividir para facturar", poner los %, "Guardar e imprimir" (guardar_division_orden) y volver. El listado de la izquierda siguió diciendo "sin valorizar" aunque en la base estado_valorizacion = 'valorizada' (total 599.499,88). Y la hoja impresa sale con las dos partes juntas.

CONTEXTO: la parte A y la parte B son los PUNTOS DE VENTA 1 y 2 de ARCA. A algunos clientes se les manda solo el punto 2: no pueden ver nada del punto 1. Cada una es una ORDEN DE PEDIDO VALORIZADA que sale de la orden de pedido general, y se llama con el código de la orden con el punto pegado a la letra: N-0036 → N1-0036 y N2-0036; D-0045 → D1-0045 y D2-0045.

PARTE 1 — Valorizar en UNA sola pantalla, dinámica (modulos/administracion.html; verificá valorizar_orden_retiro, guardar_division_orden, datos_division_orden, _comisiones_orden y orden_comisiones con pg_get_functiondef / information_schema antes de usarlos):
1. Al tocar "Valorizar": valorizar_orden_retiro y, en la misma pantalla:
   a. CONDICIÓN: precargada con clientes.pct_parte_a, mostrada como "N1-0036: 40 % · N2-0036: 60 %". Botones rápidos 100/0, 80/20, 50/50, 40/60 y un campo para otro %. Sin pct_parte_a en el cliente: 100/0. Cliente del grupo (unidad_grupo_id no null): sin división, como hoy.
   b. COMISIONES DE LOS VENDEDORES 1, 2 y 3 (la de Roberto se carga como un vendedor más), precargadas como hoy en la ventana de división.
   c. N1-0036 y N2-0036: importes valorizados (datos_division_orden), cada uno con sus propios botones "Imprimir" y "Compartir PDF", y la carga del número de factura ARCA (y PDF opcional) de ese punto, lo que hoy está en "Dividir para facturar". Con 100/0 o 0/100, uno solo.
   d. Dinámico: al cambiar la condición o una comisión, se guarda con guardar_division_orden (con un pequeño retardo para no mandar una llamada por tecla, y que una respuesta vieja no pise a una nueva) y se recalculan los importes en pantalla. Mientras guarda, "Guardando…"; si la base da error, el mensaje tal cual al lado.
2. Sacá del flujo la "comisión común en general" (comision_modo / comision_valor / comision_importe y su pantalla previa) y el sello "Comisión sin cargar" del listado. No borres funciones ni datos: solo que no aparezca.
3. "Dividir para facturar" deja de ser un paso obligatorio. En el detalle de la orden quedan, por cada uno (N1-… y N2-…), "Imprimir" y "Compartir PDF" para volver a sacarlas.
4. NOMBRES EN TODA LA APP: donde hoy diga "Parte A" / "Parte B", "parte A x %", "N-0036-A" / "N-0036-B" (pantalla de valorizar, detalle de la orden, bloque "Facturas de ARCA", cuenta del cliente, avisos, hojas y PDF), que diga "N1-0036" / "N2-0036". Una sola función arma ese código (reemplaza a rotuloParte). Los valores en la base ('A'/'B') no cambian.

PARTE 2 — La orden de pedido valorizada de cada punto (htmlBloqueParte / htmlHojaDivision / imprimirDivision). Facu aprobó "Orden de pedido N1-0036 - ICARDI.pdf" y "Orden de pedido N2-0036 - ICARDI.pdf" (adjuntos): copiá ese formato.
5. CADA PUNTO ES UN DOCUMENTO APARTE: imprimir o compartir el N1 genera solo el N1 (A4 vertical, un PDF propio); lo mismo el N2. Nunca los dos en la misma hoja ni en el mismo PDF. Nombre del PDF: "Orden de pedido N1-0036 - <CLIENTE>.pdf".
6. El encabezado, centrado y grande, como en los PDF adjuntos: arriba "ORDEN DE PEDIDO" (unos 22 pt, negrita, letras separadas) y debajo el código (unos 28 pt, negrita): "N1-0036" / "N2-0036". Una línea debajo lo separa del cliente. SIN el número de factura de ARCA (la factura se carga en el sistema, pero no va en este papel).
7. Debajo del cliente y el CUIT, solo "Fecha dd/mm/aaaa": sacá "Parte A: 40 %".
8. Totales del N1: "Total productos: $ X", una línea por vendedor CON MONTO MAYOR A 0 con solo su nombre y el monto ("Vendedor 1: $ 44.962,49", SIN el %), "Total comisiones: $ X" (SIN el %) y "TOTAL: $ X". N2: solo "TOTAL: $ X". Nunca "TOTAL PARTE A/B".
9. Sacá el pie "Orden N-0036 · total de la orden …": en el N2 le mostraría al cliente el total con el N1.

PARTE 3 — Listado de la izquierda siempre al día:
10. Bug: después de valorizar, cambiar la condición, una comisión o cargar una factura, actualizá en el momento la fila de esa orden (estado_valorizacion, total, sellos) sin recargar la página. Prueba que falle con el código de hoy.
11. Que el listado se relea solo al volver a la pestaña (visibilitychange/focus) y cada 60 segundos mientras está visible, sin perder la orden abierta ni lo que se está escribiendo.

Pruebas: suites y mutaciones (condición del cliente, 100/0, otro %, cliente del grupo, comisión editada que recalcula, respuesta vieja que no pisa, "N1-0036"/"N2-0036" en pantalla y en el papel sin "Parte A/B" en ningún lado, encabezado sin factura, sin % y sin el pie, vendedor en 0 que no sale, un PDF por punto, fila del listado actualizada, relectura al volver); e2e a 390 y 1280 px con el caso Icardi. npm run pruebas en verde, check-scripts. Después integrá con el procedimiento de siempre.

Al terminar: hash de la rama, lo que decidiste sin consultar, lo que no pudiste probar y "Qué automatizaría ahora". Mandame UN solo resumen completo y, como último mensaje solo: TERMINADO — mandar al chat
