/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente — AS VITRINES VIRAM ABAS (mig 198 promovida, 2026-09-16).
//
// Pedido do Alex: condomínio e rua passam a funcionar "como a comunidade game e
// a financeira": feed mais DUAS ABAS — vitrine de serviços e vitrine de
// produtos.
//
// Namespace `Community` (é uma aba da comunidade, como o ranking e os
// indicadores), prefixo `list*`. Fill-if-absent: nunca sobrescreve o que já
// existe.
//
// ⚠️ `tabServices`/`tabProducts` JÁ EXISTEM no ns `Condo` com os mesmos textos
// (eram as abas internas do bloco de extras). Aqui elas nascem no ns
// `Community` porque é OUTRA superfície — e as do `Condo` ficam órfãs, padrão
// da casa: chave que saiu de uso não é apagada.
//
// Uso: node scripts/i18n-community-listings-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] — só entra se ainda não existir. */
const NEW_COMMUNITY = {
  tabServices: ["Serviços", "Services", "Servicios"],
  tabProducts: ["Produtos", "Products", "Productos"],

  listNewService: ["Anunciar um serviço", "Offer a service", "Anunciar un servicio"],
  listNewProduct: ["Anunciar um produto", "List a product", "Anunciar un producto"],
  listTitlePlaceholder: [
    "O que você oferece?",
    "What are you offering?",
    "¿Qué ofreces?",
  ],
  listDescPlaceholder: ["Detalhes (opcional)", "Details (optional)", "Detalles (opcional)"],
  listPricePlaceholder: [
    "Preço em R$ (opcional)",
    "Price in R$ (optional)",
    "Precio en R$ (opcional)",
  ],
  listContactPlaceholder: [
    "Como te chamar (opcional)",
    "How to reach you (optional)",
    "Cómo contactarte (opcional)",
  ],
  listPublish: ["Publicar", "Publish", "Publicar"],
  listCancel: ["Cancelar", "Cancel", "Cancelar"],
  listArchive: ["Arquivar", "Archive", "Archivar"],
  listBuy: ["Comprar", "Buy", "Comprar"],
  listQuotaLine: [
    "{used} de {total} anúncios ativos",
    "{used} of {total} active listings",
    "{used} de {total} anuncios activos",
  ],
  listQuotaReached: [
    "Limite de anúncios ativos atingido.",
    "You reached your active listing limit.",
    "Alcanzaste el límite de anuncios activos.",
  ],
  listError: [
    "Não foi possível publicar.",
    "Couldn't publish it.",
    "No se pudo publicar.",
  ],
  listSlotTitle: ["Vaga extra de anúncio", "Extra listing slot", "Espacio extra de anuncio"],
  listSlotDesc: [
    "Compre uma vaga para manter mais um anúncio ativo. A vaga é sua para sempre e volta a ficar livre quando você arquiva um anúncio.",
    "Buy a slot to keep one more listing active. The slot is yours for good and frees up again when you archive a listing.",
    "Compra un espacio para mantener un anuncio más activo. El espacio es tuyo para siempre y vuelve a quedar libre cuando archivas un anuncio.",
  ],
  listSlotPolens: ["{n} Poléns", "{n} Polens", "{n} Polens"],
  listSlotBought: ["Vaga liberada.", "Slot unlocked.", "Espacio liberado."],
  listSlotError: [
    "Não foi possível iniciar o pagamento.",
    "Couldn't start the payment.",
    "No se pudo iniciar el pago.",
  ],
  listEmptyServices: [
    "Ninguém ofereceu um serviço por aqui ainda.",
    "Nobody has offered a service here yet.",
    "Todavía nadie ofreció un servicio por aquí.",
  ],
  listEmptyProducts: [
    "Ninguém anunciou um produto por aqui ainda.",
    "Nobody has listed a product here yet.",
    "Todavía nadie anunció un producto por aquí.",
  ],
  // ⚠️ A frase fala de ENDEREÇO e não de "apartamento": a mesma tela serve
  // condomínio e bairro, e no bairro não existe unidade nenhuma a confirmar.
  listResidentToPublish: [
    "Confirme seu endereço para anunciar aqui.",
    "Confirm your address to advertise here.",
    "Confirma tu dirección para anunciar aquí.",
  ],
};

let totalAdded = 0;
LOCALES.forEach((locale, idx) => {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  dict.Community = dict.Community || {};
  let added = 0;
  for (const [key, values] of Object.entries(NEW_COMMUNITY)) {
    if (dict.Community[key] === undefined) {
      dict.Community[key] = values[idx];
      added += 1;
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
  console.log(`${locale}: ${added} chaves adicionadas ao ns Community`);
  totalAdded += added;
});
console.log(`total: ${totalAdded}`);
