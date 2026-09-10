/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente — o /fitness vira PLATAFORMA nos moldes do Games e do
// Financeiro (2026-09-10): casca, headcard com a foto 2/3 e quatro pills
// atrás dela (Minha academia laranja · Treino rosa · Histórico turquesa ·
// Indicadores turquesa), cada um com sala própria.
//
// Pedido do Alex: "o card da foto precisa ficar retangular na mesma proporção
// dos outros do game, do financeiro. e você precisa colocar os pills, os
// botões atrás do card igual no financeiro e no games".
//
// Só chaves NOVAS no ns `Fitness`, fill-if-absent. As chaves da aba antiga
// (`tabDay`/`tabIndicators`) e do header antigo (`eyebrow`, `title`) ficam
// órfãs, padrão da casa.
//
// Uso: node scripts/i18n-fitness-platform-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] — só entra se ainda não existir. */
const NEW_FITNESS = {
  platformTitle: ["Fitness", "Fitness", "Fitness"],
  platformLabel: ["Plataforma", "Platform", "Plataforma"],
  today: ["Hoje", "Today", "Hoy"],
  loadFailedTitle: ["Não deu pra carregar.", "Couldn't load.", "No se pudo cargar."],

  academyPill: ["Minha academia", "My gym", "Mi gimnasio"],
  academyPillAria: [
    "Frequência na catraca e mensalidades da sua academia",
    "Turnstile attendance and your gym's monthly fees",
    "Asistencia en el torniquete y mensualidades de tu gimnasio",
  ],
  workoutPill: ["Treino", "Workout", "Entrenamiento"],
  workoutPillAria: ["A sua ficha de treino de hoje", "Your workout plan for today", "Tu ficha de entrenamiento de hoy"],
  historyPill: ["Histórico", "History", "Historial"],
  historyPillAria: [
    "Peso, altura e o histórico dos seus dias",
    "Weight, height and the history of your days",
    "Peso, altura y el historial de tus días",
  ],
  indicatorsPill: ["Indicadores", "Indicators", "Indicadores"],
  indicatorsPillAria: [
    "Os seus indicadores de saúde e consistência",
    "Your health and consistency indicators",
    "Tus indicadores de salud y constancia",
  ],

  workoutTitle: ["Treino", "Workout", "Entrenamiento"],
  historyTitle: ["Histórico", "History", "Historial"],
  indicatorsTitle: ["Indicadores", "Indicators", "Indicadores"],

  gymNoPayments: ["Nenhuma mensalidade registrada.", "No monthly fees recorded.", "Ninguna mensualidad registrada."],

  historyLoadError: ["Não deu para carregar o histórico.", "Couldn't load the history.", "No se pudo cargar el historial."],
  historyMeasuresTitle: ["Medições", "Measurements", "Mediciones"],
  historyMeasuresEmpty: ["Nenhuma medição ainda.", "No measurements yet.", "Ninguna medición todavía."],
  historyDaysTitle: ["Os seus dias", "Your days", "Tus días"],
  historyDaysHint: [
    "Os dias em que você registrou comida ou água. Toque num dia para abri-lo.",
    "The days you logged food or water. Tap a day to open it.",
    "Los días en que registraste comida o agua. Toca un día para abrirlo.",
  ],
  historyDaysEmptyTitle: ["Nada gravado ainda.", "Nothing saved yet.", "Nada guardado todavía."],
  historyDaysEmpty: [
    "O que você come e bebe no Meu dia fica guardado aqui, um dia por linha.",
    "What you eat and drink in My day is kept here, one day per line.",
    "Lo que comes y bebes en Mi día queda guardado aquí, un día por línea.",
  ],
  historyGoToday: ["Registrar o dia de hoje", "Log today", "Registrar el día de hoy"],
  historyOpenDay: ["Abrir o dia {date}", "Open {date}", "Abrir el día {date}"],
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

  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
});

console.log(`i18n fitness platform: ${touched} chaves adicionadas`);
