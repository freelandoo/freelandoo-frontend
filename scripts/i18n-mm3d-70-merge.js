// mm3d-70: armas de fogo da Loja de Armas do Arsenal.
// Idempotente (fill-if-absent). node <script> [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const GUNS = [["sucata",400,["Fuzil de sucata","Montado com peças do ferro-velho de Lúmen. Enferrujado, mas ainda atira reto."],["Scrap rifle","Built from parts out of Lúmen's junkyard. Rusty, but it still shoots straight."],["Fusil de chatarra","Montado con piezas del desguace de Lúmen. Oxidado, pero aún dispara recto."]],
  ["revolver",550,["Revólver de Lúmen","Seis câmaras e um cano curto: leve na mão e fácil de carregar."],["Lúmen revolver","Six chambers and a short barrel: light in the hand and easy to load."],["Revólver de Lúmen","Seis recámaras y un cañón corto: ligero en la mano y fácil de cargar."]],
  ["patrulha",900,["Carabina de patrulha","A carabina cinza dos guardas de Lúmen. O visor avisa quem se aproxima."],["Patrol carbine","The gray carbine of Lúmen's guards. Its sight warns of anyone approaching."],["Carabina de patrulla","La carabina gris de los guardias de Lúmen. Su visor avisa de quien se acerca."]],
  ["dupla",1100,["Escopeta dupla","Dois canos curtos e um coice honesto. Sem delicadeza nenhuma."],["Double shotgun","Two short barrels and an honest kick. No delicacy at all."],["Escopeta doble","Dos cañones cortos y un retroceso honesto. Sin delicadeza alguna."]],
  ["pistola",1500,["Pistola rubra","Pistola pesada de chapa preta e vermelha, feita para acertar de primeira."],["Crimson pistol","A heavy pistol of black and red plate, made to hit on the first try."],["Pistola carmesí","Pistola pesada de chapa negra y roja, hecha para acertar a la primera."]],
  ["mira",2200,["Fuzil de mira","A luneta azul enxerga o movimento antes do olho."],["Scoped rifle","Its blue scope sees movement before the eye does."],["Fusil de mira","Su mira azul ve el movimiento antes que el ojo."]],
  ["trabuco",2800,["Trabuco de latão","Madeira, latão e um tambor de éter. Uma relíquia que ainda funciona."],["Brass blunderbuss","Wood, brass and an ether drum. A relic that still works."],["Trabuco de latón","Madera, latón y un tambor de éter. Una reliquia que aún funciona."]],
  ["raios",3100,["Pistola de raios","Bobinas de cobre dentro de vidro: cada disparo guarda um pouco de carga."],["Ray gun","Copper coils inside glass: every shot stores a little charge."],["Pistola de rayos","Bobinas de cobre dentro de vidrio: cada disparo guarda algo de carga."]],
  ["tambor",3600,["Canhão de mão","Pequeno demais para ser canhão, pesado demais para ser pistola."],["Hand cannon","Too small to be a cannon, too heavy to be a pistol."],["Cañón de mano","Demasiado pequeño para ser cañón, demasiado pesado para ser pistola."]],
  ["garra",4200,["Garra de vapor","Uma esfera de fogo presa em garras de latão, com manômetro no cano."],["Steam claw","A sphere of fire held in brass claws, with a gauge on the barrel."],["Garra de vapor","Una esfera de fuego sujeta en garras de latón, con manómetro en el cañón."]],
  ["rubro",5500,["Canhão rubro","Chapa vermelha gasta de batalha e um cano longo que nunca esfria."],["Crimson cannon","Battle-worn red plate and a long barrel that never cools."],["Cañón rojo","Chapa roja gastada por la batalla y un cañón largo que nunca se enfría."]],
  ["neon",6000,["Fuzil neon","Branco, rosa e ciano: a arma mais vistosa do Arsenal, e a mais atenta."],["Neon rifle","White, pink and cyan: the flashiest weapon in the Arsenal, and the most alert."],["Fusil neón","Blanco, rosa y cian: el arma más vistosa del Arsenal, y la más atenta."]],
  ["pinca",7000,["Pinça de plasma","Duas garras de metal seguram o plasma até o gatilho soltar."],["Plasma pincer","Two metal claws hold the plasma until the trigger lets it go."],["Pinza de plasma","Dos garras de metal sujetan el plasma hasta que el gatillo lo suelta."]],
  ["rosa",8000,["Lançador rosa","Cápsulas de energia rosa em volta do cano. Faz mais barulho do que parece."],["Pink launcher","Pink energy capsules around the barrel. It's louder than it looks."],["Lanzador rosa","Cápsulas de energía rosa en torno al cañón. Hace más ruido del que parece."]],
  ["serpente",9000,["Fuzil da serpente","Corpo de escamas negras e vermelhas, com a coronha em forma de cauda."],["Serpent rifle","A body of black and red scales, with a tail-shaped stock."],["Fusil de la serpiente","Cuerpo de escamas negras y rojas, con la culata en forma de cola."]],
  ["assalto",11000,["Canhão de assalto","Longo, preto e aceso por dentro. Foi feito para derrubar portões."],["Assault cannon","Long, black and lit from within. It was made to bring down gates."],["Cañón de asalto","Largo, negro y encendido por dentro. Se hizo para derribar portones."]],
  ["sombra",15000,["Canhão de sombra","Encaixa no braço como uma fera de ferro. Ninguém ouve o disparo."],["Shadow cannon","It fits on the arm like an iron beast. No one hears the shot."],["Cañón de sombra","Encaja en el brazo como una fiera de hierro. Nadie oye el disparo."]]]
const UI = {
  "pt-BR": { i: 2, source: "Loja de Armas do Arsenal: {p} moedas.", ui: { shopGuns: "Guns", gearGunOnly: "Só Ciborgue e Noctis usam estas armas" } },
  en: { i: 3, source: "Arsenal Weapon Shop: {p} coins.", ui: { shopGuns: "Guns", gearGunOnly: "Only Cyborg and Noctis use these weapons" } },
  es: { i: 4, source: "Tienda de Armas del Arsenal: {p} monedas.", ui: { shopGuns: "Guns", gearGunOnly: "Solo Ciborg y Noctis usan estas armas" } },
}
for (const [lang, L] of Object.entries(UI)) {
  const file = path.join(DIR, lang + ".json")
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  const mm = dict.MeuMundo
  if (!mm) throw new Error("sem MeuMundo em " + lang)
  const base = mm.gearUses_colete_couro
  if (!base || !base.includes("35")) throw new Error("gearUses_colete_couro mudou em " + lang)
  const add = { ...L.ui }
  for (const s of GUNS) {
    const [id, price] = s
    add["gear_fogo_" + id] = s[L.i][0]
    add["gearDesc_fogo_" + id] = s[L.i][1]
    add["gearSource_fogo_" + id] = L.source.replace("{p}", String(price))
    add["gearUses_fogo_" + id] = base.replace("35", String(Math.round(price * 0.12)))
  }
  let n = 0
  for (const [k, v] of Object.entries(add)) if (!(k in mm)) { mm[k] = v; n++ }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(lang, "+" + n)
}
