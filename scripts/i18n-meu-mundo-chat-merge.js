// Meu Mundo 3D — mm3d-32: chat Global e conversa com outro jogador.
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-chat-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  chTitle: ["Chat", "Chat", "Chat"],
  chGlobal: ["Global", "Global", "Global"],
  chDms: ["Conversas", "Conversations", "Conversaciones"],
  chEmpty: ["Ninguém falou ainda. Diga oi!", "Nobody has spoken yet. Say hi!", "Nadie ha hablado todavía. ¡Saluda!"],
  chGlobalPh: ["Fale com todos do Meu Mundo", "Talk to everyone in Meu Mundo", "Habla con todos en Meu Mundo"],
  chDmPh: ["Escreva uma mensagem", "Write a message", "Escribe un mensaje"],
  chSend: ["Enviar", "Send", "Enviar"],
  chYou: ["Você", "You", "Tú"],
  chReport: ["Denunciar", "Report", "Denunciar"],
  chReported: ["Denúncia enviada. Obrigado.", "Report sent. Thank you.", "Denuncia enviada. Gracias."],
  chLoading: ["Carregando…", "Loading…", "Cargando…"],
  chNoDms: ["Nenhuma conversa ainda. Toque num jogador e escolha Mensagem.", "No conversations yet. Tap a player and choose Message.", "Aún no hay conversaciones. Toca a un jugador y elige Mensaje."],
  chBack: ["Conversas", "Conversations", "Conversaciones"],
  chOpenSite: ["Abrir na Freelandoo", "Open in Freelandoo", "Abrir en Freelandoo"],
  chSelf: ["Esse é você", "That's you", "Ese eres tú"],
  chDmDeleted: ["Mensagem apagada", "Message deleted", "Mensaje eliminado"],
  chDmAudio: ["Mensagem de áudio", "Voice message", "Mensaje de audio"],
  chDmMedia: ["Mídia", "Media", "Multimedia"],
  chOffline: ["Sem conexão. Tente de novo.", "No connection. Try again.", "Sin conexión. Inténtalo de nuevo."],
  chBlocked: ["Mensagem bloqueada.", "Message blocked.", "Mensaje bloqueado."],
  chMuted: ["Você está sem falar no chat por um tempo.", "You can't talk in the chat for a while.", "No puedes hablar en el chat por un tiempo."],
  chReview: ["Sua mensagem foi para revisão.", "Your message was sent for review.", "Tu mensaje fue enviado a revisión."],
  menuChatHint: ["Global e conversas", "Global and conversations", "Global y conversaciones"],
  ibMessagesHintGame: ["Suas conversas da Freelandoo. Abrem aqui, no chat do jogo.", "Your Freelandoo conversations. They open right here, in the game chat.", "Tus conversaciones de Freelandoo. Se abren aquí, en el chat del juego."],
}

const LOCALES = ["pt-BR", "en", "es"]
let added = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo = json.MeuMundo || {}
  for (const [key, vals] of Object.entries(MEU_MUNDO)) {
    if (json.MeuMundo[key] === undefined) {
      json.MeuMundo[key] = vals[i]
      added++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n meu-mundo chat: ${added} chaves adicionadas`)
