// LA IMPRESIÓN DE LA ORDEN DE RETIRO, medida en Chromium de verdad, en modo
// impresión (A4 con 8 mm de margen). El diseño es el del 07/10/2026 (aprobado
// por Facu) con lo del 15/10/2026 (caso N-0014):
//  - SIEMPRE PARTIDA AL MEDIO: ORIGINAL arriba, DUPLICADO abajo, la línea
//    punteada en el medio. Si los renglones no entran en una mitad, la orden
//    SIGUE EN OTRA HOJA, también partida ("ORIGINAL · HOJA 1 DE N"),
//    repitiendo cabecera, N°, fecha y cliente, con el TOTAL y las firmas solo
//    en la última. Se prueba con 1, 8, 15 y 30 renglones, sin y con precios;
//  - NINGÚN NÚMERO SE PARTE: cada importe, las cajas y cada lote en UN
//    renglón y adentro de su celda; el total entero (si no entra, se achica
//    la letra de esa columna);
//  - la letra ~22 % más chica que el 07/10: con 8 renglones entra en una hoja;
//  - ningún nombre termina en "…" ni queda cortado; el pie sale entero;
//  - solo negro sobre blanco; la letra Archivo.
// Deja los PDF (page.pdf) y una captura de cada caso en los resultados.
// Corre sin credenciales: la página de la maqueta solo sirve para cargar
// js/retiros-comun.js desde el mismo lugar que la app.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const ALTO_UTIL_A4_MM = 281;
const ALTO_MEDIA_HOJA_MM = 136;

// Una orden de n renglones, con importes GRANDES (los que se partían).
function orden(n, conPrecios) {
  const productos = ['Cucuruchón Mini', 'Cucuruchón Grande con una descripción bastante larga para que no entre en un renglón', 'Barquillo 35', 'Cono dulce 35 x4'];
  const renglones = Array.from({ length: n }, (_, i) => i % 5 === 4
    ? { esInsumo: true, producto: 'Harina 000', marca: 'Molino Cañuelas', cantidad: 1250.5, unidad: 'kg', lotes: [{ lote: 'L-' + (100 + i), cantidad: 1250.5 }], precio: 1234.56, subtotal: 1543820.28 }
    : { producto: productos[i % productos.length], presentacion: i % 2 ? 'Caja sin cono' : 'Caja con cono', cono: i % 2 ? 'Sin cono' : 'LOLO', cajas: 10 + i, unidades: (10 + i) * 320,
        lotes: i % 3 === 0 ? [{ lote: '62' + (21 + i) + '-1', cajas: 6 + i }, { lote: '62' + (30 + i) + '-2', cajas: 4 }] : [{ lote: '62' + (21 + i) + '-1', cajas: 10 + i }],
        precio: 23990.8 + i, subtotal: 1007613.6 + i * 1000 });
  return {
    codigo: 'N-0042', estado: 'confirmada', fecha: '2026-10-15', cargadaEn: '2026-10-15T13:51:00Z', cargadaPor: 'Emanuel Romero',
    transporte: n > 10 ? '' : 'Expreso del Sur', observaciones: '', moneda: 'ARS', total: conPrecios ? 123456789.01 : null,
    empresa: { nombre: 'Cucuruchos Nuss', razon_social: 'SEIS DESTINOS SAS', cuit: '30719434777', domicilio: 'Ruta 9 km 711, Córdoba', telefono: '351 555-0000', logo_url: 'logo-cucuruchos-nuss.png' },
    cliente: { nombre: 'FERNANDEZ RICARDO', localidad: 'Villa María' },
    renglones,
  };
}

