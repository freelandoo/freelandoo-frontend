// Botão TREINAR (rosa) em todos os minijogos — 2026-11-10. Namespace MeuMundo. Idempotente.
// node scripts/i18n-mm-treinar-merge.js [pasta]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const TEXT = {
  "pt-BR": {
    mmTrain: "Treinar",
    mmTrainSub: "Sozinho · sem esperar",
    mmTrainSubBots: "Contra o computador · sem esperar",
  },
  en: {
    mmTrain: "Practice",
    mmTrainSub: "Solo · no waiting",
    mmTrainSubBots: "Against the computer · no waiting",
  },
  es: {
    mmTrain: "Entrenar",
    mmTrainSub: "Solo · sin esperar",
    mmTrainSubBots: "Contra la computadora · sin esperar",
  },
}
for (const [loc, set] of Object.entries(TEXT)) {
  const file = path.join(DIR, loc + ".json")
  const raw = fs.readFileSync(file, "utf8")
  const json = JSON.parse(raw)
  const ns = (json.MeuMundo = json.MeuMundo || {})
  let n = 0
  for (const [k, v] of Object.entries(set)) if (ns[k] !== v) { ns[k] = v; n++ }
  const crlf = raw.includes("\r\n")
  let out = JSON.stringify(json, null, 2) + "\n"
  if (crlf) out = out.replace(/\n/g, "\r\n")
  fs.writeFileSync(file, out)
  console.log(loc, "~" + n)
}
