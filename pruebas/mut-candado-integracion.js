// Mutaciones de test-candado-integracion.js: mutan candado.js. Ver mutar.js.
//
//   node pruebas/mut-candado-integracion.js

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const suite = path.join(__dirname, 'test-candado-integracion.js')
correrMutacionesEnVarios([
  {
    suite, original: path.join(__dirname, 'candado.js'), funciones: [], variable: 'ARCHIVO_TEST',
    manuales: [
      { nombre: 'vence a las 15 h', de: 'const VIGENCIA_MIN = 90', a: 'const VIGENCIA_MIN = 900' },
      { nombre: 'no ignora los abandonados', de: 'const vigentes = candados.filter(c => ahora - c.fecha < VIGENCIA_MIN * 60000)', a: 'const vigentes = [...candados]' },
      { nombre: 'vence contando desde que lo tomó (no desde la renovación)', de: 'candados.filter(c => ahora - c.fecha <', a: 'candados.filter(c => ahora - c.desde <' },
      { nombre: 'gana el que llegó último', de: 'a.desde - b.desde ||', a: 'b.desde - a.desde ||' },
      { nombre: 'el empate al revés', de: "vigentes.sort((a, b) => a.desde - b.desde || (a.nombre < b.nombre ? -1 : 1))", a: "vigentes.sort((a, b) => a.desde - b.desde || (a.nombre < b.nombre ? 1 : -1))" },
      { nombre: 'renovar sin padre (haría falta --force)', de: "  if (mio) args.push('-p', mio.sha)\n", a: '' },
      { nombre: 'renovar se olvida desde cuándo', de: 'const desde = mio ? mio.desde : ahora', a: 'const desde = ahora' },
      { nombre: 'no espera: lo toma igual', de: 'if (d && d.nombre !== nombre) {', a: 'if (false) {' },
      { nombre: 'esperar no espera', de: '      await dormir(PAUSA_SEG)\n      continue', a: '      return 1' },
      { nombre: 'no vuelve a mirar después de subir el suyo', de: 'const ganador = dueno(traer(), Date.now())', a: 'const ganador = { nombre }' },
      { nombre: 'pierde y no borra el suyo', de: "    console.log(`Lo tomó a la vez integrando/${ganador ? ganador.nombre : '?'}, desde antes: suelto el mío y espero.`)\n    borrar(nombre)\n", a: "    console.log(`Lo tomó a la vez integrando/${ganador ? ganador.nombre : '?'}, desde antes: suelto el mío y espero.`)\n" },
      { nombre: 'soltar no borra la rama', de: "  git(['push', '--quiet', REMOTO, '--delete', `${PREFIJO}${nombre}`], { puedeFallar: true })\n", a: '' },
      { nombre: 'cualquier nombre vale', de: '/^[a-z0-9][a-z0-9._-]{0,60}$/i', a: '/^.+$/' },
      { nombre: 'ver no marca los abandonados', de: "ahora - c.fecha >= VIGENCIA_MIN * 60000 ? 'ABANDONADO (no se renueva)'", a: "false ? 'ABANDONADO (no se renueva)'" },
      { nombre: 'el mensaje sin fecha', de: '/ desde (\\S+)$/', a: '/ nunca (\\S+)$/' },
    ],
  },
])
