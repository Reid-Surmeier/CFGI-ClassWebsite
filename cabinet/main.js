// Cabinet head draft. Units: mm. X right, Y up (deck top = 0), Z toward the camera (back wall = 0).
// Cabinet dimensions and the camera come from scripts/fit_camera.py (fitted to the Instagram frame);
// head placement from scripts/place_head.py. Plywood textures are rectified crops of that frame.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
// Every file is fetched with this build's ?v= (index.html reads it from build.json, uncached), so a browser never mixes
// a cached older file into a newer build. Bump build.json's v whenever anything in site/ changes.
const V = new URL(import.meta.url).search;
const { addObjects, handleObjects } = await import('./objects.js' + V);
const { makeFilter } = await import('./filter.js' + V);
const { addBanner } = await import('./banner.js' + V);

const Q = new URLSearchParams(location.search);
const DEBUG_EYES = Q.has('debugeyes');
const RAZ = Q.has('raz');                         // PROTOTYPE: Psychonauts 1 (Raz) eye behaviour, see the ?raz block below
if (Q.has('clean')) document.getElementById('ui').style.display = 'none';
const HEAD = 'heads/v8/';   // the one head (Reid 2026-11-04); earlier versions are in ../archive-heads/
const headP = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(HEAD + 'head.glb' + V);   // head.glb is meshopt-compressed; start it now, alongside the cabinet
const [C, P] = await Promise.all(['camera.json', HEAD + 'placement.json'].map(u => fetch(u + V).then(r => r.json())));

const host = document.getElementById('frame');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
host.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

// ---- camera matched to the photo ----
const camera = new THREE.PerspectiveCamera(2 * Math.atan(C.H / 2 / C.F) * 180 / Math.PI, C.W / C.H, 5, 10000);
function photoView() {
  camera.position.set(0, C.camH, C.camZ);
  camera.rotation.set(C.tilt * Math.PI / 180, 0, 0);   // fit: horizon sits below centre → pitched up
  camera.updateMatrixWorld();
}
photoView();
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enabled = false; orbit.target.set(0, 120, C.zc);
photoView();                                       // OrbitControls' constructor re-aims the camera; restore the match

// ---- cabinet: modelled + light-baked in Blender (scripts/build_cabinet.py), lightmap in TEXCOORD_1 ----
// Each material = flattened plywood albedo (tile UVs, already in tile units) x calibrated gain x baked irradiance.
const LM = await fetch('lightmap.json' + V).then(r => r.json());
const loader = new THREE.TextureLoader();
const tex = (f, srgb = true) => {
  const t = loader.load('tex/' + f + V); t.flipY = false; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.anisotropy = 8; return t;
};
const lightMap = tex('lightmap.jpg'); lightMap.channel = 1; lightMap.wrapS = lightMap.wrapT = THREE.ClampToEdgeWrapping;
const ALB = { back: 'alb_back.jpg', face: 'alb_deckfull.jpg', edge: 'alb_edge.jpg', fascia: 'alb_fascia.jpg' };
const albFor = n => ALB[n] ?? (n.startsWith('back') ? ALB.back : ALB.face);
const maps = {};
const cab = await new GLTFLoader().loadAsync('cabinet.glb' + V);
cab.scene.scale.setScalar(1000);                   // glTF metres -> scene mm
cab.scene.traverse(o => {
  if (!o.isMesh) return;
  const n = o.material.name, g = LM.gain[n] ?? [1, 1, 1];
  const m = new THREE.MeshBasicMaterial({ lightMap, lightMapIntensity: Math.PI * LM.K, side: THREE.DoubleSide });
  if (n === 'dark') m.color.setRGB(0.02, 0.015, 0.012); else { m.map = maps[n] ??= tex(albFor(n)); m.color.setRGB(...g); }
  o.material = m;
});
scene.add(cab.scene);

