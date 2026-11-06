// Adversário à altura no menu do Boxe e da Arena (2026-11-05).
// Idempotente (fill-if-absent). node <script> [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const KEYS = {
  "pt-BR": { laminasSubPeer: "Com os seus status", laminasSubChampion: "20% mais forte que você" },
  en: { laminasSubPeer: "Matches your stats", laminasSubChampion: "20% stronger than you" },
  es: { laminasSubPeer: "Con tus estadísticas", laminasSubChampion: "20% más fuerte que tú" },
}
for (const [loc, keys] of Object.entries(KEYS)) {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  dict.MeuMundo = dict.MeuMundo || {}
  for (const [k, v] of Object.entries(keys)) if (!(k in dict.MeuMundo)) dict.MeuMundo[k] = v
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
}
