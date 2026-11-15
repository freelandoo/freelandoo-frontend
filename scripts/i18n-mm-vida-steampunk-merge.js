// VS2 (2026-11-14): vida em steampunk fantasia — a Cinza no sangue e os males na Ficha,
// e os textos de cansaço/estresse/Enfermaria com a cara do mundo (pedido do Alex: "que ele
// canse, fique estressado, vá pro hospital, mas mais estilo steampunk fantasia").
// Idempotente. Chaves novas = fill-if-absent; valor trocado = OVERRIDE. node <script> [pasta]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")

const NEW = {
  "pt-BR": {
    stCinza: "Cinza",
    stAilments: "Males",
    ail_cinza: "Cinza acordada",
    ail_cinzaText: "A Cinza da guerra dorme no sangue de quem saiu da cápsula. Fome, noites sem sono e estresse por muito tempo a acordam: menos apetite e fôlego, treino e estudo rendem menos e a vida gasta mais rápido. Cuidar dele a faz dormir de novo.",
    ail_corrosao: "Corrosão no sangue",
    ail_corrosaoText: "Tônico e elixir demais. Enquanto não baixa, a saúde não volta; alta demais, ela corrói a saúde. A Enfermaria limpa três vezes mais rápido.",
    ail_desgaste: "Coração em Desgaste",
    ail_desgasteText: "Pó de Faísca, Elixir de Ferro, estresse alto e noites em claro forçam o coração. Em 100 ele cede: Enfermaria e −20 de vitalidade. Dormir alivia.",
    ail_engrenagens: "Engrenagens travadas",
    ail_engrenagensText: "Sem energia. Se continuar assim por horas, ele apaga no chão e dorme ali mesmo.",
    ail_febre: "Febre de vapor",
    ail_febreText: "Saúde baixa: a energia não enche e o estresse não desce. Com saúde 15 ou menos, o socorro leva para a Enfermaria.",
    ail_junta: "Junta rachada",
    ail_juntaText: "Fora da Enfermaria, a saúde volta pela metade até a junta sarar.",
    ail_grave: "grave",
  },
  en: {
    stCinza: "Ash",
    stAilments: "Ailments",
    ail_cinza: "Ash awakened",
    ail_cinzaText: "The Ash of the war sleeps in the blood of whoever left the capsule. Long hunger, sleepless nights and stress wake it: less appetite and stamina, training and study yield less and life wears out faster. Taking care of him puts it back to sleep.",
    ail_corrosao: "Corroded blood",
    ail_corrosaoText: "Too many tonics and elixirs. Until it drops, health won't recover; too high and it eats away at health. The Infirmary clears it three times faster.",
    ail_desgaste: "Worn heart",
    ail_desgasteText: "Spark Powder, Iron Elixir, high stress and sleepless nights strain the heart. At 100 it gives out: Infirmary and −20 vitality. Sleep eases it.",
    ail_engrenagens: "Seized gears",
    ail_engrenagensText: "Out of energy. If it stays like this for hours, he passes out on the floor and sleeps right there.",
    ail_febre: "Steam fever",
    ail_febreText: "Low health: energy won't fill up and stress won't come down. At health 15 or less, help takes him to the Infirmary.",
    ail_junta: "Cracked joint",
    ail_juntaText: "Outside the Infirmary, health recovers at half speed until the joint heals.",
    ail_grave: "severe",
  },
  es: {
    stCinza: "Ceniza",
    stAilments: "Males",
    ail_cinza: "Ceniza despierta",
    ail_cinzaText: "La Ceniza de la guerra duerme en la sangre de quien salió de la cápsula. Hambre, noches sin dormir y estrés por mucho tiempo la despiertan: menos apetito y aliento, entrenar y estudiar rinden menos y la vida se gasta más rápido. Cuidarlo la vuelve a dormir.",
    ail_corrosao: "Sangre corroída",
    ail_corrosaoText: "Demasiado tónico y elixir. Mientras no baja, la salud no vuelve; muy alta, corroe la salud. La Enfermería la limpia tres veces más rápido.",
    ail_desgaste: "Corazón desgastado",
    ail_desgasteText: "Polvo de Chispa, Elixir de Hierro, estrés alto y noches en vela fuerzan el corazón. En 100 cede: Enfermería y −20 de vitalidad. Dormir alivia.",
    ail_engrenagens: "Engranajes trabados",
    ail_engrenagensText: "Sin energía. Si sigue así por horas, se desmaya en el suelo y duerme ahí mismo.",
    ail_febre: "Fiebre de vapor",
    ail_febreText: "Salud baja: la energía no se llena y el estrés no baja. Con salud 15 o menos, el socorro lo lleva a la Enfermería.",
    ail_junta: "Articulación rajada",
    ail_juntaText: "Fuera de la Enfermería, la salud vuelve a la mitad hasta que la articulación sane.",
    ail_grave: "grave",
  },
}

const OVERRIDE = {
  "pt-BR": {
    evCollapse: "As engrenagens travaram: apagou e dormiu no chão.",
    causeExhaustion: "Engrenagens travadas",
    needExhausted: "Minhas engrenagens estão travando. Preciso descansar.",
    needUnwell: "Estou com febre de vapor. Preciso da Enfermaria.",
    needStressed: "Minha cabeça está chiando feito caldeira. Preciso de uma pausa.",
    qExhausted: "As engrenagens dele estão travando.",
    effInjury: "Junta rachada",
    actHospital: "Na Enfermaria",
    qHospital: "Ele está na Enfermaria.",
    stHospitalText: "Na câmara de vapor da Enfermaria até se recuperar (saúde 60).",
  },
  en: {
    evCollapse: "His gears seized: he passed out and slept on the floor.",
    causeExhaustion: "Seized gears",
    needExhausted: "My gears are seizing. I need to rest.",
    needUnwell: "I've got steam fever. I need the Infirmary.",
    needStressed: "My head is hissing like a boiler. I need a break.",
    qExhausted: "His gears are seizing.",
    effInjury: "Cracked joint",
    actHospital: "In the Infirmary",
    qHospital: "He is in the Infirmary.",
    stHospitalText: "In the Infirmary's steam chamber until he recovers (health 60).",
  },
  es: {
    evCollapse: "Los engranajes se trabaron: se desmayó y durmió en el suelo.",
    causeExhaustion: "Engranajes trabados",
    needExhausted: "Mis engranajes se están trabando. Necesito descansar.",
    needUnwell: "Tengo fiebre de vapor. Necesito la Enfermería.",
    needStressed: "Mi cabeza silba como una caldera. Necesito una pausa.",
    qExhausted: "Sus engranajes se están trabando.",
    effInjury: "Articulación rajada",
    actHospital: "En la Enfermería",
    qHospital: "Está en la Enfermería.",
    stHospitalText: "En la cámara de vapor de la Enfermería hasta recuperarse (salud 60).",
  },
}

for (const loc of Object.keys(NEW)) {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  const mm = (dict.MeuMundo = dict.MeuMundo || {})
  for (const [k, v] of Object.entries(NEW[loc])) if (!(k in mm)) mm[k] = v
  for (const [k, v] of Object.entries(OVERRIDE[loc])) mm[k] = v
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
}
console.log("ok: vida steampunk (VS2)")
