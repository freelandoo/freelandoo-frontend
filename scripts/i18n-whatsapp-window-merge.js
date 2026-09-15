/**
 * i18n — a janela de 24h do WhatsApp oficial (W4).
 *
 * Fill-if-absent, idempotente: nunca sobrescreve o que já existe. Rodar duas
 * vezes tem que dizer "0 chaves adicionadas" na segunda.
 */
const fs = require("fs");
const path = require("path");

const DICTS = ["pt-BR", "en", "es"];
const NS = "Whatsapp";

const KEYS = {
  windowClosedTitle: [
    "A janela de 24h desta conversa fechou",
    "This conversation's 24h window has closed",
    "La ventana de 24 h de esta conversación se cerró",
  ],
  windowClosedHint: [
    "É uma regra do WhatsApp oficial: você só pode responder até 24h depois da última mensagem do cliente. Assim que ele escrever de novo, o campo volta sozinho.",
    "It's an official WhatsApp rule: you can only reply within 24h of the customer's last message. As soon as they write again, the field comes back on its own.",
    "Es una regla oficial de WhatsApp: solo puedes responder hasta 24 h después del último mensaje del cliente. En cuanto vuelva a escribir, el campo se reactiva solo.",
  ],
  windowEndingSoon: [
    "Esta conversa fecha para resposta em {time}.",
    "This conversation closes for replies in {time}.",
    "Esta conversación se cierra para respuestas en {time}.",
  ],
  hoursShort: ["{n}h", "{n}h", "{n} h"],
  minutesShort: ["{n} min", "{n} min", "{n} min"],
};

let added = 0;
for (let i = 0; i < DICTS.length; i += 1) {
  const file = path.join(__dirname, "..", "messages", `${DICTS[i]}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  dict[NS] = dict[NS] || {};
  for (const [key, values] of Object.entries(KEYS)) {
    if (dict[NS][key] === undefined) {
      dict[NS][key] = values[i];
      added += 1;
    }
  }
  fs.writeFileSync(file, `${JSON.stringify(dict, null, 2)}\n`, "utf8");
}
console.log(`${added} chaves adicionadas.`);
