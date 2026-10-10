// Proyectos Taller en el celular (02/10/2026), en la maqueta: "+ Nuevo
// proyecto" se ve en el celular para quien gestiona (Tomás), primero y a todo
// el ancho; el formulario se completa y se guarda a 390 px sin cortes, sin
// zoom (letra de 16 px en los campos) y con el "teclado abierto" (la barra de
// abajo se esconde mientras se escribe). Sin permiso de gestionar no hay
// botón. A 1280 px sigue en la barra de la lista. Corre SIEMPRE, sin
// credenciales.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const DATOS = JSON.parse(fs.readFileSync(path.join(__dirname, 'maqueta/datos/taller-diseno.json'), 'utf8'));
const UN_PROYECTO = DATOS.rpc.proyectos_taller[0].id;

async function sinScroll(page, donde) {
  const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(doc, `${donde}: scroll horizontal ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
}

test('celular (390 px): crear un proyecto desde el teléfono', async ({ page }, info) => {
  const errores = vigilarErrores(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${MAQUETA}/modulos/taller.html?maqueta=taller-diseno`);
  // guardar_proyecto devuelve el id del proyecto creado.
  await page.evaluate((id) => sessionStorage.setItem('maqueta.cambios', JSON.stringify({ rpc: { guardar_proyecto: id } })), UN_PROYECTO);
  await page.reload();
  const nuevo = page.locator('#tl-btn-nuevo');
  await expect(nuevo).toBeVisible();
  const caja = await nuevo.boundingBox();
  expect(caja.height, 'el botón es cómodo de tocar').toBeGreaterThanOrEqual(44);
  expect(caja.width, 'a todo el ancho').toBeGreaterThan(300);
  // Va primero en la barra de la lista.
  const arriba = await page.evaluate(() => {
    const b = document.getElementById('tl-btn-nuevo').getBoundingClientRect().top;
    const otros = [...document.querySelectorAll('#tl-acciones-lista > *')].filter(e => e.id !== 'tl-btn-nuevo' && e.getBoundingClientRect().height > 0);
    return otros.every(e => e.getBoundingClientRect().top >= b);
  });
  expect(arriba, 'el botón va primero').toBe(true);
  await captura(page, 'taller-celu-lista', info);
  await sinScroll(page, 'la lista');

  await nuevo.click();
  await expect(page.locator('#tl-vista-editor')).toBeVisible();
  await expect(page.locator('#tl-editor-titulo')).toHaveText('Proyecto nuevo');
  await sinScroll(page, 'el formulario');

  // Ningún campo con letra de menos de 16 px (el celular haría zoom).
  const chicos = await page.evaluate(() => [...document.querySelectorAll('#tl-vista-editor input, #tl-vista-editor textarea, #tl-vista-editor select')]
    .filter(e => e.getBoundingClientRect().height > 0 && parseFloat(getComputedStyle(e).fontSize) < 16).map(e => e.id));
  expect(chicos, `campos con letra chica: ${chicos.join(', ')}`).toEqual([]);

  // Nada se sale de su lugar (ningún campo ni botón más ancho que la pantalla).
  const afuera = await page.evaluate(() => [...document.querySelectorAll('#tl-vista-editor *')]
    .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1) }).map(e => e.id || e.className));
  expect(afuera, `se sale de la pantalla: ${afuera.join(', ')}`).toEqual([]);

  // Escribir: con el foco en un campo, la barra de abajo no tapa nada.
  await page.locator('#tl-ed-nombre').fill('Cinta transportadora para Dolce');
  await page.locator('#tl-ed-nombre').focus();
  await expect(page.locator('.barra-abajo')).toBeHidden();
  // "Teclado abierto": la pantalla se achica a la mitad y el campo queda a la vista.
  await page.setViewportSize({ width: 390, height: 420 });
  await page.locator('#tl-ed-observaciones').focus();
  await page.locator('#tl-ed-observaciones').fill('Pedido por WhatsApp');
  const visible = await page.locator('#tl-ed-observaciones').evaluate(e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight });
  expect(visible, 'el campo que se escribe queda a la vista con el teclado abierto').toBe(true);
  await captura(page, 'taller-celu-teclado', info);
  await page.locator('#tl-ed-observaciones').blur();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.barra-abajo')).toBeVisible();

  // Guardar: el botón se alcanza y abre el proyecto.
  const guardar = page.locator('#tl-ed-guardar');
  await guardar.scrollIntoViewIfNeeded();
  await expect(guardar).toBeVisible();
  await captura(page, 'taller-celu-guardar', info);
  await guardar.click();
  await expect(page.locator('#tl-vista-ficha')).toBeVisible();
  // En la ficha del celular, editar (que cambia también el estado) está a mano.
  await expect(page.locator('.tl-ficha__resumen-celu [data-accion="editar"]')).toBeVisible();
  await sinScroll(page, 'la ficha');
  await page.evaluate(() => sessionStorage.removeItem('maqueta.cambios'));
  expect(errores, errores.join('\n')).toEqual([]);
});

test('celular (390 px): sin permiso de gestionar no hay "+ Nuevo proyecto"', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${MAQUETA}/modulos/taller.html?maqueta=taller-diseno`);
  // Tomás, pero solo con ver y cargar.
  await page.evaluate(() => sessionStorage.setItem('maqueta.cambios', JSON.stringify({ tablas: { empleado_tareas: [
    { empleado_id: 'emp-tomas', modulo: 'taller', tarea: 'ver', alcance: null, habilitado: true },
    { empleado_id: 'emp-tomas', modulo: 'taller', tarea: 'cargar', alcance: null, habilitado: true },
  ] } })));
  await page.reload();
  await expect(page.locator('#tl-lista')).toBeVisible();
  await expect(page.locator('#tl-btn-nuevo')).toBeHidden();
  await page.evaluate(() => sessionStorage.removeItem('maqueta.cambios'));
  expect(errores, errores.join('\n')).toEqual([]);
});

test('compu (1280 px): "+ Nuevo proyecto" sigue en la barra de la lista', async ({ page }, info) => {
  const errores = vigilarErrores(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${MAQUETA}/modulos/taller.html?maqueta=taller-diseno`);
  const nuevo = page.locator('#tl-btn-nuevo');
  await expect(nuevo).toBeVisible();
  const caja = await nuevo.boundingBox();
  expect(caja.width, 'en la compu no ocupa todo el ancho').toBeLessThan(400);
  await nuevo.click();
  await expect(page.locator('#tl-vista-editor')).toBeVisible();
  await captura(page, 'taller-compu-editor', info);
  await sinScroll(page, 'el formulario');
  expect(errores, errores.join('\n')).toEqual([]);
});
