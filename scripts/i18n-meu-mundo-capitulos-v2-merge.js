// Meu Mundo 3D — capítulos 1–10 reescritos pela gênese do Alex (19/11/2026).
// Roteiro: MEU MUNDO 3D/historia/v2/09-capitulos-lore-nova.md (aprovado pelo Alex).
// As missões não mudam: só o texto. Grava SÓ estas chaves, em dois lugares:
//   features/meu-mundo/ui/quest/chapters-text.json  (fallback pt + fonte [pt, en, es])
//   messages/{pt-BR,en,es}.json → MeuMundo
// Não roda o merge antigo dos capítulos (ele reescreveria chaves de outras entregas).
// Idempotente: valor igual não muda; valor diferente é ATUALIZADO (OVERRIDE).
// Rodar: node scripts/i18n-meu-mundo-capitulos-v2-merge.js
const fs = require("fs")
const path = require("path")

const KEYS = {
  // Capítulo 1 — A Cápsula Três
  qc_cap1_intro_raposa: [
    "Você acorda na cápsula 3 do Laboratório de Criogenia. A Dra. Nívea anota tudo o que você sente, como quem confere uma peça. Lá fora, um Vampiro cospe no pé da estátua de Morkhan quando vê você olhando.",
    "You wake up in capsule 3 of the Cryogenics Lab. Dr. Nívea writes down everything you feel, like someone checking a part. Outside, a Vampire spits at the foot of Morkhan's statue when he sees you looking.",
    "Despiertas en la cápsula 3 del Laboratorio de Criogenia. La Dra. Nívea anota todo lo que sientes, como quien revisa una pieza. Afuera, un Vampiro escupe al pie de la estatua de Morkhan cuando te ve mirando.",
  ],
  qc_cap1_intro_vampiro: [
    "Você acorda na cápsula 3 do Laboratório de Criogenia. A Dra. Nívea anota tudo o que você sente, como quem confere uma peça. Lá fora, um Vampiro velho toca seu ombro: \"Bem-vindo de volta, irmão. Ele está esperando.\"",
    "You wake up in capsule 3 of the Cryogenics Lab. Dr. Nívea writes down everything you feel, like someone checking a part. Outside, an old Vampire touches your shoulder: \"Welcome back, brother. He is waiting.\"",
    "Despiertas en la cápsula 3 del Laboratorio de Criogenia. La Dra. Nívea anota todo lo que sientes, como quien revisa una pieza. Afuera, un Vampiro viejo te toca el hombro: \"Bienvenido de vuelta, hermano. Él te está esperando.\"",
  ],
  qs_cap1_degelo_done: [
    "O gelo racha. O ar do laboratório tem cheiro de ferro e remédio. Nas outras cápsulas, formas que não parecem Raposas.",
    "The ice cracks. The lab air smells of iron and medicine. In the other capsules, shapes that don't look like Foxes.",
    "El hielo se agrieta. El aire del laboratorio huele a hierro y a medicina. En las otras cápsulas, formas que no parecen Zorros.",
  ],
  qs_cap1_pedra_done: [
    "De perto, a pedra tem o braço erguido, a mão aberta, como quem acabou de jogar alguma coisa. Na estátua do outro deus, o mesmo gesto.",
    "Up close, the stone has its arm raised and its hand open, as if it had just thrown something. The other god's statue makes the same gesture.",
    "De cerca, la piedra tiene el brazo levantado y la mano abierta, como quien acaba de lanzar algo. La estatua del otro dios hace el mismo gesto.",
  ],
  qc_cap1_hook: [
    "Por que a Dra. Nívea anota tudo o que você sente? E o que tem nas outras cápsulas?",
    "Why does Dr. Nívea write down everything you feel? And what is in the other capsules?",
    "¿Por qué la Dra. Nívea anota todo lo que sientes? ¿Y qué hay en las otras cápsulas?",
  ],

  // Capítulo 2 — O Bairro
  qs_cap2_lar_done: [
    "Uma casa. Uma cama. Uma geladeira vazia. Faz quinze anos que ninguém pergunta se você está com fome.",
    "A house. A bed. An empty fridge. For fifteen years, nobody has asked if you are hungry.",
    "Una casa. Una cama. Una nevera vacía. Hace quince años que nadie te pregunta si tienes hambre.",
  ],
  qs_cap2_sonho_done_raposa: [
    "Um campo de batalha de madrugada. Você carrega uma Raposa ferida nas costas até uma porta de laboratório. Alguém de jaleco diz \"obrigada\". Você acorda com as mãos tremendo.",
    "A battlefield before dawn. You carry a wounded Fox on your back to a laboratory door. Someone in a lab coat says \"thank you\". You wake up with your hands shaking.",
    "Un campo de batalla de madrugada. Cargas a un Zorro herido en la espalda hasta la puerta de un laboratorio. Alguien con bata dice \"gracias\". Despiertas con las manos temblando.",
  ],
  qs_cap2_sonho_done_vampiro: [
    "Uma porta de ferro com uma grade. Do outro lado, alguém grita. Você segura a lâmina. Você acorda com as mãos tremendo.",
    "An iron door with a grate. On the other side, someone screams. You are holding the blade. You wake up with your hands shaking.",
    "Una puerta de hierro con una reja. Del otro lado, alguien grita. Tú sostienes la hoja. Despiertas con las manos temblando.",
  ],
  qc_cap2_hook_raposa: [
    "Quem era a Raposa nas suas costas? E para onde você a levou?",
    "Who was the Fox on your back? And where did you take them?",
    "¿Quién era el Zorro en tu espalda? ¿Y adónde lo llevaste?",
  ],
  qc_cap2_hook_vampiro: [
    "De quem é o grito? O que você fez com a lâmina?",
    "Whose scream is it? What did you do with the blade?",
    "¿De quién es el grito? ¿Qué hiciste con la hoja?",
  ],

  // Capítulo 3 — Néctar
  qc_cap3_intro_raposa: [
    "A Sacerdotisa do Sol explica: Marú e Bastor prometeram que os deuses podem voltar, se o povo lutar muito. Toda semana, a sua posição em cada jogo vira néctar. No domingo, leve ao pé de Aurion.",
    "The Sun Priestess explains: Marú and Bastor promised the gods can come back if the people fight hard. Every week, your position in each game becomes nectar. On Sunday, take it to Aurion's feet.",
    "La Sacerdotisa del Sol explica: Marú y Bastor prometieron que los dioses pueden volver si el pueblo lucha mucho. Cada semana, tu posición en cada juego se vuelve néctar. El domingo, llévalo a los pies de Aurion.",
  ],
  qc_cap3_intro_vampiro: [
    "O Arauto da Lua explica: Marú e Bastor prometeram que os deuses podem voltar, se o povo lutar muito. Toda semana, a sua posição em cada jogo vira néctar. No domingo, leve ao pé de Morkhan, na praça.",
    "The Moon Herald explains: Marú and Bastor promised the gods can come back if the people fight hard. Every week, your position in each game becomes nectar. On Sunday, take it to Morkhan's feet, in the square.",
    "El Heraldo de la Luna explica: Marú y Bastor prometieron que los dioses pueden volver si el pueblo lucha mucho. Cada semana, tu posición en cada juego se vuelve néctar. El domingo, llévalo a los pies de Morkhan, en la plaza.",
  ],
  qs_cap3_oferenda_done: [
    "A pedra estala. Um pedaço do tamanho de uma mão se solta. Lá dentro, por um instante, alguma coisa se mexe.",
    "The stone cracks. A piece the size of a hand breaks off. Inside, for an instant, something moves.",
    "La piedra cruje. Se suelta un pedazo del tamaño de una mano. Adentro, por un instante, algo se mueve.",
  ],
  qc_cap3_hook: [
    "Na noite de domingo, um lobo derruba quem carregava néctar e foge com o frasco. Lobos não bebem néctar. Para quem ele está levando?",
    "On Sunday night, a wolf knocks down someone carrying nectar and runs off with the flask. Wolves don't drink nectar. Who is it taking it to?",
    "El domingo por la noche, un lobo derriba a quien llevaba néctar y huye con el frasco. Los lobos no beben néctar. ¿Para quién lo lleva?",
  ],

  // Capítulo 4 — Ferro
  qs_cap4_pedra_done: [
    "Os Soldados de Pedra lutam sem raiva e sem parar. Nas costas de um deles, uma placa de bronze com um número gravado, igual às da cápsula onde você acordou.",
    "The Stone Soldiers fight without anger and without stopping. On one of their backs, a bronze plate with an engraved number, just like the ones on the capsule where you woke up.",
    "Los Soldados de Piedra luchan sin rabia y sin parar. En la espalda de uno de ellos, una placa de bronce con un número grabado, igual a las de la cápsula donde despertaste.",
  ],
  qs_cap4_forja_done: [
    "Num canto da Forja, peças de bronze que não são de arma: juntas, parafusos de osso, placas numeradas. O forjador diz que quem encomenda é o laboratório.",
    "In a corner of the Forge, bronze parts that are not weapons: joints, bone screws, numbered plates. The smith says the lab is the one ordering them.",
    "En un rincón de la Forja, piezas de bronce que no son de armas: articulaciones, tornillos de hueso, placas numeradas. El herrero dice que quien las encarga es el laboratorio.",
  ],
  qs_cap4_noite_done: [
    "O lobo cai e a armadura dele se abre um pouco. Por dentro não há lobo inteiro: há costura, ferro e um selo do Laboratório de Criogenia.",
    "The wolf falls and its armor opens a little. Inside there is no whole wolf: there are stitches, iron and a seal from the Cryogenics Lab.",
    "El lobo cae y su armadura se abre un poco. Por dentro no hay un lobo entero: hay costuras, hierro y un sello del Laboratorio de Criogenia.",
  ],
  qc_cap4_hook: [
    "Bastor fez os lobos. Quem pôs ferro neles?",
    "Bastor made the wolves. Who put iron in them?",
    "Bastor hizo a los lobos. ¿Quién les puso hierro?",
  ],

  // Capítulo 5 — A Matilha de Bastor
  qc_cap5_title: ["A Matilha de Bastor", "Bastor's Pack", "La Manada de Bastor"],
  qc_cap5_intro_raposa: [
    "O selo do lobo leva você ao Ninho, a velha toca da matilha de Bastor. Lá está o livro do laboratório: lobos mortos na guerra, recolhidos e \"refeitos\". Quem levou os corpos foram Raposas.",
    "The wolf's seal leads you to the Nest, the old den of Bastor's pack. There lies the lab's ledger: wolves killed in the war, collected and \"remade\". The ones who brought the bodies were Foxes.",
    "El sello del lobo te lleva al Nido, la vieja guarida de la manada de Bastor. Allí está el libro del laboratorio: lobos muertos en la guerra, recogidos y \"rehechos\". Quienes llevaron los cuerpos fueron Zorros.",
  ],
  qc_cap5_intro_vampiro: [
    "O selo do lobo leva você ao Ninho, a velha toca da matilha de Bastor. Lá está o livro do laboratório: lobos mortos na guerra, recolhidos e \"refeitos\". Os ferimentos que os mataram foram de Vampiros.",
    "The wolf's seal leads you to the Nest, the old den of Bastor's pack. There lies the lab's ledger: wolves killed in the war, collected and \"remade\". The wounds that killed them were made by Vampires.",
    "El sello del lobo te lleva al Nido, la vieja guarida de la manada de Bastor. Allí está el libro del laboratorio: lobos muertos en la guerra, recogidos y \"rehechos\". Las heridas que los mataron fueron de Vampiros.",
  ],
  qs_cap5_ninho_done_raposa: [
    "Na página dois, a letra de quem entregou os corpos. Nomes de Raposas. Um deles é o seu.",
    "On page two, the handwriting of those who delivered the bodies. Fox names. One of them is yours.",
    "En la página dos, la letra de quienes entregaron los cuerpos. Nombres de Zorros. Uno de ellos es el tuyo.",
  ],
  qs_cap5_ninho_done_vampiro: [
    "Na página dois, a causa de cada morte: lâmina, lâmina, lâmina. Lâminas Vampiras.",
    "On page two, the cause of each death: blade, blade, blade. Vampire blades.",
    "En la página dos, la causa de cada muerte: hoja, hoja, hoja. Hojas Vampiras.",
  ],
  qs_cap5_bastor_done: [
    "Bastor derruba você da ilha. \"Meus. Não toca.\" Ele olha o ferro nos lobos e culpa os dois povos. Não sabe que foi a cientista.",
    "Bastor knocks you off the island. \"Mine. Don't touch.\" He looks at the iron in the wolves and blames both peoples. He doesn't know it was the scientist.",
    "Bastor te tira de la isla. \"Míos. No se tocan.\" Mira el hierro en los lobos y culpa a los dos pueblos. No sabe que fue la científica.",
  ],
  qs_cap5_matilha_done: [
    "Três lobos. Eles não obedecem a Raposas nem a Vampiros. Não querem carne: farejam o frasco de néctar no seu cinto.",
    "Three wolves. They obey neither Foxes nor Vampires. They don't want meat: they sniff the nectar flask on your belt.",
    "Tres lobos. No obedecen ni a Zorros ni a Vampiros. No quieren carne: olfatean el frasco de néctar en tu cinturón.",
  ],
  qc_cap5_hook: [
    "Os monstros não são de nenhum lado. São de quem os refez.",
    "The monsters belong to no side. They belong to whoever remade them.",
    "Los monstruos no son de ningún bando. Son de quien los rehízo.",
  ],

  // Capítulo 6 — A Ponte da Maré
  qc_cap6_intro_raposa: [
    "Na Arena, um Eco repete: \"Segura a ponte. O reforço vem.\" Você estava no exército de Fulvo e ouviu a ordem da ponte. Não perguntou nada.",
    "In the Arena, an Echo repeats: \"Hold the bridge. Reinforcements are coming.\" You were in Fulvo's army and heard the bridge order. You asked nothing.",
    "En la Arena, un Eco repite: \"Aguanta el puente. Los refuerzos vienen.\" Estabas en el ejército de Fulvo y oíste la orden del puente. No preguntaste nada.",
  ],
  qc_cap6_intro_vampiro: [
    "Na Arena, um Eco repete: \"Segura a ponte.\" O Ciborgue procura um nome: Fulvo. E você lembra de uma lâmina na sua mão.",
    "In the Arena, an Echo repeats: \"Hold the bridge.\" The Cyborg is looking for a name: Fulvo. And you remember a blade in your hand.",
    "En la Arena, un Eco repite: \"Aguanta el puente.\" El Ciborg busca un nombre: Fulvo. Y tú recuerdas una hoja en tu mano.",
  ],
  qs_cap6_aco_done: [
    "O Ciborgue cai de joelhos, mas não solta a arma. Na nuca, o número 1: foi o primeiro que a Dra. Nívea fez.",
    "The Cyborg falls to his knees but doesn't let go of his weapon. On the back of his neck, the number 1: he was the first one Dr. Nívea made.",
    "El Ciborg cae de rodillas, pero no suelta el arma. En la nuca, el número 1: fue el primero que hizo la Dra. Nívea.",
  ],
  qs_cap6_porta_azul_done_vampiro: [
    "Memória: a Raposa traída na ponte, entregue a vocês. Você estava lá quando a esquartejaram. Você segurou.",
    "Memory: the Fox betrayed at the bridge, handed over to you. You were there when they quartered him. You held him down.",
    "Recuerdo: el Zorro traicionado en el puente, entregado a ustedes. Estabas ahí cuando lo descuartizaron. Tú lo sujetaste.",
  ],
  qs_cap6_fulvo_done_raposa: [
    "Memória: \"Ponte da Maré. Sem reforço.\" Fulvo vendeu a ponte aos Vampiros. Você ouviu a ordem e bateu continência. Depois carregou o que sobrou da Raposa até o laboratório.",
    "Memory: \"Tide Bridge. No reinforcements.\" Fulvo sold the bridge to the Vampires. You heard the order and saluted. Later you carried what was left of the Fox to the lab.",
    "Recuerdo: \"Puente de la Marea. Sin refuerzos.\" Fulvo vendió el puente a los Vampiros. Oíste la orden y saludaste. Después cargaste lo que quedó del Zorro hasta el laboratorio.",
  ],
  qs_cap6_fulvo_done_vampiro: [
    "Fulvo é um herói para o seu povo. Foi ele quem entregou a ponte. Você lembra da lâmina e não consegue sorrir de volta.",
    "Fulvo is a hero to your people. He is the one who handed over the bridge. You remember the blade and can't smile back.",
    "Fulvo es un héroe para tu pueblo. Fue él quien entregó el puente. Recuerdas la hoja y no logras devolver la sonrisa.",
  ],
  qc_cap6_hook: [
    "O Ciborgue não quer vingança contra Fulvo. Quer matar todas as Raposas e todos os Vampiros. Quem ensinou isso a ele?",
    "The Cyborg doesn't want revenge on Fulvo. He wants to kill every Fox and every Vampire. Who taught him that?",
    "El Ciborg no quiere vengarse de Fulvo. Quiere matar a todos los Zorros y a todos los Vampiros. ¿Quién le enseñó eso?",
  ],

  // Capítulo 7 — As Garras
  qc_cap7_title: ["As Garras", "The Claws", "Las Garras"],
  qc_cap7_intro_raposa: [
    "A Dama das Garras caça nos telhados. Ela era uma Raposa ferida na guerra, e Nívea a refez com garras. Ela reconhece você pelo cheiro: foi você quem a carregou até o laboratório.",
    "The Lady of Claws hunts on the rooftops. She was a Fox wounded in the war, and Nívea remade her with claws. She knows you by your scent: you are the one who carried her to the lab.",
    "La Dama de las Garras caza en los tejados. Era una Zorra herida en la guerra, y Nívea la rehízo con garras. Te reconoce por el olor: fuiste tú quien la cargó hasta el laboratorio.",
  ],
  qc_cap7_intro_vampiro: [
    "A Dama das Garras caça nos telhados. Ela era uma Raposa ferida pelos Vampiros, e Nívea a refez com garras. As feridas que a mandaram para lá foram do seu povo.",
    "The Lady of Claws hunts on the rooftops. She was a Fox wounded by Vampires, and Nívea remade her with claws. The wounds that sent her there were your people's.",
    "La Dama de las Garras caza en los tejados. Era una Zorra herida por los Vampiros, y Nívea la rehízo con garras. Las heridas que la mandaron allí fueron de tu pueblo.",
  ],
  qs_cap7_telhados_done_raposa: [
    "Memória: as costas doendo, a Raposa ferida pedindo água, a porta do laboratório. A Dama escreve na parede, com a garra: VOCÊ.",
    "Memory: your back aching, the wounded Fox begging for water, the lab door. The Lady writes on the wall with her claw: YOU.",
    "Recuerdo: la espalda dolorida, la Zorra herida pidiendo agua, la puerta del laboratorio. La Dama escribe en la pared con la garra: TÚ.",
  ],
  qs_cap7_telhados_done_vampiro: [
    "Memória: a sua lâmina, a Raposa caindo. A Dama não distingue Raposa de Vampiro. Ela quer matar os dois.",
    "Memory: your blade, the Fox falling. The Lady can't tell a Fox from a Vampire. She wants to kill both.",
    "Recuerdo: tu hoja, la Zorra cayendo. La Dama no distingue Zorro de Vampiro. Quiere matar a los dos.",
  ],
  qs_cap7_mistura_done: [
    "Duas vidas viram uma. O tubo esquenta na sua mão. Nívea sorri pela primeira vez: \"Você tem jeito para isso.\"",
    "Two lives become one. The tube warms up in your hand. Nívea smiles for the first time: \"You have a knack for this.\"",
    "Dos vidas se vuelven una. El tubo se calienta en tu mano. Nívea sonríe por primera vez: \"Tienes talento para esto.\"",
  ],
  qc_cap7_hook: [
    "Ninguém congelou você para salvar você. Você era o próximo da fila.",
    "Nobody froze you to save you. You were next in line.",
    "Nadie te congeló para salvarte. Eras el siguiente en la fila.",
  ],

  // Capítulo 8 — Pedraverde
  qc_cap8_intro_raposa: [
    "Dentro da Floresta da Lua, uma clareira com um buraco enorme no chão: foi dali que Bastor levantou os Golens, das próprias pedras. No meio, sentado, o Golem de Pedra, com placas de bronze presas no corpo.",
    "Inside the Moon Forest, a clearing with a huge hole in the ground: that is where Bastor raised the Golems, from the stones themselves. In the middle, sitting, the Stone Golem, with bronze plates fixed to its body.",
    "Dentro del Bosque de la Luna, un claro con un agujero enorme en el suelo: de ahí Bastor levantó a los Gólems, de las propias piedras. En el medio, sentado, el Gólem de Piedra, con placas de bronce sujetas al cuerpo.",
  ],
  qc_cap8_intro_vampiro: [
    "Dentro da Floresta da Lua, uma clareira com um buraco enorme no chão: foi dali que Bastor levantou os Golens, das próprias pedras. No meio, sentado, o Golem de Pedra, com placas de bronze presas no corpo.",
    "Inside the Moon Forest, a clearing with a huge hole in the ground: that is where Bastor raised the Golems, from the stones themselves. In the middle, sitting, the Stone Golem, with bronze plates fixed to its body.",
    "Dentro del Bosque de la Luna, un claro con un agujero enorme en el suelo: de ahí Bastor levantó a los Gólems, de las propias piedras. En el medio, sentado, el Gólem de Piedra, con placas de bronce sujetas al cuerpo.",
  ],
  qs_cap8_campeao_done: [
    "O Brutamontes, vencido, olha para a arquibancada. Os cristais roxos nas costas dele piscam, e ele se levanta de novo, como se alguém mandasse. Era um bicho de Bastor; hoje obedece aos cristais da Nívea.",
    "The defeated Brute looks at the stands. The purple crystals on his back flicker, and he gets up again, as if someone ordered him to. He was one of Bastor's beasts; now he obeys Nívea's crystals.",
    "El Bruto, vencido, mira las gradas. Los cristales morados de su espalda parpadean y se levanta otra vez, como si alguien se lo ordenara. Era una bestia de Bastor; hoy obedece a los cristales de Nívea.",
  ],
  qs_cap8_peito_done: [
    "O peito do Golem abre um pouco. Lá dentro, no lugar do coração, uma cápsula como a sua, com o número 4. Vazia. O peito fecha.",
    "The Golem's chest opens a little. Inside, where the heart should be, a capsule like yours, with the number 4. Empty. The chest closes.",
    "El pecho del Gólem se abre un poco. Adentro, en el lugar del corazón, una cápsula como la tuya, con el número 4. Vacía. El pecho se cierra.",
  ],
  qc_cap8_hook: [
    "Nívea capturou os Golens de Bastor e os refez. A cápsula 4 está vazia. A 3 era a sua.",
    "Nívea captured Bastor's Golems and remade them. Capsule 4 is empty. Number 3 was yours.",
    "Nívea capturó a los Gólems de Bastor y los rehízo. La cápsula 4 está vacía. La 3 era la tuya.",
  ],

  // Capítulo 9 — A Guarda de Pedra
  qc_cap9_intro_raposa: [
    "Você é escolhido para guardar Aurion. Mas os Soldados de Pedra atacam qualquer um que chegue perto da estátua, até as Raposas. Eles não são de Aurion: são do laboratório.",
    "You are chosen to guard Aurion. But the Stone Soldiers attack anyone who comes near the statue, even Foxes. They don't belong to Aurion: they belong to the lab.",
    "Te eligen para custodiar a Aurion. Pero los Soldados de Piedra atacan a cualquiera que se acerque a la estatua, incluso a los Zorros. No son de Aurion: son del laboratorio.",
  ],
  qc_cap9_intro_vampiro: [
    "Você é mandado para sabotar a estátua de Aurion. Quem enfrenta você lá é o Cavaleiro Dourado, e ele também ataca os Vampiros que vieram junto.",
    "You are sent to sabotage Aurion's statue. The one who faces you there is the Golden Knight, and he also attacks the Vampires who came with you.",
    "Te mandan a sabotear la estatua de Aurion. Quien te enfrenta allí es el Caballero Dorado, y también ataca a los Vampiros que vinieron contigo.",
  ],
  qs_cap9_ouro_done: [
    "O Cavaleiro cai. A voz dele não é dele: é uma gravação, a voz da Dra. Nívea. \"Ninguém acorda.\"",
    "The Knight falls. His voice isn't his: it's a recording, Dr. Nívea's voice. \"Nobody wakes up.\"",
    "El Caballero cae. Su voz no es suya: es una grabación, la voz de la Dra. Nívea. \"Nadie despierta.\"",
  ],
  qs_cap9_corrida_done_raposa: [
    "Você despeja o néctar ao pé de Aurion. Os Soldados de Pedra viram a cabeça, todos ao mesmo tempo, na sua direção.",
    "You pour the nectar at Aurion's feet. The Stone Soldiers turn their heads, all at the same time, toward you.",
    "Viertes el néctar a los pies de Aurion. Los Soldados de Piedra giran la cabeza, todos a la vez, hacia ti.",
  ],
  qs_cap9_corrida_done_vampiro: [
    "Você despeja o néctar ao pé de Morkhan. Do outro lado da cidade, algo de ouro levanta a espada.",
    "You pour the nectar at Morkhan's feet. On the other side of the city, something golden raises its sword.",
    "Viertes el néctar a los pies de Morkhan. Al otro lado de la ciudad, algo de oro levanta la espada.",
  ],
  qc_cap9_hook: [
    "Nívea não quer que nenhum deus acorde: cada litro que vai para a pedra é um litro a menos para ela. Ela quer o néctar para si. Quer virar deusa.",
    "Nívea doesn't want any god to wake up: every liter that goes into the stone is one less liter for her. She wants the nectar for herself. She wants to become a goddess.",
    "Nívea no quiere que ningún dios despierte: cada litro que va a la piedra es un litro menos para ella. Quiere el néctar para sí. Quiere volverse diosa.",
  ],

  // Capítulo 10 — Os Dois Ruins
  qc_cap10_title: ["Os Dois Ruins", "The Two Wicked", "Los Dos Malvados"],
  qc_cap10_intro_raposa: [
    "Noctis não quer que nenhum dos dois deuses acorde. Zéphyra conta, porque alguém pagou, como a pedra foi feita.",
    "Noctis doesn't want either god to wake up. Zéphyra tells, because someone paid her, how the stone was made.",
    "Noctis no quiere que ninguno de los dos dioses despierte. Zéphyra cuenta, porque alguien le pagó, cómo se hizo la piedra.",
  ],
  qc_cap10_intro_vampiro: [
    "Noctis não quer que nenhum dos dois deuses acorde. Zéphyra conta, porque alguém pagou, como a pedra foi feita.",
    "Noctis doesn't want either god to wake up. Zéphyra tells, because someone paid her, how the stone was made.",
    "Noctis no quiere que ninguno de los dos dioses despierte. Zéphyra cuenta, porque alguien le pagó, cómo se hizo la piedra.",
  ],
  qs_cap10_sombra_what: ["Vença o monstro que atacou a estátua", "Defeat the monster that attacked the statue", "Vence al monstruo que atacó la estatua"],
  qs_cap10_sombra_done: [
    "Na noite de domingo, um monstro do laboratório lambe o néctar derramado no pé da estátua do seu deus. Você o vence. Na armadura, o selo da Dra. Nívea.",
    "On Sunday night, a monster from the lab licks the nectar spilled at the foot of your god's statue. You defeat it. On its armor, Dr. Nívea's seal.",
    "El domingo por la noche, un monstruo del laboratorio lame el néctar derramado al pie de la estatua de tu dios. Lo vences. En la armadura, el sello de la Dra. Nívea.",
  ],
  qc_cap10_hook: [
    "Você entende tudo: o néctar acorda deuses que tentaram matar um ao outro, os monstros roubam o néctar para uma cientista que quer virar deusa, e você foi peça dos dois lados.",
    "You understand everything: the nectar wakes gods who tried to kill each other, the monsters steal nectar for a scientist who wants to become a goddess, and you were a piece on both sides.",
    "Lo entiendes todo: el néctar despierta a dioses que intentaron matarse entre sí, los monstruos roban néctar para una científica que quiere volverse diosa, y tú fuiste pieza de los dos bandos.",
  ],
  qc_cap10_season: [
    "Fim da Temporada 1. Marú e Bastor assistem de longe. No laboratório, a Dra. Nívea bebe o néctar roubado, e os olhos dela brilham como os de um deus. O que você vai levar para a estátua agora é com você.",
    "End of Season 1. Marú and Bastor watch from afar. In the lab, Dr. Nívea drinks the stolen nectar, and her eyes shine like a god's. What you take to the statue now is up to you.",
    "Fin de la Temporada 1. Marú y Bastor miran desde lejos. En el laboratorio, la Dra. Nívea bebe el néctar robado, y sus ojos brillan como los de un dios. Lo que lleves a la estatua ahora depende de ti.",
  ],
}

