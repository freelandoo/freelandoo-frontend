// Meu Mundo, trilha E, fatia E7: os 3 conjuntos, as 12 peças (nome, descrição, origem) e o
// contador "2/4" da tela de equipar. Idempotente (fill-if-absent). node <script> [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")

const SETS = {
  vigilia: { pt: "Vigília", en: "Vigil", es: "Vigilia", dom: ["Floresta da Lua", "Moon Forest", "Bosque de la Luna"] },
  forja: { pt: "Forja", en: "Forge", es: "Forja", dom: ["Vulcão de Kragor", "Kragor's Volcano", "Volcán de Kragor"] },
  sentinela: { pt: "Sentinela de Bronze", en: "Bronze Sentinel", es: "Centinela de Bronce", dom: ["Fábrica de Bronze", "Bronze Factory", "Fábrica de Bronce"] },
}
const PIECES = {
  elmo: { pt: "Elmo", en: "Helm", es: "Yelmo" },
  peitoral: { pt: "Peitoral", en: "Breastplate", es: "Peto" },
  luvas: { pt: "Luvas", en: "Gauntlets", es: "Guanteletes" },
  botas: { pt: "Botas", en: "Boots", es: "Botas" },
}
const ptOf = (p, s) => `${PIECES[p].pt} da ${s}`

const KEYS = {
  "pt-BR": {
    gearSetLine: "Conjunto {name}",
    lkSetFull: "inteiro",
    lkSetPart: "{p}%",
    lkSetNeed: "faltam {n} para somar",
  },
  en: {
    gearSetLine: "{name} set",
    lkSetFull: "full",
    lkSetPart: "{p}%",
    lkSetNeed: "{n} more to count",
  },
  es: {
    gearSetLine: "Conjunto {name}",
    lkSetFull: "completo",
    lkSetPart: "{p}%",
    lkSetNeed: "faltan {n} para sumar",
  },
}
for (const [id, s] of Object.entries(SETS)) {
  KEYS["pt-BR"]["gearSet_" + id] = s.pt
  KEYS.en["gearSet_" + id] = s.en
  KEYS.es["gearSet_" + id] = s.es
  for (const p of Object.keys(PIECES)) {
    const item = `${id}_${p}`
    KEYS["pt-BR"]["gear_" + item] = ptOf(p, s.pt)
    KEYS.en["gear_" + item] = `${s.en} ${PIECES[p].en}`
    KEYS.es["gear_" + item] = `${PIECES[p].es} de la ${s.es}`
    KEYS["pt-BR"]["gearDesc_" + item] = `Peça do conjunto ${s.pt}. Com 2 peças o conjunto já soma; com as 4, soma inteiro.`
    KEYS.en["gearDesc_" + item] = `Piece of the ${s.en} set. With 2 pieces the set already counts; with all 4, it counts in full.`
    KEYS.es["gearDesc_" + item] = `Pieza del conjunto ${s.es}. Con 2 piezas el conjunto ya suma; con las 4, suma completo.`
    KEYS["pt-BR"]["gearSource_" + item] = `Conjunto ${s.pt}: setores 7 a 10 do Domínio ${s.dom[0]}.`
    KEYS.en["gearSource_" + item] = `${s.en} set: sectors 7 to 10 of the ${s.dom[1]} Domain.`
    KEYS.es["gearSource_" + item] = `Conjunto ${s.es}: sectores 7 a 10 del Dominio ${s.dom[2]}.`
  }
}

for (const [loc, keys] of Object.entries(KEYS)) {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  dict.MeuMundo = dict.MeuMundo || {}
  for (const [k, v] of Object.entries(keys)) if (!(k in dict.MeuMundo)) dict.MeuMundo[k] = v
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
}
