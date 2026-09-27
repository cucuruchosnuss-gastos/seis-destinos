// La versión del SDK va FIJA (27/09/2026): "@2" cambiaba sola con cada
// versión nueva, y el manejo de la sesión (el refresco, los bloqueos entre
// pestañas) cambió varias veces adentro de la 2.x. Subirla es un cambio a
// propósito, probado con e2e/6-planta-reanudar.spec.js.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm'
import { instalarSalud } from './salud.js'

const SUPABASE_URL = 'https://xtorxouhzuizdvawqakb.supabase.co'
const SUPABASE_KEY = 'sb_publishable_G8GZe2uAvb6VdJ1S4DD8nA_CC7iugYw'

if (SUPABASE_KEY === 'SUPABASE_PUBLISHABLE_KEY') {
  console.warn('⚠️  Reemplazá SUPABASE_PUBLISHABLE_KEY en js/supabase.js con tu API key real.')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// El registro de errores, la sesión al volver de estar bloqueada y el aviso
// de "Sin conexión", en TODAS las pantallas (js/salud.js).
instalarSalud(supabase)
