// Meu Mundo 3D — 21/11: o monstro da rua percebe quem chega perto, corre até a pessoa
// e a luta abre sozinha (tela de versus). Namespace "MeuMundo". Idempotente.
// MEU_MUNDO = preenche se faltar; OVERRIDE = troca o valor (o texto antigo falava em "encarar").
// Rodar: node scripts/i18n-mm-mob-chase-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  mobChase: ["{mob} te viu e está vindo!", "{mob} spotted you and is coming!", "¡{mob} te vio y viene por ti!"],
}
const OVERRIDE = {
  mobAlertNight: [
    "Monstros à solta! Se um deles te vir, ele vem atrás.",
    "Monsters on the loose! If one spots you, it comes after you.",
    "¡Monstruos sueltos! Si uno te ve, va tras de ti.",
  ],
}

const LOCALES = ["pt-BR", "en", "es"]
let added = 0
let changed = 0
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
  for (const [key, vals] of Object.entries(OVERRIDE)) {
    if (json.MeuMundo[key] !== vals[i]) {
      json.MeuMundo[key] = vals[i]
      changed++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n mm mob chase: ${added} chaves adicionadas, ${changed} trocadas`)
