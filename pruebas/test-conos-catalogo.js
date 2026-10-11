// Conos de papel en el catálogo (10/10/2026): la tarjeta del dashboard y la
// barra (js/modulos.js) y el grupo de Accesos (modulos/accesos.html).
//
// La base NO tiene una fila 'conos' en la tabla modulos, así que la tarjeta se
// ve por tener alguna de las cuatro tareas conos:* (sinFilaModulo) y el grupo
// de Accesos se ve siempre (siempreVisible).
//
//   node pruebas/test-conos-catalogo.js

const fs = require('fs')
const path = require('path')
const { extraerConst, extraerFn } = require('./extraer')
const { arnes } = require('./circuito-comun')

const RAIZ = path.join(__dirname, '..')
const MODULOS = process.env.ARCHIVO_MODULOS || path.join(RAIZ, 'js/modulos.js')
const ACCESOS = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/accesos.html')
const srcMod = fs.readFileSync(MODULOS, 'utf8')
const srcAcc = fs.readFileSync(ACCESOS, 'utf8')
// El runner de mutaciones compara el primer "ARCHIVO" con el archivo que mutó.
if (process.env.ARCHIVO_MODULOS) console.log(`ARCHIVO ${MODULOS} (${srcMod.length} bytes)`)
else console.log(`ARCHIVO ${ACCESOS} (${srcAcc.length} bytes)`)
const { chk, fin } = arnes()

const M = new Function(extraerConst(srcMod, 'MODULOS') + '\n' + extraerFn(srcMod, 'moduloVisible') + '\nreturn { MODULOS, moduloVisible }')()
const conos = M.MODULOS.find(m => m.clave === 'conos')
const ve = (tareas, extra = {}) => M.moduloVisible(conos, { esAdmin: false, esSuperAdmin: false, misModulos: [], misTareas: new Set(tareas), ...extra })
chk('la tarjeta existe: "Conos de papel", abre modulos/conos.html', conos?.nombre === 'Conos de papel' && conos?.url === 'modulos/conos.html')
chk('con conos:ver y conos:recibir (Mauricio), sin ningún módulo: se ve', ve(['conos:ver', 'conos:recibir']) === true)
chk('con solo conos:precios: se ve', ve(['conos:precios']) === true)
chk('sin tareas de conos: no se ve', ve(['gastos:ver_exportar']) === false)
chk('un super_admin la ve', M.moduloVisible(conos, { esAdmin: true, esSuperAdmin: true, misModulos: [], misTareas: new Set() }) === true)
chk('los otros módulos siguen pidiendo su fila', M.moduloVisible(M.MODULOS.find(m => m.clave === 'gastos'), { esAdmin: false, esSuperAdmin: false, misModulos: [], misTareas: new Set(['conos:ver']) }) === false)

const A = new Function('const estado = { modal: { modulosElegidos: new Set() } }\n' + extraerConst(srcAcc, 'CATALOGO_TAREAS') + '\n' + extraerFn(srcAcc, 'grupoEsVisible') + '\nreturn { CATALOGO_TAREAS, grupoEsVisible }')()
const grupo = A.CATALOGO_TAREAS.find(g => g.grupo === 'Conos de papel')
chk('Accesos tiene el grupo "Conos de papel"', !!grupo)
const labels = Object.fromEntries((grupo?.tareas ?? []).map(t => [`${t.modulo}:${t.tarea}`, t.label]))
chk('las cuatro tareas con los textos pedidos', labels['conos:ver'] === 'Ver conos de papel' && labels['conos:pedir'] === 'Armar pedidos de conos'
  && labels['conos:precios'] === 'Ver y cargar precios del papel' && labels['conos:recibir'] === 'Recibir pliegos de conos', JSON.stringify(labels))
chk('cada una con su descripción', (grupo?.tareas ?? []).every(t => typeof t.descripcion === 'string' && t.descripcion.length > 40))
chk('ninguna con alcance (las RPCs gatean sin unidad)', (grupo?.tareas ?? []).every(t => !t.conAlcance))
chk('el grupo se ve sin tildar ningún módulo (no hay fila conos en la tabla modulos)', grupo && A.grupoEsVisible(grupo) === true)
chk('los otros grupos siguen pidiendo su módulo', A.grupoEsVisible(A.CATALOGO_TAREAS.find(g => g.grupo === 'Proyectos Taller')) === false)

fin()
