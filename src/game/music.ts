import { game } from "./store";
import menuA from "@/assets/music/menu.mp3.asset.json";
import labA from "@/assets/music/lab.mp3.asset.json";
import whereA from "@/assets/music/where.mp3.asset.json";
import followA from "@/assets/music/follow.mp3.asset.json";
import safeA from "@/assets/music/amisafe.mp3.asset.json";
import roomA from "@/assets/music/room.mp3.asset.json";
import hopeA from "@/assets/music/hope.mp3.asset.json";
import listeningA from "@/assets/music/listening.mp3.asset.json";
import okayA from "@/assets/music/okay.mp3.asset.json";

type Mode = "menu" | "lab" | "room" | "backrooms" | "none";
const BACKROOMS = [whereA.url, followA.url, safeA.url, hopeA.url, listeningA.url, okayA.url];

let ctx: AudioContext;
let el: HTMLAudioElement;
let gain: GainNode;
let filter: BiquadFilterNode;
let mode: Mode = "none";
let silenceTimer: ReturnType<typeof setTimeout> | null = null;
let lastBr = -1;

function currentMode(): Mode {
  const s = game.get();
  if (s.screen === "intro" || s.screen === "auth" || s.screen === "menu" || s.screen === "create") return "menu";
  if (s.screen !== "game" && s.screen !== "drop") return "none";
  if (s.inRoom) return "room";
  if (s.inLab) return "lab";
  return "backrooms";
}

/** volume factor + lowpass: "far away" for in-world music */
function profile(m: Mode) {
  if (m === "menu") return { vol: 0.8, cut: 20000 };
  return { vol: m === "backrooms" ? 0.35 : 0.4, cut: m === "backrooms" ? 900 : 1300 };
}

function applyVol() {
  if (!ctx) return;
  const p = profile(mode);
  gain.gain.setTargetAtTime(game.get().musicVol * p.vol, ctx.currentTime, 0.4);
  filter.frequency.setTargetAtTime(p.cut, ctx.currentTime, 0.4);
}

function play(url: string, loop: boolean) {
  el.loop = loop;
  if (!el.src.endsWith(url)) el.src = url;
  el.currentTime = 0;
  el.play().catch(() => {});
}

function stop() {
  el.pause();
  if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
}

/** Backrooms: random track, then a random silent gap (sometimes no music at all). */
function nextBackrooms() {
  if (mode !== "backrooms") return;
  if (Math.random() < 0.4) {
    silenceTimer = setTimeout(nextBackrooms, 40000 + Math.random() * 80000);
    return;
  }
  let i = Math.floor(Math.random() * BACKROOMS.length);
  if (i === lastBr) i = (i + 1) % BACKROOMS.length;
  lastBr = i;
  play(BACKROOMS[i], false);
}

function setMode(m: Mode) {
  if (m === mode) return;
  mode = m;
  stop();
  applyVol();
  if (m === "menu") play(menuA.url, true);
  else if (m === "lab") play(labA.url, true);
  else if (m === "room") play(roomA.url, true);
  else if (m === "backrooms") silenceTimer = setTimeout(nextBackrooms, 10000 + Math.random() * 30000);
}

export function startMusic(audioCtx: AudioContext) {
  if (ctx) return;
  ctx = audioCtx;
  el = new Audio();
  el.crossOrigin = "anonymous";
  el.preload = "auto";
  el.addEventListener("ended", () => {
    if (mode === "backrooms") silenceTimer = setTimeout(nextBackrooms, 30000 + Math.random() * 90000);
  });
  filter = ctx.createBiquadFilter(); filter.type = "lowpass";
  gain = ctx.createGain(); gain.gain.value = 0;
  ctx.createMediaElementSource(el).connect(filter).connect(gain).connect(ctx.destination);
  game.subscribe(() => { setMode(currentMode()); applyVol(); });
  setMode(currentMode());
}
