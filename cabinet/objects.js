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
];

// downloads start when this module is imported, alongside the cabinet and the head
const loader = new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/'));
const LOADED = Promise.all(ITEMS.map(it => loader.loadAsync('obj/' + it.f + '.glb')));

export async function addObjects(scene, camera, C) {
  const W = C.W, Ds = C.Ds, T = 18;
  const lift = (y, z) => (C.lift ?? 0) * THREE.MathUtils.clamp(y / (C.HB - T), 0, 1) * THREE.MathUtils.clamp((Ds - z) / Ds, 0, 1);
  camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  const loaded = await LOADED;
  const placed = {};
  for (const [n, it] of ITEMS.entries()) {                    // in order: an item can stand in front of an earlier one
    const g = loaded[n].scene;
    const holder = new THREE.Group(); holder.name = it.f; holder.add(g); scene.add(holder);
    if (it.front) it.back = new THREE.Box3().setFromObject(placed[it.front]).max.z + 2;
    let k = 1000, X = (it.x[0] + it.x[1]) / 2 - W / 2;       // mm per model unit; X in mm (starting guess)
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
      k *= it.h ? it.h / (y1 - y0) : (it.x[1] - it.x[0]) / (x1 - x0);
      X += ((it.x[0] + it.x[1]) / 2 - (x0 + x1) / 2) * mmPerPx;
    }
    placed[it.f] = holder;
  }
  return placed;
}

