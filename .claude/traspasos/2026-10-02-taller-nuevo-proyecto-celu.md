# Traspaso — Proyectos Taller: crear un proyecto desde el celular (02/10/2026)

Rama `ci-prueba/taller-nuevo-proyecto-celu`. Cero cambios de base.

## Qué hace
- **"+ Nuevo proyecto"** se ve en el celular para quien tiene `taller:gestionar` (Tomás, Edgar, Facu): arriba de la lista, a todo el ancho, fácil de tocar.
- El formulario se completa y se guarda a 390 px: letra de 16 px en los campos (sin zoom del celular), los campos de a dos en una columna, "¿Para quién es?" en dos botones parejos, y la barra de abajo se esconde mientras se escribe (con el teclado abierto no tapa nada).
- **"Valor de la hora"** también se ve en el celular (lo consulta cualquiera que vea el Taller; cargarlo sigue pidiendo `taller:precios`).

## Lo que queda solo en la compu, y por qué
- **El diagrama de actividades** y su "agrupar por operario / proyecto": son barras de una semana de 6 días que se arrastran; en 390 px no entran. El celular tiene "Mis actividades" (las propias por día, con Horas y Avance).
- **La búsqueda y los filtros de archivos**: en el celular la grilla se ve entera, y los proyectos tienen pocos archivos.
- **La nota "Las fotos se pueden subir desde el celular…"**: es para quien está en la compu; en el celular sobra.
- Editar y cambiar el estado ya estaban en el celular (botón "Editar el proyecto" del resumen).

## Decisiones tomadas sin consultar
- El botón "Valor de la hora" pasó a verse también en el celular.
- La barra de abajo del celular se esconde mientras se escribe en el formulario del proyecto (vuelve al salir del campo).

## Lo que no se pudo probar
- En un celular real con el teclado de verdad. Lo probado: la maqueta en Chromium a 390 px, con la pantalla achicada a 420 px de alto para imitar el teclado abierto, y a 1280 px.

## Guion para Facu
1. En el celular, entrá a Proyectos Taller con tu usuario: arriba de la lista está "+ Nuevo proyecto".
2. Tocalo, completá nombre, para quién es, categoría y fechas: la pantalla no tiene que agrandarse sola ni quedar nada tapado por el teclado.
3. Guardá: se abre el proyecto nuevo.

## Qué automatizaría ahora
- Un chequeo de la maqueta que recorra TODAS las pantallas a 390 px y marque cualquier campo con letra de menos de 16 px (hoy lo tienen la planta y este formulario, cada uno por su lado).