// ---- head lighting: neutral key from the front-above + soft sky/ground (the cabinet's light is baked) ----
scene.add(new THREE.HemisphereLight(0xffffff, 0x6e6052, 1.35));
const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(-150, 900, 1300); scene.add(key);

// ---- head + eyes ----
const head = new THREE.Group();
head.position.set(P.X0, P.Y0, P.Z0); head.scale.setScalar(P.scale);
if (!Q.has('nohead')) scene.add(head);            // ?nohead: cabinet only (lightmap correction renders)
const gltf = await headP;
gltf.scene.rotation.y = -Math.PI / 2;            // the mesh faces +X; turn it to face the camera (+Z)
head.add(gltf.scene);
if (Q.has('noface')) gltf.scene.visible = false;   // ?noface: eyeballs only (measuring how much iris the lids cover)
if (RAZ) gltf.scene.traverse(o => {               // Raz's face: diffuse-only lighting on the painted map, no specular
  if (!o.isMesh) return; const m = o.material;
  o.material = new THREE.MeshLambertMaterial({ map: m.map, color: m.color, alphaMap: m.alphaMap, transparent: m.transparent, alphaTest: m.alphaTest, side: m.side });
});

const placed = Q.has('nohead') || Q.has('noobj') ? null : await addObjects(scene, camera, C); window.__objects = placed;   // test hook (scripts/checks/browser.mjs)
const objects = placed && handleObjects(placed, renderer, camera, C);   // shelf objects (?noobj hides them): click = close-up, drag = move
const banner = Q.has('nohead') || Q.has('noobj') ? null : addBanner(scene, camera, C);   // poster in a breeze
const E = await fetch(HEAD + 'eyes.json' + V).then(r => r.json());
const R_EYE = E.eye_r;                            // eyeball about the lid pivot (scripts/prep_head.py)
function eyeTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#f3eee6'; g.fillRect(0, 0, 1024, 512);
  const cx = 256, cy = 256;                        // u = 0.25 faces +Z on a three.js sphere
  const ir = g.createRadialGradient(cx, cy, 10, cx, cy, 74);
  ir.addColorStop(0, '#7a5034'); ir.addColorStop(0.75, '#5c3a26'); ir.addColorStop(1, '#2a1a12');
  g.fillStyle = ir; g.beginPath(); g.arc(cx, cy, 74, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#0d0907'; g.beginPath(); g.arc(cx, cy, 30, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const eyeMat = DEBUG_EYES ? new THREE.MeshBasicMaterial({ color: 0xff0000 })
  : RAZ || E.rest ? new THREE.MeshLambertMaterial({ map: eyeTexture() })   // Raz: the shine comes from the catchlight shell only
  : new THREE.MeshStandardMaterial({ map: eyeTexture(), roughness: 0.18 });
function catchlightCube() {                       // Raz: 128² cube map, black with two white dots, added on a shell over the eye
  const faces = [...Array(6)].map((_, i) => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, 128, 128);
    if (i === 4) { g.fillStyle = '#fff'; for (const [x, y, r] of [[54, 84, 9], [76, 94, 6]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } }
    return c;
  });
  const t = new THREE.CubeTexture(faces); t.needsUpdate = true; return t;
}
// Half-Life 2 style (docs/cg-figure/era-eye-rigging-research.md): eyeballs are spheres turning about the pivot; lids are
// morph targets on the head mesh (blinkHalf, blinkFull, lookUp, lookDown), the gaze shape picked from the eye's pitch.
let CATCH;
const rig = E.eyes.map(e => {
  const [x, y, z] = e.pivot_gltf;                 // glTF -> head-local after the -90° turn: (-z, y, x)
  const socket = new THREE.Group(); socket.position.set(-z, y, x); head.add(socket);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(R_EYE, 48, 32), eyeMat); socket.add(eye);
  if ((RAZ || E.rest) && !DEBUG_EYES) socket.add(new THREE.Mesh(new THREE.SphereGeometry(R_EYE * 1.01, 48, 32), CATCH ??= new THREE.MeshBasicMaterial({ envMap: catchlightCube(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })));
  return { socket, eye };
});
const morphed = [];
gltf.scene.traverse(o => o.morphTargetDictionary && morphed.push(o));
function lids(pitch, blink) {                     // pitch: radians, + up; blink 0..1
  const open = 1 - blink, w = {
    lookUp: open * THREE.MathUtils.clamp(pitch / 0.35, 0, 1),
    lookDown: open * THREE.MathUtils.clamp(-pitch / 0.4, 0, 1),
    blinkHalf: blink < 0.5 ? blink * 2 : 2 - blink * 2,
    blinkFull: Math.max(0, blink * 2 - 1),
  };
  for (const o of morphed) for (const k in w) { const i = o.morphTargetDictionary[k]; if (i !== undefined) o.morphTargetInfluences[i] = w[k]; }
}

