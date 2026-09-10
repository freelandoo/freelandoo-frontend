/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente — o PLANO NEGÓCIO (mig 234, 2026-09-10): o modal com os
// "prints" (crie seu negócio, faça um site, atendente de IA por R$50/mês), o
// aviãozinho trancado, o "Entrar" que não existe sem plano e o "Publicar site"
// gateado no construtor.
//
// Namespace NOVO `BusinessPlan` + chaves novas em `Community` e
// `CommunitySite`, fill-if-absent. Uso: node scripts/i18n-business-plan-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] — só entra se ainda não existir. */
const NEW = {
  BusinessPlan: {
    title: ["Plano Negócio", "Business Plan", "Plan Negocio"],
    eyebrow: ["Freelandoo · para o seu negócio", "Freelandoo · for your business", "Freelandoo · para tu negocio"],
    perMonth: ["/mês", "/month", "/mes"],
    close: ["Fechar", "Close", "Cerrar"],
    pitch: [
      "Crie seu negócio, faça um site para você e ainda tenha um atendente de IA para atender seu WhatsApp e as suas mensagens da Freelandoo.",
      "Create your business, build your own site and get an AI assistant that answers your WhatsApp and your Freelandoo messages.",
      "Crea tu negocio, haz tu propio sitio y ten además un asistente de IA que atiende tu WhatsApp y tus mensajes de Freelandoo.",
    ],
    step1Title: ["Crie seu negócio", "Create your business", "Crea tu negocio"],
    step1Text: [
      "Sua página com feed, foto, cores e identidade — pronta em um clique. De graça.",
      "Your page with feed, photo, colors and identity — ready in one click. Free.",
      "Tu página con feed, foto, colores e identidad — lista en un clic. Gratis.",
    ],
    step2Title: ["Faça o seu site", "Build your site", "Haz tu sitio"],
    step2Text: [
      "Monte o site do negócio no construtor visual. Com o plano, publique e compartilhe com endereço próprio.",
      "Build the business site in the visual builder. With the plan, publish and share it with its own address.",
      "Arma el sitio del negocio en el constructor visual. Con el plan, publícalo y compártelo con dirección propia.",
    ],
    step3Title: ["Atendente de IA", "AI assistant", "Asistente de IA"],
    step3Text: [
      "Um atendente que responde o WhatsApp da sua empresa e as suas mensagens da Freelandoo, sabendo seus serviços e preços.",
      "An assistant that answers your company's WhatsApp and your Freelandoo messages, knowing your services and prices.",
      "Un asistente que responde el WhatsApp de tu empresa y tus mensajes de Freelandoo, conociendo tus servicios y precios.",
    ],
    freeBadge: ["Grátis", "Free", "Gratis"],
    freeNote: [
      "Criar o negócio e montar o site é de graça. O plano libera o que vem depois:",
      "Creating the business and building the site is free. The plan unlocks what comes next:",
      "Crear el negocio y armar el sitio es gratis. El plan libera lo que viene después:",
    ],
    inc1: ["Aceitar membros no seu negócio", "Accept members in your business", "Aceptar miembros en tu negocio"],
    inc2: ["Publicar e compartilhar o site", "Publish and share the site", "Publicar y compartir el sitio"],
    inc3: ["Atendente de IA no WhatsApp e nas mensagens", "AI assistant on WhatsApp and in messages", "Asistente de IA en WhatsApp y en los mensajes"],
    inc4: ["WhatsApp da empresa dentro da Freelandoo", "Company WhatsApp inside Freelandoo", "WhatsApp de la empresa dentro de Freelandoo"],
    cta: ["Assinar por {price}/mês", "Subscribe for {price}/month", "Suscribirse por {price}/mes"],
    ctaLoading: ["Abrindo pagamento…", "Opening payment…", "Abriendo el pago…"],
    cancelAnytime: ["Cancele quando quiser. Sem fidelidade.", "Cancel anytime. No lock-in.", "Cancela cuando quieras. Sin permanencia."],
    loginFirst: ["Entre na sua conta para assinar.", "Sign in to subscribe.", "Inicia sesión para suscribirte."],
    checkoutError: ["Não foi possível abrir o pagamento.", "Couldn't open the payment.", "No se pudo abrir el pago."],
    activeTitle: ["Plano ativo", "Plan active", "Plan activo"],
    activeUntil: ["Renova em {date}", "Renews on {date}", "Se renueva el {date}"],
    activeNoDate: ["Cobrança mensal ativa.", "Monthly billing active.", "Cobro mensual activo."],
    pastDue: [
      "Pagamento pendente — atualize o cartão para continuar.",
      "Payment pending — update your card to continue.",
      "Pago pendiente — actualiza la tarjeta para continuar.",
    ],
    cancel: ["Cancelar plano", "Cancel plan", "Cancelar plan"],
    canceling: ["Cancelando…", "Canceling…", "Cancelando…"],
    cancelConfirm: [
      "Cancelar o Plano Negócio? Você continua com tudo até o fim do período já pago.",
      "Cancel the Business Plan? You keep everything until the end of the paid period.",
      "¿Cancelar el Plan Negocio? Conservas todo hasta el final del período ya pagado.",
    ],
    canceled: [
      "Plano cancelado. Vale até o fim do período pago.",
      "Plan canceled. Valid until the end of the paid period.",
      "Plan cancelado. Vale hasta el final del período pagado.",
    ],
    cancelError: ["Não foi possível cancelar agora.", "Couldn't cancel right now.", "No se pudo cancelar ahora."],
    successToast: [
      "Plano Negócio ativo! Seu negócio já aceita membros e o site pode ser publicado.",
      "Business Plan active! Your business now accepts members and the site can be published.",
      "¡Plan Negocio activo! Tu negocio ya acepta miembros y el sitio puede publicarse.",
    ],
    canceledToast: ["Pagamento cancelado — você não foi cobrado.", "Payment canceled — you were not charged.", "Pago cancelado — no se te cobró."],
    // textos das miniaturas (decorativos, mas visíveis)
    mockBack: ["Voltar", "Back", "Volver"],
    mockEdit: ["Editar", "Edit", "Editar"],
    mockLevel: ["Nível 0", "Level 0", "Nivel 0"],
    mockBizName: ["Meu negócio", "My business", "Mi negocio"],
    mockFeed: ["Feed", "Feed", "Feed"],
    mockMembers: ["Membros", "Members", "Miembros"],
    mockSite: ["Site", "Site", "Sitio"],
    mockUrl: ["meunegocio.freelandoo.com.br", "mybusiness.freelandoo.com.br", "minegocio.freelandoo.com.br"],
    mockBook: ["Agendar", "Book", "Reservar"],
    mockHero: ["Seu negócio,\nseu site.", "Your business,\nyour site.", "Tu negocio,\ntu sitio."],
    mockBookNow: ["Agendar online", "Book online", "Reservar en línea"],
    mockWhatsapp: ["WhatsApp", "WhatsApp", "WhatsApp"],
    mockFreelandoo: ["Mensagens Freelandoo", "Freelandoo messages", "Mensajes Freelandoo"],
    mockChatIn: ["Oi! Vocês têm horário hoje?", "Hi! Do you have a slot today?", "¡Hola! ¿Tienen horario hoy?"],
    mockChatOut: ["Temos às 15h e às 17h. Quer que eu agende?", "We have 3pm and 5pm. Want me to book it?", "Tenemos a las 15h y a las 17h. ¿Quieres que lo agende?"],
    mockChatIn2: ["15h, por favor!", "3pm, please!", "¡A las 15h, por favor!"],
  },
  Community: {
    planButton: ["Plano Negócio", "Business Plan", "Plan Negocio"],
    planActiveButton: ["Plano ativo", "Plan active", "Plan activo"],
    membersLocked: ["Ainda não aceita membros", "Not accepting members yet", "Aún no acepta miembros"],
    inviteLockedAria: [
      "Convidar pessoas — faz parte do Plano Negócio",
      "Invite people — part of the Business Plan",
      "Invitar personas — parte del Plan Negocio",
    ],
    joinNeedsPlan: [
      "Este negócio ainda não aceita membros.",
      "This business is not accepting members yet.",
      "Este negocio aún no acepta miembros.",
    ],
  },
  CommunitySite: {
    publishLocked: ["Publicar site · Plano Negócio", "Publish site · Business Plan", "Publicar sitio · Plan Negocio"],
    publishNeedsPlan: [
      "Publicar e compartilhar o site faz parte do Plano Negócio.",
      "Publishing and sharing the site is part of the Business Plan.",
      "Publicar y compartir el sitio es parte del Plan Negocio.",
    ],
  },
  AtendimentoIa: {
    includedInPlan: ["Incluído no Plano Negócio", "Included in the Business Plan", "Incluido en el Plan Negocio"],
    includedHint: [
      "Seu atendente vem com o Plano Negócio — sem cobrança à parte. Ele cai junto se o plano for cancelado.",
      "Your assistant comes with the Business Plan — no separate charge. It ends together with the plan.",
      "Tu asistente viene con el Plan Negocio — sin cobro aparte. Termina junto con el plan.",
    ],
  },
};

let totalAdded = 0;
LOCALES.forEach((locale, idx) => {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  let added = 0;
  for (const [ns, keys] of Object.entries(NEW)) {
    dict[ns] = dict[ns] || {};
    for (const [key, values] of Object.entries(keys)) {
      if (dict[ns][key] === undefined) {
        dict[ns][key] = values[idx];
        added += 1;
      }
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
  console.log(`${locale}: ${added} chaves adicionadas`);
  totalAdded += added;
});
console.log(`total: ${totalAdded}`);
