// Meu Mundo 3D — monstros da Arena das Lâminas com os modelos do Alex (29/10):
// Soldado de Pedra → Golem de Pedra, Golem de Sucata → Ciborgue, Harpia → Dama
// das Garras. OVERRIDE (o dicionário vence o fallback inline): estas chaves já
// existiam com os nomes antigos. Idempotente.
// Rodar: node scripts/i18n-meu-mundo-monstros-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const OVERRIDE = {
  laminasMobSoldier: ["Golem de Pedra", "Stone Golem", "Gólem de Piedra"],
  laminasMobGolem: ["Ciborgue", "Cyborg", "Cíborg"],
  laminasMobHarpy: ["Dama das Garras", "Lady of Claws", "Dama de las Garras"],
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
console.log(`i18n meu-mundo monstros: ${changed} chaves trocadas`)
