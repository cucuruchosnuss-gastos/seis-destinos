// Mutaciones de "+ Cono nuevo" al anotar para pedir (ver test-conos-anotar-nuevo.js).
// La suite compara además contra el commit FIJO 1fa4d4f (nunca HEAD).
//
//   node pruebas/mut-conos-anotar-nuevo.js
const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const HTML = path.join(__dirname, '..', 'modulos', 'conos.html')

correrMutacionesEnVarios([
  { original: HTML, funciones: [], salir: false, suite: path.join(__dirname, 'test-conos-anotar-nuevo.js'), manuales: [
    // La regla: exacto vs. parecido
    { nombre: 'se ofrece con una sola letra', de: '      if (t.length < 2) return null', a: '      if (t.length < 1) return null' },
    { nombre: 'se ofrece aunque exista exacto', de: '      return igual ? null : t\n', a: '      return t\n' },
    { nombre: 'el exacto mira las mayúsculas', de: "      const q = normalizarBusqueda(t)\n      const igual", a: "      const q = t\n      const igual" },
    { nombre: 'el exacto no saca los acentos', de: '(conos ?? []).some(c => normalizarBusqueda(textoConoNuevo(c.cono)) === q)', a: '(conos ?? []).some(c => textoConoNuevo(c.cono).toLowerCase() === q)' },
    { nombre: 'parecido cuenta como exacto', de: '(conos ?? []).some(c => normalizarBusqueda(textoConoNuevo(c.cono)) === q)', a: '(conos ?? []).some(c => normalizarBusqueda(textoConoNuevo(c.cono)).includes(q))' },
    { nombre: 'el exacto no colapsa los espacios del cono', de: '(conos ?? []).some(c => normalizarBusqueda(textoConoNuevo(c.cono)) === q)', a: '(conos ?? []).some(c => normalizarBusqueda(c.cono) === q)' },
    { nombre: 'sin lista de conos se rompe', de: '(conos ?? []).some(c =>', a: 'conos.some(c =>' },
    // El texto que viaja
    { nombre: 'no se colapsan los espacios del medio', de: "return String(texto ?? '').trim().replace(/\\s+/g, ' ')", a: "return String(texto ?? '').trim()" },
    { nombre: 'no se recortan los bordes', de: "return String(texto ?? '').trim().replace(/\\s+/g, ' ')", a: "return String(texto ?? '').replace(/\\s+/g, ' ')" },
    { nombre: 'el texto viaja crudo a proponer_marca', de: "rpc('proponer_marca', esOtro ? { p_nombre: textoConoNuevo(nombre), p_es_otro: true } : { p_nombre: textoConoNuevo(nombre) })", a: "rpc('proponer_marca', { p_nombre: nombre })" },
    // Quién puede
    { nombre: 'proponer sin conos:pedir', de: '      return !!(perm?.pedir || perm?.configurar || perm?.cargar)', a: '      return !!(perm?.configurar || perm?.cargar)' },
    { nombre: 'proponer sin produccion:cargar', de: '      return !!(perm?.pedir || perm?.configurar || perm?.cargar)', a: '      return !!(perm?.pedir || perm?.configurar)' },
    { nombre: 'proponer con cualquier permiso', de: '      return !!(perm?.pedir || perm?.configurar || perm?.cargar)', a: '      return true' },
    { nombre: 'produccion:cargar no se lee', de: "configurar: tieneP('configurar'), cargar: tieneP('cargar'),", a: "configurar: tieneP('configurar'), cargar: false," },
    { nombre: 'el botón se ofrece a cualquiera', de: '      return puedeProponer(estado.perm) ? conoNuevoOfrecido(texto, estado.conos) : null', a: '      return conoNuevoOfrecido(texto, estado.conos)' },
    // Los buscadores
    { nombre: 'Anotar sigue sin ofrecer crear', de: "'data-anotar-cono', ofrecerConoNuevo(texto), 'anotar', estadoParecidos('anotar'))", a: "'data-anotar-cono', null, 'anotar', estadoParecidos('anotar'))" },
    { nombre: 'Anotar vuelve a Agregar', de: "'data-anotar-cono', ofrecerConoNuevo(texto), 'anotar', estadoParecidos('anotar'))", a: "'data-anotar-cono', ofrecerConoNuevo(texto), 'agregar', estadoParecidos('anotar'))" },
    { nombre: 'Agregar deja de ofrecer crear', de: "htmlResultados(lista, 'data-agregar-cono', ofrecerConoNuevo(texto), 'agregar', estadoParecidos('agregar'))", a: "htmlResultados(lista, 'data-agregar-cono', null, 'agregar', estadoParecidos('agregar'))" },
    { nombre: 'el botón no dice a qué formulario vuelve', de: ' data-cono-destino="${esc(destino)}"', a: '' },
    { nombre: 'el botón va primero', de: '        const otro = vigente && !!igualDe(par)\n        filas.push(', a: '        const otro = vigente && !!igualDe(par)\n        filas.unshift(' },
    { nombre: 'el texto del botón sin escapar', de: 'data-cono-nuevo="${esc(textoNuevo)}"', a: 'data-cono-nuevo="${textoNuevo}"' },
    { nombre: 'el clic no pasa el formulario', de: 'proponerCono(el.dataset.conoNuevo, el.dataset.conoDestino); return }', a: 'proponerCono(el.dataset.conoNuevo); return }' },
    // Al crear
    { nombre: 'en anotar no queda elegido', de: "        if (destino === 'anotar') await elegirConoAnotar(id)\n", a: '' },
    { nombre: 'el catálogo no se refresca', de: '        await Promise.allSettled([cargarStock(), cargarCatalogo()])\n', a: '' },
    { nombre: 'el error va siempre a Agregar', de: "document.getElementById(destino === 'anotar' ? 'cn-anotar-error' : 'cn-agr-error')", a: "document.getElementById('cn-agr-error')" },
    { nombre: 'el error no va tal cual', de: "if (err) { err.textContent = mensajeDe(e); err.hidden = false }", a: "if (err) { err.textContent = 'No se pudo.'; err.hidden = false }" },
    { nombre: 'ya_existia no avisa', de: "        if (r.ya_existia) mostrarExito('Ese cono ya existía: quedó elegido.')\n", a: '' },
    { nombre: 'dos toques crean dos veces', de: '      if (estado.proponiendo) return\n', a: '' },
  ] },
])
