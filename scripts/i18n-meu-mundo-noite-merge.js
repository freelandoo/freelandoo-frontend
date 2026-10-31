// Meu Mundo 3D — mm3d-57b: monstros soltos de noite (sem portal) que perseguem quem encaram.
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-noite-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  mobAlertNight: [
    "Monstros à solta! Se um deles te encarar, ele vem atrás.",
    "Monsters on the loose! If one stares you down, it comes after you.",
    "¡Monstruos sueltos! Si uno te mira de frente, va tras de ti.",
  ],
  mobCaught: ["{mob} te alcançou!", "{mob} caught you!", "¡{mob} te alcanzó!"],
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
console.log(`i18n mm3d-57b noite: ${added} chaves adicionadas`)
