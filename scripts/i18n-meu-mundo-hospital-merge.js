// Meu Mundo 3D — mm3d-26: hospital no centro da cidade.
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-hospital-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  centerPlace_hospital: ["Hospital", "Hospital", "Hospital"],
}

const LOCALES = ["pt-BR", "en", "es"]
let added = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo = json.MeuMundo || {}
  for (const [key, vals] of Object.entries(MEU_MUNDO)) {
    if (json.MeuMundo[key] === undefined) {
      json.MeuMundo[key] = vals[i]
      added++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n mm3d-26 hospital: ${added} chaves adicionadas`)
