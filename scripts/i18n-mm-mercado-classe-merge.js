// VS6 (2026-11-15): Empório, Banco de Sangue e Açougue — cada classe come o seu.
// Pedido do Alex: "bolsa de sangue ao invés de salmão", pizzaria vira Banco de Sangue e
// hamburgueria vira Açougue. A Raposa ficou com os ids de antes (nomes de caça e açougue,
// OVERRIDE); o Vampiro ganhou 17 pratos de sangue (chaves novas). Apelidos da alma do
// Vampiro = `soulFood*_vampiro`. Plano: MEU MUNDO 3D/planos/2026-11-15-mercado-sangue-e-acougue.md
// Idempotente. Chaves novas = fill-if-absent; valor trocado = OVERRIDE. node <script> [pasta]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")

// [chave, pt, en, es]
const RAPOSA = [
  ["item_salmao_legumes", "Peixe do rio na brasa com raízes", "River fish grilled with roots", "Pescado de río a la brasa con raíces"],
  ["item_frango_salada", "Coelho na brasa com folhas", "Ember-roasted rabbit with greens", "Conejo a la brasa con hojas"],
  ["item_prato_integral", "Prato do caçador (grãos, carne seca e folhas)", "Hunter's plate (grains, jerky and greens)", "Plato del cazador (granos, cecina y hojas)"],
  ["item_bowl_frutas", "Cesto de frutas silvestres", "Basket of wild fruit", "Cesta de frutas silvestres"],
  ["item_omelete_legumes", "Omelete de ovos da granja", "Farm-egg omelette", "Tortilla de huevos de granja"],
  ["item_iogurte_aveia", "Mingau de aveia com mel", "Oat porridge with honey", "Gachas de avena con miel"],
  ["item_sopa_legumes", "Sopa de raízes com osso", "Root and bone soup", "Sopa de raíces con hueso"],
  ["item_prato_feito", "Prato do açougue (carne, feijão e batata)", "Butcher's plate (meat, beans and potatoes)", "Plato de la carnicería (carne, frijoles y papas)"],
  ["item_hamburguer", "Torta de carne com batata", "Meat pie with potatoes", "Pastel de carne con papas"],
  ["item_pizza", "Costela gorda na brasa", "Fatty ember-roasted ribs", "Costilla grasa a la brasa"],
  ["item_cachorro_quente", "Espeto de linguiça", "Sausage skewer", "Brocheta de longaniza"],
  ["item_coxinha", "Bolinho de carne", "Meat fritter", "Buñuelo de carne"],
  ["item_chocolate", "Favo de mel", "Honeycomb", "Panal de miel"],
  ["item_miojo", "Caldo de osso", "Bone broth", "Caldo de hueso"],
  ["item_salgadinho", "Torresmo", "Pork cracklings", "Chicharrón"],
  ["item_biscoito_recheado", "Biscoito de mel", "Honey biscuit", "Galleta de miel"],
  ["item_refrigerante", "Sidra borbulhante", "Bubbly cider", "Sidra espumosa"],
  ["centerPlace_pizzaria", "Banco de Sangue", "Blood Bank", "Banco de Sangre"],
  ["centerPlace_hamburgueria", "Açougue", "Butcher Shop", "Carnicería"],
  ["soulFoodSalmon", "Peixe do rio", "River fish", "Pescado de río"],
  ["soulFoodChicken", "Coelho", "Rabbit", "Conejo"],
  ["soulFoodWholegrain", "Prato do caçador", "Hunter's plate", "Plato del cazador"],
  ["soulFoodPF", "Prato do açougue", "Butcher's plate", "Plato de la carnicería"],
  ["soulFoodBurger", "Torta de carne", "Meat pie", "Pastel de carne"],
  ["soulFoodPizza", "Costela", "Ribs", "Costilla"],
  ["soulFoodChocolate", "Mel", "Honey", "Miel"],
  ["soulFoodNoodles", "Caldo de osso", "Bone broth", "Caldo de hueso"],
  ["soulFoodChips", "Torresmo", "Cracklings", "Chicharrón"],
  // abas da comida no Empório (horta e taverna não servem ao Vampiro)
  ["mkHealthy", "Comida que faz bem", "Good food", "Comida que hace bien"],
  ["mkJunk", "Comida gordurosa", "Greasy food", "Comida grasosa"],
  // falas que mandavam ao Forno da Caldeira (o prédio agora é o Banco de Sangue)
  ["bt_see_kin_glu_6", "Tá cheiroso de brasa. Aposto que vem do Açougue.", "Smells of embers. Bet he's from the Butcher Shop.", "Huele a brasa. Seguro que viene de la Carnicería."],
  ["bt_fight_win_glu_4", "Vitória com gosto de espetinho. Bora comer alguma coisa.", "Victory tastes like skewers. Let's go eat something.", "La victoria sabe a pincho. Vamos a comer algo."],
  ["bt_place_game_glu_4", "Bora ganhar e depois comemorar comendo.", "Let's win and celebrate with food after.", "Ganemos y celebremos comiendo."],
  ["bt_mg_win_glu_5", "Ganhamos! Bora comer pra comemorar.", "We won! Let's eat to celebrate.", "¡Ganamos! Vamos a comer para celebrarlo."],
]

