// Gastos (14/10/2026): el recuadro naranja del total se achicaba con "En el
// mes" y el número quedaba cortado. Con "Hoy" se veía bien.
//
// Acá se carga un total LARGO (más de $ 123.456.789,99) en cada período —Hoy,
// Esta semana, En el mes y un rango de fechas a mano— y se mide, en la
// maqueta (Supabase falso, sin credenciales), a 1280, 1000×540 (tablet), 390
// y 360 px:
//  - el número entra COMPLETO: ni él ni ninguno de sus contenedores (hasta la
//    grilla de totales) tiene más contenido que ancho (scrollWidth <=
//    clientWidth), ninguno corta con puntos suspensivos, y el rectángulo del
//    texto queda adentro del recuadro;
//  - el recuadro mide lo mismo (ancho y alto) en los cuatro períodos;
//  - sin scroll horizontal y sin errores de JS.
// El reloj queda fijo el miércoles 14/10/2026 (la semana arranca el lunes 12).
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const AHORA = new Date('2026-10-14T15:00:00Z');

const UNIDADES = {
  'u-n': 'Cucuruchos Nuss',
  'u-d': 'Dolce Pasta',
  'u-t': 'Taller',
};

function gasto(id, fecha, unidad, importe) {
  return {
    id, fecha, fecha_pago: fecha, periodo: 'oct-26', tipo_doc: 'Factura A', numero_doc: '0001-' + id.replace(/\D/g, '').padStart(6, '0'),
    razon_social: 'Proveedor ' + id, importe, moneda: 'ARS', proveedor_id: null, unidad_negocio_id: unidad,
    medio_pago: 'transferencia', estado: 'registrado', lugar_servicio: null, descripcion: null, observaciones: null,
    kilometraje: null, foto_url: null, cuenta_id: null, anulado_por: null, anulado_en: null, motivo_anulacion: null,
    empleado_id: 'emp-g',
    categorias: { id: 'c-rep', nombre: 'Repuestos', icon: null },
    empleados: { id: 'emp-g', nombre: 'Facu Maqueta' },
    unidades_negocio: { id: unidad, nombre: UNIDADES[unidad] },
    vehiculos: null, proyectos: null,
  };
}

// Hoy: una sola empresa (como lo vio Facu: con "Hoy" andaba). La semana, el
// mes y el rango suman otras empresas, y ahí aparece el detalle "Por unidad".
const GASTOS = [
  gasto('g-901', '2026-10-14', 'u-n', 123456789.99),
  gasto('g-902', '2026-10-12', 'u-d', 100000000),
  gasto('g-903', '2026-10-02', 'u-t', 200000000),
];

// Las librerías de afuera (Lucide, SheetJS) no son parte de lo que se prueba:
// se sirven vacías, así la prueba no depende de un CDN (como 35-prestamos).
async function sinCdn(page) {
  await page.route(/unpkg\.com\/lucide/, r => r.fulfill({ contentType: 'application/javascript', body: 'window.lucide = { createIcons() {} }' }));
  await page.route(/cdn\.sheetjs\.com/, r => r.fulfill({ contentType: 'application/javascript', body: '' }));
}

// Lo que tiene que decir el número en cada período (sin espacios).
const PERIODOS = [
  { clave: 'hoy', total: '$123.456.789,99' },
  { clave: 'semana', total: '$223.456.789,99' },
  { clave: 'mes', total: '$423.456.789,99' },
  { clave: 'rango', total: '$300.000.000,00' },
];

async function elegirPeriodo(page, clave) {
  if (clave === 'hoy' || clave === 'mes') {
    await page.locator(`#segmented-rango-rapido [data-rango="${clave}"]`).click();
    return;
  }
  await page.locator('#filtro-fecha-desde-periodo').click();
  if (clave === 'semana') {
    await page.locator('[data-periodo-atajo="semana"]').click();
    return;
  }
  await page.locator('[data-periodo-elegir]').click();
  await page.locator('#filtro-fecha-desde-periodo-desde').fill('2026-10-01');
  await page.locator('#filtro-fecha-desde-periodo-hasta').fill('2026-10-12');
  await page.locator('[data-periodo-aplicar]').click();
}

