// Meu Mundo 3D — habilidades da luta (2026-11-03): Corte Mágico, Investida
// Relâmpago, Escudo de Luz, Poder Máximo + ajuda das teclas. Namespace "MeuMundo".
// Idempotente (FILL preenche o que falta).
// Rodar: node scripts/i18n-meu-mundo-skills-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const FILL = {
  skillSlash: ["Corte Mágico", "Magic Slash", "Corte Mágico"],
  skillDash: ["Investida Relâmpago", "Lightning Dash", "Embestida Relámpago"],
  skillShield: ["Escudo de Luz", "Shield of Light", "Escudo de Luz"],
  skillUlt: ["Poder Máximo", "Max Power", "Poder Máximo"],
  laminasKeys2: [
    "WASD anda · J, Espaço ou clique ataca (aperte de novo para o combo) · K, Shift ou botão direito esquiva · 1 Corte Mágico · 2 Investida · 3 Escudo · Q Poder Máximo",
    "WASD moves · J, Space or click attacks (press again for the combo) · K, Shift or right click dodges · 1 Magic Slash · 2 Dash · 3 Shield · Q Max Power",
    "WASD camina · J, Espacio o clic ataca (presiona de nuevo para el combo) · K, Shift o clic derecho esquiva · 1 Corte Mágico · 2 Embestida · 3 Escudo · Q Poder Máximo",
  ],
  laminasTouchHelp2: [
    "Joystick anda · ATACAR, ESQUIVAR e as habilidades na direita",
    "Joystick moves · ATTACK, DODGE and the skills on the right",
    "Joystick camina · ATACAR, ESQUIVAR y las habilidades a la derecha",
  ],
}

const LOCALES = ["pt-BR", "en", "es"]
let added = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo = json.MeuMundo || {}
  for (const [key, vals] of Object.entries(FILL)) {
    if (json.MeuMundo[key] === undefined) {
      json.MeuMundo[key] = vals[i]
      added++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n skills: ${added} chaves adicionadas`)
