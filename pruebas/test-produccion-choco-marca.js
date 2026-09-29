// La marca de chocolate en la planta (29/09/2026). Un producto de chocolate
// con color elegido (productos_terminados.color) perdía la pastilla marrón:
// la marca NO es decoración, avisa que lleva masa de chocolate y evita cargar
// mal. El color elegido cambia la etiqueta; la marca queda SIEMPRE (borde
// marrón y la palabra "Chocolate" en su pastilla). Se EJECUTAN los renders
// de la planta con su sandbox.
//
//   node pruebas/test-produccion-choco-marca.js
//   ARCHIVO_TEST=<copia de modulos/produccion.html>

process.env.TZ = 'UTC'
const path = require('path')
const { arnes, leer } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const src = leer(ARCHIVO)
const { chk, fin } = arnes()

const P = construirProduccion(ARCHIVO)
const XSS = '"><img src=x onerror=alert(1)>'
const chocoRosa = { id: 'p-ch', nombre: 'Cucuruchón Mini Chocolate', tipo_masa: 'Chocolate', color: 'rosa' }
const chocoSin = { id: 'p-cs', nombre: 'Cucuruchón Mini Chocolate', tipo_masa: 'Chocolate', color: null }
const comunRosa = { id: 'p-co', nombre: 'Cucuruchón Mini', tipo_masa: 'Común', color: 'rosa' }

// ── colorProducto: choco dice SIEMPRE si es de chocolate ────────────────
const cr = P.colorProducto(chocoRosa)
chk('chocolate con color elegido: sigue marcado como chocolate', cr.choco === true)
chk('chocolate con color elegido: la etiqueta toma el color elegido', cr.c === 'oklch(0.66 0.13 350)' && cr.elegido === true)
chk('chocolate sin color: la pastilla marrón de siempre', P.colorProducto(chocoSin).choco === true && !P.colorProducto(chocoSin).elegido)
chk('común con color elegido: no es chocolate', P.colorProducto(comunRosa).choco === false)

// ── El nombre del producto (planilla, historial) ────────────────────────
const nCr = P.htmlNombreProducto(chocoRosa, 'Mini Chocolate')
chk('nombre de un chocolate con color: dice "Chocolate" en su pastilla', /<span class="pr-chip-choco pr-chip-choco--prod">Chocolate<\/span>/.test(nCr))
chk('nombre de un chocolate con color: el nombre va en el color elegido', nCr.includes('pr-prod-color') && nCr.includes('oklch(0.66 0.13 350)'))
chk('nombre de un chocolate sin color: la pastilla marrón de siempre', /pr-prod-nombre--choco/.test(P.htmlNombreProducto(chocoSin, 'Mini Chocolate')))
chk('nombre de un común con color: sin marca de chocolate', !/Chocolate|choco/.test(P.htmlNombreProducto(comunRosa, 'Mini')))
const nX = P.htmlNombreProducto(chocoRosa, XSS)
chk('nombre escapado', !nX.includes('<img') && nX.includes('&lt;img'))

// ── El paso "¿Qué producto salió?" ──────────────────────────────────────
const cat = { productos: [comunRosa, chocoRosa, chocoSin] }
P.estado.agregar = { productoId: null }
const paso = P.htmlPasoProducto(cat, P.estado.agregar)
const botonCr = (paso.match(/<button[^>]*data-ag-producto="p-ch"[\s\S]*?<\/button>/) || [''])[0]
chk('botón del chocolate con color: borde marrón (clase propia)', /pr-ag__producto--choco-elegido/.test(botonCr))
chk('botón del chocolate con color: dice "Chocolate"', /pr-ag__familia--choco">Chocolate</.test(botonCr))
chk('botón del chocolate con color: fondo del color elegido', botonCr.includes(cr.t))
chk('el chocolate con color sigue abajo, en DE CHOCOLATE', paso.indexOf('DE CHOCOLATE') >= 0 && paso.indexOf('DE CHOCOLATE') < paso.indexOf('data-ag-producto="p-ch"'))
const botonCo = (paso.match(/<button[^>]*data-ag-producto="p-co"[\s\S]*?<\/button>/) || [''])[0]
chk('botón del común con color: sin marca de chocolate', botonCo && !/choco/i.test(botonCo))
const pasoX = P.htmlPasoProducto({ productos: [{ ...chocoRosa, id: XSS, nombre: 'Cucuruchón ' + XSS + ' Chocolate' }] }, { productoId: null })
chk('paso producto escapado', !pasoX.includes('<img') && pasoX.includes('&lt;img'))

// ── El CSS: la marca se ve ───────────────────────────────────────────────
chk('CSS: el borde marrón del chocolate con color', /\.pr-ag__producto--choco-elegido \{ border-color: var\(--p-choco\); \}/.test(src))
chk('CSS: la palabra Chocolate en su pastilla marrón', /\.pr-ag__producto--choco-elegido \.pr-ag__familia--choco \{[^}]*background: var\(--p-choco\)/.test(src))

fin()
