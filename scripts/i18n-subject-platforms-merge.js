/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das PLATAFORMAS DE ASSUNTO (mig 262, 2026-09-25): pet e
// carro sem cara de comunidade, a aba "mesmo pet" e a aba "jogando o mesmo".
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-subject-platforms-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const COMMUNITY = {
  subjectProfilePillAria: ["O perfil: nome e texto sobre ele", "The profile: name and description", "El perfil: nombre y descripción"],
  petFeedScopeAria: ["Filtrar o feed de pets", "Filter the pets feed", "Filtrar el feed de mascotas"],
  petFeedAll: ["Todos os pets", "All pets", "Todas las mascotas"],
  petFeedSameBreed: ["Mesmo pet que o meu", "Same pet as mine", "Misma mascota que la mía"],
  petFeedNeedsBreed: [
    "Escolha a raça de um dos seus pets (no botão Meu pet) para ver quem tem a mesma.",
    "Pick the breed of one of your pets (in the My pet button) to see who has the same.",
    "Elige la raza de una de tus mascotas (en el botón Mi mascota) para ver quién tiene la misma.",
  ],
};

const GAMES = {
  feedScopeAria: ["Filtrar o feed de games", "Filter the games feed", "Filtrar el feed de games"],
  feedScopeAll: ["Todos", "Everyone", "Todos"],
  feedScopeSameGame: ["Jogando o mesmo que eu", "Playing the same as me", "Jugando lo mismo que yo"],
  sameGameNeedsTitle: [
    "Você ainda não disse o que está jogando.",
    "You haven't said what you're playing yet.",
    "Aún no dijiste a qué estás jugando.",
  ],
  sameGameNeedsDesc: [
    "Escolha o seu jogo atual para ver quem joga o mesmo.",
    "Pick your current game to see who plays the same.",
    "Elige tu juego actual para ver quién juega lo mismo.",
  ],
  sameGameNeedsCta: ["Escolher meu jogo", "Pick my game", "Elegir mi juego"],
  sameGameEmptyTitle: [
    "Ninguém publicou jogando o mesmo que você.",
    "Nobody playing the same as you has posted yet.",
    "Nadie que juega lo mismo que tú ha publicado.",
  ],
  sameGameEmptyDesc: [
    "Quando alguém com o mesmo jogo atual publicar, aparece aqui.",
    "When someone with the same current game posts, it shows up here.",
    "Cuando alguien con el mismo juego actual publique, aparecerá aquí.",
  ],
};

const NAMESPACES = { Community: COMMUNITY, Games: GAMES };

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
}

console.log(`[i18n] ${added} chave(s) adicionada(s).`);
