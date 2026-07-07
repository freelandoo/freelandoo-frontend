// i18n do ServiceChatModal (chat da O.S. aberto do perfil/mural): chaves novas
// no ns "Chamado" (reusa back/cancel já existentes). Idempotente e
// não-destrutivo: só ADICIONA chaves ausentes.
// Rodar com: node scripts/i18n-oschat-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const CHAMADO = {
  osChatClosed: ["Conversa encerrada", "Conversation closed", "Conversación cerrada"],
  osChatRequestCardTitle: ["Solicitação de serviço", "Service request", "Solicitud de servicio"],
  osChatProEmptyHint: [
    "Mande uma mensagem para iniciar a negociação.",
    "Send a message to start the negotiation.",
    "Envía un mensaje para iniciar la negociación.",
  ],
  osChatUserEmptyHint: ["Nenhuma mensagem ainda.", "No messages yet.", "Todavía no hay mensajes."],
  osChatLockedTitle: [
    "Alguém já respondeu a essa solicitação",
    "Someone already responded to this request",
    "Alguien ya respondió a esta solicitud",
  ],
  osChatLockedHint: [
    "Aguarde — se o usuário rejeitar a outra resposta, a O.S. fica disponível para você.",
    "Wait — if the user rejects the other response, the work order becomes available to you.",
    "Espera: si el usuario rechaza la otra respuesta, la orden queda disponible para ti.",
  ],
  osChatOpenErrorTitle: [
    "Não foi possível abrir o chat",
    "Could not open the chat",
    "No se pudo abrir el chat",
  ],
  osChatOpenErrorHttp: [
    "Erro ao abrir o chat (HTTP {status}).",
    "Error opening the chat (HTTP {status}).",
    "Error al abrir el chat (HTTP {status}).",
  ],
  osChatOpenErrorNetwork: [
    "Erro de rede ao abrir o chat.",
    "Network error opening the chat.",
    "Error de red al abrir el chat.",
  ],
  osChatReject: ["Rejeitar", "Reject", "Rechazar"],
  osChatAccept: ["Aceitar", "Accept", "Aceptar"],
  osChatAwaitingDecision: [
    "Aguarde a decisão do usuário",
    "Wait for the user's decision",
    "Espera la decisión del usuario",
  ],
  osChatInputPlaceholder: ["Digite uma mensagem...", "Type a message...", "Escribe un mensaje..."],
  osChatFinalizeError: ["Erro ao finalizar", "Error finalizing", "Error al finalizar"],
  osChatRejectError: ["Erro ao rejeitar", "Error rejecting", "Error al rechazar"],
  osChatNetworkError: ["Erro de rede", "Network error", "Error de red"],
  osChatConfirmFinalizeTitle: [
    "Aceitar este profissional?",
    "Accept this professional?",
    "¿Aceptar a este profesional?",
  ],
  osChatConfirmRejectTitle: [
    "Rejeitar este profissional?",
    "Reject this professional?",
    "¿Rechazar a este profesional?",
  ],
  osChatConfirmFinalizeDesc: [
    "Você está aceitando esse serviço. Você não receberá mais freelancers para essa O.S. e as outras conversas serão encerradas. Confirma?",
    "You are accepting this service. You will no longer receive freelancers for this work order and the other conversations will be closed. Confirm?",
    "Estás aceptando este servicio. Ya no recibirás freelancers para esta orden y las demás conversaciones se cerrarán. ¿Confirmas?",
  ],
  osChatConfirmRejectDesc: [
    "A conversa com este profissional será encerrada. Outros profissionais ainda podem responder à sua O.S.",
    "The conversation with this professional will be closed. Other professionals can still respond to your work order.",
    "La conversación con este profesional se cerrará. Otros profesionales aún pueden responder a tu orden.",
  ],
  osChatConfirm: ["Confirmar", "Confirm", "Confirmar"],
}

const LOCALES = ["pt-BR", "en", "es"]

function mergeNamespace(json, ns, keys, localeIndex) {
  if (!json[ns]) json[ns] = {}
  let added = 0
  for (const [key, values] of Object.entries(keys)) {
    if (json[ns][key] === undefined) {
      json[ns][key] = values[localeIndex]
      added++
    }
  }
  return added
}

for (let i = 0; i < LOCALES.length; i++) {
  const file = path.join(dir, `${LOCALES[i]}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  let added = 0
  added += mergeNamespace(json, "Chamado", CHAMADO, i)
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8")
  console.log(`${LOCALES[i]}: +${added} chaves`)
}
