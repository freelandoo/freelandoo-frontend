// mm3d-69: arcos da Loja de Armas do Arsenal.
// Idempotente (fill-if-absent). node <script> [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const BOWS = [["caca",400,["Arco de caça","Madeira curva e corda simples: o primeiro arco de quem aprende a mirar em Lúmen."],["Hunting bow","Curved wood and a simple string: the first bow of anyone learning to aim in Lúmen."],["Arco de caza","Madera curva y cuerda simple: el primer arco de quien aprende a apuntar en Lúmen."]],
  ["teixo",550,["Arco de teixo","Teixo envelhecido com empunhadura de couro. Puxa leve e cansa pouco."],["Yew bow","Aged yew with a leather grip. It draws lightly and tires you little."],["Arco de tejo","Tejo envejecido con empuñadura de cuero. Tensa ligero y cansa poco."]],
  ["ronda",900,["Arco de ronda","Arco curto de aço e madeira das patrulhas de Lúmen. Quem vigia vê o golpe antes."],["Patrol bow","A short bow of steel and wood from Lúmen's patrols. Those who keep watch see the blow first."],["Arco de ronda","Arco corto de acero y madera de las patrullas de Lúmen. Quien vigila ve el golpe antes."]],
  ["cobre",1100,["Arco de cobre lavrado","Cobre trabalhado à mão do punho às pontas. Pesa no braço e acerta forte."],["Wrought copper bow","Copper worked by hand from grip to tips. Heavy on the arm, hard on the target."],["Arco de cobre labrado","Cobre trabajado a mano de la empuñadura a las puntas. Pesa en el brazo y golpea fuerte."]],
  ["aco_negro",1500,["Arco de aço negro","Duas lâminas de aço escuro unidas no punho, feitas para durar mais do que quem as usa."],["Black steel bow","Two blades of dark steel joined at the grip, made to outlast whoever carries them."],["Arco de acero negro","Dos hojas de acero oscuro unidas en la empuñadura, hechas para durar más que quien las usa."]],
  ["sentinela",2200,["Arco da sentinela","Arco verde-musgo das torres de vigia. A corda vibra antes de o inimigo se mexer."],["Sentinel bow","A moss-green bow from the watchtowers. Its string hums before the enemy moves."],["Arco del centinela","Arco verde musgo de las torres de vigía. La cuerda vibra antes de que el enemigo se mueva."]],
  ["galhos",2800,["Arco de galhos dourados","Galhos de ouro trançados em volta do punho, leves como madeira viva."],["Golden branch bow","Golden branches woven around the grip, light as living wood."],["Arco de ramas doradas","Ramas de oro trenzadas en torno a la empuñadura, ligeras como madera viva."]],
  ["safira",3100,["Arco de safira","Duas safiras presas nos braços do arco guardam um pouco de cada disparo."],["Sapphire bow","Two sapphires set in the limbs keep a little of every shot."],["Arco de zafiro","Dos zafiros engastados en las palas guardan un poco de cada disparo."]],
  ["lua",3600,["Arco da lua negra","Lâminas finas em meia-lua, com uma estrela de prata no punho."],["Black moon bow","Thin crescent blades, with a silver star at the grip."],["Arco de la luna negra","Hojas finas en media luna, con una estrella de plata en la empuñadura."]],
  ["mares",4200,["Arco das marés","Vinhas verde-mar enroladas no arco. Atirar com ele é como respirar."],["Bow of the tides","Sea-green vines wound around the bow. Shooting it is like breathing."],["Arco de las mareas","Enredaderas verde mar enrolladas en el arco. Disparar con él es como respirar."]],
  ["celeste",5500,["Arco celeste","Bronze claro com veios azuis que acendem quando a corda estica."],["Celestial bow","Pale bronze with blue veins that light up as the string stretches."],["Arco celeste","Bronce claro con vetas azules que se encienden cuando la cuerda se tensa."]],
  ["eclipse",6000,["Arco do eclipse","Um disco dourado preso entre dois braços negros, como o sol encoberto."],["Eclipse bow","A golden disc held between two black limbs, like a hidden sun."],["Arco del eclipse","Un disco dorado entre dos palas negras, como el sol oculto."]],
  ["laminas",7000,["Arco de lâminas","Cada braço é uma fileira de lâminas. Ninguém chega perto de quem o carrega."],["Blade bow","Each limb is a row of blades. No one gets close to whoever carries it."],["Arco de hojas","Cada pala es una hilera de hojas. Nadie se acerca a quien lo lleva."]],
  ["asa_branca",8000,["Arco da asa branca","Asas de marfim e ouro que parecem abrir a cada disparo."],["White wing bow","Ivory and gold wings that seem to open with every shot."],["Arco del ala blanca","Alas de marfil y oro que parecen abrirse con cada disparo."]],
  ["ametista",9000,["Arco de ametista","Pontas de ametista nos dois braços, com éter preso dentro da pedra."],["Amethyst bow","Amethyst points on both limbs, with ether trapped inside the stone."],["Arco de amatista","Puntas de amatista en las dos palas, con éter atrapado en la piedra."]],
  ["plumas",9500,["Arco de plumas","Plumas de bronze claro em fileira. Solta a flecha sem fazer nenhum som."],["Feather bow","Rows of pale bronze feathers. It looses the arrow without a sound."],["Arco de plumas","Plumas de bronce claro en hilera. Suelta la flecha sin hacer ruido."]],
  ["estrelas",10500,["Arco da noite estrelada","Arco longo de aço-noite cravejado de luz. Dizem que aponta sempre para o norte."],["Starry night bow","A long bow of night-steel studded with light. They say it always points north."],["Arco de la noche estrellada","Arco largo de acero nocturno tachonado de luz. Dicen que siempre apunta al norte."]],
  ["dragao",12500,["Arco do dragão rubro","Osso e escama rubra, com a cabeça do dragão no punho. Cada flecha sai rosnando."],["Crimson dragon bow","Bone and crimson scale, with the dragon's head at the grip. Every arrow leaves snarling."],["Arco del dragón rubí","Hueso y escama carmesí, con la cabeza del dragón en la empuñadura. Cada flecha sale gruñendo."]],
  ["rubro",15000,["Arco da lua rubra","Lâminas negras e rubras em volta de um sol de sangue. Foi tirado de um campeão dos Jogos Eternos."],["Red moon bow","Black and crimson blades around a blood sun. It was taken from a champion of the Eternal Games."],["Arco de la luna roja","Hojas negras y rojas en torno a un sol de sangre. Fue arrebatado a un campeón de los Juegos Eternos."]]]
