import * as THREE from "three";

const cache = new Map<string, THREE.BoxGeometry>();
/** Box geometry whose UVs are scaled to world size (texture tiles every `tile` meters) */
export function tbox(w: number, h: number, d: number, tile = 2) {
  const k = `${w.toFixed(2)}|${h.toFixed(2)}|${d.toFixed(2)}|${tile}`;
  let g = cache.get(k);
  if (g) return g;
  g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const sizes: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
    const i = f * 4 + v;
    uv.setXY(i, uv.getX(i) * sizes[f][0] / tile, uv.getY(i) * sizes[f][1] / tile);
  }
  uv.needsUpdate = true;
  cache.set(k, g);
  return g;
}

const mats = new Map<string, THREE.Material>();
export function lam(key: string, make: () => THREE.MeshLambertMaterialParameters) {
  let m = mats.get(key);
  if (!m) { m = new THREE.MeshLambertMaterial(make()); mats.set(key, m); }
  return m;
}
