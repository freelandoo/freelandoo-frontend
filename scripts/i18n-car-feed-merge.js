/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves do FEED DE CARROS (mig 259).
//
// O carro deixou de ser "uma comunidade por modelo" e virou "uma por carro do
// dono", como o pet. O que junta os donos do mesmo modelo passou a ser o feed
// da página de carro, com o recorte "todos os carros" × "mesmo carro que o meu".
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-car-feed-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const COMMUNITY = {
  carFeedScopeAria: ["Filtrar o feed de carros", "Filter the car feed", "Filtrar el feed de autos"],
  carFeedAll: ["Todos os carros", "All cars", "Todos los autos"],
  carFeedSameModel: ["Mesmo carro que o meu", "Same car as mine", "Mismo auto que el mío"],
  carFeedNeedsModel: [
    "Escolha o modelo de um dos seus carros para ver quem tem o mesmo.",
    "Pick the model of one of your cars to see who has the same one.",
    "Elige el modelo de uno de tus autos para ver quién tiene el mismo.",
  ],

  // O assunto (pet/carro) virou o pill LARANJA do headcard (2026-09-24).
  subjectPillMyCar: ["Meu carro", "My car", "Mi auto"],
  subjectPillCar: ["O carro", "The car", "El auto"],
  subjectPillMyPet: ["Meu pet", "My pet", "Mi mascota"],
  subjectPillPet: ["O pet", "The pet", "La mascota"],
  subjectPillCarAria: ["Abrir a marca e o modelo do carro", "Open the car's make and model", "Abrir la marca y el modelo del auto"],
  subjectPillPetAria: ["Abrir a espécie e a raça do pet", "Open the pet's species and breed", "Abrir la especie y la raza de la mascota"],
  carModelHint: [
    "Escolha a marca e o modelo: é por eles que o filtro “Mesmo carro que o meu” encontra quem tem o mesmo carro.",
    "Pick the make and model: that's how the “Same car as mine” filter finds people with the same car.",
    "Elige la marca y el modelo: así el filtro “Mismo auto que el mío” encuentra a quien tiene el mismo auto.",
  ],
  carPickModelFirst: ["Escolha a marca e o modelo.", "Pick the make and model.", "Elige la marca y el modelo."],
  subjectSave: ["Salvar", "Save", "Guardar"],
  // O acento padrão do carro (cinza claro), 3ª passada da paleta.
  accentSilver: ["Cinza claro", "Light gray", "Gris claro"],
  // O acento travado do pet (bege e marrom).
  accentBrown: ["Marrom", "Brown", "Marrón"],
  subjectNotSet: ["O dono ainda não informou.", "The owner hasn't filled this in yet.", "El dueño aún no lo informó."],
};

const NAMESPACES = { Community: COMMUNITY };

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
console.log(`i18n car feed: ${added} chaves adicionadas`);
