// Esportes — faixa "Seu esporte" da raiz (repaginada 2026-10-27). Namespace
// "Sports". Idempotente, fill-if-absent. Rodar: node scripts/i18n-esportes-raiz-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")
const SPORTS = { mySportKicker: ["Seu esporte", "Your sport", "Tu deporte"] }
let added = 0
for (const [i, locale] of ["pt-BR", "en", "es"].entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.Sports = json.Sports || {}
  for (const [key, vals] of Object.entries(SPORTS)) {
    if (json.Sports[key] === undefined) {
      json.Sports[key] = vals[i]
      added++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n esportes raiz: ${added} chaves adicionadas`)
