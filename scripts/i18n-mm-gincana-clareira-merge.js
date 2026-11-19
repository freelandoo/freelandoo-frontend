// Meu Mundo 3D — Gincana (2026-11-19): Clareira da Lua, a 2ª fase da Floresta (Tocos que Giram).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-mm-gincana-clareira-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  gincanaPhClareira: ["Clareira da Lua", "Moon Glade", "Claro de la Luna"],
  gincanaEvClareira: ["Tocos que Giram", "Spinning Stumps", "Tocones Giratorios"],
  gincanaPhClareiraPitch: [
    "A segunda corrida da Floresta: fatias de tronco que giram, frutas gigantes rolando pela rampa, tocos em escada sobre o pântano, a vitória-régia que gira e os cogumelos que lançam.",
    "The Forest's second race: spinning log slices, giant fruit rolling down the ramp, stepping stumps over the swamp, the spinning giant lily pad and launching mushrooms.",
    "La segunda carrera del Bosque: rodajas de tronco que giran, frutas gigantes rodando por la rampa, tocones en escalera sobre el pantano, el nenúfar gigante que gira y los hongos que lanzan.",
  ],
  gincanaSecCl1: ["Fatias que giram", "Spinning slices", "Rodajas que giran"],
  gincanaSecCl2: ["Rampa das frutas", "Fruit ramp", "Rampa de las frutas"],
  gincanaSecCl3: ["Tocos", "Stumps", "Tocones"],
  gincanaSecCl4: ["Vitória-régia", "Giant lily pad", "Nenúfar gigante"],
  gincanaSecCl5: ["Cogumelos", "Mushrooms", "Hongos"],
  gincanaHowCl1: [
    "Cada fatia de tronco gira para um lado e leva você junto: corra pelos vãos e pule os troncos caídos.",
    "Each log slice spins its own way and carries you along: run through the gaps and hop the fallen logs.",
    "Cada rodaja de tronco gira hacia un lado y te lleva: corre por los huecos y salta los troncos caídos.",
  ],
  gincanaHowCl2: [
    "Frutas gigantes descem por quatro faixas: as pedras de musgo entre as faixas protegem.",
    "Giant fruit rolls down four lanes: the mossy stones between the lanes give cover.",
    "Frutas gigantes bajan por cuatro carriles: las piedras de musgo entre los carriles protegen.",
  ],
  gincanaHowCl3: [
    "Os tocos sobem em escada e giram: pule de um para o outro. Caiu no pântano, volta ao posto.",
    "The stumps climb like stairs and spin: jump from one to the next. Fall in the swamp and you go back to the checkpoint.",
    "Los tocones suben en escalera y giran: salta de uno a otro. Si caes al pantano, vuelves al puesto.",
  ],
  gincanaHowCl4: [
    "A vitória-régia gira devagar e as sementes penduradas balançam: passe quando a sua voltar.",
    "The lily pad spins slowly and the hanging seeds swing: go when yours swings back.",
    "El nenúfar gira despacio y las semillas colgadas se balancean: pasa cuando la tuya vuelva.",
  ],
  gincanaHowCl5: [
    "Pise num cogumelo para ser lançado ao alto do barranco. Depois, a subida da chegada.",
    "Step on a mushroom to be launched to the top of the bank. Then, the climb to the finish.",
    "Pisa un hongo para salir lanzado a lo alto del barranco. Después, la subida a la meta.",
  ],
}

const LOCALES = ["pt-BR", "en", "es"]
let added = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo = json.MeuMundo || {}
  for (const [key, vals] of Object.entries(MEU_MUNDO)) {
    if (json.MeuMundo[key] === undefined) {
      json.MeuMundo[key] = vals[i]
      added++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n gincana clareira: ${added} chaves adicionadas`)
