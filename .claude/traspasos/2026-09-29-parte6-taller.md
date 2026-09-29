# Parte 6 · Proyectos Taller con el diseño nuevo (29/09/2026)

Rama `worktree-agent-a5482d8ea62d3f37f` (sale de `main` 34b42b2, tag `antes-de-cc-cheques-2026-09-29`). Handoff de Claude Design "Proyectos Taller" en `e2e/disenos/taller/` (`taller.dc.html` + `README.md`), pantallas 1a–7d. **Cero SQL escrito**: la base se leyó en solo lectura (`pg_proc`, `pg_policies`, `information_schema`).

## Qué se hizo

- `modulos/taller.html` rehecho entero con el diseño: pestañas Proyectos / Diagrama de actividades, lista en tarjetas (1a/1b), ficha con Datos, Plata y pestañas Gastos · Horas · Notas · Archivos (2a–2d), ventana de Facturar / Cargar a la fábrica (3a/3b), Valor de la hora (4a), estados (5a–5c), celular (6a/6b), diagrama por operario y por proyecto con el panel de una actividad y arrastrar/estirar (7a–7c) y "Mis actividades" en el celular (7d).
- Las correcciones de Facu, aplicadas: **Edgar (sin precios) ve los costos** (presupuesto, gastos, costo de horas, costo total, valor de la hora, "se pasó $ …") y **ninguna palabra de venta en el DOM**; editar el diagrama pide `taller:gestionar` y con solo `cargar` se ven y marcan las propias; el valor de la hora rige desde una fecha y lo lee todo `taller:ver` (así está la policy); una persona por actividad; lunes a sábado, 8 h.
- Suites y maqueta: ver CLAUDE.md, módulo 14 y la línea de `pruebas/`.

## Decisiones (tomadas, no adivinadas)

- **La burbuja del diagrama** = actividades atrasadas + choques (una persona con dos cosas el mismo día).
- **El color de cada proyecto en el diagrama sale de su id** (hash a una paleta cálida): la base no tiene color de proyecto.
- **"Valor de la hora" lo ve todo el que ve el Taller** (es costo); el campo para cambiarlo, solo con `taller:precios`.
- **Columna COSTO en las horas también sin precios** (es costo).
- **Facturar / cargar a la fábrica no pide fecha**: manda `p_fecha` = hoy de Argentina (se retiró `#tl-venta-fecha`, declarado).
- **Filtro de destino como select** (el diseño) en vez de los botones viejos `data-filtro-destino` (declarado).
- **Sin "‹ Volver" al dashboard**: la barra lateral lo reemplaza (declarado).
- **Facturado y cobrado de cada tarjeta** salen de `resumen_proyecto` de cada proyecto (tope 24): `proyectos_taller` no los devuelve. Es un **hueco de base** (ver abajo).
- **Las notas no llevan foto propia**: la foto de una nota va a Archivos (la base no tiene foto en `proyecto_notas`).
- **`tareas_taller` se llama sin `p_desde`**, solo con `p_hasta`: con `p_desde` se pierden las atrasadas que empezaron antes de la semana visible.
- **Arrastrar manda solo `fecha_inicio`; estirar manda `fecha_inicio` y `fecha_fin`**; guardar el panel manda solo lo que cambió (y `personas: []` al sacar a la persona).
- **En el celular**: se esconden "+ Nuevo proyecto", el valor de la hora y los filtros de archivos (el diseño 6a/6b no los dibuja), pero **el resumen de la ficha lleva Editar y Facturar / Cargar a la fábrica** (la cabecera y Datos se esconden, y sin eso desde el teléfono no se podía ni editar ni facturar, cosa que la pantalla vieja sí dejaba). El diseño 6b no los dibuja: es un desvío a propósito.
- **Desvíos declarados en `e2e/14-comparar-taller.spec.js`**: 1b y 2b (los costos que Facu decidió mostrar), 6a (tope 45 %: las barras compartidas de arriba y las pestañas corren todo ~95 px), 6b y 7d (lo mismo). Medido el 29/09/2026: entre 2,3 % y 39,9 %.

## Huecos de base (no se inventaron)

1. `proyectos_taller()` no devuelve facturado ni cobrado: la lista pide `resumen_proyecto` por tarjeta (tope 24). Una columna en `proyectos_taller` lo resolvería en una llamada.
2. `proyecto_notas` no tiene foto: la foto de una nota va a Archivos.
3. `tareas_taller(p_desde, …)` filtra por fecha de inicio: una actividad atrasada que empezó antes de `p_desde` no vuelve. La pantalla no manda `p_desde`.
4. El diagrama no tiene "desde el celular" para crear actividades (el diseño tampoco lo dibuja).

## Lo que NO se probó

- **Nada con sesión real ni contra la base**: todo en la maqueta (`?maqueta=taller-diseno`, `taller-edgar`, `taller-estados`) y en el sandbox. Ninguna RPC se ejecutó.
- Arrastrar y estirar barras con el dedo en un celular real.
- La subida de archivos y fotos desde el celular.

## Guion para Facu

1. Entrar como Tomás a Proyectos Taller: ver las tarjetas con costo, venta y cobrado; "Atrasados" filtra.
2. Abrir "Maq Barquillo 24 Carrizo": Datos, Plata y las cuatro pestañas; "Facturar al cliente" con un importe chico → ver el resumen "Facturado pasa de…" y **Cancelar** (o confirmar si se quiere probar de verdad).
3. "Valor de la hora": cargar uno con fecha futura y ver que aparece como "desde el …".
4. Diagrama: arrastrar una actividad un día y estirar otra; tocar una y cambiarle el avance.
5. Entrar como Edgar: ver que están los costos y que no aparece ninguna venta; el valor de la hora se ve pero no se cambia.
6. En el celular: lista, ficha (Editar y Facturar en el resumen) y "Mis actividades".

## Qué automatizaría ahora

**Construir un HTML grande desde piezas del scratchpad** (`armar-taller.js` + `taller-js1..5.js`) funcionó, pero obliga a recordar que el archivo del repo es un producto y que editarlo directo se pierde en el próximo armado. Lo repetido y caro fue **verificar que `modulos/taller.html` seguía igual al armado** antes de cada cambio. Propuesta: una skill `armar-desde-piezas` (o un script en `pruebas/`) que arme en un temporal, compare contra el archivo del repo y avise si alguien lo tocó a mano; o directamente no usar piezas y editar el archivo con `editar-archivos`. Segundo candidato: la receta de `e2e/pasos-comparar-*.js` + `NN-comparar-*.spec.js` ya va por la tercera copia (config, esqueleto, taller): un generador que arme los dos archivos desde la lista de pantallas del `.dc.html`.
