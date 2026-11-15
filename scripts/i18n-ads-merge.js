// Freelandoo Ads — "Impulsionar" (mig 461 do back), 2026-11-15.
// Namespace "Ads" (+ Feed.fxAds, Post.reachBoost). Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-ads-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const ADS = {
  back: ["Voltar", "Back", "Volver"],
  bannerLive: ["No ar!", "Live!", "¡Al aire!"],
  bannerLiveText: ["Seu post já está entrando no feed das pessoas da área.", "Your post is already reaching feeds in the area.", "Tu post ya está entrando en el feed de la gente de la zona."],
  bannerPaid: ["Pagamento recebido", "Payment received", "Pago recibido"],
  bannerPaidText: ["Assim que o Mercado Pago confirmar, a campanha entra no ar sozinha.", "As soon as Mercado Pago confirms, the campaign goes live on its own.", "En cuanto Mercado Pago confirme, la campaña sale al aire sola."],
  brand: ["Freelandoo Ads", "Freelandoo Ads", "Freelandoo Ads"],
  budgetTotal: ["Orçamento total", "Total budget", "Presupuesto total"],
  campaigns: ["Suas campanhas", "Your campaigns", "Tus campañas"],
  cancel: ["Cancelar", "Cancel", "Cancelar"],
  cancelConfirm: ["Cancelar? O que não foi entregue volta como crédito.", "Cancel? Anything not delivered comes back as credit.", "¿Cancelar? Lo que no se entregó vuelve como crédito."],
  chartAria: ["Visualizações por dia", "Views per day", "Visualizaciones por día"],
  chartEmpty: ["Os números de cada dia aparecem aqui assim que a campanha começar a entregar.", "Daily numbers show up here as soon as the campaign starts delivering.", "Los números de cada día aparecen aquí apenas la campaña empiece a entregar."],
  chartTitle: ["Visualizações por dia", "Views per day", "Visualizaciones por día"],
  clicksProfile: ["Perfil", "Profile", "Perfil"],
  credit: ["Crédito de anúncio", "Ad credit", "Crédito de anuncio"],
  creditApplied: ["Crédito usado", "Credit applied", "Crédito usado"],
  creditedBack: ["{v} voltaram como crédito de anúncio.", "{v} came back as ad credit.", "{v} volvieron como crédito de anuncio."],
  ctaProfile: ["Ver perfil", "View profile", "Ver perfil"],
  ctaWhats: ["Chamar no WhatsApp", "Message on WhatsApp", "Escribir por WhatsApp"],
  ctr: ["dos que viram", "of viewers", "de quienes lo vieron"],
  day: ["dia", "day", "día"],
  days: ["dias", "days", "días"],
  delivered: ["entregue", "delivered", "entregado"],
  duration: ["Duração", "Duration", "Duración"],
  emptyText: ["Comece com R$ 10 na sua cidade e veja o resultado chegando ao vivo.", "Start with R$ 10 in your city and watch results come in live.", "Empieza con R$ 10 en tu ciudad y mira el resultado en vivo."],
  emptyTitle: ["Nenhuma campanha ainda", "No campaigns yet", "Ninguna campaña todavía"],
  estPeople: ["Pessoas alcançadas", "People reached", "Personas alcanzadas"],
  estViews: ["Visualizações", "Views", "Visualizaciones"],
  estimateTitle: ["Estimativa", "Estimate", "Estimación"],
  genericError: ["Não deu certo", "That didn't work", "No funcionó"],
  heroA: ["Impulsione", "Boost", "Impulsa"],
  heroB: ["sua cidade", "your city", "tu ciudad"],
  heroC: ["ou o Brasil", "or all of Brazil", "o todo Brasil"],
  heroLead: [
    "Escolha um post, onde ele vai aparecer e quanto quer investir. A gente mostra quantas pessoas ele alcança antes de você pagar.",
    "Pick a post, where it will show and how much to invest. We show how many people it reaches before you pay.",
    "Elige un post, dónde aparecerá y cuánto invertir. Te mostramos a cuántas personas llega antes de pagar.",
  ],
  heroScript: ["seu post, mais longe", "your post, further", "tu post, más lejos"],
  kpiClicks: ["Cliques", "Clicks", "Clics"],
  kpiReach: ["Pessoas alcançadas", "People reached", "Personas alcanzadas"],
  kpiSpent: ["Investido", "Spent", "Invertido"],
  kpiViews: ["Visualizações", "Views", "Visualizaciones"],
  launch: ["Pôr no ar com crédito", "Go live with credit", "Lanzar con crédito"],
  leftoverNote: [
    "O que não for entregue até o fim volta como crédito de anúncio para a próxima campanha.",
    "Anything not delivered by the end comes back as ad credit for your next campaign.",
    "Lo que no se entregue hasta el final vuelve como crédito de anuncio para la próxima campaña.",
  ],
  marqueeClicks: ["cliques", "clicks", "clics"],
  marqueeLive: ["no ar agora", "live now", "al aire ahora"],
  marqueeReach: ["pessoas", "people", "personas"],
  marqueeViews: ["visualizações", "views", "visualizaciones"],
  needLogin: ["Entre na sua conta para anunciar.", "Sign in to advertise.", "Inicia sesión para anunciar."],
  newCampaign: ["Nova campanha", "New campaign", "Nueva campaña"],
  next: ["Continuar", "Continue", "Continuar"],
  noPosts: ["Publique um post no feed primeiro.", "Publish a post to the feed first.", "Publica un post en el feed primero."],
  objProfile: ["Visitas ao perfil", "Profile visits", "Visitas al perfil"],
  objProfileText: ["O post ganha o botão Ver perfil.", "The post gets a View profile button.", "El post gana el botón Ver perfil."],
  objViews: ["Mais gente vendo", "More people seeing it", "Más gente viéndolo"],
  objViewsText: ["Seu post aparece para mais pessoas da área.", "Your post shows to more people in the area.", "Tu post aparece para más personas de la zona."],
  objWhats: ["Conversas no WhatsApp", "WhatsApp conversations", "Conversaciones en WhatsApp"],
  objWhatsText: ["O post ganha o botão Chamar no WhatsApp.", "The post gets a Message on WhatsApp button.", "El post gana el botón Escribir por WhatsApp."],
  of: ["de", "of", "de"],
  pause: ["Pausar", "Pause", "Pausar"],
  payAndLaunch: ["Pagar e pôr no ar", "Pay and go live", "Pagar y lanzar"],
  people: ["pessoas", "people", "personas"],
  perDay: ["por dia", "per day", "por día"],
  perThousand: ["mil", "1k", "mil"],
  possibleAudience: ["no público", "in the audience", "en el público"],
  qBudget: ["Quanto e por quanto tempo?", "How much and for how long?", "¿Cuánto y por cuánto tiempo?"],
  qGoal: ["O que você quer?", "What do you want?", "¿Qué quieres?"],
  qPost: ["Qual post?", "Which post?", "¿Qué post?"],
  qReview: ["Tudo certo?", "All good?", "¿Todo bien?"],
  qWhere: ["Onde aparece?", "Where does it show?", "¿Dónde aparece?"],
  resume: ["Retomar", "Resume", "Reanudar"],
  saturated: [
    "Orçamento alto para essa área: as mesmas pessoas vão ver mais vezes. Tente uma área maior.",
    "High budget for this area: the same people will see it more often. Try a larger area.",
    "Presupuesto alto para esta zona: las mismas personas lo verán más veces. Prueba una zona más grande.",
  ],
  sponsored: ["Impulsionado", "Sponsored", "Promocionado"],
  sponsoredNote: ["O post aparece com a etiqueta Impulsionado, como manda a lei.", "The post shows a Sponsored label, as the law requires.", "El post aparece con la etiqueta Promocionado, como exige la ley."],
  stActive: ["No ar", "Live", "Al aire"],
  stCanceled: ["Cancelada", "Canceled", "Cancelada"],
  stCompleted: ["Concluída", "Completed", "Finalizada"],
  stExpired: ["Não paga", "Unpaid", "No pagada"],
  stPaused: ["Pausada", "Paused", "Pausada"],
  stPending: ["Esperando pagamento", "Awaiting payment", "Esperando el pago"],
  stRefunded: ["Estornada", "Refunded", "Reembolsada"],
  stRejected: ["Post saiu do ar", "Post went offline", "El post salió del aire"],
  stepBudget: ["Orçamento", "Budget", "Presupuesto"],
  stepGoal: ["Objetivo", "Goal", "Objetivo"],
  stepPost: ["Post", "Post", "Post"],
  stepReview: ["Revisar", "Review", "Revisar"],
  stepWhere: ["Onde", "Where", "Dónde"],
  tierBrasil: ["Brasil", "Brazil", "Brasil"],
  tierCity: ["Cidade", "City", "Ciudad"],
  tierRegion: ["Região", "Region", "Región"],
  tierState: ["Estado", "State", "Estado"],
  tierUnavailable: ["indisponível para este post", "unavailable for this post", "no disponible para este post"],
  toPay: ["A pagar", "To pay", "A pagar"],
  untitledPost: ["Post sem título", "Untitled post", "Post sin título"],
  whereLead: [
    "A partir do lugar do seu post. Quanto mais longe, mais caro por mil visualizações.",
    "Starting from your post's location. The further it goes, the more it costs per thousand views.",
    "A partir del lugar de tu post. Cuanto más lejos, más caro por mil visualizaciones.",
  ],
}

const GROUPS = {
  Ads: ADS,
  Feed: { fxAds: ["Impulsionar (Ads)", "Boost (Ads)", "Impulsar (Ads)"] },
  Post: { reachBoost: ["Impulsionar", "Boost", "Impulsar"] },
}

function load(file) {
  return JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"))
}
function save(file, obj) {
  fs.writeFileSync(path.join(dir, file), JSON.stringify(obj, null, 2) + "\n", "utf8")
}
for (const [file, idx] of [["pt-BR.json", 0], ["en.json", 1], ["es.json", 2]]) {
  const d = load(file)
  let added = 0
  for (const [ns, keys] of Object.entries(GROUPS)) {
    if (!d[ns]) d[ns] = {}
    for (const [key, vals] of Object.entries(keys)) {
      if (!(key in d[ns])) {
        d[ns][key] = vals[idx]
        added++
      }
    }
  }
  save(file, d)
  console.log(`${file}: +${added} chaves`)
}
