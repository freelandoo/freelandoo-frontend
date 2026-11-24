// Meu Mundo 3D — o COLISEU (2026-11-24): o prédio do Boxe vira o Coliseu, com luta direta entre
// duas pessoas na porta ("Lutar" em cima da outra, sem aceite). Namespace "MeuMundo".
// Idempotente: OVERRIDE nos nomes que mudam (centerPlace_boxe, bm_pr_boxe_what — este também em
// features/meu-mundo/ui/buildings/buildings-text.json), fill-if-absent nos textos novos.
// Rodar: node scripts/i18n-meu-mundo-coliseu-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

/** Valores que JÁ EXISTEM e mudam (o nome do prédio). */
const OVERRIDE = {
  centerPlace_boxe: ["Coliseu", "Colosseum", "Coliseo"],
  bm_pr_boxe_what: ["Lute uma vez no Coliseu.", "Fight once in the Colosseum.", "Pelea una vez en el Coliseo."],
}

/** Textos novos. */
const NEW = {
  coliseuFoe: ["Adversário", "Opponent", "Rival"],
  coliseuFar: ["Cheguem mais perto do Coliseu para lutar.", "Get closer to the Colosseum to fight.", "Acérquense al Coliseo para pelear."],
  coliseuPair: ["Chegue mais perto da pessoa para lutar.", "Get closer to the person to fight.", "Acércate a la persona para pelear."],
  coliseuBusy: ["Essa pessoa está ocupada agora.", "That person is busy right now.", "Esa persona está ocupada ahora."],
  coliseuDriving: ["Desça do veículo para lutar.", "Get off the vehicle to fight.", "Bájate del vehículo para pelear."],
  coliseuWin: ["Você venceu {name} no Coliseu.", "You beat {name} in the Colosseum.", "Venciste a {name} en el Coliseo."],
  coliseuLose: ["{name} venceu no Coliseu.", "{name} won in the Colosseum.", "{name} ganó en el Coliseo."],
  coliseuNoPrize: ["Luta entre jogadores: sem prêmio por enquanto.", "Player fight: no prize for now.", "Pelea entre jugadores: sin premio por ahora."],
  coliseuGone: ["Essa pessoa saiu daqui.", "That person has left.", "Esa persona se fue."],
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
  for (const [key, vals] of Object.entries(NEW)) {
    if (json.MeuMundo[key] === undefined) {
      json.MeuMundo[key] = vals[i]
      changed++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n Coliseu: ${changed} chaves gravadas`)
