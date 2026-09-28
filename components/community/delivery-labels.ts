// Rótulos do delivery por peso (mig 266), num lugar só: o quadro e o modal
// global falam a MESMA coisa. Escrito duas vezes, um deles diria "levar" onde
// o outro diz "enviar" para o mesmo chamado.
//
// ⚠️ O rótulo da faixa vem do dicionário pela CHAVE da faixa (`delBand_w1`…),
// e o texto do banco é só a reserva: a tabela é editável no admin em pt, e o
// site fala três idiomas.

type T = (key: string, fallback?: string) => string

const BAND_FALLBACK: Record<string, string> = {
  w1: "Até 1 kg",
  w3: "De 1 a 3 kg",
  w6: "De 3 a 6 kg",
  w10: "De 6 a 10 kg",
  w10p: "Mais de 10 kg",
}

export function deliveryBandLabel(t: T, band: string | null | undefined, fromDb?: string | null): string {
  if (!band) return fromDb || ""
  return t(`delBand_${band}`, BAND_FALLBACK[band] || fromDb || band)
}

/**
 * `card`: o que QUEM PEDIU quer ("Enviar" / "Receber").
 * `courier`: o que o VIZINHO faz ("Levar" / "Buscar") — quem envia precisa de
 * alguém que LEVE; quem recebe, de alguém que BUSQUE.
 */
export function deliveryDirectionLabel(
  t: T,
  direction: string | null | undefined,
  mode: "card" | "courier"
): string {
  if (mode === "courier") {
    return direction === "send" ? t("delCourierTake", "Levar") : t("delCourierFetch", "Buscar")
  }
  return direction === "send" ? t("delDirSendShort", "Enviar") : t("delDirReceiveShort", "Receber")
}
