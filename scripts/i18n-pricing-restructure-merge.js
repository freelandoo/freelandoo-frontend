/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves da TABELA DE PREÇOS NOVA (mig 263).
//
// O Plano Negócio acabou. O modal do plano virou o Plano SITE (R$49/ano), o
// painel do site autoral passou a mostrar o preço (R$299 de criação + R$29/mês)
// e cobrar no pedido, o atendente de IA ganhou cota e planos na própria tela, e
// o site ganhou a seção Loja.
//
// ⚠️ TEXTO QUE MUDOU DE SENTIDO GANHOU CHAVE NOVA (sufixo Site/V2/Autoral), e
// não sobrescreveu a antiga: o dicionário vence o fallback inline, e editar só
// o componente não mudaria uma vírgula na tela. As chaves antigas ficam órfãs,
// padrão da casa.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-pricing-restructure-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const BUSINESS_PLAN = {
  titleSite: ["Plano Site", "Site Plan", "Plan Sitio"],
  perYear: ["/ano", "/year", "/año"],
  pitchSite: [
    "Crie seu negócio e monte o site de graça. Com um pagamento por ano, ele vai para o ar com o seu endereço.",
    "Create your business and build the site for free. With one payment a year, it goes live at your own address.",
    "Crea tu negocio y arma el sitio gratis. Con un pago al año, sale al aire con tu propia dirección.",
  ],
  step1TextV2: [
    "Sua página com feed, membros, agenda e WhatsApp — pronta em um clique. De graça.",
    "Your page with feed, members, scheduling and WhatsApp — ready in one click. Free.",
    "Tu página con feed, miembros, agenda y WhatsApp — lista en un clic. Gratis.",
  ],
  step2TextV2: [
    "Monte o site no construtor visual. Os seus serviços e a sua loja entram sozinhos e se atualizam quando você mexe neles.",
    "Build the site in the visual builder. Your services and your store come in on their own and update when you change them.",
    "Arma el sitio en el constructor visual. Tus servicios y tu tienda entran solos y se actualizan cuando los cambias.",
  ],
  step3TitleSite: ["Publique", "Publish", "Publica"],
  step3TextSite: [
    "Coloque o site no ar com o endereço da Freelandoo ou com o seu próprio domínio.",
    "Put the site live with a Freelandoo address or your own domain.",
    "Pon el sitio al aire con la dirección de Freelandoo o con tu propio dominio.",
  ],
  freeNoteSite: [
    "Negócio, membros, agenda, WhatsApp e o construtor são de graça. O plano libera:",
    "Business, members, scheduling, WhatsApp and the builder are free. The plan unlocks:",
    "Negocio, miembros, agenda, WhatsApp y el constructor son gratis. El plan libera:",
  ],
  incSite1: ["Publicar e compartilhar o site", "Publish and share the site", "Publicar y compartir el sitio"],
  incSite2: ["Ligar o seu domínio próprio", "Connect your own domain", "Conectar tu propio dominio"],
  incSite3: [
    "Seções de Serviços e Loja sempre atualizadas",
    "Services and Store sections always up to date",
    "Secciones de Servicios y Tienda siempre actualizadas",
  ],
  incSite4: [
    "Um pagamento por ano, sem mensalidade",
    "One payment a year, no monthly fee",
    "Un pago al año, sin mensualidad",
  ],
  aiFreeLine: [
    "Atendente de IA no WhatsApp e nas mensagens: grátis para 2 pessoas por dia.",
    "AI assistant on WhatsApp and messages: free for 2 people a day.",
    "Asistente de IA en WhatsApp y mensajes: gratis para 2 personas por día.",
  ],
  aiFreeCta: ["Conectar", "Connect", "Conectar"],
  activeNoDateYear: ["Cobrança anual ativa.", "Yearly billing active.", "Cobro anual activo."],
  ctaYear: ["Assinar por {price}/ano", "Subscribe for {price}/year", "Suscribirse por {price}/año"],
  cancelConfirmSite: [
    "Cancelar o Plano Site? O site continua no ar até o fim do período já pago.",
    "Cancel the Site Plan? The site stays live until the end of the paid period.",
    "¿Cancelar el Plan Sitio? El sitio sigue al aire hasta el fin del período pagado.",
  ],
  successToastSite: [
    "Plano Site ativo! O seu site já pode ser publicado.",
    "Site Plan active! Your site can now be published.",
    "¡Plan Sitio activo! Tu sitio ya puede publicarse.",
  ],
  mockDomain: ["www.meunegocio.com.br", "www.mybusiness.com", "www.minegocio.com"],
  mockLive: ["No ar", "Live", "Al aire"],
  mockServices: ["Serviços", "Services", "Servicios"],
  mockStore: ["Loja", "Store", "Tienda"],
};

