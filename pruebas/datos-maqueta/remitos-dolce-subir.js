// Maqueta "remitos-dolce-subir" (28/10/2026): Remitos Dolce → Subir. La misma
// de "Subir remitos Rosario" en la Carga (retiros-remitos.js: Dolce Pasta sin
// control de stock, el usuario con retiros:cargar y remitos subidos en cada
// estado), con el código de la orden en remitos_precarga.orden_codigo (el
// módulo ya no lee ordenes_retiro).
'use strict'
const base = JSON.parse(JSON.stringify(require('./retiros-remitos')))

for (const f of base.tablas.remitos_precarga) {
  f.orden_codigo = f.orden?.codigo ?? null
  delete f.orden
}

module.exports = base
