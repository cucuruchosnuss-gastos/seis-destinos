# Seis Destinos

[![Pruebas](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/workflows/pruebas.yml/badge.svg?branch=main)](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/workflows/pruebas.yml)

Sistema de gestión de fábrica de Grupo Nuss. La guía completa del proyecto está en [CLAUDE.md](CLAUDE.md) y las pruebas en [pruebas/](pruebas/README.md).

- **Pruebas** (cada push a `main` y cada pull request): `node pruebas/check-bytes.js` y `node pruebas/correr-todo.js`.
- **Mutaciones** (a mano, tardan): Actions → *Mutaciones* → *Run workflow*, o `node pruebas/correr-todo.js mut`.
- **Navegador real** (cada push a `main` y todas las noches a las 5): `npm ci && npx playwright install chromium && npm run e2e`. El humo corre siempre; los recorridos de la planta, la gestión y Accesos necesitan los secretos del robot (ver `e2e/`).

[![Navegador](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/workflows/navegador.yml/badge.svg?branch=main)](https://github.com/cucuruchosnuss-gastos/seis-destinos/actions/workflows/navegador.yml)
