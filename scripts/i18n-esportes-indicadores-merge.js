// Esportes — indicadores repaginados em bento (2026-10-27): o herói de
// consistência. Namespace "Fitness". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-esportes-indicadores-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const FITNESS = {
  indStreakDays: ["dias seguidos", "days in a row", "días seguidos"],
  indLast14: ["Últimos 14 dias", "Last 14 days", "Últimos 14 días"],
  indWorkoutsWeek: ["Treinos na semana", "Workouts this week", "Entrenos en la semana"],
  indWorkouts30: ["{n} no mês", "{n} this month", "{n} en el mes"],
  indSeeCalendar: ["Ver calendário →", "See calendar →", "Ver calendario →"],
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
console.log(`i18n esportes indicadores: ${added} chaves adicionadas`)
