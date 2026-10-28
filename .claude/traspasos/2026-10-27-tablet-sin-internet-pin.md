# Traspaso 27/10/2026 — la tablet sin internet con el wifi conectado y el PIN sin internet

Pedido: `.claude/pedidos/2026-10-27-tablet-sin-internet-pin.md`. Rama `ci-prueba/tablet-sin-internet-pin` desde `origin/main` = `7793c83`. Toca `modulos/produccion.html` (la tablet): **se integra SOLO de noche**. La base no se tocó (solo un SELECT de `pg_get_functiondef('verificar_pin_produccion')` el 27/10).

## Qué cambió
- `js/sin-internet.js`: sección 4 `chequearRed` (GET `/auth/v1/health?apikey=…`, 5 s como máximo, corta el pedido) y sección 5 el PIN sin internet (`guardarPinSinRed`, `verificarPinSinRed`, `olvidarPinSinRed`; PBKDF2-SHA-256, 600.000 vueltas, sal al azar por tablet + clave unidad|persona|puesto, 7 días, 5 errores = 5 minutos bloqueado, `debe_cambiar` como marca sin hash). IndexedDB aparte: `sd-planta-pines`.
- `js/supabase.js`: exporta `SUPABASE_URL` y `SUPABASE_KEY` (y la maqueta también: `e2e/maqueta/supabase-falso.js`, `servir.js` contesta `/maqueta-supabase/auth/v1/health`).
- `modulos/produccion.html`: `sinInternet()` mira el chequeo; `chequearRedPlanta` cada 30 s, al arrancar, con `online` y al poner el PIN; `revisarInactividadConRed` (el reloj de 1 s) no cierra si el chequeo no contesta; `enviarPin` sin red usa el hash (o si la RPC falla por red / el chequeo dice que no antes de que conteste); "Modo sin internet" en la barra (parada: "Sin red"); `revalidarSiVolvioLaRed` pide el PIN de nuevo al volver la red, en la primera pausa; la cola no intenta la red si el chequeo dijo que no.
- Pruebas: `test-/mut-produccion-sin-internet-pin.js` (suite nueva, dos partes), `e2e/70-tablet-sin-internet-pin.spec.js`; ajustes chicos en `test-produccion-sin-internet.js`, `mut-produccion-sin-internet.js` (el mensaje viejo del PIN sin red ya no existe), `test-produccion-sesion.js` (una espera), `sandbox-produccion.js` (las funciones nuevas y un `chequearRed` falso: `S.__red.hay`), `e2e/backend-simulado.js` (exporta `USUARIO`).
- Memoria: `docs/memoria/produccion.md` (bullet del 27/10 arriba de todo), `docs/memoria/aprendizajes.md` (navigator.onLine solo dice si hay wifi).

## Decidido sin consultar
1. El chequeo es contra `/auth/v1/health` de Supabase con la key en la URL (verificado: 200 en 0,4 s y CORS para el dominio de Pages). Cualquier respuesta < 500 = hay red.
2. Sin red, 5 errores de PIN bloquean 5 minutos (igual que la base hoy), para que no se puedan probar los 10.000 PINes en la tablet.
3. PBKDF2 con 600.000 vueltas (lo que recomienda OWASP hoy). En una tablet barata puede tardar ~1 s al verificar sin red.
4. "Al volver la red, la próxima acción revalida": lo hice como "en la primera pausa": si nada está a medio cargar, la tablet vuelve sola a "¿Quién sos?" con esa persona y el teclado ("Volvió internet: poné tu PIN de nuevo para seguir."). Con una masa empezada (tamaño elegido, algo cambiado, motivo escrito), una parada o un producto a medio cargar, espera. Lo cargado sin red sale igual con la cola.
5. Si la RPC de PIN falla por red pero el chequeo dice que hay red, manda el chequeo (la persona queda "sin red" y se revalida enseguida).
6. Base aparte de IndexedDB para los PINes (`sd-planta-pines`): subir la versión de `sd-planta` podía trabar la cola con dos pestañas abiertas.
7. El acceso maestro y cambiar un PIN siguen necesitando red (mensaje claro).
8. "Lote nuevo" en la masa: no hay RPC que cree un lote; el lote escrito a mano viaja en la masa, así que anda sin red (probado en e2e). El lote nuevo de la PLANILLA (`relanzar_con_lote_nuevo`) sigue con su mensaje de siempre.

## La integración (28/10/2026, de noche, Facu escribió "integra")
- El primer ensayo (`main` 7750ac8 + la rama) dio tres rojos:
  1. **Un error de verdad**, en el navegador: después de registrar una masa la tablet lee la siguiente de la base. Si en ese rato volvía la red, se pedía el PIN y al terminar la lectura la receta se pintaba encima del PIN. Arreglado: `revalidarSiVolvioLaRed` espera mientras se registra una masa o se lee la siguiente (`leyendoMasa`). Suite 99/99, mutaciones 55/55 (+4), e2e de la tablet 3 veces seguidas en verde.
  2. `test-navegador-en-dos.js`: con el spec 70 la mitad 2 pasaba del 55 % (912 de 1653 s). El spec 70 pasa a la mitad 1 (`e2e/mitades.js`, 50 s estimados).
  3. El navegador del ensayo llegó al tope de 45 minutos sin terminar (la rama toca `js/supabase.js` y la maqueta, así que corren los 94 specs: en la compu tarda más de 42 minutos). Fue tiempo, no una falla: el segundo ensayo se corrió con `ENSAYO_TOPE_NAVEGADOR_MIN=90`.

## Lo que no se pudo probar
- En la tablet Samsung real: cuánto tarda PBKDF2 de 600.000 vueltas y el corte real del wifi de la fábrica.
- Los 10 minutos de inactividad de verdad en el navegador (está probado en la suite con el reloj a mano, no en e2e).
- El cartel "Sin internet" de arriba tapa en parado el nombre de la persona (pasaba antes también; no lo toqué).

## Qué automatizaría ahora
Un "modo corte" en `e2e/backend-simulado.js` que cuelgue los pedidos (en vez de abortarlos), para probar el caso más feo (la red que no contesta) sin esperar 20 s, y un `page.clock` para la inactividad de 10 minutos en e2e.
