// weapon-v1/v2 (24/11/2026): a Forja e a Bancada das armas (nível 1…90 por barra de XP com o pó da CLASSE,
// aceitar/recusar, 10 vezes; estrelas; fragmento de classe). Textos da tela (wf*) + nome e descrição dos 10 pós
// (um por classe), dos 3 pós SSS que saíram e dos 10 fragmentos de classe.
// Idempotente (fill-if-absent; a descrição dos fragmentos é OVERRIDE: E = 20 e +20 por classe, pedido do Alex). node <script> [pasta dos dicionários]
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
  // weapon-v2: barra de XP, aceitar/recusar, 10 vezes
  ["wfXpOf", "{xp} / {need} XP", "{xp} / {need} XP", "{xp} / {need} XP"],
  ["wfLevelUp", "Sobe de nível!", "Levels up!", "¡Sube de nivel!"],
  ["wfXpPreview", "{from} → {to} / {need} XP", "{from} → {to} / {need} XP", "{from} → {to} / {need} XP"],
  ["wfTierLoss", "Perdeu XP", "Lost XP", "Perdió XP"],
  ["wfTierNormal", "Normal", "Normal", "Normal"],
  ["wfTierGood", "Bom!", "Good!", "¡Bueno!"],
  ["wfTierGreat", "Excelente!", "Excellent!", "¡Excelente!"],
  ["wfPendingHow", "Aceite para somar à barra ou recuse para descartar. O pó já foi gasto.", "Accept to add it to the bar or reject to discard it. The powder is already used.", "Acepta para sumarlo a la barra o recházalo para descartarlo. El polvo ya se gastó."],
  ["wfAccept", "Aceitar", "Accept", "Aceptar"],
  ["wfReject", "Recusar", "Reject", "Rechazar"],
  ["wfRefineMore", "Refinar mais uma vez", "Refine once more", "Refinar una vez más"],
  ["wfRefineTen", "Refinar {n} vezes", "Refine {n} times", "Refinar {n} veces"],
  ["wfBatchSummary", "{ok} de {n} aceitas · {xp} XP", "{ok} of {n} accepted · {xp} XP", "{ok} de {n} aceptadas · {xp} XP"],
  ["wfNoPowderClass", "Falta o pó da classe {r}. Ele cai nos Domínios, nas lutas e nas partidas, e sai na loja de troca.", "You're missing class {r} powder. It drops in the Domains, fights and matches, and is sold in the exchange shop.", "Falta el polvo de clase {r}. Cae en los Dominios, las peleas y las partidas, y está en la tienda de canje."],
]
// valor que MUDOU (OVERRIDE): o texto da bancada passou da chance por faixa para a barra de XP
const UI_OVERRIDE = [
  ["wfRefineHow", "Cada tentativa gasta 1 pó da classe da arma e dá XP: pode ser muito, pouco ou até tirar. Você aceita ou recusa — a arma nunca desce de nível.", "Each attempt uses 1 powder of the weapon's class and gives XP: a lot, a little or it can even take some away. You accept or reject it — the weapon never drops a level.", "Cada intento gasta 1 polvo de la clase del arma y da XP: mucho, poco o incluso puede quitar. Tú aceptas o rechazas: el arma nunca baja de nivel."],
]

// weapon-v2: um pó por CLASSE (o índice da classe em CLASSES). Os SSS da v1 saíram: [id, sufixo, vira (classe)]
const LEGACY_POWDERS = [["sss1", "SSS I", "ssr"], ["sss2", "SSS II", "legendary"], ["sss3", "SSS III", "divine"]]
// fragmentos: [id, pt, en, es] — na ordem das classes: precisa 20 × (posição + 1)
const CLASSES = [["e", "E", "E", "E"], ["d", "D", "D", "D"], ["c", "C", "C", "C"], ["b", "B", "B", "B"], ["a", "A", "A", "A"], ["s", "S", "S", "S"], ["ss", "SS", "SS", "SS"], ["ssr", "SSR", "SSR", "SSR"], ["legendary", "Lendária", "Legendary", "Legendaria"], ["divine", "Divina", "Divine", "Divina"]]
const ITEM_TEXT = {
  "pt-BR": {
    i: 1,
    powder: (n) => `Pó de Refinamento ${n}`,
    powderDesc: (r) => `Refina armas de classe ${r}: cada unidade é uma tentativa que dá XP ao nível da arma (pode dar muito, pouco ou até tirar). Você aceita ou recusa o resultado.`,
    legacyDesc: (r) => `Saiu do jogo: virou Pó de Refinamento ${r}.`,
    frag: (r) => `Fragmento de classe ${r}`,
    fragDesc: (r, n) => `Junte ${n} e escolha na Forja qual arma de classe ${r} montar — inclusive uma que você já tem.`,
  },
  en: {
    i: 2,
    powder: (n) => `Refining Powder ${n}`,
    powderDesc: (r) => `Refines class ${r} weapons: each unit is an attempt that gives XP to the weapon's level (a lot, a little or it can even take some away). You accept or reject the result.`,
    legacyDesc: (r) => `Removed from the game: it became Refining Powder ${r}.`,
    frag: (r) => `Class ${r} fragment`,
    fragDesc: (r, n) => `Collect ${n} and choose at the Forge which class ${r} weapon to assemble — even one you already have.`,
  },
  es: {
    i: 3,
    powder: (n) => `Polvo de Refinado ${n}`,
    powderDesc: (r) => `Refina armas de clase ${r}: cada unidad es un intento que da XP al nivel del arma (mucho, poco o incluso puede quitar). Tú aceptas o rechazas el resultado.`,
    legacyDesc: (r) => `Salió del juego: se convirtió en Polvo de Refinado ${r}.`,
    frag: (r) => `Fragmento de clase ${r}`,
    fragDesc: (r, n) => `Junta ${n} y elige en la Forja qué arma de clase ${r} montar, incluso una que ya tengas.`,
  },
}

for (const [lang, L] of Object.entries(ITEM_TEXT)) {
  const file = path.join(DIR, lang + ".json")
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  const mm = dict.MeuMundo
  if (!mm) throw new Error("sem MeuMundo em " + lang)
  const add = {}
  for (const row of UI) add[row[0]] = row[L.i]
  const override = {}
  for (const row of UI_OVERRIDE) override[row[0]] = row[L.i]
  for (const c of CLASSES) {
    add["gear_po_ref_" + c[0]] = L.powder(c[L.i])
    override["gearDesc_po_ref_" + c[0]] = L.powderDesc(c[L.i])
  }
  for (const [id, n, to] of LEGACY_POWDERS) {
    add["gear_po_ref_" + id] = L.powder(n)
    override["gearDesc_po_ref_" + id] = L.legacyDesc(CLASSES.find((c) => c[0] === to)[L.i])
  }
  CLASSES.forEach((c, i) => {
    add["gear_frag_classe_" + c[0]] = L.frag(c[L.i])
    override["gearDesc_frag_classe_" + c[0]] = L.fragDesc(c[L.i], 20 * (i + 1))
  })
  let n = 0
  for (const [k, v] of Object.entries(add)) if (!(k in mm)) { mm[k] = v; n++ }
  for (const [k, v] of Object.entries(override)) if (mm[k] !== v) { mm[k] = v; n++ }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(lang, "+" + n)
}
