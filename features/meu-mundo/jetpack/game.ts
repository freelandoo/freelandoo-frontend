// Jetpack do Meu Mundo (mm3d-20) — o jogo "Astronaut Jetpack" da TENKA
// (innovation-week/frontend/src/game/main.ts) dentro do centro da cidade.
//
// Mudanças em relação ao original: vive num overlay que abre e fecha (estados
// em root[data-state], tudo com dispose); o jogador é o avatar do Meu Mundo
// (render/avatar.ts); sem marca de terceiros (o pote do patrocinador virou o
// turbo); recorde só no aparelho (o ranking era do evento); "Voltar" devolve
// ao centro; textos traduzidos chegam prontos de quem monta (i18n).
//
// Estados: loading -> menu -> ready -> playing (-> paused -> countdown ->
// playing) -> over -> ready ... ; error se o 3D ou o avatar não carregarem.
// A simulação (sim/) roda em passos fixos de 1/120 s; o desenho interpola
// entre os dois últimos passos.

import * as THREE from 'three';
import { World, type GameEvent } from './sim/world';
import { randomSeed } from './sim/rng';
import { TUNING } from './sim/tuning';
import { Stage } from './render/stage';
import { Environment } from './render/environment';
import { ObstacleRenderer, PickupRenderer } from './render/obstacles';
import { AvatarView } from './render/avatar';
import { Particles, glowTexture } from './render/particles';
import { Input } from './input';
import { GameAudio } from './audio';
import { hasWebGL2, jetpackPerf } from './perf';
import type { BodyId } from '../types';

type PageState = 'loading' | 'menu' | 'ready' | 'playing' | 'paused' | 'countdown' | 'over' | 'error';

/** Textos dinâmicos (já traduzidos). `{n}`/`{k}` são trocados aqui. */
export interface JetpackTexts {
  turbo: string;
  fuelAdded: string;
  fuelEmpty: string;
  phase: string;
  menuBest: string;
  menuHint: string;
  hudBest: string;
  overFuel: string;
  savedLocal: string;
  noWebgl: string;
  loadFailed: string;
  soundOn: string;
  soundOff: string;
}

export interface JetpackOptions {
  root: HTMLElement;
  body: BodyId;
  texts: JetpackTexts;
  onExit: () => void;
}

export interface JetpackHandle {
  dispose: () => void;
}

const BEST_KEY = 'mm:jetpack:best';
const PLAYS_KEY = 'mm:jetpack:plays';

function readNum(key: string) {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}
function writeNum(key: string, n: number) {
  try {
    localStorage.setItem(key, String(n));
  } catch {
    /* storage indisponível */
  }
}

