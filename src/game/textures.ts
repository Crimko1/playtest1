import * as THREE from "three";
import { parseGIF, decompressFrames, type ParsedFrame } from "gifuct-js";

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map<string, THREE.Texture>();

function make(key: string, size: number, draw: (g: CanvasRenderingContext2D, s: number, r: () => number) => void, rep = 1) {
  const k = key + rep;
  const c0 = cache.get(k);
  if (c0) return c0;
  const c = document.createElement("canvas"); c.width = c.height = size;
  const g = c.getContext("2d")!;
  draw(g, size, rng(key.split("").reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7)));
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  cache.set(k, t);
  return t;
}

function grime(g: CanvasRenderingContext2D, s: number, r: () => number, n = 60, a = 0.08) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(40,30,10,${r() * a})`;
    const w = r() * s * 0.3;
    g.fillRect(r() * s, r() * s, w, w * (0.3 + r()));
  }
  const id = g.getImageData(0, 0, s, s);
  for (let i = 0; i < id.data.length; i += 4) {
    const n2 = (r() - 0.5) * 18;
    id.data[i] += n2; id.data[i + 1] += n2; id.data[i + 2] += n2;
  }
  g.putImageData(id, 0, 0);
}

export const WALLPAPERS = ["classic", "stripes", "diamond", "damask", "plain", "red", "green", "tile", "concrete", "panel", "brick", "hedge", "school", "metal", "wood", "rock"] as const;
export type Wallpaper = (typeof WALLPAPERS)[number];

export function wallTex(kind: Wallpaper) {
  return make("wall-" + kind, 64, (g, s, r) => {
    const base: Record<Wallpaper, string> = {
      classic: "#c8b25e", stripes: "#c4ad55", diamond: "#bfa860", damask: "#b9a24f", plain: "#cfc18a",
      red: "#7a2f26", green: "#5f6b45", tile: "#d9d6c6", concrete: "#8a8679", panel: "#8a6a42",
      brick: "#7d4632", hedge: "#2f4a24", school: "#9db0a0", metal: "#5d625e", wood: "#6a4a2a", rock: "#5e5a50",
    };
    g.fillStyle = base[kind]; g.fillRect(0, 0, s, s);
    g.strokeStyle = "rgba(90,70,20,0.35)"; g.fillStyle = "rgba(90,70,20,0.25)";
    if (kind === "classic" || kind === "red" || kind === "green") {
      for (let y = 0; y < s; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < s; x += 8) {
        g.beginPath(); g.moveTo(x, y + 2); g.lineTo(x + 2, y); g.lineTo(x + 4, y + 2); g.lineTo(x + 2, y + 4); g.fill();
      }
      for (let x = 0; x < s; x += 16) g.fillRect(x, 0, 1, s);
    } else if (kind === "stripes") {
      for (let x = 0; x < s; x += 8) { g.fillRect(x, 0, 3, s); }
    } else if (kind === "diamond") {
      for (let y = 0; y < s; y += 16) for (let x = 0; x < s; x += 16) g.strokeRect(x + 4, y + 4, 8, 8);
    } else if (kind === "damask") {
      for (let y = 0; y < s; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < s; x += 16) {
        g.beginPath(); g.ellipse(x + 4, y + 8, 3, 6, 0, 0, Math.PI * 2); g.fill();
      }
    } else if (kind === "tile") {
      g.strokeStyle = "rgba(60,60,50,0.5)";
      for (let i = 0; i <= s; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, s); g.moveTo(0, i); g.lineTo(s, i); g.stroke(); }
    } else if (kind === "brick") {
      g.fillStyle = "rgba(40,20,10,0.55)";
      for (let y = 0; y < s; y += 8) { g.fillRect(0, y, s, 1); for (let x = (y / 8) % 2 ? 8 : 0; x < s; x += 16) g.fillRect(x, y, 1, 8); }
    } else if (kind === "hedge") {
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "20,40,12" : "90,130,50"},${0.3 + r() * 0.4})`; g.fillRect(r() * s, r() * s, 2, 2); }
    } else if (kind === "school") {
      g.fillStyle = "#c8c2a8"; g.fillRect(0, s * 0.62, s, s * 0.38); g.fillStyle = "rgba(40,60,50,0.6)"; g.fillRect(0, s * 0.6, s, 2);
    } else if (kind === "metal") {
      g.fillStyle = "rgba(20,20,20,0.4)"; for (let x = 0; x < s; x += 16) g.fillRect(x, 0, 1, s); for (let i = 0; i < 16; i++) g.fillRect(r() * s, r() * s, 2, 2);
    } else if (kind === "wood") {
      for (let x = 0; x < s; x += 8) { g.fillStyle = `rgba(30,15,5,${0.2 + r() * 0.25})`; g.fillRect(x, 0, 1, s); }
    } else if (kind === "rock") {
      for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "30,28,24" : "130,125,110"},${0.2 + r() * 0.3})`; g.beginPath(); g.ellipse(r() * s, r() * s, 3 + r() * 9, 2 + r() * 6, r() * 3, 0, 7); g.fill(); }
    } else if (kind === "panel") {
      for (let x = 0; x < s; x += 16) { g.fillStyle = "rgba(40,20,5,0.4)"; g.fillRect(x, 0, 1, s); g.fillStyle = "rgba(255,220,160,0.08)"; g.fillRect(x + 1, 0, 1, s); }
    }
    // baseboard band at bottom handled by geometry; water damage streaks
    for (let i = 0; i < 4; i++) {
      const x = r() * s; const gr = g.createLinearGradient(0, 0, 0, s);
      gr.addColorStop(0, "rgba(80,60,20,0.25)"); gr.addColorStop(1, "rgba(80,60,20,0)");
      g.fillStyle = gr; g.fillRect(x, 0, 2 + r() * 4, s * r());
    }
    grime(g, s, r, 30, 0.08);
  });
}

export const FLOORS = ["carpet", "carpet2", "concrete", "tile", "wood", "poolTile", "linoleum", "grass", "dirt", "sand", "metal", "checker"] as const;
export type Floor = (typeof FLOORS)[number];
export function floorTex(kind: Floor) {
  return make("floor-" + kind, 64, (g, s, r) => {
    const base: Record<Floor, string> = {
      carpet: "#9c8a4c", carpet2: "#7f7346", concrete: "#7b776c", tile: "#bdb8a6", wood: "#6b4a2c", poolTile: "#9fc0bf", linoleum: "#a59c86",
      grass: "#3d5a26", dirt: "#5a4630", sand: "#b8a476", metal: "#585c58", checker: "#d8d2c0",
    };
    g.fillStyle = base[kind]; g.fillRect(0, 0, s, s);
    if (kind.startsWith("carpet")) {
      for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "60,45,10" : "200,180,110"},${r() * 0.25})`; g.fillRect(r() * s, r() * s, 1, 1); }
      for (let i = 0; i < 5; i++) { g.fillStyle = `rgba(50,35,10,${0.1 + r() * 0.15})`; g.beginPath(); g.ellipse(r() * s, r() * s, 4 + r() * 10, 3 + r() * 8, r() * 3, 0, 7); g.fill(); }
    } else if (kind === "tile" || kind === "poolTile" || kind === "linoleum") {
      const step = kind === "poolTile" ? 8 : 16;
      g.strokeStyle = kind === "poolTile" ? "rgba(40,80,80,0.6)" : "rgba(50,50,40,0.5)";
      for (let i = 0; i <= s; i += step) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, s); g.moveTo(0, i); g.lineTo(s, i); g.stroke(); }
      if (kind === "linoleum") for (let y = 0; y < s; y += 16) for (let x = 0; x < s; x += 16) if (((x + y) / 16) % 2) { g.fillStyle = "rgba(60,50,30,0.2)"; g.fillRect(x, y, 16, 16); }
    } else if (kind === "grass" || kind === "dirt" || kind === "sand") {
      for (let i = 0; i < 1600; i++) { g.fillStyle = kind === "grass" ? `rgba(${r() > 0.5 ? "20,40,10" : "110,150,60"},${r() * 0.5})` : `rgba(${r() > 0.5 ? "40,30,15" : "200,180,130"},${r() * 0.35})`; g.fillRect(r() * s, r() * s, 1, kind === "grass" ? 2 : 1); }
    } else if (kind === "metal") {
      g.strokeStyle = "rgba(20,20,20,0.5)"; for (let i = 0; i <= s; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(0, i); g.stroke(); }
    } else if (kind === "checker") {
      for (let y = 0; y < s; y += 16) for (let x = 0; x < s; x += 16) if (((x + y) / 16) % 2) { g.fillStyle = "#26231d"; g.fillRect(x, y, 16, 16); }
    } else if (kind === "wood") {
      for (let y = 0; y < s; y += 8) { g.fillStyle = `rgba(30,15,5,${0.2 + r() * 0.2})`; g.fillRect(0, y, s, 1); g.fillRect(((y * 7) % s), y, 1, 8); }
    }
    grime(g, s, r, 40, 0.1);
  });
}

