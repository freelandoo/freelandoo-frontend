// Meu Mundo 3D — mm3d-17: Centro da cidade (11 locais, salas de 20, ida e volta).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-centro-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  centerPlace_pizzaria: ["Pizzaria", "Pizzeria", "Pizzería"],
  centerPlace_hamburgueria: ["Hamburgueria", "Burger joint", "Hamburguesería"],
  centerPlace_supermercado: ["Supermercado", "Supermarket", "Supermercado"],
  centerPlace_universidade: ["Universidade", "University", "Universidad"],
  centerPlace_biblioteca: ["Biblioteca", "Library", "Biblioteca"],
  centerPlace_escola: ["Escola", "School", "Escuela"],
  centerPlace_academia: ["Academia", "Gym", "Gimnasio"],
  centerPlace_jetpack: ["Jetpack", "Jetpack", "Jetpack"],
  centerPlace_igreja: ["Igreja", "Church", "Iglesia"],
  centerPlace_delegacia: ["Delegacia", "Police station", "Comisaría"],
  centerPlace_praca: ["Praça central", "Central square", "Plaza central"],
  centerPortalSign: ["Bairros", "Neighborhoods", "Barrios"],
  goCenter: ["Ir ao centro", "Go downtown", "Ir al centro"],
  goCenterHint: ["Encontrar gente de outros bairros", "Meet people from other neighborhoods", "Encontrar gente de otros barrios"],
  centerSoon: ["Em breve", "Coming soon", "Próximamente"],
  centerSoonDesc: [
    "O interior de {name} ainda está sendo construído. Por enquanto, só a fachada.",
    "The inside of the {name} is still being built. For now, only the facade.",
    "El interior de {name} todavía se está construyendo. Por ahora, solo la fachada.",
  ],
  centerOnline: ["{n} no centro", "{n} downtown", "{n} en el centro"],
  centerRoomHint: ["Cada centro recebe até {n} pessoas", "Each downtown holds up to {n} people", "Cada centro recibe hasta {n} personas"],
  centerHomeHint: ["Para a frente da sua casa, no seu bairro", "To the front of your house, in your neighborhood", "Al frente de tu casa, en tu barrio"],
  centerRecoverHint: [
    "Preso? Volta para uma vaga livre (parado, a cada 15 s).",
    "Stuck? Back to a free parking spot (stopped, every 15 s).",
    "¿Atascado? Vuelve a un lugar libre (detenido, cada 15 s).",
  ],
  centerLoading: ["Montando o centro…", "Building downtown…", "Armando el centro…"],
  centerErrorTitle: ["O centro não abriu", "Downtown didn't open", "El centro no abrió"],
  centerVisiting: ["Encerre a visita antes de ir ao centro.", "End the visit before going downtown.", "Termina la visita antes de ir al centro."],
  transCenter: ["Indo ao centro…", "Going downtown…", "Yendo al centro…"],
  transCenterHome: ["Voltando para casa…", "Going home…", "Volviendo a casa…"],
  menuCenter: ["O centro", "Downtown", "El centro"],
  canvasAriaCenter: ["Centro da cidade do Meu Mundo", "Meu Mundo downtown", "Centro de la ciudad de Meu Mundo"],
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
console.log(`i18n mm3d-17 centro: ${added} chaves adicionadas`)
