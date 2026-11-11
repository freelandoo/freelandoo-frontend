// Meu Mundo 3D — lore v2 N2: o néctar da semana (carteira na aba Semana do Ranking e o aviso no sino).
// Namespace "MeuMundo". Idempotente: chave nova entra; valor que mudou é ATUALIZADO
// (OVERRIDE), para o fallback da tela e as traduções nunca divergirem.
// Rodar: node scripts/i18n-meu-mundo-nectar-merge.js
const fs = require("fs")
const path = require("path")

const TEXT = {
  rkNcTitle: ["Néctar para entregar", "Nectar to deliver", "Néctar para entregar"],
  rkNcLast: ["A semana passada rendeu {n}.", "Last week earned you {n}.", "La semana pasada te dio {n}."],
  rkNcHow: [
    "Cada semana, a sua posição em cada jogo vira néctar. Os jogos somam.",
    "Every week, your place in each game turns into nectar. Games add up.",
    "Cada semana, tu posición en cada juego se convierte en néctar. Los juegos se suman.",
  ],
  rkNcLastList: ["O que cada jogo rendeu", "What each game earned", "Lo que dio cada juego"],
  rkNcPos: ["{n}º", "#{n}", "{n}º"],
  rkNcTable: ["Quanto vale cada posição", "What each place is worth", "Cuánto vale cada posición"],
  rkNcOutside: ["Fora do top 10", "Outside the top 10", "Fuera del top 10"],
  rkNcRules: [
    "Em cada jogo vale só a posição; entre os jogos, os litros somam. Empate: quem fez primeiro. A semana fecha sábado 23:59 (Brasília) e o néctar cai aqui.",
    "In each game only your place counts; across games, the liters add up. Ties go to whoever got there first. The week closes Saturday 11:59 PM (Brasília time) and the nectar lands here.",
    "En cada juego solo cuenta la posición; entre juegos, los litros se suman. Empate: quien lo hizo primero. La semana cierra el sábado 23:59 (hora de Brasilia) y el néctar cae aquí.",
  ],
  ntNectarWeek: ["Sua semana rendeu {n} L de néctar!", "Your week earned {n} L of nectar!", "¡Tu semana te dio {n} L de néctar!"],
  ntNectarWeekLine: [
    "Está guardado para entregar na estátua. Veja no Ranking → Semana.",
    "It's saved for you to deliver at the statue. See Ranking → Week.",
    "Está guardado para entregar en la estatua. Míralo en Ranking → Semana.",
  ],
}

const dir = path.join(__dirname, "..", "messages")
const LOCALES = ["pt-BR", "en", "es"]
let changed = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo = json.MeuMundo || {}
  for (const [key, vals] of Object.entries(TEXT)) {
    if (!Array.isArray(vals) || vals.length !== 3) throw new Error(`chave ${key}: precisa de [pt, en, es]`)
    if (json.MeuMundo[key] !== vals[i]) {
      json.MeuMundo[key] = vals[i]
      changed++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n meu-mundo néctar: ${changed} chaves gravadas`)
