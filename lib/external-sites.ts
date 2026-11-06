// Sites de clientes com projeto próprio na Vercel, servidos por rewrite no
// `next.config.mjs`. Dentro do Business eles aparecem só renderizados: a
// comunidade não tem construtor nem tela de gestão.
const EXTERNAL_SITES: Record<string, string> = {
  "e0129741-ffdd-4ce8-bf40-e74f554ddc47": "/gs",
  "6c4a2ede-9fd6-41be-9276-37938730d04b": "/hidrovap",
}

export function externalSitePath(idCommunity: string | null | undefined): string | null {
  return (idCommunity && EXTERNAL_SITES[idCommunity]) || null
}
