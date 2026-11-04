// Paper banner (tex/poster-v3.jpg: Reid's poster edited through Muse DIS, see scripts/poster_paste.py) hung from the top
// board's underside in the top bay, as in Reid's mockup (photo-frame x 258..472 px). Top edge pinned; a slow breeze
// ripples it, more toward the free bottom edge. Returns update(ms) for the animation loop.
import * as THREE from 'three';

export function addBanner(scene, camera, C) {
  const ASPECT = 919 / 750, X0 = 258, X1 = 472, Z = C.Ds + 6;   // screen span (px); hangs just in front of the hutch cap (shelf A), as in the mockup
  const top = C.HT - C.tT - 2, dist = C.camZ - Z, mmPx = dist / C.F;
  const w = (X1 - X0) * mmPx, h = w * ASPECT, cx = ((X0 + X1) / 2 - C.CX) * mmPx;
  const g = new THREE.PlaneGeometry(w, h, 20, 26); g.translate(cx, top - h / 2, Z);
  const rest = g.attributes.position.array.slice();
  const tex = new THREE.TextureLoader().load('tex/poster-v3.jpg' + new URL(import.meta.url).search); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
  mesh.name = 'banner'; scene.add(mesh);
  const pos = g.attributes.position;
  return ms => {
    const t = ms / 1000, gust = 0.6 + 0.4 * Math.sin(t * 0.37) * Math.sin(t * 0.23 + 1);
    for (let i = 0; i < pos.count; i++) {
      const x = rest[3 * i], y = rest[3 * i + 1], u = (x - cx) / w, d = (top - y) / h;   // d: 0 at the pinned top, 1 at the bottom
      const k = Math.pow(Math.max(d, 0), 1.5) * gust;
      pos.setZ(i, Z + k * (7 * Math.sin(1.6 * t + 4 * d + 2.5 * u) + 2.5 * Math.sin(3.1 * t + 7 * u)));
      pos.setX(i, x + k * 2 * Math.sin(1.1 * t + 3 * d));
    }
    pos.needsUpdate = true; g.computeVertexNormals();
  };
}
