# Pausa 28/10/2026 (~23:00) — Remitos Dolce y acreditar venta / depósito

Facu apagó la compu a mitad de la integración. Pedido: `.claude/pedidos/2026-10-28-remitos-dolce-y-acreditar.md`
(está en la rama de la tarea 1).

## Tarea 1 — `ci-prueba/modulo-remitos-dolce` = `05d6c21` (pusheada) — LISTA, SIN INTEGRAR
- Ya trae main con modulo-buscar (706d5ca). `npm run pruebas` 324/324; GitHub Pruebas + Navegador verdes en `05d6c21`;
  **ensayo verde** (`npm run ensayo -- ci-prueba/modulo-remitos-dolce` sobre 706d5ca: 324/324 y las dos mitades del
  navegador). Mutaciones todas detectadas. Traspaso: `.claude/traspasos/2026-10-28-modulo-remitos-dolce.md`.
- Respaldo pusheado: `respaldo/antes-de-modulo-remitos-dolce` = 706d5ca.
- En `C:\Users\facun\proyectos\sd-integrar` (main) quedó un merge LOCAL sin pushear, `be957ee` (idéntico a la rama, 0
  diferencias). Se cortó antes del push: main en GitHub sigue en 706d5ca. El candado se soltó.
- **Para seguir:** `git fetch`; si main sigue en 706d5ca, tomar el candado, pushear `be957ee` (o rehacer el merge
  `--no-ff`), esperar Pruebas, Navegador y Pages en verde y soltar. Si main se movió, traer main a la rama y repetir
  pruebas + ensayo.

## Tarea 2 — `ci-prueba/acreditar-venta-deposito` = `78cfa7b` (+ esta nota) — HECHA, FALTA TRAER MAIN E INTEGRAR
- La hizo el agente de Cheques en `C:\Users\facun\proyectos\sd-acreditar` desde 133555d: dos bloques en "En el banco",
  "Monto acreditado" (venta) / "Gastos del banco" (depósito) con el texto en vivo, parametrosAcreditar con acreditado /
  gastos, el aviso de los gastos creados, sin "Cargar el gasto del banco", "Ver el gasto" en depósitos. pruebas:rama
  319/319, mut-cheques-acreditar 71/71, -banco 76/76, -importe-completo 26/26; e2e 61 y 37 verdes. Su traspaso:
  `.claude/traspasos/2026-10-28-cheques.md`. Revisé el diff: está todo dentro de la región Cheques.
- **Para seguir (después de integrar la tarea 1):** traer main a esta rama (ojo: `test-administracion-anular-nota-debito.js`
  RETIRADOS y `test-anclas-mutaciones.js` YA_ROTAS, quedarse con lo de los dos lados), `npm run pruebas`, push, GitHub
  verde, ensayo, candado, integrar.

## Nada quedó corriendo
Se cortaron el push a main y los procesos en segundo plano; el candado está suelto.
