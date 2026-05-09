/**
 * Conversão entre líquido desejado pelo freelancer e total pago pelo cliente,
 * usando as mesmas regras do resumo de taxas nos modais de serviço.
 */

export function clientTotalCentsFromFreelancerNet(
  freelancerNetCents: number,
  stripeFeePercent: number,
  serviceFeeCents: number,
): number {
  const stripeFee = Math.round((freelancerNetCents * stripeFeePercent) / 100)
  return freelancerNetCents + stripeFee + serviceFeeCents
}

/**
 * `price_amount` no backend é o total para o cliente.
 * Recupera o líquido para o campo "valor que você quer receber".
 * Se não existir combinação exata (ex.: registos antigos gravados como líquido),
 * devolve `storedPriceAmountCents` para manter o valor mostrado estável.
 */
export function freelancerNetForEditForm(
  storedPriceAmountCents: number,
  stripeFeePercent: number,
  serviceFeeCents: number,
): number {
  let lo = 0
  let hi = storedPriceAmountCents
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const total = clientTotalCentsFromFreelancerNet(mid, stripeFeePercent, serviceFeeCents)
    if (total === storedPriceAmountCents) return mid
    if (total < storedPriceAmountCents) lo = mid + 1
    else hi = mid - 1
  }
  return storedPriceAmountCents
}
