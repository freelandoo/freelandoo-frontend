// weapon-v1 (24/11/2026): a Forja e a Bancada das armas (nível 1…90 por pó, estrelas, fragmento de classe).
// Textos da tela (wf*) + nome e descrição dos 9 pós de refino e dos 10 fragmentos de classe.
// Idempotente (fill-if-absent). node <script> [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")

const UI = [
  ["wfAssembleButton", "Montar arma", "Assemble weapon", "Montar arma"],
  ["wfAssembleTitle", "Montar arma", "Assemble weapon", "Montar arma"],
  ["wfAssembleHow", "Os fragmentos são da classe: você escolhe qual arma dela montar. Ela nasce no nível 1 com 1 estrela.", "Fragments belong to a class: you choose which of its weapons to assemble. It starts at level 1 with 1 star.", "Los fragmentos son de la clase: tú eliges qué arma de ella montar. Nace en el nivel 1 con 1 estrella."],
  ["wfAssembleOk", "Arma montada! Ela está na mochila.", "Weapon assembled! It's in your backpack.", "¡Arma montada! Está en la mochila."],
  ["wfBackToList", "Voltar à lista", "Back to the list", "Volver a la lista"],
  ["wfChance", "Chance de sucesso: {p}", "Success chance: {p}", "Probabilidad de éxito: {p}"],
  ["wfChooseClass", "Classe dos fragmentos", "Fragment class", "Clase de los fragmentos"],
  ["wfChooseDonor", "Cópia que será consumida", "Copy that will be used up", "Copia que se consumirá"],
  ["wfCopiesOwned", "Você já tem {n} — a nova pode virar estrela.", "You already have {n} — the new one can become a star.", "Ya tienes {n}: la nueva puede convertirse en estrella."],
  ["wfCopyN", "Cópia {n}", "Copy {n}", "Copia {n}"],
  ["wfFragmentOf", "Fragmento de classe {r}", "Class {r} fragment", "Fragmento de clase {r}"],
  ["wfHave", "tem {n}", "have {n}", "tienes {n}"],
  ["wfLevelShort", "Nv {n}", "Lv {n}", "Nv {n}"],
  ["wfMaxLevel", "Nível máximo ({n}).", "Maximum level ({n}).", "Nivel máximo ({n})."],
  ["wfMaxStars", "Todas as estrelas acesas.", "Every star is lit.", "Todas las estrellas encendidas."],
  ["wfNoDonor", "Você não tem outra cópia nova desta arma. Monte uma com fragmentos da classe {r}.", "You don't have another fresh copy of this weapon. Assemble one with class {r} fragments.", "No tienes otra copia nueva de esta arma. Monta una con fragmentos de clase {r}."],
  ["wfNoPowder", "Falta o pó desta faixa. Ele cai nos Domínios, nas lutas e nas partidas, e sai na loja de troca.", "You're missing this band's powder. It drops in the Domains, fights and matches, and is sold in the exchange shop.", "Falta el polvo de esta franja. Cae en los Dominios, las peleas y las partidas, y está en la tienda de canje."],
  ["wfNoWeapon", "Nenhuma arma na mochila. Monte uma na Forja com fragmentos de classe.", "No weapons in your backpack. Assemble one at the Forge with class fragments.", "Ninguna arma en la mochila. Monta una en la Forja con fragmentos de clase."],
  ["wfOpenWeapon", "Abrir {name}", "Open {name}", "Abrir {name}"],
  ["wfOwnedN", "Na mochila: {n}", "In backpack: {n}", "En la mochila: {n}"],
  ["wfRecipesTab", "Receitas", "Recipes", "Recetas"],
  ["wfRefineAgain", "Refinar de novo", "Refine again", "Refinar de nuevo"],
  ["wfRefineButton", "Refinar", "Refine", "Refinar"],
  ["wfRefineFail", "Falhou", "Failed", "Falló"],
  ["wfRefineHow", "Cada tentativa gasta 1 pó da faixa do próximo nível. Se falhar, a arma não desce.", "Each attempt uses 1 powder from the next level's band. If it fails, the weapon doesn't drop.", "Cada intento gasta 1 polvo de la franja del próximo nivel. Si falla, el arma no baja."],
  ["wfRefineStay", "O pó foi gasto e a arma continua no nível {from}.", "The powder was used and the weapon stays at level {from}.", "El polvo se gastó y el arma sigue en el nivel {from}."],
  ["wfRefineSuccess", "Sucesso!", "Success!", "¡Éxito!"],
  ["wfRefineTitle", "Refinar", "Refine", "Refinar"],
  ["wfRefineUp", "A arma subiu do nível {from} para o {to}.", "The weapon went from level {from} to {to}.", "El arma subió del nivel {from} al {to}."],
  ["wfRollLine", "Saiu {roll}. Números menores que {chance} vencem.", "Rolled {roll}. Numbers below {chance} win.", "Salió {roll}. Los números menores que {chance} ganan."],
  ["wfStarsButton", "Subir estrela", "Add a star", "Subir estrella"],
  ["wfStarsTitle", "Subir estrela", "Add a star", "Subir estrella"],
  ["wfStarsHow", "Consome 1 cópia idêntica nova (nível 1, 1 estrela, solta e sem trava). Sempre dá certo.", "Uses up 1 identical fresh copy (level 1, 1 star, not worn, not locked). It always works.", "Consume 1 copia idéntica nueva (nivel 1, 1 estrella, suelta y sin bloqueo). Siempre funciona."],
  ["wfStarsOf", "{n} de {max} estrelas", "{n} of {max} stars", "{n} de {max} estrellas"],
  ["wfStarsOk", "Estrela acesa!", "Star lit!", "¡Estrella encendida!"],
  ["wfTapToAssemble", "Toque para montar", "Tap to assemble", "Toca para montar"],
]

