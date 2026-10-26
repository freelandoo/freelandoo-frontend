// Meu Mundo 3D — mm3d-34: funeral e herança na morte do hóspede.
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-funeral-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  causeOldAge: ["Velhice", "Old age", "Vejez"],
  stFuneralFree: ["Morreu de velhice: a Freelandoo pagou o funeral.", "Died of old age: Freelandoo paid for the funeral.", "Murió de vejez: Freelandoo pagó el funeral."],
  stHeirInherit: [
    "O novo hóspede herda 20%: inteligência {i}, força {s}, velocidade {v}.",
    "The new guest inherits 20%: intelligence {i}, strength {s}, speed {v}.",
    "El nuevo huésped hereda el 20%: inteligencia {i}, fuerza {s}, velocidad {v}.",
  ],
  stFuneralPaid: ["O funeral custa {n} moedas e é você quem paga.", "The funeral costs {n} coins and you pay for it.", "El funeral cuesta {n} monedas y lo pagas tú."],
  stHeirNone: ["Sem herança: o novo hóspede começa do zero.", "No inheritance: the new guest starts from scratch.", "Sin herencia: el nuevo huésped empieza desde cero."],
  stNewcomerPay: ["Pagar funeral e receber novo hóspede", "Pay for the funeral and welcome a new guest", "Pagar el funeral y recibir un nuevo huésped"],
  ntFuneralFree: ["A Freelandoo pagou o funeral.", "Freelandoo paid for the funeral.", "Freelandoo pagó el funeral."],
  ntFuneralFreeLine: [
    "Ele morreu de velhice. O novo hóspede herdou 20% dos atributos.",
    "He died of old age. The new guest inherited 20% of his attributes.",
    "Murió de vejez. El nuevo huésped heredó el 20% de sus atributos.",
  ],
  ntFuneralPaid: ["Funeral pago: {n} moedas.", "Funeral paid: {n} coins.", "Funeral pagado: {n} monedas."],
  ntFuneralPaidLine: ["Sem herança: o novo hóspede começou do zero.", "No inheritance: the new guest started from scratch.", "Sin herencia: el nuevo huésped empezó desde cero."],
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
console.log(`i18n meu-mundo funeral: ${added} chaves adicionadas`)
