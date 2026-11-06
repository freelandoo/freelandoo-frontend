// Tela de versus antes da luta (2026-11-06).
// Idempotente (fill-if-absent). node <script> [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const KEYS = {
  "pt-BR": { vsLife: "Vida", vsStart: "Iniciar luta" },
  en: { vsLife: "Health", vsStart: "Start fight" },
  es: { vsLife: "Vida", vsStart: "Iniciar pelea" },
}
for (const [loc, keys] of Object.entries(KEYS)) {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  for (const [k, v] of Object.entries(keys)) if (!(k in dict.MeuMundo)) dict.MeuMundo[k] = v
  for (const k of ["vsTapTouch", "vsTapKey", "vsPack"]) delete dict.MeuMundo[k]
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
}
