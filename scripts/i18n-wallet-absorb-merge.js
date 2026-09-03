/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves da limpeza do headcard + da Carteira que
// absorveu "Meus Faturamentos" (2026-09-03).
//
// Três frentes:
//   Account — banner do headcard vira "Alterar" (loja de manifestações) e os
//             pills novos (Fitness laranja, Games roxo) ao lado da Carteira.
//   Profile — mesmas duas chaves do banner, porque o ProfileHeadCard usa o
//             namespace Profile e não o Account.
//   Wallet  — tudo que veio do /account/afiliado (KPI Revertido, recorte
//             Cupom, indicados, regra vigente, dados de PIX) mais o cupom e o
//             cofrinho da vaquinha, que mudaram de casa para cá.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no
// dicionário. `Account.earningsLabel` fica órfã de propósito (a entrada do
// menu morreu junto com a página).
//
// Uso: node scripts/i18n-wallet-absorb-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const ACCOUNT = {
  changeManifestation: ["Alterar", "Change", "Cambiar"],
  changeManifestationAria: [
    "Trocar sua manifestação na loja",
    "Change your manifestation in the store",
    "Cambiar tu manifestación en la tienda",
  ],
  fitnessPill: ["Fitness", "Fitness", "Fitness"],
  gamesPill: ["Games", "Games", "Games"],
  // Escoteiro: a chave já existia no /account (commit c924a2d) sem entrada em
  // nenhum dos três dicionários — en/es mostravam português em silêncio.
  browseByEnxame: ["Buscar por enxame", "Browse by swarm", "Buscar por enjambre"],
  openGamesAria: [
    "Abrir a comunidade dos meus games",
    "Open my games community",
    "Abrir la comunidad de mis juegos",
  ],
};

const PROFILE = {
  changeManifestation: ["Alterar", "Change", "Cambiar"],
  changeManifestationAria: [
    "Trocar sua manifestação na loja",
    "Change your manifestation in the store",
    "Cambiar tu manifestación en la tienda",
  ],
};

