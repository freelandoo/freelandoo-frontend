// 24/11/2026 (pedido do Alex): toda carta com thumb é só a arte + nome; tocar abre o detalhe lado a lado com a
// ficha inteira do item (item*) e, na Receita, o que ela faz e o que precisa (recipe*).
// Idempotente (fill-if-absent). node <script> [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")

const UI = [
  ["itemOpenDetail", "Ver {name}", "View {name}", "Ver {name}"],
  ["itemYes", "Sim", "Yes", "Sí"],
  ["itemNo", "Não", "No", "No"],
  ["itemSecSheet", "Ficha", "Sheet", "Ficha"],
  ["itemSecClassStats", "Status da classe", "Class stats", "Estado de la clase"],
  ["itemSecCopy", "Esta cópia", "This copy", "Esta copia"],
  ["itemSecBonus", "Bônus da peça", "Item bonus", "Bonificación de la pieza"],
  ["itemSecDoes", "O que faz", "What it does", "Qué hace"],
  ["itemSecAbout", "Sobre", "About", "Acerca de"],
  ["itemSecSource", "De onde vem", "Where it comes from", "De dónde viene"],
  ["itemSecUses", "Para que serve", "What it's for", "Para qué sirve"],
  ["itemFactRank", "Classe", "Class", "Clase"],
  ["itemFactType", "Tipo", "Type", "Tipo"],
  ["itemFactSlot", "Encaixe", "Slot", "Ranura"],
  ["itemFactTwoHanded", "Duas mãos", "Two hands", "Dos manos"],
  ["itemTwoHandedYes", "Sim — tira a mão secundária", "Yes — frees the off hand", "Sí — quita la mano secundaria"],
  ["itemFactLevel", "Nível pedido", "Required level", "Nivel requerido"],
  ["itemFactWho", "Quem usa", "Who can use it", "Quién lo usa"],
  ["itemWhoYou", "Você pode usar", "You can use it", "Puedes usarlo"],
  ["itemFactSet", "Conjunto", "Set", "Conjunto"],
  ["itemFactSockets", "Engastes", "Sockets", "Engastes"],
  ["itemFactPrice", "Preço na loja", "Shop price", "Precio en la tienda"],
  ["itemFactSell", "Vende por", "Sells for", "Se vende por"],
  ["itemFactStack", "Empilha", "Stacks", "Se apila"],
  ["itemFactOwned", "Na mochila", "In backpack", "En la mochila"],
  ["itemFactWeaponLevel", "Nível da arma", "Weapon level", "Nivel del arma"],
  ["itemFactXp", "XP do nível", "Level XP", "XP del nivel"],
  ["itemFactStars", "Estrelas", "Stars", "Estrellas"],
  ["itemFactPlus", "Aprimoramento", "Upgrade", "Mejora"],
  ["itemFactEquipped", "Equipada", "Equipped", "Equipada"],
  ["itemEquippedHere", "Neste personagem", "On this character", "En este personaje"],
  ["itemEquippedOther", "Em outro personagem", "On another character", "En otro personaje"],
  ["itemEquippedNo", "Solta na mochila", "Loose in the backpack", "Suelta en la mochila"],
  ["itemBonusNow", "Bônus de agora (nível e estrelas)", "Current bonus (level and stars)", "Bonificación actual (nivel y estrellas)"],
  ["itemFragmentDoes", "Junte {n} para fabricar {of}.", "Collect {n} to craft {of}.", "Junta {n} para fabricar {of}."],
  ["itemPowderDoes", "Refina armas da classe {r}: cada tentativa gasta 1.", "Refines class {r} weapons: each attempt uses 1.", "Refina armas de clase {r}: cada intento gasta 1."],
  ["itemPrepDoes", "Preparo: soma na próxima luta.", "Prep: adds to your next fight.", "Preparado: suma en la próxima pelea."],
  ["itemRuneDoes", "Runa grau {g}: engasta numa peça.", "Grade {g} rune: socket it into an item.", "Runa de grado {g}: se engasta en una pieza."],
  ["itemKindSword", "Espada", "Sword", "Espada"],
  ["itemKindStaff", "Cajado", "Staff", "Bastón"],
  ["itemKindHeavy", "Arma pesada", "Heavy weapon", "Arma pesada"],
  ["itemKindBow", "Arco", "Bow", "Arco"],
  ["itemKindGun", "Arma de fogo", "Firearm", "Arma de fuego"],
  ["itemKindShield", "Escudo", "Shield", "Escudo"],
  ["itemKindChest", "Armadura", "Armor", "Armadura"],
  ["itemKindHelm", "Elmo", "Helmet", "Yelmo"],
  ["itemKindGloves", "Luvas", "Gloves", "Guantes"],
  ["itemKindBoots", "Botas", "Boots", "Botas"],
  ["itemKindAmulet", "Amuleto", "Amulet", "Amuleto"],
  ["itemKindRelic", "Relíquia", "Relic", "Reliquia"],
  ["recipeSecDoes", "O que a receita faz", "What the recipe does", "Qué hace la receta"],
  ["recipeSecNeeds", "O que precisa", "What it needs", "Qué necesita"],
  ["recipeCost", "Custo", "Cost", "Costo"],
  ["recipeLearned", "Receita aprendida", "Recipe learned", "Receta aprendida"],
  ["recipeDoesFragment", "Junta os fragmentos da peça com os materiais abaixo e fabrica {out}. Sempre dá certo.", "Combines the item's fragments with the materials below and crafts {out}. It always works.", "Junta los fragmentos de la pieza con los materiales de abajo y fabrica {out}. Siempre sale bien."],
  ["recipeDoesPart", "Fabrica a peça {out}. Reúna todas as partes para montar a arma.", "Crafts the part {out}. Gather every part to assemble the weapon.", "Fabrica la pieza {out}. Reúne todas las partes para montar el arma."],
  ["recipeDoesAssembly", "Monta {out} com as partes abaixo. Montagem garantida.", "Assembles {out} from the parts below. Guaranteed assembly.", "Monta {out} con las partes de abajo. Montaje garantizado."],
  ["recipeDoesConversion", "Converte os materiais abaixo em {out}.", "Converts the materials below into {out}.", "Convierte los materiales de abajo en {out}."],
  ["recipeDoesPrep", "Prepara {out}: um reforço para usar antes da luta.", "Prepares {out}: a boost to use before a fight.", "Prepara {out}: un refuerzo para usar antes de la pelea."],
  ["recipeDoesEquipment", "Fabrica {out} com os materiais abaixo.", "Crafts {out} from the materials below.", "Fabrica {out} con los materiales de abajo."],
]

for (const [lang, i] of [["pt-BR", 1], ["en", 2], ["es", 3]]) {
  const file = path.join(DIR, lang + ".json")
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  const mm = dict.MeuMundo
  if (!mm) throw new Error("sem MeuMundo em " + lang)
  let n = 0
  for (const row of UI) if (!(row[0] in mm)) { mm[row[0]] = row[i]; n++ }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(lang, "+" + n)
}
