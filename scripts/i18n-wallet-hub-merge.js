/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves da Carteira-hub (2026-09-04).
//
// Duas frentes:
//   Wallet — o headcard novo e os três botões retráteis desta tela (cofrinho,
//            porcentagem e gráfico). Cada um tem rótulo (o que aparece quando o
//            botão abre) e aria-label (o que o leitor de tela anuncia enquanto
//            ele está fechado, mostrando só o ícone).
//   Spaces — "Meus filhos", que substituiu Games e Academia no menu da foto de
//            perfil. As chaves `myGames`, `myAcademy`, `newGame`,
//            `findAcademy`, `academyOwner` e `academyMember` ficam ÓRFÃS de
//            propósito: as duas linhas saíram do menu porque já são botão do
//            headcard, e apagar chave de dicionário é o tipo de limpeza que
//            quebra tradução alheia sem avisar.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no
// dicionário.
//
// Uso: node scripts/i18n-wallet-hub-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const WALLET = {
  vaquinhaPill: ["Vaquinha", "Fundraiser", "Vaquita"],
  vaquinhaPillAria: [
    "Abrir minha vaquinha",
    "Open my fundraiser",
    "Abrir mi vaquita",
  ],
  couponPill: ["Meu cupom", "My coupon", "Mi cupón"],
  couponPillAria: [
    "Meu cupom, extrato e painel do afiliado",
    "My coupon, statement and affiliate panel",
    "Mi cupón, extracto y panel de afiliado",
  ],
  marketPill: ["Mercado", "Market", "Mercado"],
  marketPillAria: [
    "Notícias de mercado, cotações e ações em alta",
    "Market news, quotes and top gainers",
    "Noticias de mercado, cotizaciones y acciones en alza",
  ],
  headcardHint: [
    "Os botões atrás da foto abrem o cofrinho, o cupom e o mercado. O primeiro toque mostra o nome; o segundo abre.",
    "The buttons behind the photo open your fundraiser, your coupon and the market. The first tap shows the name; the second opens it.",
    "Los botones detrás de la foto abren la vaquita, el cupón y el mercado. El primer toque muestra el nombre; el segundo abre.",
  ],
};

const SPACES = {
  myChildren: ["Meus filhos", "My children", "Mis hijos"],
};

const NAMESPACES = { Wallet: WALLET, Spaces: SPACES };

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
