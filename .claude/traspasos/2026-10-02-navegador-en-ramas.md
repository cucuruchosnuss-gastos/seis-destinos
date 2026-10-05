# Traspaso — Pruebas en navegador también en las ramas ci-prueba (02/10/2026)

Rama `ci-prueba/navegador-en-ramas`.

## Qué cambió
- `.github/workflows/navegador.yml`: `on.push.branches` pasó de `[main]` a `[main, 'ci-prueba/**']`. Nada más (el horario nocturno y el manual quedan igual; la concurrency `navegador` ya pone las corridas en fila, así que dos ramas no se pisan la fábrica de pruebas).
- CLAUDE.md: sección "Cómo trabajamos" con las reglas permanentes de Facu, y la entrada de `navegador.yml` al día.

## Decisiones
- No se agregó `pull_request`: el pedido dice ramas `ci-prueba/**`, y con PR más push correría dos veces lo mismo.

## Qué automatizaría ahora
- Una skill `empezar-tarea` que haga los pasos 1 y 2 de "Cómo trabajamos" (fetch, comparar main local con el último conocido, crear la rama desde origin/main) y frene sola si main se movió.
