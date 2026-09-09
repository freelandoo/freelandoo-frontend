/**
 * i18n — GAMES vira UMA plataforma, e o que é da pessoa sai dela (mig 232).
 *
 * O ambiente deixou de ser o espaço de cada um: o FEED é de todos, e o JOGO
 * ATUAL, a ESTANTE e os POSTS passaram a ser do perfil de quem olha. As chaves
 * abaixo são o que essa mudança fez a tela dizer:
 *
 *   • o painel do jogo agora tem SALVAR próprio (o "Salvar" de cima é do
 *     administrador da plataforma, e um usuário comum nem o enxerga);
 *   • existe um estado NOVO — "não estou logado" —, que antes não podia
 *     acontecer porque só o dono do espaço via aquele painel. Ele é diferente
 *     de "ainda não escolhi": dizer "você não publicou nada" a quem a tela não
 *     conhece seria afirmar algo que ninguém mediu;
 *   • os `aria` dos dois pills dizem DE QUEM é o que eles abrem.
 *
 * FICAM ÓRFÃS de propósito (padrão da casa — não apagar do dicionário):
 * `gameSaveHint` (prometia o Salvar de cima), `gameNotSetRead` (a leitura do
 * jogo alheio, que não existe mais), `gamePillAria`/`gamePostsPillAria` e
 * `Account.openGamesAria` (falavam da "comunidade dos meus games").
 *
 * FILL-IF-ABSENT, como todo merge da casa: rodar duas vezes não sobrescreve
 * nada e a segunda passada tem que somar 0.
 *
 *   node scripts/i18n-games-platform-singleton-merge.js
 */
const fs = require("fs")
const path = require("path")

const DIR = path.join(__dirname, "..", "messages")
const LOCALES = ["pt-BR", "en", "es"]

/** chave: [pt, en, es] */
const COMMUNITY = {
  gameSave: ["Salvar meu jogo", "Save my game", "Guardar mi juego"],
  gameSaved: ["Jogo atualizado.", "Game updated.", "Juego actualizado."],
  gameSignedOut: [
    "Entre na sua conta para dizer o que você está jogando.",
    "Sign in to tell everyone what you are playing.",
    "Inicia sesión para contar a qué estás jugando.",
  ],
  myGamePillAria: [
    "O seu jogo atual: plataforma, título e nick",
    "Your current game: platform, title and handle",
    "Tu juego actual: plataforma, título y nick",
  ],
  myGamePostsPillAria: [
    "Vitrine com os seus posts de games",
    "Showcase with your games posts",
    "Vitrina con tus publicaciones de games",
  ],
  gamePostsEmptyMine: [
    "Você ainda não publicou nada aqui.",
    "You haven't posted anything here yet.",
    "Todavía no has publicado nada aquí.",
  ],
  gamePostsSignedOut: [
    "Entre na sua conta para ver os seus posts de games.",
    "Sign in to see your games posts.",
    "Inicia sesión para ver tus publicaciones de games.",
  ],
}

/**
 * A estante deixou de ter "dono do espaço": ela é de quem olha. O vazio de quem
 * NÃO entrou é um estado novo — e diz outra coisa que "nenhum jogo por aqui":
 * não é que a estante esteja vazia, é que a tela não sabe de quem ela seria.
 *
 * FICA ÓRFÃ: `shelfLocked` ("esta pessoa não deixa a estante à mostra"), que
 * era a recusa ao ver a estante de terceiro — caminho removido com a mig 232.
 */
const GAMER = {
  shelfSignedOut: [
    "Entre na sua conta para ver e conectar a sua estante.",
    "Sign in to see and connect your shelf.",
    "Inicia sesión para ver y conectar tu estantería.",
  ],
}

const ACCOUNT = {
  openGamesPlatformAria: [
    "Abrir a plataforma de games",
    "Open the games platform",
    "Abrir la plataforma de games",
  ],
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

console.log(`i18n games platform singleton: ${added} chave(s) adicionada(s).`)
