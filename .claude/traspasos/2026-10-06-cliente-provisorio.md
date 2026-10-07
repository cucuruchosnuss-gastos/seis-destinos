# Traspaso — el cliente provisorio (06/10/2026)

Rama `ci-prueba/cliente-provisorio` (desde `7ecf298` = main + la integración + las ramas B y C). **Sin push y sin tocar main.** La base ya estaba hecha (chat de arquitectura): esta tanda es solo pantalla y pruebas, cero escrituras en Supabase (solo SELECT de lectura).

## Lo hecho

1. **Órdenes de retiro (`modulos/retiros.html`)** — si el buscador no lo encuentra, **"+ Cliente nuevo: «lo escrito»"**:
   - nombre (obligatorio, viene con lo buscado), teléfono (`type="tel"`, texto tal cual: es un identificador) y localidad;
   - "Seguir" muestra primero **"¿Es alguno de estos?"**: `buscar_clientes` con el nombre (también por apodo, con el `apodo_coincide` al lado) o, si la base dice null (el depósito con solo `retiros:cargar`) o falla, la búsqueda local (la de siempre + los que comparten una palabra de 4 letras o más en nombre, razón social o apodo). Tocar uno lo elige sin crear nada;
   - "No es ninguno: cargar «X»" → `crear_cliente_provisorio`; la orden sigue con ese cliente (mismo uuid, mismos renglones) y "Retira" lleva el chip "Provisorio". Error de la base tal cual, pegado; doble toque, una sola llamada.
2. **Administración → Clientes** — los provisorios arriba con chip "Provisorio"; burbuja gris en la pestaña Clientes y la línea "N clientes provisorios por confirmar" en la tarjeta de la portada.
   - **"Completar y confirmar"**: la ficha de siempre con aviso y botón "Guardar y confirmar" → `guardar_ficha_cliente` (solo si cambió algo) y `confirmar_cliente`.
   - **"Unir con un cliente existente"**: buscador de la misma empresa, vista previa ("Pasan a X: 3 órdenes de retiro, 1 cobranza, 0 pedidos y $ … de saldo…"; lo que no se puede leer se dice, nunca un 0), confirmación propia en el panel ("¿Unir a Y con X? No se puede deshacer desde acá." · Sí, unir / No) → `unir_clientes`.
3. **Valorizar** una orden de un provisorio sin lista → "Primero asigná la lista de precios a X…" con "Ir a su ficha" (en modo completar y confirmar), en vez del valorizar con los precios vacíos.
4. **Pruebas**: `test-/mut-retiros-cliente-nuevo.js` (73/73; 40/40), `test-/mut-clientes-provisorios.js` (88/88; 57/57), `e2e/27-cliente-provisorio.spec.js` (8 casos, 390 y 1280 px, con `maqueta.cambios`: no se tocaron datos de maqueta compartidos). Sandboxes y `seguras-*` al día.

## Decisiones tomadas sin consultar

- **El botón "+ Cliente nuevo" aparece con cualquier texto en el buscador**, no solo cuando no hay resultados: la búsqueda por parecido casi siempre trae algo y el botón quedaría inalcanzable. La barrera contra duplicados es el paso "¿Es alguno de estos?", que es obligatorio.
- **Mínimo de 3 caracteres como la base** (cuenta caracteres de `upper(btrim())`, así que "a b" pasa en las dos puntas).
- **"Completar y confirmar" solo con `retiros:precios`** (la ficha la abre esa tarea); "Unir" con `pedidos:configurar` o `retiros:precios` (`puedeDarAlta`, la regla de `_puede_gestionar_cliente` menos `cuentas_corrientes:alta_proveedor`, que Administración no lee).
- **Burbuja de Clientes gris (no urgente)**: no es plata vencida.
- **La vista previa cuenta todas las órdenes del provisorio** (también anuladas): `unir_clientes` las pasa todas.
- **Proyectos del Taller**: no se pueden contar (la tabla `proyectos` solo deja leer algunas columnas); en el Taller se avisa que también pasan.
- **El aviso de la lista es solo para PROVISORIOS sin lista**; un cliente común sin lista sigue como antes (cargar cada precio).
- **"Ir a su ficha" abre la ficha en modo "Guardar y confirmar"** (el cliente es provisorio: completarlo es confirmarlo).
- **Anclas de mutaciones viejas puestas al día** (no eran mías, abortaban desde antes por merges previos): en `mut-administracion-clientes.js` ("ver alcanza para la ficha", "la ficha se abre sin precios") y `mut-clientes-apagados.js` ("el interruptor con otro permiso", "la cuenta no dice apagado", "un apagado que viene igual…", y `esc(TEXTO_ELEGI_FABRICA)` como equivalente) y `mut-buscar-clientes.js` ("retiros: muestra el saldo", sin el `apodo_coincide`). Mías: `mut-retiros-carga.js` (el select con `provisorio`) y `mut-administracion-diseno.js` ("los activos no se cuentan"). Si las ramas cuenta-unica o comisiones también las tocan, puede haber un conflicto chico en esos renglones: quedarse con la versión que corra en verde.
- **Para juntar con las otras ramas sin pelea** se tocó lo mínimo de la lista y la ficha: una línea en `htmlFilaCliente` (chip + `htmlAccionesProvisorio`), una en `clientesDeLaLista`, una en `pintarPieFicha`, una en `guardarFicha`, una en `abrirValorizar`; todo lo demás va en un bloque propio ("LOS CLIENTES PROVISORIOS") antes de "La cuenta corriente".

