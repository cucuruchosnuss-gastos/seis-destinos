# Pedido 28/10/2026 — ci-prueba/ensayo-confiable

Rama: ci-prueba/ensayo-confiable (desde el origin/main más reciente; trabajá en una copia aparte con git worktree). No toca módulos ni la base: solo pruebas/, scripts y docs/memoria/pruebas-y-ensayo.md. Se puede integrar en cuanto esté en verde.

Problema: hoy varias sesiones de Code trabajan e integran al mismo tiempo y el ensayo se volvió poco confiable:
- el tope fijo de 20 min corta las suites (ya tardan 21-23 min solas) y el de 45 min corta el navegador;
- --limpiar borra carpetas de ensayos que todavía están corriendo en otra sesión (pasó 3 veces el 27-28/10);
- el reparto de las dos mitades del Navegador (test-navegador-en-dos.js, tope 55 %) se arregla a mano moviendo specs y trabó tres integraciones;
- dos sesiones integraron a main al mismo tiempo y tuvieron que repetir respaldo, merge y 20 min de pruebas;
- hay specs con el mismo número (70, 71).

Tareas:
1. Topes del ensayo: que salgan de la duración de la última corrida en verde (guardada en un archivo ignorado por git) + 30 % de margen, con un mínimo razonable; el navegador del ensayo corre en dos mitades en paralelo, igual que GitHub.
2. --limpiar: cada ensayo deja un archivo con su PID y hora; --limpiar saltea las carpetas cuyo proceso sigue vivo y solo borra las abandonadas de más de 6 h.
3. Reparto de mitades automático: un script que reparte los specs entre las dos mitades con los tiempos de la última corrida de GitHub (o un archivo de tiempos en el repo), y test-navegador-en-dos.js lo usa en vez de la lista a mano.
4. Candado de integración: antes de integrar, crear la rama remota integrando/<sesión> (git push origin HEAD:refs/heads/integrando/<sesión>); si ya existe otra de menos de 90 minutos, esperar y avisar; borrarla al terminar. Documentalo en reglas-de-integracion.md.
5. Números de spec: que una prueba dé rojo si dos specs comparten número, y un script que diga el número siguiente libre. Renumerá los repetidos.
6. Que npm run pruebas:rama corra primero lo que toca la rama y frene antes de las 315 si eso da rojo.
npm run pruebas en verde y GitHub en verde; después integrá con el candado nuevo.

Al terminar: hash de la rama, lo que decidiste sin consultar, lo que no pudiste probar y "Qué automatizaría ahora". Mandame UN solo resumen completo y, como último mensaje solo: TERMINADO — mandar al chat
