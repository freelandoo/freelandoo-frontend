/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente — a foto da comunidade vira OVERRIDE da foto de perfil do
// dono (2026-09-27) e o "+" na foto passa a ser a porta de adicionar outro pet
// ou carro.
//
// Pedido do Alex: "precisa ter um botãozinho embaixo com o ícone de máquina
// fotográfica para trocar somente para aquela comunidade específica" e "você
// só pode adicionar um perfil dentro daquela comunidade pelo mais".
//
// ns `Community`, fill-if-absent. Uso: node scripts/i18n-community-photo-override-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] — só entra se ainda não existir. */
const NEW_COMMUNITY = {
  changePhotoHere: [
    "Trocar a foto só nesta comunidade",
    "Change the photo for this community only",
    "Cambiar la foto solo en esta comunidad",
  ],
  changePhotoAgain: ["Trocar foto", "Change photo", "Cambiar foto"],
  usePhotoOfProfile: ["Usar a foto do meu perfil", "Use my profile photo", "Usar la foto de mi perfil"],
  photoOnlyHereHint: [
    "A troca vale só aqui. Nas outras comunidades continua a foto do seu perfil.",
    "The change applies here only. Your other communities keep your profile photo.",
    "El cambio vale solo aquí. En las otras comunidades sigue la foto de tu perfil.",
  ],
  photoResetError: [
    "Não foi possível voltar à foto do perfil.",
    "Couldn't switch back to your profile photo.",
    "No se pudo volver a la foto del perfil.",
  ],
  addAnotherPet: ["Adicionar outro pet", "Add another pet", "Agregar otra mascota"],
  addAnotherCar: ["Adicionar outro carro", "Add another car", "Agregar otro auto"],
  addSubjectError: [
    "Não foi possível adicionar agora.",
    "Couldn't add it right now.",
    "No se pudo agregar ahora.",
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
