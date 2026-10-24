# Pedido del 21/10/2026 — Conos parecidos al crear uno nuevo (rama `ci-prueba/conos-parecidos`)

**Commit y push de la rama, SIN integrar. Toca la tablet: se integra SOLO de noche.** Si la sesión se compacta, se retoma desde este archivo.

## El pedido (tal cual llegó)

PROBLEMA (21/10): en producción crearon el cono "CASERATTO" (dos T) cuando ya existía "CASERATO". Se corrigió a mano en la base.

BASE (21/10/2026, en producción, probada por el chat de la base):
- RPC conos_parecidos(p_nombre text) → jsonb [{marca_id, nombre, igual (bool), similitud}], hasta 5, sin los rechazados ni el nombre exacto. igual = mismo nombre salvo letras repetidas, tildes o espacios. Devuelve [] con menos de 3 letras.
- RPC proponer_marca(p_nombre text, p_es_otro boolean default false) → jsonb {marca_id, ya_existia}. Si hay uno "igual" y p_es_otro es false, rechaza: "Ya existe el cono X: elegí ese. Si de verdad es otro cono, confirmalo." Con p_es_otro = true lo crea igual (queda pendiente de revisión, como siempre).

QUÉ HACER: en TODOS los lugares donde se propone un cono nuevo (tablet modulos/produccion.html, "+ Cono nuevo" en conos.html y donde más se llame a proponer_marca; buscalos con grep y listalos en el resumen):
1. Mientras escribe el nombre (≥3 letras, con 300 ms de espera entre teclas): llamar a conos_parecidos y mostrar arriba del botón "¿Quisiste decir…?" con cada parecido como botón grande (en la tablet, tamaño para el dedo). Tocar uno = elegir ESE cono existente (no se crea nada).
2. Si hay un parecido con igual = true: el botón "Crear cono nuevo" pasa a decir "Es otro cono, crearlo igual" y pide confirmación ("¿Seguro que no es <nombre>?"), y recién ahí manda p_es_otro = true.
3. Si proponer_marca devuelve el error de "Ya existe el cono…", mostrarlo tal cual y ofrecer elegir ese cono.
4. Sin internet: no se muestran parecidos y se comporta como hoy (la base frena igual al subir).
PRUEBAS: unitarias, de mutación y e2e (tablet 1000×540 y 390): parecidos al escribir, elegir uno no crea nada, "igual" exige confirmación y manda p_es_otro, error de la base tal cual, sin red sin parecidos. npm run pruebas, check-scripts, check-bytes en verde. Resumen con rama, hash y la lista de lugares tocados.
