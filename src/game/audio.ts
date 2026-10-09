import uncannySound from "@/assets/entity-audio/uncanny.mp3.asset.json";
import notSound from "@/assets/entity-audio/not.mp3.asset.json";
import unknownSound from "@/assets/entity-audio/unknown.mp3.asset.json";
import makaSound from "@/assets/entity-audio/maka.mp3.asset.json";
import thirstySound from "@/assets/entity-audio/thirsty.mp3.asset.json";
import mimicSound from "@/assets/entity-audio/mimic.mp3.asset.json";
import akamantoSound from "@/assets/entity-audio/akamanto.mp3.asset.json";
import blackroseSound from "@/assets/entity-audio/blackrose.mp3.asset.json";
import stalkerSound from "@/assets/entity-audio/stalker.mp3.asset.json";
import { game } from "./store";
import { startMusic } from "./music";

let ctx: AudioContext | null = null;
let musicGain: GainNode, sfxGain: GainNode, humGain: GainNode, chaseGain: GainNode;
let noiseBuf: AudioBuffer;
let started = false;

export function initAudio() {
  if (ctx) { ctx.resume(); return; }
  ctx = new AudioContext();
  musicGain = ctx.createGain(); sfxGain = ctx.createGain(); humGain = ctx.createGain(); chaseGain = ctx.createGain();
  musicGain.connect(ctx.destination); sfxGain.connect(ctx.destination); humGain.connect(sfxGain); chaseGain.connect(musicGain);
  chaseGain.gain.value = 0;
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  applyVolumes();
  game.subscribe(applyVolumes);
  startMusic(ctx);
}

function applyVolumes() {
  if (!ctx) return;
  const s = game.get();
  musicGain.gain.setTargetAtTime(s.musicVol * 0.5, ctx.currentTime, 0.1);
  sfxGain.gain.setTargetAtTime(s.sfxVol, ctx.currentTime, 0.1);
}

/** Fluorescent hum + low ambient drone music. */
export function startAmbience() {
  if (!ctx || started) return;
  started = true;
  // hum
  [60, 120, 180, 240].forEach((f, i) => {
    const o = ctx!.createOscillator(); o.type = i === 0 ? "sawtooth" : "sine"; o.frequency.value = f;
    const g = ctx!.createGain(); g.gain.value = 0.012 / (i + 1);
    o.connect(g).connect(humGain); o.start();
  });
  const n = ctx.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 3000; bp.Q.value = 2;
  const ng = ctx.createGain(); ng.gain.value = 0.006; n.connect(bp).connect(ng).connect(humGain); n.start();
  humGain.gain.value = 0.8;
  // drone pads
  const chord = [55, 82.4, 110, 130.8, 164.8];
  chord.forEach((f, i) => {
    const o = ctx!.createOscillator(); o.type = "triangle"; o.frequency.value = f; o.detune.value = (i - 2) * 6;
    const g = ctx!.createGain(); g.gain.value = 0;
    const lfo = ctx!.createOscillator(); lfo.frequency.value = 0.03 + i * 0.017;
    const lg = ctx!.createGain(); lg.gain.value = 0.035;
    lfo.connect(lg).connect(g.gain);
    const lp = ctx!.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 600;
    o.connect(lp).connect(g).connect(musicGain); o.start(); lfo.start();
  });

}

export function setHum(v: number) { if (ctx) humGain.gain.setTargetAtTime(v, ctx.currentTime, 0.05); }
export function setChase(_v: number) { if (ctx) chaseGain.gain.value = 0; }

function env(g: GainNode, a: number, peak: number, d: number) {
  const t = ctx!.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}
function noise(freq: number, q: number, peak: number, dur: number, type: BiquadFilterType = "bandpass", vol = 1) {
  if (!ctx) return;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = 0.5 + Math.random();
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); env(g, 0.005, peak * vol, dur);
  s.connect(f).connect(g).connect(sfxGain); s.start(); s.stop(ctx.currentTime + dur + 0.1);
}
function tone(freq: number, type: OscillatorType, peak: number, dur: number, slide = 0) {
  if (!ctx) return;
  const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), ctx.currentTime + dur);
  const g = ctx.createGain(); env(g, 0.005, peak, dur);
  o.connect(g).connect(sfxGain); o.start(); o.stop(ctx.currentTime + dur + 0.1);
}

