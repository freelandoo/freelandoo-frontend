// mm3d-68: escudos da Loja de Armas do Arsenal.
// Idempotente (fill-if-absent). node <script> [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const SHIELDS = [["ferro",350,["Escudo de ferro de Lúmen","Chapa de ferro com bossa no meio: o primeiro escudo de todo guerreiro da cidade."],["Lúmen iron shield","An iron plate with a central boss: the first shield of every warrior in the city."],["Escudo de hierro de Lúmen","Plancha de hierro con umbo central: el primer escudo de todo guerrero de la ciudad."]],
  ["rebites",500,["Escudo rebitado","Liso e cheio de rebites, sem enfeite nenhum. Pesa menos no braço do que parece."],["Riveted shield","Plain and full of rivets, with no ornament at all. It weighs less on the arm than it looks."],["Escudo remachado","Liso y lleno de remaches, sin adorno alguno. Pesa menos en el brazo de lo que parece."]],
  ["azul",900,["Escudo de aço azul","Aço temperado até ficar azul, em linhas retas e secas."],["Blue steel shield","Steel tempered until it turned blue, in straight, dry lines."],["Escudo de acero azul","Acero templado hasta volverse azul, en líneas rectas y secas."]],
  ["cravos",1100,["Pavês de cravos","Pavês estreito e curvo, cheio de pontas: quem bate nele também sai ferido."],["Spiked pavise","A narrow, curved pavise full of points: whoever strikes it gets hurt too."],["Pavés de clavos","Pavés estrecho y curvo, lleno de puntas: quien lo golpea también sale herido."]],
  ["sol",1500,["Escudo do sol de ferro","Redondo, de madeira velha, com um sol de ferro no centro. Atrai o olho e avisa o golpe."],["Iron sun shield","Round, of old wood, with an iron sun at its center. It draws the eye and warns of the blow."],["Escudo del sol de hierro","Redondo, de madera vieja, con un sol de hierro en el centro. Atrae la mirada y avisa del golpe."]],
  ["prata",2200,["Escudo de prata cinzelada","Prata trabalhada à mão, com uma cruz florida no meio e rebites na borda."],["Chiseled silver shield","Hand-worked silver, with a flowered cross at its center and rivets along the rim."],["Escudo de plata cincelada","Plata trabajada a mano, con una cruz florida en el centro y remaches en el borde."]],
  ["filigrana",2800,["Égide de filigrana","Latão dourado em volutas e pedras cor de âmbar. Cada bloqueio aquece as pedras."],["Filigree aegis","Golden brass in scrolls and amber stones. Each block warms the stones."],["Égida de filigrana","Latón dorado en volutas y piedras color ámbar. Cada bloqueo calienta las piedras."]],
  ["bosque",3300,["Escudo do bosque","Madeira clara com uma árvore de prata e folhas de esmeralda. Quase não cansa o braço."],["Grove shield","Pale wood with a silver tree and emerald leaves. It barely tires the arm."],["Escudo del bosque","Madera clara con un árbol de plata y hojas de esmeralda. Casi no cansa el brazo."]],
  ["ametista",4200,["Escudo de ametista","Ferro escuro em arabescos, com ametistas engastadas que guardam um pouco de éter."],["Amethyst shield","Dark iron in arabesques, set with amethysts that hold a little ether."],["Escudo de amatista","Hierro oscuro en arabescos, con amatistas engastadas que guardan algo de éter."]],
  ["caveira",5500,["Muralha da caveira","Placa alta de ferro negro com caveira e farpas. Serve de parede e de arma."],["Skull rampart","A tall black iron plate with a skull and barbs. It serves as both wall and weapon."],["Muralla de la calavera","Placa alta de hierro negro con calavera y púas. Sirve de muro y de arma."]],
  ["lava",6000,["Escudo de escamas de lava","Escamas de bronze sobre um coração de lava que ainda não esfriou."],["Lava scale shield","Bronze scales over a heart of lava that has not yet cooled."],["Escudo de escamas de lava","Escamas de bronce sobre un corazón de lava que aún no se ha enfriado."]],
  ["lanterna",7000,["Escudo da lanterna","Grade de ferro com uma luz âmbar por dentro, das rondas noturnas de Lúmen."],["Lantern shield","An iron grate with an amber light inside, from Lúmen's night patrols."],["Escudo de la linterna","Reja de hierro con una luz ámbar por dentro, de las rondas nocturnas de Lúmen."]],
  ["demonio",8500,["Escudo do demônio cornudo","Um rosto de chifres em ferro velho, com olhos de esmeralda que parecem seguir o inimigo."],["Horned demon shield","A horned face in old iron, with emerald eyes that seem to follow the enemy."],["Escudo del demonio cornudo","Un rostro de cuernos en hierro viejo, con ojos de esmeralda que parecen seguir al enemigo."]],
  ["alvorada",10000,["Égide da alvorada","Ouro e marfim em raios, como a primeira luz de Aurion sobre Lúmen."],["Aegis of dawn","Gold and ivory in rays, like Aurion's first light over Lúmen."],["Égida del alba","Oro y marfil en rayos, como la primera luz de Aurion sobre Lúmen."]],
  ["fe",12000,["Escudo da fé","A cruz de luz nunca apagou. Quem o carrega sente o golpe antes de ele sair."],["Shield of faith","Its cross of light has never gone out. Whoever carries it feels the blow before it comes."],["Escudo de la fe","Su cruz de luz nunca se apagó. Quien lo lleva siente el golpe antes de que salga."]],
  ["fera",15000,["Escudo da fera violeta","Uma fera de éter presa na chapa, com veios que pulsam. Ninguém sabe o que acontece se ela acordar."],["Violet beast shield","An ether beast trapped in the plate, with pulsing veins. No one knows what happens if it wakes."],["Escudo de la bestia violeta","Una bestia de éter atrapada en la plancha, con vetas que laten. Nadie sabe qué pasa si despierta."]]]
