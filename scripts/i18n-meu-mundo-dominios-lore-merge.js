// Meu Mundo 3D — Domínios v2 (DV6–DV9): as criaturas da lore do Mar de Gelo, da Fábrica de Bronze, do
// Vulcão de Kragor e da Cidade Orbital (historia/v2/04-mundo-exploravel.md §3–6) e as fases dos 4 deuses.
// Namespace "MeuMundo". Idempotente: preenche o que falta; OVERRIDE troca valor que mudou.
// Rodar: node scripts/i18n-meu-mundo-dominios-lore-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const KEYS = {
  domFoe_peixe: ["Peixes-Lanterna Cegos", "Blind Lanternfish", "Peces Linterna Ciegos"],
  domFoe_caranguejo: ["Caranguejos-Âncora", "Anchor Crabs", "Cangrejos Ancla"],
  domFoe_afogado: ["Afogados da Maré", "Tide-Drowned", "Ahogados de la Marea"],
  domFoe_serpente: ["Serpentes do Rio", "River Serpents", "Serpientes del Río"],
  domFoe_ciborgue: ["Ciborgue", "Cyborg", "Cíborg"],
  domFoe_ondina: ["Ondina, a Barqueira", "Ondina, the Ferrywoman", "Ondina, la Barquera"],
  domFoe_maru: ["Marú", "Marú", "Marú"],
  domFoe_rato: ["Ratos de Engrenagem", "Gear Rats", "Ratas de Engranaje"],
  domFoe_aranha: ["Aranhas-Relógio", "Clockwork Spiders", "Arañas Reloj"],
  domFoe_cobaia: ["Cobaias", "Test Subjects", "Cobayas"],
  domFoe_sucata: ["Golens de Sucata", "Scrap Golems", "Gólems de Chatarra"],
  domFoe_garras: ["Dama das Garras", "Lady of Claws", "Dama de las Garras"],
  domFoe_esteira: ["A Esteira", "The Conveyor", "La Cinta"],
  domFoe_aeryn: ["Aeryn", "Aeryn", "Aeryn"],
  domFoe_salamandra: ["Salamandras de Brasa", "Ember Salamanders", "Salamandras de Brasa"],
  domFoe_mineiro: ["Mineiros Fundidos", "Molten Miners", "Mineros Fundidos"],
  domFoe_touro: ["Touros de Lava", "Lava Bulls", "Toros de Lava"],
  domFoe_lutador: ["Lutadores do Poço", "Pit Fighters", "Luchadores del Foso"],
  domFoe_golem: ["Golem de Pedra", "Stone Golem", "Gólem de Piedra"],
  domFoe_brutamontes: ["Brutamontes", "Brute", "Bruto"],
  domFoe_kragor: ["Kragor", "Kragor", "Kragor"],
  domFoe_pomba: ["Pombas Prismáticas", "Prismatic Doves", "Palomas Prismáticas"],
  domFoe_camaleao: ["Camaleões Rachados", "Cracked Chameleons", "Camaleones Agrietados"],
  domFoe_pintor: ["Pintores Sem Cor", "Colorless Painters", "Pintores sin Color"],
  domFoe_espelho: ["Espelhos", "Mirrors", "Espejos"],
  domFoe_cavaleiro: ["Cavaleiro Dourado", "Golden Knight", "Caballero Dorado"],
  domFoe_arco: ["O Arco Partido", "The Broken Arch", "El Arco Partido"],
  domFoe_iris: ["Íris", "Iris", "Iris"],
  laminasMaruPhase2: ["MARÉ ALTA", "HIGH TIDE", "MAREA ALTA"],
  laminasMaruPhase3: ["GELO PARTIDO", "SHATTERED ICE", "HIELO ROTO"],
  laminasAerynPhase2: ["CHUVA DE BRONZE", "BRONZE RAIN", "LLUVIA DE BRONCE"],
  laminasAerynPhase3: ["VOO DA ÁGUIA", "EAGLE'S DIVE", "VUELO DEL ÁGUILA"],
  laminasKragorPhase2: ["MARTELO DE BASALTO", "BASALT HAMMER", "MARTILLO DE BASALTO"],
  laminasKragorPhase3: ["CHIFRES DE LAVA", "LAVA HORNS", "CUERNOS DE LAVA"],
  laminasIrisPhase2: ["PRISMA", "PRISM", "PRISMA"],
  laminasIrisPhase3: ["MIL CORES", "A THOUSAND COLORS", "MIL COLORES"],
}

const OVERRIDE = {}

const LOCALES = ["pt-BR", "en", "es"]
LOCALES.forEach((loc, i) => {
  const file = path.join(dir, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  const ns = (dict.MeuMundo = dict.MeuMundo || {})
  let added = 0
  let changed = 0
  for (const [k, v] of Object.entries(KEYS)) {
    if (!(k in ns)) {
      ns[k] = v[i]
      added++
    }
  }
  for (const [k, v] of Object.entries(OVERRIDE)) {
    if (ns[k] !== v[i]) {
      ns[k] = v[i]
      changed++
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(`${loc}: +${added} ~${changed}`)
})
