// Meu Mundo 3D — mm3d-58: o hóspede cresce (jovem → adulto). Namespace
// "MeuMundo". Idempotente, fill-if-absent. Rodar: node scripts/i18n-meu-mundo-growth-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  ntAdult: [
    "Virei adulto! Fiquei 20% mais forte, rápido e esperto, e a saúde voltou a 100.",
    "I grew up! I'm 20% stronger, faster and smarter, and my health is back to 100.",
    "¡Me hice adulto! Soy un 20% más fuerte, rápido y listo, y la salud volvió a 100.",
  ],
  evAdult: [
    "Virou adulto: +20% em inteligência, força e velocidade; saúde 100.",
    "Grew up: +20% intelligence, strength and speed; health 100.",
    "Se hizo adulto: +20% en inteligencia, fuerza y velocidad; salud 100.",
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
console.log(`i18n meu-mundo growth: ${added} chaves adicionadas`)
