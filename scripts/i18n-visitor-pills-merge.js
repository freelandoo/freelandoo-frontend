/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente dos pills que o VISITANTE vê atrás da foto de outra pessoa
// (Business, Pet, Carro, Games — decisão do Alex, 2026-09-25).
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-visitor-pills-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const SPACES = {
  visitorPet: ["Pet", "Pet", "Mascota"],
  visitorCar: ["Carro", "Car", "Auto"],
  visitorBusinessAria: ["Abrir o negócio de {who}", "Open {who}'s business", "Abrir el negocio de {who}"],
  visitorPetAria: ["Abrir o pet de {who}", "Open {who}'s pet", "Abrir la mascota de {who}"],
  visitorCarAria: ["Abrir o carro de {who}", "Open {who}'s car", "Abrir el auto de {who}"],
  visitorGamesAria: ["Abrir o games de {who}", "Open {who}'s games", "Abrir los games de {who}"],
};

const NAMESPACES = { Spaces: SPACES };

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
