// Rolê Noturno com no máximo 4 (vaga vazia vira computador) — 2026-11-09. Fill-if-absent no
// namespace MeuMundo. Idempotente. node <script> [pasta]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const TEXT = {
  "pt-BR": {
    noturnoLobbyCount4: "{n} de 4 no rolê",
    noturnoModeBotsSub4: "Espera até 20 segundos · até 4",
  },
  en: {
    noturnoLobbyCount4: "{n} of 4 riding",
    noturnoModeBotsSub4: "Waits up to 20 seconds · up to 4",
  },
  es: {
    noturnoLobbyCount4: "{n} de 4 en la ruta",
    noturnoModeBotsSub4: "Espera hasta 20 segundos · hasta 4",
  },
}
for (const [loc, keys] of Object.entries(TEXT)) {
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
  console.log(`${loc}: +${n}`)
}