const UI = {
  "pt-BR": { i: 2, source: "Loja de Armas do Arsenal: {p} moedas.", ui: { shopBows: "Arcos", gearBowOnly: "Só Íris e Aeryn usam arcos" } },
  en: { i: 3, source: "Arsenal Weapon Shop: {p} coins.", ui: { shopBows: "Bows", gearBowOnly: "Only Íris and Aeryn use bows" } },
  es: { i: 4, source: "Tienda de Armas del Arsenal: {p} monedas.", ui: { shopBows: "Arcos", gearBowOnly: "Solo Íris y Aeryn usan arcos" } },
}
for (const [lang, L] of Object.entries(UI)) {
  const file = path.join(DIR, lang + ".json")
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  const mm = dict.MeuMundo
  if (!mm) throw new Error("sem MeuMundo em " + lang)
  const base = mm.gearUses_colete_couro
  if (!base || !base.includes("35")) throw new Error("gearUses_colete_couro mudou em " + lang)
  const add = { ...L.ui }
  for (const s of BOWS) {
    const [id, price] = s
    add["gear_arco_" + id] = s[L.i][0]
    add["gearDesc_arco_" + id] = s[L.i][1]
    add["gearSource_arco_" + id] = L.source.replace("{p}", String(price))
    add["gearUses_arco_" + id] = base.replace("35", String(Math.round(price * 0.12)))
  }
  let n = 0
  for (const [k, v] of Object.entries(add)) if (!(k in mm)) { mm[k] = v; n++ }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(lang, "+" + n)
}
