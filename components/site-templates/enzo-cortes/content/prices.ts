/**
 * OS PREÇOS DO SITE SAEM DO CADASTRO DE SERVIÇOS (Alex, 2026-09-25: "caso
 * altere lá, altera no site").
 *
 * ── COMO FUNCIONA ─────────────────────────────────────────────────────────
 * Cada serviço do site está amarrado a UM serviço cadastrado no perfil-conta
 * do Enzo, pelo ID — nunca pelo nome: renomear "Risco / desenho" no painel
 * não pode desligar o preço do site. `live-prices.ts` lê o cadastro no
 * servidor (a cada revalidação do ISR, 10 min) e grava aqui; o texto, o
 * cardápio, os combinados e o JSON-LD leem `priceOf`.
 *
 * ⚠️ O PREÇO TAMBÉM MORA DENTRO DOS TEXTOS (títulos do Google, perguntas
 * frequentes, páginas de bairro). Ali ele é escrito como MARCADOR — `{corte}`,
 * `{cb:soma}`, `{cbs:eco}` — e `fillPrices` o troca pelo valor ao vivo. Sem
 * isso o card diria R$ 45 e a pergunta logo abaixo continuaria dizendo R$ 40.
 * Texto novo com preço usa marcador, nunca o número.
 *
 * ⚠️ `BASE` É A REDE DE SEGURANÇA, não uma segunda tabela: é o que vale quando
 * o cadastro não responde, ou quando o serviço foi desativado/virou "sob
 * orçamento" lá. Assim o site nunca perde um card nem mostra "R$ 0".
 *
 * ⚠️ O ESTADO É DE MÓDULO, E EXISTE EM DOIS LUGARES: o servidor dos
 * componentes de servidor (gravado por `PriceGate`/`enzoMetadata`) e o dos
 * componentes de cliente (gravado por `LivePrices`, no SSR e no navegador).
 * Este tema serve um negócio só, então todo render grava os mesmos números.
 */

export type PriceSlug =
  | "corte-de-cabelo"
  | "barba"
  | "sobrancelha"
  | "risco-e-desenho"
  | "corte-e-barba"
  | "corte-barba-e-sobrancelha";

export type PriceMap = Partial<Record<PriceSlug, number>>;

/** Os valores da tabela original do Enzo, em reais. */
export const BASE_PRICES: Record<PriceSlug, number> = {
  "corte-de-cabelo": 40,
  barba: 25,
  sobrancelha: 15,
  "risco-e-desenho": 5,
  "corte-e-barba": 60,
  "corte-barba-e-sobrancelha": 70,
};

/** O perfil-conta do Enzo, dono dos serviços cadastrados. */
export const PRICE_PROFILE_ID = "1b13008c-648a-4c96-8b14-bd9a8604dcb6";

/** ID do serviço cadastrado (`tb_profile_service`) → serviço do site. */
export const CADASTRO_ID: Record<string, PriceSlug> = {
  "27": "corte-de-cabelo",
  "28": "barba",
  "29": "sobrancelha",
  "30": "risco-e-desenho",
  "31": "corte-e-barba",
  "32": "corte-barba-e-sobrancelha",
};

/** Os avulsos de cada combinado — a mesma lista do `sumOf` dos serviços. */
const PARTS: Partial<Record<PriceSlug, PriceSlug[]>> = {
  "corte-e-barba": ["corte-de-cabelo", "barba"],
  "corte-barba-e-sobrancelha": ["corte-de-cabelo", "barba", "sobrancelha"],
};

/** Uma linha de serviço cadastrado — da rota de serviços ou da do site. */
export type CadastroService = {
  id_profile_service: number | string;
  price_amount: number | null;
  price_on_request?: boolean;
  is_active?: boolean;
};

/**
 * A REGRA de ler o cadastro, num lugar só: o servidor (`loadLivePrices`) e a
 * pré-visualização do construtor (que já recebe os serviços e é de CLIENTE)
 * chegam ao mesmo mapa. Escrita duas vezes, o preview mostraria um preço e o
 * site no ar outro.
 */
export function pricesFromServices(list: readonly CadastroService[]): PriceMap {
  const map: PriceMap = {};
  for (const s of list) {
    const slug = CADASTRO_ID[String(s.id_profile_service)];
    if (!slug || s.is_active === false || s.price_on_request) continue;
    const cents = Number(s.price_amount);
    if (!Number.isFinite(cents) || cents <= 0) continue;
    map[slug] = cents / 100;
  }
  return map;
}

let live: PriceMap = {};

export function setLivePrices(map: PriceMap): void {
  live = map;
}

export function priceOf(slug: string): number {
  const s = slug as PriceSlug;
  return live[s] ?? BASE_PRICES[s] ?? 0;
}

/** "R$ 40" — com espaço COMUM, como os textos sempre foram escritos. */
export function priceText(reais: number): string {
  const n = Number.isInteger(reais)
    ? String(reais)
    : reais.toFixed(2).replace(".", ",");
  return `R$ ${n}`;
}

const TOKEN: Record<string, PriceSlug> = {
  corte: "corte-de-cabelo",
  barba: "barba",
  sobrancelha: "sobrancelha",
  risco: "risco-e-desenho",
  cb: "corte-e-barba",
  cbs: "corte-barba-e-sobrancelha",
};

function valueOf(key: string, kind?: string): number {
  const slug = TOKEN[key];
  if (!slug) return NaN;
  if (!kind) return priceOf(slug);
  const soma = (PARTS[slug] ?? []).reduce((acc, p) => acc + priceOf(p), 0);
  if (kind === "soma") return soma;
  if (kind === "eco") return Math.max(0, soma - priceOf(slug));
  return NaN;
}

/** Troca `{corte}`, `{cb:soma}`, `{cbs:eco}`… pelo preço ao vivo. */
export function fillPrices(text: string): string {
  return text.replace(/\{(\w+)(?::(soma|eco))?\}/g, (whole, key: string, kind?: string) => {
    const v = valueOf(key, kind);
    return Number.isFinite(v) ? priceText(v) : whole;
  });
}

/** O mesmo, para qualquer valor: strings, listas e objetos aninhados. */
export function fillDeep<T>(value: T): T {
  if (typeof value === "string") return fillPrices(value) as T;
  if (Array.isArray(value)) return value.map(fillDeep) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = fillDeep(v);
    return out as T;
  }
  return value;
}

/**
 * Embrulha um item de conteúdo: cada campo vira um getter que resolve os
 * marcadores NA HORA DE LER — é o que faz o mesmo objeto servir antes e
 * depois de os preços do cadastro chegarem. `priceSlug` liga o campo `price`
 * ao preço ao vivo.
 */
export function livePriced<T extends object>(raw: T, priceSlug?: string): T {
  const out = {} as T;
  for (const key of Object.keys(raw) as (keyof T)[]) {
    Object.defineProperty(out, key, {
      enumerable: true,
      get: () =>
        key === "price" && priceSlug ? priceOf(priceSlug) : fillDeep(raw[key]),
    });
  }
  return out;
}
