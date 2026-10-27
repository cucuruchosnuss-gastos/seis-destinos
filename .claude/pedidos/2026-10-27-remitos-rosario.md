# Pedido 27/10/2026 — remitos de Rosario (Dolce Pasta) por foto, leídos por la IA

Rama ci-prueba/remitos-rosario desde el origin/main más reciente (e698bc0). No toca modulos/produccion.html: integrarla
apenas esté en verde (ensayo, respaldo, merge --no-ff, pruebas, push, GitHub en verde). Un solo resumen al final.

OBJETIVO: en Rosario (Dolce Pasta) no hay compu ni impresora. Manuel hace remitos a mano (talonario Dolce Pasta, N°
impreso arriba a la derecha tipo 0001-00003100, fecha en casillas dd/mm/aa, "Señor/es", renglones CANT. / DESCRIPCIÓN)
y hoy los manda por foto. Desde ahora sube la foto en la app, la IA lo lee y queda una orden PRECARGADA que Yanina
revisa, corrige y confirma; después se valoriza como cualquier orden.

BASE (ya en producción, hecha por el chat de la base el 27/10/2026; verificada con pg_get_functiondef el 27/10/2026):
- Tabla remitos_precarga (RLS: SELECT con retiros:cargar o retiros:ver en la fábrica; sin escritura directa).
- ordenes_retiro: numero_remito, numero_remito_n (generada), remito_precarga_id. Índice único por fábrica +
  numero_remito_n (sin contar anuladas).
- RPCs: crear_remito_precarga, guardar_lectura_remito, marcar_error_lectura_remito, actualizar_remito_precarga,
  confirmar_remito_precarga, descartar_remito_precarga.
- Storage: policy "comprobantes: ver fotos de remitos precargados".
- Catálogo: productos_terminados.alias, presentaciones (unidades_por_caja, con_cono), marcas_personalizadas, insumos,
  clientes de la fábrica.

A) Edge Function supabase/functions/ocr-remito/index.ts (copia de la estructura de ocr-materia-prima). NO se despliega:
   la despliega el chat de la base después de auditarla.
B) Subir (modulos/retiros.html): botón "Subir remitos Rosario", cámara, varias fotos, "Mis remitos subidos".
C) Revisar (modulos/administracion.html, Órdenes): "Remitos precargados · por revisar", foto con zoom, encabezado y
   renglones editables, amarillos, Aceptar sugerencia, Guardar / Volver a leer / Confirmar / Descartar; abajo el
   listado por numero_remito_n. Nuss y Mengui sin cambios.
D) Ficha, hoja impresa y PDF de una orden con numero_remito: "Remito N° X".
E) Suites test-/mut-, maqueta con una precargada con renglones amarillos, e2e a 390 y 1280. Documentar en
   docs/memoria/retiros.md y administracion.md.

AGREGADO (mismo día; base ya en producción, verificada con pg_get_functiondef el 27/10/2026):
1. Talonario 'oficial' | 'acopio' en remitos_precarga y ordenes_retiro (numeración por talonario). La IA lo detecta;
   en la revisión, selector Oficial / Acopio (8.º parámetro p_talonario de actualizar_remito_precarga); el listado de
   órdenes con solapas Oficial / Acopio, cada una por su número; la orden de acopio lleva el sello "Acopio".
2. Renglón "omitir" (mercadería de terceros: envases, salsas): "No va en la orden" lo tacha en gris; la IA lo marca en
   lo que claramente no es del catálogo.
3. Reglas de lectura: "com" = sin cono; "ILUST." = cono de papel ilustración (QUINTANA, MARBET, RIO); "C. Gde/Mini/ST/
   Chico" = Cucuruchón (NUSS = la caja); "Cap. x80" = Capelina Grande; "Cono 40x180 RIO" = Barquillo 40 x4 caja N°2 ×180
   cono RIO; "Reposición" → amarillo con nota "reposición"; pallets / a granel / "Acopio MAS" → observaciones;
   clientes por nombre, razón social, apodos y número.
4. confirmar_remito_precarga rechaza el remito a una empresa del grupo que ya entró como ingreso allá: mensaje tal cual
   y un botón directo a Descartar con el motivo "ya ingresado".
