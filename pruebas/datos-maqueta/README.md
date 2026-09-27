# Datos de la maqueta y de las pruebas

Un módulo por pantalla (`administracion.js`, `retiros.js`, …) con las tablas y las respuestas de RPC que usa la **maqueta** (`e2e/maqueta`) y que pueden usar las **suites** de `pruebas/`. Lo que se comparte entre varios (las empresas, la cuenta de la maqueta, el armado de una tarea) vive en `comun.js`.

- **Se editan acá, nunca el `.json`.** Después: `npm run maqueta:datos` regenera `e2e/maqueta/datos/*.json`.
- `pruebas/test-maqueta-datos.js` da rojo si un `.json` no coincide con lo que genera su módulo.
- Una suite nueva que necesite datos de una pantalla los toma de acá (`require('./datos-maqueta/administracion')`), así la maqueta que se mira y la prueba que se corre hablan de lo mismo. Las suites anteriores al 27/09/2026 siguen con sus datos adentro.
