// Sites de clientes com projeto próprio: GS, Hidrovap e Excelência no domínio
// deles, Russa Mais Russa por rewrite no `next.config.mjs`. Dentro do Business
// eles aparecem só renderizados: a comunidade não tem construtor nem tela de
// gestão.
const EXTERNAL_SITES: Record<string, string> = {
  "e0129741-ffdd-4ce8-bf40-e74f554ddc47": "https://gsrefrigeracao.tec.br",
  "6c4a2ede-9fd6-41be-9276-37938730d04b": "https://hidrovap.com.br",
  "48949086-dc3b-4b71-a316-c3fc0698252b": "https://excelencia.tec.br",
  "605037cc-007b-40e6-9cb9-5f04faa194bf": "/rh",
  "408de853-8a1f-49af-841b-e3bc78fc5d89": "/vivaar",
  "f9be317e-0882-4f06-9685-7e3e325c31a6": "/russamaisrussa",
}

export function externalSitePath(idCommunity: string | null | undefined): string | null {
  return (idCommunity && EXTERNAL_SITES[idCommunity]) || null
}
