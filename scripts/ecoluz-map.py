"""Gera `components/site-templates/ecoluz/content/maranhao-map.ts`.

Uso:  python scripts/ecoluz-map.py

Baixa da API de malhas do IBGE o contorno do Maranhão (qualidade
intermediária) e os quatro municípios da Ilha do Maranhão (qualidade máxima),
projeta em equirretangular corrigida pelo cosseno da latitude média do estado,
simplifica por Ramer–Douglas–Peucker e grava o módulo TS com os caminhos SVG e
as duas funções de projeção (estado e ilha) — que PRECISAM sair do mesmo
cálculo do desenho, senão os pontos das cidades caem fora do lugar.

Só biblioteca padrão; nenhuma dependência nova no projeto.
"""
import gzip
import json
import math
import pathlib
import urllib.request

API = "https://servicodados.ibge.gov.br/api/v3/malhas"
STATE = 21  # Maranhão
ILHA = {  # códigos conferidos na API de localidades do IBGE
    "sao-luis": 2111300,
    "sao-jose-de-ribamar": 2111201,
    "paco-do-lumiar": 2107506,
    "raposa": 2109452,
}
OUT = pathlib.Path(__file__).resolve().parent.parent / "components/site-templates/ecoluz/content/maranhao-map.ts"


def fetch(path, quality):
    url = f"{API}/{path}?formato=application/vnd.geo+json&qualidade={quality}"
    # ⚠️ A API responde gzip mesmo sem pedir, e o `urllib` não descomprime
    # sozinho — sem isto o JSON chega como bytes binários.
    with urllib.request.urlopen(url) as r:
        raw = r.read()
    if raw[:2] == bytes((0x1F, 0x8B)):
        raw = gzip.decompress(raw)
    g = json.loads(raw)["features"][0]["geometry"]
    return [p[0] for p in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]])]


def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1
    length = math.hypot(dx, dy)
    dmax, i0 = 0.0, 0
    for i in range(1, len(pts) - 1):
        x, y = pts[i]
        d = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / length if length > 0 else math.hypot(x - x1, y - y1)
        if d > dmax:
            dmax, i0 = d, i
    if dmax > eps:
        return rdp(pts[: i0 + 1], eps)[:-1] + rdp(pts[i0:], eps)
    return [pts[0], pts[-1]]


def ring_path(pts, eps):
    # Anel fechado: primeiro ponto = último, e o RDP direto colapsaria em dois
    # pontos. Divide em duas metades.
    h = len(pts) // 2
    s = rdp(pts[: h + 1], eps)[:-1] + rdp(pts[h:], eps)
    if len(s) < 4:
        return None, 0
    return "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in s) + "Z", len(s)


def main():
    st = fetch(f"estados/{STATE}", "intermediaria")
    lons = [x for p in st for x, _ in p]
    lats = [y for p in st for _, y in p]
    lon0, lon1, lat0, lat1 = min(lons), max(lons), min(lats), max(lats)
    k = math.cos(math.radians((lat0 + lat1) / 2))
    width, pad = 560, 20
    sx = width / ((lon1 - lon0) * k)
    svh = round((lat1 - lat0) * sx + 2 * pad)

    def sp(lon, lat):
        return pad + (lon - lon0) * k * sx, pad + (lat1 - lat) * sx

    state_paths, sn = [], 0
    for r in st:
        p, n = ring_path([sp(x, y) for x, y in r], 0.8)
        if p:
            state_paths.append(p)
            sn += n

    mr = {s: fetch(f"municipios/{c}", "maxima") for s, c in ILHA.items()}
    al = [x for rs in mr.values() for r in rs for x, _ in r]
    at = [y for rs in mr.values() for r in rs for _, y in r]
    ilo0, ilo1, ila0, ila1 = min(al), max(al), min(at), max(at)
    iw, ip = 460, 16
    isx = iw / ((ilo1 - ilo0) * k)
    ivh = round((ila1 - ila0) * isx + 2 * ip)

    def ipr(lon, lat):
        return ip + (lon - ilo0) * k * isx, ip + (ila1 - lat) * isx

    ilha, inn = {}, 0
    for s, rs in mr.items():
        ps = []
        for r in rs:
            p, n = ring_path([ipr(x, y) for x, y in r], 0.6)
            if p:
                ps.append(p)
                inn += n
        ilha[s] = " ".join(ps)

    bx0, by0 = sp(ilo0, ila1)
    bx1, by1 = sp(ilo1, ila0)
    ilha_entries = "".join(f'  "{s}": "{p}",\n' for s, p in ilha.items())

    ts = f"""// A GEOMETRIA DO MAPA — gerada por `scripts/ecoluz-map.py`. NÃO EDITAR À MÃO.
//
// Fonte: malha territorial do IBGE (API v3 de malhas), a MESMA fonte oficial
// que a plataforma já usa para resolver município (prospecção, seletor de
// cidade). O estado vem em qualidade intermediária; os quatro municípios da
// Ilha do Maranhão, em qualidade máxima — é no recorte ampliado que o detalhe
// aparece.
//
// Projeção equirretangular com a longitude corrigida pelo cosseno da latitude
// média do estado (sem isso o Maranhão sai achatado na horizontal). Contornos
// simplificados por Ramer–Douglas–Peucker: {sn} pontos no estado, {inn} na ilha.
//
// ⚠️ REGERAR, E NÃO RETOCAR: um vértice mexido à mão desloca a fronteira sem
// que ninguém perceba — e o `project*` abaixo deixa de casar com o desenho, com
// os pontos das cidades caindo fora do lugar.

/** O estado inteiro, numa prancha de 600 de largura. */
export const STATE_VIEWBOX = "0 0 600 {svh}";
export const STATE_PATH = "{' '.join(state_paths)}";

/** Graus → coordenada da prancha do estado. */
export function projectState(lat: number, lon: number): {{ x: number; y: number }} {{
  return {{ x: {pad} + (lon - ({lon0})) * {k * sx:.6f}, y: {pad} + ({lat1} - lat) * {sx:.6f} }};
}}

/** Onde a ilha fica na prancha do estado — o retângulo que aponta para o recorte. */
export const ILHA_IN_STATE = {{ x: {bx0:.1f}, y: {by0:.1f}, w: {bx1 - bx0:.1f}, h: {by1 - by0:.1f} }};

/** A Ilha do Maranhão ampliada: os quatro municípios, cada um uma forma. */
export const ILHA_VIEWBOX = "0 0 {iw + 2 * ip} {ivh}";
export const ILHA_PATHS: Record<string, string> = {{
{ilha_entries}}};

/** Graus → coordenada da prancha da ilha. */
export function projectIlha(lat: number, lon: number): {{ x: number; y: number }} {{
  return {{ x: {ip} + (lon - ({ilo0})) * {k * isx:.6f}, y: {ip} + ({ila1} - lat) * {isx:.6f} }};
}}
"""
    OUT.write_text(ts, encoding="utf-8")
    print(f"ok: {sn} pontos no estado, {inn} na ilha -> {OUT}")


if __name__ == "__main__":
    main()
