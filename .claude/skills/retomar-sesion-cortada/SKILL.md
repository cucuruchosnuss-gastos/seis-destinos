---
name: retomar-sesion-cortada
description: Retomar cuando una sesión anterior se cortó a mitad de trabajo y dejó cambios sin commitear en el árbol. Usala al empezar si `git status` no está limpio, o cuando Facu dice "se cortó la sesión" o "quedó algo a medias".
---

# Retomar una sesión cortada

Regla de hierro: **nunca `git stash` ni `git reset --hard`**. El stash reescribe la copia de trabajo (en este repo llegó a dejarla en CRLF y puso doce suites en rojo) y el reset borra sin dejar rastro. Lo que quedó se GUARDA afuera del repo y recién después se deja el árbol igual a HEAD.

## Pasos

1. **Ver qué quedó**
   ```bash
   git status --short
   git log --oneline -5
   ```

2. **Guardarlo entero, afuera del repo.** Nombre corto con fecha: `<AAAA-MM-DD>-<tema>`.
   ```bash
   D="C:/Users/Facu/proyectos/traspasos-pendientes/<nombre>"
   mkdir -p "$D/archivos"
   git diff HEAD > "$D/cambios.patch"        # modificados (y lo que esté en el índice)
   git status --short > "$D/status.txt"
   git rev-parse HEAD > "$D/base.txt"        # sobre qué commit estaba
   # cada archivo modificado o nuevo, ENTERO, con su ruta
   git status --porcelain | cut -c4- | while read -r f; do
     mkdir -p "$D/archivos/$(dirname "$f")"; cp -r "$f" "$D/archivos/$f"
   done
   ls -R "$D" | head -40
   ```
   Verificá que `cambios.patch` no esté vacío si había modificados, y que cada archivo nuevo esté en `archivos/`.

3. **Dejar el árbol idéntico a HEAD, sin reset**, con `cp` ya hecho y `git checkout --` para cada modificado:
   ```bash
   git status --porcelain | grep -E '^( M|M |MM)' | cut -c4- | while read -r f; do git checkout -- "$f"; done
   git status --porcelain | grep '^??' | cut -c4- | while read -r f; do rm -r "$f"; done   # ya copiados en el paso 2
   git status --short                     # tiene que quedar vacío
   node pruebas/check-bytes.js            # 0 CR, 0 NUL
   ```

4. **Leer los traspasos** de `.claude/traspasos/` (los más nuevos primero) y el `status.txt` guardado, para saber qué hacía la sesión cortada y hasta dónde llegó.

5. **Decidir**: reaplicar lo guardado (`git apply "$D/cambios.patch"` o copiar de `archivos/`) solo si está completo y las pruebas lo confirman; si no, rehacerlo desde el traspaso. En los dos casos, cerrar con la skill cerrar-tanda. La carpeta de `traspasos-pendientes` se borra recién cuando lo guardado quedó en `main` o se descartó con acuerdo de Facu.
