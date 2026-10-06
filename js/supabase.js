// La versión del SDK va FIJA (27/09/2026): "@2" cambiaba sola con cada
// versión nueva, y el manejo de la sesión (el refresco, los bloqueos entre
// pestañas) cambió varias veces adentro de la 2.x. Subirla es un cambio a
// propósito, probado con e2e/6-planta-reanudar.spec.js.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm'
import { instalarSalud } from './salud.js'
import { crearFetchConCopia } from './sin-internet.js'

const SUPABASE_URL = 'https://xtorxouhzuizdvawqakb.supabase.co'
const SUPABASE_KEY = 'sb_publishable_G8GZe2uAvb6VdJ1S4DD8nA_CC7iugYw'

if (SUPABASE_KEY === 'SUPABASE_PUBLISHABLE_KEY') {
  console.warn('⚠️  Reemplazá SUPABASE_PUBLISHABLE_KEY en js/supabase.js con tu API key real.')
}

// LA PLANTA SIN INTERNET (06/10/2026): la página que lo pide
// (<meta name="sd-sin-internet">, hoy solo la planta) lee con una copia en
// IndexedDB. Cada lectura que sale bien se guarda; sin red se contesta con la
// copia y se avisa con el evento 'sd:copia' (la hora de la copia). Las
// escrituras nunca se copian. Ver js/sin-internet.js.
function opcionesCliente() {
  let conCopia = false
  try { conCopia = !!globalThis.document?.querySelector?.('meta[name="sd-sin-internet"]') } catch { conCopia = false }
  if (!conCopia) return {}
  const avisar = (nombre, detalle) => { try { globalThis.dispatchEvent(new CustomEvent(nombre, { detail: detalle })) } catch { /* nada */ } }
  return {
    global: {
      fetch: crearFetchConCopia({
        base: SUPABASE_URL,
        alUsarCopia: (guardado) => avisar('sd:copia', { guardado }),
        alLeerDeRed: () => avisar('sd:red', {}),
      }),
    },
  }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, opcionesCliente())

// El registro de errores, la sesión al volver de estar bloqueada y el aviso
// de "Sin conexión", en TODAS las pantallas (js/salud.js).
instalarSalud(supabase)
