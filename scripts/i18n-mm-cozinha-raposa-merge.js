// VS7 (2026-11-15): a cozinha da Raposa mágica e os tônicos do mundo.
// Alex: "precisamos adaptar melhor a comida da raposa" e trocar albumina, whey e creatina.
// Raposa = povo do Sol, terra de Lúmen (caça pequena, javali, mel de girassol, frutas do
// bosque; o prato mais caro é assado na Chama do Sol). Tônicos: Leite de Mamute (albumina),
// Hidromel da Forja (whey, a forja de Kragor), Sal da Pedraverde (creatina, a clareira do
// Golem). Ids e números iguais. Plano: MEU MUNDO 3D/planos/2026-11-15-mercado-sangue-e-acougue.md
// Idempotente: valor trocado = OVERRIDE. node <script> [pasta]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")

// [chave, pt, en, es]
const OVERRIDE = [
  ["item_salmao_legumes", "Truta dourada assada na Chama do Sol", "Golden trout roasted in the Sun's Flame", "Trucha dorada asada en la Llama del Sol"],
  ["item_frango_salada", "Coelho do campo com ervas de Lúmen", "Field rabbit with Lúmen herbs", "Conejo de campo con hierbas de Lúmen"],
  ["item_prato_integral", "Prato da toca (grãos, carne de caça e folhas)", "Den plate (grains, game meat and greens)", "Plato de la madriguera (granos, carne de caza y hojas)"],
  ["item_bowl_frutas", "Cesto de amoras e frutas de Lúmen", "Basket of blackberries and Lúmen fruit", "Cesta de moras y frutas de Lúmen"],
  ["item_omelete_legumes", "Ovos de codorna na frigideira", "Pan-fried quail eggs", "Huevos de codorniz a la sartén"],
  ["item_iogurte_aveia", "Mingau de aveia com mel de girassol", "Oat porridge with sunflower honey", "Gachas de avena con miel de girasol"],
  ["item_sopa_legumes", "Sopa de raízes do bosque", "Woodland root soup", "Sopa de raíces del bosque"],
  ["item_prato_feito", "Prato do caçador (carne assada, feijão e batata)", "Hunter's plate (roast meat, beans and potatoes)", "Plato del cazador (carne asada, frijoles y papas)"],
  ["item_hamburguer", "Empadão de caça", "Game pie", "Empanada de caza"],
  ["item_pizza", "Costela de javali na brasa", "Ember-roasted boar ribs", "Costilla de jabalí a la brasa"],
  ["item_cachorro_quente", "Linguiça de javali no espeto", "Boar sausage on a skewer", "Longaniza de jabalí en brocheta"],
  ["item_coxinha", "Bolinho de caça frito", "Fried game fritter", "Buñuelo de caza frito"],
  ["item_chocolate", "Favo de mel de girassol", "Sunflower honeycomb", "Panal de miel de girasol"],
  ["item_miojo", "Caldo de osso da toca", "Den bone broth", "Caldo de hueso de la madriguera"],
  ["item_salgadinho", "Pele de galinha frita", "Fried chicken skin", "Piel de gallina frita"],
  ["item_biscoito_recheado", "Biscoito de amora", "Blackberry biscuit", "Galleta de mora"],
  ["item_refrigerante", "Sidra de maçã do sol", "Sun-apple cider", "Sidra de manzana del sol"],
  // apelidos / gosto da alma da Raposa
  ["soulFoodSalmon", "Truta", "Trout", "Trucha"],
  ["soulFoodChicken", "Coelho", "Rabbit", "Conejo"],
  ["soulFoodWholegrain", "Prato da toca", "Den plate", "Plato de la madriguera"],
  ["soulFoodFruit", "Amora", "Berry", "Mora"],
  ["soulFoodOmelette", "Ovinho", "Little egg", "Huevito"],
  ["soulFoodYogurt", "Mingau", "Porridge", "Gachas"],
  ["soulFoodSoup", "Sopinha", "Soupy", "Sopita"],
  ["soulFoodPF", "Prato do caçador", "Hunter's plate", "Plato del cazador"],
  ["soulFoodBurger", "Empadão", "Pie", "Empanada"],
  ["soulFoodPizza", "Costela", "Ribs", "Costilla"],
  ["soulFoodHotdog", "Linguiça", "Sausage", "Longaniza"],
  ["soulFoodCoxinha", "Bolinho", "Fritter", "Buñuelo"],
  ["soulFoodChocolate", "Mel", "Honey", "Miel"],
  ["soulFoodNoodles", "Caldo", "Broth", "Caldo"],
  ["soulFoodChips", "Pururuca", "Crackling", "Chicharrón"],
  ["soulFoodCookie", "Biscoito", "Cookie", "Galleta"],
  ["soulFoodSoda", "Sidra", "Cider", "Sidra"],
  // os três tônicos do mundo
  ["item_albumina", "Leite de Mamute", "Mammoth Milk", "Leche de Mamut"],
  ["item_whey", "Hidromel da Forja", "Forge Mead", "Hidromiel de la Forja"],
  ["item_creatina", "Sal da Pedraverde", "Pedraverde Salt", "Sal de Pedraverde"],
  ["effAlbumin", "Leite de Mamute", "Mammoth Milk", "Leche de Mamut"],
  ["effWhey", "Hidromel da Forja", "Forge Mead", "Hidromiel de la Forja"],
  ["effCreatine", "Sal da Pedraverde", "Pedraverde Salt", "Sal de Pedraverde"],
  ["lkFxMultivit", "A saúde volta 30% mais rápido (70% com o Sal da Pedraverde).", "Health comes back 30% faster (70% with Pedraverde Salt).", "La salud vuelve 30% más rápido (70% con Sal de Pedraverde)."],
  ["atStrengthText", "Sobe treinando; o Hidromel da Forja, o Tônico de faísca, o Sal da Pedraverde e o Elixir de Ferro aceleram.", "Goes up by training; Forge Mead, Spark tonic, Pedraverde Salt and the Iron Elixir speed it up.", "Sube entrenando; el Hidromiel de la Forja, el Tónico de chispa, la Sal de Pedraverde y el Elixir de Hierro la aceleran."],
  ["atStrengthText2", "Sobe treinando (rende até 4 h por dia); o Hidromel da Forja, o Tônico de faísca, o Sal da Pedraverde e o Elixir de Ferro aceleram. Sem treino cai até 60% do maior valor.", "Rises by training (up to 4 useful hours a day); Forge Mead, Spark tonic, Pedraverde Salt and the Iron Elixir speed it up. Without training it drops to 60% of his best.", "Sube entrenando (rinde hasta 4 h al día); el Hidromiel de la Forja, el Tónico de chispa, la Sal de Pedraverde y el Elixir de Hierro aceleran. Sin entrenar baja hasta el 60% de su máximo."],
  ["sgStrHow", "Treinando no Ginásio de Ferro (rende até 4 h por dia); o Hidromel da Forja, o Tônico de faísca, o Sal da Pedraverde e o Elixir de Ferro aceleram. Sem treino cai até 60% do maior valor.", "Training at the Iron Gymnasium (up to 4 useful hours a day); Forge Mead, Spark tonic, Pedraverde Salt and the Iron Elixir speed it up. Without training it drops to 60% of the peak.", "Entrenando en el Gimnasio de Hierro (rinde hasta 4 h al día); el Hidromiel de la Forja, el Tónico de chispa, la Sal de Pedraverde y el Elixir de Hierro aceleran. Sin entrenar baja hasta el 60% del máximo."],
  ["atStrengthText3", "Sobe treinando (rende até 4 h por dia); o Hidromel da Forja, o Tônico de faísca, o Sal da Pedraverde e o Elixir de Ferro aceleram. Depois de 1 dia sem treino cai 5 pontos por dia, até 60% do maior valor.", "Grows by training (up to 4 useful hours a day); Forge Mead, Spark tonic, Pedraverde Salt and the Iron Elixir speed it up. After 1 day without training it drops 5 points a day, down to 60% of the peak.", "Sube entrenando (rinde hasta 4 h al día); el Hidromiel de la Forja, el Tónico de chispa, la Sal de Pedraverde y el Elixir de Hierro aceleran. Tras 1 día sin entrenar baja 5 puntos por día, hasta el 60% del máximo."],
  ["sgStrHow2", "Treinando no Ginásio de Ferro (rende até 4 h por dia); o Hidromel da Forja, o Tônico de faísca, o Sal da Pedraverde e o Elixir de Ferro aceleram. Depois de 1 dia sem treino cai 5 pontos por dia, até 60% do maior valor.", "Training at the Iron Gymnasium (up to 4 useful hours a day); Forge Mead, Spark tonic, Pedraverde Salt and the Iron Elixir speed it up. After 1 day without training it drops 5 points a day, down to 60% of the peak.", "Entrenando en el Gimnasio de Hierro (rinde hasta 4 h al día); el Hidromiel de la Forja, el Tónico de chispa, la Sal de Pedraverde y el Elixir de Hierro aceleran. Tras 1 día sin entrenar baja 5 puntos por día, hasta el 60% del máximo."],
  ["atStrengthShort", "Sobe treinando (até 4 h/dia); os tônicos aceleram. Sem treino cai até 60% do pico.", "Rises by training (up to 4 h/day); tonics speed it up. Without training it drops to 60% of the peak.", "Sube entrenando (hasta 4 h/día); los tónicos aceleran. Sin entrenar baja hasta el 60% del pico."],
  ["bt_fridge_comp_6", "Tem Hidromel da Forja? Sem ele não rende.", "Got Forge Mead? Without it I won't perform.", "¿Hay Hidromiel de la Forja? Sin él no rindo."],
]

for (const [i, loc] of ["pt-BR", "en", "es"].entries()) {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  const mm = (dict.MeuMundo = dict.MeuMundo || {})
  for (const row of OVERRIDE) mm[row[0]] = row[1 + i]
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
}
console.log("ok: cozinha da Raposa (VS7)")
