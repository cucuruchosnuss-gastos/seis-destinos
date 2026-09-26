// Pruebas en un navegador real (Chromium), contra un servidor estático local con
// el repo tal cual y la base real (la key pública ya está en el repo).
// Las credenciales del robot vienen de variables de entorno; sin ellas, los
// recorridos se saltean con un aviso y solo corre el humo.
const { defineConfig } = require('@playwright/test');
const PUERTO = 4173;

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
      command: `node ${__dirname}/maqueta/servir.js 4180`,
      url: 'http://localhost:4180/login.html',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
