// Meu Mundo 3D — mm3d-15: bike, skate e patins dentro de casa.
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-veiculos-casa-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  vehicleMoving: ["Pare primeiro.", "Stop first.", "Detente primero."],
  recoverHintAny: [
    "Preso? Volta para a vaga da casa (parado, a cada 15 s).",
    "Stuck? Goes back to the house spot (stopped, every 15 s).",
    "¿Atascado? Vuelve al lugar de la casa (detenido, cada 15 s).",
  ],
  rideStairs: ["Na escada não dá para descer.", "You can't get off on the stairs.", "En la escalera no se puede bajar."],
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
console.log(`i18n mm3d-15 veículos em casa: ${added} chaves adicionadas`)
