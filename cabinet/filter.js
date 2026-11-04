// PROTOTYPE post filter, ?filter=pixel|ps2 (default off). The scene renders to a low-res target, upscaled with nearest
// sampling (blocky pixels); ps2 also quantizes to 5 bits per channel through a 4x4 ordered dither (PS2-era banding).
import * as THREE from 'three';

export function makeFilter(renderer, mode) {
  if (mode !== 'pixel' && mode !== 'ps2') return (scene, camera) => renderer.render(scene, camera);
  const DIV = mode === 'pixel' ? 4 : 3;
  const rt = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const mat = new THREE.ShaderMaterial({
    uniforms: { t: { value: rt.texture }, px: { value: DIV }, dither: { value: mode === 'ps2' ? 1 : 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `
      uniform sampler2D t; uniform float px, dither; varying vec2 vUv;
      float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(.5, a.y * .75))); }
      void main() {
        gl_FragColor = texture2D(t, vUv);
        #include <colorspace_fragment>
        if (dither > .5) {
          vec2 p = floor(gl_FragCoord.xy / px);                   // one dither cell per low-res pixel
          float d = bayer2(.5 * p) * .25 + bayer2(p);
          gl_FragColor.rgb = floor(gl_FragColor.rgb * 31. + d) / 31.;
        }
      }`,
    depthTest: false, depthWrite: false,
  });
  const quad = new THREE.Scene(); quad.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), size = new THREE.Vector2();
  return (scene, camera) => {
    renderer.getDrawingBufferSize(size);
    const w = Math.max(1, Math.floor(size.x / DIV)), h = Math.max(1, Math.floor(size.y / DIV));
    if (rt.width !== w || rt.height !== h) rt.setSize(w, h);
    mat.uniforms.px.value = size.x / w;
    renderer.setRenderTarget(rt); renderer.render(scene, camera);
    renderer.setRenderTarget(null); renderer.render(quad, ortho);
  };
}
