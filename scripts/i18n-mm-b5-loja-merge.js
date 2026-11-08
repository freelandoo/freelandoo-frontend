// B5 (2026-11-08): a Loja única (Equipamento, Monstros, Personagens, Comidas e itens).
// Fill-if-absent no namespace MeuMundo. Idempotente. node <script> [pasta]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")

const TEXT = {
  "pt-BR": {
    shopTitle: "Loja",
    menuShopHint: "Equipamento, monstros, personagens e comidas",
    menuGearHint2: "Mochila, Forja e refino",
    shopTabGear: "Equipamento",
    shopTabMonsters: "Monstros",
    shopTabCharacters: "Personagens",
    shopTabFood: "Comidas e itens",
    shopFromLevel: "A partir do nível {n}",
    shopInFridge: "Na geladeira: {n}",
    shopMobArena: "Arena",
    shopMobStreet: "Rua",
    shopMobWins: "{n} vitórias",
    shopMobWin1: "1 vitória",
    shopMobLoss1: "1 derrota",
    shopMobLosses: "{n} derrotas",
    shopMobBest: "Maior nível vencido: {n}",
    shopMobFirst: "Primeira vitória em {d}",
    shopMobEmpty: "Nenhum monstro por aqui.",
    shopMobHint: "Os monstros que você já enfrentou na Arena e na rua. Os que viram personagem estão na aba Personagens.",
    shopMobHowArena: "Ainda não derrotado. Enfrente na Arena das Lâminas.",
    shopMobHowStreet: "Ainda não derrotado. Aparece na rua, de noite (18h às 6h).",
    shopSpClan: "Classe",
    shopSpGod: "Deus",
    shopSpSpecial: "Especial",
    shopSpHeight: "Adulto com {m} m",
    shopSpOwned: "Você tem {n}",
    shopSpNone: "Você ainda não tem",
    shopSpHowClan: "Nasce com a sua classe.",
    shopSpHow: "Não se compra: vem da fusão de dois adultos, de prêmio do topo ou do mercado entre jogadores (em breve).",
  },
  en: {
    shopTitle: "Shop",
    menuShopHint: "Gear, monsters, characters and food",
    menuGearHint2: "Backpack, Forge and refining",
    shopTabGear: "Gear",
    shopTabMonsters: "Monsters",
    shopTabCharacters: "Characters",
    shopTabFood: "Food and items",
    shopFromLevel: "From level {n}",
    shopInFridge: "In the fridge: {n}",
    shopMobArena: "Arena",
    shopMobStreet: "Street",
    shopMobWins: "{n} wins",
    shopMobWin1: "1 win",
    shopMobLoss1: "1 loss",
    shopMobLosses: "{n} losses",
    shopMobBest: "Highest level beaten: {n}",
    shopMobFirst: "First win on {d}",
    shopMobEmpty: "No monsters here.",
    shopMobHint: "The monsters you have faced in the Arena and on the street. Those that became characters are in the Characters tab.",
    shopMobHowArena: "Not beaten yet. Face it in the Blades Arena.",
    shopMobHowStreet: "Not beaten yet. It shows up on the street at night (6pm to 6am).",
    shopSpClan: "Class",
    shopSpGod: "God",
    shopSpSpecial: "Special",
    shopSpHeight: "Adult at {m} m",
    shopSpOwned: "You have {n}",
    shopSpNone: "You don't have one yet",
    shopSpHowClan: "Born with your class.",
    shopSpHow: "Not for sale: comes from fusing two adults, a top-rank prize or the player market (coming soon).",
  },
  es: {
    shopTitle: "Tienda",
    menuShopHint: "Equipo, monstruos, personajes y comida",
    menuGearHint2: "Mochila, Forja y refinado",
    shopTabGear: "Equipo",
    shopTabMonsters: "Monstruos",
    shopTabCharacters: "Personajes",
    shopTabFood: "Comida y objetos",
    shopFromLevel: "Desde el nivel {n}",
    shopInFridge: "En la nevera: {n}",
    shopMobArena: "Arena",
    shopMobStreet: "Calle",
    shopMobWins: "{n} victorias",
    shopMobWin1: "1 victoria",
    shopMobLoss1: "1 derrota",
    shopMobLosses: "{n} derrotas",
    shopMobBest: "Mayor nivel vencido: {n}",
    shopMobFirst: "Primera victoria el {d}",
    shopMobEmpty: "Ningún monstruo por aquí.",
    shopMobHint: "Los monstruos que ya enfrentaste en la Arena y en la calle. Los que se volvieron personaje están en la pestaña Personajes.",
    shopMobHowArena: "Aún no derrotado. Enfréntalo en la Arena de las Láminas.",
    shopMobHowStreet: "Aún no derrotado. Aparece en la calle, de noche (18h a 6h).",
    shopSpClan: "Clase",
    shopSpGod: "Dios",
    shopSpSpecial: "Especial",
    shopSpHeight: "Adulto con {m} m",
    shopSpOwned: "Tienes {n}",
    shopSpNone: "Aún no tienes",
    shopSpHowClan: "Nace con tu clase.",
    shopSpHow: "No se compra: viene de fusionar dos adultos, de un premio del top o del mercado entre jugadores (pronto).",
  },
}

for (const [loc, keys] of Object.entries(TEXT)) {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  dict.MeuMundo = dict.MeuMundo || {}
  let n = 0
  for (const [k, v] of Object.entries(keys)) {
    if (dict.MeuMundo[k] === undefined) {
      dict.MeuMundo[k] = v
      n++
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(loc, "+", n)
}
