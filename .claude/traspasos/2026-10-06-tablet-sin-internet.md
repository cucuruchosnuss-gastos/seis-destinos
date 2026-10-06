# Traspaso — La tablet sin internet (06/10/2026)

Rama `ci-prueba/tablet-sin-internet`, desde `origin/main` (`d16e3c7`). Pedido: `.claude/pedidos/2026-10-06-completo.md`, parte 1.

## Qué se hizo

- **`js/sin-internet.js`** (nuevo): la copia de las lecturas en IndexedDB (`crearFetchConCopia`), la cola de cargas (`crearCola`) y la sesión guardada sin red (`sesionGuardada`). Lo usa `js/supabase.js` SOLO en la página con `<meta name="sd-sin-internet">` (la planta).
- **`sw-planta.js`** (nuevo, raíz): el service worker de la planta, con alcance solo `modulos/produccion.html`. HTML a la red primero (3 s), versión = huella SHA-256 de lo que la planta carga (cambia sola), conjunto entero por versión, aviso "Hay una versión nueva · Actualizar".
- **`modulos/produccion.html`**: las cargas (producido, paradas, vuelta, largada, lote nuevo, cierre, masas) van por la cola y por `ejecutar_tablet`; lo que espera se ve "pendiente de enviar"; el cartel fijo; precarga de la copia; abrir turno con clave por formulario; mensajes de lo que no anda sin red; la calculadora de cajas.

## Por qué se había apagado el service worker y cómo se evita

`eda3595` (06/07/2026): (1) servía TODO de la caché primero, también el HTML, así que se veía la versión vieja; (2) la versión era `CACHE_VERSION` a mano y casi todos los commits de julio la subían (por eso `git log --follow sw.js` muestra commits de filtros de Gastos); (3) se registraba con rutas absolutas (`/sw.js`, `/index.html`) que en GitHub Pages (`/seis-destinos/`) apuntaban afuera; (4) controlaba toda la app. Ahora: el HTML va a la red primero; la versión se calcula sola de los archivos; las rutas salen de la ubicación del propio archivo; y controla solo la planta.

## Decisiones que tomé sin consultar

1. **JS y CSS también van a la red primero** (10 s) cuando la página vino de la red, y salen de la copia solo sin red. Servir JS viejo de la caché con HTML nuevo de la red es la mezcla que deja la pantalla en blanco; la "versión atada al build" está en el nombre de la caché (`planta-app-<huella>`) y en que la copia se arma entera o no se usa. Una página que salió de la copia carga TODO de esa misma copia.
2. **La versión es la huella del contenido, no un número**: así nadie tiene que acordarse de subirla (que fue lo que mató al anterior).
3. **Pasar a un lote nuevo sin red está bloqueado** con un mensaje, igual que abrir una planilla: el número de lote lo da la base, y sin ese número la tablet no sabe a qué planilla cargar lo siguiente.
4. **Cambiar de modo sin red no se puede** (la regla de siempre pide PIN al cambiar de modo, y el PIN necesita la base). El mensaje lo dice.
5. **Nadie sale por inactividad sin internet** (el PIN no se podría verificar para volver a entrar).
6. **Una carga que la base rechaza EN EL MOMENTO sale de la cola** y se muestra su mensaje (como siempre: la persona está ahí y la corrige). Solo la que se rechaza mandada sola, más tarde, queda "con error para revisar".
7. Lo que no está en `ejecutar_tablet` (corregir/anular un sublote, borrar una parada, anular/tirar una masa, forzar el cierre, sumar/sacar operarios, proponer un cono) **sigue necesitando red** (falla con su mensaje de siempre).
8. **Los rápidos de cajas son +1 +2 +3 +5 +10 +20** (los mismos números de antes, ahora suman). "Deshacer último" deshace el último toque de un botón (−, +, +N, Borrar), no lo tipeado.
9. El cartel va **arriba al centro y no se come los toques**; en pantalla angosta (≤ 700 px) va **abajo**, porque arriba está la barra de secciones (lo encontró la prueba a 390 px).
10. La excepción en CLAUDE.md quedó como **decimotercera**, contando la undécima de `cuenta-unica` y la duodécima de "Ampliar", que se integran antes.

## Lo que NO se pudo probar

- **La tablet real** (Samsung Galaxy Tab A11): ni el service worker instalado como app anclada, ni un corte de verdad (wifi sin internet, que no es lo mismo que `setOffline`: ahí los pedidos quedan colgados y salen por el tiempo máximo de 8 s/20 s).
- **Contra la base real**: `ejecutar_tablet` no se ejecutó (Supabase en solo lectura); todo corre contra dobles. Se leyó con `pg_get_functiondef`.
- **La sesión vencida sin red en la tablet real** (el token dura 1 h): en Playwright se probó con el token vigente.
- **El aviso de versión nueva** en un deploy de verdad (la lógica está probada con mensajes simulados del service worker).
- IndexedDB lleno o borrado por el sistema.

## Guion para Facu (en la tablet)

1. Abrí la planta con internet y esperá un minuto en el tablero (se guarda la copia).
2. Sacale el wifi a la tablet.
3. Cargá 3 cajas, una parada y "Empezó a producir": arriba tiene que decir "Sin internet · 3 cargas esperando · se mandan solas".
4. Deslizá para recargar: tiene que abrir igual, con el mismo cartel y "Datos de las HH:MM".
5. Volvé a poner el wifi: en unos segundos "Enviando…" y "Todo enviado ✓"; en la gestión tienen que aparecer una sola vez cada una.

## Qué automatizaría ahora

La tarea repetida más cara de esta parte fue **armar a mano el backend simulado de la planta para cada prueba de navegador** (datos de tablas + RPCs, en `e2e/27` y antes en `e2e/6`). Propuesta: un `e2e/datos-planta-simulada.js` con la fábrica completa (turno abierto, catálogo, motivos, personal, `ejecutar_tablet` idempotente) que cualquier spec de la planta pida con una línea, generado de los mismos datos que la maqueta (`pruebas/datos-maqueta/produccion.js`).
