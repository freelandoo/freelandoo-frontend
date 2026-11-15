// features/meu-mundo/ui/status/life-voice.ts — como cada CLASSE sente a vida (VS4, 2026-11-14).
//
// Pedido do Alex: "vampiro não tem engrenagens, foque no vampiro e na raposa mágica". A regra é
// a mesma para todos (o servidor manda os males com id neutro: cinza, corrosao, desgaste,
// exausto, doente, lesao); o NOME e a explicação saem da classe, pela lore (historia/v2):
//  • Raposa mágica: povo do Sol, uma chama por dentro; a Cinza transforma as Raposas que sofrem.
//  • Vampiro: trocou o pelo, o rabo e o sol pela vida eterna; vive do sangue, coração quase parado.
// Sem classe (deus, skin de admin) = frase neutra. Variante por classe é CHAVE separada
// (`_raposa` / `_vampiro`), nunca texto escolhido por `if` dentro do componente.
// Plano: MEU MUNDO 3D/planos/2026-11-14-vida-steampunk.md §5.
import type { Clan } from "../../classes"
import type { LifeAilmentId } from "../../types"

type Tr = (key: string, fallback: string) => string

/** [nome, o que faz] do mal para a classe. */
export function ailmentWords(id: LifeAilmentId, clan: Clan | null, t: Tr): [string, string] {
  if (clan === "raposa") {
    switch (id) {
      case "cinza":
        return [t("ail_cinza_raposa", "Cinza na chama"), t("ail_cinzaText_raposa", "A Cinza nasceu do choque da Chama do Sol com o fogo do Abaixo, e é ela que transforma em monstro as Raposas que sofrem. Fome, noites sem sono e estresse por muito tempo a deixam abafar a sua chama: menos apetite e fôlego, treino e estudo rendem menos e a vida gasta mais rápido. Cuidar dele a faz assentar de novo.")]
      case "corrosao":
        return [t("ail_corrosao_raposa", "Chama esfumaçada"), t("ail_corrosaoText_raposa", "Tônico e elixir demais fazem a chama soltar fumaça. Enquanto não limpa, a saúde não volta; muito alta, ela queima a saúde. A Enfermaria limpa três vezes mais rápido.")]
      case "desgaste":
        return [t("ail_desgaste_raposa", "Brasa rachada"), t("ail_desgasteText_raposa", "O coração da Raposa é uma brasa. Pó de Faísca, Elixir de Ferro, estresse alto e noites em claro a racham. Em 100 ela cede: Enfermaria e −20 de vitalidade. Dormir alivia.")]
      case "exausto":
        return [t("ail_exausto_raposa", "Chama fraca"), t("ail_exaustoText_raposa", "A chama está quase apagando. Se ficar assim por horas, ela apaga: ele cai no chão e dorme ali mesmo.")]
      case "doente":
        return [t("ail_doente_raposa", "Febre de brasa"), t("ail_doenteText_raposa", "A chama saiu do controle e queima por dentro: a energia não enche e o estresse não desce. Com saúde 15 ou menos, o socorro leva para a Enfermaria.")]
      case "lesao":
        return [t("ail_lesao_raposa", "Pata ferida"), t("ail_lesaoText_raposa", "Fora da Enfermaria, a saúde volta pela metade até a pata sarar.")]
    }
  }
  if (clan === "vampiro") {
    switch (id) {
      case "cinza":
        return [t("ail_cinza_vampiro", "Cinza nas veias"), t("ail_cinzaText_vampiro", "A Cinza não transforma quem já deixou de ser bicho, mas cobra a eternidade: escurece e seca o sangue. Fome, noites sem sono e estresse por muito tempo a espalham: menos apetite e fôlego, treino e estudo rendem menos e a vida gasta mais rápido. Cuidar dele a faz assentar de novo.")]
      case "corrosao":
        return [t("ail_corrosao_vampiro", "Sangue amargo"), t("ail_corrosaoText_vampiro", "Tônico e elixir demais azedam o sangue. Enquanto não limpa, a saúde não volta; muito alto, ele corrói a saúde. A Enfermaria limpa três vezes mais rápido.")]
      case "desgaste":
        return [t("ail_desgaste_vampiro", "Coração de pedra"), t("ail_desgasteText_vampiro", "O coração do Vampiro quase não bate. Pó de Faísca, Elixir de Ferro, estresse alto e noites em claro o endurecem como a pedra de Morkhan. Em 100 ele para: Enfermaria e −20 de vitalidade. Dormir alivia.")]
      case "exausto":
        return [t("ail_exausto_vampiro", "Sangue ralo"), t("ail_exaustoText_vampiro", "O sangue está ralo. Se ficar assim por horas, ele cai no chão e dorme ali mesmo, feito pedra.")]
      case "doente":
        return [t("ail_doente_vampiro", "Palidez de prata"), t("ail_doenteText_vampiro", "A fraqueza pesa no sangue como prata: a energia não enche e o estresse não desce. Com saúde 15 ou menos, o socorro leva para a Enfermaria.")]
      case "lesao":
        return [t("ail_lesao_vampiro", "Osso trincado"), t("ail_lesaoText_vampiro", "Fora da Enfermaria, a saúde volta pela metade até o osso colar.")]
    }
  }
  switch (id) {
    case "cinza":
      return [t("ail_cinza", "Cinza acordada"), t("ail_cinzaText", "A Cinza da guerra dorme no sangue de quem saiu da cápsula. Fome, noites sem sono e estresse por muito tempo a acordam: menos apetite e fôlego, treino e estudo rendem menos e a vida gasta mais rápido. Cuidar dele a faz dormir de novo.")]
    case "corrosao":
      return [t("ail_corrosao", "Corrosão no sangue"), t("ail_corrosaoText", "Tônico e elixir demais. Enquanto não baixa, a saúde não volta; alta demais, ela corrói a saúde. A Enfermaria limpa três vezes mais rápido.")]
    case "desgaste":
      return [t("ail_desgaste", "Coração em Desgaste"), t("ail_desgasteText", "Pó de Faísca, Elixir de Ferro, estresse alto e noites em claro forçam o coração. Em 100 ele cede: Enfermaria e −20 de vitalidade. Dormir alivia.")]
    case "exausto":
      return [t("ail_exausto", "Exaustão"), t("ail_exaustoText", "Sem energia. Se continuar assim por horas, ele desmaia e dorme no chão.")]
    case "doente":
      return [t("ail_doente", "Doente"), t("ail_doenteText", "Saúde baixa: a energia não enche e o estresse não desce. Com saúde 15 ou menos, o socorro leva para a Enfermaria.")]
    case "lesao":
      return [t("ail_lesao", "Lesão"), t("ail_lesaoText", "Fora da Enfermaria, a saúde volta pela metade até sarar.")]
  }
}