export function createJetpackGame(opts: JetpackOptions): JetpackHandle {
  const { root, texts } = opts;
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => root.querySelector(`#${id}`) as T;
  const fill = (s: string, n: number | string, k?: number | string) => s.replace('{n}', String(n)).replace('{k}', String(k ?? ''));
  const frame = $('jg-frame');
  const surface = $('jg-surface');
  const canvas = $<HTMLCanvasElement>('jg-canvas');
  const ui = {
    dist: $('jg-dist'),
    best: $('jg-best'),
    fuelBar: $('jg-fuel-bar'),
    fuelPct: $('jg-fuel-pct'),
    fuel: $('jg-fuel'),
    powerBar: $('jg-power-bar'),
    hint: $('jg-hint'),
    toast: $('jg-toast'),
    progress: $('jg-progress'),
    menuBest: $('jg-menu-best'),
    overDist: $('jg-over-dist'),
    overBest: $('jg-over-best'),
    overFuel: $('jg-over-fuel'),
    overRecord: $('jg-over-record'),
    overNet: $('jg-over-net'),
    count: $('jg-count'),
    errorMsg: $('jg-error-msg'),
  };
  let state: PageState = 'loading';
  let disposed = false;
  const setState = (s: PageState) => {
    state = s;
    root.dataset.state = s;
  };

  if (!hasWebGL2()) {
    ui.errorMsg.textContent = texts.noWebgl;
    root.dataset.noRetry = '1';
    setState('error');
    return { dispose() {} };
  }

  const perf = jetpackPerf();
  const audio = new GameAudio();
  const input = new Input(surface);
  const stage = new Stage(canvas, frame, perf);
  const glow = glowTexture();
  const env = new Environment(stage, perf.tier === 'high' ? 'high' : 'medium');
  const fire = new Particles(stage.scene, perf.tier === 'high' ? 420 : 240, glow, true);
  const smoke = new Particles(stage.scene, perf.tier === 'high' ? 200 : 110, glow, false);
  const obstacles = new ObstacleRenderer(stage.scene);
  const pickups = new PickupRenderer(stage.scene, glow, fire);
  const player = new AvatarView(stage.scene, fire, smoke, glow);
  const world = new World(randomSeed());

  function onResize() {
    stage.resize();
    env.setPixelRatio(stage.renderer.getPixelRatio());
    const h = stage.renderer.domElement.height;
    fire.setViewport(h, stage.camera.fov);
    smoke.setViewport(h, stage.camera.fov);
    const band = stage.floorBand();
    frame.style.setProperty('--jg-floor-top', `${band.top}px`);
    frame.style.setProperty('--jg-floor-h', `${Math.max(0, band.bottom - band.top)}px`);
  }
  const ro = new ResizeObserver(onResize);
  ro.observe(frame);
  onResize();

  // ---------------------------------------------------------------- partida

  let acc = 0;
  let prevX = 0;
  let prevY = TUNING.startY;
  let deathY = 0;
  let deathVy = 0;
  let deathAt = 0;
  let shownDist = -1;
  let shownFuel = -1;
  let countdownEnd = 0;
  let overTimer = 0;
  let hintTimer = 0;

  function prepareRun() {
    clearTimeout(overTimer);
    world.reset(randomSeed());
    obstacles.reset();
    pickups.reset();
    fire.clear();
    smoke.clear();
    acc = 0;
    prevX = world.x;
    prevY = world.y;
    shownDist = shownFuel = -1;
    ui.fuel.classList.remove('low');
    delete root.dataset.power;
    player.setPower(0);
    player.play('idle', 0.3);
    player.setTimeScale(1);
    ui.hint.hidden = readNum(PLAYS_KEY) >= 3;
    updateHud();
    setState('ready');
  }

  function handle(e: GameEvent) {
    switch (e.type) {
      case 'start':
        writeNum(PLAYS_KEY, readNum(PLAYS_KEY) + 1);
        player.play('fly', 0.2);
        setState('playing');
        clearTimeout(hintTimer);
        hintTimer = window.setTimeout(() => (ui.hint.hidden = true), 2500);
        break;
      case 'thrust_on':
        audio.setJet(true);
        break;
      case 'thrust_off':
        audio.setJet(false);
        if (world.alive) audio.play('off');
        player.puff();
        break;
      case 'pickup':
        if (e.kind === 'vulcan') {
          audio.play('vulcan');
          burst(e.x, e.y, [1, 0.12, 0.04], 70);
          stage.addShake(0.35);
          toast(texts.turbo, 'power');
        } else {
          audio.play(e.kind === 'big' ? 'pickup_big' : 'pickup');
          burst(e.x, e.y, e.kind === 'big' ? [1, 0.8, 0.35] : [0.3, 0.95, 1], e.kind === 'big' ? 40 : 24);
          toast(fill(texts.fuelAdded, Math.round(e.added)), 'fuel');
        }
        ui.fuel.classList.remove('pulse');
        void ui.fuel.offsetWidth;
        ui.fuel.classList.add('pulse');
        break;
      case 'fuel_low':
        audio.play('low');
        break;
      case 'fuel_empty':
        toast(texts.fuelEmpty, 'warn');
        break;
      case 'power_on':
        root.dataset.power = '1';
        break;
      case 'power_off':
        delete root.dataset.power;
        if (world.alive) audio.play('power_off');
        break;
      case 'smash':
        audio.play('smash');
        stage.addShake(0.55);
        debris(e.x, e.y);
        if ('vibrate' in navigator) navigator.vibrate?.(40);
        break;
      case 'pass':
        audio.play('pass');
        break;
      case 'phase':
        toast(fill(texts.phase, e.phase), 'phase');
        break;
      case 'dead':
        die();
        break;
    }
  }

  function die() {
    audio.setJet(false);
    audio.play('crash');
    stage.addShake(1);
    frame.classList.remove('hit');
    void frame.offsetWidth;
    frame.classList.add('hit');
    player.play('impact', 0.08);
    deathY = world.y;
    deathVy = Math.max(world.vy, 2);
    deathAt = performance.now();
    const p = player.packWorld(new THREE.Vector3());
    burst(p.x, p.y, [1, 0.45, 0.1], 46);
    if ('vibrate' in navigator) navigator.vibrate?.(120);
    overTimer = window.setTimeout(gameOver, 1150);
  }

  function burst(x: number, y: number, c: [number, number, number], n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1.5 + Math.random() * 4;
      fire.emit({
        x, y, z: 0.2,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: (Math.random() - 0.5) * 2,
        life: 0.35 + Math.random() * 0.35, size: 0.12 + Math.random() * 0.12,
        c0: [1, 1, 1], c1: c, drag: 3.5, gy: -4,
      });
    }
  }

  /** Pilastra quebrada: estilhaços de metal caindo + faíscas vermelhas. */
  function debris(x: number, y: number) {
    for (let i = 0; i < 26; i++) {
      const a = (Math.random() - 0.5) * Math.PI * 1.4;
      const s = 3 + Math.random() * 5;
      smoke.emit({
        x, y: y + (Math.random() - 0.5) * 0.6, z: (Math.random() - 0.5) * 0.8,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s + 1.5, vz: (Math.random() - 0.5) * 3,
        life: 0.6 + Math.random() * 0.5, size: 0.1 + Math.random() * 0.14,
        c0: [0.62, 0.64, 0.68], c1: [0.2, 0.2, 0.22], drag: 0.8, gy: -14,
      });
    }
    burst(x, y, [1, 0.15, 0.05], 36);
  }

  let toastTimer = 0;
  function toast(text: string, kind: 'fuel' | 'warn' | 'phase' | 'power') {
    ui.toast.textContent = text;
    ui.toast.dataset.kind = kind;
    ui.toast.classList.remove('show');
    void ui.toast.offsetWidth;
    ui.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => ui.toast.classList.remove('show'), 1300);
  }

  const pad = (n: number) => String(Math.floor(n)).padStart(6, '0');

  function updateHud() {
    const d = Math.floor(world.distance);
    if (d !== shownDist) {
      shownDist = d;
      ui.dist.textContent = pad(d);
    }
    if (world.powered) ui.powerBar.style.transform = `scaleX(${world.powerLeft / TUNING.powerTime})`;
    const f = Math.ceil(world.fuel.ratio * 100);
    if (f !== shownFuel) {
      shownFuel = f;
      ui.fuelBar.style.transform = `scaleX(${world.fuel.ratio})`;
      ui.fuelPct.textContent = `${f}%`;
      ui.fuel.classList.toggle('low', world.fuel.isLow);
      ui.fuel.classList.toggle('empty', world.fuel.empty);
    }
  }

  function showBest() {
    const b = readNum(BEST_KEY);
    ui.best.textContent = b ? fill(texts.hudBest, pad(b)) : '';
    ui.menuBest.textContent = b ? fill(texts.menuBest, b) : texts.menuHint;
  }

  function gameOver() {
    const distance = Math.floor(world.distance);
    const record = distance > readNum(BEST_KEY);
    if (record) writeNum(BEST_KEY, distance);
    if (record && distance > 0) audio.play('record');
    ui.overDist.textContent = `${distance} m`;
    ui.overBest.textContent = `${readNum(BEST_KEY)} m`;
    ui.overFuel.textContent = fill(texts.overFuel, Math.round(world.fuelCollected), world.pickupsTaken);
    ui.overRecord.hidden = !(record && distance > 0);
    ui.overNet.textContent = texts.savedLocal;
    showBest();
    setState('over');
  }

  function pause() {
    if ((state !== 'playing' && state !== 'countdown') || !world.alive) return;
    input.releaseAll();
    audio.setJet(false);
    audio.suspend(true);
    setState('paused');
  }

  function resume() {
    audio.unlock();
    audio.suspend(false);
    countdownEnd = performance.now() + 1500;
    setState('countdown');
  }

  // ---------------------------------------------------------------- controles

  input.onPress = () => audio.unlock();
  input.onPause = () => (state === 'paused' ? resume() : state === 'menu' || state === 'over' ? opts.onExit() : pause());
  input.onConfirm = () => {
    if (state === 'menu' || (state === 'over' && performance.now() - deathAt > 1600)) {
      audio.unlock();
      prepareRun();
    } else if (state === 'paused') resume();
  };

  const offs: (() => void)[] = [];
  const on = (el: EventTarget, ev: string, fn: EventListener) => {
    el.addEventListener(ev, fn);
    offs.push(() => el.removeEventListener(ev, fn));
  };
  const click = (id: string, fn: () => void) =>
    on($(id), 'click', () => {
      audio.unlock();
      audio.play('ui');
      fn();
    });
  click('jg-play', prepareRun);
  click('jg-again', prepareRun);
  click('jg-resume', resume);
  click('jg-restart', () => {
    audio.suspend(false);
    prepareRun();
  });
  click('jg-pause', () => (state === 'paused' ? resume() : pause()));
  click('jg-quit', opts.onExit);
  click('jg-back', opts.onExit);
  click('jg-menu-back', opts.onExit);
  click('jg-error-back', opts.onExit);
  click('jg-retry', () => {
    void start();
  });
  for (const b of root.querySelectorAll<HTMLButtonElement>('[data-sound]')) {
    on(b, 'click', () => {
      audio.unlock();
      audio.setEnabled(!audio.enabled);
      syncSound();
    });
  }
  function syncSound() {
    for (const b of root.querySelectorAll<HTMLButtonElement>('[data-sound]')) {
      b.setAttribute('aria-pressed', String(!audio.enabled));
      b.title = audio.enabled ? texts.soundOff : texts.soundOn;
    }
    root.dataset.sound = audio.enabled ? 'on' : 'off';
  }
  syncSound();
  on(document, 'visibilitychange', () => {
    if (document.hidden) pause();
  });

  // ---------------------------------------------------------------- laço

  let last = performance.now();
  let raf = 0;

  function frameLoop(now: number) {
    if (disposed) return;
    raf = requestAnimationFrame(frameLoop);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const time = now / 1000;
    input.pollGamepad();

    if (state === 'countdown') {
      const left = Math.ceil((countdownEnd - now) / 500);
      ui.count.textContent = String(Math.max(1, left));
      if (now >= countdownEnd) {
        acc = 0;
        setState('playing');
      }
    }

    if (state === 'ready' || state === 'playing') {
      acc += dt;
      let n = 0;
      while (acc >= TUNING.step && n < 24) {
        prevX = world.x;
        prevY = world.y;
        world.step(input.held);
        acc -= TUNING.step;
        n++;
        for (const e of world.drain()) handle(e);
        if (state !== 'playing' && state !== 'ready') break;
        if (world.state === 'ready') {
          acc = 0;
          break;
        }
      }
      if (n === 24) acc = 0; // aparelho travou: não tenta recuperar o atraso
    }

    // Posição desenhada (interpolada entre passos).
    const alpha = state === 'playing' ? acc / TUNING.step : 1;
    const x = prevX + (world.x - prevX) * alpha;
    let y = prevY + (world.y - prevY) * alpha;
    if (!world.alive) {
      // Depois da batida: cai até o chão.
      deathVy -= TUNING.gravity * dt;
      deathY = Math.max(TUNING.floor + 0.25, deathY + deathVy * dt);
      y = deathY;
    }
    player.root.position.set(x, y, 0);
    const mode = state === 'ready' || state === 'menu' || state === 'loading' ? 'ready' : !world.alive ? 'dead' : world.fuel.empty ? 'empty' : 'play';
    player.setTimeScale(mode === 'empty' ? 0.45 : 1);
    const frozen = state === 'paused' || state === 'countdown';
    player.setPower(world.alive ? world.powerLeft : 0);
    player.update(frozen ? 0 : dt, time, world.thrusting && !frozen, world.vy, mode);
    if (!frozen) {
      fire.update(dt);
      smoke.update(dt);
    }
    obstacles.update(world.obstacles, world.t, time);
    pickups.update(world.pickups, time, frozen ? 0 : dt);
    env.update(stage.camera.position.x, time);
    stage.render(x, dt, time);
    updateHud();
  }

  // ---------------------------------------------------------------- início

  // Conferência (harness): estado e simulação, como o ?debug do original.
  (window as unknown as { __mmJetpack?: unknown }).__mmJetpack = {
    world,
    input,
    player,
    get state() {
      return state;
    },
    calls: () => stage.renderer.info.render.calls,
  };

  let loaded = false;
  async function start() {
    setState('loading');
    try {
      if (!loaded) {
        await player.load(opts.body, (r) => (ui.progress.style.transform = `scaleX(${r})`));
        loaded = true;
      }
      if (disposed) return;
      // Primeiro desenho fora da tela: compila os shaders antes do menu aparecer.
      stage.renderer.compile(stage.scene, stage.camera);
      setState('menu');
    } catch (err) {
      if (disposed) return;
      console.error('[jetpack]', err);
      ui.errorMsg.textContent = texts.loadFailed;
      setState('error');
    }
  }

  showBest();
  void start();
  raf = requestAnimationFrame(frameLoop);

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      clearTimeout(overTimer);
      clearTimeout(toastTimer);
      clearTimeout(hintTimer);
      for (const off of offs) off();
      ro.disconnect();
      input.dispose();
      audio.dispose();
      stage.dispose();
      delete (window as unknown as { __mmJetpack?: unknown }).__mmJetpack;
    },
  };
}