// El caso real N-0014 (15/10, 10:51): tres renglones "Caja sin cono", un lote
// INICIAL y uno con parte sin lote; el subtotal y el total se partían.
const N0014 = {
  codigo: 'N-0014', estado: 'confirmada', fecha: '2026-10-15', cargadaEn: '2026-10-15T13:51:00Z', cargadaPor: 'Emanuel Romero',
  transporte: '', observaciones: '', moneda: 'ARS', total: 2220140.16,
  empresa: { nombre: 'Cucuruchos Nuss', razon_social: 'SEIS DESTINOS SAS', cuit: '30719434777', domicilio: 'Ruta 9 km 711, Córdoba', telefono: '351 555-0000', logo_url: 'logo-cucuruchos-nuss.png' },
  cliente: { nombre: 'FERNANDEZ RICARDO' },
  renglones: [
    { producto: 'Cucuruchón Mini', presentacion: 'Caja sin cono', cono: 'Sin cono', cajas: 42, unidades: 4200, lotes: [{ lote: '6235-1', cajas: 42 }], precio: 23990.8, subtotal: 1007613.6 },
    { producto: 'Cucuruchón Grande', presentacion: 'Caja sin cono', cono: 'Sin cono', cajas: 21, unidades: 2100, lotes: [{ lote: '6241-2', cajas: 1 }, { lote: 'SIN STOCK', cajas: 20 }], precio: 21150.62, subtotal: 444163.02 },
    { producto: 'Cono dulce 35 x4', presentacion: 'Caja sin cono', cono: 'Sin cono', cajas: 21, unidades: 2100, lotes: [{ lote: 'INICIAL', cajas: 21 }], precio: 36588.74, subtotal: 768363.54 },
  ],
};

// Arma la hoja en una página en blanco del mismo sitio y la mide impresa.
async function armarYMedir(page, o, conPrecios) {
  await page.goto(`${MAQUETA}/modulos/retiros.html?maqueta=retiros`);
  // El MISMO contenedor que usa la Carga: al imprimir, la página esconde todo
  // lo demás (si la hoja fuera otro div, se mediría escondida: todo en cero).
  await page.evaluate(() => { document.body.innerHTML = '<div id="rt-impresion" class="rt-impresion"></div>'; });
  const plan = await page.evaluate(async ({ o, conPrecios }) => {
    const m = await import('/js/retiros-comun.js');
    m.asegurarEstilosHoja();
    return m.armarHoja(document.getElementById('rt-impresion'), o, { conPrecios, copias: m.COPIAS_IMPRESION });
  }, { o, conPrecios });
  await page.emulateMedia({ media: 'print' });
  await page.setViewportSize({ width: 794, height: 1123 });
  const m = await page.evaluate(() => {
    const mm = (px) => px / (96 / 25.4);
    const r = (el) => el.getBoundingClientRect();
    const paginas = [...document.querySelectorAll('.rh-pagina')];
    const copias = [...document.querySelectorAll('.rh-copia')];
    const cortados = [];
    for (const el of document.querySelectorAll('.rh-hoja *')) {
      const cs = getComputedStyle(el);
      if (cs.textOverflow === 'ellipsis') cortados.push('ellipsis: ' + el.className);
      if (el.matches('.rh-producto, .rh-lote, .rh-legal, .rh-cliente__nombre, .rh-firma, .rh-entrego, .rh-titulo__copia') && (el.scrollWidth > el.clientWidth + 1)) cortados.push('ancho: ' + el.className + ' ' + el.textContent.slice(0, 40));
    }
    // Cada renglón, el pie y la leyenda, ADENTRO de su copia (nada recortado por overflow).
    const afuera = [];
    for (const c of copias) {
      const rc = r(c);
      for (const el of c.querySelectorAll('tbody tr, .rh-pie, .rh-legal, tfoot tr, .rh-sigue')) {
        const re = r(el);
        if (re.top < rc.top - 0.5 || re.bottom > rc.bottom + 0.5) afuera.push(el.className || el.tagName);
      }
    }
    // LOS NÚMEROS: cada uno en UN renglón y adentro de su celda.
    const partidos = [], salidos = [];
    for (const n of document.querySelectorAll('.rh-hoja .rh-n')) {
      const cs = getComputedStyle(n);
      const lineas = n.getClientRects().length;
      const alto = r(n).height;
      if (lineas !== 1 || alto > 1.6 * parseFloat(cs.fontSize)) partidos.push(`${n.textContent} (${lineas} renglones, ${alto.toFixed(1)} px)`);
      const td = n.closest('td');
      const rn = r(n), rt = r(td);
      if (rn.left < rt.left - 0.5 || rn.right > rt.right + 0.5) salidos.push(`${n.textContent} (${td.dataset.col || td.className})`);
    }
    const textos = [...document.querySelectorAll('.rh-hoja')].map(h => h.innerText).join('\n');
    const colores = new Set();
    for (const el of document.querySelectorAll('.rh-hoja, .rh-hoja *')) {
      const cs = getComputedStyle(el);
      if (el.textContent.trim()) colores.add(cs.color);
    }
    const porPagina = paginas.map(p => ({
      alto: mm(r(p).height),
      rotulos: [...p.querySelectorAll('.rh-titulo__copia')].map(e => e.textContent),
      copias: p.querySelectorAll('.rh-copia').length,
      cortes: p.querySelectorAll('.rh-corte').length,
      filas: [...p.querySelectorAll('.rh-copia')].map(c => c.querySelectorAll('tbody tr').length),
      totales: p.querySelectorAll('tfoot').length,
      firmas: p.querySelectorAll('.rh-firma').length,
      sigue: p.querySelectorAll('.rh-sigue').length,
      clientes: [...p.querySelectorAll('.rh-cliente__nombre')].map(e => e.textContent),
      codigos: [...p.querySelectorAll('.rh-codigo')].map(e => e.textContent),
      fechas: [...p.querySelectorAll('.rh-orden__fecha')].map(e => e.textContent),
    }));
    const total = document.querySelector('.rh-copia td[data-col="total"] .rh-n');
    return {
      altosCopias: copias.map(c => mm(r(c).height)), porPagina, cortados, afuera, partidos, salidos, colores: [...colores],
      tienePuntos: /…|\.\.\./.test(textos), legales: (textos.match(/Documento interno\. No válido como factura\./g) || []).length,
      fuente: getComputedStyle(document.querySelector('.rh-hoja')).fontFamily,
      // (Los importes llevan espacio duro entre el $ y el número: acá, espacio común.)
      total: total ? total.textContent.replace(/ /g, ' ') : null,
      textos: textos.replace(/ /g, ' '),
    };
  });
  return { plan, m };
}

