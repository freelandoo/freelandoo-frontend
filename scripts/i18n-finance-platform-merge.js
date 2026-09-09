/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves da PLATAFORMA FINANCEIRO (2026-09-08).
//
// A raiz da Carteira virou o Financeiro — a plataforma financeira da Freelandoo
// inteira, onde todo mundo publica — e o dinheiro da pessoa desceu para a
// página do pill verde (/wallet/carteira). Daí o par eyebrow/título novo, os
// rótulos do menu de publicar e o texto do mural.
//
// Os rótulos de tipo de post (Post/Curto/Bee/Recado) ganham chaves PRÓPRIAS no
// ns Wallet em vez de importar as do ns Community: cada namespace é fechado, e
// ler a chave do outro faria a tela cair no fallback em português assim que
// alguém mexesse lá.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no
// dicionário.
//
// Inclui as chaves do RANKING do Financeiro (mesma entrega).
//
// Uso: node scripts/i18n-finance-platform-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const WALLET = {
  financeEyebrow: ["o seu mundo", "your world", "tu mundo"],
  financeTitle: ["Financeiro", "Finance", "Financiero"],
  financeWallTitle: ["O mural do dinheiro", "The money wall", "El muro del dinero"],
  financeIntro: [
    "Aqui é de todo mundo: ninguém entra, todo mundo publica. O que você postar sobre dinheiro aparece nesta parede e, se você quiser, também no feed geral.",
    "This one belongs to everyone: no joining, everyone posts. What you publish about money shows up on this wall and, if you want, on the main feed too.",
    "Este es de todos: nadie entra, todos publican. Lo que publiques sobre dinero aparece en este muro y, si quieres, también en el feed general.",
  ],
  financeLoadError: [
    "Não deu pra abrir o Financeiro.",
    "Couldn't open Finance.",
    "No se pudo abrir Financiero.",
  ],
  publishFinanceCta: ["Publicar no Financeiro", "Post to Finance", "Publicar en Financiero"],
  composeCta: ["Publicar", "Publish", "Publicar"],
  postLabel: ["Post", "Post", "Post"],
  curtoLabel: ["Curto", "Short", "Corto"],
  beeLabel: ["Bee", "Bee", "Bee"],
  recadoLabel: ["Recado", "Note", "Recado"],
  rankingCta: ["Ver o ranking", "See the ranking", "Ver el ranking"],
  rankingEyebrow: ["quem move o dinheiro", "who moves the money", "quién mueve el dinero"],
  rankingTitle: ["Ranking", "Ranking", "Ranking"],
  scopeCity: ["Minha cidade", "My city", "Mi ciudad"],
  scopeState: ["Meu estado", "My state", "Mi estado"],
  rankingYou: ["Sua posição", "Your position", "Tu posición"],
  rankingLegend: ["Como pontua:", "How it scores:", "Cómo puntúa:"],
  rankingLegendLike: ["curtida", "like", "me gusta"],
  rankingLegendComment: ["comentário", "comment", "comentario"],
  rankingLegendShare: ["compartilhamento", "share", "compartido"],
  rankingLegendSelf: [
    "O que você mesmo curte no seu post não conta.",
    "What you like on your own post doesn't count.",
    "Lo que te gusta en tu propio post no cuenta.",
  ],
  rankingNoPlaceTitle: [
    "Diga em que cidade você está",
    "Tell us which city you're in",
    "Dinos en qué ciudad estás",
  ],
  rankingNoPlaceDesc: [
    "A fila do Financeiro é por cidade e por estado. Complete a cidade no seu perfil para entrar nela.",
    "The Finance ranking is by city and state. Fill in your city on your profile to join it.",
    "La fila de Financiero es por ciudad y estado. Completa tu ciudad en el perfil para entrar.",
  ],
  rankingNoPlaceCta: ["Completar meu perfil", "Complete my profile", "Completar mi perfil"],
  rankingEmptyTitle: [
    "A fila ainda está vazia por aqui",
    "The ranking is still empty here",
    "La fila todavía está vacía aquí",
  ],
  rankingEmptyDesc: [
    "Ninguém pontuou ainda neste recorte. Publique no Financeiro: curtida, comentário e compartilhamento dos outros viram pontos.",
    "Nobody has scored here yet. Post on Finance: other people's likes, comments and shares turn into points.",
    "Nadie puntuó aquí todavía. Publica en Financiero: los me gusta, comentarios y compartidos de otros se vuelven puntos.",
  ],
  rankingEmptyCta: ["Ir para o mural", "Go to the wall", "Ir al muro"],
  walletPill: ["Carteira", "Wallet", "Cartera"],
  walletPillAria: [
    "Minha carteira: vida financeira, ganhos e extrato",
    "My wallet: financial life, earnings and statement",
    "Mi cartera: vida financiera, ganancias y extracto",
  ],
};

let touched = 0;

LOCALES.forEach((locale, idx) => {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  dict.Wallet = dict.Wallet || {};
  for (const [key, values] of Object.entries(WALLET)) {
    if (dict.Wallet[key] === undefined) {
      dict.Wallet[key] = values[idx];
      touched++;
      console.log(`[${locale}] + Wallet.${key}`);
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
});

console.log(touched === 0 ? "nada a fazer (idempotente)" : `${touched} chave(s) gravada(s)`);
