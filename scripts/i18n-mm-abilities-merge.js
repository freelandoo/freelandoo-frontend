// Meu Mundo 3D — nomes próprios das habilidades por personagem (2026-11-07). Namespace "MeuMundo".
// Idempotente (FILL preenche o que falta).
// Rodar: node scripts/i18n-mm-abilities-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const FILL = {
  abilityBloodCut: ["Golpe de Sangue", "Blood Cut", "Golpe de Sangre"],
}

const LOCALES = ["pt-BR", "en", "es"]
let added = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  for (const [key, vals] of Object.entries(FILL)) {
    if (json.MeuMundo[key] === undefined) {
      json.MeuMundo[key] = vals[i]
      added++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n habilidades: ${added} chaves adicionadas`)
