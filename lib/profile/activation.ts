/**
 * Gate de ativação do perfil — quem já está liberado e quem ainda precisa pagar.
 *
 * `is_paid` significa UMA coisa só: existe assinatura ativa em
 * `tb_profile_subscription`. O PERFIL-CONTA nunca tem uma, e isso é por
 * construção: a mig 052 o cria com `is_paid = FALSE, is_visible = FALSE`
 * porque ele NÃO é vendável — ele É a pessoa. Ler esse FALSE como "falta
 * pagar" faz a tela oferecer ao dono a ativação de uma conta que nunca passou
 * por esse gate, e carimbá-la de "não publicada" para sempre.
 *
 * A paridade user≡perfil (S2, 2026-07-20) já tirou esse gate da vitrine, da
 * loja e dos cursos NO BACKEND (`CoursesService` isenta `is_user_account`, e o
 * paywall de publicar tem `utils/profilePaywall`). O que ficou para trás foram
 * os ESPELHOS do front, cada tela com o seu — foi assim que `/account` acabou
 * forçando `is_paid: true` na mão enquanto `/freelancer/<id>`, o MESMO perfil,
 * seguia oferecendo "Ative sua conta" ao próprio dono.
 *
 * ⚠️ NÃO "consertar" isto fazendo o backend devolver `is_paid = TRUE` para o
 * perfil-conta. `is_paid` é lido por quem exige assinatura DE VERDADE (live,
 * clan, loja de terceiros); mentir na fonte abriria essas portas de graça. A
 * isenção é de quem PERGUNTA, não do dado — e é por isso que ela mora aqui,
 * num lugar só, em vez de num `|| is_user_account` repetido por tela.
 */

export interface ProfileActivationLike {
  is_user_account?: boolean | null
  is_paid?: boolean | null
}

/** O perfil-fantasma da conta (mig 052). Ele é a pessoa, não um produto. */
export function isAccountProfile(p: ProfileActivationLike | null | undefined): boolean {
  return p?.is_user_account === true
}

/**
 * O perfil está liberado? Use isto no lugar de `!!profile.is_paid` em toda
 * decisão de "pode usar / já ativou", para não cobrar da conta um pedágio que
 * ela nunca teve.
 *
 * Clan NÃO entra aqui de propósito: ele tem `is_paid` próprio (assinatura do
 * dono) e regra própria de criação — quem precisa dessa isenção pergunta por
 * ela explicitamente, como faz `canProfilePublish`.
 */
export function profileIsActivated(p: ProfileActivationLike | null | undefined): boolean {
  return isAccountProfile(p) || p?.is_paid === true
}