const COMMUNITY = {
  planButtonSite: ["Plano Site", "Site Plan", "Plan Sitio"],
  inviteLockedAriaV2: ["Convidar pessoas", "Invite people", "Invitar personas"],
};

const COMMUNITY_SITE = {
  publishLockedSite: ["Publicar site · Plano Site", "Publish site · Site Plan", "Publicar sitio · Plan Sitio"],
  sectionStore: ["Loja", "Store", "Tienda"],
  storePerRow: ["Por linha", "Per row", "Por fila"],
  storeCta: ["Comprar", "Buy", "Comprar"],
  storeSoldOut: ["Esgotado", "Sold out", "Agotado"],
  storeEmpty: ["Nenhum produto na sua loja ainda.", "No products in your store yet.", "Aún no hay productos en tu tienda."],
  storeEmptyHint: [
    "Esta seção mostra os produtos da Loja do seu perfil. Cadastre em Meu perfil → Loja e eles aparecem aqui.",
    "This section shows the products from your profile's Store. Add them in My profile → Store and they show up here.",
    "Esta sección muestra los productos de la Tienda de tu perfil. Regístralos en Mi perfil → Tienda y aparecen aquí.",
  ],
  storeNoPhoto: [
    "Sem foto — adicione no cadastro do produto",
    "No photo — add one in the product listing",
    "Sin foto — agrégala en el registro del producto",
  ],
  readyPitchLeadAutoral: [
    "Além do construtor, que é seu, existe o site autoral: desenhado e escrito pelos agentes da Freelandoo, sob medida, com uma página por serviço e uma por cidade atendida — que é o que responde em busca local.",
    "Besides the builder, which is yours, there's the custom site: designed and written by Freelandoo's agents, made to measure, with one page per service and one per city served — which is what ranks in local search.",
    "Además del constructor, que es tuyo, existe el sitio a medida: diseñado y escrito por los agentes de Freelandoo, con una página por servicio y una por ciudad atendida — que es lo que responde en la búsqueda local.",
  ],
  readyPitchBodyAutoral: [
    "A gente monta e mantém o site a partir do que você já escreveu aqui. Quando ele estiver pronto, você aceita a troca e ele passa a ser mantido pela Freelandoo — publicar e o endereço continuam com você.",
    "We build and maintain the site from what you've already written here. When it's ready, you accept the switch and Freelandoo maintains it from then on — publishing and the address stay with you.",
    "Armamos y mantenemos el sitio a partir de lo que ya escribiste aquí. Cuando esté listo, aceptas el cambio y Freelandoo pasa a mantenerlo — publicar y la dirección siguen contigo.",
  ],
  readyPriceSetup: ["Criação", "Setup", "Creación"],
  readyPriceSetupNote: ["uma vez, ao pedir", "once, when you order", "una vez, al pedir"],
  readyPriceMonthly: ["Manutenção", "Maintenance", "Mantenimiento"],
  readyPriceMonthlyNote: [
    "quando o site entrar no ar",
    "once the site goes live",
    "cuando el sitio salga al aire",
  ],
  perMonthShort: ["/mês", "/mo", "/mes"],
  readyRequestCtaPaid: ["Pedir o meu site · {price}", "Order my site · {price}", "Pedir mi sitio · {price}"],
  readyRequestHintPaid: [
    "A criação é paga agora e o pedido entra na fila dos agentes assim que o pagamento cai. Nada muda no seu site até você aceitar o novo.",
    "Setup is paid now, and the order joins the agents' queue as soon as the payment clears. Nothing changes on your site until you accept the new one.",
    "La creación se paga ahora y el pedido entra en la fila de los agentes en cuanto se acredita el pago. Nada cambia en tu sitio hasta que aceptes el nuevo.",
  ],
};

const ACCOUNT = {
  aiAttendantAriaV2: [
    "Atendente com IA: responde seu WhatsApp e suas mensagens — grátis para 2 pessoas por dia",
    "AI assistant: answers your WhatsApp and messages — free for 2 people a day",
    "Asistente de IA: responde tu WhatsApp y tus mensajes — gratis para 2 personas por día",
  ],
};