// ---- behaviour: gaze follows the pointer, idle saccades, blinks; lids follow gaze pitch ----
const pointer = new THREE.Vector2(), ray = new THREE.Raycaster();
let lastMove = -1e9, saccadeAt = 0, idle = new THREE.Vector2();
function track(e, ox = 0, oy = 0) {               // ox, oy: this page's offset inside a parent page
  const b = renderer.domElement.getBoundingClientRect();
  pointer.set((e.clientX - ox - b.left) / b.width * 2 - 1, -(e.clientY - oy - b.top) / b.height * 2 + 1);
  lastMove = performance.now();
}
renderer.domElement.addEventListener('pointermove', e => track(e));
try {                                              // embedded (class homepage iframe): follow the cursor over the whole page
  if (window.frameElement) window.parent.addEventListener('pointermove', e => { const f = window.frameElement.getBoundingClientRect(); track(e, f.left, f.top); });
} catch { /* cross-origin parent: canvas only */ }
const target = new THREE.Vector3(), gazeYaw = [0, 0], gazePitch = [0, 0];
let blinkStart = -1, nextBlink = 1500;
const ease = (a, b, k) => a + (b - a) * k;
window.__blink = () => { if (blinkStart < 0) nextBlink = 0; rz.next = 0; };   // toolbar Blink button

// ---- click Harris: he rises out of the hole (95 px in the photo view: moustache, mouth and goatee clear the rim at scale 600), holds, sinks back ----
const RISE = { mm: 95 * (C.camZ - P.Z0) / C.F, up: 450, hold: 1800, down: 700 };
let riseAt = Q.has('rise') ? -1e12 : -1e9, riseHold = Q.has('rise');   // ?rise = held up (test shots)
function rise(t) {
  if (riseHold) return RISE.mm;
  const d = t - riseAt, { up, hold, down } = RISE;
  if (d < 0 || d > up + hold + down) return 0;
  if (d < up) { const x = d / up - 1; return RISE.mm * (1 + 2.2 * x * x * x + 1.2 * x * x); }   // ease-out with a small overshoot
  if (d < up + hold) return RISE.mm;
  const x = (d - up - hold) / down; return RISE.mm * (1 - x * x * (3 - 2 * x));
}
renderer.domElement.addEventListener('click', e => {
  const b = renderer.domElement.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2((e.clientX - b.left) / b.width * 2 - 1, -(e.clientY - b.top) / b.height * 2 + 1), camera);
  if (!ray.intersectObject(head, true).length) return;
  const t = performance.now() - clock.t0, d = t - riseAt;
  riseAt = d < RISE.up + RISE.hold + RISE.down && d > RISE.up ? t - RISE.up : t;   // clicked while up: hold longer, no second jump
});

