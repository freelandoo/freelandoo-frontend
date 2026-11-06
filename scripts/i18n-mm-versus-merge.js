// Tela de versus antes da luta (2026-11-06).
// Idempotente (fill-if-absent). node <script> [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const KEYS = {
  "pt-BR": { vsLife: "Vida", vsTapTouch: "Toque na tela para lutar", vsTapKey: "Clique ou aperte Espaço para lutar", vsPack: "A vida é a soma dos {n}. Cada um tem a sua parte." },
  en: { vsLife: "Health", vsTapTouch: "Tap the screen to fight", vsTapKey: "Click or press Space to fight", vsPack: "Health is the total of all {n}. Each one has a share." },
  es: { vsLife: "Vida", vsTapTouch: "Toca la pantalla para luchar", vsTapKey: "Haz clic o pulsa Espacio para luchar", vsPack: "La vida es la suma de los {n}. Cada uno tiene su parte." },
}
for (const [loc, keys] of Object.entries(KEYS)) {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  for (const [k, v] of Object.entries(keys)) if (!(k in dict.MeuMundo)) dict.MeuMundo[k] = v
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
}
