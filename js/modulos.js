// El catálogo de módulos de la app (27/09/2026). Lo usan el dashboard (las
// tarjetas y sus burbujas) y la barra lateral de la compu (js/barra-lateral.js):
// una sola lista, así las dos dicen lo mismo. Antes vivía dentro de
// dashboard.html. Las urls son relativas a la RAÍZ del repo.
//
// Puro: no toca el DOM ni la base. Las pruebas lo leen con extraerConst /
// extraerFn (que aceptan el `export`).

// Orden fijo — no depende de datos, siempre se muestran en este orden.
export const MODULOS = [
  {
    clave: 'gastos',
    nombre: 'Gastos',
    icono: 'credit-card',
    descripcion: 'Registro y control de gastos',
    url: 'modulos/gastos.html',
    proximamente: false,
    color: 'cyan'
  },
  {
    clave: 'caja',
    nombre: 'Caja',
    icono: 'wallet',
    descripcion: 'Saldo y movimientos de caja por persona',
    url: 'modulos/caja.html',
    proximamente: false,
    color: 'amarillo'
  },
  {
    clave: 'accesos',
    nombre: 'Accesos',
    icono: 'user-check',
    descripcion: 'Aprobación de usuarios y permisos',
    url: 'modulos/accesos.html',
    proximamente: false,
    soloSuperAdmin: true,
    color: 'rojo'
  },
  {
    clave: 'empleados',
    nombre: 'Empleados',
    icono: 'users',
    descripcion: 'Directorio sincronizado desde Naaloo',
    url: 'modulos/empleados.html',
    proximamente: false,
    color: 'violeta'
  },
  {
    clave: 'cuentas-corrientes',
    nombre: 'Cuentas corrientes',
    icono: 'landmark',
    descripcion: 'Cuentas corrientes de proveedores',
    url: 'modulos/cuentas-corrientes.html',
    proximamente: false,
    color: 'turquesa'
  },
  {
    clave: 'materia-prima',
    nombre: 'Ingreso',
    icono: 'package',
    descripcion: 'Insumos - Materia prima',
    url: 'modulos/materia-prima.html',
    proximamente: false,
    color: 'marron'
  },
  {
    clave: 'stock',
    nombre: 'Stock',
    icono: 'warehouse',
    descripcion: 'Catálogo de insumos y existencias',
    url: 'modulos/stock.html',
    proximamente: false,
    color: 'verde'
  },
  {
    clave: 'cobranzas',
    nombre: 'Cobranzas',
    // 'hand-coins' ya lo usa gastos.html contra este mismo Lucide, así que
    // el ícono existe en la versión cargada.
    icono: 'hand-coins',
    descripcion: 'Cheques y efectivo de los repartidores',
    url: 'modulos/cobranzas.html',
    proximamente: false,
    color: 'naranja'
  },
  {
    // La cartera de cheques (22/09/2026). No tiene fila propia en
    // empleado_modulos: se ve con el módulo cobranzas habilitado Y alguna
    // de las dos tareas que dejan ver la cartera. Con solo "cargar" la
    // persona vería nada más que sus propios cheques, que no es una cartera.
    clave: 'cheques',
    nombre: 'Cheques',
    icono: 'banknote',
    descripcion: 'Cartera de cheques y su salida',
    // La cartera se mudó a Administración (26/09/2026): la tarjeta abre
    // esa sección derecho (cheques.html también redirige ahí).
    url: 'modulos/administracion.html?seccion=cheques',
    proximamente: false,
    color: 'naranja',
    requiereModulo: 'cobranzas',
    requiereTareas: ['cobranzas:ver_todo', 'cobranzas:procesar'],
  },
  {
    // Producción (22/09/2026). Fila propia en modulos/empleado_modulos
    // ('produccion'). Desde el 25/09/2026 son DOS pantallas: la PLANTA
    // (produccion.html, solo para las cuentas de las tablets) y la GESTIÓN
    // (produccion-gestion.html, para las cuentas personales). La tarjeta
    // lleva a la gestión; una tablet ni ve el dashboard (entra derecho a
    // la planta), y si igual llega acá, urlDispositivo la manda a la planta.
    clave: 'produccion',
    nombre: 'Producción',
    icono: 'factory',
    descripcion: 'Indicadores, configuración e historial',
    url: 'modulos/produccion-gestion.html',
    urlDispositivo: 'modulos/produccion.html',
    proximamente: false,
    color: 'azul'
  },
  {
    // Pedidos (23/09/2026): los pedidos de los distribuidores, que llegan
    // por WhatsApp. Fila propia en modulos/empleado_modulos ('pedidos');
    // adentro, cualquiera de sus tres tareas abre la pantalla. Mismo
    // naranja que Cobranzas: es el acento de la cara comercial.
    clave: 'pedidos',
    nombre: 'Pedidos',
    icono: 'clipboard-list',
    descripcion: 'Pedidos de los clientes y su avance',
    url: 'modulos/pedidos.html',
    proximamente: false,
    color: 'naranja'
  },
  {
    // Órdenes de retiro (26/09/2026): la CARGA en el depósito, sin nada de
    // plata. Fila propia en modulos/empleado_modulos ('retiros'), y además
    // la tarea retiros:cargar: el módulo también lo tiene quien solo
    // administra (retiros:ver / precios), y a esa persona la carga no le
    // sirve. Su tarjeta es "Administración".
    clave: 'retiros',
    nombre: 'Órdenes de retiro',
    icono: 'truck',
    descripcion: 'Cargar lo que retira cada cliente',
    url: 'modulos/retiros.html',
    proximamente: false,
    color: 'naranja',
    requiereTareas: ['retiros:cargar'],
  },
  {
    // Administración (26/09/2026): la casa de todo lo que es plata y
    // cuentas. Todavía no hay un módulo 'administracion' en la base: sus
    // secciones de hoy usan las tareas de 'retiros' (ver / precios), así
    // que la tarjeta cuelga de ese módulo y pide una de esas dos.
    clave: 'administracion',
    nombre: 'Administración',
    icono: 'landmark',
    descripcion: 'Órdenes valorizadas, clientes y precios',
    url: 'modulos/administracion.html',
    proximamente: false,
    color: 'naranja',
    requiereModulo: 'retiros',
    requiereTareas: ['retiros:ver', 'retiros:precios'],
  }
]

