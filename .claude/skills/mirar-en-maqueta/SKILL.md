---
name: mirar-en-maqueta
description: Mirar una pantalla renderizada sin sesión ni base, con datos fijos (la maqueta de e2e/maqueta). Usala antes de cerrar cualquier parte que cambie una pantalla, para medir a 390 y 1280 px, ver que no haya scroll horizontal y mirar la hoja de impresión.
---

# Mirar una pantalla en la maqueta

La maqueta sirve el repo tal cual, pero con `js/supabase.js` cambiado por un doble que lee datos fijos de `e2e/maqueta/datos/<nombre>.json`. **Sirve para MIRAR, no para probar**: lo que hace la pantalla con la base real lo dicen `pruebas/` y los recorridos de `e2e/`.

## Pasos

1. **Datos.** Si el módulo no tiene su archivo en `e2e/maqueta/datos/`, crearlo copiando uno parecido (`retiros.json`, `administracion.json`). Forma: `{ "uid": "uid-maqueta", "tablas": { "<tabla>": [filas] }, "rpc": { "<rpc>": <respuesta> } }`. La fila de `empleados` tiene que tener `auth_user_id: "uid-maqueta"`, y `empleado_tareas` las tareas que la pantalla mira. Una rpc con el texto `"ERROR:…"` responde como un error de la base.

2. **Servir** (en segundo plano) y abrir con el nombre de los datos:
   ```bash
   node e2e/maqueta/servir.js 4180
   ```
   → `http://localhost:4180/modulos/<modulo>.html?maqueta=<nombre>` (el nombre queda recordado en la pestaña).

3. **Mirar** con el navegador integrado: `resize_window` a 375 (mobile) y a 1280, `document.documentElement.scrollWidth === innerWidth` (sin scroll horizontal), y capturas de cada vista. Las rpc que "guarda" la pantalla se ven en la consola como `[maqueta] rpc …`.

4. **Una hoja de impresión**: reemplazar `window.print` por una función vacía, tocar Imprimir, mostrar el contenedor de impresión en pantalla y medir en mm (`px / (96 / 25.4)`) el alto de cada copia.

5. Anotar en el traspaso qué se miró y a qué anchos, y que fue en la maqueta (sin sesión real).
