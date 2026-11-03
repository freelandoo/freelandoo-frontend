// mm3d-62: Paint — muro de gelatina que empurra, Guardião com placa e retrato,
// fora da partida ao perder para ele. Idempotente (fill-if-absent). node <script> [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const ADD = {
  "pt-BR": {
    paintHowWallJelly: "Muro de gelatina: quem bate nele voa para trás. Jogue no adversário quando ele pular! Ícone da Freelandoo: +{n}.",
    paintHowGoalGuardian: "20 gatinhos do seu time abrem o portal no topo. Na ilha do Guardião vence quem der mais dano — perdeu para ele (ou caiu de lá), acabou a partida para você.",
    paintToastShoved: "Na gelatina! Voou longe",
    paintToastOutFell: "Caiu da ilha do Guardião — fim da partida para você",
    paintToastOutBoss: "O Guardião venceu você — fim da partida",
    paintToastGuardian: "Ilha do Guardião: preto e soco nele — e muro nos outros!",
    paintGuardian: "Guardião",
    paintGuardianName: "GUARDIÃO",
    paintOut: "Fora da partida",
    paintOutWatching: "Assistindo · {n} ainda de pé",
    paintSoloOut: "O Guardião venceu",
  },
  en: {
    paintHowWallJelly: "Jelly wall: whoever hits it gets bounced back. Throw it at a rival mid-jump! Freelandoo icon: +{n}.",
    paintHowGoalGuardian: "20 kittens from your team open the portal at the top. On the Guardian's island the most damage wins — lose to it (or fall off), and the match is over for you.",
    paintToastShoved: "Jelly hit! Sent flying",
    paintToastOutFell: "Fell off the Guardian's island — match over for you",
    paintToastOutBoss: "The Guardian beat you — match over",
    paintToastGuardian: "Guardian's island: black paint and punches on it — and walls on the others!",
    paintGuardian: "Guardian",
    paintGuardianName: "GUARDIAN",
    paintOut: "Out of the match",
    paintOutWatching: "Watching · {n} still standing",
    paintSoloOut: "The Guardian won",
  },
  es: {
    paintHowWallJelly: "Muro de gelatina: quien choca con él sale volando hacia atrás. ¡Lánzalo al rival cuando salte! Ícono de Freelandoo: +{n}.",
    paintHowGoalGuardian: "20 gatitos de tu equipo abren el portal en la cima. En la isla del Guardián gana quien haga más daño — si pierdes contra él (o te caes), se acabó la partida para ti.",
    paintToastShoved: "¡Gelatina! Salió volando",
    paintToastOutFell: "Te caíste de la isla del Guardián — fin de la partida para ti",
    paintToastOutBoss: "El Guardián te venció — fin de la partida",
    paintToastGuardian: "Isla del Guardián: negro y puñetazos en él — ¡y muros a los demás!",
    paintGuardian: "Guardián",
    paintGuardianName: "GUARDIÁN",
    paintOut: "Fuera de la partida",
    paintOutWatching: "Mirando · {n} aún en pie",
    paintSoloOut: "El Guardián ganó",
  },
}
for (const [lang, keys] of Object.entries(ADD)) {
  const f = path.join(DIR, `${lang}.json`)
  const j = JSON.parse(fs.readFileSync(f, "utf8"))
  j.MeuMundo = j.MeuMundo || {}
  let n = 0
  for (const [k, v] of Object.entries(keys)) if (!(k in j.MeuMundo)) ((j.MeuMundo[k] = v), n++)
  fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n")
  console.log(lang, "+", n)
}
