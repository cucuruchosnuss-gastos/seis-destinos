// Pruebas en un navegador real (Chromium), contra un servidor estático local con
// el repo tal cual y la base real (la key pública ya está en el repo).
// Las credenciales del robot vienen de variables de entorno; sin ellas, los
// recorridos se saltean con un aviso y solo corre el humo.
const { defineConfig } = require('@playwright/test');
// Los puertos se pueden cambiar (el ensayo de integración usa otros, libres,
// para no chocar con un servidor que ya esté corriendo en 4173 / 4180).
const PUERTO = Number(process.env.E2E_PUERTO || 4173);
const PUERTO_MAQUETA = Number(process.env.E2E_PUERTO_MAQUETA || 4180);

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: /.*\.spec\.js$/,
  outputDir: `${__dirname}/resultados`,
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
  reporter: [['list'], ['html', { outputFolder: `${__dirname}/informe`, open: 'never' }], ...(process.env.CI ? [['github']] : [])],
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
