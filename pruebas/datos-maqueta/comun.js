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

// Las cuatro fábricas reales del diseño "Esqueleto" (Nuss, Dolce Pasta,
// Mengui, Taller) sin logo, así la barra de arriba dibuja las marcas de color
// del diseño; más la de pruebas (nunca se ve en una cuenta real).
const UNIDADES_4 = [
  { id: 'u-n', nombre: 'Cucuruchos Nuss', prefijo: 'N', logo_url: null, activo: true, es_prueba: false },
  { id: 'u-d', nombre: 'Dolce Pasta', prefijo: 'D', logo_url: null, activo: true, es_prueba: false },
  { id: 'u-o', nombre: 'Mengui', prefijo: 'O', logo_url: null, activo: true, es_prueba: false },
  { id: 'u-t', nombre: 'Taller', prefijo: 'T', logo_url: null, activo: true, es_prueba: false },
  { id: 'u-p', nombre: 'Pruebas (robot)', prefijo: 'X', logo_url: null, activo: true, es_prueba: true },
];

// Los motivos de parada, como en la base (motivos_parada, 30/09/2026): la
// limpieza (programada) primero, las fallas y "Otro motivo" al final.
const MOTIVOS_PARADA = [
  ['mp-limp', 'Limpieza de planchas', 'programada', false, 1],
  ['mp-cadena', 'Corte de cadena', 'falla', false, 10],
  ['mp-correa', 'Corte de correa', 'falla', false, 11],
  ['mp-peine', 'Levantó el peine', 'falla', false, 12],
  ['mp-luz', 'Corte de luz', 'falla', false, 13],
  ['mp-punto', 'Fuera de punto', 'falla', false, 14],
  ['mp-fuego', 'Problema con el fuego', 'falla', false, 15],
  ['mp-electrico', 'Problema eléctrico', 'falla', false, 16],
  ['mp-motor', 'Se quemó el motor', 'falla', false, 17],
  ['mp-otro', 'Otro motivo', 'otro', true, 99],
].map(([id, nombre, categoria, pide_detalle, orden]) => ({ id, nombre, categoria, pide_detalle, orden, activo: true }));

module.exports = { MOTIVOS_PARADA, UID, tarea, UNIDADES, UNIDADES_4 };