// Si una tarjeta se dibuja para esta persona. Función pura, para
// ejecutarla en la suite.
//  - soloSuperAdmin / soloAdmin: por rol.
//  - el resto: el módulo habilitado en empleado_modulos (o ser admin). Un
//    módulo puede pedir el de OTRO (requiereModulo): Cheques cuelga de
//    cobranzas, que es el que se otorga en Accesos.
//  - requiereTareas: además, alguna de esas tareas (super_admin las tiene
//    todas, como en tiene_tarea()).
export function moduloVisible(modulo, { esAdmin, esSuperAdmin, misModulos, misTareas }) {
  if (modulo.soloSuperAdmin) return esSuperAdmin
  if (modulo.soloAdmin) return esAdmin
  const habilitado = esAdmin || misModulos.includes(modulo.requiereModulo ?? modulo.clave)
  if (!habilitado) return false
  if (!modulo.requiereTareas) return true
  return esSuperAdmin || modulo.requiereTareas.some(t => misTareas.has(t))
}

// La cuenta de una TABLET de la fábrica (empleados.es_dispositivo) entra
// derecho a la planta, sin pasar por el dashboard (25/09/2026). Reemplaza
// a la regla vieja de "una cuenta que solo tiene Producción": desde que la
// planta y la gestión son dos pantallas, lo que decide es QUÉ ES la
// cuenta, no cuántas tarjetas ve. Una persona con solo Producción ve el
// dashboard con su tarjeta, que la lleva a la gestión.
//
// Pide ADEMÁS una tarea de producción, y ese requisito no es de más: la
// planta vuelve al dashboard cuando no hay ninguna (su sinAcceso()), así
// que redirigir sin mirarlas sería el bucle de redirecciones ya
// documentado, del que no se sale por la UI. Si la consulta de tareas
// falló, misTareas queda vacío y no se redirige: se cae del lado de
// mostrar el dashboard, que siempre tiene salida.
//
// No hace falta el "una vez por sesión" de antes: la planta, para una
// tablet, no tiene ningún link al dashboard, así que no hay vuelta que
// pueda rebotar. Y solo `=== true` es una tablet: un valor raro de la
// columna nunca manda a una persona a la tablet.
export const TAREAS_PRODUCCION = ['produccion:cargar', 'produccion:ver', 'produccion:configurar']

