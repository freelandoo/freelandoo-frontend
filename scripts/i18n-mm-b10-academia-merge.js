// B10 (2026-11-08): aparelhos e cursos por nível na academia e na universidade.
// Fill-if-absent no namespace MeuMundo (e o erro do servidor em MeuMundoServer). Idempotente.
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")

const TEXT = {
  "pt-BR": {
    stnPick: "Aparelho", stnTier: "Nível", stnTierN: "Nv. {n}",
    stnWeights: "Pesos", stnTreadmill: "Esteira", stnBag: "Saco de pancada", stnCourse: "Curso", stnBook: "Livros",
    stnWeightsGives: "Força", stnTreadmillGives: "Velocidade", stnBagGives: "Velocidade e acurácia", stnCourseGives: "Inteligência", stnBookGives: "Inteligência",
    stnNeed: "Precisa de {n} de {attr}", stnNext: "Próximo nível com {n} de {attr} (você tem {v}).",
  },
  en: {
    stnPick: "Equipment", stnTier: "Level", stnTierN: "Lv. {n}",
    stnWeights: "Weights", stnTreadmill: "Treadmill", stnBag: "Punching bag", stnCourse: "Course", stnBook: "Books",
    stnWeightsGives: "Strength", stnTreadmillGives: "Speed", stnBagGives: "Speed and accuracy", stnCourseGives: "Intelligence", stnBookGives: "Intelligence",
    stnNeed: "Needs {n} {attr}", stnNext: "Next level at {n} {attr} (you have {v}).",
  },
  es: {
    stnPick: "Aparato", stnTier: "Nivel", stnTierN: "Nv. {n}",
    stnWeights: "Pesas", stnTreadmill: "Cinta", stnBag: "Saco de boxeo", stnCourse: "Curso", stnBook: "Libros",
    stnWeightsGives: "Fuerza", stnTreadmillGives: "Velocidad", stnBagGives: "Velocidad y precisión", stnCourseGives: "Inteligencia", stnBookGives: "Inteligencia",
    stnNeed: "Necesita {n} de {attr}", stnNext: "Siguiente nivel con {n} de {attr} (tienes {v}).",
  },
}
const SERVER = {
  en: { "Esse aparelho ou curso não existe aqui": "That equipment or course doesn't exist here", "Ainda não dá para esse nível: falta atributo": "You can't use that level yet: attribute too low" },
  es: { "Esse aparelho ou curso não existe aqui": "Ese aparato o curso no existe aquí", "Ainda não dá para esse nível: falta atributo": "Aún no puedes ese nivel: falta atributo" },
  "pt-BR": { "Esse aparelho ou curso não existe aqui": "Esse aparelho ou curso não existe aqui", "Ainda não dá para esse nível: falta atributo": "Ainda não dá para esse nível: falta atributo" },
}

for (const loc of Object.keys(TEXT)) {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  let n = 0
  for (const [ns, keys] of [["MeuMundo", TEXT[loc]], ["MeuMundoServer", SERVER[loc]]]) {
    dict[ns] = dict[ns] || {}
    for (const [k, v] of Object.entries(keys)) {
      if (dict[ns][k] === undefined) {
        dict[ns][k] = v
        n++
      }
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(loc, "+", n)
}
