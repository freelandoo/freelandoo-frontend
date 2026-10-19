// Meu Mundo 3D — mm3d-06 (casas níveis 01–10 e seletor de teste).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-mm3d06-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  changeHouse: ["Alterar casa", "Change house", "Cambiar casa"],
  testFeature: ["Recurso de teste", "Test feature", "Función de prueba"],
  levelTitle: ["Escolher nível da casa", "Choose house level", "Elegir nivel de la casa"],
  levelN: ["Nível {n}", "Level {n}", "Nivel {n}"],
  levelCurrent: ["Atual", "Current", "Actual"],
  levelNoModel: ["Modelo ainda não fornecido", "Model not provided yet", "Modelo aún no disponible"],
  levelLoading: ["Carregando nível {n}…", "Loading level {n}…", "Cargando nivel {n}…"],
  levelLoadFail: [
    "O modelo do nível {n} não carregou — mostrando o nível {m}.",
    "The level {n} model did not load — showing level {m}.",
    "El modelo del nivel {n} no cargó — mostrando el nivel {m}.",
  ],
  levelConfirmed: ["Nível confirmado: {n}", "Confirmed level: {n}", "Nivel confirmado: {n}"],
  levelSize: ["{w} × {d} m", "{w} × {d} m", "{w} × {d} m"],
  levelTestNote: [
    "Teste visual: todos os níveis estão liberados, sem custo. Não é loja nem evolução.",
    "Visual test: every level is unlocked, at no cost. This is not a shop or progression.",
    "Prueba visual: todos los niveles están liberados, sin costo. No es tienda ni progresión.",
  ],
  levelApply: ["Aplicar nível {n}", "Apply level {n}", "Aplicar nivel {n}"],
  houseModels: ["Casas na GPU", "Houses on GPU", "Casas en GPU"],
  levelNetError: ["Sem conexão. Tente de novo.", "No connection. Try again.", "Sin conexión. Inténtalo de nuevo."],
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
console.log(`i18n mm3d-06: ${added} chaves adicionadas`)
