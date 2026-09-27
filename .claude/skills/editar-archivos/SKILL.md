---
name: editar-archivos
description: Cómo editar archivos del proyecto con un script sin romperlos. Usala siempre que una edición no entre en la herramienta Edit (reemplazos masivos, mover bloques, generar código) y antes de escribir cualquier script de edición.
---

# Editar archivos con un script

## La regla

**Los scripts de edición se escriben en un ARCHIVO y se corren. Nunca por heredoc** (`python - <<'EOF'`, `node -e "…"` largos, `cat <<EOF > x`).

Por qué: en este entorno (Git Bash sobre Windows, y a veces PowerShell por debajo) un heredoc se come cosas sin avisar:
- `\\` se vuelve `\`, así que un regex o una ruta queda distinta de la escrita.
- Una comilla que el shell interpreta deja un string **sin cerrar**, y el archivo editado queda con un texto que no cierra en su línea — un `SyntaxError` que recién aparece en el navegador.
- `$algo` se expande a vacío.
- La herramienta de shell a veces rechaza un heredoc con comillas desparejas y no queda claro qué se corrió.

## Cómo

1. Escribí el script con la herramienta **Write** en el scratchpad de la sesión (no en el repo): `…/scratchpad/editar-<tema>.js` (o `.py` con strings crudos `r"…"`).
2. Que el script **verifique su ancla**: el texto a reemplazar tiene que existir **exactamente una vez**; si no, que falle diciendo cuál.
   ```js
   const n = src.split(ancla).length - 1;
   if (n !== 1) throw new Error(`ancla ${JSON.stringify(ancla.slice(0, 60))} aparece ${n} veces`);
   src = src.replace(ancla, () => nuevo);   // con FUNCIÓN: un string interpreta $&, $', $$
   ```
3. Correlo: `node …/scratchpad/editar-<tema>.js`.
4. Verificá:
   ```bash
   node pruebas/check-bytes.js     # 0 CR, 0 NUL, y ninguna comilla sin cerrar en su línea
   node pruebas/check-scripts.js   # el archivo entero como lo ve el navegador
   git diff --stat
   ```

## Qué más cuidar

- **Nunca `git stash` ni `git checkout -- archivo`** para volver atrás: para comparar contra el estado limpio, `git show <commit>:archivo > limpio.html`.
- **Un carácter invisible se escribe con su escape** (`'\u0000'`, `'̀-ͯ'`), nunca el carácter literal: un NUL saca el archivo del régimen de texto de git, y un combinante se ve vacío en el fuente.
- Antes de declarar un identificador nuevo en un archivo grande, `grep` que el nombre esté libre (un `const` duplicado mata el módulo entero).
