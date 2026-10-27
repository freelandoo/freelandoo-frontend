// Esportes — Histórico repaginado (2026-10-27): mapa de calor de 13 semanas.
// Namespace "Fitness". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-esportes-historico-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const FITNESS = {
  heatLegend: ["Calorias × meta, 13 semanas", "Calories × goal, 13 weeks", "Calorías × meta, 13 semanas"],
  heatLow: ["pouco", "low", "poco"],
  heatMid: ["metade", "half", "mitad"],
  heatOn: ["na meta", "on target", "en la meta"],
  heatOver: ["acima", "over", "por encima"],
}

const LOCALES = ["pt-BR", "en", "es"]
let added = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.Fitness = json.Fitness || {}
  for (const [key, vals] of Object.entries(FITNESS)) {
    if (json.Fitness[key] === undefined) {
      json.Fitness[key] = vals[i]
      added++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n esportes histórico: ${added} chaves adicionadas`)