async function guardarPdf(page, nombre, info) {
  const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
  const archivo = info.outputPath(`${nombre}.pdf`);
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  fs.writeFileSync(archivo, pdf);
  await info.attach(nombre, { body: pdf, contentType: 'application/pdf' });
  // Las páginas, del árbol de páginas del PDF ("/Count N").
  return Math.max(0, ...[...pdf.toString('latin1').matchAll(/\/Count\s+(\d+)/g)].map(x => Number(x[1])));
}

function revisarComun(m, n, nombre) {
  const hojas = m.porPagina.length;
  expect(m.partidos, `${nombre}: ningún número en dos renglones: ${m.partidos.join(' | ')}`).toEqual([]);
  expect(m.salidos, `${nombre}: ningún número se sale de su celda: ${m.salidos.join(' | ')}`).toEqual([]);
  expect(m.cortados, m.cortados.join('\n')).toEqual([]);
  expect(m.afuera, `${nombre}: nada se sale de su copia: ` + m.afuera.join(', ')).toEqual([]);
  expect(m.tienePuntos, 'ningún "…"').toBe(false);
  expect(m.colores, 'solo negro').toEqual(['rgb(0, 0, 0)']);
  expect(m.fuente).toMatch(/^Archivo/);
  for (const [k, p] of m.porPagina.entries()) {
    expect(p.alto, `${nombre}: la hoja ${k + 1} mide ${p.alto.toFixed(1)} mm y en la A4 entran ${ALTO_UTIL_A4_MM}`).toBeLessThanOrEqual(ALTO_UTIL_A4_MM);
    expect(p.copias, `${nombre}: la hoja ${k + 1} va partida: ORIGINAL y DUPLICADO`).toBe(2);
    expect(p.cortes, 'con la línea punteada').toBe(1);
    expect(p.rotulos, `${nombre}: los rótulos de la hoja ${k + 1}`).toEqual(hojas === 1 ? ['ORIGINAL', 'DUPLICADO'] : [`ORIGINAL · HOJA ${k + 1} DE ${hojas}`, `DUPLICADO · HOJA ${k + 1} DE ${hojas}`]);
    expect(p.filas[0], 'las dos mitades con los mismos renglones').toBe(p.filas[1]);
    expect(p.clientes, 'cada mitad repite el cliente').toEqual(['FERNANDEZ RICARDO', 'FERNANDEZ RICARDO']);
    expect(p.codigos.length, 'y el N°').toBe(2);
    expect(p.fechas, 'y la fecha').toEqual(['15/10/2026 10:51', '15/10/2026 10:51']);
    const ultima = k === hojas - 1;
    expect(p.totales, `${nombre}: el TOTAL solo en la última hoja`).toBe(ultima ? 2 : 0);
    expect(p.firmas, 'las firmas solo en la última').toBe(ultima ? 6 : 0);
    expect(p.sigue, '"Sigue en la hoja…" en las otras').toBe(ultima ? 0 : 2);
  }
  for (const a of m.altosCopias) expect(a, `una copia mide ${a.toFixed(1)} mm (media hoja)`).toBeGreaterThan(ALTO_MEDIA_HOJA_MM - 1);
  expect(m.porPagina.reduce((s, p) => s + p.filas[0], 0), `${nombre}: los ${n} renglones, sin repetir ni perder`).toBe(n);
  expect(m.legales, 'la leyenda en cada mitad').toBe(2 * hojas);
}

