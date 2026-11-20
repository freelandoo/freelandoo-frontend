// Meu Mundo 3D — Gincana (2026-11-20): Serraria da Lua, a 3ª fase da Floresta (toras com cravos, machados, tábuas que balançam).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-mm-gincana-serraria-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  "gincanaPhSerraria": [
    "Serraria da Lua",
    "Moonlit Sawmill",
    "Aserradero de la Luna"
  ],
  "gincanaEvSerraria": [
    "Corrida da Serraria",
    "Sawmill Race",
    "Carrera del Aserradero"
  ],
  "gincanaPhSerrariaPitch": [
    "A terceira corrida da Floresta, na serraria dos lenhadores: toras com cravos rolando contra você, a ponte dos machados, tábuas que balançam e o pátio das toras grandes.",
    "The Forest's third race, at the woodcutters' sawmill: spiked logs rolling at you, the bridge of axes, swaying planks and the yard of big logs.",
    "La tercera carrera del Bosque, en el aserradero de los leñadores: troncos con púas rodando hacia ti, el puente de las hachas, tablas que se balancean y el patio de los troncos grandes."
  ],
  "gincanaSecSe1": [
    "Toras",
    "Logs",
    "Troncos"
  ],
  "gincanaSecSe2": [
    "Machados",
    "Axes",
    "Hachas"
  ],
  "gincanaSecSe3": [
    "Tábuas",
    "Planks",
    "Tablas"
  ],
  "gincanaSecSe4": [
    "Toras grandes",
    "Big logs",
    "Troncos grandes"
  ],
  "gincanaSecSe5": [
    "Subida",
    "Climb",
    "Subida"
  ],
  "gincanaHowSe1": [
    "As toras rolam na sua direção: espere a fileira de cravos passar por baixo e pule. Duas delas têm um vão do lado.",
    "The logs roll toward you: wait for the row of spikes to pass underneath and jump. Two of them leave a gap at the side.",
    "Los troncos ruedan hacia ti: espera a que la fila de púas pase por debajo y salta. Dos de ellos dejan un hueco a un lado."
  ],
  "gincanaHowSe2": [
    "Os machados varrem a ponte de um lado para o outro: corra logo depois que o seu passar.",
    "The axes sweep the bridge from side to side: run right after yours goes by.",
    "Las hachas barren el puente de lado a lado: corre justo después de que pase la tuya."
  ],
  "gincanaHowSe3": [
    "As tábuas balançam e jogam você para o lado que desce: fique no meio e escolha a fila.",
    "The planks sway and tip you toward the low side: stay in the middle and pick a lane.",
    "Las tablas se balancean y te tiran hacia el lado que baja: quédate en el medio y elige una fila."
  ],
  "gincanaHowSe4": [
    "As toras grandes rolam mais devagar, com um machado no vão entre elas: espere a hora certa.",
    "The big logs roll slower, with an axe in the gap between them: wait for the right moment.",
    "Los troncos grandes ruedan más despacio, con un hacha en el hueco entre ellos: espera el momento justo."
  ],
  "gincanaHowSe5": [
    "Toras descem a rampa: troque de faixa cedo.",
    "Logs roll down the ramp: switch lanes early.",
    "Bajan troncos por la rampa: cambia de carril temprano."
  ]
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
console.log(`i18n gincana serraria: ${added} chaves adicionadas`)
