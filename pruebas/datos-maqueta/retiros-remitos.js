// Datos de la maqueta: SUBIR REMITOS ROSARIO (27/10/2026, rama
// ci-prueba/remitos-rosario-subir). Ver pruebas/datos-maqueta/README.md.
//
// Parte de retiros-sin-control.js SIN cambiarlo (Dolce Pasta con
// controla_stock_terminado = false, el usuario con retiros:cargar en todas) y
// le suma:
//  - remitos_precarga: uno de cada estado subidos por mí (leyendo, precargado
//    oficial, precargado de ACOPIO, confirmado como D-0005 —el código viene
//    embebido en "orden", como lo trae el select—, no se pudo leer y
//    descartado) y uno de otra persona, que no tiene que aparecer;
//  - crear_remito_precarga → 'rp-nuevo' y la función ocr-remito → { ok: true }.
// Las fechas son del 27/10/2026: la lista es de los últimos 7 días, así que
// para mirarla a mano después del 03/11 hay que correrlas (e2e/70 lo hace solo).
//
//   http://localhost:4180/modulos/retiros.html?maqueta=retiros-remitos
'use strict';

const base = JSON.parse(JSON.stringify(require('./retiros-sin-control')));
const t = base.tablas;
const r = base.rpc;

const remito = (id, minutos, extra) => ({
  id, unidad_negocio_id: 'u-d', foto_path: `uid-maqueta/remitos/${id}.jpg`, subido_por: 'emp-1',
  subido_en: new Date(Date.parse('2026-10-27T18:00:00Z') - minutos * 60000).toISOString(),
  estado: 'leyendo', numero_remito: null, talonario: 'oficial', error: null, orden_id: null, descartado_motivo: null,
  client_uuid: `00000000-0000-4000-8000-${String(minutos).padStart(12, '0')}`, orden: null, ...extra,
});

t.remitos_precarga = [
  remito('rp-leyendo', 1, {}),
  remito('rp-pre', 12, { estado: 'precargada', numero_remito: '0001-00003100' }),
  remito('rp-aco', 25, { estado: 'precargada', numero_remito: '977492', talonario: 'acopio' }),
  remito('rp-conf', 90, { estado: 'confirmada', numero_remito: '0001-00003095', orden_id: 'o-d-5', orden: { codigo: 'D-0005' } }),
  remito('rp-err', 140, { estado: 'error', error: 'No se ve el número del remito: la foto está movida.' }),
  remito('rp-desc', 600, { estado: 'descartada', descartado_motivo: 'Foto repetida' }),
  // De otra persona: no aparece en "Mis remitos subidos".
  { ...remito('rp-otro', 5, { estado: 'precargada', numero_remito: '0001-00009999' }), subido_por: 'emp-2' },
];
r.crear_remito_precarga = 'rp-nuevo';
base.funciones = { 'ocr-remito': { ok: true } };

module.exports = base;
