/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente — CIDADE VIRA SELETOR (2026-09-23).
//
// O campo de cidade era texto livre, e texto livre não casa com tabela: quem
// digitasse "sao bernardo" recebia busca vazia, indistinguível de "não há
// empresas nessa cidade". Agora é um combobox alimentado pela API do IBGE — a
// MESMA fonte que carimbou a cidade de cada empresa da base fria.
//
// As três chaves são os estados do seletor, e cada uma existe porque a ausência
// dela deixaria a lista muda num momento diferente:
//   cityNeedsUf  → sem estado escolhido não há lista para pedir ao IBGE
//   cityLoading  → a lista vem pela rede; sem isto a caixa abre vazia e parece
//                  "nenhuma cidade" justamente enquanto ela está chegando
//   cityNoMatch  → digitou algo que não existe; "nada" sem frase parece defeito
//
// Namespace `Leads`. Fill-if-absent, sem override.
//
// Uso: node scripts/i18n-city-picker-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] — só entra se ainda não existir. */
const NEW = {
  cityNeedsUf: [
    "escolha o estado primeiro",
    "pick the state first",
    "elige el estado primero",
  ],
  cityLoading: [
    "carregando cidades…",
    "loading cities…",
    "cargando ciudades…",
  ],
  cityNoMatch: [
    "nenhuma cidade com esse nome",
    "no city by that name",
    "ninguna ciudad con ese nombre",
  ],
};

let added = 0;
LOCALES.forEach((locale, idx) => {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  dict.Leads = dict.Leads || {};
  let a = 0;
  for (const [key, values] of Object.entries(NEW)) {
    if (dict.Leads[key] === undefined) {
      dict.Leads[key] = values[idx];
      a += 1;
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
  console.log(`${locale}: ${a} adicionadas (ns Leads)`);
  added += a;
});
console.log(`total: ${added} adicionadas`);
