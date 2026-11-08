// T3 (2026-11-08): o PODER do personagem no STATUS e no card de perfil.
// Fill-if-absent no namespace MeuMundo. Idempotente. node <script> [pasta]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")

const TEXT = {
  "pt-BR": {
    stPower: "PODER",
    stPowerHint: "HP×0,5 + ataque×3 + defesa×2 + (acuracidade + velocidade + inteligência)×10 + equipamento",
    pcPower: "Poder",
    pcPowerHint: "Poder do personagem",
  },
  en: {
    stPower: "POWER",
    stPowerHint: "HP×0.5 + attack×3 + defense×2 + (accuracy + speed + intelligence)×10 + equipment",
    pcPower: "Power",
    pcPowerHint: "Character power",
  },
  es: {
    stPower: "PODER",
    stPowerHint: "PV×0,5 + ataque×3 + defensa×2 + (precisión + velocidad + inteligencia)×10 + equipo",
    pcPower: "Poder",
    pcPowerHint: "Poder del personaje",
  },
}

for (const [loc, keys] of Object.entries(TEXT)) {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  dict.MeuMundo = dict.MeuMundo || {}
  let n = 0
  for (const [k, v] of Object.entries(keys)) {
    if (dict.MeuMundo[k] === undefined) {
      dict.MeuMundo[k] = v
      n++
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(loc, "+", n)
}
