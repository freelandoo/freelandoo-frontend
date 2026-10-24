// Meu Mundo 3D — mm3d-26: hospital no centro da cidade.
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-hospital-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  centerPlace_hospital: ["Hospital", "Hospital", "Hospital"],
  centerEnter: ["Entrar", "Enter", "Entrar"],
  hospitalLeave: ["Sair", "Leave", "Salir"],
  hospitalAria: ["Dentro do hospital", "Inside the hospital", "Dentro del hospital"],
  hospitalDischarged: ["Alta", "Discharged", "Alta"],
  hospitalHealth: ["Saúde {n}/{max}", "Health {n}/{max}", "Salud {n}/{max}"],
  hospitalLoading: ["Entrando no hospital…", "Entering the hospital…", "Entrando al hospital…"],
  hospitalErrorTitle: ["O hospital não abriu", "The hospital didn't open", "El hospital no abrió"],
  ambulanceTitle: ["Ambulância a caminho", "Ambulance on the way", "Ambulancia en camino"],
  ambulanceDesc: [
    "A saúde dele chegou ao limite. Ele vai ser internado no hospital do centro.",
    "His health hit the limit. He's being admitted to the downtown hospital.",
    "Su salud llegó al límite. Será internado en el hospital del centro.",
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
console.log(`i18n mm3d-26 hospital: ${added} chaves adicionadas`)