// ---- PROTOTYPE ?raz: Raz's eyes, Psychonauts 1 (docs/cg-figure/psychonauts-eye-rigging-research.md, PR #141) ----
// Lids never follow gaze; they rest part-closed (Default.pba) and blink from blink.pba's 10-frame table at 30 fps
// (peak 148/255 = shut). Eye moves are 2-3 frame jumps then holds; the head follows 1-2 frames late with ~40%;
// a jump over 10° triggers a blink; a slow breathing bob. Unknown (encrypted in the disc exe): the live blink interval,
// look limits and smoothing; 2-6 s, ±10° pitch, ±26° yaw are stand-ins. ?rest=0..1 overrides the resting lid.
const RZ = { rest: +(Q.get('rest') ?? E.rest ?? 0.2), table: [0, 0, 70, 136, 148, 95, 21, 0, 0, 0], pitch: 0.175, yaw: 0.45,
  step: 0.035, jump: 80, share: 0.4, delay: 50, k: 12, headYaw: 0.08, headPitch: 0.04, breath: 2, breathMs: 2500 };
const rz = { y: 0, p: 0, from: [0, 0], to: [0, 0], t0: -1e9, hy: 0, hp: 0, b0: -1e9, next: 1500, last: 0 };
function razBlink(t) {                             // extra closure 0..1, stepped at 30 fps like the game
  if (t > rz.next && t - rz.b0 > 333) { rz.b0 = t; rz.next = t + 2000 + Math.random() * 4000; }
  const f = Math.floor((t - rz.b0) / (1000 / 30));
  return f >= 0 && f < 10 ? Math.min(1, RZ.table[f] / 148) : 0;
}
function razStep(t, hold) {
  const dt = Math.min((t - rz.last) / 1000, 0.05); rz.last = t;
  const mid = rig[0].socket.getWorldPosition(new THREE.Vector3()).add(rig[1].socket.getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5);
  const d = target.clone().sub(mid), dy = Math.atan2(d.x, d.z), dp = Math.atan2(d.y, Math.hypot(d.x, d.z));
  if (t - rz.t0 > RZ.jump && Math.hypot(dy - rz.to[0], dp - rz.to[1]) > RZ.step) {   // hold, then jump
    rz.from = [rz.y, rz.p]; rz.to = [dy, dp]; rz.t0 = t;
    if (Math.hypot(dy - rz.y, dp - rz.p) > 0.175) rz.next = Math.min(rz.next, t);    // blink on big jumps
  }
  const k = Math.min(1, (t - rz.t0) / RZ.jump);
  rz.y = rz.from[0] + (rz.to[0] - rz.from[0]) * k; rz.p = rz.from[1] + (rz.to[1] - rz.from[1]) * k;
  const c = THREE.MathUtils.clamp, hk = t - rz.t0 > RZ.delay ? 1 - Math.exp(-RZ.k * dt) : 0;
  rz.hy += (c(rz.to[0] * RZ.share, -RZ.headYaw, RZ.headYaw) - rz.hy) * hk;
  rz.hp += (c(rz.to[1] * RZ.share, -RZ.headPitch, RZ.headPitch) - rz.hp) * hk;
  head.rotation.set(-rz.hp, rz.hy, 0);
  head.position.y = P.Y0 + RZ.breath * Math.sin(2 * Math.PI * t / RZ.breathMs);
  for (const r of rig) r.eye.rotation.set(-c(rz.p - rz.hp, -RZ.pitch, RZ.pitch), c(rz.y - rz.hy, -RZ.yaw, RZ.yaw), 0);
  lids(0, hold ?? RZ.rest + (1 - RZ.rest) * razBlink(t));
}
function blinkAmount(t) {
  if (t > nextBlink && blinkStart < 0) blinkStart = t;
  if (blinkStart < 0) return 0;
  const d = t - blinkStart;
  if (d > 200) { blinkStart = -1; nextBlink = t + 2000 + Math.random() * 4000; return 0; }
  return Math.sqrt(Math.sin(Math.PI * d / 200));     // 0.2 s, snaps shut and holds near closed (Source's blink curve shape)
}

