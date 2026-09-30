# Estado de la tanda "CC y cheques" — pendientes (30/09/2026, al pausar)

Facu pausó la tanda para guardar uso: mañana arranca la operación real. **Todo lo afirmado se verificó con `git` y la API de Actions al escribirlo.**

## Qué quedó en main

`origin/main` = **`22074e7`**, con **Pruebas** y **Navegador** en `completed / success` (también en `6dae734` y `3989718`). Suite local 172/172 sobre `3989718`.

| Parte | Commit en main | Nota |
|---|---|---|
| 1, 2, 3, 4 y arreglos sueltos | `e7a7f93` … `d1a3043` | ya estaban |
| 5 — Administración: pestañas y portada | **`6dae734`** (cherry-pick de `d902be2`, sin conflicto) | integrada hoy; mutaciones `mut-administracion-diseno` 24/24 (+11 eq.) |
| 6 — Proyectos Taller, diseño nuevo | **`3989718`** (cherry-pick de `d9a838d`) | **quedó integrada** (se pusheó antes de que Facu pidiera no seguir con ella). Solo toca `modulos/taller.html` y sus pruebas; `mut-taller` 145/145 (+79 eq.). Si se quiere sacar: `git revert 3989718` |
| Regla común `.panel-detalle` | **`22074e7`** | solo agrega al final de `css/main.css` una clase y dos variables (`--alto-barra-arriba`, `--panel-detalle-margen`) que **todavía no usa ninguna pantalla** |

Lo que entró hoy toca solo `modulos/administracion.html`, `modulos/taller.html` y el final de `css/main.css`. **La planta, Cobranzas, Caja, Retiros y Stock no cambiaron** (sus HTML y los `js/` son idénticos a `324c489`).

## Pendiente

### 1. Lista | detalle de Administración (pantallas 2a–8a del handoff)
No se hizo. Un subagente arrancó y se paró antes de subir nada (sin rama). Pedido: 2a Cobranzas por asentar, 3a Órdenes con Valorizar al lado, 4a Retiros por revisar, 5a/5b/5c Clientes como tabla con su cuenta/ficha al lado, 6a Listas con historial a la derecha, 7a Importar con pasos, 8a Seguridad y errores juntos (+ 9b y 10b). Handoff en `e2e/disenos/administracion/`; lo que la Parte 5 no hizo, en `.claude/traspasos/2026-09-29-parte5-admin.md`. No tocar la región de Cheques. Medición de partida contra el diseño: 2a 15,7 · 3a 15,8 · 4a 14,1 · 5a 12,7 · 6a 11,5 · 7a 17,8 · 8a 9,5 %.

### 2. Paneles de detalle que se cortan (pedido de Facu)
"Siempre el alto completo, con el encabezado fijo arriba, los botones fijos abajo y el scroll adentro del panel." La clase común ya está (`.panel-detalle` / `__cabeza` / `__cuerpo` / `__pie`, al final de `css/main.css`), falta aplicarla. **Causa en Cobranzas** (`modulos/cobranzas.html` ~953): `.cob-maestro--activo #cob-vista-detalle` usa `max-height` con `--alto-barra-fija` (que es la barra de ABAJO del formulario, 5.5rem) y `top: 1rem`, así que termina donde termina el contenido y encima queda debajo de la barra de arriba (52 px, sticky). Revisar también los lista | detalle de `produccion-gestion.html` (Configuración), `taller.html` y los demás módulos. Un subagente arrancó y se paró sin subir nada.

### 3. Entradas que faltan en CLAUDE.md (van en el módulo 10, Producción, antes de "LA PLANTA V2")
   - **EL "ATRÁS" DE ANDROID NUNCA SACA DE LA PLANTA** (29/09/2026, `b36e744`, urgente). La planta tiene siempre una entrada de historial propia (`history.pushState({ planta: ESTADO_ATRAS })`, `popstate` en `modulos/produccion.html` ~10435): cada "atrás" cierra lo que esté abierto, vuelve un paso o va al Inicio del modo, y **en el Inicio no hace nada y dice cómo salir**. La entrada se vuelve a armar con cada toque, porque **Chrome saltea las entradas agregadas sin un toque de la persona**. Red en `js/salud.js` (`CLAVE_PLANTA_INSTALADA`, `esAppInstalada`): la pestaña de la planta instalada de una cuenta de dispositivo que termina en otra página de la app vuelve sola a `produccion.html` (la marca vive en `sessionStorage` y se borra al mandar a la gestión). Suites `test-/mut-produccion-atras.js` (39/39; 23/23) y `e2e/12-planta-atras.spec.js`.
   - **UN CHOCOLATE CON COLOR ELEGIDO CONSERVA LA MARCA** (29/09/2026, `f457581`): `colorProducto()` dice siempre si el producto es de chocolate; con un color elegido la etiqueta toma ese color pero **conserva el borde marrón y la palabra "Chocolate"**. Suite `test-/mut-produccion-choco-marca.js` (17/17; 7/7).

Y las de la Parte 5 (`6dae734`) y la Parte 6 (`3989718`) ya viajaron en sus commits.

### 4. Cierre y limpieza (cuando se retome)
- Comparación con el diseño y controles de las partes 5 y 6 ya corren en la suite (verde).
- Worktrees y ramas temporales para borrar recién ahora que cada hash está en main: `agent-ac6c70842fcb63c0c`, `agent-a33b4cd8e1b242f51`, `agent-a9ddd0039aa0cc3e3`, `agent-a8c0b7c1aeb974074`, `agent-a5482d8ea62d3f37f`, `agent-a9681cff88e46baef`, los dos worktrees de los subagentes parados hoy, ramas `integ4`, `integ6`, `ci-prueba/parte*-*`, `ci-prueba/integ6-taller`.

## Qué automatizaría ahora
Integrar una parte de un subagente es siempre cherry-pick + buscar baselines con el hash viejo + suite + push + esperar Actions. Un `pruebas/integrar-parte.js <hash>` que haga todo eso y avise si `CLAUDE.md` chocó (hoy no chocó ninguna de las dos).
