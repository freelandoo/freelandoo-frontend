// Guardião do castelo dos Domínios persegue, some ao cair e a porta se abre (22/11/2026). Idempotente (fill-if-absent).
// node scripts/i18n-mm-porta-castelo-merge.js [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const ADD = {
  "pt-BR": { domCastleOpen: "O guardião caiu! A porta do castelo se abriu." },
  en: { domCastleOpen: "The guardian has fallen! The castle gate is open." },
  es: { domCastleOpen: "¡El guardián cayó! La puerta del castillo se abrió." },
}
for (const [lang, add] of Object.entries(ADD)) {
  const file = path.join(DIR, lang + ".json")
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  const mm = dict.MeuMundo
  if (!mm) throw new Error("sem MeuMundo em " + lang)
  let n = 0
  for (const [k, v] of Object.entries(add)) if (!(k in mm)) { mm[k] = v; n++ }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(lang, "+" + n)
}