const WALLET = {
  // KPI + recorte novos no extrato
  kpiReversed: ["Revertido", "Reversed", "Revertido"],
  filterCoupon: ["Cupom", "Coupon", "Cupón"],
  couponSalesEmptyTitle: [
    "Nenhuma venda com seu cupom ainda",
    "No sales with your coupon yet",
    "Aún no hay ventas con tu cupón",
  ],
  couponSalesEmptyHint: [
    "Compartilhe seu cupom de afiliado pra começar a ver vendas aqui.",
    "Share your affiliate coupon to start seeing sales here.",
    "Comparte tu cupón de afiliado para empezar a ver ventas aquí.",
  ],
  buyer: ["Comprador", "Buyer", "Comprador"],
  itemsCount: ["item(s)", "item(s)", "artículo(s)"],
  discount: ["desconto", "discount", "descuento"],
  saleOf: ["venda de", "sale of", "venta de"],

  // Meu cupom (veio do headcard do /account)
  myCouponTitle: ["Meu cupom", "My coupon", "Mi cupón"],
  myCouponHint: [
    "Compartilhe: quem comprar na plataforma com ele fica vinculado a você e gera comissão.",
    "Share it: whoever buys on the platform with it is linked to you and generates commission.",
    "Compártelo: quien compre en la plataforma con él queda vinculado a ti y genera comisión.",
  ],
  myCouponEmptyHint: [
    "Você ainda não tem cupom. Gere o seu e comece a indicar.",
    "You don't have a coupon yet. Generate yours and start referring.",
    "Aún no tienes cupón. Genera el tuyo y empieza a recomendar.",
  ],
  generateCoupon: ["Gerar cupom", "Generate coupon", "Generar cupón"],
  generating: ["Gerando...", "Generating...", "Generando..."],

  // Cofrinho da vaquinha
  myVaquinhaTitle: ["Minha vaquinha", "My fundraiser", "Mi vaquita"],
  myVaquinhaCta: ["Abrir minha vaquinha", "Open my fundraiser", "Abrir mi vaquita"],
  myVaquinhaHint: [
    "Arrecade para um objetivo seu. Se você já tem uma, o botão abre a que existe.",
    "Raise money for a goal of yours. If you already have one, the button opens it.",
    "Recauda para un objetivo tuyo. Si ya tienes una, el botón abre la existente.",
  ],

  // Painel do afiliado
  affiliateSection: ["Afiliado", "Affiliate", "Afiliado"],
  affiliateNotEnrolled: [
    "Você ainda não está cadastrado no programa de afiliados. Fale com a equipe Freelandoo para ativar sua afiliação e habilitar pagamentos.",
    "You are not enrolled in the affiliate program yet. Talk to the Freelandoo team to activate your affiliation and enable payouts.",
    "Todavía no estás inscrito en el programa de afiliados. Habla con el equipo de Freelandoo para activar tu afiliación y habilitar los pagos.",
  ],
  myReferralsTitle: ["Meus indicados", "My referrals", "Mis referidos"],
  myReferralsDesc: [
    "Quem usou seu cupom numa compra da plataforma fica vinculado a você para sempre — toda compra futura dessa pessoa gera comissão.",
    "Whoever used your coupon on a platform purchase is linked to you forever — every future purchase by that person generates commission.",
    "Quien usó tu cupón en una compra de la plataforma queda vinculado a ti para siempre: cada compra futura de esa persona genera comisión.",
  ],
  myReferralsEmpty: [
    "Ninguém vinculado ainda. Compartilhe seu cupom: o primeiro que comprar algo da plataforma por ele fica seu para sempre.",
    "Nobody linked yet. Share your coupon: the first person to buy something on the platform with it is yours forever.",
    "Nadie vinculado todavía. Comparte tu cupón: la primera persona que compre algo en la plataforma con él es tuya para siempre.",
  ],
  myReferralsCount: ["Vinculados", "Linked", "Vinculados"],
  myReferralsRecurring: [
    "Comissão por vínculo (30 dias)",
    "Commission from links (30 days)",
    "Comisión por vínculo (30 días)",
  ],
  myReferralsSince: ["desde {date}", "since {date}", "desde {date}"],

  currentRule: ["Regra vigente", "Current rule", "Regla vigente"],
  currentRuleDesc: [
    "Aplicada por padrão aos seus cupons.",
    "Applied by default to your coupons.",
    "Aplicada por defecto a tus cupones.",
  ],
  ruleCommission: ["Comissão", "Commission", "Comisión"],
  ruleBase: ["Base", "Base", "Base"],
  ruleBaseGross: ["Bruto", "Gross", "Bruto"],
  ruleBaseNet: ["Líquido do desconto", "Net of discount", "Neto del descuento"],
  ruleMinOrder: ["Pedido mínimo", "Minimum order", "Pedido mínimo"],
  ruleReleaseAfter: ["Liberação após", "Released after", "Liberación tras"],
  daysWord: ["dias", "days", "días"],

  payoutData: ["Dados para pagamento", "Payout details", "Datos para el pago"],
  payoutDataDesc: [
    "Usaremos estas informações quando gerarmos um lote de pagamento.",
    "We will use this information when we generate a payout batch.",
    "Usaremos esta información cuando generemos un lote de pago.",
  ],
  pixKeyType: ["Tipo de chave PIX", "PIX key type", "Tipo de clave PIX"],
  pixKey: ["Chave PIX", "PIX key", "Clave PIX"],
  pixKeyPlaceholder: ["Sua chave", "Your key", "Tu clave"],
  pixTypeCpf: ["CPF", "CPF", "CPF"],
  pixTypeEmail: ["E-mail", "Email", "Correo electrónico"],
  pixTypePhone: ["Telefone", "Phone", "Teléfono"],
  pixTypeRandom: ["Chave aleatória", "Random key", "Clave aleatoria"],
  legalName: ["Nome / Razão social", "Name / Legal name", "Nombre / Razón social"],
  taxId: ["CPF / CNPJ", "CPF / CNPJ", "CPF / CNPJ"],
  payoutOwnershipHint: [
    "O CPF do recebedor precisa ser o mesmo CPF cadastrado na sua conta.",
    "The recipient's CPF must be the same CPF registered on your account.",
    "El CPF del receptor debe ser el mismo CPF registrado en tu cuenta.",
  ],
  pixSaveFail: [
    "Não foi possível salvar os dados de recebimento.",
    "Could not save the payout details.",
    "No se pudieron guardar los datos de cobro.",
  ],
  select: ["Selecione", "Select", "Selecciona"],
  save: ["Salvar", "Save", "Guardar"],
  saving: ["Salvando...", "Saving...", "Guardando..."],
  dataSaved: ["Dados salvos.", "Details saved.", "Datos guardados."],
  availableAfterActivation: [
    "Disponível após ativação.",
    "Available after activation.",
    "Disponible tras la activación.",
  ],
};

const NAMESPACES = { Account: ACCOUNT, Profile: PROFILE, Wallet: WALLET };

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
  console.log(`[i18n] ${locale} atualizado`);
}

console.log(`[i18n] ${added} chave(s) adicionada(s).`);
