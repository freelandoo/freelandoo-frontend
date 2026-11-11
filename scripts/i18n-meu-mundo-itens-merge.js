// Meu Mundo 3D — trilha E (itens, equipamentos e equidade). Namespace "MeuMundo".
// Idempotente, fill-if-absent (mudar valor = OVERRIDE abaixo).
// Rodar: node scripts/i18n-meu-mundo-itens-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  // E1
  rarityMythic: ["Mítico", "Mythic", "Mítico"],
  forgeOffhands: ["Mão secundária", "Off-hand", "Mano secundaria"],
  forgeRelics: ["Relíquias", "Relics", "Reliquias"],
  forgeFragments: ["Fragmentos", "Fragments", "Fragmentos"],
  forgeRunes: ["Runas", "Runes", "Runas"],
  forgeConsumables: ["Consumíveis", "Consumables", "Consumibles"],
  forgeCurrency: ["Fichas", "Tokens", "Fichas"],
}
const OVERRIDE = {}

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
  for (const [key, vals] of Object.entries(OVERRIDE)) {
    if (json.MeuMundo[key] !== vals[i]) {
      json.MeuMundo[key] = vals[i]
      added++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n meu-mundo itens: ${added} chaves adicionadas/atualizadas`)
