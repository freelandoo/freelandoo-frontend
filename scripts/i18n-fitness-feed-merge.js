/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente — a raiz do /fitness vira o FEED da plataforma (mig 276,
// 2026-10-09) e o "Meu dia" (calorias, água, refeições) vai para o topo do
// Histórico.
//
// NEW_FITNESS é fill-if-absent. OVERRIDE sobrescreve chaves que já existiam e
// passaram a descrever a tela errada (dicionário vence fallback inline, então
// trocar só o componente não mudaria a tela).
//
// Uso: node scripts/i18n-fitness-feed-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] — só entra se ainda não existir. */
const NEW_FITNESS = {
  feedLoadError: ["Não deu pra abrir o feed do Fitness.", "Couldn't open the Fitness feed.", "No se pudo abrir el feed de Fitness."],
  postLabel: ["Post", "Post", "Post"],
  curtoLabel: ["Curto", "Short", "Corto"],
  beeLabel: ["Bee", "Bee", "Bee"],
  recadoLabel: ["Recado", "Note", "Recado"],
  publishCta: ["Publicar no Fitness", "Post on Fitness", "Publicar en Fitness"],
  composeCta: ["Publicar", "Post", "Publicar"],
  loadMore: ["Carregar mais", "Load more", "Cargar más"],
};

/** chave → [pt, en, es] — SOBRESCREVE. */
const OVERRIDE = {
  historyPillAria: [
    "Calorias, água, refeições, peso e o histórico dos seus dias",
    "Calories, water, meals, weight and the history of your days",
    "Calorías, agua, comidas, peso y el historial de tus días",
  ],
  historyDaysHint: [
    "Os dias em que você registrou comida ou água. Toque num dia para abri-lo lá em cima.",
    "The days you logged food or water. Tap a day to open it up top.",
    "Los días en que registraste comida o agua. Toca un día para abrirlo arriba.",
  ],
  historyDaysEmpty: [
    "O que você come e bebe fica guardado aqui, um dia por linha.",
    "What you eat and drink is kept here, one day per line.",
    "Lo que comes y bebes queda guardado aquí, un día por línea.",
  ],
};

let touched = 0;

LOCALES.forEach((locale, idx) => {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  dict.Fitness = dict.Fitness || {};

  for (const [key, values] of Object.entries(NEW_FITNESS)) {
    if (dict.Fitness[key] === undefined) {
      dict.Fitness[key] = values[idx];
      touched++;
    }
  }
  for (const [key, values] of Object.entries(OVERRIDE)) {
    if (dict.Fitness[key] !== values[idx]) {
      dict.Fitness[key] = values[idx];
      touched++;
    }
  }

  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
});

console.log(`i18n fitness feed: ${touched} chaves gravadas`);
