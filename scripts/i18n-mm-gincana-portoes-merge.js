// Meu Mundo 3D — Gincana (2026-11-20): Portões de Gelo, a 2ª fase do Mar de Gelo (portas falsas que estreitam).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-mm-gincana-portoes-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  "gincanaPhPortoes": [
    "Portões de Gelo",
    "Ice Gates",
    "Portones de Hielo"
  ],
  "gincanaEvPortoes": [
    "Portões de Gelo",
    "Ice Gates",
    "Portones de Hielo"
  ],
  "gincanaPhPortoesPitch": [
    "A segunda corrida do Mar de Gelo: nove fileiras de portões de gelo, cada vez mais estreitas. Os de verdade estilhaçam; os falsos são parede. Freie no gelo liso.",
    "The Ice Sea's second race: nine rows of ice gates, narrower each time. The real ones shatter; the fake ones are walls. Brake on the smooth ice.",
    "La segunda carrera del Mar de Hielo: nueve filas de portones de hielo, cada vez más estrechas. Los de verdad se rompen; los falsos son pared. Frena en el hielo liso."
  ],
  "gincanaSecPt1": [
    "Pátio dos portões",
    "Gate yard",
    "Patio de portones"
  ],
  "gincanaSecPt2": [
    "Lago congelado",
    "Frozen lake",
    "Lago helado"
  ],
  "gincanaSecPt3": [
    "Ponte de gelo",
    "Ice bridge",
    "Puente de hielo"
  ],
  "gincanaSecPt4": [
    "Corredor das estalactites",
    "Icicle corridor",
    "Pasillo de estalactitas"
  ],
  "gincanaSecPt5": [
    "Subida",
    "Climb",
    "Subida"
  ],
  "gincanaHowPt1": [
    "Toda fileira tem portões de verdade e falsos, iguais por fora. O de verdade estilhaça quando você encosta.",
    "Every row has real and fake gates that look the same. The real one shatters when you touch it.",
    "Cada fila tiene portones de verdad y falsos, iguales por fuera. El de verdad se rompe cuando lo tocas."
  ],
  "gincanaHowPt2": [
    "Viu alguém passar? Aquele portão está aberto. O gelo liso escorrega: comece a frear antes.",
    "Saw someone go through? That gate is open. The smooth ice is slippery: start braking early.",
    "¿Viste a alguien pasar? Ese portón está abierto. El hielo liso resbala: empieza a frenar antes."
  ],
  "gincanaHowPt3": [
    "Blocos de gelo deslizam de lado no lago: passe atrás deles.",
    "Ice blocks slide sideways on the lake: pass behind them.",
    "Bloques de hielo se deslizan de lado en el lago: pasa detrás de ellos."
  ],
  "gincanaHowPt4": [
    "A ponte e o corredor têm poucos portões de verdade: a fila aperta, mergulhe para furar.",
    "The bridge and the corridor have few real gates: the line gets tight, dive to push through.",
    "El puente y el pasillo tienen pocos portones de verdad: la fila se aprieta, lánzate para pasar."
  ],
  "gincanaHowPt5": [
    "As estalactites balançam no corredor; depois é só a subida.",
    "Icicles swing in the corridor; after that it's just the climb.",
    "Las estalactitas se balancean en el pasillo; después solo queda la subida."
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
console.log(`i18n gincana portoes: ${added} chaves adicionadas`)
