// Meu Mundo 3D — barras de status da Visão Geral (2026-11-03): defesa, ataque,
// força, inteligência, destreza e velocidade de 0 a 1000. Namespace "MeuMundo".
// Idempotente (FILL preenche o que falta).
// Rodar: node scripts/i18n-meu-mundo-status-bars-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const FILL = {
  stCombatAttrs: ["Combate e atributos", "Combat and attributes", "Combate y atributos"],
  stStatScale: ["De 0 a {max}", "From 0 to {max}", "De 0 a {max}"],
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
console.log(`i18n status bars: ${added} chaves adicionadas`)
