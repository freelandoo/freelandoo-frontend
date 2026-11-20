// Meu Mundo 3D — Gincana (2026-11-20): Hélices da Orbital, a 2ª fase da Cidade Orbital (hélices que giram no vazio).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-mm-gincana-helices-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  "gincanaPhHelices": [
    "Hélices da Orbital",
    "Orbital Propellers",
    "Hélices de la Orbital"
  ],
  "gincanaEvHelices": [
    "Corrida das Hélices",
    "Propeller Race",
    "Carrera de las Hélices"
  ],
  "gincanaPhHelicesPitch": [
    "Hélices deitadas girando no vazio: pule de pá em pá, espere a pá certa no cubo e corra antes que ela vire.",
    "Flat propellers spinning over the void: hop from blade to blade, wait at the hub for the right blade and run before it turns away.",
    "Hélices tumbadas girando sobre el vacío: salta de aspa en aspa, espera la buena en el centro y corre antes de que gire."
  ],
  "gincanaSecHe1": [
    "Hélices",
    "Propellers",
    "Hélices"
  ],
  "gincanaSecHe2": [
    "Doca",
    "Dock",
    "Muelle"
  ],
  "gincanaSecHe3": [
    "Cubos",
    "Hubs",
    "Ejes"
  ],
  "gincanaSecHe4": [
    "Cais",
    "Pier",
    "Embarcadero"
  ],
  "gincanaSecHe5": [
    "Subida",
    "Climb",
    "Subida"
  ],
  "gincanaHowHe1": [
    "Pule na pá quando ela vier na sua direção, não quando ela já estiver indo embora.",
    "Jump onto a blade as it comes toward you, not when it is already leaving.",
    "Salta al aspa cuando venga hacia ti, no cuando ya se esté yendo."
  ],
  "gincanaHowHe2": [
    "As barras do corredor giram: pule quando a ponta chegar.",
    "The corridor bars spin: jump when the tip arrives.",
    "Las barras del pasillo giran: salta cuando llegue la punta."
  ],
  "gincanaHowHe3": [
    "No cubo, espere uma pá apontar para a saída e corra por cima dela.",
    "At the hub, wait for a blade to point at the exit and run along it.",
    "En el centro, espera a que un aspa apunte a la salida y corre por encima."
  ],
  "gincanaHowHe4": [
    "As plataformas do cais vão de um lado para o outro: acompanhe a de baixo.",
    "The pier platforms slide side to side: move with the one under you.",
    "Las plataformas del embarcadero van de un lado a otro: acompaña la de abajo."
  ],
  "gincanaHowHe5": [
    "As pedras descem rolando: troque de faixa cedo.",
    "Rocks roll down: switch lanes early.",
    "Las piedras bajan rodando: cambia de carril pronto."
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
console.log(`i18n gincana helices: ${added} chaves adicionadas`)
