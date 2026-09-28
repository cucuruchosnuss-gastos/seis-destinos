// Hook de Claude Code (PreToolUse, Bash y PowerShell), 28/09/2026.
//
// Rechaza un `node -e` / `node -p` / `python -c` que ESCRIBE archivos: en este
// entorno (Git Bash / PowerShell sobre Windows) las comillas, las barras y los
// \n de adentro se comen o se duplican sin avisar, y el archivo queda con un
// string sin cerrar que recién rompe en el navegador (pasó varias veces; ver la
// skill editar-archivos). Los one-liners de SOLO LECTURA (contar, verificar,
// probar una función) siguen andando.
//
// Recibe por stdin el JSON del hook; sale con 2 y un mensaje en stderr para
// bloquear, con 0 para dejar pasar. Si no entiende la entrada, deja pasar: un
// hook roto no puede trabar la sesión.
'use strict'

const ONE_LINER = /(?:^|[\s;&|(])(?:node(?:\.exe)?\s+(?:[^\n]*?\s)?(?:-e|--eval|-p|--print)\b|(?:python3?|py)(?:\.exe)?\s+(?:[^\n]*?\s)?-c\b)/i
// El mismo problema con el script pasado por un heredoc: `python - <<'EOF'`,
// `node <<EOF`, `python3 -<<EOF` (28/09/2026: un subagente editó así y el hook
// no lo vio).
const HEREDOC = /(?:^|[\s;&|(])(?:node|python3?|py)(?:\.exe)?(?:\s+-)?\s*<<-?\s*['"]?\w+/i

const ESCRIBE = [
  /\bwriteFileSync\b/, /\bappendFileSync\b/, /\bwriteFile\s*\(/, /\bappendFile\s*\(/,
  /\bcreateWriteStream\b/, /\bcopyFileSync\b/, /\brenameSync\b/, /\bunlinkSync\b/, /\brmSync\b/,
  /\bopen\s*\([^)]*,\s*\\?['"](?:w|a|r\+|w\+|a\+|wb|ab)\\?['"]/,     // python open(..., 'w')
  /\.write_text\s*\(/, /\.write_bytes\s*\(/, /\bshutil\.(?:copy|move)/, /\bos\.(?:remove|rename|replace)\s*\(/,
]

function motivo(comando) {
  if (typeof comando !== 'string' || !(ONE_LINER.test(comando) || HEREDOC.test(comando))) return null
  const hit = ESCRIBE.find(re => re.test(comando))
  if (!hit) return null
  return 'Bloqueado por el hook sin-one-liners-de-edicion: este `node -e` / `python -c` escribe un archivo. '
    + 'En este entorno las comillas, las barras y los \\n de adentro se rompen sin avisar. '
    + 'Seguí la skill editar-archivos: escribí el script con Write en el scratchpad (con su ancla única), '
    + 'corrélo con `node <archivo>` y verificá con check-bytes y check-scripts. '
    + 'Los one-liners de solo lectura siguen permitidos.'
}

function main() {
  let entrada = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', d => { entrada += d })
  process.stdin.on('end', () => {
    let j
    try { j = JSON.parse(entrada) } catch { process.exit(0) }
    const m = motivo(j?.tool_input?.command)
    if (m) { process.stderr.write(m + '\n'); process.exit(2) }
    process.exit(0)
  })
}

if (require.main === module) main()
module.exports = { motivo }
