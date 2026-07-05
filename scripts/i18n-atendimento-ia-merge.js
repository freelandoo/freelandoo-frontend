// Namespace "AtendimentoIa" — venda do bot de atendimento (planos, uso do ciclo,
// controles) + botão no headcard do /account (ns Account). Idempotente e
// não-destrutivo: só ADICIONA chaves ausentes. Rodar:
//   node scripts/i18n-atendimento-ia-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const AT = {
  pageTitle: ["Atendimento IA", "AI Assistant", "Atención IA"],
  pageSubtitle: [
    "Um bot que responde suas conversas sabendo seus perfis, serviços e preços — 24h por dia.",
    "A bot that answers your conversations knowing your profiles, services and prices — 24/7.",
    "Un bot que responde tus conversaciones conociendo tus perfiles, servicios y precios — 24/7.",
  ],
  backToAccount: ["Minha conta", "My account", "Mi cuenta"],
  loginRequired: ["Entre na sua conta para contratar o bot.", "Sign in to hire the bot.", "Inicia sesión para contratar el bot."],
  loginCta: ["Entrar", "Sign in", "Entrar"],
  loadError: ["Não foi possível carregar. Tente de novo.", "Could not load. Try again.", "No se pudo cargar. Inténtalo de nuevo."],
  retry: ["Tentar de novo", "Try again", "Intentar de nuevo"],
  howTitle: ["Como funciona", "How it works", "Cómo funciona"],
  how1: [
    "O bot lê seus perfis, subperfis, serviços, produtos, cursos e preços e monta a própria base de conhecimento (atualizada todo dia).",
    "The bot reads your profiles, subprofiles, services, products, courses and prices and builds its own knowledge base (refreshed daily).",
    "El bot lee tus perfiles, subperfiles, servicios, productos, cursos y precios y arma su propia base de conocimiento (actualizada a diario).",
  ],
  how2: [
    "Responde suas conversas diretas e chats de O.S. em segundos, com os valores certos.",
    "Answers your direct messages and work-order chats in seconds, with the right prices.",
    "Responde tus mensajes directos y chats de órdenes de servicio en segundos, con los precios correctos.",
  ],
  how3: [
    "Nunca inicia conversa — só responde quem falou com você. Você pausa quando quiser.",
    "It never starts a conversation — it only replies to people who messaged you. Pause anytime.",
    "Nunca inicia una conversación — solo responde a quien te escribió. Pausa cuando quieras.",
  ],
  how4: [
    "Cada plano tem uma cota mensal de uso. Bateu a cota, o bot pausa até o próximo ciclo.",
    "Each plan has a monthly usage quota. When it's reached, the bot pauses until the next cycle.",
    "Cada plan tiene una cuota mensual de uso. Al alcanzarla, el bot se pausa hasta el próximo ciclo.",
  ],
  plansTitle: ["Planos", "Plans", "Planes"],
  salesOff: ["A contratação está temporariamente indisponível.", "Sign-ups are temporarily unavailable.", "La contratación está temporalmente indisponible."],
  noPlans: ["Nenhum plano disponível no momento.", "No plans available right now.", "No hay planes disponibles por ahora."],
  perMonthShort: ["mês", "mo", "mes"],
  tokensPerMonth: ["tokens/mês", "tokens/mo", "tokens/mes"],
  tokensWord: ["tokens", "tokens", "tokens"],
  subscribeCta: ["Assinar", "Subscribe", "Suscribirse"],
  pendingHint: [
    "Você tem um pagamento em aberto — assine de novo para gerar um novo link.",
    "You have an open payment — subscribe again to generate a new link.",
    "Tienes un pago pendiente — suscríbete de nuevo para generar un nuevo enlace.",
  ],
  checkoutSuccess: ["Pagamento confirmado! Estamos ativando seu bot…", "Payment confirmed! We're activating your bot…", "¡Pago confirmado! Estamos activando tu bot…"],
  checkoutCanceled: ["Assinatura cancelada — você não foi cobrado.", "Subscription canceled — you were not charged.", "Suscripción cancelada — no se te cobró."],
  checkoutError: ["Não foi possível iniciar a assinatura.", "Could not start the subscription.", "No se pudo iniciar la suscripción."],
  pastDueBanner: [
    "Pagamento pendente — atualize o cartão para o bot continuar no próximo ciclo.",
    "Payment past due — update your card so the bot keeps running next cycle.",
    "Pago pendiente — actualiza la tarjeta para que el bot siga en el próximo ciclo.",
  ],
  activatingTitle: ["Ativando seu bot…", "Activating your bot…", "Activando tu bot…"],
  activatingText: [
    "Estamos conectando o bot à sua conta e montando a base de conhecimento. Isso leva menos de um minuto.",
    "We're connecting the bot to your account and building the knowledge base. It takes less than a minute.",
    "Estamos conectando el bot a tu cuenta y armando la base de conocimiento. Tarda menos de un minuto.",
  ],
  usageTitle: ["Uso do ciclo", "Cycle usage", "Uso del ciclo"],
  planWord: ["Plano", "Plan", "Plan"],
  resetsAt: ["Renova em", "Renews on", "Se renueva el"],
  limitHit: [
    "Cota do ciclo atingida — o bot está pausado até a renovação. Precisa de mais? Cancele e assine um plano maior.",
    "Cycle quota reached — the bot is paused until renewal. Need more? Cancel and subscribe to a bigger plan.",
    "Cuota del ciclo alcanzada — el bot está pausado hasta la renovación. ¿Necesitas más? Cancela y suscríbete a un plan mayor.",
  ],
  usageUnavailable: ["Medidor indisponível no momento — tente recarregar.", "Meter unavailable right now — try reloading.", "Medidor no disponible por ahora — intenta recargar."],
  controlsTitle: ["Controles do bot", "Bot controls", "Controles del bot"],
  pause: ["Pausar bot", "Pause bot", "Pausar bot"],
  resume: ["Retomar bot", "Resume bot", "Reanudar bot"],
  pausedHint: [
    "Pausado: o bot não responde ninguém até você retomar. A cobrança continua.",
    "Paused: the bot won't reply to anyone until you resume. Billing continues.",
    "Pausado: el bot no responde a nadie hasta que lo reanudes. El cobro continúa.",
  ],
  answerDm: ["Responder diretas", "Answer DMs", "Responder directos"],
  answerOs: ["Responder O.S.", "Answer work orders", "Responder órdenes"],
  refresh: ["Atualizar", "Refresh", "Actualizar"],
  instructionsLabel: ["Instruções extras pro bot (opcional)", "Extra instructions for the bot (optional)", "Instrucciones extra para el bot (opcional)"],
  instructionsPlaceholder: [
    "Ex.: sempre ofereça o combo de social media; não prometo entrega em menos de 5 dias úteis…",
    "E.g.: always offer the social media combo; I don't promise delivery in less than 5 business days…",
    "Ej.: siempre ofrece el combo de social media; no prometo entrega en menos de 5 días hábiles…",
  ],
  saveInstructions: ["Salvar", "Save", "Guardar"],
  configSaved: ["Configuração salva.", "Settings saved.", "Configuración guardada."],
  saveError: ["Não foi possível salvar.", "Could not save.", "No se pudo guardar."],
  changePlanHint: [
    "Quer trocar de plano? Cancele e assine o novo (sem devolução proporcional do mês em curso).",
    "Want to change plans? Cancel and subscribe to the new one (no pro-rated refund for the current month).",
    "¿Quieres cambiar de plan? Cancela y suscríbete al nuevo (sin devolución proporcional del mes en curso).",
  ],
  cancelCta: ["Cancelar Atendimento IA", "Cancel AI Assistant", "Cancelar Atención IA"],
  cancelConfirm: [
    "Cancelar o Atendimento IA? O bot para de responder na hora e o mês já pago não é estornado.",
    "Cancel the AI Assistant? The bot stops replying immediately and the month already paid is not refunded.",
    "¿Cancelar la Atención IA? El bot deja de responder de inmediato y el mes ya pagado no se reembolsa.",
  ],
  cancelDone: ["Assinatura cancelada. O bot foi desligado.", "Subscription canceled. The bot was turned off.", "Suscripción cancelada. El bot fue apagado."],
  cancelError: ["Não foi possível cancelar.", "Could not cancel.", "No se pudo cancelar."],
}

// Botão no headcard do /account (reusa o vocabulário do ns Account).
const ACCOUNT = {
  atendimentoIa: ["Atendimento IA", "AI Assistant", "Atención IA"],
  atendimentoIaAria: [
    "Atendimento IA: bot que responde suas conversas",
    "AI Assistant: a bot that answers your conversations",
    "Atención IA: bot que responde tus conversaciones",
  ],
}

function load(f) { return JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) }
function save(f, o) { fs.writeFileSync(path.join(dir, f), JSON.stringify(o, null, 2) + "\n", "utf8") }
for (const [file, idx] of [["pt-BR.json", 0], ["en.json", 1], ["es.json", 2]]) {
  const d = load(file)
  if (!d.AtendimentoIa) d.AtendimentoIa = {}
  if (!d.Account) d.Account = {}
  let added = 0
  for (const [k, vals] of Object.entries(AT)) if (!(k in d.AtendimentoIa)) { d.AtendimentoIa[k] = vals[idx]; added++ }
  for (const [k, vals] of Object.entries(ACCOUNT)) if (!(k in d.Account)) { d.Account[k] = vals[idx]; added++ }
  save(file, d)
  console.log(`${file}: +${added} chaves`)
}
