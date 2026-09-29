// El color de cada cono en la planta (29/09/2026, pedido de Facu): ocho
// colores cálidos bien distintos entre sí, sin azules ni lavandas, elegidos
// por el ID del cono (no por el nombre ni por la posición). El común (sin
// marca) va en un gris cálido propio.
//
//   node pruebas/test-produccion-conos-color.js
//   ARCHIVO_TEST=<copia de modulos/produccion.html>

process.env.TZ = 'UTC'
const path = require('path')
const { arnes, leer } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos', 'produccion.html')
const FUENTE = leer(ARCHIVO)
const { chk, fin } = arnes()
const S = construirProduccion(ARCHIVO)

// oklch → OKLab y → sRGB para medir (Björn Ottosson).
const parse = (s) => { const m = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/.exec(s); return m ? m.slice(1).map(Number) : null }
const lab = ([L, C, h]) => [L, C * Math.cos(h * Math.PI / 180), C * Math.sin(h * Math.PI / 180)]
const dE = (a, b) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]))
function lumDe(o) {
  const [L, a, b] = lab(o)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  const c = (x) => Math.min(1, Math.max(0, x))
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(bl)
}
const contraste = (x, y) => { const [p, q] = [lumDe(x), lumDe(y)].sort((u, v) => v - u); return (p + 0.05) / (q + 0.05) }

const P = S.PALETA_CONO
chk('la paleta tiene OCHO colores', Array.isArray(P) && P.length === 8, P?.length)
const col = (P || []).map(c => ({ nombre: c.nombre, bg: parse(c.bg), fg: parse(c.fg), bd: parse(c.bd) }))
chk('cada color se escribe como oklch(L C H)', col.every(c => c.bg && c.fg && c.bd))
// Sin azules ni lavandas: fuera de 200°–310° (con croma, un gris no cuenta).
const azul = (o) => o && o[1] > 0.02 && o[2] >= 200 && o[2] <= 310
chk('ninguno es azul ni lavanda (tono fuera de 200°–310°)', col.every(c => !azul(c.bg) && !azul(c.fg) && !azul(c.bd)), col.filter(c => azul(c.bg) || azul(c.fg)).map(c => c.nombre).join())
let minimo = Infinity, par = ''
for (let i = 0; i < col.length; i++) for (let j = i + 1; j < col.length; j++) {
  const d = dE(col[i].bg, col[j].bg); if (d < minimo) { minimo = d; par = `${col[i].nombre}/${col[j].nombre}` }
}
chk('bien distintos entre sí: los fondos se separan 0,05 o más (OKLab)', minimo >= 0.05, `${minimo.toFixed(3)} ${par}`)
chk('la letra se lee sobre su fondo (4,5:1 o más)', col.every(c => contraste(c.fg, c.bg) >= 4.5), col.map(c => `${c.nombre} ${contraste(c.fg, c.bg).toFixed(2)}`).join(' · '))
chk('nombres de color distintos', new Set((P || []).map(c => c.nombre)).size === 8)

// Por el ID, siempre el mismo.
const ids = Array.from({ length: 400 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`)
chk('el mismo id da siempre el mismo color', ids.every(id => S.colorCono(id) === S.colorCono(id)))
const usados = new Set(ids.map(id => S.colorCono(id)))
chk('con muchos conos se usan los ocho colores', usados.size === 8, usados.size)
chk('el color es uno de la paleta', ids.every(id => P.includes(S.colorCono(id))))
chk('el común (sin id) va en su gris cálido, fuera de los ocho', S.colorCono(null) === S.COLOR_CONO_COMUN && S.colorCono('') === S.COLOR_CONO_COMUN && !P.includes(S.COLOR_CONO_COMUN))

// Lo usan por el id: el chip de la planilla y los botones del paso del cono.
const chip = S.htmlChipCono('FABRI', ids[3])
const chip2 = S.htmlChipCono('OTRO NOMBRE', ids[3])
chk('el chip toma el color del id, no del nombre', chip.replace('FABRI', '') === chip2.replace('OTRO NOMBRE', ''), chip)
chk('el chip sin id es del común', S.htmlChipCono('Común', null).includes(`background: ${S.COLOR_CONO_COMUN.bg}`))
chk('la planilla le pasa el id del cono del renglón', /htmlChipCono\(d\.marcaNombre \?\? 'Común', it\.marca_id\)/.test(FUENTE))
chk('los botones del paso del cono toman el color del id', /const col = colorCono\(m\.id\)/.test(FUENTE))
chk('ningún cono se pinta por su nombre', !/colorCono\([^)]*nombre/.test(FUENTE))
fin()