// pós: [id, sufixo, de, até, chance %]
const POWDERS = [["d", "D", 1, 10, 100], ["c", "C", 10, 20, 95], ["b", "B", 20, 30, 90], ["a", "A", 30, 40, 80], ["s", "S", 40, 50, 70], ["ss", "SS", 50, 60, 60], ["sss1", "SSS I", 60, 70, 45], ["sss2", "SSS II", 70, 80, 30], ["sss3", "SSS III", 80, 90, 20]]
// fragmentos: [id, pt, en, es]
const CLASSES = [["e", "E", "E", "E"], ["d", "D", "D", "D"], ["c", "C", "C", "C"], ["b", "B", "B", "B"], ["a", "A", "A", "A"], ["s", "S", "S", "S"], ["ss", "SS", "SS", "SS"], ["ssr", "SSR", "SSR", "SSR"], ["legendary", "Lendária", "Legendary", "Legendaria"], ["divine", "Divina", "Divine", "Divina"]]
const ITEM_TEXT = {
  "pt-BR": {
    i: 1,
    powder: (n) => `Pó de Refinamento ${n}`,
    powderDesc: (a, b, p) => `Refina armas do nível ${a} ao ${b}: uma unidade por tentativa, ${p}% de chance. Se falhar, o pó se gasta e a arma fica como estava.`,
    frag: (r) => `Fragmento de classe ${r}`,
    fragDesc: (r) => `Junte 20 e escolha na Forja qual arma de classe ${r} montar — inclusive uma que você já tem.`,
  },
  en: {
    i: 2,
    powder: (n) => `Refining Powder ${n}`,
    powderDesc: (a, b, p) => `Refines weapons from level ${a} to ${b}: one per attempt, ${p}% chance. If it fails, the powder is used and the weapon stays as it was.`,
    frag: (r) => `Class ${r} fragment`,
    fragDesc: (r) => `Collect 20 and choose at the Forge which class ${r} weapon to assemble — even one you already have.`,
  },
  es: {
    i: 3,
    powder: (n) => `Polvo de Refinado ${n}`,
    powderDesc: (a, b, p) => `Refina armas del nivel ${a} al ${b}: una unidad por intento, ${p}% de probabilidad. Si falla, el polvo se gasta y el arma queda como estaba.`,
    frag: (r) => `Fragmento de clase ${r}`,
    fragDesc: (r) => `Junta 20 y elige en la Forja qué arma de clase ${r} montar, incluso una que ya tengas.`,
  },
}

for (const [lang, L] of Object.entries(ITEM_TEXT)) {
  const file = path.join(DIR, lang + ".json")
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  const mm = dict.MeuMundo
  if (!mm) throw new Error("sem MeuMundo em " + lang)
  const add = {}
  for (const row of UI) add[row[0]] = row[L.i]
  for (const [id, n, a, b, p] of POWDERS) {
    add["gear_po_ref_" + id] = L.powder(n)
    add["gearDesc_po_ref_" + id] = L.powderDesc(a, b, p)
  }
  for (const c of CLASSES) {
    add["gear_frag_classe_" + c[0]] = L.frag(c[L.i])
    add["gearDesc_frag_classe_" + c[0]] = L.fragDesc(c[L.i])
  }
  let n = 0
  for (const [k, v] of Object.entries(add)) if (!(k in mm)) { mm[k] = v; n++ }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(lang, "+" + n)
}
