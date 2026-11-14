# ambiente-fx — partículas de ambiente (visual premium E5)

Só clima de cena (§12 do `docs/prompts/PROMPT_MASTER_MEU_MUNDO_VISUAL_PREMIUM.md`). Golpe/poder = `engine/fx/fx-core.ts` (FxStage); vapor das chaminés do bairro = `steampunk/fx.ts`. Não duplicar.

- `atlas.ts` — atlas único 256×256 (4×4) desenhado no canvas; um por cena.
- `presets.ts` — um preset por região do céu (`SkyRegionId`): noctis, zephyra, maru, aeryn, kragor, iris, centro, bairro. Até 2 camadas; teto por perfil (`n.low/mid/high`), fração de dia e de noite.
- `ambient-fx.ts` — `AmbientFx`: 1 malha + 1 material = **1 chamada por cena**; posição no shader (CPU só manda tempo e câmera). Caixa anda com a câmera (adiantada para onde ela olha) = distância de ativação; degradê na borda e perto do olho.

Qualidade: o `tier` de `engine/quality.ts` escolhe a coluna `n.low/mid/high` de cada camada (já é o "mínimo / moderado / completo" do §19) e o total nunca passa de `QUALITY[tier].maxParticles` (teto de ambiente do E7). Troca ao vivo: `setTier(tier)` refaz só a malha. Dia/noite: `setNight(0..1)` ou `{ clock: true }` (relógio de Brasília, transição de ~8 s). Nada vai pela rede.

## Ligado

- 6 Domínios: `dominio/engine/open-domain-game.ts` (uma linha; noite = arte da cena).

## Gancho (bairro e centro — ainda não ligados)

No bairro (`engine/world.ts`) e no centro (`engine/center-world.ts`), depois de criar a cena e a câmera:

```ts
const ambient = createAmbientFx(scene, "bairro", quality.tier, { clock: true }) // centro: "centro"
// ...no setQuality(q) do mundo (Automático troca o perfil ao vivo):
ambient?.setTier(q.tier)
// ...no dispose do mundo:
ambient?.dispose()
```

Prova: `MEU MUNDO 3D/pipeline/dominio/harness-particulas` (`node shots.js`, `node solo.js`, `node swap.js`); resultados em `MEU MUNDO 3D/visual-premium/e5-particulas/`.
