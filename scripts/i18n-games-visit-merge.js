/**
 * i18n — VISITAR O GAMES DE OUTRA PESSOA (dono de contexto).
 *
 * A plataforma de games ganhou um DONO DE CONTEXTO: o pill roxo passou a
 * existir no headcard de qualquer perfil e abre a casa (que é de todos) com o
 * recorte pessoal DAQUELA pessoa — estante, jogo atual e vitrine de posts.
 *
 * O que isso fez a tela dizer, e o motivo de cada chave:
 *
 *   • os `aria` dos pills e o TÍTULO da vitrine passam a nomear DE QUEM é o
 *     que se está vendo. Sem isso, a vitrine de outra pessoa e a sua ficam
 *     idênticas — e quem chegasse por um link leria os posts dela como seus;
 *   • os VAZIOS ganharam a variante "dela". "Você ainda não publicou nada"
 *     numa tela que é sobre outra pessoa fala do visitante, não do dono;
 *   • `backToMyGames` é a SAÍDA do contexto. Sem ela quem entra no games de
 *     alguém fica preso: o "Voltar" leva ao perfil e o pill roxo está a duas
 *     telas de distância;
 *   • `shelfEmptyOther` diz "não tem jogos para mostrar", NUNCA "a estante
 *     está privada": quem fechou a estante cai no mesmo lugar, e distinguir
 *     os dois entregaria justamente a escolha dela.
 *
 * FILL-IF-ABSENT, como todo merge da casa: rodar duas vezes não sobrescreve
 * nada e a segunda passada tem que somar 0.
 *
 *   node scripts/i18n-games-visit-merge.js
 */
const fs = require("fs")
const path = require("path")

const DIR = path.join(__dirname, "..", "messages")
const LOCALES = ["pt-BR", "en", "es"]

/** chave: [pt, en, es] */
const COMMUNITY = {
  gamePillOfAria: [
    "O jogo atual de {who}",
    "{who}'s current game",
    "El juego actual de {who}",
  ],
  gamePostsPillOfAria: [
    "Vitrine com os posts de games de {who}",
    "Showcase with {who}'s games posts",
    "Vitrina con las publicaciones de games de {who}",
  ],
  gameUntitled: ["Sem título", "Untitled", "Sin título"],
  gameEmptyOther: [
    "{who} ainda não disse o que está jogando.",
    "{who} hasn't said what they're playing yet.",
    "{who} todavía no dijo a qué está jugando.",
  ],
  backToMyGames: ["Ver o meu games", "See my games", "Ver mi games"],
  gamePostsTitleOf: ["Posts de {who}", "{who}'s posts", "Publicaciones de {who}"],
  gamePostsEmptyOther: [
    "{who} ainda não publicou nada aqui.",
    "{who} hasn't posted anything here yet.",
    "{who} todavía no publicó nada aquí.",
  ],
}

const ACCOUNT = {
  openGamesOfAria: [
    "Ver o games de {who}",
    "See {who}'s games",
    "Ver el games de {who}",
  ],
}

const GAMER = {
  shelfEmptyOther: [
    "{who} ainda não tem jogos para mostrar aqui.",
    "{who} has no games to show here yet.",
    "{who} todavía no tiene juegos para mostrar aquí.",
  ],
  thisPerson: ["Esta pessoa", "This person", "Esta persona"],
}

let added = 0
LOCALES.forEach((locale, i) => {
  const file = path.join(DIR, `${locale}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  for (const [ns, table] of [["Community", COMMUNITY], ["Account", ACCOUNT], ["Gamer", GAMER]]) {
    dict[ns] = dict[ns] || {}
    for (const [key, values] of Object.entries(table)) {
      if (dict[ns][key] === undefined) {
        dict[ns][key] = values[i]
        added += 1
      }
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
})

console.log(`i18n games visit: ${added} chave(s) adicionada(s).`)
