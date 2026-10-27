# Pedido 26/10/2026 — "Mandar a otra empresa del grupo" (tarea 3 de la cola)

Rama ci-prueba/mandar-a-otra-empresa (desde el origin/main después de Rosario, f751e10). No toca modulos/produccion.html:
se integra apenas esté en verde. Copiado del chat (COLA DE TAREAS del 26/10/2026):

TAREA 3 — "Mandar a otra empresa del grupo" como opción general.
Problema: hoy, para mandar mercadería a Rosario o a Mengui, lo único a mano es la transferencia de Stock → Insumos, que no
admite producto terminado. La forma decidida por Facu (24/10) es la orden de retiro a la otra empresa como cliente
(clientes.unidad_grupo_id), que ya lleva producto terminado e insumos juntos, descuenta del origen, entra en el stock de la
otra empresa con los mismos lotes (_orden_grupo_espejar) y se valoriza con la lista interna. Verificá todo esto con
pg_get_functiondef antes de codificar.
a) En la entrada de Stock (#stock-eleccion), un tercer botón grande "Mandar a otra empresa del grupo" (visible con
   retiros:cargar en la fábrica de la barra). Lleva a la Carga (modulos/retiros.html) con la fábrica de origen y una
   elección previa de a qué empresa: los clientes de esa fábrica con unidad_grupo_id no nulo (hoy, en Nuss DOLCE PASTA SRL;
   en Dolce PAZ, MIRTA = Nuss). Con una sola opción, ya elegida. Pasala por la URL (?cliente=<id>) y que la Carga la tome.
b) En esa orden se puede agregar producto terminado e insumos, como cualquier orden. Arriba, un aviso: "Va al stock de
   <empresa> con los mismos lotes".
c) Transferencias de insumos (Stock): sacar el botón de crear una transferencia NUEVA y poner en su lugar un link a "Mandar a
   otra empresa del grupo". Ver, aceptar o rechazar las pendientes y el historial sigue igual (hoy hay una pendiente
   Nuss → Dolce del 26/10 que tiene que poder aceptarse). No borrar tablas ni RPCs.
d) Suites test-/mut- de lo nuevo, maqueta, e2e a 390 y 1280 px. Actualizá docs/memoria/stock.md y retiros.md.
npm run pruebas, check-scripts y check-bytes en verde.
