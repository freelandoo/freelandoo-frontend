// scripts/i18n-server-compose-merge.js
//
// Chaves da tela de publicação depois que a composição de vídeo saiu do celular
// e foi para o servidor.
//
// ⚠️ "Renderizando" virou MENTIRA no caminho de vídeo: não há render local
// nenhum — o aparelho manda o arquivo cru e quem compõe é o servidor. E o que
// demora agora é o ENVIO, seguido de uma espera enquanto o ffmpeg trabalha. Sem
// dizer em que fase está, a pessoa fica olhando uma barra que passa minutos
// perto de 100% e conclui que travou.
//
// Fill-if-absent, idempotente: rodar duas vezes acrescenta 0 na segunda.

const fs = require("fs");
const path = require("path");

const DICTS = { pt: "pt-BR.json", en: "en.json", es: "es.json" };
const DIR = path.join(__dirname, "..", "messages");

const COMPOSER = {
  "publish.publishing": ["Publicando", "Publishing", "Publicando"],
  "publish.preparing": ["Preparando", "Preparing", "Preparando"],
  "publish.processing": [
    "Finalizando no servidor",
    "Finishing up on the server",
    "Finalizando en el servidor",
  ],
  // Falhas do lado do CLIENTE. As do servidor chegam prontas e passam direto —
  // trocá-las por uma frase genérica apagaria a única informação útil.
  "errors.uploadNetwork": [
    "Falha de rede no envio. Confira sua conexão e tente de novo.",
    "Network error while uploading. Check your connection and try again.",
    "Error de red al enviar. Revisa tu conexión e inténtalo de nuevo.",
  ],
  "errors.uploadCanceled": ["Envio cancelado.", "Upload canceled.", "Envío cancelado."],
};

let total = 0;
for (const [lang, file] of Object.entries(DICTS)) {
  const p = path.join(DIR, file);
  const dict = JSON.parse(fs.readFileSync(p, "utf8"));
  dict.Composer = dict.Composer || {};
  const idx = { pt: 0, en: 1, es: 2 }[lang];
  let added = 0;
  for (const [key, values] of Object.entries(COMPOSER)) {
    if (dict.Composer[key] === undefined) {
      dict.Composer[key] = values[idx];
      added++;
    }
  }
  fs.writeFileSync(p, JSON.stringify(dict, null, 2) + "\n", "utf8");
  console.log(`${file}: ${added} chaves adicionadas`);
  total += added;
}
console.log(`total: ${total}`);
