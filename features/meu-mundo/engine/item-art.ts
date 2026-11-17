// Arte 2:3 com o selo da classe dos itens que não são arma (proteção, acessório, material, runa,
// consumível, ficha, missão, visual, projeto). Gerada no ChatGPT pela descrição do item:
// MEU MUNDO 3D/arte/itens-thumb (fila.json). Só entra aqui id com arquivo (o resto segue no ícone). Arquivo: public/meu-mundo/itens/v1/<id>.webp (512×768).
// Só entra aqui id cujo arquivo existe (o resto da fila entra quando a arte ficar pronta).
const ITEM_ART = new Set<string>(["amuleto_aurion","botas_explorador","bracelete_isolante","capacitor","celula_energia","colete_couro","couraca_rebitada","couro_reforcado","engrenagem_precisao","fibra_resistente","fragmento_lamina","injetor_vapor","insignia_ringue","liga_leve","luvas_precisao","medalhao_lunar","medalhao_travessia","mola_precisao","nucleo_equilibrio","nucleo_eter","oculos_engenheiro","pigmento_eter","rebite","relogio_bolso","rolamento","runa_ataque_1","runa_ataque_2","selo_forja","sucata_bronze"])

export const itemArt = (id: string): string | null => (ITEM_ART.has(id) ? `/meu-mundo/itens/v1/${id}.webp` : null)
