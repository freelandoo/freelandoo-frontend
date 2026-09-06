/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves da COMPOSIÇÃO do site da comunidade (2026-09-06).
//
// O que entrou: a casca (barra de navegação, rodapé, botão flutuante), o
// segundo botão e o indicador de rolagem do banner, o ícone dos destaques, a
// data dos depoimentos, os rótulos dos canais de contato e as duas seções
// novas — "Chamada" e "Quem está por trás".
//
// Tudo no namespace `CommunitySite`, que já existe.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no
// dicionário. Rodar duas vezes tem que somar zero na segunda.
//
// Uso: node scripts/i18n-site-composition-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const COMMUNITY_SITE = {
  // ─── Casca: barra, rodapé, botão flutuante ───────────────────────────────
  navOpen: ["Abrir menu", "Open menu", "Abrir menú"],
  navClose: ["Fechar menu", "Close menu", "Cerrar menú"],
  navWhatsapp: ["WhatsApp", "WhatsApp", "WhatsApp"],
  footerRights: [
    "Todos os direitos reservados.",
    "All rights reserved.",
    "Todos los derechos reservados.",
  ],

  // ─── Banner ──────────────────────────────────────────────────────────────
  heroCtaSecondaryText: ["Texto do 2º botão", "Second button text", "Texto del 2º botón"],
  heroCtaSecondaryUrl: [
    "Link do 2º botão (vazio = seção abaixo)",
    "Second button link (empty = section below)",
    "Enlace del 2º botón (vacío = sección de abajo)",
  ],
  heroScrollHint: ["Ver o que vem abaixo", "See what is below", "Ver lo que viene abajo"],

  // ─── Sobre ───────────────────────────────────────────────────────────────
  aboutHighlightIcon: ["Ícone", "Icon", "Icono"],

  // ─── Depoimentos ─────────────────────────────────────────────────────────
  testimonialDate: ["Data", "Date", "Fecha"],

  // ─── Contato ─────────────────────────────────────────────────────────────
  contactAddressLabel: ["Endereço", "Address", "Dirección"],
  contactWhatsappLabel: ["WhatsApp", "WhatsApp", "WhatsApp"],
  contactEmailLabel: ["E-mail", "Email", "Correo"],
  contactHoursLabel: ["Horários", "Hours", "Horarios"],
  contactMapTitle: ["Mapa do endereço", "Address map", "Mapa de la dirección"],

  // ─── Seções novas: rótulo no menu e na barra de ações ────────────────────
  sectionCta: ["Chamada", "Call to action", "Llamada"],
  sectionPerson: ["Quem está por trás", "Who is behind it", "Quién está detrás"],

  // ─── Bloco de chamada ────────────────────────────────────────────────────
  ctaBadge: [
    "Um selo curto (ex.: atendimento com hora marcada)",
    "A short badge (e.g. by appointment only)",
    "Una insignia corta (ej.: atención con hora marcada)",
  ],
  ctaItemLabel: ["Rótulo", "Label", "Etiqueta"],
  ctaItemValue: ["Valor", "Value", "Valor"],
  ctaAddItem: ["Nova informação", "New detail", "Nueva información"],
  ctaRemoveItem: ["Remover informação", "Remove detail", "Quitar información"],
  ctaButtonText: ["Texto do botão", "Button text", "Texto del botón"],
  ctaButtonUrl: [
    "Link do botão (https://...)",
    "Button link (https://...)",
    "Enlace del botón (https://...)",
  ],
  ctaNote: [
    "Uma observação curta (opcional)",
    "A short note (optional)",
    "Una nota corta (opcional)",
  ],

  // ─── Quem está por trás ──────────────────────────────────────────────────
  personBody: [
    "Quem é essa pessoa e o que ela faz.",
    "Who this person is and what they do.",
    "Quién es esta persona y qué hace.",
  ],
  personTag: ["Selo", "Badge", "Insignia"],
  personAddTag: ["Novo selo", "New badge", "Nueva insignia"],
  personRemoveTag: ["Remover selo", "Remove badge", "Quitar insignia"],
  personCtaText: ["Texto do botão", "Button text", "Texto del botón"],
  personCtaUrl: [
    "Link do botão (https://...)",
    "Button link (https://...)",
    "Enlace del botón (https://...)",
  ],
};

const NAMESPACES = { CommunitySite: COMMUNITY_SITE };

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
  console.log(`✓ ${locale}.json`);
}

console.log(`Chaves adicionadas: ${added}`);
