# Traspaso — Parte 1 · Cobranzas: encontrar al cliente (29/09/2026)

Pedido de Facu: al asentar no aparecía el cliente (el chofer escribe "JyM"). Usar `buscar_clientes` en el buscador de "Asentar" desde 2 letras, y también en Retiros y Pedidos; la empresa de cada resultado SIEMPRE a la vista; los sugeridos: los tres primeros como botones y el resto en el buscador.

Base: `main` en `34b42b2`. Supabase en solo lectura (solo SELECT y `pg_get_functiondef`).

## Lo que se verificó en la base (29/09/2026)

- `buscar_clientes(p_busqueda text, p_unidad_negocio_id uuid default null)` → jsonb, SECURITY DEFINER, `search_path = public, extensions`; `authenticated` sí, `anon` no. Null sin `cobranzas:procesar`, `retiros:ver` ni `pedidos:ver`. Hasta 60 filas `{cliente_id, nombre, razon_social, cuit, localidad, empresa, unidad_negocio_id, activo, saldo, parecido}` por parecido desc; solo activos; nunca `es_prueba`; con < 2 letras no filtra.
- `_clave_nombre(p)` = `regexp_replace(regexp_replace(normalizar_texto(p), '[^a-z0-9]+', '', 'g'), '^(.)y(.)$', '\1\2')`: "JyM" → "jm", y "J&M DISTRIBUCIONES Y SERVICI" empieza con "jm" (parecido 0,9).
- `cobranzas_por_asentar()`: `sugeridos` = `[{cliente_id, nombre, empresa, veces}]` ordenados por `veces` desc y empresa. **No trae `unidad_negocio_id`** (no hizo falta: asentar recibe el cliente y la unidad sale de él).
- Clientes: 83 en Nuss y 83 en Dolce Pasta; J&M DISTRIBUCIONES Y SERVICI existe en las dos.

## Qué se hizo

**Administración → Cobranzas por asentar** (`modulos/administracion.html`)
- Los tres primeros sugeridos como botones (`SUGERIDOS_EN_BOTONES`), en el orden que vienen; el resto como lista inicial del buscador ("Otros parecidos a lo que escribió el chofer"), con la pista "Escribí al menos 2 letras…".
- Desde 2 letras (`MIN_LETRAS_BUSCAR`), espera de 250 ms (`ESPERA_BUSCAR_MS`, timer en el panel `a.espera`) y después `consultarClientesAsentar(a)` → `buscar_clientes({ p_busqueda, p_unidad_negocio_id: null })`. Turno en el panel (`a.turno`) y además se descarta la respuesta si el texto escrito ya es otro. Mientras tanto dice "Buscando…".
- Cada resultado: nombre, razón social si es otra, **la empresa siempre** y **el saldo** (`textoSaldoCorto`: "Debe $ …", "A favor $ …", "Cuenta en cero"; un saldo que no vino no dice nada).
- Lo que ya está en los botones no se repite; si solo coinciden ellos: "Solo coinciden los sugeridos de arriba."
- **Null** → aviso "Con tu usuario no se puede buscar entre todos los clientes…" + la búsqueda local de antes. **Error** → aviso bordó "No se pudo buscar en la base: revisá la conexión…" + la local. Nunca un "no hay resultados" falso.
- La búsqueda local (`clientesParaAsentar`, tabla `clientes`) ahora también encuentra por la clave de `_clave_nombre` (réplica `claveBusquedaCliente`).
- Cuenta de la fábrica de pruebas (`estado.fabrica.soyDePrueba`): solo local, sin llamar a la base (la función nunca trae la unidad de prueba).
- Se puede elegir un cliente que solo trajo la base (no estaba en la tabla por la policy). Taller/proyecto sin cambios. Cancelar corta el timer.

