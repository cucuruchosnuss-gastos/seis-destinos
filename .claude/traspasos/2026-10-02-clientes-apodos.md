# Traspaso — Los apodos de los clientes (02/10/2026)

Rama `ci-prueba/clientes-apodos`. Cero cambios de base.

## Qué hace
- **Órdenes de retiro (depósito)** y **Cobranzas** (la cobranza ya asentada): buscar "Turi" da **"SALVADOR LOFORTE · Turi"** — el apodo que coincidió va al lado del nombre. Buscar por apodo ya andaba; lo nuevo es que se vea cuál coincidió.
- **Ficha del cliente** (Administración → Clientes → un cliente → Ficha): bloque "Apodos" con etiquetas y una X para sacar cada uno, y un campo para agregar (Enter o "Agregar"). Se guarda al momento.

## Lo que encontré en la base (solo lectura)
- **SALVADOR LOFORTE existe en Nuss y en Dolce Pasta con el apodo "Turi", pero el de Dolce Pasta está APAGADO.** Por eso en Dolce Pasta "Turi" no lo trae: los clientes apagados no aparecen para cargar retiros ni para asentar cobranzas (regla vieja, a propósito). **Para que aparezca, hay que prenderlo** en Administración → Clientes → "Mostrar apagados" → el interruptor. No lo cambié: los datos los maneja el chat.
- **`buscar_clientes` no devuelve los apodos.** Cobranzas los lee aparte de la tabla `clientes`, pero quien solo tiene tareas de Cobranzas (Yanina) no puede leer esa tabla: para ella aparece el cliente correcto, sin el "· Turi". **Pedido para el chat de la base:** que `buscar_clientes` devuelva `apodos` en cada fila (la pantalla ya lo usa si viene, sin consultar aparte).

## Decisiones tomadas sin consultar
- El apodo se muestra **solo si el nombre no coincide por sí solo** (buscando "forte" no se agrega "· Los Forte").
- En la ficha, **cada apodo se guarda al tocar** (no espera a "Guardar la ficha"), como el interruptor de prender/apagar.
- Como `guardar_cliente` pisa nombre, localidad, teléfono y observaciones, antes de guardar **se relee la fila** y se mandan esos datos como están en la base (no se pierde nada que otra persona haya cambiado, ni lo que esté a medio escribir en la ficha).
- Vacío o repetido (sin acentos ni mayúsculas) no se agrega y se dice; hasta 60 letras (las mismas reglas que Pedidos).

## Lo que no se pudo probar
- Contra la base real con cada usuario. Lo probado: la lógica con datos falsos y la maqueta en un navegador real a 390 y 1280 px.

## Guion para Facu
1. Órdenes de retiro (Nuss): escribí "Turi" → "SALVADOR LOFORTE · Turi".
2. Cobranzas → Nueva → Nuss → escribí "Turi" → lo mismo.
3. Administración → Clientes → SALVADOR LOFORTE → Ficha: agregá un apodo, sacalo con la X.
4. Si querés que aparezca en Dolce Pasta: prendelo en Administración → Clientes → Mostrar apagados.

## Qué automatizaría ahora
- Una sola función de "qué apodo coincide" compartida (hoy la tienen Retiros y Cobranzas, cada una a su manera) — o, mejor, que la base la devuelva en `buscar_clientes`.
