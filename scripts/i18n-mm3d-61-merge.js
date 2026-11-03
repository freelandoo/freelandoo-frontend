// Oficina, forja por partes e refinamento. Fill-if-absent, preserva traduções existentes.
const fs = require("node:fs")
const path = require("node:path")
const catalog = require("./i18n-mm3d-61-gear-data.json")
const labels = {
  gearLore_cristal_morkhan: [
    "Uma luz violeta atravessa a rachadura. As marcas lembram o nome apagado de Morkhan, o oitavo campeão dos Jogos Eternos de Lúmen. Esta recordação pode ser examinada sem avançar uma missão.",
    "Violet light crosses the crack. Its marks recall the erased name of Morkhan, the eighth champion of Lumen's Eternal Games. Examining this keepsake does not advance a quest.",
    "Una luz violeta atraviesa la grieta. Las marcas recuerdan el nombre borrado de Morkhan, el octavo campeón de los Juegos Eternos de Lúmen. Examinar este recuerdo no avanza una misión.",
  ],
  gearLore_diario_sem_nome: [
    "As páginas reconstituídas mencionam Aurion, os Sete e um oitavo lugar vazio. Ainda não provam onde está Morkhan. Ler o diário registra a descoberta na coleção.",
    "The restored pages mention Aurion, the Seven and an empty eighth place. They do not yet reveal where Morkhan is. Reading the diary records the discovery in your collection.",
    "Las páginas reconstruidas mencionan a Aurion, los Siete y un octavo lugar vacío. Todavía no revelan dónde está Morkhan. Leer el diario registra el hallazgo en tu colección.",
  ],
  gearLore_chave_subestacao: [
    "Uma chave antiga marcada com uma engrenagem e o número oito. A origem da subestação continua desconhecida. Examinar a inscrição registra a descoberta na coleção.",
    "An old key marked with a gear and the number eight. The substation's origin remains unknown. Examining the inscription records the discovery in your collection.",
    "Una llave antigua marcada con un engranaje y el número ocho. El origen de la subestación sigue siendo desconocido. Examinar la inscripción registra el hallazgo en tu colección.",
  ],
  centerPlace_forja: ["Forja das Engrenagens", "Gearworks Forge", "Forja de Engranajes"],
  centerPlace_arsenal: ["Arsenal de Lúmen", "Lumen Arsenal", "Arsenal de Lúmen"],
  pvForge: ["Forjar peças e armas", "Forge parts and weapons", "Forjar piezas y armas"],
  pvRefine: ["Refinar equipamento", "Refine equipment", "Refinar equipo"],
  pvArmory: ["Comprar equipamentos", "Buy equipment", "Comprar equipo"],
  forgeItemGuide: ["Onde conseguir e como usar", "Where to obtain and how to use", "Dónde obtener y cómo usar"],
  forgeNetworkRetry: ["Resposta não confirmada. Confira o estado e repita a mesma ação para recuperar o resultado sem cobrar novamente.", "Response unconfirmed. Check the state and retry the same action to recover its result without another charge.", "Respuesta sin confirmar. Revisa el estado y repite la misma acción para recuperar el resultado sin otro cobro."],
  forgeRecipePrice: ["{n} moedas · nível {level}", "{n} coins · level {level}", "{n} monedas · nivel {level}"],
  forgeAssemblyProgress: ["Partes prontas: {ready}/{total}", "Parts ready: {ready}/{total}", "Piezas listas: {ready}/{total}"],
  forgeRequired: ["Materiais necessários", "Required materials", "Materiales necesarios"],
  forgeOnePart: ["Esta fabricação cria uma peça. Reúna todas as partes para montar a arma.", "This craft creates one part. Gather all parts to assemble the weapon.", "Esta fabricación crea una pieza. Reúne todas para montar el arma."],
  forgeGuaranteed: ["Montagem garantida. As peças e moedas são consumidas uma vez.", "Guaranteed assembly. Parts and coins are consumed once.", "Montaje garantizado. Las piezas y monedas se consumen una vez."],
  forgeConfirmCost: ["Confirmar o consumo dos materiais acima e de {n} moedas?", "Consume the materials above and {n} coins?", "¿Consumir los materiales indicados y {n} monedas?"],
  forgeAssemble: ["Montar arma completa", "Assemble complete weapon", "Montar arma completa"],
  forgeGuideTab: ["Catálogo", "Catalog", "Catálogo"],
  forgeAll: ["Todos", "All", "Todos"],
  forgeWeapons: ["Armas", "Weapons", "Armas"],
  forgeArmor: ["Proteções", "Armor", "Protecciones"],
  forgeAccessories: ["Acessórios", "Accessories", "Accesorios"],
  forgeMaterials: ["Materiais e peças", "Materials and parts", "Materiales y piezas"],
  forgeRecipes: ["Projetos", "Blueprints", "Planos"],
  forgeQuestItems: ["Missão", "Quest", "Misión"],
  forgeCosmetics: ["Cosméticos", "Cosmetics", "Cosméticos"],
  forgeOwnedCount: ["Na mochila: {n}", "In bag: {n}", "En mochila: {n}"],
  forgeNotOwned: ["Ainda não adquirido", "Not yet acquired", "Aún no adquirido"],
  forgePartCount: ["{n} partes diferentes para montar", "{n} distinct parts to assemble", "{n} piezas diferentes para montar"],
  forgeUsed: ["Uso registrado.", "Use recorded.", "Uso registrado."],
  forgeLearn: ["Aprender projeto", "Learn blueprint", "Aprender plano"],
  forgeRead: ["Examinar registro", "Examine record", "Examinar registro"],
  forgeUnlockEmote: ["Desbloquear gesto", "Unlock emote", "Desbloquear gesto"],
  forgeApplyCosmetic: ["Aplicar visual", "Apply appearance", "Aplicar apariencia"],
  forgeRecycleConfirm: ["Consumir 1 unidade por {n} moedas?", "Consume 1 unit for {n} coins?", "¿Consumir 1 unidad por {n} monedas?"],
  forgeBuyConfirm: ["Confirmar compra por {n} moedas?", "Confirm purchase for {n} coins?", "¿Confirmar compra por {n} monedas?"],
  forgeKinds: ["Bancadas da forja", "Forge workbenches", "Bancos de la forja"],
  forgeParts: ["Peças", "Parts", "Piezas"],
  forgeConversions: ["Conversões", "Conversions", "Conversiones"],
  forgeCategory: ["Categoria", "Category", "Categoría"],
  forgeReload: ["Tentar abrir novamente", "Try opening again", "Intentar abrir de nuevo"],
  refineTitle: ["Bancada de refinamento", "Refinement workbench", "Banco de refinamiento"],
  refineTab: ["Refinar", "Refine", "Refinar"],
  refineResult: ["Resultado proposto: +{before} → +{after}", "Proposed result: +{before} → +{after}", "Resultado propuesto: +{before} → +{after}"],
  refineCurrent: ["Atual", "Current", "Actual"],
  refineProposed: ["Proposto", "Proposed", "Propuesto"],
  refineSpent: ["A tentativa já foi paga. Recusar mantém o equipamento atual; moedas e materiais não são devolvidos.", "The attempt is already paid. Declining keeps your current equipment; coins and materials are not refunded.", "El intento ya está pagado. Rechazar conserva el equipo actual; no se devuelven monedas ni materiales."],
  refineExpires: ["Decidir até {time}. Após isso, o resultado é descartado.", "Decide by {time}. After that, the result is discarded.", "Decide antes de {time}. Después, se descarta el resultado."],
  refineLowerConfirm: ["Este resultado reduz o refinamento. Deseja mesmo aplicar?", "This result lowers refinement. Apply it anyway?", "Este resultado reduce el refinamiento. ¿Aplicarlo de todas formas?"],
  refineApplied: ["Refinamento aplicado.", "Refinement applied.", "Refinamiento aplicado."],
  refineApplyLower: ["Aplicar a redução", "Apply downgrade", "Aplicar reducción"],
  refineAccept: ["Aceitar resultado", "Accept result", "Aceptar resultado"],
  refineDiscarded: ["Resultado recusado. Equipamento preservado.", "Result declined. Equipment preserved.", "Resultado rechazado. Equipo conservado."],
  refineDiscard: ["Recusar e manter o atual", "Decline and keep current", "Rechazar y conservar el actual"],
  refineLevel: ["Refinamento atual: +{n}", "Current refinement: +{n}", "Refinamiento actual: +{n}"],
  refineUnavailable: ["No máximo ou sem refinamento disponível.", "At maximum or refinement unavailable.", "Al máximo o sin refinamiento disponible."],
  refineUp: ["Subir", "Improve", "Subir"],
  refineSame: ["Manter", "Keep", "Mantener"],
  refineDown: ["Descer", "Downgrade", "Bajar"],
  refineCost: ["Tentativa: {n} moedas", "Attempt: {n} coins", "Intento: {n} monedas"],
  refineProtect: ["Usar selos para impedir queda", "Use seals to prevent downgrade", "Usar sellos para impedir la reducción"],
  refineGuaranteed: ["Próxima melhoria garantida pela persistência.", "Next improvement guaranteed by persistence.", "Próxima mejora garantizada por persistencia."],
  refinePity: ["Tentativas sem melhoria: {n}/{max}", "Attempts without improvement: {n}/{max}", "Intentos sin mejora: {n}/{max}"],
  refineFloor: ["Piso protegido: +{n}. A arma não é destruída.", "Protected floor: +{n}. The weapon is not destroyed.", "Mínimo protegido: +{n}. El arma no se destruye."],
  refineConsent: ["Gastar os recursos e sortear? Você poderá aceitar ou recusar o resultado; o custo não é reembolsado.", "Spend resources and roll? You may accept or decline the result; the cost is not refundable.", "¿Gastar recursos y sortear? Puedes aceptar o rechazar el resultado; el coste no se devuelve."],
  refinePay: ["Pagar e revelar resultado", "Pay and reveal result", "Pagar y revelar resultado"],
  refineAttempt: ["Preparar refinamento", "Prepare refinement", "Preparar refinamiento"],
  refineMissing: ["Faltam moedas ou materiais", "Missing coins or materials", "Faltan monedas o materiales"],
  refinePending: ["Resolver refinamento pendente", "Resolve pending refinement", "Resolver refinamiento pendiente"],
}
let added = 0
for (const [index, locale] of ["pt-BR", "en", "es"].entries()) {
  const file = path.join(__dirname, "..", "messages", locale + ".json")
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo ||= {}
  const values = { ...catalog[locale], ...Object.fromEntries(Object.entries(labels).map(([key, translations]) => [key, translations[index]])) }
  for (const [key, value] of Object.entries(values)) if (json.MeuMundo[key] === undefined) { json.MeuMundo[key] = value; added++ }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log("i18n oficina: " + added + " chaves adicionadas")
