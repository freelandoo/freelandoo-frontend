// Meu Mundo 3D — Gincana (2026-11-20): Mar de Gelo vira corrida sobre 20 tubos de gelo que giram (pedido do Alex).
// Namespace "MeuMundo". Idempotente, fill-if-absent (chaves novas; as do Rolo ficam para trás).
// Rodar: node scripts/i18n-mm-gincana-gelo-tubos-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  gincanaEvGeloTubos: ["Tubos de Gelo", "Ice Tubes", "Tubos de Hielo"],
  gincanaPhGeloPitch5: [
    "Vinte tubos de gelo deitados sobre o mar, cada um girando para um lado. Corra por cima deles, pule de tubo em tubo e desvie das estalactites e dos pistões até a chegada.",
    "Twenty ice tubes lying over the sea, each spinning its own way. Run on top of them, jump from tube to tube and dodge the icicles and pistons all the way to the finish.",
    "Veinte tubos de hielo tumbados sobre el mar, cada uno girando hacia un lado. Corre sobre ellos, salta de tubo en tubo y esquiva las estalactitas y los pistones hasta la meta."
  ],
  gincanaSecGt1: ["Primeiros tubos", "First tubes", "Primeros tubos"],
  gincanaSecGt2: ["Tubos furados", "Holed tubes", "Tubos agujereados"],
  gincanaSecGt3: ["Estalactites", "Icicles", "Estalactitas"],
  gincanaSecGt4: ["Pistões de gelo", "Ice pistons", "Pistones de hielo"],
  gincanaHowGt1: [
    "Cada tubo gira para um lado e arrasta você: corra contra o giro e fique no alto.",
    "Each tube spins its own way and drags you: run against the spin and stay on top.",
    "Cada tubo gira hacia un lado y te arrastra: corre contra el giro y quédate arriba."
  ],
  gincanaHowGt2: [
    "Entre os tubos há um vão: pule — o próximo pode estar mais alto ou mais baixo.",
    "There is a gap between tubes: jump — the next one may be higher or lower.",
    "Entre los tubos hay un hueco: salta — el siguiente puede estar más alto o más bajo."
  ],
  gincanaHowGt3: [
    "Do 5º tubo em diante os buracos dão a volta: pule quando um passar embaixo.",
    "From the 5th tube on, holes come around: jump when one passes under you.",
    "Desde el 5.º tubo los agujeros dan la vuelta: salta cuando uno pase debajo."
  ],
  gincanaHowGt4: [
    "Estalactites balançam por cima e pistões de gelo socam de lado: espere a hora.",
    "Icicles swing overhead and ice pistons punch from the side: time your run.",
    "Las estalactitas se balancean arriba y los pistones de hielo golpean de lado: espera el momento."
  ],
  gincanaHowGt5: [
    "Caiu no mar? Volta à última banquisa (depois do 5º, do 10º e do 15º tubo).",
    "Fell into the sea? You go back to the last ice floe (after the 5th, 10th and 15th tube).",
    "¿Caíste al mar? Vuelves al último témpano (tras el 5.º, el 10.º y el 15.º tubo)."
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
console.log(`i18n gincana gelo tubos: ${added} chaves adicionadas`)
