// features/meu-mundo/classes.ts — as CLASSES (mm3d-58): raposas e vampiros.
//
// Todo jogador escolhe ao entrar; cada bairro é de UMA classe e o centro
// mistura todos. O corpo sai da classe + sexo + fase da vida (jovem → adulto,
// GROWTH na vida) — o servidor decide; aqui só a lista para desenhar.
// Espelho de src/utils/meuMundoClans.js do backend.

export const CLANS = ["raposa", "vampiro"] as const
export type Clan = (typeof CLANS)[number]
export type Sex = "m" | "f"

export const CLAN_BODIES = ["raposa", "raposa_f", "raposa_adulto", "raposa_adulta", "vampiro", "vampira", "vampiro_adulto", "vampira_adulta"] as const
export type ClanBody = (typeof CLAN_BODIES)[number]

export const isClanBody = (id: string | null | undefined): id is ClanBody => (CLAN_BODIES as readonly string[]).includes(id ?? "")

/** Mapa por corpo de classe a partir de uma função (para os Record<BodyId, …>). */
export const byClanBody = <T>(f: (b: ClanBody) => T) => Object.fromEntries(CLAN_BODIES.map((b) => [b, f(b)])) as Record<ClanBody, T>

/** Corpo jovem de cada classe e sexo (o que a tela de escolha mostra). */
export const YOUNG_BODY: Record<Clan, Record<Sex, ClanBody>> = {
  raposa: { m: "raposa", f: "raposa_f" },
  vampiro: { m: "vampiro", f: "vampira" },
}

/** Classe de um corpo de classe (null = deuses, padrão, skins). */
export const clanOfBody = (b: string | null | undefined): Clan | null => (!b || !isClanBody(b) ? null : b.startsWith("raposa") ? "raposa" : "vampiro")

/**
 * Arma de cada classe (MEU MUNDO 3D/pipeline/build_armas.py). -m63 (2026-11-02):
 * mais triângulos e os dois lados do material — com 1,8 mil e um lado só as armas
 * pareciam rachadas (dava para ver através). -m64: o mesmo passado no gltfpack
 * (malha quantizada; ~26% menor, as texturas JPEG ficam como estão).
 */
export const CLAN_WEAPON: Record<Clan, string> = {
  raposa: "/meu-mundo/armas/v1/arma-cajado-m64.glb",
  vampiro: "/meu-mundo/armas/v1/arma-espada-m64.glb",
}

/** Animações próprias da classe (golpes, guarda, morte), no esqueleto do Sergio. */
export const CLAN_ANIMS: Record<Clan, string> = {
  raposa: "anim-raposa-sergio-m58.glb",
  vampiro: "anim-vampiro-sergio-m58.glb",
}

/** Skins que usam espada além dos vampiros (espelho de SWORD_SKINS em meuMundoClans.js). */
export const SWORD_SKINS: readonly string[] = ["aurion", "morkhan", "zephyra"]

type Tr = (key: string, fallback: string) => string

/** Nome visível do corpo de classe (traduzido; adulto não muda o nome). */
export function clanBodyName(b: ClanBody, t: Tr): string {
  if (b.startsWith("raposa")) return t("clanFox", "Raposa")
  return b.startsWith("vampira") ? t("clanVampireF", "Vampira") : t("clanVampire", "Vampiro")
}

/** Nomes de todos os corpos de classe (para os mapas Record<BodyId, string>). */
export const clanBodyNames = (t: Tr) => byClanBody((b) => clanBodyName(b, t))

/**
 * Os 8 personagens como SKIN SÓ DE ADMINISTRADOR (testes, pedido do Alex).
 * Id de skin com hífen (CHECK do banco); espelho de CLAN_SKINS em
 * src/utils/meuMundoSkins.js do backend.
 */
export const CLAN_SKINS = [
  { id: "raposa", body: "raposa", name: "Raposa" },
  { id: "raposa-f", body: "raposa_f", name: "Raposa (menina)" },
  { id: "raposa-adulto", body: "raposa_adulto", name: "Raposa adulto" },
  { id: "raposa-adulta", body: "raposa_adulta", name: "Raposa adulta" },
  { id: "vampiro", body: "vampiro", name: "Vampiro" },
  { id: "vampira", body: "vampira", name: "Vampira" },
  { id: "vampiro-adulto", body: "vampiro_adulto", name: "Vampiro adulto" },
  { id: "vampira-adulta", body: "vampira_adulta", name: "Vampira adulta" },
] as const satisfies readonly { id: string; body: ClanBody; name: string }[]
export type ClanSkinId = (typeof CLAN_SKINS)[number]["id"]
