// Meu Mundo 3D — nomes das habilidades de cada personagem (2026-11-07). Namespace "MeuMundo".
// A chave segue abilities/signatures.ts: ability<Personagem><Ult|Slash|Dash|Shield>.
// Idempotente (FILL preenche o que falta).
// Rodar: node scripts/i18n-mm-abilities-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

// por personagem: [pt, en, es] de ult, slash, dash, shield
const NAMES = {
  Vampiro: [
    ["Golpe de Sangue", "Blood Cut", "Golpe de Sangre"],
    ["Foice Carmesim", "Crimson Scythe", "Guadaña Carmesí"],
    ["Passo de Morcego", "Bat Step", "Paso de Murciélago"],
    ["Véu de Sangue", "Blood Veil", "Velo de Sangre"],
  ],
  Raposa: [
    ["Coroa de Brasas", "Ember Crown", "Corona de Brasas"],
    ["Rabo de Fogo", "Fire Tail", "Cola de Fuego"],
    ["Salto da Raposa", "Fox Leap", "Salto del Zorro"],
    ["Círculo de Brasas", "Ember Circle", "Círculo de Brasas"],
  ],
  Aurion: [
    ["Sentença Solar", "Solar Verdict", "Sentencia Solar"],
    ["Lâmina do Meio-Dia", "Noon Blade", "Hoja del Mediodía"],
    ["Passo do Invicto", "Unbeaten Step", "Paso del Invicto"],
    ["Égide de Mármore", "Marble Aegis", "Égida de Mármol"],
  ],
  Morkhan: [
    ["Fogo Sem Nome", "Nameless Fire", "Fuego sin Nombre"],
    ["Corte Violeta", "Violet Cut", "Corte Violeta"],
    ["Sombra Rasgada", "Torn Shadow", "Sombra Rasgada"],
    ["Pacto de Cinzas", "Ash Pact", "Pacto de Cenizas"],
  ],
  Zephyra: [
    ["Carruagem do Trovão", "Thunder Chariot", "Carro del Trueno"],
    ["Corte de Vento", "Wind Cut", "Corte de Viento"],
    ["Rastro de Raio", "Lightning Trail", "Estela de Rayo"],
    ["Olho da Tormenta", "Eye of the Storm", "Ojo de la Tormenta"],
  ],
  Kragor: [
    ["Punho de Basalto", "Basalt Fist", "Puño de Basalto"],
    ["Golpe de Lava", "Lava Strike", "Golpe de Lava"],
    ["Carga do Touro", "Bull Charge", "Carga del Toro"],
    ["Muralha de Basalto", "Basalt Wall", "Muralla de Basalto"],
  ],
  Maru: [
    ["Maré Centésima", "Hundredth Tide", "Marea Centésima"],
    ["Corte da Ressaca", "Undertow Cut", "Corte de la Resaca"],
    ["Salto do Tritão", "Triton Leap", "Salto del Tritón"],
    ["Bolha da Maré", "Tide Bubble", "Burbuja de Marea"],
  ],
  Iris: [
    ["Prisma das Cores", "Color Prism", "Prisma de Colores"],
    ["Flecha Espectral", "Spectral Arrow", "Flecha Espectral"],
    ["Passo Camaleão", "Chameleon Step", "Paso Camaleón"],
    ["Véu Prismático", "Prismatic Veil", "Velo Prismático"],
  ],
  Aeryn: [
    ["Asa de Bronze", "Bronze Wing", "Ala de Bronce"],
    ["Pena Cortante", "Cutting Feather", "Pluma Cortante"],
    ["Voo Rasante", "Low Dive", "Vuelo Rasante"],
    ["Asas Fechadas", "Folded Wings", "Alas Cerradas"],
  ],
  Noctis: [
    ["Corredor da Lua", "Moon Runner", "Corredor de la Luna"],
    ["Tiro de Prata", "Silver Shot", "Disparo de Plata"],
    ["Rastro Noturno", "Night Trail", "Estela Nocturna"],
    ["Eclipse", "Eclipse", "Eclipse"],
  ],
  Ciborgue: [
    ["Sobrecarga", "Overload", "Sobrecarga"],
    ["Rajada Térmica", "Thermal Burst", "Ráfaga Térmica"],
    ["Propulsão", "Thrust", "Propulsión"],
    ["Campo de Força", "Force Field", "Campo de Fuerza"],
  ],
  Golem: [
    ["Pedras Gêmeas", "Twin Stones", "Piedras Gemelas"],
    ["Soco de Pedra", "Stone Punch", "Puñetazo de Piedra"],
    ["Avanço do Colosso", "Colossus Advance", "Avance del Coloso"],
    ["Casca de Rocha", "Rock Shell", "Coraza de Roca"],
  ],
  Garras: [
    ["Rasgo em Cruz", "Cross Rend", "Desgarro en Cruz"],
    ["Garra Dupla", "Twin Claw", "Garra Doble"],
    ["Bote da Dama", "Lady's Pounce", "Salto de la Dama"],
    ["Plumas de Aço", "Steel Plumes", "Plumas de Acero"],
  ],
  Brutamontes: [
    ["Queda do Minotauro", "Minotaur's Fall", "Caída del Minotauro"],
    ["Machado Roxo", "Purple Axe", "Hacha Púrpura"],
    ["Estouro da Manada", "Stampede", "Estampida"],
    ["Couraça do Touro", "Bull Hide", "Coraza del Toro"],
  ],
  Cavaleiro: [
    ["Juramento Dourado", "Golden Oath", "Juramento Dorado"],
    ["Corte Real", "Royal Cut", "Corte Real"],
    ["Investida da Ordem", "Order's Charge", "Carga de la Orden"],
    ["Baluarte de Ouro", "Golden Bulwark", "Baluarte de Oro"],
  ],
  Sergio: [
    ["Reta Final", "Final Stretch", "Recta Final"],
    ["Corte Azul", "Teal Cut", "Corte Turquesa"],
    ["Arrancada", "Sprint", "Arrancada"],
    ["Guarda Fechada", "Closed Guard", "Guardia Cerrada"],
  ],
  Ekaterina: [
    ["Rosa de Gelo", "Ice Rose", "Rosa de Hielo"],
    ["Corte Frio", "Cold Cut", "Corte Frío"],
    ["Passo na Neve", "Snow Step", "Paso en la Nieve"],
    ["Espelho de Gelo", "Ice Mirror", "Espejo de Hielo"],
  ],
  Aventura: [
    ["Golpe do Herói", "Hero's Strike", "Golpe del Héroe"],
    ["Corte Firme", "Firm Cut", "Corte Firme"],
    ["Arranque", "Burst", "Arranque"],
    ["Guarda do Bairro", "Neighborhood Guard", "Guardia del Barrio"],
  ],
}

const SLOTS = ["Ult", "Slash", "Dash", "Shield"]
const FILL = {}
for (const [who, rows] of Object.entries(NAMES)) rows.forEach((row, i) => (FILL[`ability${who}${SLOTS[i]}`] = row))

const LOCALES = ["pt-BR", "en", "es"]
let added = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  // chave do piloto, antes de cada personagem ter as suas
  delete json.MeuMundo.abilityBloodCut
  for (const [key, vals] of Object.entries(FILL)) {
    if (json.MeuMundo[key] === undefined) {
      json.MeuMundo[key] = vals[i]
      added++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n habilidades: ${added} chaves adicionadas`)
