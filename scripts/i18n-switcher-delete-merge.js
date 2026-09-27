/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente — a lixeira dos modais "Meus perfis" e "Meus pets"/"Meus
// carros" (2026-09-27), com a confirmação de que não tem volta e que isenta a
// plataforma. Pedido do Alex: "coloque um botão de lixinho (...) e aparece o
// modal eximindo a plataforma de qualquer responsabilidade e para ela aceitar
// que não tem volta".
//
// ns `Account` (troca-perfil) e `Community` (pet/carro), fill-if-absent.
// Uso: node scripts/i18n-switcher-delete-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

const SHARED = {
  deleteDisclaimer: [
    "Esta ação é definitiva e não tem volta. A Freelandoo não se responsabiliza por nada que se perca com a exclusão — conteúdo, contatos, vendas ou alcance.",
    "This action is permanent and cannot be undone. Freelandoo is not responsible for anything lost with the deletion — content, contacts, sales or reach.",
    "Esta acción es definitiva y no tiene vuelta atrás. Freelandoo no se responsabiliza por nada que se pierda con la eliminación — contenido, contactos, ventas o alcance.",
  ],
  deleteAccept: [
    "Entendo que não tem volta e isento a Freelandoo de qualquer responsabilidade.",
    "I understand this cannot be undone and release Freelandoo from any responsibility.",
    "Entiendo que no tiene vuelta atrás y eximo a Freelandoo de cualquier responsabilidad.",
  ],
  deleteConfirm: ["Excluir definitivamente", "Delete permanently", "Eliminar definitivamente"],
  deleteCancel: ["Cancelar", "Cancel", "Cancelar"],
};

const NEW = {
  Account: {
    ...SHARED,
    deleteProfileTrash: ["Excluir {name}", "Delete {name}", "Eliminar {name}"],
    deleteProfileTitle: ["Excluir perfil", "Delete profile", "Eliminar perfil"],
    deleteProfileBody: [
      "O perfil \"{name}\" será excluído, com os posts, serviços, produtos e seguidores dele.",
      "The profile \"{name}\" will be deleted, along with its posts, services, products and followers.",
      "El perfil \"{name}\" será eliminado, con sus publicaciones, servicios, productos y seguidores.",
    ],
    deleteProfileError: ["Não foi possível excluir o perfil.", "Couldn't delete the profile.", "No se pudo eliminar el perfil."],
  },
  Community: {
    ...SHARED,
    deleteSubjectTrash: ["Excluir {name}", "Delete {name}", "Eliminar {name}"],
    deletePetTitle: ["Excluir pet", "Delete pet", "Eliminar mascota"],
    deleteCarTitle: ["Excluir carro", "Delete car", "Eliminar auto"],
    deletePetBody: [
      "\"{name}\" será excluído e o feed dele deixa de existir. Seus posts continuam no seu perfil.",
      "\"{name}\" will be deleted and its feed will no longer exist. Your posts stay on your profile.",
      "\"{name}\" será eliminado y su feed dejará de existir. Tus publicaciones siguen en tu perfil.",
    ],
    deleteCarBody: [
      "\"{name}\" será excluído e o feed dele deixa de existir. Seus posts continuam no seu perfil.",
      "\"{name}\" will be deleted and its feed will no longer exist. Your posts stay on your profile.",
      "\"{name}\" será eliminado y su feed dejará de existir. Tus publicaciones siguen en tu perfil.",
    ],
    deleteSubjectError: ["Não foi possível excluir.", "Couldn't delete it.", "No se pudo eliminar."],
  },
};

let totalAdded = 0;
LOCALES.forEach((locale, idx) => {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  let added = 0;
  for (const [ns, keys] of Object.entries(NEW)) {
    dict[ns] = dict[ns] || {};
    for (const [key, values] of Object.entries(keys)) {
      if (dict[ns][key] === undefined) {
        dict[ns][key] = values[idx];
        added += 1;
      }
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
  console.log(`${locale}: ${added} chaves adicionadas`);
  totalAdded += added;
});
console.log(`total: ${totalAdded}`);
