# Pedido de Facu — 29/10/2026: Remitos Dolce más simple (un solo recorrido)

Rama: `ci-prueba/remitos-mas-simple`, desde `origin/ci-prueba/recibir-entre-empresas` (2003aa3: trae main +
remitos-autoguardado + la parte de Remitos Dolce de recibir-entre-empresas). Toca `modulos/remitos-dolce.html` y
`js/remitos-comun.js` (más pruebas, maqueta, e2e y docs). NO toca `modulos/produccion.html`. NO se integra: queda
pusheada y con el patch para que otro chat lo audite; se integra de noche.

Objetivo: que Manuel suba la foto y cargue los lotes en el mismo lugar, sin ir a otra pestaña a "revisar". Menos
pasos y nombres más claros.

1. **Un solo recorrido en "Subir"**: leído, el remito aparece en NARANJA "Listo para cargar lotes" (N°, cliente,
   renglones); tocarlo abre el editor de hoy (corregir producto, cono, cantidad, lotes con "falta repartir X" sin perder
   "Lotes: X de Y cajas", Confirmar). El botón de volver dice "‹ Remitos" y vuelve a donde estaba; el autoguardado
   igual. Confirmado: VERDE "Orden cargada · D-00XX" (o D-I-00XX). Las rojas siguen. Estados: "Leyendo…" (gris) →
   "Listo para cargar lotes" (naranja) → "Orden cargada · código" (verde) / "No se pudo leer" (rojo); en la base
   siguen 'precargada'/'confirmada'. Texto de ayuda: "Sacale una foto a cada remito, de a uno y que se lea entero.
   Cuando la IA lo lea, tocalo para cargar los lotes y confirmar la orden." Abrir y confirmar exige retiros:cargar.
2. **La segunda pestaña se llama "Órdenes cargadas"**: confirmados con su orden (por N° de remito) y los "Listo para
   cargar lotes" de cualquier usuario. Mismo permiso (retiros:ver); con una sola pestaña, no se muestran. `?pestana=revisar`
   sigue funcionando. Ninguna "Revisar" como paso; el sello amarillo dice "Controlar".
3. **Buscador de conos**: con menos de 2 letras ninguna opción, solo la pista "Escribí 2 o 3 letras del cono"; con 2 o
   más, primero los que empiezan así (nombre o palabra), después los que lo contienen, sin tildes, hasta 20, lista
   vertical con altura máxima ~16rem y scroll propio; al elegir se cierra y queda el cono con "Cambiar"; el que leyó la
   IA, elegido y cerrado. Revisar el selector de producto con el mismo criterio.
4. **Unidades por caja**: `nombreRenglonRemito` y `opcionesRemito` suman "× 252 u." (`unidades_por_caja`); con 1 nada;
   en el renglón elegido en negrita; "180"/"216" encuentran esas presentaciones; que se vea bien en todos lados a 390 px.
   Verificar las columnas en la base antes.

Pruebas obligatorias: `test-/mut-remitos-dolce-mas-simple.js` (baseline fijo = 2003aa3, rojo sobre ese commit), ajustar
las que miraban "Revisar"/"Precargado"/…, `e2e/99-remitos-mas-simple.spec.js` a 390 y 1280 px, check-scripts,
mutaciones de a una, `npm run pruebas` en verde y, si se puede, el ensayo con `BASE=origin/ci-prueba/recibir-entre-empresas`.

Al terminar: rama y hash, patch en `/tmp/remitos-mas-simple.patch`, números de suites y mutaciones, lo decidido sin
consultar, lo que no se pudo probar y "Qué automatizaría ahora".
