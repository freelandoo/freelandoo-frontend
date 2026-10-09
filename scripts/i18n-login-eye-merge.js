/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente — o olho de mostrar/ocultar a senha no /login (2026-10-09).
// Fill-if-absent no ns `Auth`. Uso: node scripts/i18n-login-eye-merge.js
const fs = require("fs");
const path = require("path");
const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");
const NEW_AUTH = {
  showPassword: ["Mostrar senha", "Show password", "Mostrar contraseña"],
  hidePassword: ["Ocultar senha", "Hide password", "Ocultar contraseña"],
  emailPlaceholder: ["seu@email.com", "you@email.com", "tu@email.com"],
};
let touched = 0;
LOCALES.forEach((locale, idx) => {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  dict.Auth = dict.Auth || {};
  for (const [key, values] of Object.entries(NEW_AUTH)) {
    if (dict.Auth[key] === undefined) {
      dict.Auth[key] = values[idx];
      touched++;
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
});
console.log(`i18n login eye: ${touched} chaves adicionadas`);