// ---- layout + UI ----
function resize() {
  const r = host.getBoundingClientRect();
  renderer.setSize(r.width, r.height, false);
}
new ResizeObserver(resize).observe(host); resize();
const bPhoto = document.getElementById('bPhoto'), bOrbit = document.getElementById('bOrbit');
bPhoto.onclick = () => { orbit.enabled = false; photoView(); bPhoto.ariaPressed = 'true'; bOrbit.ariaPressed = 'false'; };
bOrbit.onclick = () => { orbit.enabled = true; orbit.update(); bOrbit.ariaPressed = 'true'; bPhoto.ariaPressed = 'false'; };
const ref = document.getElementById('ref');
document.getElementById('ov').oninput = e => ref.style.opacity = e.target.value;

// test hooks: ?close = camera at the face; ?look=x,y = fixed gaze target offset (mm); ?blink=0..1 = held lid
if (Q.has('close')) {
  const ey = P.Y0 + P.scale * P.eye_local[0][1];
  camera.position.set(90, ey + 40, P.Z0 + 330); camera.lookAt(0, ey, P.Z0); camera.fov = 22; camera.updateProjectionMatrix();
}
if (Q.has('orbitshot')) { camera.position.set(-650, 520, 1150); camera.lookAt(0, 300, 150); }
const LOOK = Q.get('look')?.split(',').map(Number), HOLD = Q.has('blink') ? +Q.get('blink') : null;
const clock = { t0: performance.now() };
const draw = makeFilter(renderer, Q.get('filter'));     // ?filter=off|pixel|ps2; default film (ps2 + Reid's grade)
renderer.setAnimationLoop(() => {
  const t = performance.now() - clock.t0;
  // gaze target: the pointer ray hits a plane 350 mm in front of the face; idle = random saccades
  if (performance.now() - lastMove < 2500) {
    ray.setFromCamera(pointer, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -(P.Z0 + 350));
    ray.ray.intersectPlane(plane, target);
  } else if (LOOK) {
    target.set(LOOK[0], P.Y0 + P.scale * 0.29 + LOOK[1], P.Z0 + 350);
  } else {
    if (t > saccadeAt) { idle.set((Math.random() - 0.5) * 500, (Math.random() - 0.3) * 260); saccadeAt = t + 700 + Math.random() * 1800; }
    target.set(idle.x, P.Y0 + P.scale * 0.29 + idle.y, P.Z0 + 350);
  }
  if (RAZ) razStep(t, DEBUG_EYES ? 0 : HOLD); else {
  const blink = DEBUG_EYES ? 0 : HOLD ?? (E.rest ?? 0) + (1 - (E.rest ?? 0)) * blinkAmount(t);   // Raz-lid heads rest half-closed
  rig.forEach((r, i) => {
    const p = r.socket.getWorldPosition(new THREE.Vector3());
    const d = target.clone().sub(p);
    const yaw = THREE.MathUtils.clamp(Math.atan2(d.x, d.z), -0.6, 0.6);
    const pitch = THREE.MathUtils.clamp(Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.4, 0.35);
    gazeYaw[i] = ease(gazeYaw[i], yaw, 0.35); gazePitch[i] = ease(gazePitch[i], pitch, 0.35);
    r.eye.rotation.set(-gazePitch[i], gazeYaw[i], 0);
  });
  lids(DEBUG_EYES ? 0 : (gazePitch[0] + gazePitch[1]) / 2, blink);
  }
  head.position.y = (RAZ ? head.position.y : P.Y0) + rise(t);   // razStep sets the breathing bob each frame
  banner?.(performance.now());
  objects?.(t);
  draw(scene, camera);
});
window.__ready = true; host.classList.add('ready');   // fade the live scene in (over white: no placeholder still)
let drawn = 0;                                     // tell an embedding page (class homepage loader) once real frames are on screen
(function signal() { if (++drawn < 4) return requestAnimationFrame(signal); try { window.parent.postMessage('cabinet-ready', location.origin); } catch {} })();
