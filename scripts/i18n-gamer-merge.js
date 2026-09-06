// Perfil gamer — estante, conexão de plataforma e frente a frente (mig 220).
//
// Fill-if-absent e idempotente: chave que já existe no dicionário não é tocada.
// Rodar: node scripts/i18n-gamer-merge.js
//
// Namespace novo `Gamer` (a aba é uma superfície própria) + a chave da aba, que
// mora em `Community` porque é lá que a barra de abas vive.
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

// ns -> chave -> [pt, en, es]
const KEYS = {
  Community: {
    tabShelf: ["Estante", "Shelf", "Estante"],
  },
  Gamer: {
    // Contas
    connectCta: ["Conectar {platform}", "Connect {platform}", "Conectar {platform}"],
    connectHint: [
      "Traz seus jogos, horas e conquistas automaticamente",
      "Brings your games, hours and achievements automatically",
      "Trae tus juegos, horas y logros automáticamente",
    ],
    connectFail: [
      "Não deu para começar a conexão.",
      "Could not start the connection.",
      "No se pudo iniciar la conexión.",
    ],
    actionFail: ["Não deu certo.", "That did not work.", "No funcionó."],
    noHandle: ["conta conectada", "connected account", "cuenta conectada"],
    syncNow: ["Atualizar", "Refresh", "Actualizar"],
    visPublic: ["Visível", "Visible", "Visible"],
    visPrivate: ["Só eu", "Only me", "Solo yo"],
    disconnect: ["Desconectar", "Disconnect", "Desconectar"],
    disconnectConfirm: [
      "Desconectar apaga os jogos que vieram desta plataforma. Continuar?",
      "Disconnecting deletes the games that came from this platform. Continue?",
      "Desconectar borra los juegos que vinieron de esta plataforma. ¿Continuar?",
    ],
    statusOk: ["Sincronizada", "Synced", "Sincronizada"],
    statusError: ["A última leitura falhou", "The last read failed", "La última lectura falló"],
    // A conta fechada na plataforma NÃO é erro — e a instrução tem que dizer
    // exatamente onde mudar, senão o estado vira um beco.
    statusPrivate: [
      "Sua conta está fechada na plataforma",
      "Your account is private on the platform",
      "Tu cuenta está cerrada en la plataforma",
    ],
    privateHelp: [
      'Na Steam, abra Perfil → Editar perfil → Configurações de privacidade e deixe "Detalhes do jogo" como Público. Depois toque em Atualizar aqui.',
      'On Steam, open Profile → Edit profile → Privacy settings and set "Game details" to Public. Then tap Refresh here.',
      'En Steam, abre Perfil → Editar perfil → Configuración de privacidad y deja "Detalles del juego" como Público. Luego toca Actualizar aquí.',
    ],
    noProviders: [
      "Nenhuma plataforma disponível por aqui ainda.",
      "No platform available here yet.",
      "Ninguna plataforma disponible por aquí todavía.",
    ],
    // A chamada da aba vazia. Sem ela, quem chega sem nada conectado lê duas
    // caixas cinzas e conclui que a página quebrou.
    introTitle: ["Sua estante", "Your shelf", "Tu estante"],
    intro: [
      "Conecte uma plataforma e seus jogos, horas e conquistas entram aqui sozinhos, sem cadastrar nada na mão. Depois é só digitar o @ de alguém para ver o que vocês jogam em comum.",
      "Connect a platform and your games, hours and achievements land here on their own, with nothing to fill in by hand. Then just type someone's @ to see what you both play.",
      "Conecta una plataforma y tus juegos, horas y logros entran aquí solos, sin cargar nada a mano. Después solo escribe el @ de alguien para ver qué juegan en común.",
    ],
    // Estado de cada plataforma na grade. Elas aparecem TODAS, sempre: a que
    // não dá para conectar entra apagada e com o motivo escrito.
    statusPlanned: ["Em breve", "Coming soon", "Pronto"],
    statusUnconfigured: ["Desligada", "Off", "Apagada"],
    statusUnavailable: ["Não dá", "Not possible", "No se puede"],
    steamUnconfigured: [
      "Ainda não ligada nesta instalação",
      "Not switched on in this install yet",
      "Todavía no activada en esta instalación",
    ],
    xboxReason: [
      "A API aberta é paga e não informa horas jogadas",
      "The open API is paid and does not report played hours",
      "La API abierta es de pago y no informa horas jugadas",
    ],
    playstationReason: [
      "A Sony não abre uma API pública",
      "Sony does not open a public API",
      "Sony no abre una API pública",
    ],
    nintendoReason: [
      "A Nintendo não abre uma API pública",
      "Nintendo does not open a public API",
      "Nintendo no abre una API pública",
    ],
    // Estante
    shelfLocked: [
      "Esta pessoa não deixa a estante à mostra.",
      "This person keeps their shelf private.",
      "Esta persona no muestra su estante.",
    ],
    shelfEmpty: ["Nenhum jogo por aqui ainda.", "No games here yet.", "Ningún juego por aquí todavía."],
    shelfEmptyOwn: [
      "Conecte uma plataforma e seus jogos aparecem aqui.",
      "Connect a platform and your games show up here.",
      "Conecta una plataforma y tus juegos aparecen aquí.",
    ],
    gameOne: ["jogo", "game", "juego"],
    gameMany: ["jogos", "games", "juegos"],
    searchGames: ["Procurar jogo", "Search game", "Buscar juego"],
    // Conquista NÃO é campanha: o rótulo diz o que o número é.
    achievements: ["conquistas", "achievements", "logros"],
    // Frente a frente
    compareTitle: ["Frente a frente", "Head to head", "Frente a frente"],
    compareHint: [
      "Digite o @ de alguém e veja o que vocês jogam em comum.",
      "Type someone's @ and see what you both play.",
      "Escribe el @ de alguien y mira qué juegan en común.",
    ],
    compareCta: ["Comparar", "Compare", "Comparar"],
    compareFail: ["Não achei esse perfil.", "I could not find that profile.", "No encontré ese perfil."],
    compareLocked: [
      "Esta pessoa não deixa a estante à mostra.",
      "This person keeps their shelf private.",
      "Esta persona no muestra su estante.",
    ],
    compareNone: [
      "Vocês não têm nenhum jogo em comum ainda.",
      "You two do not share any game yet.",
      "Ustedes no tienen ningún juego en común todavía.",
    ],
    compareSummary: [
      "{n} em comum · você jogou mais em {mine}, {who} em {theirs}",
      "{n} in common · you played more in {mine}, {who} in {theirs}",
      "{n} en común · jugaste más en {mine}, {who} en {theirs}",
    ],
    compareYou: ["Você", "You", "Tú"],
  },
}

for (const [file, idx] of [["pt-BR.json", 0], ["en.json", 1], ["es.json", 2]]) {
  const p = path.join(dir, file)
  const d = JSON.parse(fs.readFileSync(p, "utf8"))
  let added = 0
  for (const [ns, group] of Object.entries(KEYS)) {
    if (!d[ns]) d[ns] = {}
    for (const [k, vals] of Object.entries(group)) {
      if (d[ns][k] === undefined) {
        d[ns][k] = vals[idx]
        added++
      }
    }
  }
  fs.writeFileSync(p, JSON.stringify(d, null, 2) + "\n", "utf8")
  console.log(`${file}: +${added} chave(s)`)
}
