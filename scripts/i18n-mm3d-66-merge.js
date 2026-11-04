// mm3d-66: Loja de Armas do Arsenal — 16 espadas, vendedor e regra de guerreiro.
// Idempotente (fill-if-absent). node <script> [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const SWORDS = [
  ["aco", 400, ["Espada de aço de Lúmen", "A lâmina de todo guerreiro que começa em Lúmen: reta, honesta e fácil de manter."], ["Lúmen steel sword", "The blade every warrior in Lúmen starts with: straight, honest and easy to keep."], ["Espada de acero de Lúmen", "La hoja de todo guerrero que empieza en Lúmen: recta, honesta y fácil de mantener."]],
  ["viajante", 500, ["Sabre do viajante", "Sabre leve de quem cruza a cidade a pé. Cansa menos no braço do que corta."], ["Traveler's saber", "A light saber for those who cross the city on foot. Easier on the arm than it is sharp."], ["Sable del viajero", "Sable ligero de quien cruza la ciudad a pie. Cansa el brazo menos de lo que corta."]],
  ["prata", 900, ["Agulha de prata", "Lâmina fina de duelista, com guarda longa. Avisa o golpe que vem com um instante de folga."], ["Silver needle", "A slim duelist's blade with a long guard. Warns of the incoming blow a moment early."], ["Aguja de plata", "Hoja fina de duelista, con guarda larga. Avisa del golpe con un instante de margen."]],
  ["vigia", 1100, ["Espada do vigia", "Espada de ronda dos vigias de Lúmen, com guarda de ferro trabalhado."], ["Watchman's sword", "The patrol sword of Lúmen's watchmen, with a wrought-iron guard."], ["Espada del vigía", "Espada de ronda de los vigías de Lúmen, con guarda de hierro labrado."]],
  ["cutelo", 1400, ["Cutelo de ferro negro", "Um bloco de ferro negro com cabo de corda. Sem delicadeza nenhuma."], ["Black iron cleaver", "A slab of black iron with a rope grip. No delicacy whatsoever."], ["Cuchilla de hierro negro", "Un bloque de hierro negro con mango de cuerda. Sin delicadeza alguna."]],
  ["silencio", 2200, ["Katana do silêncio", "Katana de fio longo com borla vermelha. Golpes econômicos, quase sem ruído."], ["Katana of silence", "A long-edged katana with a red tassel. Economical strikes, almost without a sound."], ["Katana del silencio", "Katana de filo largo con borla roja. Golpes económicos, casi sin ruido."]],
  ["carmesim", 2800, ["Lâmina carmesim", "Lâmina branca com veios carmesim que acendem a cada acerto."], ["Crimson blade", "A white blade with crimson veins that light up with every hit."], ["Hoja carmesí", "Hoja blanca con vetas carmesí que se encienden con cada acierto."]],
  ["muralha", 3400, ["Montante da muralha", "Espada larga de quem segura a linha: protege quase tanto quanto corta."], ["Rampart greatsword", "A broad sword for those who hold the line: it guards almost as well as it cuts."], ["Mandoble de la muralla", "Espada ancha de quien sostiene la línea: protege casi tanto como corta."]],
  ["chama", 4200, ["Serpente de chamas", "Lâmina curva que serpenteia como fogo vivo. Alimenta o poder a cada corte."], ["Flame serpent", "A curved blade that winds like living fire. Feeds your power with every cut."], ["Serpiente de llamas", "Hoja curva que serpentea como fuego vivo. Alimenta el poder con cada corte."]],
  ["brasa", 5500, ["Katana de brasa", "Katana de fio alaranjado, forjada ainda quente. Carrega o poder mais depressa."], ["Ember katana", "A katana with an orange edge, forged while still hot. Charges power faster."], ["Katana de brasa", "Katana de filo anaranjado, forjada aún caliente. Carga el poder más deprisa."]],
  ["meia_noite", 6000, ["Cruz da meia-noite", "Cruz de aço negro das rondas noturnas. Quem a usa enxerga o golpe antes."], ["Midnight cross", "A black steel cross from the night patrols. Its bearer sees the blow sooner."], ["Cruz de medianoche", "Cruz de acero negro de las rondas nocturnas. Quien la usa ve antes el golpe."]],
  ["celeste", 7500, ["Presa celeste", "Presa azul de guarda em chifres, relíquia ornamentada dos Jogos Eternos."], ["Celestial fang", "A blue fang with a horned guard, an ornate relic of the Eternal Games."], ["Colmillo celeste", "Colmillo azul de guarda en cuernos, reliquia ornamentada de los Juegos Eternos."]],
  ["ceifadora", 8500, ["Ceifadora rubra", "Montante de osso e ferro rubro, com rasgos abertos na lâmina. Foi feita para assustar antes de cortar."], ["Crimson reaper", "A greatsword of bone and red iron with open gashes in the blade. Made to frighten before it cuts."], ["Segadora roja", "Mandoble de hueso y hierro rojo, con aberturas en la hoja. Hecha para asustar antes de cortar."]],
  ["abismo", 10000, ["Coroa do abismo", "Lâmina violeta coroada de garras, com veios de éter que correm até a ponta."], ["Crown of the abyss", "A violet blade crowned with claws, its ether veins running to the tip."], ["Corona del abismo", "Hoja violeta coronada de garras, con vetas de éter que corren hasta la punta."]],
  ["alvorada", 12000, ["Alvorada dourada", "Lâmina dourada que lembra a primeira luz de Aurion sobre Lúmen."], ["Golden dawn", "A golden blade that recalls Aurion's first light over Lúmen."], ["Alba dorada", "Hoja dorada que recuerda la primera luz de Aurion sobre Lúmen."]],
  ["morkhan", 15000, ["Fenda de Morkhan", "Fragmento violeta rachado pela mesma luz do cristal de Morkhan, o Sem-Nome."], ["Morkhan's Rift", "A violet shard cracked by the same light as the crystal of Morkhan, the Nameless."], ["Grieta de Morkhan", "Fragmento violeta agrietado por la misma luz del cristal de Morkhan, el Sin Nombre."]],
]
// mm3d-67: aba Hammers (id, preço, pt, en, es)
const HEAVY = [
  ["ferreiro", 400, ["Machado do ferreiro", "Machado de oficina com cabo enfaixado. Foi feito para rachar lenha e serve para rachar o resto."], ["Smith's axe", "A workshop axe with a wrapped handle. Made to split wood, good for splitting everything else."], ["Hacha del herrero", "Hacha de taller con mango vendado. Hecha para partir leña y sirve para partir lo demás."]],
  ["lenhador", 550, ["Machado duplo do lenhador", "Duas lâminas gastas num cabo de madeira: pesa menos do que parece."], ["Woodcutter's double axe", "Two worn blades on a wooden haft: lighter than it looks."], ["Hacha doble del leñador", "Dos hojas gastadas en un mango de madera: pesa menos de lo que parece."]],
  ["caveira", 900, ["Martelo da caveira alada", "Martelo de latão com caveira alada na cabeça. Sua sombra avisa o golpe que vem."], ["Winged skull hammer", "A brass hammer with a winged skull on its head. Its shadow warns of the incoming blow."], ["Martillo de la calavera alada", "Martillo de latón con calavera alada en la cabeza. Su sombra avisa del golpe."]],
  ["lava", 1100, ["Martelo de lava", "A cabeça ainda guarda o calor da forja, entre placas de cobre."], ["Lava hammer", "Its head still holds the heat of the forge, between copper plates."], ["Martillo de lava", "La cabeza aún guarda el calor de la forja, entre placas de cobre."]],
  ["noite", 1500, ["Alabarda negra", "Alabarda negra de cabo fino e lâmina larga, das guardas noturnas."], ["Black halberd", "A black halberd with a slim haft and a broad blade, from the night guard."], ["Alabarda negra", "Alabarda negra de mango fino y hoja ancha, de las guardias nocturnas."]],
  ["lanca", 2200, ["Lança-tridente de aço", "Lança de três pontas e cabo enfaixado: mantém o inimigo longe."], ["Steel trident spear", "A three-pointed spear with a wrapped haft: it keeps the enemy at bay."], ["Lanza tridente de acero", "Lanza de tres puntas y mango vendado: mantiene lejos al enemigo."]],
  ["bigorna", 2800, ["Martelo bigorna", "Uma bigorna num cabo. Protege só por ocupar tanto espaço."], ["Anvil hammer", "An anvil on a stick. It protects you just by taking up so much space."], ["Martillo yunque", "Un yunque en un mango. Protege solo por ocupar tanto espacio."]],
  ["cravos", 3100, ["Clava de cravos", "Clava de ferro cravejada, com fitas gastas de batalhas antigas."], ["Studded club", "A studded iron club with worn ribbons from old battles."], ["Maza de clavos", "Maza de hierro tachonada, con cintas gastadas de batallas antiguas."]],
  ["gume", 3600, ["Machado gume de gelo", "Machado de lâmina dupla com gume azulado, frio ao toque."], ["Ice-edge axe", "A double-bladed axe with a bluish edge, cold to the touch."], ["Hacha filo de hielo", "Hacha de doble hoja con filo azulado, fría al tacto."]],
  ["coral", 4200, ["Tridente de coral", "Tridente vermelho e leve, polido como coral. Quase não cansa."], ["Coral trident", "A light red trident, polished like coral. It barely tires the arm."], ["Tridente de coral", "Tridente rojo y ligero, pulido como coral. Casi no cansa."]],
  ["caldeira", 5500, ["Martelo-caldeira", "Uma caldeira inteira presa num cabo, com pistões e rebites. Acumula pressão a cada golpe."], ["Boiler hammer", "A whole boiler on a haft, with pistons and rivets. Builds pressure with every blow."], ["Martillo caldera", "Una caldera entera en un mango, con pistones y remaches. Acumula presión con cada golpe."]],
  ["mares", 6000, ["Tridente dos mares", "Tridente antigo de ferro escuro. Quem o segura sente a onda antes de ela quebrar."], ["Trident of the seas", "An ancient trident of dark iron. Its bearer feels the wave before it breaks."], ["Tridente de los mares", "Tridente antiguo de hierro oscuro. Quien lo sostiene siente la ola antes de que rompa."]],
  ["ornada", 7000, ["Machado do juramento", "Machado de lâminas gravadas, feito para quem jurou não recuar."], ["Oath axe", "An axe with engraved blades, made for those who swore never to retreat."], ["Hacha del juramento", "Hacha de hojas grabadas, hecha para quien juró no retroceder."]],
  ["eter", 8000, ["Machado de éter", "Lâmina de energia azul presa num núcleo de éter que nunca apaga."], ["Ether axe", "A blade of blue energy held by an ether core that never goes out."], ["Hacha de éter", "Hoja de energía azul sujeta a un núcleo de éter que nunca se apaga."]],
  ["mitica", 9000, ["Martelo rubro-negro", "Cabeça de pedra negra rachada em vermelho, com fitas de guerra."], ["Red-black hammer", "A head of black stone cracked with red, tied with war ribbons."], ["Martillo rojinegro", "Cabeza de piedra negra agrietada en rojo, con cintas de guerra."]],
  ["espinhos", 10500, ["Foice de espinhos", "Lâmina curva de espinhos e tiras vermelhas, torta como um galho morto."], ["Thorn scythe", "A curved blade of thorns and red strips, twisted like a dead branch."], ["Guadaña de espinas", "Hoja curva de espinas y tiras rojas, torcida como una rama muerta."]],
  ["praga", 12500, ["Machado da praga", "Machado rubro de correntes e farpas. Dizem que a ferrugem dele nunca para de crescer."], ["Blight axe", "A crimson axe of chains and barbs. They say its rust never stops growing."], ["Hacha de la plaga", "Hacha roja de cadenas y púas. Dicen que su óxido nunca deja de crecer."]],
  ["neon", 15000, ["Machado do abismo azul", "Cristal azul que brilha por dentro, em duas lâminas que ninguém sabe quem forjou."], ["Blue abyss axe", "Blue crystal glowing from within, in two blades nobody knows who forged."], ["Hacha del abismo azul", "Cristal azul que brilla por dentro, en dos hojas que nadie sabe quién forjó."]],
]
const UI = {
  "pt-BR": { i: 2, source: "Loja de Armas do Arsenal: {p} moedas.", ui: { weaponsShopTitle: "Loja de Armas", gearTabWeapons: "Armas", gearWarriorOnly: "Só guerreiros usam espadas", pvWeapons: "Comprar armas", shopSwords: "Espadas", shopHammers: "Hammers", gearHammerOnly: "Só Soldado de Pedra, Marú e Kragor usam estas armas" } },
  en: { i: 3, source: "Arsenal Weapon Shop: {p} coins.", ui: { weaponsShopTitle: "Weapon Shop", gearTabWeapons: "Weapons", gearWarriorOnly: "Only warriors can use swords", pvWeapons: "Buy weapons", shopSwords: "Swords", shopHammers: "Hammers", gearHammerOnly: "Only Stone Soldier, Marú and Kragor can use these weapons" } },
  es: { i: 4, source: "Tienda de Armas del Arsenal: {p} monedas.", ui: { weaponsShopTitle: "Tienda de Armas", gearTabWeapons: "Armas", gearWarriorOnly: "Solo los guerreros usan espadas", pvWeapons: "Comprar armas", shopSwords: "Espadas", shopHammers: "Hammers", gearHammerOnly: "Solo el Soldado de Piedra, Marú y Kragor usan estas armas" } },
}
for (const [lang, L] of Object.entries(UI)) {
  const file = path.join(DIR, lang + ".json")
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  const mm = dict.MeuMundo
  if (!mm) throw new Error("sem MeuMundo em " + lang)
  const base = mm.gearUses_colete_couro
  if (!base || !base.includes("35")) throw new Error("gearUses_colete_couro mudou em " + lang)
  const add = { ...L.ui }
  for (const s of SWORDS) {
    const [id, price] = s
    add["gear_espada_" + id] = s[L.i][0]
    add["gearDesc_espada_" + id] = s[L.i][1]
    add["gearSource_espada_" + id] = L.source.replace("{p}", String(price))
    add["gearUses_espada_" + id] = base.replace("35", String(Math.round(price * 0.12)))
  }
  for (const s of HEAVY) {
    const [id, price] = s
    add["gear_pesada_" + id] = s[L.i][0]
    add["gearDesc_pesada_" + id] = s[L.i][1]
    add["gearSource_pesada_" + id] = L.source.replace("{p}", String(price))
    add["gearUses_pesada_" + id] = base.replace("35", String(Math.round(price * 0.12)))
  }
  let n = 0
  for (const [k, v] of Object.entries(add)) if (!(k in mm)) { mm[k] = v; n++ }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(lang, "+" + n)
}
