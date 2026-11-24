// gacha-v1b (24/11/2026): a Fonte do Éter na praça do centro (abre as Convocações) e o céu da abertura.
// Fill-if-absent no namespace MeuMundo. Idempotente. node <script> [pasta]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const KEYS = {
  "pt-BR": { centerFountain: "Fonte do Éter", centerFountainUse: "Fonte do Éter · Convocar", gaSeeSummary: "Ver resumo" },
  en: { centerFountain: "Aether Fountain", centerFountainUse: "Aether Fountain · Summon", gaSeeSummary: "See summary" },
  es: { centerFountain: "Fuente del Éter", centerFountainUse: "Fuente del Éter · Convocar", gaSeeSummary: "Ver resumen" },
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
  console.log(loc, "fonte do éter +", n)
}
