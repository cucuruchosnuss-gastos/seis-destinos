# Traspaso — 21/10/2026: una suite colgada es rojo

Rama `ci-prueba/arnes-ramas-colgadas` (desde `origin/main` 2bc7d23). Sin integrar. Sale del "Qué automatizaría ahora" de `2026-10-21-division-orden-facturar.md`.
Documentación: `docs/memoria/pruebas-y-ensayo.md` (entrada "UNA SUITE COLGADA ES ROJO").

## Qué se hizo
- `arnes()` de `pruebas/circuito-comun.js` (lo usan 192 suites): si node se queda sin trabajo sin que `fin()` haya cerrado, suma una falla y sale con 1 y ROJO. Antes salía con 0 sin imprimir nada, y el runner de mutaciones contaba "escapó" sin que nada se hubiera afirmado.
- Suites nuevas `test-pruebas-arnes-colgado.js` (10/10: corre suites chiquitas en otro proceso — bien, chk falso, rama que tira, rama colgada, el doble toque real, sin `fin()`, `fin()` después de un timer) y `mut-pruebas-arnes-colgado.js` (4/4).

## Decisiones tomadas sin consultar
- Se aplica también a una suite que nunca llama a `fin()` (hoy las 192 lo llaman).
- No se tocaron los arneses propios de `controles-*.js` y de las suites que no usan `arnes()`.

## Lo que no se pudo probar
- Nada pendiente: `npm run pruebas` 269/269 en verde con la guarda puesta (ninguna suite existente estaba colgada).

## Guion para Facu
No hay nada que mirar en pantalla: es una mejora de las pruebas.

## Qué automatizaría ahora
- Llevar la misma guarda a los arneses propios (los `controles-*.js` y las suites con su `chk` casero): un helper `cerrarAlSalir(cerrar)` en `circuito-comun.js` que cada uno llame en una línea, y una prueba que exija que toda suite que termina con `process.exit` lo use.
