// Meu Mundo 3D — lore v2 N1: a aba SEMANA do Ranking (placar semanal de cada jogável).
// Namespace "MeuMundo". Idempotente: chave nova entra; valor que mudou é ATUALIZADO
// (OVERRIDE), para o fallback da tela e as traduções nunca divergirem.
// Rodar: node scripts/i18n-meu-mundo-placar-merge.js
const fs = require("fs")
const path = require("path")

const TEXT = {
  rkTabSemana: ["Semana", "Week", "Semana"],
  rkGameJetpack: ["Jetpack", "Jetpack", "Jetpack"],
  rkGameNoturno: ["Rolê Noturno", "Night Ride", "Paseo Nocturno"],
  rkGameCorrida: ["Antigravidade", "Antigravity", "Antigravedad"],
  rkGameGincana: ["Gincana", "Scavenger Race", "Gincana"],
  rkGamePaint: ["Paint", "Paint", "Paint"],
  rkGameLaminas: ["Lâminas", "Blades", "Hojas"],
  rkGameBoxe: ["Boxe", "Boxing", "Boxeo"],
  rkGameHall: ["Hall", "Hall", "Hall"],
  rkGamePoder: ["Poder", "Power", "Poder"],
  rkWkGames: ["Jogos", "Games", "Juegos"],
  rkWkWhich: ["Semana", "Week", "Semana"],
  rkWkNow: ["Esta semana", "This week", "Esta semana"],
  rkWkPast: ["Semana passada", "Last week", "Semana pasada"],
  rkWkHintPts: ["Vale a sua melhor pontuação numa partida da semana.", "Your best score in a single match this week counts.", "Cuenta tu mejor puntuación en una partida de la semana."],
  rkWkHintTime: ["Vale o seu melhor tempo da semana. Só conta quem chega.", "Your best time this week counts. Only finishers count.", "Cuenta tu mejor tiempo de la semana. Solo cuenta quien llega."],
  rkWkHintPaint: ["Vale o maior dano que você causou numa partida da semana.", "The most damage you dealt in a single match this week counts.", "Cuenta el mayor daño que causaste en una partida de la semana."],
  rkWkHintWins: ["Vale quantas lutas você venceu na semana.", "The number of fights you won this week counts.", "Cuenta cuántas peleas ganaste en la semana."],
  rkWkHintPoder: ["O seu Poder de agora: não zera com a semana.", "Your Power right now: it doesn't reset with the week.", "Tu Poder de ahora: no se reinicia con la semana."],
  rkWkCloses: ["Fecha {when} (Brasília).", "Closes {when} (Brasília time).", "Cierra {when} (hora de Brasilia)."],
  rkWkClosed: ["Semana encerrada.", "Week closed.", "Semana cerrada."],
  rkWkEmpty: ["Ninguém jogou esta semana ainda. Quem jogar primeiro já começa na frente.", "Nobody has played this week yet. Whoever plays first starts in the lead.", "Nadie jugó esta semana todavía. Quien juegue primero ya empieza adelante."],
  rkWkMeNone: ["Você ainda não pontuou neste jogo nesta semana.", "You haven't scored in this game this week yet.", "Todavía no puntuaste en este juego esta semana."],
  rkUnitTime: ["tempo", "time", "tiempo"],
  rkUnitWins: ["vitórias", "wins", "victorias"],
  rkUnitDmg: ["de dano", "damage", "de daño"],
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
console.log(`i18n meu-mundo placar: ${changed} chaves gravadas`)