// Corre en la página: mide el recuadro del total y devuelve lo que está mal.
function medirTotal() {
  const grilla = document.getElementById('total-gastos');
  const card = grilla && grilla.querySelector(':scope > .grilla-totales__card:first-child');
  const monto = card && card.querySelector('.grilla-totales__monto');
  if (!card || !monto) return { error: 'no está el recuadro del total' };
  const nombre = (el) => el.id ? '#' + el.id : (el.className || el.tagName).toString().split(/\s+/)[0] || el.tagName;
  const problemas = [];
  const cadena = [];
  for (let el = monto; el; el = el.parentElement) {
    cadena.push(el);
    if (el === grilla) break;
  }
  for (const el of cadena) {
    const cs = getComputedStyle(el);
    if (el.scrollWidth > el.clientWidth) problemas.push(`${nombre(el)}: el contenido mide ${el.scrollWidth} y entra ${el.clientWidth} (overflow ${cs.overflowX})`);
    if (cs.textOverflow === 'ellipsis') problemas.push(`${nombre(el)}: corta con puntos suspensivos`);
  }
  const rango = document.createRange();
  rango.selectNodeContents(monto);
  const rt = rango.getBoundingClientRect();
  const rc = card.getBoundingClientRect();
  if (rt.left < rc.left - 0.5 || rt.right > rc.right + 0.5 || rt.top < rc.top - 0.5 || rt.bottom > rc.bottom + 0.5) {
    problemas.push(`el número (${Math.round(rt.left)}–${Math.round(rt.right)}) se sale del recuadro (${Math.round(rc.left)}–${Math.round(rc.right)})`);
  }
  const doc = document.scrollingElement || document.documentElement;
  if (doc.scrollWidth > innerWidth) problemas.push(`scroll horizontal: la página mide ${doc.scrollWidth} y la ventana ${innerWidth}`);
  return {
    texto: monto.textContent.replace(/\s/g, ''),
    ancho: Math.round(rc.width), alto: Math.round(rc.height),
    letra: parseFloat(getComputedStyle(monto).fontSize),
    problemas,
  };
}

for (const [ancho, alto] of [[1280, 900], [1000, 540], [390, 844], [360, 780]]) {
  test(`${ancho}×${alto}: el total largo entra completo y el recuadro mide lo mismo en Hoy, Semana, Mes y rango`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await sinCdn(page);
    await page.clock.setFixedTime(AHORA);
    await page.setViewportSize({ width: ancho, height: alto });
    await page.goto(`${MAQUETA}/modulos/gastos.html?maqueta=gastos`);
    await page.evaluate((gastos) => {
      localStorage.setItem('barraUnidad.elegida', 'todas');
      sessionStorage.setItem('maqueta.cambios', JSON.stringify({ tablas: { gastos } }));
    }, GASTOS);
    await page.reload();
    await expect(page.locator('#total-gastos')).toBeVisible();

    const medidas = {};
    const fallas = [];
    for (const p of PERIODOS) {
      await elegirPeriodo(page, p.clave);
      const monto = page.locator('#total-gastos > .grilla-totales__card:first-child .grilla-totales__monto');
      await expect(monto).toHaveText(new RegExp(p.total.replace(/^\$/, '\\$\\s*').replace(/\./g, '\\.')));
      // Que el detalle por unidad ya esté (o no) antes de medir.
      await expect(page.locator('#totales-por-unidad')).toHaveCount(p.clave === 'hoy' ? 0 : 1);
      const m = await page.evaluate(medirTotal);
      expect(m.error, m.error).toBeUndefined();
      expect(m.texto, `${p.clave}: el número completo`).toBe(p.total);
      for (const x of m.problemas) fallas.push(`${p.clave}: ${x}`);
      medidas[p.clave] = m;
      await captura(page, `gastos-total-${p.clave}-${ancho}`, info);
    }

    const base = medidas.hoy;
    for (const p of PERIODOS.slice(1)) {
      const m = medidas[p.clave];
      if (Math.abs(m.ancho - base.ancho) > 1 || Math.abs(m.alto - base.alto) > 1) {
        fallas.push(`${p.clave}: el recuadro mide ${m.ancho}×${m.alto} y con Hoy ${base.ancho}×${base.alto}`);
      }
    }
    expect(fallas, fallas.join('\n')).toEqual([]);
    await page.evaluate(() => sessionStorage.removeItem('maqueta.cambios'));
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
