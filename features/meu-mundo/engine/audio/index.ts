// features/meu-mundo/engine/audio — o som do Meu Mundo (áudio S1, 2026-11-11). Ver mixer.ts, bank.ts, cues.ts.
export { audioBus, audioContext, audioPrefs, audioState, onAudioPrefs, setAudioPrefs, unlockAudio, BUSES } from "./mixer"
export type { AudioPrefs, Bus } from "./mixer"
export { bankState, hasSample, loadSample, playAny, playSample, preloadSamples } from "./bank"
export type { PlayOpts, Voice } from "./bank"
export * from "./cues"
export { uiSound } from "./ui-sound"
export { createFootsteps, interiorFloor } from "./footsteps"
export type { Footsteps } from "./footsteps"
