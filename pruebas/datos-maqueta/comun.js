// Piezas compartidas de los datos de la maqueta y de las pruebas.
// Un dato que usan varias pantallas (las empresas, la cuenta de la maqueta)
// vive UNA vez acá, así la maqueta y las suites no divergen.
'use strict';

// La cuenta con la que "entra" la maqueta: la fila de empleados tiene que
// tener este auth_user_id (ver e2e/maqueta/supabase-falso.js).
const UID = 'uid-maqueta';

// Una tarea otorgada, con el formato de empleado_tareas.
const tarea = (empleado_id, modulo, t, alcance = null) => ({ empleado_id, modulo, tarea: t, alcance, habilitado: true });

// Todas las unidades de la maqueta, las reales y la de pruebas.
const UNIDADES = [
  { id: 'u-n', nombre: 'Cucuruchos Nuss', prefijo: 'N', logo_url: 'logo-cucuruchos-nuss.png', activo: true, es_prueba: false },
  { id: 'u-d', nombre: 'Dolce Pasta', prefijo: 'D', logo_url: 'logo-dolce-pasta.png', activo: true, es_prueba: false },
  { id: 'u-p', nombre: 'Pruebas (robot)', prefijo: 'X', logo_url: null, activo: true, es_prueba: true },
];

module.exports = { UID, tarea, UNIDADES };
