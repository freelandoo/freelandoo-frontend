// Meu Mundo 3D — S14 (2026-11-12): nomes e descrições dos itens do bestiário dos Domínios
// (back `src/utils/mmItems/catalog/bestiary.js`): 6 amuletos, 22 fragmentos e 16 embriões.
// Chaves `gear_<id>` (nome) e `gearDesc_<id>` (descrição). Namespace "MeuMundo".
// Idempotente, fill-if-absent (mudar valor = OVERRIDE abaixo).
// Rodar: node scripts/i18n-mm-bestiario-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

// [pt, en, es]
const DOMAINS = {
  floresta: ["Amuleto da Floresta da Lua", "Moon Forest Amulet", "Amuleto del Bosque de la Luna", "Floresta da Lua", "Moon Forest", "Bosque de la Luna"],
  canion: ["Amuleto do Cânion das Tempestades", "Storm Canyon Amulet", "Amuleto del Cañón de las Tormentas", "Cânion das Tempestades", "Storm Canyon", "Cañón de las Tormentas"],
  gelo: ["Amuleto do Mar de Gelo", "Ice Sea Amulet", "Amuleto del Mar de Hielo", "Mar de Gelo", "Ice Sea", "Mar de Hielo"],
  fabrica: ["Amuleto da Fábrica de Bronze", "Bronze Factory Amulet", "Amuleto de la Fábrica de Bronce", "Fábrica de Bronze", "Bronze Factory", "Fábrica de Bronce"],
  vulcao: ["Amuleto do Vulcão de Kragor", "Kragor's Volcano Amulet", "Amuleto del Volcán de Kragor", "Vulcão de Kragor", "Kragor's Volcano", "Volcán de Kragor"],
  orbital: ["Amuleto da Cidade Orbital", "Orbital City Amulet", "Amuleto de la Ciudad Orbital", "Cidade Orbital", "Orbital City", "Ciudad Orbital"],
}
const CHARACTERS = {
  selene: ["Selene de Sombra", "Shadow Selene", "Selene de Sombra", true],
  carta: ["A Carta", "The Letter", "La Carta", true],
  ondina: ["Ondina", "Ondina", "Ondina", true],
  esteira: ["A Esteira", "The Conveyor", "La Cinta", true],
  brutamontes: ["Brutamontes", "Brute", "Bruto", true],
  arco: ["O Arco Partido", "The Broken Bow", "El Arco Partido", true],
  ciborgue: ["Ciborgue", "Cyborg", "Cíborg", false],
  garras: ["Dama das Garras", "Lady of Claws", "Dama de las Garras", false],
  golem: ["Golem de Pedra", "Stone Golem", "Gólem de Piedra", false],
  cavaleiro: ["Cavaleiro Dourado", "Golden Knight", "Caballero Dorado", false],
}
const GODS = { noctis: "Noctis", zephyra: "Zéphyra", maru: "Marú", aeryn: "Aeryn", kragor: "Kragor", iris: "Íris" }

const CRIO = [
  "O uso na Criogenia chega na próxima atualização: por enquanto ele fica guardado na mochila.",
  "Its use in Cryogenics arrives in the next update: for now it stays in your backpack.",
  "Su uso en la Criogenia llega en la próxima actualización: por ahora queda guardado en la mochila.",
]

