// GERADO por `MEU MUNDO 3D/pipeline/ceu/preparar.py` — não editar à mão (ajuste fino em sky-registry.ts).
// horizon = linha do horizonte na arte (0 = topo); top/bottom = cor lisa acima/abaixo da arte;
// below/above = média logo abaixo/acima do horizonte (base da névoa). Cores 0–1 (espaço da arte).
export const SKY_MEDIDAS = {
  noctis_floresta_lunar: {"horizon": 0.615, "top": [0.068, 0.075, 0.329], "bottom": [0.099, 0.18, 0.455], "below": [0.252, 0.363, 0.741], "above": [0.392, 0.386, 0.851]},
  zephyra_canion_tempestades: {"horizon": 0.585, "top": [0.176, 0.244, 0.443], "bottom": [0.377, 0.215, 0.285], "below": [0.549, 0.346, 0.454], "above": [0.648, 0.491, 0.627]},
  maru_mar_gelo: {"horizon": 0.6, "top": [0.015, 0.158, 0.399], "bottom": [0.015, 0.381, 0.668], "below": [0.269, 0.643, 0.866], "above": [0.427, 0.695, 0.92]},
  aeryn_fabrica_bronze: {"horizon": 0.585, "top": [0.309, 0.201, 0.198], "bottom": [0.256, 0.183, 0.19], "below": [0.568, 0.319, 0.242], "above": [0.568, 0.305, 0.2]},
  kragor_vulcao: {"horizon": 0.615, "top": [0.369, 0.137, 0.14], "bottom": [0.314, 0.136, 0.146], "below": [0.549, 0.204, 0.187], "above": [0.646, 0.246, 0.173]},
  iris_cidade_orbital: {"horizon": 0.625, "top": [0.085, 0.096, 0.28], "bottom": [0.263, 0.365, 0.667], "below": [0.484, 0.507, 0.791], "above": [0.444, 0.493, 0.767]},
  centro_cidade: {"horizon": 0.668, "top": [0.153, 0.472, 0.883], "bottom": [0.266, 0.632, 0.96], "below": [0.252, 0.561, 0.842], "above": [0.555, 0.569, 0.582]},
  bairro: {"horizon": 0.676, "top": [0.206, 0.519, 0.874], "bottom": [0.368, 0.666, 0.941], "below": [0.369, 0.648, 0.897], "above": [0.559, 0.509, 0.404]},
} as const
