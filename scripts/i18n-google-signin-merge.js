/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente — mensagens do botão "Entrar com Google" que estavam em
// português fixo (regra do escoteiro, entrega dos Módulos 04/05 da Arena).
// Reaproveita Errors.timeout/network; acrescenta só as três que faltavam.
// Uso: node scripts/i18n-google-signin-merge.js
const fs = require("fs");
const path = require("path");
const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");
const NEW = {
  timeout: ["Servidor demorou para responder. Tente novamente.", "The server took too long to respond. Please try again.", "El servidor tardó en responder. Inténtalo de nuevo."],
  googleUnavailable: ["Login com Google indisponível no momento.", "Google sign-in is unavailable right now.", "El inicio de sesión con Google no está disponible ahora."],
  googleFailed: ["Erro ao entrar com Google", "Could not sign in with Google", "Error al entrar con Google"],
  googleNoSession: ["Login com Google retornou sem sessão. Tente novamente.", "Google sign-in returned no session. Please try again.", "El inicio con Google no devolvió sesión. Inténtalo de nuevo."],
};
let total = 0;
LOCALES.forEach((locale, idx) => {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  dict.Errors = dict.Errors || {};
  for (const [k, v] of Object.entries(NEW)) {
    if (dict.Errors[k] === undefined) {
      dict.Errors[k] = v[idx];
      total++;
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
});
console.log(`[i18n-google-signin] ${total} chaves adicionadas`);
