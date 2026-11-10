// Lore v2, etapa F1 (2026-11-10): Cavaleiro Dourado na Arena, Golem de Pedra com tipo próprio e as
// frases das skins pela história nova (MEU MUNDO 3D/historia/v2/02-historias.md).
// Idempotente. Chaves novas = fill-if-absent; as frases das skins mudaram de valor = OVERRIDE.
// node <script> [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const KEYS = {
  "pt-BR": {
    laminasMobKnight: "Cavaleiro Dourado",
    laminasSubKnight: "Espada e armadura: muita defesa",
    shopMobHowStone: "Ainda não derrotado. Aparece na rua, de noite (18h às 6h), e na Arena das Lâminas.",
  },
  en: {
    laminasMobKnight: "Golden Knight",
    laminasSubKnight: "Sword and armor: high defense",
    shopMobHowStone: "Not defeated yet. Shows up on the street at night (6 pm to 6 am) and in the Blade Arena.",
  },
  es: {
    laminasMobKnight: "Caballero Dorado",
    laminasSubKnight: "Espada y armadura: mucha defensa",
    shopMobHowStone: "Aún no derrotado. Aparece en la calle, de noche (18 h a 6 h), y en la Arena de las Espadas.",
  },
}
const OVERRIDE = {
  "pt-BR": {
    skinGodLine_aurion: "O Titã Solar, rei do Céu. Quer um povo de joelhos.",
    skinGodLine_morkhan: "O Senhor do Abaixo. Prometeu a vida eterna e cobrou caro.",
    skinGodLine_kragor: "O Minotauro de Basalto. Vendeu armas aos dois lados.",
    skinGodLine_zephyra: "A Deusa-Chacal das Tempestades. Carrega as almas e cobra por elas.",
    skinGodLine_maru: "O Senhor do Mar. Fica com tudo o que cai.",
    skinGodLine_iris: "A Deusa-Camaleão. Toda cor do mundo passa por ela.",
    skinGodLine_noctis: "A Onça da Lua, filho de Morkhan. Não tem pressa.",
    skinGodLine_aeryn: "A Águia de Bronze. Não nasceu: foi feita.",
    skinGodLine_ciborgue: "Era uma Raposa. Segurou a ponte e foi refeito em ferro.",
    skinGodLine_cavaleiro: "Capitão da Ordem do Sol. Guarda um deus que não quer acordado.",
    skinGodLine_golem: "Uma vila inteira numa muralha só. Cento e oitenta vozes.",
    skinGodLine_garras: "A caçadora dos telhados. Não fala desde aquela manhã.",
  },
  en: {
    skinGodLine_aurion: "The Solar Titan, king of the Sky. He wants a people on its knees.",
    skinGodLine_morkhan: "The Lord of Below. He promised eternal life and charged dearly.",
    skinGodLine_kragor: "The Basalt Minotaur. He sold weapons to both sides.",
    skinGodLine_zephyra: "The Jackal Goddess of Storms. She carries the souls and charges for them.",
    skinGodLine_maru: "The Lord of the Sea. He keeps everything that falls.",
    skinGodLine_iris: "The Chameleon Goddess. Every color in the world passes through her.",
    skinGodLine_noctis: "The Moon Jaguar, son of Morkhan. He is in no hurry.",
    skinGodLine_aeryn: "The Bronze Eagle. She was not born: she was made.",
    skinGodLine_ciborgue: "He was a Fox. He held the bridge and was rebuilt in iron.",
    skinGodLine_cavaleiro: "Captain of the Order of the Sun. He guards a god he does not want awake.",
    skinGodLine_golem: "A whole village in a single wall. One hundred and eighty voices.",
    skinGodLine_garras: "The huntress of the rooftops. She has not spoken since that morning.",
  },
  es: {
    skinGodLine_aurion: "El Titán Solar, rey del Cielo. Quiere un pueblo de rodillas.",
    skinGodLine_morkhan: "El Señor del Abajo. Prometió la vida eterna y cobró caro.",
    skinGodLine_kragor: "El Minotauro de Basalto. Vendió armas a los dos bandos.",
    skinGodLine_zephyra: "La Diosa-Chacal de las Tormentas. Carga las almas y cobra por ellas.",
    skinGodLine_maru: "El Señor del Mar. Se queda con todo lo que cae.",
    skinGodLine_iris: "La Diosa-Camaleón. Todo color del mundo pasa por ella.",
    skinGodLine_noctis: "El Jaguar de la Luna, hijo de Morkhan. No tiene prisa.",
    skinGodLine_aeryn: "El Águila de Bronce. No nació: fue hecha.",
    skinGodLine_ciborgue: "Era un Zorro. Sostuvo el puente y fue rehecho en hierro.",
    skinGodLine_cavaleiro: "Capitán de la Orden del Sol. Guarda a un dios que no quiere despierto.",
    skinGodLine_golem: "Una aldea entera en una sola muralla. Ciento ochenta voces.",
    skinGodLine_garras: "La cazadora de los tejados. No habla desde aquella mañana.",
  },
}
for (const loc of Object.keys(KEYS)) {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  for (const [k, v] of Object.entries(KEYS[loc])) if (!(k in dict.MeuMundo)) dict.MeuMundo[k] = v
  for (const [k, v] of Object.entries(OVERRIDE[loc])) dict.MeuMundo[k] = v
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
}
