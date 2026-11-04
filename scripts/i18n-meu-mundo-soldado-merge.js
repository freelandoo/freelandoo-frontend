// Meu Mundo 3D — o Soldado de Pedra (Arena, 3 m) e o Golem de Pedra (rua, 4 m)
// são dois monstros (Alex, 2026-11-03). OVERRIDE: laminasMobSoldier tinha virado
// "Golem de Pedra" no i18n-meu-mundo-monstros-merge.js. Idempotente.
// Rodar: node scripts/i18n-meu-mundo-soldado-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const OVERRIDE = {
  laminasMobSoldier: ["Soldado de Pedra", "Stone Soldier", "Soldado de Piedra"],
  laminasMobStoneGolem: ["Golem de Pedra", "Stone Golem", "Gólem de Piedra"],
}

const LOCALES = ["pt-BR", "en", "es"]
let changed = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo = json.MeuMundo || {}
  for (const [key, vals] of Object.entries(OVERRIDE)) {
    if (json.MeuMundo[key] !== vals[i]) {
      json.MeuMundo[key] = vals[i]
      changed++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n meu-mundo soldado: ${changed} chaves trocadas`)
