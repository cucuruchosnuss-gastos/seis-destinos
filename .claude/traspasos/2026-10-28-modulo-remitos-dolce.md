# Traspaso 28/10/2026 — Remitos Dolce (módulo aparte)

Pedido: `.claude/pedidos/2026-10-28-remitos-dolce-y-acreditar.md` (tarea 1). Rama `ci-prueba/modulo-remitos-dolce`
desde `origin/main` 133555d, worktree `C:\Users\facun\proyectos\sd-remitos-dolce`. Detalle del módulo:
`docs/memoria/remitos-dolce.md`.

## Qué hay
- `modulos/remitos-dolce.html`: pestañas Subir (retiros:cargar) y Revisar (retiros:ver), el código MOVIDO por script
  desde la Carga y Administración (sin reescribir). "Confirmado: Orden D-0012" con `remitos_precarga.orden_codigo`.
  Abajo de Revisar, las órdenes por N° de remito (Oficial / Acopio), solo lectura, con "Valorizar en Administración →".
- `js/remitos-comun.js` (decimoséptima excepción): textoNumeroRemito, htmlSelloAcopio, talonarioDe y el catálogo de un
  renglón (Nuevo acopio en Administración y los renglones del remito).
- Tarjeta del menú con `alcanceEn` (Dolce Pasta) en js/modulos.js; dashboard y barra lateral leen el alcance. Color
  azul 250, ícono del remito, después de Órdenes de retiro. El tablero del dueño pasa de 15 a 16 tarjetas.
- La Carga y Administración: un link chico "Remitos Dolce →". Administración → Órdenes vuelve a la lista de siempre.
- La hoja y el PDF de la Carga: "Remito N° X" (mis_ordenes_retiro, verificada con pg_get_functiondef el 28/10/2026).
- `ocr-remito/index.ts` idéntico en el encabezado a lo publicado (leído con get_edge_function): Opus por defecto.

## Probado
- `npm run pruebas` 322/322 en verde; check-bytes y check-scripts.
- Mutaciones: subir 125/125, revisar 90/90 (la vieja `mut-administracion-remitos-precarga` estaba rota por un ancla
  repetida: ahora es `mut-remitos-dolce-revisar`), acopio 13/13, link de Administración 20/20, link de la Carga 9/9,
  la tarjeta 15/15, hoja de la Carga 18/18, acopios de Administración 99/99, ocr-remito anclas OK.
- Navegador: 70, 71, 72, 11 y 5-maqueta en verde local (390 y 1280 px); miré capturas de Subir (390) y Revisar (1280).

## Decidido sin consultar
- Los nombres de clase quedaron como venían (rt-* Subir, ad-* Revisar) para mover el código tal cual.
- La lista por N° de remito (con solapas) se mudó entera al módulo; Administración → Órdenes de Dolce volvió a la
  lista de siempre (con el link). La ficha sigue diciendo "Remito N° X".
- En Revisar, las órdenes de abajo son de solo lectura (sin plata): Administración no tiene un link directo a una orden.
  Se leen los últimos 120 días (tope 400).
- La tarjeta lleva el id de Dolce Pasta fijo (`alcanceEn`), como pidió el pedido ("en Dolce Pasta").
- El "saldo del acopio" y el buscador del remito salieron de test-/mut-administracion-acopios a
  test-/mut-remitos-dolce-acopio.
- Los e2e 70 y 71 conservan su número y nombre de archivo (no se tocó el reparto de mitades).

## No se pudo probar
- Nada contra la base real ni con las sesiones de Manuel y Yanina: maqueta y suites.
- El navegador completo local (45 min): lo corre GitHub y el ensayo.

## Qué automatizaría ahora
1. **Un "mover bloque a otro módulo" como script de la skill editar-archivos**: sacar por anclas, chequear qué usa el
   bloque que queda afuera (lo de `scratchpad/deps.js` y `faltan.js`) y copiar el CSS de base que usan sus clases. Hoy
   lo armé a mano en tres scripts; la próxima mudanza de pantalla sería un comando.
2. **check-scripts que avise de llamadas a funciones que no existen** (lo que hizo `faltan.js`): se me escapó
   `htmlSelloAcopio` en la ficha de Administración hasta que lo encontró una suite.
3. **Los conteos fijos de tarjetas del tablero en los e2e** (15 → 16) deberían salir de `MODULOS` + `moduloVisible`, no
   de un número escrito: cada módulo nuevo rompe tres specs.
