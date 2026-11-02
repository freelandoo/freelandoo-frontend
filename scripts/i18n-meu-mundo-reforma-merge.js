// Meu Mundo 3D — mm3d-59 REFORMA (recibos, XP de aventura, destreza, gramática dos ganhos).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-reforma-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  rewardReceipt: ["O que você ganhou", "What you earned", "Lo que ganaste"],
  rewardXp: ["XP de aventura", "Adventure XP", "XP de aventura"],
  rewardLevelLine: ["Nível {from} → {to}", "Level {from} → {to}", "Nivel {from} → {to}"],
  attrStrength: ["Força", "Strength", "Fuerza"],
  attrIntelligence: ["Inteligência", "Intelligence", "Inteligencia"],
  attrDexterity: ["Destreza", "Dexterity", "Destreza"],
  attrSpeed: ["Velocidade", "Speed", "Velocidad"],
  vitalEnergy: ["Energia", "Energy", "Energía"],
  vitalStress: ["Estresse", "Stress", "Estrés"],
  vitalSatiety: ["Saciedade", "Fullness", "Saciedad"],
  vitalMood: ["Humor", "Mood", "Ánimo"],
  vitalHealth: ["Saúde", "Health", "Salud"],
  fightChecking: ["Conferindo a luta…", "Checking the fight…", "Verificando la pelea…"],
  fightOffline: [
    "Treino sem conexão com o servidor: sem prêmio desta vez.",
    "Practice without a server connection: no reward this time.",
    "Entrenamiento sin conexión con el servidor: sin premio esta vez.",
  ],
  rarityCommon: ["Comum", "Common", "Común"],
  rarityUncommon: ["Incomum", "Uncommon", "Poco común"],
  rarityRare: ["Raro", "Rare", "Raro"],
  rarityEpic: ["Épico", "Epic", "Épico"],
  rarityLegendary: ["Lendário", "Legendary", "Legendario"],
  // kit (carrossel)
  carouselPos: ["{i} de {n}", "{i} of {n}", "{i} de {n}"],
  carouselPrev: ["Anterior", "Previous", "Anterior"],
  carouselNext: ["Próximo", "Next", "Siguiente"],
  // equipamento (slice 3)
  gearTitle: ["Equipamento", "Equipment", "Equipamiento"],
  menuGearHint: ["Mochila, Armeiro e Forja", "Bag, Armorer and Forge", "Mochila, Armero y Forja"],
  gearHeader: ["Nível {lv} · {c} moedas", "Level {lv} · {c} coins", "Nivel {lv} · {c} monedas"],
  gearTabBag: ["Mochila", "Bag", "Mochila"],
  gearTabArmory: ["Armeiro", "Armorer", "Armero"],
  gearTabForge: ["Forja", "Forge", "Forja"],
  gearSlots: ["Equipado agora", "Equipped now", "Equipado ahora"],
  gearEmpty: ["Vazio", "Empty", "Vacío"],
  gearBagEmpty: ["Mochila vazia. Lute e jogue para ganhar materiais.", "Your bag is empty. Fight and play to earn materials.", "Mochila vacía. Lucha y juega para ganar materiales."],
  gearNothing: ["Nada por aqui ainda.", "Nothing here yet.", "Nada por aquí todavía."],
  gearLoadFail: ["Não foi possível abrir o equipamento.", "Could not open your equipment.", "No se pudo abrir el equipamiento."],
  gearFail: ["Não deu certo. Tente de novo.", "That did not work. Try again.", "No funcionó. Inténtalo de nuevo."],
  gearBonusDmg: ["+{v} dano", "+{v} damage", "+{v} daño"],
  gearBonusDef: ["+{v} defesa", "+{v} defense", "+{v} defensa"],
  gearBonusStam: ["−{v} fôlego gasto", "−{v} stamina spent", "−{v} aliento gastado"],
  gearBonusWarn: ["+{v} tempo de aviso", "+{v} warning time", "+{v} tiempo de aviso"],
  gearBonusPower: ["+{v} carga do poder", "+{v} power charge", "+{v} carga del poder"],
  gearCompare: ["{d} em relação a {name}", "{d} compared to {name}", "{d} respecto a {name}"],
  gearUpgraded: ["Aprimorado +{n}", "Upgraded +{n}", "Mejorado +{n}"],
  gearEquipped: ["Equipado", "Equipped", "Equipado"],
  gearEquippedOk: ["Equipado!", "Equipped!", "¡Equipado!"],
  gearEquip: ["Equipar", "Equip", "Equipar"],
  gearUnequip: ["Tirar", "Remove", "Quitar"],
  gearMaterialUse: ["Material da forja. Recicle o que sobrar por {c} moedas cada.", "Forge material. Recycle leftovers for {c} coins each.", "Material de forja. Recicla lo que sobre por {c} monedas cada uno."],
  gearNeedLevel: ["Precisa do nível {n}", "Requires level {n}", "Requiere nivel {n}"],
  gearOtherClan: ["Arma de outra classe", "Weapon of another class", "Arma de otra clase"],
  gearPrice: ["{p} moedas", "{p} coins", "{p} monedas"],
  gearOwned: ["Já é seu", "Already yours", "Ya es tuyo"],
  gearPoor: ["Moedas insuficientes", "Not enough coins", "Monedas insuficientes"],
  gearCancel: ["Voltar", "Back", "Volver"],
  gearConfirm: ["Confirmar", "Confirm", "Confirmar"],
  gearBuy: ["Comprar", "Buy", "Comprar"],
  gearBought: ["Comprado! Está na mochila.", "Bought! It is in your bag.", "¡Comprado! Está en la mochila."],
  gearForgeCost: ["Forjar: {c} moedas + materiais", "Forge: {c} coins + materials", "Forjar: {c} monedas + materiales"],
  gearNeedRecipe: ["Falta aprender a receita", "You still need the recipe", "Falta aprender la receta"],
  gearLack: ["Faltam materiais", "Missing materials", "Faltan materiales"],
  gearForge: ["Forjar", "Forge", "Forjar"],
  gearForged: ["Forjado!", "Forged!", "¡Forjado!"],
  gearUpgrade: ["Aprimorar", "Upgrade", "Mejorar"],
  gearUpgradeLv: ["Aprimoramento {n} de {max}", "Upgrade {n} of {max}", "Mejora {n} de {max}"],
  gearUpDmg: ["+2% de dano por nível", "+2% damage per level", "+2% de daño por nivel"],
  gearUpDef: ["+1,5% de defesa por nível", "+1.5% defense per level", "+1,5% de defensa por nivel"],
  gearUpgradedOk: ["Aprimorado!", "Upgraded!", "¡Mejorado!"],
  gearMax: ["No máximo", "Maxed out", "Al máximo"],
  gearRecycle: ["Reciclar", "Recycle", "Reciclar"],
  gearRecycleEach: ["{c} moedas cada", "{c} coins each", "{c} monedas cada uno"],
  gearRecycleOne: ["Reciclar 1", "Recycle 1", "Reciclar 1"],
  gearLoading: ["Carregando…", "Loading…", "Cargando…"],
  // nomes dos itens (meuMundoGear.js)
  gear_espada_aprendiz: ["Espada de aprendiz", "Apprentice sword", "Espada de aprendiz"],
  gear_cajado_aprendiz: ["Cajado de aprendiz", "Apprentice staff", "Bastón de aprendiz"],
  gear_espada_latao: ["Espada de latão", "Brass sword", "Espada de latón"],
  gear_cajado_latao: ["Cajado de latão", "Brass staff", "Bastón de latón"],
  gear_espada_eter: ["Espada de éter", "Aether sword", "Espada de éter"],
  gear_cajado_eter: ["Cajado de éter", "Aether staff", "Bastón de éter"],
  gear_colete_couro: ["Colete de couro", "Leather vest", "Chaleco de cuero"],
  gear_couraca_rebitada: ["Couraça rebitada", "Riveted cuirass", "Coraza remachada"],
  gear_relogio_bolso: ["Relógio de bolso", "Pocket watch", "Reloj de bolsillo"],
  gear_luvas_precisao: ["Luvas de precisão", "Precision gloves", "Guantes de precisión"],
  gear_amuleto_aurion: ["Amuleto de Aurion", "Amulet of Aurion", "Amuleto de Aurion"],
  gear_fragmento_lamina: ["Fragmento de lâmina", "Blade fragment", "Fragmento de hoja"],
  gear_nucleo_eter: ["Núcleo de éter", "Aether core", "Núcleo de éter"],
  gear_selo_forja: ["Selo de forja", "Forge seal", "Sello de forja"],
  gear_couro_reforcado: ["Couro reforçado", "Reinforced leather", "Cuero reforzado"],
  gear_rebite: ["Rebites", "Rivets", "Remaches"],
  gear_pigmento_eter: ["Pigmento de éter", "Aether pigment", "Pigmento de éter"],
  gear_mola_precisao: ["Mola de precisão", "Precision spring", "Resorte de precisión"],
  gear_injetor_vapor: ["Injetor de vapor", "Steam injector", "Inyector de vapor"],
  gear_capacitor: ["Capacitor", "Capacitor", "Condensador"],
  gear_rolamento: ["Rolamento", "Bearing", "Rodamiento"],
  gear_receita_eter: ["Receita: armas de éter", "Recipe: aether weapons", "Receta: armas de éter"],
  gear_cristal_morkhan: ["Cristal rachado de Morkhan", "Morkhan’s cracked crystal", "Cristal agrietado de Morkhan"],
  gear_pintura_arma_eter: ["Pintura de arma: éter", "Weapon paint: aether", "Pintura de arma: éter"],
}

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
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n meu-mundo reforma: ${added} chaves adicionadas`)
