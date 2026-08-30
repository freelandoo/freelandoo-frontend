/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves do RECADO (post só-texto, mig 209).
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
// A exceção é o bloco OVERRIDES no fim, para chaves cujo TEXTO mudou por decisão
// do Alex ("todos os textos serão chamados de recados, postar recado"): ali a
// gravação é forçada, senão o dicionário antigo continuaria vencendo o fallback.
//
// Uso: node scripts/i18n-recado-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const COMPOSER = {
  "mode.recado": ["Novo Recado", "New Note", "Nuevo Recado"],
  recadoClose: ["Fechar", "Close", "Cerrar"],
  recadoPlaceholder: [
    "Escreva o que você quer dizer...",
    "Write what you want to say...",
    "Escribe lo que quieres decir...",
  ],
  recadoPublish: ["Postar recado", "Post note", "Publicar recado"],
};

const FEED = {
  createRecado: ["Recado", "Note", "Recado"],
};

const ACCOUNT = {
  menuRecado: ["Recado", "Note", "Recado"],
};

const PROFILE = {
  menuRecado: ["Recado", "Note", "Recado"],
};

const ACADEMIES = {
  recadoLabel: ["Recado", "Note", "Recado"],
};

const NAMESPACES = {
  Composer: COMPOSER,
  Feed: FEED,
  Account: ACCOUNT,
  Profile: PROFILE,
  Academies: ACADEMIES,
};

// Textos que MUDARAM (não é chave nova) — gravação forçada.
const OVERRIDES = {
  Academies: {
    composerCta: [
      "Poste ou escreva um recado",
      "Post or write a note",
      "Publica o escribe un recado",
    ],
  },
  Community: {
    // Era "Publicar recado"; o verbo do Alex é "postar".
    recadoPublish: ["Postar recado", "Post note", "Publicar recado"],
  },
  Vaquinha: {
    // A vaquinha já publicava só-texto sob o rótulo "Texto" — mesmo objeto,
    // nome novo: todo texto na plataforma chama recado.
    kindText: ["Recado", "Note", "Recado"],
  },
};

let added = 0;
let overridden = 0;

for (let i = 0; i < LOCALES.length; i++) {
  const locale = LOCALES[i];
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));

  for (const [ns, keys] of Object.entries(NAMESPACES)) {
    if (!dict[ns]) dict[ns] = {};
    for (const [key, values] of Object.entries(keys)) {
      if (dict[ns][key] === undefined) {
        dict[ns][key] = values[i];
        added++;
      }
    }
  }

  for (const [ns, keys] of Object.entries(OVERRIDES)) {
    if (!dict[ns]) dict[ns] = {};
    for (const [key, values] of Object.entries(keys)) {
      if (dict[ns][key] !== values[i]) {
        dict[ns][key] = values[i];
        overridden++;
      }
    }
  }

  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
  console.log(`✓ ${locale}.json`);
}

console.log(`Chaves adicionadas: ${added} · textos atualizados: ${overridden}`);
