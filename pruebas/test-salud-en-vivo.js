// La decisión del chequeo "¿la app responde?" (pruebas/salud-en-vivo.js,
// 27/09/2026), sin salir a internet: qué cuenta como que responde y qué no.
//
//   node pruebas/test-salud-en-vivo.js

const fs = require('fs')
const path = require('path')
const { arnes } = require('./circuito-comun')

const RUTA = process.env.ARCHIVO_TEST || path.join(__dirname, 'salud-en-vivo.js')
console.log(`ARCHIVO ${RUTA} (${fs.readFileSync(RUTA, 'utf8').length} bytes)`)
const { evaluarPagina, evaluarAuth, evaluarBase, PAGINAS } = require(path.resolve(RUTA))
const { chk, fin } = arnes()

// Las páginas
chk('200 con el título de la app: responde', evaluarPagina({ status: 200, cuerpo: '<title>Ingresar — Seis Destinos</title>', marca: 'Seis Destinos' }) === null)
chk('un 404 no responde', /404/.test(evaluarPagina({ status: 404, cuerpo: '', marca: 'Seis Destinos' })))
chk('un 200 que no es la app (una página de error de GitHub) no responde', /no parece la app/.test(evaluarPagina({ status: 200, cuerpo: '<title>Site not found · GitHub Pages</title>', marca: 'Seis Destinos' })))
chk('sin respuesta no responde', !!evaluarPagina({ status: null, cuerpo: '', marca: 'x' }))
// Auth
chk('Auth: 200 GoTrue responde', evaluarAuth({ status: 200, cuerpo: '{"name":"GoTrue"}' }) === null)
chk('Auth: 503 no', /503/.test(evaluarAuth({ status: 503, cuerpo: '' })))
chk('Auth: 200 que no es JSON no', !!evaluarAuth({ status: 200, cuerpo: '<html>' }))
// La base
chk('la base: 401 42501 (lo dice Postgres) responde', evaluarBase({ status: 401, cuerpo: '{"code":"42501","message":"permission denied for table unidades_negocio"}' }) === null)
chk('la base caída (503 PGRST001) no responde', /503 PGRST001/.test(evaluarBase({ status: 503, cuerpo: '{"code":"PGRST001","message":"Database client error"}' })))
chk('la base sin conexión (PGRST000) no responde', !!evaluarBase({ status: 503, cuerpo: '{"code":"PGRST000"}' }))
chk('un 401 de otra cosa (la clave mala) no alcanza', !!evaluarBase({ status: 401, cuerpo: '{"message":"Invalid API key"}' }))
chk('una tabla leída SIN sesión es una alarma', /SIN sesión/.test(evaluarBase({ status: 200, cuerpo: '[]' })))
chk('sin respuesta no responde', !!evaluarBase({ status: null, cuerpo: '' }))
// Qué páginas mira: la entrada, el dashboard y la planta.
chk('mira el login, el dashboard y la planta', PAGINAS.map(p => p[0]).join() === 'login.html,dashboard.html,modulos/produccion.html')
// El workflow
{
  const wf = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'salud.yml'), 'utf8')
  chk('el workflow corre cada 30 minutos', /cron: '\*\/30 \* \* \* \*'/.test(wf))
  chk('el workflow corre este script', /node pruebas\/salud-en-vivo\.js/.test(wf))
  chk('el workflow se puede correr a mano', /workflow_dispatch/.test(wf))
}

fin()
