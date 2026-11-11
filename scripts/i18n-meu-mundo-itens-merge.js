// Meu Mundo 3D — trilha E (itens, equipamentos e equidade). Namespace "MeuMundo".
// Idempotente, fill-if-absent (mudar valor = OVERRIDE abaixo).
// Rodar: node scripts/i18n-meu-mundo-itens-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  // E1
  rarityMythic: ["Mítico", "Mythic", "Mítico"],
  forgeOffhands: ["Mão secundária", "Off-hand", "Mano secundaria"],
  forgeRelics: ["Relíquias", "Relics", "Reliquias"],
  forgeFragments: ["Fragmentos", "Fragments", "Fragmentos"],
  forgeRunes: ["Runas", "Runes", "Runas"],
  forgeConsumables: ["Consumíveis", "Consumables", "Consumibles"],
  forgeCurrency: ["Fichas", "Tokens", "Fichas"],
  // E4: chaves novas do equipamento
  gearBonusHp: ["+{v} vida", "+{v} health", "+{v} vida"],
  gearBonusAcc: ["+{v} acuracidade", "+{v} accuracy", "+{v} precisión"],
  gearBonusSpd: ["+{v} velocidade", "+{v} speed", "+{v} velocidad"],
  gearBonusInt: ["+{v} inteligência", "+{v} intelligence", "+{v} inteligencia"],
  gearBonusDex: ["+{v} destreza", "+{v} dexterity", "+{v} destreza"],
  lkBonusHp: ["Vida", "Health", "Vida"],
  lkBonusAcc: ["Acuracidade", "Accuracy", "Precisión"],
  lkBonusSpd: ["Velocidade", "Speed", "Velocidad"],
  lkBonusInt: ["Inteligência", "Intelligence", "Inteligencia"],
  lkBonusDex: ["Destreza", "Dexterity", "Destreza"],
  // E6: os 8 slots
  lkSlotOffhand: ["Mão secundária", "Off-hand", "Mano secundaria"],
  lkSlotHelm: ["Cabeça", "Head", "Cabeza"],
  lkSlotChest: ["Peito", "Chest", "Pecho"],
  lkSlotGloves: ["Mãos", "Hands", "Manos"],
  lkSlotBoots: ["Pés", "Feet", "Pies"],
  lkSlotAmulet: ["Amuleto", "Amulet", "Amuleto"],
  lkSlotRelic: ["Relíquia", "Relic", "Reliquia"],
  lkPickSlot: ["Escolher peça para {slot}", "Choose an item for {slot}", "Elegir pieza para {slot}"],
  bagOnlySlot: ["Só: {slot}", "Only: {slot}", "Solo: {slot}"],
  bagClearSlot: ["Mostrar todos", "Show all", "Mostrar todos"],
  // E8: Índice de fragmentos e forja por fragmento
  fragIndexTab: ["Fragmentos", "Fragments", "Fragmentos"],
  forgeByFragment: ["Por fragmento", "From fragments", "Por fragmento"],
  fragSearch: ["Buscar arma, região ou chefão", "Search weapon, region or boss", "Buscar arma, región o jefe"],
  fragRegion: ["Região", "Region", "Región"],
  fragAllRegions: ["Todas as regiões", "All regions", "Todas las regiones"],
  fragRarity: ["Raridade", "Rarity", "Rareza"],
  fragAllRarities: ["Todas as raridades", "All rarities", "Todas las rarezas"],
  fragBossOnly: ["Só os que caem de chefão", "Boss drops only", "Solo los que suelta un jefe"],
  fragForSet: ["Peças do conjunto {name}", "{name} set pieces", "Piezas del conjunto {name}"],
  fragForItem: ["Para: {name}", "For: {name}", "Para: {name}"],
  fragBossLine: ["chefão: {name}", "boss: {name}", "jefe: {name}"],
  fragSectors: ["setores 7 a 10", "sectors 7 to 10", "sectores 7 a 10"],
  fragConvert: ["Converter {n} em {p} de Pó de Refino", "Turn {n} into {p} Refining Dust", "Convertir {n} en {p} de Polvo de Refinado"],
  fragConverted: ["Sobra convertida em Pó de Refino.", "Spare turned into Refining Dust.", "Sobrante convertido en Polvo de Refinado."],
  fragRegionHall: ["Hall dos Campeões", "Hall of Champions", "Salón de los Campeones"],
  fragRegionStreet: ["Rua de noite", "Streets at night", "Calle de noche"],
  fragRegionPaint: ["Paint", "Paint", "Paint"],
  fragBossElite: ["Monstro de elite", "Elite monster", "Monstruo de élite"],
  // E8: nomes dos itens novos
  gear_linha_primeira_chama: ["Espada da Primeira Chama", "Sword of the First Flame", "Espada de la Primera Llama"],
  gear_frag_primeira_chama: ["Fragmento: Espada da Primeira Chama", "Fragment: Sword of the First Flame", "Fragmento: Espada de la Primera Llama"],
  gear_receita_primeira_chama: ["Receita: Espada da Primeira Chama", "Recipe: Sword of the First Flame", "Receta: Espada de la Primera Llama"],
  gear_linha_tridente_mares: ["Tridente das Marés", "Trident of the Tides", "Tridente de las Mareas"],
  gear_frag_tridente_mares: ["Fragmento: Tridente das Marés", "Fragment: Trident of the Tides", "Fragmento: Tridente de las Mareas"],
  gear_receita_tridente_mares: ["Receita: Tridente das Marés", "Recipe: Trident of the Tides", "Receta: Tridente de las Mareas"],
  gear_linha_lamina_correntes: ["Lâmina das Correntes", "Blade of Chains", "Hoja de las Cadenas"],
  gear_frag_lamina_correntes: ["Fragmento: Lâmina das Correntes", "Fragment: Blade of Chains", "Fragmento: Hoja de las Cadenas"],
  gear_receita_lamina_correntes: ["Receita: Lâmina das Correntes", "Recipe: Blade of Chains", "Receta: Hoja de las Cadenas"],
  gear_linha_martelo_incandescente: ["Martelo Incandescente", "Incandescent Hammer", "Martillo Incandescente"],
  gear_frag_martelo_incandescente: ["Fragmento: Martelo Incandescente", "Fragment: Incandescent Hammer", "Fragmento: Martillo Incandescente"],
  gear_receita_martelo_incandescente: ["Receita: Martelo Incandescente", "Recipe: Incandescent Hammer", "Receta: Martillo Incandescente"],
  gear_linha_sabre_vendaval: ["Sabre do Vendaval", "Gale Saber", "Sable del Vendaval"],
  gear_frag_sabre_vendaval: ["Fragmento: Sabre do Vendaval", "Fragment: Gale Saber", "Fragmento: Sable del Vendaval"],
  gear_receita_sabre_vendaval: ["Receita: Sabre do Vendaval", "Recipe: Gale Saber", "Receta: Sable del Vendaval"],
  gear_linha_arco_prismatico: ["Arco Prismático", "Prismatic Bow", "Arco Prismático"],
  gear_frag_arco_prismatico: ["Fragmento: Arco Prismático", "Fragment: Prismatic Bow", "Fragmento: Arco Prismático"],
  gear_receita_arco_prismatico: ["Receita: Arco Prismático", "Recipe: Prismatic Bow", "Receta: Arco Prismático"],
  gear_linha_garras_lunares: ["Garras Lunares", "Lunar Claws", "Garras Lunares"],
  gear_frag_garras_lunares: ["Fragmento: Garras Lunares", "Fragment: Lunar Claws", "Fragmento: Garras Lunares"],
  gear_receita_garras_lunares: ["Receita: Garras Lunares", "Recipe: Lunar Claws", "Receta: Garras Lunares"],
  gear_linha_arco_bronze_vivo: ["Arco de Bronze Vivo", "Living Bronze Bow", "Arco de Bronce Vivo"],
  gear_frag_arco_bronze_vivo: ["Fragmento: Arco de Bronze Vivo", "Fragment: Living Bronze Bow", "Fragmento: Arco de Bronce Vivo"],
  gear_receita_arco_bronze_vivo: ["Receita: Arco de Bronze Vivo", "Recipe: Living Bronze Bow", "Receta: Arco de Bronce Vivo"],
  gear_linha_cajado_moldes: ["Cajado dos Moldes", "Staff of Molds", "Báculo de los Moldes"],
  gear_frag_cajado_moldes: ["Fragmento: Cajado dos Moldes", "Fragment: Staff of Molds", "Fragmento: Báculo de los Moldes"],
  gear_receita_cajado_moldes: ["Receita: Cajado dos Moldes", "Recipe: Staff of Molds", "Receta: Báculo de los Moldes"],
  gear_frag_vigilia: ["Fragmento do conjunto Vigília", "Vigil set fragment", "Fragmento del conjunto Vigilia"],
  gear_projeto_vigilia: ["Projeto: conjunto Vigília", "Blueprint: Vigil set", "Proyecto: conjunto Vigilia"],
  gear_frag_forja: ["Fragmento do conjunto Forja", "Forge set fragment", "Fragmento del conjunto Forja"],
  gear_projeto_forja: ["Projeto: conjunto Forja", "Blueprint: Forge set", "Proyecto: conjunto Forja"],
  gear_frag_sentinela: ["Fragmento do conjunto Sentinela de Bronze", "Bronze Sentinel set fragment", "Fragmento del conjunto Centinela de Bronce"],
  gear_projeto_sentinela: ["Projeto: conjunto Sentinela de Bronze", "Blueprint: Bronze Sentinel set", "Proyecto: conjunto Centinela de Bronce"],
  gear_minerio_ferro: ["Minério de Ferro", "Iron Ore", "Mineral de Hierro"],
  gear_minerio_prata: ["Minério de Prata", "Silver Ore", "Mineral de Plata"],
  gear_lingote_refinado: ["Lingote Refinado", "Refined Ingot", "Lingote Refinado"],
  gear_madeira_ancestral: ["Madeira Ancestral", "Ancestral Wood", "Madera Ancestral"],
  gear_cristal_bruto: ["Cristal Bruto", "Raw Crystal", "Cristal en Bruto"],
  gear_po_forja: ["Pó de Forja", "Forge Dust", "Polvo de Forja"],
  gear_pedra_aprimoramento: ["Pedra de Aprimoramento", "Enhancement Stone", "Piedra de Mejora"],
  gear_catalisador_refino: ["Catalisador de Refino", "Refining Catalyst", "Catalizador de Refinado"],
  gear_essencia_primordial: ["Essência Primordial", "Primordial Essence", "Esencia Primordial"],
  gear_po_de_lua: ["Pó de Lua", "Moon Dust", "Polvo de Luna"],
  gear_seiva_de_prata: ["Seiva de Prata", "Silver Sap", "Savia de Plata"],
  gear_areia_de_raio: ["Areia de Raio", "Lightning Sand", "Arena de Rayo"],
  gear_pena_de_tempestade: ["Pena de Tempestade", "Storm Feather", "Pluma de Tormenta"],
  gear_gelo_negro: ["Gelo Negro", "Black Ice", "Hielo Negro"],
  gear_perola_de_afogado: ["Pérola de Afogado", "Drowned Pearl", "Perla de Ahogado"],
  gear_engrenagem_fina: ["Engrenagem Fina", "Fine Gear", "Engranaje Fino"],
  gear_coracao_de_corda: ["Coração de Corda", "Clockwork Heart", "Corazón de Cuerda"],
  gear_escoria: ["Escória", "Slag", "Escoria"],
  gear_ferro_de_basalto: ["Ferro de Basalto", "Basalt Iron", "Hierro de Basalto"],
  gear_vidro_colorido: ["Vidro Colorido", "Stained Glass", "Vidrio de Color"],
  gear_prisma_vivo: ["Prisma Vivo", "Living Prism", "Prisma Vivo"],
  gear_brasa_solar: ["Brasa Solar", "Solar Ember", "Brasa Solar"],
  gear_cinza_das_correntes: ["Cinza das Correntes", "Chain Ash", "Ceniza de las Cadenas"],
  gear_barro_primordial: ["Barro Primordial", "Primordial Clay", "Barro Primordial"],
  gear_po_refino: ["Pó de Refino", "Refining Dust", "Polvo de Refinado"],
  gear_selo_dominio: ["Selo de Domínio", "Domain Seal", "Sello de Dominio"],
  // E9
  upgradeTitle: ["Aprimoramento garantido", "Guaranteed enhancement", "Mejora garantizada"],
  upgradeState: ["+{plus} · grau {grade}", "+{plus} · grade {grade}", "+{plus} · grado {grade}"],
  upgradeWorn: ["equipada", "equipped", "equipada"],
  upgradeAscended: ["ascendida", "ascended", "ascendida"],
  upgradeMax: ["No +15: o máximo.", "At +15: the maximum.", "En +15: el máximo."],
  upgradeStep: ["+{from} → +{to}", "+{from} → +{to}", "+{from} → +{to}"],
  upgradeNext: ["Depois", "After", "Después"],
  upgradeEmeralds: ["Esmeraldas", "Emeralds", "Esmeraldas"],
  upgradeNeedAscend: ["Do +11 em diante, só depois da Ascensão da peça.", "From +11 on, only after the item is Ascended.", "Desde +11, solo después de la Ascensión de la pieza."],
  upgradeSure: ["Sempre sobe: o custo é fixo e nada se perde.", "It always goes up: the cost is fixed and nothing is lost.", "Siempre sube: el costo es fijo y no se pierde nada."],
  upgradeConfirm: ["Gastar o custo acima e subir para +{to}?", "Spend the cost above and go up to +{to}?", "¿Gastar el costo de arriba y subir a +{to}?"],
  upgradeDone: ["Aprimorado!", "Enhanced!", "¡Mejorado!"],
  upgradeGo: ["Aprimorar para +{to}", "Enhance to +{to}", "Mejorar a +{to}"],
  upgradeBlocked: ["Precisa da Ascensão", "Needs Ascension", "Necesita la Ascensión"],
  // E10
  gradeTitle: ["Refinamento I–V", "Refining I–V", "Refinado I–V"],
  gradeMax: ["No grau V: o máximo.", "At grade V: the maximum.", "En grado V: el máximo."],
  gradeStep: ["Grau {from} → {to}", "Grade {from} → {to}", "Grado {from} → {to}"],
  gradeConfirm: ["Gastar o custo acima e refinar para o grau {to}?", "Spend the cost above and refine to grade {to}?", "¿Gastar el costo de arriba y refinar al grado {to}?"],
  gradeDone: ["Refinado!", "Refined!", "¡Refinado!"],
  gradeGo: ["Refinar para o grau {to}", "Refine to grade {to}", "Refinar al grado {to}"],
}
const OVERRIDE = {}

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
  for (const [key, vals] of Object.entries(OVERRIDE)) {
    if (json.MeuMundo[key] !== vals[i]) {
      json.MeuMundo[key] = vals[i]
      added++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n meu-mundo itens: ${added} chaves adicionadas/atualizadas`)
