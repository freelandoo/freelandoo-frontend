// Meu Mundo — Criogenia do laboratório (09/11): palco das cápsulas, mistura com probabilidade,
// genéticas e a certidão de nascimento no STATUS. Fill-if-absent, namespace MeuMundo. Idempotente.
// node scripts/i18n-mm-criogenia-merge.js [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")

// [chave, pt-BR, en, es]
const ROWS = [
  // STATUS e laboratório
  ["stPageCertificate", "Certidão de nascimento", "Birth certificate", "Partida de nacimiento"],
  ["pvMix", "Misturar personagens", "Mix characters", "Mezclar personajes"],
  ["pvGenes", "Comprar genética", "Buy genetics", "Comprar genética"],
  ["labLine7", "Misturar é ciência… e um pouco de sorte. O mais forte tem mais chance de passar a espécie, mas nunca é certeza.", "Mixing is science… and a bit of luck. The stronger one is more likely to pass on its species, but it's never certain.", "Mezclar es ciencia… y un poco de suerte. El más fuerte tiene más probabilidad de pasar su especie, pero nunca es seguro."],
  ["labLine8", "Toda mistura vira certidão de nascimento: de quem veio cada atributo, quem era mais forte e se a personalidade mudou.", "Every mix becomes a birth certificate: where each attribute came from, who was stronger and whether the personality changed.", "Cada mezcla se vuelve partida de nacimiento: de quién vino cada atributo, quién era más fuerte y si la personalidad cambió."],
  ["chMixAtLab", "Misturar personagens e comprar genéticas: no Laboratório de Criogenia, atrás da academia.", "Mix characters and buy genetics at the Cryogenics Lab, behind the gym.", "Mezclar personajes y comprar genéticas: en el Laboratorio de Criogenia, detrás del gimnasio."],
  // palco da criogenia
  ["cryTitle", "Criogenia", "Cryogenics", "Criogenia"],
  ["cryBack", "Voltar ao laboratório", "Back to the lab", "Volver al laboratorio"],
  ["cryMix", "Misturar", "Mix", "Mezclar"],
  ["cryGenes", "Genéticas", "Genetics", "Genéticas"],
  ["cryPrev", "Anterior", "Previous", "Anterior"],
  ["cryNext", "Próximo", "Next", "Siguiente"],
  ["cryActive", "Ativo · andando com você", "Active · walking with you", "Activo · caminando contigo"],
  ["cryFrozen", "Congelado", "Frozen", "Congelado"],
  ["cryActiveShort", "ativo", "active", "activo"],
  ["cryFrozenShort", "congelado", "frozen", "congelado"],
  ["cryThaw", "Descongelar", "Thaw", "Descongelar"],
  ["cryThawed", "Descongelado. O outro voltou para a cápsula.", "Thawed. The other one went back to the capsule.", "Descongelado. El otro volvió a la cápsula."],
  ["cryCert", "Certidão", "Certificate", "Partida"],
  ["cryActiveHint", "Para descongelar outro, este volta para a cápsula: só um anda com você.", "To thaw another one, this one goes back to the capsule: only one walks with you.", "Para descongelar otro, este vuelve a la cápsula: solo uno camina contigo."],
  ["cryEmpty", "Nenhum personagem na cápsula.", "No characters in the capsule.", "Ningún personaje en la cápsula."],
  ["cryMixCount", "{n} misturas", "{n} mixes", "{n} mezclas"],
  ["cryBorn", "Nasceu: {s}! Tinha {p} de chance.", "Born: {s}! It had a {p} chance.", "¡Nació: {s}! Tenía {p} de probabilidad."],
  ["cryMutated", "E a personalidade mudou!", "And the personality changed!", "¡Y la personalidad cambió!"],
  // mistura
  ["cryMixTitle", "Misturar", "Mix", "Mezclar"],
  ["cryMixIntro", "Dois adultos, ou um adulto e uma genética. Os dois somem e nasce um filho de uma das duas espécies — quem tem mais Poder tem mais chance. Ele herda 20% do maior de cada atributo e a personalidade do mais forte, que pode mudar.", "Two adults, or one adult and a genetics sample. Both are gone and a child of one of the two species is born — more Power means more chance. It inherits 20% of the highest of each attribute and the personality of the stronger one, which may change.", "Dos adultos, o un adulto y una genética. Los dos desaparecen y nace un hijo de una de las dos especies — quien tiene más Poder tiene más probabilidad. Hereda el 20% del mayor de cada atributo y la personalidad del más fuerte, que puede cambiar."],
  ["cryMixFirst", "1. O primeiro", "1. The first", "1. El primero"],
  ["cryMixSecond", "2. Com quem", "2. With whom", "2. Con quién"],
  ["cryNoGenes", "Você não tem genética guardada.", "You have no stored genetics.", "No tienes genética guardada."],
  ["cryBuyGenes", "Comprar genética", "Buy genetics", "Comprar genética"],
  ["cryOdds", "Probabilidade da espécie", "Species odds", "Probabilidad de la especie"],
  ["cryTemperLine", "Mais forte: {s}. A personalidade vem dele ({p}), com {m} de chance de mudar.", "Stronger: {s}. The personality comes from it ({p}), with a {m} chance of changing.", "Más fuerte: {s}. La personalidad viene de él ({p}), con {m} de probabilidad de cambiar."],
  ["cryInherit", "Herança ({p} do maior de cada atributo)", "Inheritance ({p} of the highest of each attribute)", "Herencia ({p} del mayor de cada atributo)"],
  ["cryMixWarnActive", "Os dois somem (ficam no histórico). Quem anda com você congela na mistura e o filho sai andando.", "Both are gone (kept in the history). The one walking with you freezes in the mix and the child walks out.", "Los dos desaparecen (quedan en el historial). El que camina contigo se congela en la mezcla y el hijo sale caminando."],
  ["cryMixWarn", "Os dois somem (ficam no histórico). O filho nasce na cápsula, congelado.", "Both are gone (kept in the history). The child is born in the capsule, frozen.", "Los dos desaparecen (quedan en el historial). El hijo nace en la cápsula, congelado."],
  ["cryMixGo", "Misturar agora", "Mix now", "Mezclar ahora"],
  // genéticas
  ["cryGenesTitle", "Genéticas", "Genetics", "Genéticas"],
  ["cryGeneSlots", "Guardadas: {n} de {max}", "Stored: {n} of {max}", "Guardadas: {n} de {max}"],
  ["cryGenesIntro", "A genética fica no congelador até você misturar com um adulto. Ela não tem atributos: entra com a espécie, o Poder genético (a chance) e uma personalidade.", "Genetics stay in the freezer until you mix them with an adult. They have no attributes: they bring the species, the genetic Power (the odds) and a personality.", "La genética queda en el congelador hasta que la mezcles con un adulto. No tiene atributos: aporta la especie, el Poder genético (la probabilidad) y una personalidad."],
  ["cryGenesFull", "O congelador está cheio: use uma genética antes de comprar outra.", "The freezer is full: use a genetics sample before buying another.", "El congelador está lleno: usa una genética antes de comprar otra."],
  ["cryGenePower", "Poder genético {n}", "Genetic Power {n}", "Poder genético {n}"],
  ["cryGeneBought", "Genética guardada no congelador.", "Genetics stored in the freezer.", "Genética guardada en el congelador."],
  // certidão
  ["cdMissing", "A certidão ainda não está pronta.", "The certificate isn't ready yet.", "La partida aún no está lista."],
  ["cdIssuer", "Laboratório de Criogenia de Lúmen", "Lúmen Cryogenics Lab", "Laboratorio de Criogenia de Lúmen"],
  ["cdTitle", "Certidão de Nascimento", "Birth Certificate", "Partida de Nacimiento"],
  ["cdMixes", "Misturas", "Mixes", "Mezclas"],
  ["cdMixedOnce", "Misturado 1 vez na linhagem.", "Mixed once in the lineage.", "Mezclado 1 vez en el linaje."],
  ["cdMixedN", "Misturado {n} vezes na linhagem.", "Mixed {n} times in the lineage.", "Mezclado {n} veces en el linaje."],
  ["cdNeverMixed", "Nunca foi misturado: nasceu sem pais de laboratório.", "Never mixed: born without lab parents.", "Nunca fue mezclado: nació sin padres de laboratorio."],
  ["cdGeneOf", "Genética de {s}", "{s} genetics", "Genética de {s}"],
  ["cdSideGene", "Genética comprada", "Bought genetics", "Genética comprada"],
  ["cdPower", "Poder {n}", "Power {n}", "Poder {n}"],
  ["cdTemper", "Personalidade", "Personality", "Personalidad"],
  ["cdChance", "Chance {p}", "Chance {p}", "Probabilidad {p}"],
  ["cdStronger", "Mais forte", "Stronger", "Más fuerte"],
  ["cdDrawn", "Saiu", "Drawn", "Salió"],
  ["cdParentCert", "Certidão dele", "Its certificate", "Su partida"],
  ["cdDrawnLine", "Saiu {s}, com {p} de chance.", "{s} came out, with a {p} chance.", "Salió {s}, con {p} de probabilidad."],
  ["cdInherit", "Herança: 20% do maior de cada atributo", "Inheritance: 20% of the highest of each attribute", "Herencia: 20% del mayor de cada atributo"],
  ["cdFrom", "de {s}", "from {s}", "de {s}"],
  ["cdNothing", "nada a herdar", "nothing to inherit", "nada que heredar"],
  ["cdPersonality", "Personalidade", "Personality", "Personalidad"],
  ["cdMutated", "Mudou", "Changed", "Cambió"],
  ["cdMutatedLine", "Era para nascer {a} (de {s}), mas nasceu {b}.", "It was meant to be born {a} (from {s}), but was born {b}.", "Debía nacer {a} (de {s}), pero nació {b}."],
  ["cdKeptLine", "Herdou {a} de {s}, o mais forte.", "Inherited {a} from {s}, the stronger one.", "Heredó {a} de {s}, el más fuerte."],
  ["cdPublic", "Ver a certidão pública", "See the public certificate", "Ver la partida pública"],
  ["cdSeal", "Lúmen", "Lúmen", "Lúmen"],
  ["cdOriginGuest", "Hóspede da casa", "House resident", "Huésped de la casa"],
  ["cdOriginHeir", "Herdeiro", "Heir", "Heredero"],
  ["cdOriginSkin", "Conversão de skin", "Converted skin", "Conversión de skin"],
  ["cdOriginFusion", "Mistura no laboratório", "Lab mix", "Mezcla en el laboratorio"],
  ["cdOriginPrize", "Prêmio", "Prize", "Premio"],
  ["cdOriginMarket", "Mercado", "Market", "Mercado"],
  ["cdOriginGift", "Presente", "Gift", "Regalo"],
  ["cdOriginTest", "Teste", "Test", "Prueba"],
  ["cdOriginLab", "Embrião do laboratório", "Lab embryo", "Embrión del laboratorio"],
  // resultado fixo (Alex, 09/11): o primeiro passa personalidade e atributos, a espécie é escolhida
  ["cryMixIntroFixed", "Dois adultos, ou um adulto e uma genética. O primeiro passa a personalidade e 20% de cada atributo dele; você escolhe a espécie do filho entre as dos dois. Sem sorteio: o que aparece aqui é o que nasce. Os dois somem.", "Two adults, or one adult and a genetics sample. The first one passes on its personality and 20% of each of its attributes; you choose the child's species from the two. No draw: what you see here is what is born. Both are gone.", "Dos adultos, o un adulto y una genética. El primero pasa su personalidad y el 20% de cada uno de sus atributos; tú eliges la especie del hijo entre las dos. Sin sorteo: lo que ves aquí es lo que nace. Los dos desaparecen."],
  ["cryMixFirstFixed", "1. O primeiro (personalidade e atributos)", "1. The first (personality and attributes)", "1. El primero (personalidad y atributos)"],
  ["cryMixSpecies", "3. A espécie do filho", "3. The child's species", "3. La especie del hijo"],
  ["cryTemperFirst", "Personalidade: {p}, a de {s}.", "Personality: {p}, from {s}.", "Personalidad: {p}, la de {s}."],
  ["cryInheritFirst", "Herança ({p} de cada atributo de {s})", "Inheritance ({p} of each of {s}'s attributes)", "Herencia ({p} de cada atributo de {s})"],
  ["cryResult", "Nasce: {s}", "Born: {s}", "Nace: {s}"],
  ["cryPickSpecies", "Escolha a espécie", "Choose the species", "Elige la especie"],
  ["cryBornFixed", "Nasceu: {s}!", "Born: {s}!", "¡Nació: {s}!"],
  ["cryGenesIntroFixed", "A genética fica no congelador até você misturar com um adulto. Ela entra só com a espécie: a personalidade e os atributos vêm do personagem escolhido primeiro.", "Genetics stay in the freezer until you mix them with an adult. They only bring the species: the personality and attributes come from the character chosen first.", "La genética queda en el congelador hasta que la mezcles con un adulto. Solo aporta la especie: la personalidad y los atributos vienen del personaje elegido primero."],
  ["cdFirstTag", "1º · personalidade e atributos", "1st · personality and attributes", "1º · personalidad y atributos"],
  ["cdSpeciesTag", "Espécie", "Species", "Especie"],
  ["cdSpeciesLine", "Espécie escolhida: {s} (de {w}).", "Chosen species: {s} (from {w}).", "Especie elegida: {s} (de {w})."],
  ["cdInheritFirst", "Herança: 20% de cada atributo do primeiro", "Inheritance: 20% of each attribute of the first", "Herencia: 20% de cada atributo del primero"],
  ["cdKeptFirst", "Herdou {a} de {s}, o primeiro da mistura.", "Inherited {a} from {s}, the first in the mix.", "Heredó {a} de {s}, el primero de la mezcla."],
]

const LOCS = ["pt-BR", "en", "es"]
for (let i = 0; i < LOCS.length; i++) {
  const file = path.join(DIR, LOCS[i] + ".json")
  const raw = fs.readFileSync(file, "utf8")
  const json = JSON.parse(raw)
  const ns = (json.MeuMundo = json.MeuMundo || {})
  let n = 0
  for (const row of ROWS) {
    if (!(row[0] in ns)) {
      ns[row[0]] = row[i + 1]
      n++
    }
  }
  let out = JSON.stringify(json, null, 2) + "\n"
  if (raw.includes("\r\n")) out = out.replace(/\n/g, "\r\n")
  fs.writeFileSync(file, out)
  console.log(LOCS[i], "+" + n)
}
