// B3 (mig 340): PERSONAGENS no lugar das skins — tela da cápsula (STATUS), fusão,
// certificado público e o presente de personagem. Fill-if-absent no namespace MeuMundo.
//   node scripts/i18n-mm-b3-personagens-merge.js [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")

// [chave, pt, en, es]
const ROWS = [
  ["stCharacters", "Personagens", "Characters", "Personajes"],
  ["chActive", "Ativo", "Active", "Activo"],
  ["chAdult", "Adulto", "Adult", "Adulto"],
  ["chCancel", "Cancelar", "Cancel", "Cancelar"],
  ["chCapsule", "Cápsula {used}/{slots}", "Capsule {used}/{slots}", "Cápsula {used}/{slots}"],
  ["chCapsuleEmpty", "A cápsula está vazia. Personagens novos vêm de fusão, prêmios e do mercado.", "The capsule is empty. New characters come from fusion, prizes and the market.", "La cápsula está vacía. Los personajes nuevos vienen de fusión, premios y el mercado."],
  ["chCertificate", "Certificado", "Certificate", "Certificado"],
  ["chClose", "Fechar", "Close", "Cerrar"],
  ["chDays", "{n} dias de vida", "{n} days of life", "{n} días de vida"],
  ["chFemale", "fêmea", "female", "hembra"],
  ["chFrozen", "Congelado na cápsula", "Frozen in the capsule", "Congelado en la cápsula"],
  ["chFuse", "Fundir dois personagens", "Fuse two characters", "Fusionar dos personajes"],
  ["chFuseGo", "Fundir", "Fuse", "Fusionar"],
  ["chFuseHow", "Escolha dois adultos acima. Os dois somem (ficam no histórico) e nasce um filho com 1 m e 20% do maior valor de cada atributo deles.", "Pick two adults above. Both disappear (they stay in the history) and a child is born at 1 m with 20% of their highest value in each attribute.", "Elige dos adultos arriba. Los dos desaparecen (quedan en el historial) y nace un hijo de 1 m con el 20% del mayor valor de cada atributo de ellos."],
  ["chFuseNeed", "Fusão: precisa de dois adultos", "Fusion: needs two adults", "Fusión: necesita dos adultos"],
  ["chFused", "Nasceu um filho!", "A child was born!", "¡Nació un hijo!"],
  ["chGranted", "Personagem na cápsula.", "Character in the capsule.", "Personaje en la cápsula."],
  ["chIntro", "Um personagem ativo por vez. Os outros ficam na cápsula, congelados: não envelhecem, não perdem atributo e não sentem fome.", "One active character at a time. The others stay frozen in the capsule: they don't age, lose attributes or get hungry.", "Un personaje activo a la vez. Los demás quedan congelados en la cápsula: no envejecen, no pierden atributos ni tienen hambre."],
  ["chMale", "macho", "male", "macho"],
  ["chNoSpecies", "Sem espécie", "No species", "Sin especie"],
  ["chOnlyAdults", "Só adultos fundem", "Only adults can fuse", "Solo los adultos se fusionan"],
  ["chPick", "Escolher", "Pick", "Elegir"],
  ["chPicked", "Escolhido", "Picked", "Elegido"],
  ["chPower", "Poder {n}", "Power {n}", "Poder {n}"],
  ["chSwapped", "Trocado. O outro foi para a cápsula.", "Swapped. The other one went to the capsule.", "Cambiado. El otro fue a la cápsula."],
  ["chTestGrant", "Ganhar (teste de admin)", "Get one (admin test)", "Obtener (prueba de admin)"],
  ["chTitle", "Personagens", "Characters", "Personajes"],
  ["chUse", "Usar", "Use", "Usar"],
  ["chYoung", "Jovem", "Young", "Joven"],
  ["ctActiveDays", "Idade ativa", "Active age", "Edad activa"],
  ["ctAlive", "Vivo", "Alive", "Vivo"],
  ["ctBirthHeight", "Altura ao nascer", "Height at birth", "Altura al nacer"],
  ["ctBorn", "Nascimento", "Born", "Nacimiento"],
  ["ctDead", "Morreu", "Died", "Murió"],
  ["ctFused", "Fundido", "Fused", "Fusionado"],
  ["ctGenetics", "Genética de nascença", "Birth genetics", "Genética de nacimiento"],
  ["ctHeight", "Altura", "Height", "Altura"],
  ["ctLineage", "Geração da linhagem", "Lineage generation", "Generación del linaje"],
  ["ctMissing", "Certificado não encontrado.", "Certificate not found.", "Certificado no encontrado."],
  ["ctNoParents", "Primeira geração: sem pais registrados.", "First generation: no registered parents.", "Primera generación: sin padres registrados."],
  ["ctOrigin", "Origem", "Origin", "Origen"],
  ["ctOwner", "Dono (apelido no jogo)", "Owner (in-game nickname)", "Dueño (apodo en el juego)"],
  ["ctParents", "Pais e avós", "Parents and grandparents", "Padres y abuelos"],
  ["ctPeaks", "Picos", "Peaks", "Picos"],
  ["ctSeed", "Semente", "Seed", "Semilla"],
  ["ctSex", "Sexo", "Sex", "Sexo"],
  ["ctSpecies", "Espécie", "Species", "Especie"],
  ["ctStatus", "Situação", "Status", "Situación"],
  ["ctTemper", "Temperamento", "Temperament", "Temperamento"],
  ["ctTitle", "Certificado de personagem · Meu Mundo", "Character certificate · My World", "Certificado de personaje · Mi Mundo"],
  ["itSkinsMoved", "As skins viraram personagens: veja em STATUS → Personagens.", "Skins became characters: see STATUS → Characters.", "Las skins se convirtieron en personajes: mira en STATUS → Personajes."],
  ["itCharacterGift", "Personagem: {name}", "Character: {name}", "Personaje: {name}"],
]

const LOCALES = ["pt-BR", "en", "es"]
for (const [i, loc] of LOCALES.entries()) {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  const mm = (dict.MeuMundo = dict.MeuMundo || {})
  let n = 0
  for (const r of ROWS) {
    if (typeof mm[r[0]] !== "string") {
      mm[r[0]] = r[1 + i]
      n++
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(loc, "+", n)
}
