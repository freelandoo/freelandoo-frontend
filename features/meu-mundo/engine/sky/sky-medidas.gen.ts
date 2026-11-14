// GERADO por `MEU MUNDO 3D/pipeline/ceu/preparar.py` — não editar à mão (ajuste fino em sky-registry.ts).
// horizon = linha do horizonte na arte (0 = topo); top/bottom = cor lisa acima/abaixo da arte;
// below/above = média logo abaixo/acima do horizonte (base da névoa). Cores 0–1 (espaço da arte).
export const SKY_MEDIDAS = {
  bairro_dia: {"horizon": 0.84, "aspect": 0.3684, "top": [0.253, 0.529, 0.903], "bottom": [0.834, 0.876, 0.962], "below": [0.753, 0.846, 0.969], "above": [0.709, 0.827, 0.971]},
  bairro_noite: {"horizon": 0.84, "aspect": 0.3684, "top": [0.058, 0.13, 0.372], "bottom": [0.371, 0.483, 0.805], "below": [0.309, 0.412, 0.757], "above": [0.281, 0.379, 0.727]},
  centro_dia: {"horizon": 0.84, "aspect": 0.3684, "top": [0.164, 0.5, 0.938], "bottom": [0.693, 0.86, 0.991], "below": [0.685, 0.859, 0.991], "above": [0.687, 0.859, 0.991]},
  centro_noite: {"horizon": 0.84, "aspect": 0.3684, "top": [0.036, 0.128, 0.391], "bottom": [0.276, 0.401, 0.753], "below": [0.222, 0.372, 0.716], "above": [0.193, 0.352, 0.694]},
  noctis_dia: {"horizon": 0.84, "aspect": 0.3684, "top": [0.263, 0.212, 0.712], "bottom": [0.83, 0.583, 0.86], "below": [0.887, 0.626, 0.797], "above": [0.902, 0.634, 0.825]},
  noctis_noite: {"horizon": 0.84, "aspect": 0.3684, "top": [0.113, 0.066, 0.361], "bottom": [0.388, 0.298, 0.725], "below": [0.313, 0.246, 0.676], "above": [0.288, 0.226, 0.654]},
  zephyra_dia: {"horizon": 0.84, "aspect": 0.3684, "top": [0.329, 0.375, 0.798], "bottom": [0.637, 0.664, 0.949], "below": [0.598, 0.618, 0.926], "above": [0.592, 0.601, 0.917]},
  zephyra_noite: {"horizon": 0.84, "aspect": 0.3684, "top": [0.155, 0.16, 0.375], "bottom": [0.372, 0.354, 0.636], "below": [0.44, 0.363, 0.624], "above": [0.499, 0.378, 0.614]},
  maru_dia: {"horizon": 0.84, "aspect": 0.3684, "top": [0.325, 0.632, 0.913], "bottom": [0.74, 0.912, 0.99], "below": [0.668, 0.889, 0.986], "above": [0.65, 0.883, 0.987]},
  maru_noite: {"horizon": 0.84, "aspect": 0.3684, "top": [0.023, 0.119, 0.348], "bottom": [0.338, 0.607, 0.879], "below": [0.227, 0.497, 0.801], "above": [0.181, 0.446, 0.76]},
  aeryn_dia: {"horizon": 0.84, "aspect": 0.3684, "top": [0.344, 0.144, 0.083], "bottom": [0.613, 0.294, 0.149], "below": [0.618, 0.288, 0.138], "above": [0.613, 0.281, 0.131]},
  aeryn_noite: {"horizon": 0.84, "aspect": 0.3684, "top": [0.079, 0.055, 0.075], "bottom": [0.177, 0.091, 0.084], "below": [0.242, 0.111, 0.082], "above": [0.258, 0.115, 0.079]},
  kragor_dia: {"horizon": 0.84, "aspect": 0.3684, "top": [0.728, 0.446, 0.454], "bottom": [0.795, 0.284, 0.148], "below": [0.774, 0.277, 0.146], "above": [0.772, 0.274, 0.147]},
  kragor_noite: {"horizon": 0.84, "aspect": 0.3684, "top": [0.271, 0.078, 0.058], "bottom": [0.436, 0.147, 0.085], "below": [0.442, 0.146, 0.082], "above": [0.454, 0.148, 0.083]},
  iris_dia: {"horizon": 0.84, "aspect": 0.3684, "top": [0.221, 0.339, 0.894], "bottom": [0.812, 0.851, 0.99], "below": [0.681, 0.781, 0.99], "above": [0.64, 0.754, 0.99]},
  iris_noite: {"horizon": 0.84, "aspect": 0.3684, "top": [0.122, 0.11, 0.365], "bottom": [0.584, 0.607, 0.976], "below": [0.536, 0.578, 0.975], "above": [0.549, 0.558, 0.974]},
} as const
