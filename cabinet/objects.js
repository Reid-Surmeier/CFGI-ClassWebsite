// Shelf objects (image-work/object-models, web GLBs in obj/) placed as in Reid's mockup of 2026-11-03.
// Each entry: shelf, screen x span in the photo frame (716 x 950 px; mockup mapped by shelf edges + eye line:
// x = 0.793 (xm - 443) + 358, y = 0.793 ym + 58), and depth of the object's back from the back wall (mm).
// Scale and X are solved so the object's projected width covers that span (or its height is h px) from the photo camera.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const ITEMS = [
  { f: 'branch', shelf: 'HB', x: [7, 259], back: 10 },
  { f: 'psp', shelf: 'HB', x: [479, 665], back: 30 },
  { f: 'amp', shelf: 'HC', x: [98, 288], back: 4 },
  { f: 'ff9', shelf: 'HC', x: [7, 138], back: 70 },
  { f: 'murakami', shelf: 'HC', x: [448, 555], h: 208, back: 0 },   // wires set its width: fit by height
  { f: 'makita', shelf: 'HC', x: [432, 555], front: 'murakami' },   // stands just in front of the sculpture's base
  { f: 'gadget', shelf: 'HC', x: [553, 664], h: 139, back: 40 },   // the mockup's hand is not a model: it stands on the shelf
  // Reid's props (2026-11-04, .orca/drops/props_GLBFiles), real size in metres: on the top shelf either side of the poster,
  // all at one scale (k mm per metre) so the 145 mm noodle box fits under the top board; x = centre only; ry turns the label front;
  // set at the front of the shelf: the camera is below this board, so its front edge hides whatever stands further back
  { f: 'props-cup', shelf: 'HA', x: [70, 70], k: 720, back: 62 },
  { f: 'props-noodles', shelf: 'HA', x: [160, 160], k: 720, back: 24, ry: -Math.PI / 2 },
  { f: 'props-soda', shelf: 'HA', x: [520, 520], k: 720, back: 68 },
  { f: 'props-cigs', shelf: 'HA', x: [610, 610], k: 720, back: 80 },
];

// downloads start when this module is imported, alongside the cabinet and the head
const loader = new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/'));
const LOADED = Promise.all(ITEMS.map(it => loader.loadAsync('obj/' + it.f + '.glb' + new URL(import.meta.url).search)));

