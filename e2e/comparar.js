// COMPARAR CON EL DISEÑO (28/09/2026).
//
// Pone lado a lado la foto de una pantalla del diseño y la de la pantalla real
// —las dos del MISMO tamaño— con un tercer cuadro que pinta en rojo dónde
// difieren, y devuelve un número: qué parte de la pantalla es distinta.
//
// Cómo se mide, y por qué así: las dos fotos se achican a celdas de 8 × 8 px
// (el promedio de cada celda) y se cuenta qué celdas difieren en color más de
// un umbral. Achicar hace que un texto con otro nombre o un número distinto
// (los datos de ejemplo del diseño nunca son los de la maqueta) casi no cuente,
// y que sí cuente lo que es de DISEÑO: un bloque en otro lugar, otro color de
// fondo, una columna de más, una barra que falta. No es una prueba de píxeles:
// es un aviso de "esto no se parece", y la foto de al lado es la que se mira.
//
// No usa librerías: la cuenta la hace un <canvas> en el mismo Chromium.
'use strict';
const fs = require('fs');
const path = require('path');

const CELDA = 8;
// Distancia de color (0..441) a partir de la cual una celda cuenta como distinta.
const UMBRAL_CELDA = 42;

async function comparar(page, pngDiseno, pngReal, { titulo = '', salida = null } = {}) {
  const a = `data:image/png;base64,${pngDiseno.toString('base64')}`;
  const b = `data:image/png;base64,${pngReal.toString('base64')}`;
  const r = await page.evaluate(async ({ a, b, CELDA, UMBRAL_CELDA, titulo }) => {
    const cargar = src => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = src; });
    const [ia, ib] = await Promise.all([cargar(a), cargar(b)]);
    const w = Math.min(ia.naturalWidth, ib.naturalWidth), h = Math.min(ia.naturalHeight, ib.naturalHeight);
    const cw = Math.ceil(w / CELDA), ch = Math.ceil(h / CELDA);
    const chico = img => {
      const c = document.createElement('canvas'); c.width = cw; c.height = ch;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      x.drawImage(img, 0, 0, w, h, 0, 0, cw, ch);
      return x.getImageData(0, 0, cw, ch).data;
    };
    const da = chico(ia), db = chico(ib);
    let distintas = 0;
    const mapa = new Uint8Array(cw * ch);
    for (let i = 0; i < cw * ch; i++) {
      const d = Math.hypot(da[i * 4] - db[i * 4], da[i * 4 + 1] - db[i * 4 + 1], da[i * 4 + 2] - db[i * 4 + 2]);
      if (d > UMBRAL_CELDA) { distintas++; mapa[i] = 1; }
    }
    // La imagen para mirar: diseño | real | diferencias, con sus rótulos.
    const sep = 16, cab = 34;
    const lienzo = document.createElement('canvas');
    lienzo.width = w * 3 + sep * 4; lienzo.height = h + cab + sep;
    const x = lienzo.getContext('2d');
    x.fillStyle = '#E4E0D9'; x.fillRect(0, 0, lienzo.width, lienzo.height);
    x.fillStyle = '#1C1A17'; x.font = 'bold 18px sans-serif';
    const rotulos = ['Diseño', 'La app (maqueta)', 'Dónde difiere'];
    for (let k = 0; k < 3; k++) x.fillText(`${rotulos[k]}${k === 0 && titulo ? ' · ' + titulo : ''}`, sep + k * (w + sep), 24);
    x.drawImage(ia, 0, 0, w, h, sep, cab, w, h);
    x.drawImage(ib, 0, 0, w, h, sep * 2 + w, cab, w, h);
    const ox = sep * 3 + w * 2;
    x.globalAlpha = 0.35; x.drawImage(ib, 0, 0, w, h, ox, cab, w, h); x.globalAlpha = 1;
    x.fillStyle = 'rgba(194, 65, 12, 0.55)';
    for (let i = 0; i < cw * ch; i++) if (mapa[i]) x.fillRect(ox + (i % cw) * CELDA, cab + Math.floor(i / cw) * CELDA, CELDA, CELDA);
    return { diferencia: distintas / (cw * ch), ancho: w, alto: h, png: lienzo.toDataURL('image/png').split(',')[1] };
  }, { a, b, CELDA, UMBRAL_CELDA, titulo });
  if (salida) {
    fs.mkdirSync(path.dirname(salida), { recursive: true });
    fs.writeFileSync(salida, Buffer.from(r.png, 'base64'));
  }
  return { diferencia: r.diferencia, ancho: r.ancho, alto: r.alto };
}

module.exports = { comparar, CELDA, UMBRAL_CELDA };