const MEU_MUNDO = {}
for (const [d, [pt, en, es, dpt, den, des]] of Object.entries(DOMAINS)) {
  MEU_MUNDO[`gear_amuleto_${d}`] = [pt, en, es]
  MEU_MUNDO[`gearDesc_amuleto_${d}`] = [
    `Amuleto épico do Domínio ${dpt}. Fabricado na Forja com 40 fragmentos.`,
    `Epic amulet of the ${den} Domain. Crafted at the Forge with 40 fragments.`,
    `Amuleto épico del Dominio ${des}. Se fabrica en la Forja con 40 fragmentos.`,
  ]
  MEU_MUNDO[`gear_frag_amuleto_${d}`] = [`Fragmento: ${pt}`, `Fragment: ${en}`, `Fragmento: ${es}`]
  MEU_MUNDO[`gearDesc_frag_amuleto_${d}`] = [
    `Junte 40 para fabricar o ${pt} na Forja. Cai no chefe da primeira cena (setor 3) e no elite do setor 7. O que sobrar vira Pó de Refino.`,
    `Collect 40 to craft the ${en} at the Forge. Drops from the first scene's boss (sector 3) and the sector 7 elite. Extras turn into Refining Dust.`,
    `Junta 40 para fabricar el ${es} en la Forja. Cae del jefe de la primera escena (sector 3) y del élite del sector 7. Lo que sobre se convierte en Polvo de Refinado.`,
  ]
}
for (const [id, [pt, en, es, guardian]] of Object.entries(CHARACTERS)) {
  MEU_MUNDO[`gear_frag_personagem_${id}`] = [`Fragmento de personagem: ${pt}`, `Character fragment: ${en}`, `Fragmento de personaje: ${es}`]
  MEU_MUNDO[`gearDesc_frag_personagem_${id}`] = guardian
    ? [
        `Junte 100 para formar o embrião de ${pt}. O guardião do setor 9 deixa 1 a cada vitória.`,
        `Collect 100 to form the embryo of ${en}. The sector 9 guardian drops 1 on every win.`,
        `Junta 100 para formar el embrión de ${es}. El guardián del sector 9 deja 1 en cada victoria.`,
      ]
    : [
        `Junte 100 para formar o embrião de ${pt}. Cai com 25% a cada vitória contra o elite dos setores 7 e 8.`,
        `Collect 100 to form the embryo of ${en}. 25% drop on every win against the sector 7 and 8 elite.`,
        `Junta 100 para formar el embrión de ${es}. Cae con 25% en cada victoria contra el élite de los sectores 7 y 8.`,
      ]
  MEU_MUNDO[`gear_embriao_${id}`] = [`Embrião: ${pt}`, `Embryo: ${en}`, `Embrión: ${es}`]
  MEU_MUNDO[`gearDesc_embriao_${id}`] = [
    `Embrião de ${pt}, formado com 100 fragmentos. ${CRIO[0]}`,
    `Embryo of ${en}, formed from 100 fragments. ${CRIO[1]}`,
    `Embrión de ${es}, formado con 100 fragmentos. ${CRIO[2]}`,
  ]
}
for (const [id, name] of Object.entries(GODS)) {
  MEU_MUNDO[`gear_frag_deus_${id}`] = [`Fragmento do deus: ${name}`, `God fragment: ${name}`, `Fragmento del dios: ${name}`]
  MEU_MUNDO[`gearDesc_frag_deus_${id}`] = [
    `Junte 100 para formar o embrião de ${name}. O deus deixa 1 a cada vitória e mais 5 na primeira.`,
    `Collect 100 to form the embryo of ${name}. The god drops 1 on every win and 5 more on the first.`,
    `Junta 100 para formar el embrión de ${name}. El dios deja 1 en cada victoria y 5 más en la primera.`,
  ]
  MEU_MUNDO[`gear_embriao_${id}`] = [`Embrião: ${name}`, `Embryo: ${name}`, `Embrión: ${name}`]
  MEU_MUNDO[`gearDesc_embriao_${id}`] = [
    `Embrião de ${name}, formado com 100 fragmentos. ${CRIO[0]}`,
    `Embryo of ${name}, formed from 100 fragments. ${CRIO[1]}`,
    `Embrión de ${name}, formado con 100 fragmentos. ${CRIO[2]}`,
  ]
}
const OVERRIDE = {}

const LOCALES = ["pt-BR", "en", "es"]
let added = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo = json.MeuMundo || {}
  for (const [key, vals] of Object.entries(MEU_MUNDO)) {
    if (json.MeuMundo[key] === undefined) {
      json.MeuMundo[key] = vals[i]
      added++
    }
  }
  for (const [key, vals] of Object.entries(OVERRIDE)) {
    if (json.MeuMundo[key] !== vals[i]) {
      json.MeuMundo[key] = vals[i]
      added++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n meu-mundo bestiário: ${added} chaves adicionadas/atualizadas`)
