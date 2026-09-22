# Traspaso para el chat de arquitectura — Accesos, textos de Cobranzas (21/09/2026, noche, parte 10a)

Pedido explícito de Facu: actualizar el TEXTO de las tareas de Cobranzas en el
`CATALOGO_TAREAS` de `modulos/accesos.html`, porque en Cobranzas los estados se
renombraron en pantalla (`registrada` → "Por controlar", `procesada` →
"Asentada") y el catálogo seguía usando las palabras viejas. **Solo label y
descripcion: ninguna clave, ningún flag, nada que viaje a la base.** El CHECK
`chk_tarea_valida` no se tocó ni hace falta tocarlo.

## Qué cambió en `modulos/accesos.html`

- `cobranzas:cargar`, descripcion: "...mientras nadie las haya procesado." →
  "...mientras sigan por controlar, es decir, mientras nadie las haya asentado."
- `cobranzas:editar_anular`, **label**: "Editar cobranzas ajenas sin procesar y
  anular cualquiera" → **"Editar cobranzas ajenas por controlar y anular cualquiera"**.
- `cobranzas:editar_anular`, descripcion: "está registrada" → "está por
  controlar"; "una vez procesada queda bloqueada" → "una vez asentada queda
  bloqueada"; remite a la tarea "Controlar y asentar cobranzas" (antes nombraba
  "Marcar cobranzas como procesadas", un label que ya no existía); "también una
  ya procesada" → "también una ya asentada".
- `cobranzas:procesar`: sin cambios (label "Controlar y asentar cobranzas" ya
  estaba; su descripcion no usa las palabras viejas).
- Los comentarios de código que dicen "procesado"/"registrada" quedaron: hablan
  del valor de la base, no son texto visible.

## Verificación

- `node pruebas/check-scripts.js modulos/accesos.html` → OK (2 bloques, sin
  identificadores pisados).
- Suite nueva **`pruebas/test-accesos-textos.js`**: extrae `CATALOGO_TAREAS` con
  `extraerConst` y lo EJECUTA; verifica que las claves de Cobranzas sigan siendo
  exactamente `cargar`, `ver_todo`, `procesar`, `editar_anular`, que ningún
  label/descripcion de Cobranzas matchee `/procesad|registrad|Marcar cobranzas/i`,
  que `editar_anular` diga "por controlar" en el label y remita a "Controlar y
  asentar cobranzas". **16/16** sobre el archivo nuevo; **12/16 (4 fallas, rojo)**
  contra `git show a413663:modulos/accesos.html` vía `ARCHIVO_TEST`.
- Sin commit ni push (pedido). Cero escrituras en Supabase.

## Qué tocar en CLAUDE.md

Sección **Sistema de permisos**, entrada `cobranzas:editar_anular`: el label
citado ahí ("Editar cobranzas ajenas sin procesar y anular cualquiera", en la nota
del `8361046`) pasa a ser **"Editar cobranzas ajenas por controlar y anular
cualquiera"**. En la sección del módulo Cobranzas (REDISEÑO → NOMBRES DE LOS
ESTADOS), agregar que las descripciones de las cuatro tareas en `accesos.html`
ya usan "por controlar" / "asentada". Y sumar `test-accesos-textos.js` a la
lista de "Qué hay hoy" en la regla de `pruebas/`.