export const sfx = {
  step: (run: boolean, vol = 1) => noise(run ? 500 : 380, 1.2, run ? 0.35 : 0.22, 0.09, "bandpass", vol),
  pickup: () => { tone(660, "square", 0.08, 0.06); setTimeout(() => tone(990, "square", 0.06, 0.08), 60); },
  drop: () => noise(200, 1, 0.4, 0.15, "lowpass"),
  click: () => tone(1200, "square", 0.05, 0.03),
  hover: () => tone(800, "sine", 0.03, 0.04),
  flash: () => { noise(4000, 3, 0.15, 0.03, "highpass"); },
  door: () => { tone(140, "sawtooth", 0.05, 0.6, 60); noise(800, 6, 0.08, 0.5); },
  flicker: () => { noise(6000, 1, 0.2, 0.05, "highpass"); tone(120, "square", 0.05, 0.08); },
  ding: () => { tone(880, "sine", 0.2, 0.6); setTimeout(() => tone(1320, "sine", 0.15, 0.8), 120); },
  cash: () => { tone(1500, "triangle", 0.12, 0.1); setTimeout(() => tone(2000, "triangle", 0.12, 0.25), 80); },
  hurt: () => { noise(300, 0.7, 0.6, 0.25, "lowpass"); tone(90, "sawtooth", 0.2, 0.3, -40); },
  swing: () => noise(1200, 0.8, 0.25, 0.18),
  hit: () => { noise(400, 1, 0.5, 0.12, "lowpass"); tone(70, "square", 0.25, 0.12); },
  shot: () => { noise(1500, 0.4, 0.9, 0.3, "lowpass"); tone(60, "square", 0.4, 0.2, -30); },
  reload: () => { tone(400, "square", 0.08, 0.04); setTimeout(() => tone(300, "square", 0.08, 0.05), 300); },
  heal: () => { [440, 554, 659, 880].forEach((f, i) => setTimeout(() => tone(f, "sine", 0.1, 0.4), i * 90)); },
  whisper: () => noise(2500, 4, 0.06, 1.2),
  minion: () => { tone(80 + Math.random() * 40, "sawtooth", 0.06, 0.5, -20); },
  stinger: () => { tone(55, "sawtooth", 0.3, 2.5, -20); noise(200, 0.5, 0.3, 2, "lowpass"); },
  scream: () => {
    if (!ctx) return;
    [380, 410, 455, 520, 610].forEach((f) => tone(f, "sawtooth", 0.25, 1.4, -200));
    noise(2000, 0.3, 1.2, 1.4, "bandpass");
  },
  drone: () => { tone(40, "sawtooth", 0.4, 3, 10); noise(100, 0.5, 0.5, 3, "lowpass"); },
  fall: () => { noise(800, 0.5, 0.5, 4, "bandpass"); tone(300, "sine", 0.1, 4, -260); },
  thud: () => { noise(120, 0.7, 1, 0.5, "lowpass"); tone(45, "sine", 0.6, 0.6); },
};

/** distance based entity drone for proximity */
const loops = new Map<string, { o: OscillatorNode; g: GainNode }>();
export function entityLoop(key: string, vol: number, pitch: number) {
  if (!ctx) return;
  let l = loops.get(key);
  if (!l) {
    const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = pitch;
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900;
    const g = ctx.createGain(); g.gain.value = 0;
    o.connect(f).connect(g).connect(sfxGain); o.start();
    l = { o, g }; loops.set(key, l);
  }
  l.g.gain.setTargetAtTime(vol * 0.12, ctx.currentTime, 0.1);
  l.o.frequency.setTargetAtTime(pitch, ctx.currentTime, 0.2);
}

const entitySounds: Record<string,string> = {uncanny:uncannySound.url,not:notSound.url,unknown:unknownSound.url,maka:makaSound.url,thirsty:thirstySound.url,blackrose:blackroseSound.url,mimic:mimicSound.url,akamanto:akamantoSound.url,stalker:stalkerSound.url};
const cues = new Map<string, HTMLAudioElement>();
export function stopEntityCue(id: string) { const audio = cues.get(id); if (audio) { audio.pause(); audio.currentTime = 0; cues.delete(id); } }
export function entityCue(id: string) { const url=entitySounds[id]; if(!url) { sfx.stinger(); return; } stopEntityCue(id); const audio=new Audio(url);audio.volume=game.get().sfxVol;audio.loop=id === "blackrose";cues.set(id,audio);audio.addEventListener("ended",()=> { if(cues.get(id)===audio)cues.delete(id); });audio.play().catch(()=>{}); }
