# Traspaso — Gastos: aviso "¿Es de un proyecto del Taller?" (02/10/2026)

Rama `ci-prueba/gastos-aviso-taller`. Cero cambios de base.

## Qué hace
Al cargar un gasto, en el paso "¿A dónde va este gasto?", si se elige una empresa que no es el Taller aparece en chico: **"¿Es de un proyecto del Taller? Elegí Taller."**. Tocar "Elegí Taller." pone el Taller, como si se hubiera tocado su tarjeta.

Aparece solo si:
- hay al menos un proyecto del Taller abierto (activo y no entregado ni cancelado), y
- la persona puede elegir el Taller como empresa.

## Decisiones tomadas sin consultar
- **El aviso va en DOS lugares**: debajo de las empresas y arriba de las categorías. Tocar una empresa pasa solo al paso siguiente, así que debajo de la grilla se ve únicamente cuando la empresa vino puesta por la barra de arriba o al volver atrás; arriba de las categorías es donde la persona lo lee.
- "Elegí Taller." es tocable (si no, había que volver atrás a buscar la tarjeta).
- Por "Vehículos" no avisa: ahí la empresa sale del vehículo.

## Lo que no se pudo probar
- Con la base real. Lo probado: la lógica con datos falsos y la maqueta en Chromium a 390 y 1280 px.

## Guion para Facu
1. Gastos → + → Sin comprobante → completá los datos → Siguiente.
2. Tocá Cucuruchos Nuss: arriba de las categorías dice "¿Es de un proyecto del Taller? Elegí Taller.".
3. Tocá "Elegí Taller.": el gasto pasa a ser del Taller (y en Detalles pide el proyecto).

## Qué automatizaría ahora
- Una prueba de la maqueta que recorra el wizard de Gastos entero hasta guardar (hoy cada suite llega hasta el paso que le toca).
