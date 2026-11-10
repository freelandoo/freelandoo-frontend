// Meu Mundo 3D — lore v2 F2: nível do TREINADOR (HUD, STATUS e prêmios).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-treinador-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  hudTrainer: ["Treinador {n}", "Trainer {n}", "Entrenador {n}"],
  hudTrainerShort: ["Tr. {n}", "Tr. {n}", "Ent. {n}"],
  hudTrainerHint: [
    "Nível do treinador: é da sua conta e abre os capítulos da história",
    "Trainer level: it belongs to your account and unlocks the story chapters",
    "Nivel de entrenador: es de tu cuenta y abre los capítulos de la historia",
  ],
  rewardTrainerXp: ["XP do treinador", "Trainer XP", "XP de entrenador"],
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
console.log(`i18n meu-mundo treinador: ${added} chaves adicionadas`)