/** Fala da necessidade que muda com a classe (null = a frase comum de sempre). */
export function needWords(id: string, clan: Clan | null, t: Tr): string | null {
  if (clan === "raposa") {
    if (id === "exhausted") return t("needExhausted_raposa", "Minha chama está quase apagando. Preciso descansar.")
    if (id === "stressed") return t("needStressed_raposa", "Minha cauda está toda eriçada. Preciso de uma pausa.")
    if (id === "unwell") return t("needUnwell_raposa", "Minha chama está queimando por dentro. Preciso da Enfermaria.")
    if (id === "hospital") return t("needHospital_raposa", "Estou na Enfermaria, esperando a chama voltar.")
  }
  if (clan === "vampiro") {
    if (id === "exhausted") return t("needExhausted_vampiro", "Meu sangue está ralo. Preciso descansar.")
    if (id === "stressed") return t("needStressed_vampiro", "Minhas presas não param de aparecer. Preciso de uma pausa.")
    if (id === "unwell") return t("needUnwell_vampiro", "Estou pálido feito prata. Preciso da Enfermaria.")
    if (id === "hospital") return t("needHospital_vampiro", "Estou na Enfermaria, esperando o sangue voltar.")
  }
  return null
}

/** O desmaio (evento `collapse`) pela classe. */
export function collapseWords(clan: Clan | null, t: Tr): string {
  if (clan === "raposa") return t("evCollapse_raposa", "A chama apagou: caiu e dormiu no chão.")
  if (clan === "vampiro") return t("evCollapse_vampiro", "O sangue ralo o derrubou: dormiu no chão feito pedra.")
  return t("evCollapse", "Desmaiou de exaustão e dormiu no chão.")
}

/** Causa de morte `exaustao` pela classe. */
export function exhaustCauseWords(clan: Clan | null, t: Tr): string {
  if (clan === "raposa") return t("causeExhaustion_raposa", "A chama apagou")
  if (clan === "vampiro") return t("causeExhaustion_vampiro", "Sangue seco")
  return t("causeExhaustion", "Exaustão")
}

/** A frase do "Agora" quando a energia está no fim. */
export function exhaustedQuoteWords(clan: Clan | null, t: Tr): string {
  if (clan === "raposa") return t("qExhausted_raposa", "A chama dele está quase apagando.")
  if (clan === "vampiro") return t("qExhausted_vampiro", "O sangue dele está ralo.")
  return t("qExhausted", "Ele está exausto.")
}

/** Internado: onde ele fica e até quando. */
export function hospitalStayWords(clan: Clan | null, t: Tr): string {
  if (clan === "raposa") return t("stHospitalText_raposa", "Sob as lamparinas de sol da Enfermaria até a chama voltar (saúde 60).")
  if (clan === "vampiro") return t("stHospitalText_vampiro", "No sarcófago frio da Enfermaria até o sangue voltar (saúde 60).")
  return t("stHospitalText", "Na Enfermaria até se recuperar (saúde 60).")
}
