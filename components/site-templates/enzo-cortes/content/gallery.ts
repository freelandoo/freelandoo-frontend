/**
 * As fotos da galeria — TRABALHOS REAIS DA BARBEARIA, e só isso.
 *
 * ── HOJE A LISTA ESTÁ VAZIA, E A SEÇÃO SOME ──────────────────────────────
 * Nenhuma foto de corte, da cadeira ou do espaço foi enviada. Foto de banco
 * de imagens seria mentira sobre o lugar (a pessoa chega esperando outra
 * barbearia), e "cliente" que não é cliente é o tipo de coisa que derruba a
 * confiança no resto da página. Então, sem foto, a galeria NÃO É DESENHADA —
 * nem placeholder cinza no site publicado.
 *
 * ── COMO ENTRA UMA FOTO ──────────────────────────────────────────────────
 * 1. Salvar o arquivo (webp, lado maior ≤ 1600px) em `public/enzo-cortes/`
 *    da plataforma — é o que funciona nas três origens sem passar pelo
 *    `proxy.ts`, que ignora caminho com extensão — e o MESMO arquivo em
 *    `public/enzo-cortes/` do projeto solto.
 * 2. Acrescentar a entrada aqui, com a proporção real (`width`/`height`) —
 *    é ela que reserva o espaço e evita a página pular (CLS).
 * 3. `alt` descreve o que está NA FOTO ("degradê baixo com risco lateral"),
 *    não o nome da barbearia.
 *
 * Com 1 a 3 fotos a galeria vira uma faixa; com 4 ou mais ganha a composição
 * editorial e a passagem horizontal.
 */

export type GalleryPhoto = {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption?: string;
};

export const GALLERY: GalleryPhoto[] = [];
