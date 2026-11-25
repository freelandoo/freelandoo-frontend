// 25/11/2026 (Alex): o 1º lugar da semana dos minijogos leva 10 fragmentos Lendários (não 180). OVERRIDE dos textos
// do prêmio no namespace MeuMundo. Idempotente. node <script> [pasta]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const KEYS = {
  "pt-BR": {
    rkPrizeTitle: "1º lugar da semana ganha fragmentos Lendários",
    rkPrizeLegend: "{n} fragmentos de classe Lendária. Juntando 180, você monta a arma Lendária que quiser na Forja.",
    ntLegendWeek: "1º lugar da semana no {game}! Você ganhou {n} fragmentos Lendários.",
    ntLegendWeekLine: "Estão na mochila. Juntando 180, você monta uma arma Lendária na Forja.",
  },
  en: {
    rkPrizeTitle: "Weekly 1st place wins Legendary fragments",
    rkPrizeLegend: "{n} Legendary class fragments. Collect 180 to build any Legendary weapon you want at the Forge.",
    ntLegendWeek: "1st place of the week in {game}! You won {n} Legendary fragments.",
    ntLegendWeekLine: "They are in your backpack. Collect 180 to build a Legendary weapon at the Forge.",
  },
  es: {
    rkPrizeTitle: "El 1.er lugar de la semana gana fragmentos Legendarios",
    rkPrizeLegend: "{n} fragmentos de clase Legendaria. Juntando 180, armas en la Forja la Legendaria que quieras.",
    ntLegendWeek: "¡1.er lugar de la semana en {game}! Ganaste {n} fragmentos Legendarios.",
    ntLegendWeekLine: "Están en tu mochila. Juntando 180, armas una Legendaria en la Forja.",
  },
}
for (const [loc, keys] of Object.entries(KEYS)) {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  dict.MeuMundo = dict.MeuMundo || {}
  let n = 0
  for (const [k, v] of Object.entries(keys)) {
    if (dict.MeuMundo[k] !== v) {
      dict.MeuMundo[k] = v
      n++
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(loc, "lendária 10 →", n)
}