const UI = {
  "pt-BR": { i: 2, source: "Loja de Armas do Arsenal: {p} moedas.", uses: "Equipar no slot de escudo; bônus de aventura sujeitos ao teto. Reciclar por {s} moedas por unidade quando não estiver equipado.", ui: { shopShields: "Escudos", forgeShields: "Escudos", gearShieldOnly: "Só quem usa espada leva escudo" } },
  en: { i: 3, source: "Arsenal Weapon Shop: {p} coins.", uses: "Equip in the shield slot; adventure bonuses are subject to the cap. Recycle for {s} coins per unit when not equipped.", ui: { shopShields: "Shields", forgeShields: "Shields", gearShieldOnly: "Only sword users can carry a shield" } },
  es: { i: 4, source: "Tienda de Armas del Arsenal: {p} monedas.", uses: "Equipar en la ranura de escudo; bonificaciones de aventura sujetas al tope. Reciclar por {s} monedas por unidad cuando no esté equipado.", ui: { shopShields: "Escudos", forgeShields: "Escudos", gearShieldOnly: "Solo quien usa espada lleva escudo" } },
}
for (const [lang, L] of Object.entries(UI)) {
  const file = path.join(DIR, lang + ".json")
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  const mm = dict.MeuMundo
  if (!mm) throw new Error("sem MeuMundo em " + lang)
  const add = { ...L.ui }
  for (const s of SHIELDS) {
    const [id, price] = s
    add["gear_escudo_" + id] = s[L.i][0]
    add["gearDesc_escudo_" + id] = s[L.i][1]
    add["gearSource_escudo_" + id] = L.source.replace("{p}", String(price))
    add["gearUses_escudo_" + id] = L.uses.replace("{s}", String(Math.round(price * 0.12)))
  }
  let n = 0
  for (const [k, v] of Object.entries(add)) if (!(k in mm)) { mm[k] = v; n++ }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(lang, "+" + n)
}
