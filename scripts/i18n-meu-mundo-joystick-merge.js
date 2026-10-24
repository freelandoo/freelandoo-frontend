// Meu Mundo 3D — mm3d-25: o joystick dirige todos os veículos.
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-joystick-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  helpDriveTouch2: [
    "Joystick: para a frente acelera, para trás freia e dá ré, para os lados vira",
    "Joystick: push forward to accelerate, back to brake and reverse, sideways to steer",
    "Joystick: hacia adelante acelera, hacia atrás frena y da marcha atrás, a los lados gira",
  ],
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
console.log(`i18n mm3d-25 joystick: ${added} chaves adicionadas`)
