// Post filter, ?filter=film|off|pixel|ps2 (default film). The scene renders to a low-res target, upscaled with nearest
// sampling (blocky pixels); ps2 also quantizes to 5 bits per channel through a 4x4 ordered dither (PS2-era banding).
// film = ps2 plus Reid's Lightroom grade (2026-11-04): exposure +0.35, contrast +49, temperature -9 (first -6, Reid: still too warm), vibrance +14,
// saturation +11, clarity -12, dehaze -11, vignette +55 (Lightroom's positive vignette lightens the corners), grain 48, glow 16.
import * as THREE from 'three';

export function makeFilter(renderer, mode) {
  mode = mode ?? 'film';
  if (mode !== 'pixel' && mode !== 'ps2' && mode !== 'film') return (scene, camera) => renderer.render(scene, camera);
  const DIV = mode === 'pixel' ? 4 : 3;
  const rt = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const mat = new THREE.ShaderMaterial({
    uniforms: { t: { value: rt.texture }, px: { value: DIV }, dither: { value: mode === 'pixel' ? 0 : 1 }, grade: { value: mode === 'film' ? 1 : 0 },
      texel: { value: new THREE.Vector2() }, time: { value: 0 }, dpr: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `
      uniform sampler2D t; uniform float px, dither, grade, time, dpr; uniform vec2 texel; varying vec2 vUv;
      float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(.5, a.y * .75))); }
      vec3 srgb(vec4 c) { vec4 o = c; o = linearToOutputTexel(o); return o.rgb; }
      float hash(vec2 p) { vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }   // no sin: sin of big numbers is coarse on some GPUs
      void main() {
        vec3 c = srgb(texture2D(t, vUv));
        if (grade > .5) {
          vec3 b = vec3(0.); float n = 0.;                        // 5x5 blur over the low-res pixels: clarity and glow
          for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) { b += srgb(texture2D(t, vUv + vec2(i, j) * texel * 2.)); n += 1.; }
          b /= n;
          c = pow(c, vec3(2.2)) * exp2(.35); c = pow(c, vec3(1. / 2.2));             // exposure +0.35 EV, in linear light
          c = mix(c, c * c * (3. - 2. * c), .49);                                      // contrast +49: toward an S-curve
          c += -.12 * (c - b);                                                         // clarity -12: less local contrast
          c = c * (1. - .02) + .018;                                                   // dehaze -11: blacks lifted toward haze
          c += vec3(-.027, -.004, .032);                                               // temperature -9: cooler (Reid: -6 and -3 read too warm)
          float l = dot(c, vec3(.299, .587, .114)), mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
          float s = mx > 0. ? (mx - mn) / mx : 0.;
          c = mix(vec3(l), c, 1.11 * (1. + .14 * (1. - s)));                           // saturation +11, vibrance +14 (muted colours more)
          c += .16 * max(b - .72, 0.) * 1.6;                                           // glow 16: highlights bloom
          vec2 q = (vUv - .5) * 2.; c = mix(c, vec3(1.), .55 * .35 * smoothstep(.75, 1.35, length(q)));   // vignette +55: lighter corners only
          c = clamp(c, 0., 1.);
        }
        if (dither > .5) {
          vec2 p = floor(gl_FragCoord.xy / px);                   // one dither cell per low-res pixel
          float d = bayer2(.5 * p) * .25 + bayer2(p);
          c = floor(c * 31. + d) / 31.;
        }
        if (grade > .5) c += (hash(floor(gl_FragCoord.xy / dpr) + time) - .5) * .48 * .16;   // grain 48: one CSS px grains, fixed to the screen (static)
        gl_FragColor = vec4(c, 1.);
      }`,
    depthTest: false, depthWrite: false,
  });
  const quad = new THREE.Scene(); quad.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), size = new THREE.Vector2();
  return (scene, camera) => {
    renderer.getDrawingBufferSize(size);
    const w = Math.max(1, Math.floor(size.x / DIV)), h = Math.max(1, Math.floor(size.y / DIV));
    if (rt.width !== w || rt.height !== h) rt.setSize(w, h);
    mat.uniforms.px.value = size.x / w; mat.uniforms.texel.value.set(1 / w, 1 / h); mat.uniforms.time.value = 0; mat.uniforms.dpr.value = renderer.getPixelRatio();   // time 0: static grain (Reid: it should not move)
    renderer.setRenderTarget(rt); renderer.render(scene, camera);
    renderer.setRenderTarget(null); renderer.render(quad, ortho);
  };
}