## Huecos de base

- **CERRADO el 06/10/2026: `mis_pendientes()` ya devuelve `('administracion', 'clientes_provisorios', N)`**, y el menú y el tablero los muestran. Lo que decía antes: **`mis_pendientes()` no devuelve los provisorios**: la burbuja sale de contar `clientes`; **la barra lateral y el tablero no tienen burbuja de provisorios**. Si se quiere, la base podría sumar `('administracion', 'clientes_provisorios', N, 'Clientes provisorios por confirmar')` con `_puede_gestionar_cliente` y sin la fábrica de pruebas; la pantalla tendría que sumarla a `MODULO_DE_PENDIENTE` / `RESOLVER_PENDIENTES`.
- **`clientes_con_saldo()` no devuelve `provisorio`** (sale de la fila de `clientes`, que Administración ya lee).
- **`unir_clientes` no tiene vista previa en la base**: la pantalla cuenta lo que puede leer con los permisos de la persona (sin `cobranzas:ver_todo` o `pedidos:ver` lo dice).
- **CERRADO el 06/10/2026 (la base ya no lo repite; ninguna pantalla ni prueba contaba con el duplicado).** Lo que decía antes: **`mis_pendientes()` devuelve `stock/lotes_sin_ingreso` DOS veces** (el bloque está repetido en su cuerpo): la tarjeta de Stock lo suma dos veces.
- `valorizar_orden_retiro` con un cliente sin lista y sin precios falla "Faltan precios en N renglón(es)…" (la pantalla avisa antes, solo para provisorios).

## Lo que NO se probó

- **Nada con sesión real ni contra la base**: las RPCs nuevas no se ejecutaron (solo lectura). Todo corre contra dobles y la maqueta.
- El depósito real con solo `retiros:cargar`: la maqueta lo imita (buscar_clientes devuelve null).
- Que `crear_cliente_provisorio` con el mismo nombre en mayúsculas / acentos dé el mensaje de duplicado (está leído en `pg_get_functiondef`, no ejecutado).

## Guion para Facu

1. En el celular, Órdenes de retiro → Nuss → escribir un cliente que no existe ("Kiosco Prueba") → "+ Cliente nuevo" → teléfono → Seguir: tiene que mostrar los parecidos (o "No hay ningún cliente parecido") → "No es ninguno": la orden sigue con KIOSCO PRUEBA y el chip "Provisorio". Cargar un renglón y confirmar.
2. Administración → Clientes (Nuss): KIOSCO PRUEBA arriba con "Provisorio", y la pestaña Clientes con un 1 gris.
3. Órdenes → esa orden → Valorizar: tiene que decir "Primero asigná la lista…". "Ir a su ficha" → elegir la lista → "Guardar y confirmar": deja de ser provisorio.
4. Otro de prueba → "Unir con un cliente existente" → elegir uno → leer la vista previa → Unir → Sí, unir: el de prueba queda apagado y su nombre como apodo del otro.

## Qué automatizaría ahora

- **Una prueba que corra TODAS las `mut-*.js` en GitHub una vez por semana** (hoy `mutaciones.yml` es manual): en esta tanda aparecieron 6 anclas rotas en 3 runners que nadie había visto porque abortaban en silencio desde merges anteriores. Un cron semanal (o solo las mut cuyo HTML cambió en el push) las atraparía al día.
- **Un helper de pruebas `cambiosMaqueta(page, url, cambios)`** en `e2e/ayuda.js`: las specs 22 y 27 repiten goto + sessionStorage + reload + limpiar.
