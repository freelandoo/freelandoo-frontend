// Meu Mundo 3D — mm3d-13 (vida do hóspede: deitar, dormir, acordar).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-mm3d13-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  bedLie: ["Deitar", "Lie down", "Acostarse"],
  bedSleep: ["Dormir", "Sleep", "Dormir"],
  bedWake: ["Acordar", "Wake up", "Despertar"],
  bedTaken: ["Essa cama já está ocupada", "That bed is taken", "Esa cama ya está ocupada"],
  bedFar: ["Chegue mais perto da cama", "Get closer to the bed", "Acércate más a la cama"],
  bedStimulated: [
    "Com estimulante no corpo ele não consegue dormir",
    "With stimulants in his body he can't fall asleep",
    "Con estimulantes en el cuerpo no logra dormir",
  ],
  bedDenied: ["Não deu para deitar agora", "Couldn't lie down right now", "No se pudo acostar ahora"],
  bedSleepingLine: [
    "Dormindo — ele continua dormindo mesmo com o jogo fechado",
    "Sleeping — he keeps sleeping even with the game closed",
    "Durmiendo — sigue durmiendo aunque cierres el juego",
  ],
  lifeInHospital: ["Ele está internado no hospital", "He is in the hospital", "Está internado en el hospital"],
  lifeDead: ["Seu hóspede morreu", "Your resident died", "Tu huésped murió"],
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
console.log(`i18n mm3d-13: ${added} chaves adicionadas`)
