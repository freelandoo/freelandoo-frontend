// Meu Mundo, lore v2 N4: o deus solto (avisos da rua e do Domínio).
// Idempotente (fill-if-absent). node <script> [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const KEYS = {
  "pt-BR": {
    godHereAurion: "Aurion está solto e caça Vampiros! Ele corre mais que você.",
    godHereMorkhan: "Morkhan está solto e caça Raposas! Ele corre mais que você.",
    godCaught: "{god} te alcançou! Ele tem o dobro da sua força.",
    godDown: "{name} derrotou {god}! O deus voltou para a estátua.",
    godFightFail: "A luta com o deus não abriu: {e}",
    godYouWon: "Você derrotou {god}! Ele voltou para a estátua.",
    godYouLost: "{god} venceu. Você só perdeu energia; ele volta a te caçar daqui a pouco.",
  },
  en: {
    godHereAurion: "Aurion is loose and hunting Vampires! He runs faster than you.",
    godHereMorkhan: "Morkhan is loose and hunting Foxes! He runs faster than you.",
    godCaught: "{god} caught you! He has twice your strength.",
    godDown: "{name} defeated {god}! The god went back to the statue.",
    godFightFail: "The fight with the god didn't open: {e}",
    godYouWon: "You defeated {god}! He went back to the statue.",
    godYouLost: "{god} won. You only lost energy; he'll be hunting you again soon.",
  },
  es: {
    godHereAurion: "¡Aurion anda suelto y caza Vampiros! Corre más que tú.",
    godHereMorkhan: "¡Morkhan anda suelto y caza Zorros! Corre más que tú.",
    godCaught: "¡{god} te alcanzó! Tiene el doble de tu fuerza.",
    godDown: "¡{name} derrotó a {god}! El dios volvió a la estatua.",
    godFightFail: "La pelea con el dios no se abrió: {e}",
    godYouWon: "¡Derrotaste a {god}! Volvió a la estatua.",
    godYouLost: "{god} ganó. Solo perdiste energía; volverá a cazarte en un rato.",
  },
}
for (const [loc, keys] of Object.entries(KEYS)) {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  dict.MeuMundo = dict.MeuMundo || {}
  for (const [k, v] of Object.entries(keys)) if (!(k in dict.MeuMundo)) dict.MeuMundo[k] = v
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
}