**Retiros** (`modulos/retiros.html`) y **Pedidos** (`modulos/pedidos.html`)
- `buscar_clientes(texto, <empresa de la orden | unidad del pedido>)` desde 2 letras, con espera y turno (en `estado`: `buscarClientes`, `turnoBuscarClientes`, `esperaBuscarClientes`). Mientras no contesta se ve la lista local (ya mejorada con la clave).
- **Null** (depósito con solo `retiros:cargar`, o `pedidos:cargar` sin `ver`): queda la local **sin nada a la vista** y se anota `buscarClientesSinPermiso` para no volver a preguntar en esa página. Error: también local, en silencio (queda en consola).
- Se filtran filas de otra empresa/unidad (red). Cada resultado dice la empresa; **nunca el saldo**. Un cliente que solo trajo la base se incorpora a `estado.clientes` al elegirlo. La fábrica de pruebas no consulta.

**Maqueta**: la cobranza «JyM» (4 sugeridos: J&M Nuss, J&M Dolce, JM Viandas, Juan Manuel Kiosco), J&M en las dos empresas, `buscar_clientes` con `__segun` ("JyM", "pepe de la"); en retiros y pedidos, J&M en Nuss y `buscar_clientes` que responde "JyM" y null para lo demás. Pasos nuevos en `e2e/5-maqueta.spec.js`: "JyM" en el panel de Caserato, `asentar-jym` (3 botones + el cuarto en la lista) y `buscar-cliente` en Pedidos.

## Decisiones

- **Sin JS compartido nuevo**: el buscador se escribió tres veces (el patrón del proyecto). La suite `test-buscar-clientes.js` es la que impide que diverjan (la misma clave en los tres, mismas constantes, mismo contrato). Si se prefiere un `js/buscar-clientes.js` como octava excepción, es una decisión de arquitectura, no la tomé.
- **Réplica de `_clave_nombre()` en el cliente**: para que el depósito (que recibe null) también encuentre "JyM". Si cambia la función de la base, cambian las tres copias.
- **Admin dice el null/error; Retiros y Pedidos no** (pedido explícito para Retiros; en Pedidos elegí lo mismo). Admin igual casi nunca recibe null: entrar a esa sección ya exige `cobranzas:procesar`.
- **Saldo solo en Administración.**
- **Retiros/Pedidos muestran la lista local mientras esperan** (no "Buscando…"): en el depósito la local es casi siempre la respuesta final.

## Lo que NO se probó

- Nada con sesión real ni contra la base (cero RPCs ejecutadas; el conector estaba en solo lectura). El orden y el parecido real (trigram) los da la base: el doble de las suites ordena por nombre.
- Que `buscar_clientes` con `p_unidad_negocio_id = null` rinda bien con 166 clientes (hasta 60 filas; en la base real debería ser inmediato, no medido).
- Mirado en la maqueta a 390 y 1280 px (Asentar con «JyM», el buscador de Asentar, Retiros y Pedidos): sin scroll horizontal ni errores de JavaScript.

## Guion para Facu

1. Administración → Cobranzas por asentar → una cobranza con "JyM": tienen que aparecer como botones J&M (Nuss) y J&M (Dolce Pasta), cada una con su empresa. Tocá la que corresponde y "Asentar en esa cuenta": la deuda baja en esa empresa.
2. En otra cobranza, escribí "JyM" en el buscador: J&M en las dos empresas, cada una con su saldo ("Debe …" / "A favor …").
3. Retiros (con la cuenta de Emanuel, que tiene solo cargar): escribí "JyM" en el cliente: aparece J&M de la empresa de la orden, sin error y sin saldo.
4. Pedidos: lo mismo con la unidad del pedido.

## Qué automatizaría ahora

La tarea repetida más cara de esta parte fue **mantener tres copias del mismo buscador** (y su suite con un sandbox por módulo). Lo próximo: un `js/buscar-clientes.js` con la lógica pura (espera, turno, null → local, clave de `_clave_nombre`) que importen las tres pantallas, y `test-buscar-clientes.js` pasando a probar ese único archivo más el render de cada una — hoy ya cumple la condición de las excepciones ("copiada en N archivos diverge en silencio"). También convendría una prueba que compare la réplica `claveBusquedaCliente` contra `_clave_nombre()` de la base real en CI (hoy se compara contra una réplica en `buscar-clientes-comun.js`), por ejemplo en `e2e/` con los secretos del robot.
