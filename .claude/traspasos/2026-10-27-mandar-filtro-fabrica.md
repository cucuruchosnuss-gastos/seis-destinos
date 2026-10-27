# Traspaso 27/10/2026 — Mandar a otra empresa: solo la fábrica de la barra

Rama `ci-prueba/mandar-filtro-fabrica`, desde `origin/main` `e698bc0`. Pedido: `.claude/pedidos/2026-10-27-mandar-filtro-fabrica.md`.

## Lo que se encontró
- En `e698bc0` la consulta de `leerClientesGrupo` **ya filtraba** `.in('unidad_negocio_id', fabricas).eq('activo', true)` desde `cfb0ef2`, con prueba y mutación (y e2e/68: con Nuss en la barra va derecho a DOLCE PASTA SRL). `fabricasParaMandar()` con una fábrica en la barra devuelve solo esa.
- En la base (lectura, 27/10/2026) hay dos clientes de grupo: DOLCE PASTA SRL en Nuss (→ Dolce) y PAZ, MIRTA en Dolce (→ Nuss), los dos activos. Las dos opciones juntas son lo que se ve **con "Todas"** en la barra; con Nuss elegida no se reprodujo.

## Lo que se hizo
- `leerClientesGrupo` vuelve a filtrar en la pantalla lo que devuelve la base: solo `activo === true` (la consulta ahora trae `activo`) y `unidad_negocio_id` entre las fábricas pedidas. Si la consulta cambiara o la base devolviera de más, igual no se ofrece un cliente de otra fábrica ni uno inactivo.
- `test-stock-mandar-grupo.js` (62/62): casos nuevos con un supabase de prueba que NO filtra. Nuss en la barra con permiso en Nuss y Dolce → derecho a DOLCE PASTA SRL; Dolce → PAZ, MIRTA; "Todas" → las dos, sin el inactivo ni el de una fábrica sin permiso; una fila sin `activo` no cuenta.
- `mut-stock-mandar-grupo.js` (46/46): seis mutaciones nuevas (sin mirar fábrica, sin mirar activo, activo "no falso", la consulta sin activo, cualquier fábrica de la barra, Nuss elegida con todas las del permiso).

## Decidido sin consultar
- No se cambió el comportamiento con "Todas" (las fábricas con `retiros:cargar`, como dice el pedido) ni con una fábrica elegida (ya era solo esa).

## Lo no probado
- No se reprodujo el caso de la auditoría en la app real con una sesión de Nuss + Dolce.
