/**
 * i18n — o texto ao usuário deixa de nomear o provedor de pagamento.
 *
 * ⚠️ ESTE MERGE É **OVERRIDE**, não fill-if-absent: o que muda é o VALOR de
 * chaves que já existem. Um merge normal não sobrescreveria nada e a tela
 * continuaria dizendo "Pagar com Stripe" enquanto cobra pelo Asaas.
 *
 * ⚠️ E O TEXTO NÃO PASSA A DIZER "ASAAS". Quem cobra é decisão de AMBIENTE
 * (PAYMENT_PROVIDER + credencial), e pode voltar a ser o Stripe a qualquer
 * momento — inclusive hoje, pelo fallback que protege o caixa quando falta a
 * credencial. Cravar o nome novo seria o mesmo defeito numa roupa nova: uma
 * tela que afirma quem processou o pagamento sem ter como saber.
 *
 * As CHAVES ficam como estão (`stripeRedirectNotice`, `taxaPayWithStripe`):
 * chave é identificador, e renomeá-la quebraria os componentes que a leem —
 * mesma disciplina de `tb_machine` e do `tourKey uploads_r2`.
 */
const fs = require("fs");
const path = require("path");

const OVERRIDES = {
  Product: {
    stripeRedirectNotice: {
      "pt-BR": "Você será redirecionado para concluir o pagamento com segurança.",
      en: "You will be redirected to complete your payment securely.",
      es: "Serás redirigido para completar el pago de forma segura.",
    },
  },
  Checkout: {
    successDescription: {
      "pt-BR":
        "Recebemos seu pagamento. Assim que ele for confirmado, seu perfil será ativado automaticamente nos classificados — em alguns segundos o status aparece em \"Minha conta\".",
      en:
        "We received your payment. As soon as it is confirmed, your profile will be activated automatically in the listings — within seconds the status will appear under \"My account\".",
      es:
        "Recibimos tu pago. En cuanto se confirme, tu perfil se activará automáticamente en los clasificados — en segundos el estado aparecerá en \"Mi cuenta\".",
    },
    taxaPerk2Desc: {
      "pt-BR": "A confirmação do pagamento ativa o perfil automaticamente.",
      en: "Payment confirmation activates the profile automatically.",
      es: "La confirmación del pago activa el perfil automáticamente.",
    },
    taxaPerk3Desc: {
      "pt-BR": "Processado com criptografia ponta a ponta.",
      en: "Processed with end-to-end encryption.",
      es: "Procesado con cifrado de extremo a extremo.",
    },
    taxaRedirectStripe: {
      "pt-BR": "Você será redirecionado para concluir",
      en: "You'll be redirected to finish",
      es: "Serás redirigido para concluir",
    },
    taxaPayWithStripe: {
      "pt-BR": "Ir para o pagamento",
      en: "Go to payment",
      es: "Ir al pago",
    },
  },
  SubscriptionTerms: {
    // ⚠️ TEXTO CONTRATUAL. A troca o torna MAIS correto (o contrato não deve
    // prender o usuário a um processador específico), mas subir TERMS_VERSION
    // é decisão do Alex — sem isso ninguém é perguntado de novo.
    "footer.prefix": {
      "pt-BR":
        "Ao realizar a ativação e efetuar o pagamento, o usuário declara ter lido, compreendido e concordado integralmente com este contrato. Veja também nossos",
      en:
        "By activating and completing the payment, the user declares that they have read, understood, and fully agreed to this agreement. Also see our",
      es:
        "Al realizar la activación y efectuar el pago, el usuario declara haber leído, comprendido y aceptado íntegramente este contrato. Mira también nuestros",
    },
  },
  Payments: {
    refundIdsNote: {
      "pt-BR":
        "Use estes IDs em qualquer atendimento sobre o reembolso. O valor pode levar de 5 a 10 dias úteis para aparecer na fatura.",
      en:
        "Use these IDs in any support request about the refund. The amount may take 5 to 10 business days to appear on your statement.",
      es:
        "Usa estos IDs en cualquier atención sobre el reembolso. El importe puede tardar de 5 a 10 días hábiles en aparecer en tu factura.",
    },
  },
  Polens: {
    securePaymentNote: {
      "pt-BR": "Pagamento seguro. Os Poléns são creditados automaticamente após a confirmação.",
      en: "Secure payment. Polens are credited automatically after confirmation.",
      es: "Pago seguro. Los Polens se acreditan automáticamente tras la confirmación.",
    },
    boosterPriceNote: {
      "pt-BR": "Pagamento único de {price}.",
      en: "One-time payment of {price}.",
      es: "Pago único de {price}.",
    },
  },
};

const LOCALES = ["pt-BR", "en", "es"];
let changed = 0;

for (const locale of LOCALES) {
  const file = path.join(__dirname, "..", "messages", `${locale}.json`);
  const raw = fs.readFileSync(file, "utf8");
  const bom = raw.charCodeAt(0) === 0xfeff ? "\uFEFF" : "";
  const dict = JSON.parse(bom ? raw.slice(1) : raw);

  for (const [ns, keys] of Object.entries(OVERRIDES)) {
    if (!dict[ns]) {
      console.warn(`  !! namespace ausente em ${locale}: ${ns}`);
      continue;
    }
    for (const [key, byLocale] of Object.entries(keys)) {
      const next = byLocale[locale];
      if (next === undefined) continue;
      if (dict[ns][key] === next) continue;
      dict[ns][key] = next;
      changed++;
    }
  }

  fs.writeFileSync(file, bom + JSON.stringify(dict, null, 2) + "\n", "utf8");
}

console.log(`chaves sobrescritas: ${changed}`);
