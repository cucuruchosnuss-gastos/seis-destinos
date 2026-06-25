import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://xtorxouhzuizdvawqakb.supabase.co'
const SUPABASE_KEY = 'sb_publishable_G8GZe2uAvb6VdJ1S4DD8nA_CC7iugYw'

if (SUPABASE_KEY === 'SUPABASE_PUBLISHABLE_KEY') {
  console.warn('⚠️  Reemplazá SUPABASE_PUBLISHABLE_KEY en js/supabase.js con tu API key real.')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