const root = path.join(__dirname, "..")
let changed = 0
// 1) a fonte dos capítulos (fallback pt + [pt, en, es])
const chFile = path.join(root, "features", "meu-mundo", "ui", "quest", "chapters-text.json")
// troca só a LINHA de cada chave (o arquivo tem uma chave por linha e linhas em branco entre capítulos)
let src = fs.readFileSync(chFile, "utf8")
const ch = JSON.parse(src)
for (const [key, vals] of Object.entries(KEYS)) {
  if (!ch[key]) throw new Error(`chave ${key} não existe em chapters-text.json`)
  if (JSON.stringify(ch[key]) === JSON.stringify(vals)) continue
  const re = new RegExp(`^(  ${JSON.stringify(key)}: )\\[.*\\](,?)\\r?$`, "m")
  if (!re.test(src)) throw new Error(`linha de ${key} fora do formato`)
  src = src.replace(re, (_m, head, comma) => `${head}[${vals.map((x) => JSON.stringify(x)).join(", ")}]${comma}`)
  changed++
}
const back = JSON.parse(src)
for (const [key, vals] of Object.entries(KEYS)) if (JSON.stringify(back[key]) !== JSON.stringify(vals)) throw new Error(`falhou ${key}`)
fs.writeFileSync(chFile, src)
// 2) as mensagens
for (const [i, locale] of ["pt-BR", "en", "es"].entries()) {
  const file = path.join(root, "messages", `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo = json.MeuMundo || {}
  for (const [key, vals] of Object.entries(KEYS)) {
    if (json.MeuMundo[key] !== vals[i]) {
      json.MeuMundo[key] = vals[i]
      changed++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n meu-mundo capítulos v2: ${changed} valores gravados`)