const CASOS = [1, 8, 15, 30];
for (const n of CASOS) {
  for (const conPrecios of [false, true]) {
    const nombre = `${n} renglones${conPrecios ? ' con precios' : ''}`;
    test(`${nombre}: partida al medio, números enteros, total entero`, async ({ page }, info) => {
      const { plan, m } = await armarYMedir(page, orden(n, conPrecios), conPrecios);
      revisarComun(m, n, nombre);
      const hojas = m.porPagina.length;
      expect(hojas, 'las hojas del plan').toBe(plan.paginas ? plan.paginas.length : 1);
      if (n <= 8) expect(hojas, `${nombre}: entra en UNA hoja (la letra más chica)`).toBe(1);
      if (n >= 15) expect(hojas, `${nombre}: sigue en otra hoja`).toBeGreaterThan(1);
      if (conPrecios) {
        expect(m.total, 'el total entero').toBe('$ 123.456.789,01');
        expect(m.textos).toMatch(/PRECIO/);
        expect(m.textos).toMatch(/SUBTOTAL/);
      }
      console.log(`[hoja ${nombre}] ${hojas} hoja(s); renglones por hoja ${m.porPagina.map(p => p.filas[0]).join(' + ')}; escalas ${JSON.stringify(plan.escalas)}`);
      await page.screenshot({ path: info.outputPath(`hoja-${n}${conPrecios ? '-precios' : ''}.png`), fullPage: true });
      expect(await guardarPdf(page, `hoja-${n}${conPrecios ? '-precios' : ''}`, info), 'el PDF tiene una página por hoja').toBe(hojas);
    });
  }
}

test('N-0014 (caso real): importes enteros, sin "sin cono" repetido, INICIAL como "—"', async ({ page }, info) => {
  const { m } = await armarYMedir(page, N0014, true);
  revisarComun(m, 3, 'N-0014');
  expect(m.porPagina.length).toBe(1);
  expect(m.total).toBe('$ 2.220.140,16');
  expect(m.textos).toContain('$ 1.007.613,60');
  expect(m.textos).not.toMatch(/sin cono · sin cono/i);
  expect(m.textos).not.toMatch(/INICIAL|SIN STOCK|faltan|pendiente de revisi/i);
  expect(m.textos).toContain('6241-2 ×1');
  await page.screenshot({ path: info.outputPath('hoja-N-0014.png'), fullPage: true });
});
