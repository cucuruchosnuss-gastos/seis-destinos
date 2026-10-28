// Pruebas en un navegador real (Chromium), contra un servidor estático local con
// el repo tal cual y la base real (la key pública ya está en el repo).
// Las credenciales del robot vienen de variables de entorno; sin ellas, los
// recorridos se saltean con un aviso y solo corre el humo.
const { defineConfig } = require('@playwright/test');
// Los puertos se pueden cambiar (el ensayo de integración usa otros, libres,
// para no chocar con un servidor que ya esté corriendo en 4173 / 4180).
const PUERTO = Number(process.env.E2E_PUERTO || 4173);
const PUERTO_MAQUETA = Number(process.env.E2E_PUERTO_MAQUETA || 4180);
// En GitHub el trabajo "Navegador" corre en dos mitades a la vez (E2E_MITAD=1
// o 2, ver mitades.js). Sin E2E_MITAD corre todo, como siempre.
const { opcionesDeMitad } = require('./mitades');
// El ensayo de integración corre las dos mitades A LA VEZ en la compu: cada
// una con su carpeta (E2E_SALIDA=1 → resultados-1 e informe-1), porque
// Playwright vacía la suya al arrancar y borraría la de la otra.
const SALIDA = process.env.E2E_SALIDA ? `-${process.env.E2E_SALIDA}` : '';

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: /.*\.spec\.js$/,
  // DESPUÉS de testMatch: la mitad 1 lo reemplaza por su lista.
  ...opcionesDeMitad(process.env.E2E_MITAD),
  outputDir: `${__dirname}/resultados${SALIDA}`,
  // Los recorridos comparten la fábrica de pruebas: nunca en paralelo.
  workers: 1,
  fullyParallel: false,
  // Un reintento en CI: la red hacia el CDN y la base falla de vez en cuando
  // (pasó una vez el 26/09/2026, con el mismo código que después pasó). El
  // reporter 'github' deja anotado como "flaky" lo que pasó al segundo intento,
  // así el ruido se ve en vez de taparse.
  retries: process.env.CI ? 1 : 0,
  timeout: 5 * 60 * 1000,
  expect: { timeout: 15000 },
  // En CI, además, el reporter 'github': cada falla queda como ANOTACIÓN de la
  // corrida, que se lee sin credenciales (el log del job y los artefactos no).
  // Y reporter-tiempos.js: los segundos de cada spec, también como aviso, para
  // repartir las mitades (npm run tiempos:navegador).
  reporter: [['list'], ['html', { outputFolder: `${__dirname}/informe${SALIDA}`, open: 'never' }],
    ...(process.env.CI ? [['github'], [`${__dirname}/reporter-tiempos.js`]] : [])],
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    browserName: 'chromium',
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    serviceWorkers: 'block',
  },
  webServer: [
    {
      command: `node ${__dirname}/servidor.js ${PUERTO}`,
      url: `http://localhost:${PUERTO}/login.html`,
      reuseExistingServer: !process.env.CI,
    },
    // La maqueta (Supabase falso con datos fijos) para 5-maqueta.spec.js.
    {
      command: `node ${__dirname}/maqueta/servir.js ${PUERTO_MAQUETA}`,
      url: `http://localhost:${PUERTO_MAQUETA}/login.html`,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