export function ceilingTex(kind = "tile") {
  return make("ceil-" + kind, 64, (g, s, r) => {
    g.fillStyle = kind === "dark" ? "#6d675a" : "#c9c2a4"; g.fillRect(0, 0, s, s);
    g.strokeStyle = "rgba(70,60,40,0.6)"; g.lineWidth = 2;
    g.strokeRect(0, 0, s, s); g.strokeRect(0, 0, s / 2, s);
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(60,50,30,${r() * 0.3})`; g.fillRect(r() * s, r() * s, 1, 1); }
    if (r() > 0.3) { g.fillStyle = "rgba(110,80,30,0.25)"; g.beginPath(); g.ellipse(s * r(), s * r(), 10, 7, 0, 0, 7); g.fill(); }
  });
}

export function woodTex() {
  return make("wood", 32, (g, s, r) => {
    g.fillStyle = "#5c3d22"; g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y++) { g.fillStyle = `rgba(20,10,0,${r() * 0.25})`; g.fillRect(0, y, s, 1); }
    grime(g, s, r, 10, 0.1);
  });
}
export function metalTex(color = "#6f7470") {
  return make("metal" + color, 32, (g, s, r) => {
    g.fillStyle = color; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 20; i++) { g.fillStyle = `rgba(90,50,20,${r() * 0.3})`; g.fillRect(r() * s, r() * s, r() * 6, r() * 6); }
    grime(g, s, r, 10, 0.1);
  });
}
export function fabricTex(color: string) {
  return make("fab" + color, 32, (g, s, r) => {
    g.fillStyle = color; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.15})`; g.fillRect(r() * s, r() * s, 1, 1); }
    for (let i = 0; i < 3; i++) { g.fillStyle = `rgba(60,40,10,${r() * 0.2})`; g.beginPath(); g.arc(r() * s, r() * s, r() * 6, 0, 7); g.fill(); }
  });
}
export function labTex() {
  return make("lab", 64, (g, s, r) => {
    g.fillStyle = "#c9cbc4"; g.fillRect(0, 0, s, s);
    g.strokeStyle = "rgba(60,70,70,0.5)";
    for (let i = 0; i <= s; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, s); g.moveTo(0, i); g.lineTo(s, i); g.stroke(); }
    grime(g, s, r, 20, 0.06);
  });
}
export function screenTex(lines: string[], color = "#e8c547", bg = "#0b0c08") {
  const c = document.createElement("canvas"); c.width = 512; c.height = 256;
  const g = c.getContext("2d");
  if (g) {
    g.fillStyle = bg; g.fillRect(0, 0, 512, 256);
    g.fillStyle = color; g.textAlign = "center"; g.textBaseline = "middle";
    lines.forEach((line, i) => {
      let size = Math.min(40, 180 / Math.max(1, lines.length));
      g.font = `bold ${size}px monospace`;
      while (g.measureText(line).width > 464 && size > 12) { size -= 2; g.font = `bold ${size}px monospace`; }
      g.fillText(line, 256, 128 + (i - (lines.length - 1) / 2) * 60);
    });
    for (let y = 0; y < 256; y += 4) { g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(0, y, 512, 1); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const imgCache = new Map<string, THREE.Texture>();
const animated = new Map<string, { texture: THREE.CanvasTexture; frames: ParsedFrame[]; ctx: CanvasRenderingContext2D; out: CanvasRenderingContext2D; patch: HTMLCanvasElement; index: number; next: number; previous?: ImageData }>();
export function updateAnimatedTextures(now: number) {
  for (const animation of animated.values()) {
    if (now < animation.next) continue;
    const { ctx, frames, patch } = animation;
    const previous = frames[animation.index];
    if (previous?.disposalType === 2) ctx.clearRect(previous.dims.left, previous.dims.top, previous.dims.width, previous.dims.height);
    if (previous?.disposalType === 3 && animation.previous) ctx.putImageData(animation.previous, 0, 0);
    animation.index = (animation.index + 1) % frames.length;
    if (animation.index === 0) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const frame = frames[animation.index];
    if (!frame) continue;
    if (frame.disposalType === 3) animation.previous = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    patch.width = frame.dims.width; patch.height = frame.dims.height;
    const p = patch.getContext("2d"); if (!p) continue;
    const pixels = p.createImageData(patch.width, patch.height); pixels.data.set(frame.patch);
    p.putImageData(pixels, 0, 0); ctx.drawImage(patch, frame.dims.left, frame.dims.top);
    // GPU texture size is fixed at first upload, so composite into the fixed-size output canvas.
    animation.out.clearRect(0, 0, 256, 256); animation.out.drawImage(ctx.canvas, 0, 0, 256, 256);
    animation.texture.needsUpdate = true;
    animation.next = now + Math.max(20, frame.delay || 100);
  }
}
export function imageTex(url: string) {
  let t = imgCache.get(url);
  if (!t) {
    if (/^data:image\/gif[;,]|\.gif(?:$|\?)/i.test(url)) {
      const canvas = document.createElement("canvas"); canvas.width = canvas.height = 256;
      const out = canvas.getContext("2d")!;
      const texture = new THREE.CanvasTexture(canvas); t = texture;
      fetch(url).then(r => r.arrayBuffer()).then(buffer => {
        const gif = parseGIF(buffer); const frames = decompressFrames(gif, true);
        const work = document.createElement("canvas"); work.width = gif.lsd.width; work.height = gif.lsd.height;
        const ctx = work.getContext("2d"); if (!ctx || !frames.length) return;
        animated.set(url, { texture, frames, ctx, out, patch: document.createElement("canvas"), index: -1, next: 0 });
      }).catch(() => { /* Invalid image stays blank without stopping gameplay. */ });
    } else t = new THREE.TextureLoader().load(url);
    t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
    imgCache.set(url, t);
  }
  return t;
}