export async function addObjects(scene, camera, C) {
  const W = C.W, Ds = C.Ds, T = 18;
  const lift = (y, z) => (C.lift ?? 0) * THREE.MathUtils.clamp(y / (C.HB - T), 0, 1) * THREE.MathUtils.clamp((Ds - z) / Ds, 0, 1);
  camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  const loaded = await LOADED;
  const placed = {};
  for (const [n, it] of ITEMS.entries()) {                    // in order: an item can stand in front of an earlier one
    const g = loaded[n].scene;
    if (it.ry) g.rotation.y = it.ry;
    const holder = new THREE.Group(); holder.name = it.f; holder.add(g); scene.add(holder);
    if (it.front) it.back = new THREE.Box3().setFromObject(placed[it.front]).max.z + 2;
    let k = it.k ?? 1000, X = (it.x[0] + it.x[1]) / 2 - W / 2;       // mm per model unit; X in mm (starting guess)
    for (let i = 0; i < 9; i++) {
      holder.scale.setScalar(k); holder.position.set(0, 0, 0); holder.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(g), z = it.back + (b.max.z - b.min.z) / 2;
      holder.position.set(X - (b.min.x + b.max.x) / 2, C[it.shelf] + lift(C[it.shelf], z) - b.min.y, z - (b.min.z + b.max.z) / 2);
      holder.updateMatrixWorld(true);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; const v = new THREE.Vector3();
      g.traverse(o => {                                       // projected vertices, not box corners (deep objects)
        if (!o.isMesh) return; const pos = o.geometry.attributes.position, step = Math.max(1, Math.floor(pos.count / 4000));
        for (let j = 0; j < pos.count; j += step) { const p = v.fromBufferAttribute(pos, j).applyMatrix4(o.matrixWorld).project(camera), x = (p.x + 1) / 2 * W, y = (1 - p.y) / 2 * C.H; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      });
      const mmPerPx = (C.camZ - z) / C.F;
      if (!it.k) k *= it.h ? it.h / (y1 - y0) : (it.x[1] - it.x[0]) / (x1 - x0);
      X += ((it.x[0] + it.x[1]) / 2 - (x0 + x1) / 2) * mmPerPx;
    }
    placed[it.f] = holder;
  }
  return placed;
}


// ---- handling (Reid 2026-11-04): click an object to bring it up close (as in his mockup), click again or Esc to put it back;
// drag one to pick it up, it follows the pointer at its depth and drops onto the shelf, deck or object below when let go.
// Each object is a solid box: it stays inside the cabinet, never passes through a shelf board, rides over other objects
// and lands on top of them. Its listeners run in the capture phase and swallow the click, so the head's click-to-rise
// never fires through an object.
export function handleObjects(placed, renderer, camera, C) {
  const items = Object.values(placed), el = renderer.domElement, ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
  const T = 18, lift = (y, z) => (C.lift ?? 0) * THREE.MathUtils.clamp(y / (C.HB - T), 0, 1) * THREE.MathUtils.clamp((C.Ds - z) / C.Ds, 0, 1);
  const SHELVES = [C.HC, C.HB, C.HA];                     // shelf board tops (mm); the boards run 0..Ds deep
  const ndc = e => { const b = el.getBoundingClientRect(); return v2.set((e.clientX - b.left) / b.width * 2 - 1, -(e.clientY - b.top) / b.height * 2 + 1); };
  const pick = e => {
    ray.setFromCamera(ndc(e), camera); const h = ray.intersectObjects(items, true)[0]; if (!h) return null;
    let o = h.object; while (!items.includes(o)) o = o.parent; return { o, p: h.point };
  };
  const box = o => { o.updateMatrixWorld(true); return new THREE.Box3().setFromObject(o, true); };   // tight, from the vertices
  const snap = o => ({ p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.x });
  const tweens = new Map();                               // object -> { a, b, t0, ms, fall }
  const tween = (o, b, ms, fall = false) => tweens.set(o, { a: snap(o), b, t0: performance.now(), ms, fall });
  let insp = null, home = null, down = null, drag = null, swallow = false, spin = null;

  function solids(o) {                                    // shelf boards (with the photo-fit lift at their front), the top board, the other objects
    const z = box(o).getCenter(new THREE.Vector3()).z, slab = (y0, y1) => ({ b: new THREE.Box3(new THREE.Vector3(-1e4, y0, -1e4), new THREE.Vector3(1e4, y1, C.Ds)), board: true });
    const out = SHELVES.map(H => slab(H + lift(H, z) - T, H + lift(H, z))).concat(slab(C.HT - C.tT, C.HT));
    for (const x of items) if (x !== o && x !== insp) out.push({ b: box(x).expandByScalar(-0.5), board: false });
    return out;
  }
  function fit(o, S, b0, p0, prev) {                      // keep o out of the walls, the boards and the other objects
    const bb = () => b0.clone().translate(o.position.clone().sub(p0));   // the box taken at pick-up, moved with it
    let b = bb();
    const zmax = b.min.y < C.HC - T ? C.Zdf - 2 : C.Ds - 2, xmin = -C.CX * (C.camZ - b.max.z) / C.F;   // left: the frame's edge
    o.position.x += Math.max(0, xmin - b.min.x) - Math.max(0, b.max.x - C.Xr);
    o.position.z += Math.max(0, -b.min.z) - Math.min(Math.max(0, b.max.z - zmax), Math.max(0, b.min.z));   // onto a shallow shelf: back, but never into the back wall
    b = bb(); if (b.min.y < 0) o.position.y -= b.min.y;
    const hits = () => { const x = bb(); return S.filter(s => s.b.intersectsBox(x)); };
    let h = hits(); if (!h.length) return;
    const board = h.find(s => s.board);
    if (board) {                                          // through a board: out the side the object's centre is on
      b = bb(); o.position.y += (b.min.y + b.max.y) / 2 >= (board.b.min.y + board.b.max.y) / 2 ? board.b.max.y - b.min.y + 0.1 : board.b.min.y - b.max.y - 0.1;
    } else o.position.y += Math.max(...h.map(s => s.b.max.y)) - bb().min.y + 0.1;   // into an object: ride over it
    if (hits().length || bb().min.y < 0) o.position.copy(prev);   // still blocked: it stays where it was
  }

  function closeUp(o) {                                   // in front of the camera, as big as fits (85% wide or 62% tall)
    const t = tweens.get(o); if (t) { o.position.copy(t.b.p); o.quaternion.copy(t.b.q); o.scale.setScalar(t.b.s); tweens.delete(o); }
    home = snap(o); insp = o;
    const bx = box(o), size = bx.getSize(new THREE.Vector3()), c = bx.getCenter(new THREE.Vector3());
    const d = 0.45 * (C.camZ - C.zc), fh = 2 * d * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const k = Math.min(0.85 * fh * camera.aspect / Math.max(size.x, 1e-6), 0.62 * fh / Math.max(size.y, 1e-6));   // mockup: the PSP fills most of the width
    const dir = new THREE.Vector3(0, -0.04, -1).applyQuaternion(camera.quaternion).normalize();
    const target = camera.position.clone().addScaledVector(dir, d), s = o.scale.x * k;
    spin = { lc: o.worldToLocal(c.clone()), at: target.clone(), t0: performance.now() + 650 };
    tween(o, { p: target.sub(c.sub(o.position).multiplyScalar(k)), q: o.quaternion.clone(), s }, 650);
  }
  function putBack() { const o = insp; insp = null; tween(o, home, 550); }

  el.addEventListener('pointerdown', e => {
    if (insp) return;
    const h = pick(e); if (!h || tweens.has(h.o)) return;   // a falling or returning object can't be grabbed mid-air
    down = { o: h.o, x: e.clientX, y: e.clientY, p: h.p };
  }, true);
  el.addEventListener('pointermove', e => {
    if (!down) return;
    if (!drag && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) {   // a drag, not a click: pick it up
      const o = down.o;
      // the drag plane goes through the grabbed point, so the object keeps its depth (a plane through the
      // object's origin pushed it back by the grab point's depth on every drag, through the back wall)
      const b0 = box(o), S = solids(o).filter(s => s.board || !s.b.intersectsBox(b0));   // neighbours it already touches don't block it
      drag = { o, plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), -down.p.z), off: o.position.clone().sub(down.p), S, b0, p0: o.position.clone(), lift: 18 };
      el.setPointerCapture(e.pointerId);
    }
    if (drag) {
      ray.setFromCamera(ndc(e), camera); const hit = new THREE.Vector3();
      if (ray.ray.intersectPlane(drag.plane, hit)) { const prev = drag.o.position.clone(); drag.o.position.copy(hit.add(drag.off)).y += drag.lift; fit(drag.o, drag.S, drag.b0, drag.p0, prev); }
    }
  }, true);
  el.addEventListener('pointerup', () => {
    if (drag) {                                           // drop onto the highest surface under its footprint
      const o = drag.o, b = drag.b0.clone().translate(o.position.clone().sub(drag.p0)), base = b.min.y;
      const over = s => s.b.max.x > b.min.x && s.b.min.x < b.max.x && s.b.max.z > b.min.z && s.b.min.z < b.max.z;
      const sup = Math.max(0, ...drag.S.filter(s => over(s) && s.b.max.y <= base + 25 && s.b.max.y < C.HT - C.tT).map(s => s.b.max.y));
      const to = snap(o); to.p.y += sup - base;
      tween(o, to, 220 + 18 * Math.sqrt(Math.max(base - sup, 0)), true); swallow = true;   // ~ free-fall time
    } else if (down) swallow = 'inspect';
    down = null; drag = null;
  }, true);
  el.addEventListener('click', e => {
    if (insp) { if (!tweens.has(insp)) putBack(); e.stopImmediatePropagation(); return; }
    if (swallow === 'inspect') { const h = pick(e); if (h) closeUp(h.o); }
    if (swallow) e.stopImmediatePropagation();
    swallow = false;
  }, true);
  addEventListener('keydown', e => { if (e.key === 'Escape' && insp && !tweens.has(insp)) putBack(); });

  return ms => {                                          // per frame: tweens, and a slow turn while held up close
    const now = performance.now();
    for (const [o, t] of tweens) {
      const x = Math.min(1, (now - t.t0) / t.ms);
      const k = t.fall ? (x < 0.8 ? (x / 0.8) ** 2 : 1 - 0.06 * Math.sin((x - 0.8) / 0.2 * Math.PI)) : x * x * (3 - 2 * x);   // falls, small bounce; else ease
      o.position.lerpVectors(t.a.p, t.b.p, k); o.quaternion.slerpQuaternions(t.a.q, t.b.q, Math.min(k, 1)); o.scale.setScalar(t.a.s + (t.b.s - t.a.s) * k);
      if (x >= 1) { o.position.copy(t.b.p); tweens.delete(o); }
    }
    if (insp && !tweens.has(insp)) {                     // turn about its own centre, which stays put
      insp.quaternion.copy(home.q).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.5 * Math.sin((now - spin.t0) / 1400)));
      insp.updateMatrixWorld(true); insp.position.add(spin.at.clone().sub(insp.localToWorld(spin.lc.clone())));
    }
  };
}
