/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente — LEADS: o vazio que dizia a coisa errada (2026-09-23).
//
// Queixa do Alex: "não está puxando nada". A base estava vazia, mas o que
// mantinha a tela vazia DEPOIS de encher eram os filtros — e a tela respondia
// "Nada por aqui ainda, aperte Procurar mais", que manda varrer de novo uma
// cidade já varrida: a única ação que não resolve.
//
// Namespace `Leads`. Fill-if-absent para as chaves novas + UM OVERRIDE:
// `cityPlaceholder` valia "São Bernardo do Campo" nos três idiomas — um
// placeholder com cara de valor preenchido, que é o que fazia o campo parecer
// preenchido quando estava vazio. Dicionário vence fallback inline, então
// trocar só o componente não mudaria uma vírgula na tela.
//
// Uso: node scripts/i18n-leads-empty-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] — só entra se ainda não existir. */
const NEW = {
  noResultsFiltered: [
    "Nenhuma passa nos filtros",
    "None match your filters",
    "Ninguna pasa en los filtros",
  ],
  noResultsFilteredText: [
    "Esta cidade já tem {n} empresas na base — os filtros marcados é que não deixaram nenhuma passar.",
    "This city already has {n} companies in the base — it's the filters you picked that let none through.",
    "Esta ciudad ya tiene {n} empresas en la base — son los filtros marcados los que no dejaron pasar ninguna.",
  ],
  noResultsNeedsCnpj: [
    "Capital social e data de abertura vêm do CNPJ: só existem depois de enriquecer a empresa.",
    "Share capital and opening date come from the CNPJ record: they only exist after enriching the company.",
    "Capital social y fecha de apertura vienen del CNPJ: solo existen después de enriquecer la empresa.",
  ],
  clearFilters: ["Limpar filtros", "Clear filters", "Limpiar filtros"],
};

/** chave → [pt, en, es] — SOBRESCREVE o que já está lá. */
const OVERRIDE = {
  cityPlaceholder: ["digite a cidade", "type the city", "escribe la ciudad"],
};

let added = 0;
let replaced = 0;
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
  let r = 0;
  for (const [key, values] of Object.entries(OVERRIDE)) {
    if (dict.Leads[key] !== values[idx]) {
      dict.Leads[key] = values[idx];
      r += 1;
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
  console.log(`${locale}: ${a} adicionadas, ${r} sobrescritas (ns Leads)`);
  added += a;
  replaced += r;
});
console.log(`total: ${added} adicionadas, ${replaced} sobrescritas`);