export function entraDerechoAProduccion({ esDispositivo, misTareas }) {
  if (esDispositivo !== true) return false
  return TAREAS_PRODUCCION.some(t => misTareas.has(t))
}

export const COLORES_MODULO = {
  cyan:      { bg: 'var(--color-acento-suave)', fg: 'var(--color-acento-highlight)' },
  rojo:      { bg: 'var(--rojo-suave)',          fg: 'var(--rojo)' },
  violeta:   { bg: 'var(--violeta-suave)',       fg: 'var(--violeta)' },
  amarillo:  { bg: 'var(--amarillo-suave)',      fg: 'var(--amarillo)' },
  turquesa:  { bg: 'var(--turquesa-suave)',      fg: 'var(--turquesa)' },
  marron:    { bg: 'var(--marron-suave)',        fg: 'var(--marron)' },
  verde:     { bg: 'var(--verde-suave)',         fg: 'var(--verde)' },
  naranja:   { bg: 'var(--naranja-suave)',       fg: 'var(--naranja)' },
  azul:      { bg: 'var(--azul-suave)',          fg: 'var(--azul)' }
}

// ═══ Pendientes (mis_pendientes) ═════════════════════════════════════════
// Ver el comentario de las burbujas en dashboard.html.
export const MODULO_DE_PENDIENTE = {
  cobranzas: 'cobranzas',
  // "Cheques que vencen esta semana" (clave por_vencer): la burbuja va en
  // la tarjeta de Cheques, que es donde se les da salida.
  cheques: 'cheques',
  accesos: 'accesos',
  materia_prima: 'materia-prima',
  gastos: 'gastos',
  cuentas_corrientes: 'cuentas-corrientes',
  stock: 'stock',
  caja: 'caja',
  // "Conos nuevos por revisar" (clave conos_por_revisar): la burbuja va en
  // la tarjeta de Producción, que es donde se aceptan o se rechazan
  // (Configuración -> Marcas / Conos). La RPC ya devolvía esta fila desde
  // que existe la tarjeta; sin esta línea caía en el aviso de "módulo sin
  // tarjeta" y no se contaba en ningún lado.
  produccion: 'produccion',
  // "Órdenes de retiro sin valorizar" y "Clientes que pasan su límite de
  // crédito" (26/09/2026): la tarjeta de Administración muestra la suma.
  administracion: 'administracion',
}

// Un pendiente que ADEMÁS se muestra en otra tarjeta (27/09/2026): las
// cobranzas por controlar se asientan en Administración → Cobranzas por
// asentar, así que también suman en su tarjeta. Clave 'modulo:clave' →
// claves de MODULOS extra. La tarjeta propia (Cobranzas) sigue contándolas.
export const TAMBIEN_EN_TARJETA = {
  'cobranzas:por_controlar': ['administracion'],
}

export function escDash(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// "Cobranzas por controlar" + 5 → "5 cobranzas por controlar".
export function textoPendiente(fila) {
  const t = String(fila.texto ?? '').trim()
  const frase = t ? t.charAt(0).toLowerCase() + t.slice(1) : 'pendientes'
  return `${fila.cantidad} ${frase}`
}

// Filas de la RPC → Map(clave de MODULOS → { total, detalle[] }).
// Solo cuentan las cantidades enteras y positivas: un null o un texto no
// se convierten en un número.
export function agruparPendientes(filas) {
  const porModulo = new Map()
  for (const fila of filas || []) {
    const clave = MODULO_DE_PENDIENTE[fila?.modulo]
    if (!clave) { console.warn('mis_pendientes: módulo sin tarjeta', fila?.modulo); continue }
    const n = typeof fila.cantidad === 'number' ? fila.cantidad : Number(fila.cantidad)
    if (fila.cantidad === null || fila.cantidad === undefined || fila.cantidad === '' || !Number.isInteger(n) || n <= 0) continue
    for (const c of [clave, ...(TAMBIEN_EN_TARJETA[`${fila.modulo}:${fila.clave}`] ?? [])]) {
      const actual = porModulo.get(c) || { total: 0, detalle: [] }
      actual.total += n
      actual.detalle.push(textoPendiente({ ...fila, cantidad: n }))
      porModulo.set(c, actual)
    }
  }
  return porModulo
}
