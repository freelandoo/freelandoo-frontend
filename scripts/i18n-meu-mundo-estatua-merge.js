// Meu Mundo 3D — lore v2 N3: domingo na estátua (tela da estátua, placar Raposas × Vampiros
// na aba Semana e o botão perto de Aurion/Morkhan). Namespace "MeuMundo".
// Idempotente: chave nova entra; valor que mudou é ATUALIZADO (OVERRIDE), para o
// fallback da tela e as traduções nunca divergirem.
// Rodar: node scripts/i18n-meu-mundo-estatua-merge.js
const fs = require("fs")
const path = require("path")

const TEXT = {
  sttTitleAurion: ["Estátua de Aurion", "Statue of Aurion", "Estatua de Aurion"],
  sttTitleMorkhan: ["Estátua de Morkhan", "Statue of Morkhan", "Estatua de Morkhan"],
  sttGodAurion: ["Aurion", "Aurion", "Aurion"],
  sttGodMorkhan: ["Morkhan", "Morkhan", "Morkhan"],
  sttEyebrow: ["Domingo na estátua", "Sunday at the statue", "Domingo en la estatua"],
  sttEyebrowLive: ["Domingo · ao vivo", "Sunday · live", "Domingo · en vivo"],
  sttRace: ["Raposas × Vampiros", "Foxes × Vampires", "Zorros × Vampiros"],
  sttRaposas: ["Raposas", "Foxes", "Zorros"],
  sttVampiros: ["Vampiros", "Vampires", "Vampiros"],
  sttOf: ["{a} de {b}", "{a} of {b}", "{a} de {b}"],
  sttStage0: ["Dormindo", "Asleep", "Dormida"],
  sttStage1: ["Rachando", "Cracking", "Agrietándose"],
  sttStage2: ["Pedaços soltos", "Pieces falling off", "Pedazos sueltos"],
  sttStage3: ["Olhos acesos", "Eyes lit", "Ojos encendidos"],
  sttStage4: ["Cheia", "Full", "Llena"],
  sttDonors: ["{n} entregaram", "{n} delivered", "{n} entregaron"],
  sttMine: ["Seu néctar para entregar", "Your nectar to deliver", "Tu néctar para entregar"],
  sttToday: ["Neste domingo você entregou {n}.", "This Sunday you delivered {n}.", "Este domingo entregaste {n}."],
  sttDeliver: ["Entregar {n}", "Deliver {n}", "Entregar {n}"],
  sttDelivering: ["Entregando…", "Delivering…", "Entregando…"],
  sttDone: ["Você entregou {n}. A pedra bebeu.", "You delivered {n}. The stone drank it.", "Entregaste {n}. La piedra lo bebió."],
  sttFilled: ["Você entregou {n} e a estátua ENCHEU.", "You delivered {n} and the statue is FULL.", "Entregaste {n} y la estatua se LLENÓ."],
  sttNoClan: ["Escolha o seu povo para entregar néctar.", "Choose your people to deliver nectar.", "Elige tu pueblo para entregar néctar."],
  sttOtherGod: [
    "Esta não é a estátua do seu deus. O seu néctar vai para {god}.",
    "This isn't your god's statue. Your nectar goes to {god}.",
    "Esta no es la estatua de tu dios. Tu néctar va para {god}.",
  ],
  sttNotSunday: [
    "A estátua só recebe néctar no domingo. Abre {when}.",
    "The statue only takes nectar on Sunday. It opens {when}.",
    "La estatua solo recibe néctar el domingo. Abre el {when}.",
  ],
  sttEmpty: [
    "Você não tem néctar para entregar. A sua posição em cada jogo vira néctar quando a semana fecha.",
    "You have no nectar to deliver. Your place in each game turns into nectar when the week closes.",
    "No tienes néctar para entregar. Tu posición en cada juego se convierte en néctar cuando cierra la semana.",
  ],
  sttHowLive: [
    "Cada litro que um povo entrega empurra o seu deus para fora da pedra. A meta cresce com o número de jogadores de cada povo.",
    "Every liter a people delivers pushes its god out of the stone. The goal grows with how many players each people has.",
    "Cada litro que un pueblo entrega empuja a su dios fuera de la piedra. La meta crece con el número de jugadores de cada pueblo.",
  ],
  sttHowLast: [
    "Resultado do último domingo. A meta cresce com o número de jogadores de cada povo.",
    "Last Sunday's result. The goal grows with how many players each people has.",
    "Resultado del último domingo. La meta crece con el número de jugadores de cada pueblo.",
  ],
  sttRaceLive: ["Domingo na estátua · ao vivo", "Sunday at the statue · live", "Domingo en la estatua · en vivo"],
  sttRaceLast: ["Último domingo na estátua", "Last Sunday at the statue", "Último domingo en la estatua"],
  sttWhereRaposa: [
    "No domingo, leve o néctar ao pé de Aurion, no meio do seu bairro.",
    "On Sunday, bring your nectar to Aurion's feet, in the middle of your neighborhood.",
    "El domingo, lleva el néctar a los pies de Aurion, en el centro de tu barrio.",
  ],
  sttWhereVampiro: [
    "No domingo, leve o néctar ao pé de Morkhan, na praça do centro.",
    "On Sunday, bring your nectar to Morkhan's feet, in the downtown square.",
    "El domingo, lleva el néctar a los pies de Morkhan, en la plaza del centro.",
  ],
}

const dir = path.join(__dirname, "..", "messages")
const LOCALES = ["pt-BR", "en", "es"]
let changed = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo = json.MeuMundo || {}
  for (const [key, vals] of Object.entries(TEXT)) {
    if (!Array.isArray(vals) || vals.length !== 3) throw new Error(`chave ${key}: precisa de [pt, en, es]`)
    if (json.MeuMundo[key] !== vals[i]) {
      json.MeuMundo[key] = vals[i]
      changed++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n meu-mundo estátua: ${changed} chaves gravadas`)
