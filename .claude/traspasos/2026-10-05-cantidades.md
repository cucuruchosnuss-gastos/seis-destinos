# Traspaso — Cantidades en toda la app (05/10/2026)

Rama `ci-prueba/cantidades-en-toda-la-app`, desde `main` en `be86456`. **No se integra** salvo que Facu escriba "APROBADO ci-prueba/cantidades-en-toda-la-app". Supabase: solo lectura; **las funciones de la base no cambiaron**.

## El problema

Facu quiso mandar 1 bolsa de azúcar de Nuss a Mengui. "Cantidad a enviar" no decía en qué se escribía, se tomó como 1 kg y hubo que anularlo. La vista preferida de cada insumo (`insumos.vista_preferida`) ya se usaba para MOSTRAR, no para ESCRIBIR.

## Qué se hizo

1. **`js/cantidades.js` suma la regla para escribir**: `unidadCorta` ("kg", "L", "u"), `modoDeCarga` (bultos solo con vista 'bulto' y UN contenido conocido en el lote; dos presentaciones o una parte suelta → en su unidad con aviso), `aUnidadBase` (lo escrito → unidad base; vacío no es cero; en una unidad entera 2,5 bultos de 3 u no se redondean: se dice por qué), `equivalenteDeCarga` ("= 50 kg") y `desdeUnidadBase`.
2. **Stock → Enviar a otra unidad** y **Stock → Corregir stock / Dar de baja**: el campo lleva la unidad al lado ("bultos de 50 kg" o "kg"), debajo "= 50 kg" cuando se pide en bultos, y el aviso de la regla 3. A la base va siempre la unidad base. Cambiar de lote o presentación vacía el campo (un 1 en bultos no puede pasar a ser 1 kg sin que nadie lo toque).
3. **Ingreso → Ingresos internos** (recibir un envío): pide bultos solo si la vista del insumo es 'bulto' (antes, siempre que el renglón tuviera presentación, y decía "bultos" sin decir de cuánto); el rótulo es "bultos de 50 kg" y debajo "= 50 kg"; en su unidad dice "kg" / "L" / "u".
4. **Órdenes de retiro**: el campo de cada lote tiene ahora su unidad al lado ("kg", "L", "u", o "cajas").
5. **Sala de masa (Modificar)**: el campo de cada ingrediente muestra "kg" a la vista (antes solo para lectores de pantalla). Las dosis siguen en kilos: se pesan.

## Decisiones

- **"bultos" y no "bolsas"**: si era bolsa, tacho o bidón no está guardado en ningún lado (lo mismo que dice Stock).
- **La regla 3 mira el LOTE entero**: aunque se elija la presentación de 50 kg, si el lote tiene también bultos de 25 o una parte suelta, se pide en kg con el aviso (es lo que dice el pedido).
- **El ingreso de mercadería (el wizard)** no cambió: ahí el bulto se está DEFINIENDO con el papel ("¿cuánto trae cada bulto?") y cada campo ya tenía su unidad.
- **El recuento** no cambió: ya pide las dos cosas, cada una con su unidad ("kg" y "bultos de 25 kg"), y guarda la base.
- **La lista de unidades enteras** sigue en cada pantalla (las suites la miden ahí); la regla común recibe los decimales de la pantalla.
- Las mutaciones viejas de Stock que leían la cantidad del movimiento y la del envío por separado pasaron a una sola (los dos campos se leen por la misma función): 46 → 44, sin perder lo que miden.

## Lo que no se pudo probar

- Nada contra la base real (las RPCs no cambiaron; lo probado es lo que la pantalla manda, en suites con base falsa y en la maqueta).
- En un celular de verdad (el teclado con "bultos de 50 kg" al lado del campo a 360 px).

## Pruebas

- Nuevas: `test-cantidades-escribir.js` (48/48) y `mut-cantidades-escribir.js` (26/26), con el caso obligatorio: "1" bolsa de azúcar de 50 kg manda 50; "1" kg manda 1 (también en Stock y en la recepción). La mutación "EL BUG: no multiplica por el contenido" da rojo.
- Al día: `test-stock-numeros.js` (128/128), `test-materia-prima-numeros.js` (93/93), las xss de Stock e Ingreso y `sandbox-retiros.js`.
- Navegador: `e2e/25-cantidades.spec.js` (maqueta `cantidades`, 390 y 1280 px): enviar, dar de baja y recibir.

## Guion para Facu

1. Stock → Enviar a otra unidad → + Agregar ítem → Azúcar: al lado del campo tiene que decir "bultos de 50 kg"; escribir 1 → debajo "= 50 kg". Agregar y enviar: en Ingreso de Mengui tiene que llegar 50 kg.
2. Lo mismo con un insumo que tenés en kilos: al lado dice "kg".
3. Ingreso → Ingresos internos → abrir el envío: el azúcar pide "bultos de 50 kg"; lo que está en kilos pide "kg".

## Qué automatizaría ahora

Cada pantalla que mueve stock tiene su propio armado del campo de cantidad (Stock, Ingreso, Retiros, la planta). Una función de `js/` que **dibuje** el campo entero (input + unidad + "= 50 kg" + aviso) a partir del modo haría que la próxima pantalla no pueda olvidarse de la unidad, y una prueba de navegador que recorra todos los `inputmode="decimal"` de la app y exija una unidad visible al lado lo atajaría en cada push.
