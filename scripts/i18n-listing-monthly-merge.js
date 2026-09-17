/**
 * i18n da VITRINE MENSAL (mig 252): R$ 3,50 por anúncio.
 *
 * Fill-if-absent como todos os merges da casa — NUNCA sobrescreve o que já
 * está no dicionário —, com a exceção declarada em OVERRIDE.
 *
 * ⚠️ AS QUATRO CHAVES DE OVERRIDE PRECISAM SER SOBRESCRITAS, e não apenas
 * completadas: elas já existem nos três dicionários descrevendo o modelo de
 * COTA que acabou ("{used} de {total} anúncios ativos", "Vaga extra"). Como
 * DICIONÁRIO VENCE FALLBACK INLINE, trocar só a string no componente não
 * mudaria uma vírgula na tela — foi assim que a frase "dá para voltar a
 * editá-lo quando quiser" sobreviveu a uma entrega inteira.
 *
 * Idempotente: a 2ª passada não muda nada.
 */
const fs = require("fs");
const path = require("path");

const DICTS = ["pt-BR", "en", "es"];
const NS = "Community";

// Chaves novas: só entram onde faltam.
const ADD = {
  listBillHint: [
    "Publicar custa {price} por mês por anúncio.",
    "Posting costs {price} per month per listing.",
    "Publicar cuesta {price} al mes por anuncio.",
  ],
  listLiveLine: ["{n} no ar", "{n} live", "{n} en línea"],
  listUnpaidLine: [
    "{n} esperando pagamento",
    "{n} awaiting payment",
    "{n} esperando pago",
  ],
  listParkedTitle: [
    "Seus anúncios fora do ar",
    "Your listings that are offline",
    "Tus anuncios fuera del aire",
  ],
  listParkedDesc: [
    "Eles estão guardados e ninguém os vê. Pague a mensalidade para voltarem à vitrine.",
    "They are saved and nobody can see them. Pay the monthly fee to put them back on the board.",
    "Están guardados y nadie los ve. Paga la mensualidad para que vuelvan al escaparate.",
  ],
  listBillPay: ["Pôr no ar", "Put it live", "Poner en línea"],
  listBillTitle: [
    "Pôr o anúncio no ar",
    "Put your listing live",
    "Poner el anuncio en línea",
  ],
  listBillPrice: [
    "{price} por mês enquanto o anúncio estiver na vitrine.",
    "{price} per month while the listing is on the board.",
    "{price} al mes mientras el anuncio esté en el escaparate.",
  ],
  listBillCard: ["Assinar no cartão", "Subscribe with a card", "Suscribir con tarjeta"],
  listBillCardHint: [
    "Renova sozinho todo mês. Dá para cancelar quando quiser.",
    "It renews on its own every month. You can cancel whenever you want.",
    "Se renueva solo cada mes. Puedes cancelar cuando quieras.",
  ],
  listBillPix: ["Pagar um mês no Pix", "Pay one month with Pix", "Pagar un mes con Pix"],
  listBillPixHint: [
    "Vale 30 dias. Como o Pix não tem cobrança automática, você renova quando quiser continuar.",
    "It lasts 30 days. Pix has no automatic charge, so you renew it whenever you want to continue.",
    "Dura 30 días. Pix no tiene cobro automático, así que lo renuevas cuando quieras continuar.",
  ],
  listBillPolens: ["Usar {n} Poléns", "Use {n} Polens", "Usar {n} Polens"],
  listBillPaid: ["Anúncio no ar.", "Listing is live.", "Anuncio en línea."],
  listBillCancel: [
    "Cancelar renovação",
    "Cancel renewal",
    "Cancelar renovación",
  ],
  listBillCanceled: [
    "Renovação cancelada. O anúncio fica no ar até o fim do período pago.",
    "Renewal cancelled. The listing stays live until the end of the paid period.",
    "Renovación cancelada. El anuncio sigue en línea hasta el fin del periodo pagado.",
  ],
  listBillRenews: ["Renova em {date}", "Renews on {date}", "Se renueva el {date}"],
  listBillUntil: ["No ar até {date}", "Live until {date}", "En línea hasta {date}"],
  listBillError: [
    "Não foi possível concluir o pagamento.",
    "The payment could not be completed.",
    "No se pudo completar el pago.",
  ],
};

// ⚠️ Estas descrevem o modelo de COTA que a mig 252 encerrou. Sem o override,
// a tela continuaria prometendo vaga vitalícia e "X de Y anúncios ativos".
const OVERRIDE = {
  listQuotaLine: ["{n} no ar", "{n} live", "{n} en línea"],
  listQuotaReached: [
    "Pague a mensalidade para pôr este anúncio no ar.",
    "Pay the monthly fee to put this listing live.",
    "Paga la mensualidad para poner este anuncio en línea.",
  ],
  listSlotTitle: [
    "Mensalidade do anúncio",
    "Listing monthly fee",
    "Mensualidad del anuncio",
  ],
  listSlotDesc: [
    "Cada anúncio custa uma mensalidade e fica na vitrine enquanto estiver pago.",
    "Each listing has a monthly fee and stays on the board while it is paid.",
    "Cada anuncio tiene una mensualidad y permanece en el escaparate mientras esté pagado.",
  ],
};

let added = 0;
let overridden = 0;

DICTS.forEach((locale, i) => {
  const file = path.join(__dirname, "..", "messages", `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  dict[NS] = dict[NS] || {};

  for (const [key, values] of Object.entries(ADD)) {
    if (dict[NS][key] === undefined) {
      dict[NS][key] = values[i];
      added++;
    }
  }
  for (const [key, values] of Object.entries(OVERRIDE)) {
    if (dict[NS][key] !== values[i]) {
      dict[NS][key] = values[i];
      overridden++;
    }
  }

  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
});

console.log(`i18n vitrine mensal: ${added} chave(s) adicionada(s), ${overridden} sobrescrita(s).`);
