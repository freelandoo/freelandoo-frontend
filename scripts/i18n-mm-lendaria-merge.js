// legend-v1 (24/11/2026, Alex): Lendária só de monstro nível 27+ e dos Domínios; nos minijogos só o 1º lugar da
// semana no ranking (partidas com 2+ jogadores) ganha. Ranking dentro da tela de fases e o aviso do sino.
// Fill-if-absent no namespace MeuMundo. Idempotente. node <script> [pasta]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const KEYS = {
  "pt-BR": {
    rkPrizeTitle: "1º lugar da semana ganha uma Lendária",
    rkPrizeLegend: "{n} fragmentos de classe Lendária: monte a arma Lendária que quiser na Forja.",
    rkPrizeBastor: "E mais {n} fragmentos de cada peça do conjunto dos Moldes (Bastor).",
    rkPrizeMulti: "Só contam partidas com {n} ou mais jogadores. O prêmio cai na virada da semana (domingo).",
    rkPrizeFrom: "Vale a partir da semana de {d}.",
    rkPrizeBadge: "Lendária",
    stageRanking: "Ranking da semana",
    stageRankingShort: "Ranking",
    ntLegendWeek: "1º lugar da semana no {game}! Você ganhou uma Lendária.",
    ntLegendWeekLine: "Os fragmentos de classe Lendária estão na mochila: monte a sua arma na Forja.",
  },
  en: {
    rkPrizeTitle: "Weekly 1st place wins a Legendary",
    rkPrizeLegend: "{n} Legendary class fragments: build any Legendary weapon you want at the Forge.",
    rkPrizeBastor: "Plus {n} fragments of each piece of the Molds set (Bastor).",
    rkPrizeMulti: "Only matches with {n} or more players count. The prize lands when the week turns (Sunday).",
    rkPrizeFrom: "Starts with the week of {d}.",
    rkPrizeBadge: "Legendary",
    stageRanking: "Weekly ranking",
    stageRankingShort: "Ranking",
    ntLegendWeek: "1st place of the week in {game}! You won a Legendary.",
    ntLegendWeekLine: "The Legendary class fragments are in your backpack: build your weapon at the Forge.",
  },
  es: {
    rkPrizeTitle: "El 1.er lugar de la semana gana una Legendaria",
    rkPrizeLegend: "{n} fragmentos de clase Legendaria: arma en la Forja la Legendaria que quieras.",
    rkPrizeBastor: "Y además {n} fragmentos de cada pieza del conjunto de los Moldes (Bastor).",
    rkPrizeMulti: "Solo cuentan partidas con {n} o más jugadores. El premio llega al cambiar la semana (domingo).",
    rkPrizeFrom: "Vale a partir de la semana del {d}.",
    rkPrizeBadge: "Legendaria",
    stageRanking: "Ranking semanal",
    stageRankingShort: "Ranking",
    ntLegendWeek: "¡1.er lugar de la semana en {game}! Ganaste una Legendaria.",
    ntLegendWeekLine: "Los fragmentos de clase Legendaria están en tu mochila: arma tu arma en la Forja.",
  },
}
for (const [loc, keys] of Object.entries(KEYS)) {
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
  console.log(loc, "lendária +", n)
}