const NEW = [
  ["item_bolsa_sangue", "Bolsa de sangue fresco", "Fresh blood bag", "Bolsa de sangre fresca"],
  ["item_sangue_cervo", "Taça de sangue de cervo", "Goblet of deer blood", "Copa de sangre de ciervo"],
  ["item_caldo_sangue_graos", "Caldo de sangue com grãos", "Blood broth with grains", "Caldo de sangre con granos"],
  ["item_ameixas_sangue", "Ameixas curtidas em sangue", "Blood-cured plums", "Ciruelas curtidas en sangre"],
  ["item_chourico", "Chouriço de sangue", "Blood sausage", "Morcilla"],
  ["item_pudim_sangue", "Pudim de sangue", "Blood pudding", "Pudín de sangre"],
  ["item_sopa_sangue", "Sopa escura de sangue", "Dark blood soup", "Sopa oscura de sangre"],
  ["item_prato_madrugada", "Prato da madrugada (sangue morno e pão preto)", "Small-hours plate (warm blood and black bread)", "Plato de la madrugada (sangre tibia y pan negro)"],
  ["item_torta_sangue", "Torta de sangue", "Blood pie", "Pastel de sangre"],
  ["item_pao_sangue", "Pão preto embebido em sangue", "Black bread soaked in blood", "Pan negro empapado en sangre"],
  ["item_espeto_morcela", "Espeto de morcela", "Blood sausage skewer", "Brocheta de morcilla"],
  ["item_bolinho_sangue", "Bolinho de sangue frito", "Fried blood fritter", "Buñuelo de sangre frito"],
  ["item_bala_sangue", "Bala de sangue doce", "Sweet blood candy", "Caramelo de sangre dulce"],
  ["item_caldo_ralo", "Caldo ralo de sangue", "Thin blood broth", "Caldo ralo de sangre"],
  ["item_lascas_sangue", "Lascas de sangue seco", "Dried blood crisps", "Láminas de sangre seca"],
  ["item_biscoito_sangue", "Biscoito de sangue doce", "Sweet blood biscuit", "Galleta de sangre dulce"],
  ["item_soda_sangue", "Sangue gaseificado", "Sparkling blood", "Sangre gasificada"],
  ["soulFoodSalmon_vampiro", "Bolsa de sangue", "Blood bag", "Bolsa de sangre"],
  ["soulFoodChicken_vampiro", "Sangue de cervo", "Deer blood", "Sangre de ciervo"],
  ["soulFoodWholegrain_vampiro", "Caldo de sangue", "Blood broth", "Caldo de sangre"],
  ["soulFoodFruit_vampiro", "Ameixinha", "Little plum", "Ciruelita"],
  ["soulFoodOmelette_vampiro", "Chouriço", "Blood sausage", "Morcilla"],
  ["soulFoodYogurt_vampiro", "Pudim", "Pudding", "Pudín"],
  ["soulFoodSoup_vampiro", "Sopa escura", "Dark soup", "Sopa oscura"],
  ["soulFoodPF_vampiro", "Prato da madrugada", "Small-hours plate", "Plato de la madrugada"],
  ["soulFoodBurger_vampiro", "Torta de sangue", "Blood pie", "Pastel de sangre"],
  ["soulFoodPizza_vampiro", "Pão de sangue", "Blood bread", "Pan de sangre"],
  ["soulFoodHotdog_vampiro", "Morcela", "Black pudding", "Morcilla"],
  ["soulFoodCoxinha_vampiro", "Bolinho de sangue", "Blood fritter", "Buñuelo de sangre"],
  ["soulFoodChocolate_vampiro", "Bala de sangue", "Blood candy", "Caramelo de sangre"],
  ["soulFoodNoodles_vampiro", "Caldo ralo", "Thin broth", "Caldo ralo"],
  ["soulFoodChips_vampiro", "Lascas", "Crisps", "Láminas"],
  ["soulFoodCookie_vampiro", "Biscoito de sangue", "Blood biscuit", "Galleta de sangre"],
  ["soulFoodSoda_vampiro", "Soda de sangue", "Blood soda", "Soda de sangre"],
  ["pvDietNote_raposa", "Aqui é o Banco de Sangue: Raposa só toma a água da fonte. A carne fica no Açougue.", "This is the Blood Bank: a Fox can only have spring water. Meat is at the Butcher Shop.", "Esto es el Banco de Sangre: el Zorro solo toma agua de la fuente. La carne está en la Carnicería."],
  ["pvDietNote_vampiro", "Aqui é o Açougue: Vampiro só toma a água da fonte. O sangue fica no Banco de Sangue.", "This is the Butcher Shop: a Vampire can only have spring water. Blood is at the Blood Bank.", "Esto es la Carnicería: el Vampiro solo toma agua de la fuente. La sangre está en el Banco de Sangre."],
]

const SERVER = [["Isso não alimenta a sua classe", "That doesn't feed your class", "Eso no alimenta a tu clase"]]

const LOCS = ["pt-BR", "en", "es"]
for (const [i, loc] of LOCS.entries()) {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  const mm = (dict.MeuMundo = dict.MeuMundo || {})
  for (const row of NEW) if (!(row[0] in mm)) mm[row[0]] = row[1 + i]
  for (const row of RAPOSA) mm[row[0]] = row[1 + i]
  const srv = (dict.MeuMundoServer = dict.MeuMundoServer || {})
  for (const row of SERVER) if (!(row[0] in srv)) srv[row[0]] = row[1 + i]
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
}
console.log("ok: mercado por classe (VS6)")
