// Áudio S1 (2026-11-11): item "Som" da gaveta (features/meu-mundo/ui/hud/sound-item.tsx).
// Fill-if-absent no namespace MeuMundo. Idempotente. node <script> [pasta]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")

const KEYS = {
  "pt-BR": { menuSound: "Som", soundOn: "Ligado", soundLow: "Baixo", soundOff: "Desligado" },
  en: { menuSound: "Sound", soundOn: "On", soundLow: "Low", soundOff: "Off" },
  es: { menuSound: "Sonido", soundOn: "Activado", soundLow: "Bajo", soundOff: "Desactivado" },
}

for (const [loc, keys] of Object.entries(KEYS)) {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  dict.MeuMundo = dict.MeuMundo || {}
  let n = 0
  for (const [k, v] of Object.entries(keys)) {
    if (dict.MeuMundo[k] === undefined) {
      dict.MeuMundo[k] = v
      n++
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(loc, "áudio S1 +", n)
}