const AI_ATTENDANT = {
  quotaFreeEyebrow: ["Camada grátis", "Free tier", "Nivel gratis"],
  quotaPaidEyebrow: ["Plano {name}", "{name} plan", "Plan {name}"],
  quotaFreeLine: [
    "{used} de {limit} pessoas atendidas hoje",
    "{used} of {limit} people served today",
    "{used} de {limit} personas atendidas hoy",
  ],
  quotaPaidLine: [
    "{used} de {limit} respostas neste ciclo",
    "{used} of {limit} replies this cycle",
    "{used} de {limit} respuestas en este ciclo",
  ],
  quotaFreeHint: [
    "De graça, o atendente conversa com até 2 pessoas por dia. Quem já foi atendido hoje continua sendo atendido.",
    "For free, the assistant talks to up to 2 people a day. Whoever was already served today keeps being served.",
    "Gratis, el asistente conversa con hasta 2 personas por día. Quien ya fue atendido hoy sigue siendo atendido.",
  ],
  quotaPaidHint: [
    "Cada resposta do atendente conta uma vez, no WhatsApp e nas mensagens da Freelandoo.",
    "Each assistant reply counts once, on WhatsApp and in Freelandoo messages.",
    "Cada respuesta del asistente cuenta una vez, en WhatsApp y en los mensajes de Freelandoo.",
  ],
  quotaFreeOut: [
    "O limite grátis de hoje acabou: o atendente parou e volta amanhã. Assine um plano para ele continuar respondendo.",
    "Today's free limit is used up: the assistant stopped and comes back tomorrow. Subscribe to a plan to keep it answering.",
    "Se acabó el límite gratis de hoy: el asistente se detuvo y vuelve mañana. Suscríbete a un plan para que siga respondiendo.",
  ],
  quotaPaidOut: [
    "A cota do plano acabou: o atendente parou até o próximo ciclo. Troque para um plano maior se precisar de mais respostas.",
    "The plan's quota is used up: the assistant stopped until the next cycle. Switch to a bigger plan if you need more replies.",
    "Se acabó la cuota del plan: el asistente se detuvo hasta el próximo ciclo. Cambia a un plan mayor si necesitas más respuestas.",
  ],
  perMonth: ["/mês", "/mo", "/mes"],
  planReplies: ["{n} respostas por mês", "{n} replies per month", "{n} respuestas por mes"],
  planSubscribe: ["Assinar", "Subscribe", "Suscribirse"],
  planCancel: ["Cancelar plano", "Cancel plan", "Cancelar plan"],
  planCanceling: ["Cancelando…", "Canceling…", "Cancelando…"],
  planCancelConfirm: [
    "Cancelar o plano? O atendente volta para a camada grátis (2 pessoas por dia).",
    "Cancel the plan? The assistant goes back to the free tier (2 people a day).",
    "¿Cancelar el plan? El asistente vuelve al nivel gratis (2 personas por día).",
  ],
  planCanceled: ["Plano cancelado.", "Plan canceled.", "Plan cancelado."],
  planCancelError: [
    "Não foi possível cancelar agora.",
    "Couldn't cancel right now.",
    "No fue posible cancelar ahora.",
  ],
  planCheckoutError: [
    "Não foi possível abrir o pagamento.",
    "Couldn't open the payment.",
    "No fue posible abrir el pago.",
  ],
  planSuccess: [
    "Plano ativo! O atendente volta a responder.",
    "Plan active! The assistant is answering again.",
    "¡Plan activo! El asistente vuelve a responder.",
  ],
  planCanceledCheckout: [
    "Pagamento cancelado — você não foi cobrado.",
    "Payment canceled — you weren't charged.",
    "Pago cancelado — no se te cobró.",
  ],
  loading: ["Carregando…", "Loading…", "Cargando…"],
};

const NOTIFICATIONS = {
  aiQuotaFree: [
    "Seu atendente de IA já atendeu as 2 pessoas grátis de hoje — assine para ele continuar",
    "Your AI assistant already served today's 2 free people — subscribe to keep it going",
    "Tu asistente de IA ya atendió a las 2 personas gratis de hoy — suscríbete para que siga",
  ],
  aiQuotaPaid: [
    "A cota de respostas do seu atendente de IA acabou",
    "Your AI assistant's reply quota is used up",
    "Se acabó la cuota de respuestas de tu asistente de IA",
  ],
};

const NAMESPACES = {
  BusinessPlan: BUSINESS_PLAN,
  Community: COMMUNITY,
  CommunitySite: COMMUNITY_SITE,
  Account: ACCOUNT,
  AiAttendant: AI_ATTENDANT,
  Notifications: NOTIFICATIONS,
};

let added = 0;

for (const locale of LOCALES) {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  const i = LOCALES.indexOf(locale);

  for (const [ns, keys] of Object.entries(NAMESPACES)) {
    if (!dict[ns]) dict[ns] = {};
    for (const [key, values] of Object.entries(keys)) {
      if (dict[ns][key] === undefined) {
        dict[ns][key] = values[i];
        added++;
      }
    }
  }

  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
}

console.log(`[i18n] ${added} chave(s) adicionada(s).`);
