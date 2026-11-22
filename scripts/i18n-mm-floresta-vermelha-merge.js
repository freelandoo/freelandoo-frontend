// Meu Mundo 3D — o 7º Domínio, a Floresta Vermelha de Varkos (22/11): nome, deus, monstros, fases do
// chefão, falas do Varkos e os itens novos do saque. Namespace "MeuMundo". Idempotente: preenche o que
// falta; OVERRIDE troca valor que mudou.
// Rodar: node scripts/i18n-mm-floresta-vermelha-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const KEYS = {
  domName_vermelha: ["Floresta Vermelha", "Red Forest", "Bosque Rojo"],
  domGod_varkos: ["Varkos", "Varkos", "Varkos"],
  pactGodVarkos: ["Varkos", "Varkos", "Varkos"],
  domFoe_corvo: ["Corvos da Batalha", "Battle Crows", "Cuervos de la Batalla"],
  domFoe_javali: ["Javalis de Ferrugem", "Rust Boars", "Jabalíes de Herrumbre"],
  domFoe_caido: ["Soldados Caídos", "Fallen Soldiers", "Soldados Caídos"],
  domFoe_portaestandarte: ["O Porta-Estandarte", "The Standard-Bearer", "El Abanderado"],
  domFoe_varkos: ["Varkos", "Varkos", "Varkos"],
  laminasVarkosPhase2: ["ESTANDARTE EM CHAMAS", "BANNER ABLAZE", "ESTANDARTE EN LLAMAS"],
  laminasVarkosPhase3: ["RUGIDO DA GUERRA", "ROAR OF WAR", "RUGIDO DE LA GUERRA"],
  talkVarkos1: [
    "Eu não escolhi o sol. Escolhi o lado que nunca vai parar de lutar.",
    "I did not choose the sun. I chose the side that will never stop fighting.",
    "No elegí el sol. Elegí el lado que nunca dejará de luchar.",
  ],
  talkVarkos2: [
    "Vença-me, se a guerra deixar. Depois de mim não há mais Domínio.",
    "Beat me, if the war allows it. After me there is no other Domain.",
    "Vénceme, si la guerra lo permite. Después de mí no hay más Dominio.",
  ],
  gear_folha_rubra: ["Folha Rubra", "Crimson Leaf", "Hoja Carmesí"],
  gear_brasa_de_estandarte: ["Brasa de Estandarte", "Banner Ember", "Brasa de Estandarte"],
  gear_amuleto_vermelha: ["Amuleto da Floresta Vermelha", "Red Forest Amulet", "Amuleto del Bosque Rojo"],
  gearDesc_amuleto_vermelha: [
    "Amuleto épico do Domínio Floresta Vermelha. Fabricado na Forja com 40 fragmentos.",
    "Epic amulet of the Red Forest Domain. Crafted at the Forge with 40 fragments.",
    "Amuleto épico del Dominio Bosque Rojo. Fabricado en la Forja con 40 fragmentos.",
  ],
  gear_frag_amuleto_vermelha: ["Fragmento: Amuleto da Floresta Vermelha", "Fragment: Red Forest Amulet", "Fragmento: Amuleto del Bosque Rojo"],
  gearDesc_frag_amuleto_vermelha: [
    "Junte 40 para fabricar o Amuleto da Floresta Vermelha na Forja. Cai no chefe da primeira cena (setor 3) e no elite do setor 7. O que sobrar vira Pó de Refino.",
    "Collect 40 to craft the Red Forest Amulet at the Forge. Drops from the first scene's boss (sector 3) and the sector 7 elite. Extras turn into Refining Dust.",
    "Junta 40 para fabricar el Amuleto del Bosque Rojo en la Forja. Cae del jefe de la primera escena (sector 3) y del élite del sector 7. Lo que sobre se vuelve Polvo de Refino.",
  ],
  gear_frag_personagem_portaestandarte: ["Fragmento de personagem: O Porta-Estandarte", "Character fragment: The Standard-Bearer", "Fragmento de personaje: El Abanderado"],
  gearDesc_frag_personagem_portaestandarte: [
    "Junte 100 para formar o embrião de O Porta-Estandarte. O guardião do setor 9 deixa 1 a cada vitória.",
    "Collect 100 to form the embryo of The Standard-Bearer. The sector 9 guardian drops 1 on every win.",
    "Junta 100 para formar el embrión de El Abanderado. El guardián del sector 9 suelta 1 en cada victoria.",
  ],
  gear_embriao_portaestandarte: ["Embrião: O Porta-Estandarte", "Embryo: The Standard-Bearer", "Embrión: El Abanderado"],
  gearDesc_embriao_portaestandarte: [
    "Embrião de O Porta-Estandarte, formado com 100 fragmentos. O uso na Criogenia chega na próxima atualização: por enquanto ele fica guardado na mochila.",
    "Embryo of The Standard-Bearer, formed from 100 fragments. Its use in Cryogenics arrives in the next update: for now it stays in your backpack.",
    "Embrión de El Abanderado, formado con 100 fragmentos. Su uso en la Criogenia llega en la próxima actualización: por ahora queda guardado en la mochila.",
  ],
  gear_frag_deus_varkos: ["Fragmento do deus: Varkos", "God fragment: Varkos", "Fragmento del dios: Varkos"],
  gearDesc_frag_deus_varkos: [
    "Junte 100 para formar o embrião de Varkos. O deus deixa 1 a cada vitória e mais 5 na primeira.",
    "Collect 100 to form the embryo of Varkos. The god drops 1 on every win and 5 more on the first.",
    "Junta 100 para formar el embrión de Varkos. El dios suelta 1 en cada victoria y 5 más en la primera.",
  ],
  gear_embriao_varkos: ["Embrião: Varkos", "Embryo: Varkos", "Embrión: Varkos"],
  gearDesc_embriao_varkos: [
    "Embrião de Varkos, formado com 100 fragmentos. O uso na Criogenia chega na próxima atualização: por enquanto ele fica guardado na mochila.",
    "Embryo of Varkos, formed from 100 fragments. Its use in Cryogenics arrives in the next update: for now it stays in your backpack.",
    "Embrión de Varkos, formado con 100 fragmentos. Su uso en la Criogenia llega en la próxima actualización: por ahora queda guardado en la mochila.",
  ],
}

// valores que mudaram depois de publicados (vazio por enquanto)
const OVERRIDE = {}

const LOCALES = ["pt-BR", "en", "es"]
LOCALES.forEach((loc, i) => {
  const file = path.join(dir, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  const ns = (dict.MeuMundo = dict.MeuMundo || {})
  let added = 0
  let changed = 0
  for (const [k, v] of Object.entries(KEYS)) {
    if (!(k in ns)) {
      ns[k] = v[i]
      added++
    }
  }
  for (const [k, v] of Object.entries(OVERRIDE)) {
    if (ns[k] !== v[i]) {
      ns[k] = v[i]
      changed++
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(`${loc}: +${added} ~${changed}`)
})
