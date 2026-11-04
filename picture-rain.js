// by Noah Cha
window.startPictureRain = function (signal) {
  'use strict';
  const background = document.createElement('canvas');
  const foreground = document.createElement('canvas');
  background.className = 'picture-rain-layer picture-rain-ripples';
  foreground.className = 'picture-rain-layer picture-rain-spheres';
  for (const layer of [background, foreground]) layer.setAttribute('aria-hidden', 'true');
  const status = document.createElement('p');
  status.className = 'picture-rain-status';
  status.setAttribute('role', 'status');
  document.body.append(background, foreground, status);
  document.body.classList.add('has-picture-rain');
  function message(text) { status.textContent = text; status.hidden = !text; }
  signal.addEventListener('abort', () => {
    background.remove(); foreground.remove(); status.remove();
    document.body.classList.remove('has-picture-rain');
  }, { once: true });
  let canvas, gl, sphereProgram, rippleProgram, shadowProgram;
  // All drawing uses one reusable quad. Sphere surfaces are shaded analytically.
  const vertexSource = `
    attribute vec2 a_position;
    uniform vec2 u_resolution, u_center;
    uniform float u_radius;
    varying vec2 v_position;
    void main() {
      v_position = a_position;
      vec2 pixel = u_center + a_position * u_radius;
      gl_Position = vec4(pixel / u_resolution * 2.0 - 1.0, 0.0, 1.0);
    }
  `;
  const sphereSource = `
    precision mediump float;
    varying vec2 v_position;
    uniform sampler2D u_snapshot;
    uniform float u_rotation;
    void main() {
      float d = dot(v_position, v_position);
      if (d > 1.0) discard;
      float cs = cos(u_rotation), sn = sin(u_rotation);
      vec2 p = mat2(cs, -sn, sn, cs) * v_position;
      vec3 normal = vec3(p, sqrt(max(0.0, 1.0 - d)));
      // Spherical coordinates bend the frozen face image around the sphere.
      vec2 uv = vec2(0.5 + atan(normal.x, normal.z) / 3.14159265,
                     0.5 + asin(normal.y) / 3.14159265);
      vec3 face = texture2D(u_snapshot, uv).rgb;
      vec3 worldNormal = vec3(v_position, normal.z);
      vec3 light = normalize(vec3(-0.5, 0.65, 1.0));
      float diffuse = max(dot(worldNormal, light), 0.0);
      float highlight = pow(max(dot(worldNormal, normalize(light + vec3(0.0, 0.0, 1.0))), 0.0), 50.0);
      vec3 color = face * (0.42 + 0.58 * diffuse) + vec3(highlight * 0.32);
      float alpha = 1.0 - smoothstep(0.975, 1.0, d);
      gl_FragColor = vec4(color, alpha);
    }
  `;
  const shadowSource = `
    precision mediump float;
    varying vec2 v_position;
    uniform float u_strength;
    void main() {
      float alpha = exp(-dot(v_position, v_position) * 4.0) * u_strength;
      gl_FragColor = vec4(0.07, 0.06, 0.09, alpha);
    }
  `;
  const rippleSource = `
    precision mediump float;
    varying vec2 v_position;
    uniform float u_age, u_extent;
    // ShaderCode's RGB phase shifts, 50-frequency radial waves, reciprocal
    // distortion, fract bands, and 9x output gain, evaluated per impact.
    vec3 shaderCode(vec2 st, float age) {
      float rnd = max(st.y, 0.02);
      vec3 c = vec3(0.0);
      float l = 0.0;
      float z = age;
      for (int i = 0; i < 3; i++) {
        st -= vec2(0.5);
        z -= 1.0;
        l = max(length(st), 0.002);
        float radialWave = sin(l * 50.0 - 2.0 * z);
        float divisor = (rnd / l) * radialWave;
        // Safe reciprocal replaces pow(negativeValue, -1.0), undefined in GLSL.
        st *= (divisor < 0.0 ? -1.0 : 1.0) / max(abs(divisor), 0.002);
        float band = fract(0.01 / max(length(st - 0.5), 0.002));
        c[i] = band * 5.0 / (1.0 + l * 3.0);
      }
      return clamp(c * 9.0 + l, 0.0, 1.0);
    }
    void main() {
      vec2 offset = v_position * u_extent;
      float distance = length(offset);
      float arrival = u_age * 85.0;
      // An outward-moving front and trailing rings carry the original pattern.
      float front = 1.0 - smoothstep(arrival, arrival + 30.0, distance);
      float wake = exp(-max(arrival - distance, 0.0) / 190.0);
      float rings = 0.35 + 0.65 * pow(0.5 + 0.5 * cos(distance * 0.07 - u_age * 5.95), 3.0);
      float fade = (1.0 - smoothstep(20.0, 30.0, u_age)) * smoothstep(0.0, 0.15, u_age);
      vec3 effect = shaderCode(offset / max(180.0, arrival * 1.5) + 0.5, u_age);
      gl_FragColor = vec4(mix(vec3(1.0), effect, front * wake * rings * fade * 0.85), 1.0);
    }
  `;
  function makeProgram(fragment, names) {
    const program = gl.createProgram();
    for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragment]]) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      gl.attachShader(program, shader); gl.deleteShader(shader);
    }
    gl.bindAttribLocation(program, 0, 'a_position'); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    const uniforms = {};
    for (const name of ['resolution','center','radius',...names]) uniforms[name] = gl.getUniformLocation(program, 'u_' + name);
    return { program, uniforms };
  }
  const layers = [];
  function selectLayer(layer) {
    ({ canvas, gl, sphereProgram, rippleProgram, shadowProgram } = layer);
  }
  try {
    for (const [surface, isBackground] of [[background, true], [foreground, false]]) {
      canvas = surface;
      gl = canvas.getContext('webgl', { alpha: !isBackground, antialias: true, premultipliedAlpha: false });
      if (!gl) throw new Error('WebGL is unavailable');
      const layer = { canvas, gl, programs: [] };
      layers.push(layer);
      if (isBackground) {
        layer.rippleProgram = makeProgram(rippleSource, ['age','extent']);
        layer.programs.push(layer.rippleProgram);
      } else {
        layer.sphereProgram = makeProgram(sphereSource, ['snapshot','rotation']);
        layer.programs.push(layer.sphereProgram);
        layer.shadowProgram = makeProgram(shadowSource, ['strength']);
        layer.programs.push(layer.shadowProgram);
      }
      layer.quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, layer.quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.clearColor(isBackground ? 1 : 0, isBackground ? 1 : 0, isBackground ? 1 : 0, isBackground ? 1 : 0);
      gl.enable(gl.BLEND);
    }
  } catch (error) {
    for (const layer of layers) {
      for (const program of layer.programs) layer.gl.deleteProgram(program.program);
      if (layer.quad) layer.gl.deleteBuffer(layer.quad);
    }
    message('The sphere graphics could not start. Try a browser with WebGL enabled.');
    return;
  }
  selectLayer(layers[1]);

  // World x/y lie on the floor, z points up toward the top-down camera.
  const GRAVITY = 650, CAMERA_HEIGHT = 900, STEP = 1/120;
  const SPAWN_INTERVAL = 1.25, MAX_SPHERES = 160, RIPPLE_LIFETIME = 30;
  const balls = [], ripples = [];
  let worldWidth = innerWidth, worldHeight = innerHeight, simulationTime = 0;
  let previous = performance.now(), accumulator = 0, nextSpawn = 0, animation;
  const PICTURE_URL = './assets/picture-rain/sphere-picture.jpg';
  let pictureTexture = null, graphicsLost = false, disposed = false;

  async function loadPictureTexture(url) {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('Could not load the picture'));
      image.src = url;
    });
    selectLayer(layers[1]);
    if (disposed || graphicsLost || gl.isContextLost()) throw new Error('Graphics interrupted');
    const surface = document.createElement('canvas');
    surface.width = surface.height = 512;
    const ctx = surface.getContext('2d');
    if (!ctx) throw new Error('Could not prepare the picture');
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    if (!side) throw new Error('The picture has no usable dimensions');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 512, 512);
    ctx.drawImage(image, (image.naturalWidth-side)/2, (image.naturalHeight-side)/2,
      side, side, 0, 0, 512, 512);
    const texture = gl.createTexture();
    if (!texture) throw new Error('Could not create the picture texture');
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, surface);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }
  function spawnSphere() {
    if (!pictureTexture || balls.length >= MAX_SPHERES) return;
    const radius = Math.min(26 + Math.random()*8, Math.min(worldWidth,worldHeight)*0.075);
    const spread = Math.min(worldWidth,worldHeight)*0.08;
    balls.push({
      x: worldWidth*0.22+(Math.random()+Math.random()-1)*spread,
      y: -worldHeight*0.22+(Math.random()+Math.random()-1)*spread,
      z: 330 + Math.random()*50, radius, vx: (Math.random()-.5)*18, vy: (Math.random()-.5)*18, vz: -35,
      rotation: (Math.random()-.5)*0.5, spin: (Math.random()-.5)*0.6,
      texture: pictureTexture, landed: false, lastImpact: -100
    });
  }
  function impact(ball, speed) {
    if (!ball.landed || (speed > 80 && simulationTime-ball.lastImpact > 0.6)) {
      ripples.push({ x: ball.x, y: ball.y, born: simulationTime });
      ball.lastImpact = simulationTime;
    }
    ball.landed = true;
  }
  function simulate(dt) {
    simulationTime += dt;
    for (const b of balls) {
      b.vz -= GRAVITY*dt;
      b.x += b.vx*dt; b.y += b.vy*dt; b.z += b.vz*dt;
      b.rotation += b.spin*dt;
      if (b.landed) { b.spin *= Math.exp(-dt*3); b.vx *= Math.exp(-dt*1.5); b.vy *= Math.exp(-dt*1.5); }
    }
    // Iterative nonpenetration constraints allow spheres to stack vertically.
    for (let iteration=0; iteration<5; iteration++) {
      for (const b of balls) {
        if (b.z < b.radius) {
          impact(b, Math.max(0,-b.vz)); b.z = b.radius;
          b.vz = b.vz < -35 ? -b.vz*0.12 : Math.max(0,b.vz);
          b.vx *= 0.95; b.vy *= 0.95;
        }
        const edgeX = Math.max(0,worldWidth/2-b.radius), edgeY = Math.max(0,worldHeight/2-b.radius);
        if (Math.abs(b.x)>edgeX) { b.x=Math.sign(b.x)*edgeX; b.vx *= -0.2; }
        if (Math.abs(b.y)>edgeY) { b.y=Math.sign(b.y)*edgeY; b.vy *= -0.2; }
      }
      for (let i=0; i<balls.length; i++) for (let j=i+1; j<balls.length; j++) {
        const a=balls[i], b=balls[j];
        let dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;
        let distance=Math.hypot(dx,dy,dz), minimum=a.radius+b.radius;
        if (distance>=minimum) continue;
        if (distance<0.0001) { dx=0;dy=0;dz=1;distance=1; }
        const nx=dx/distance,ny=dy/distance,nz=dz/distance;
        const correction=(minimum-distance)*0.5;
        a.x-=nx*correction;a.y-=ny*correction;a.z-=nz*correction;
        b.x+=nx*correction;b.y+=ny*correction;b.z+=nz*correction;
        const relative=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny+(b.vz-a.vz)*nz;
        if(relative<0) {
          if (nz>0.35 && a.landed && !b.landed) impact(b,-relative);
          if (nz<-.35 && b.landed && !a.landed) impact(a,-relative);
          const impulse=-relative*0.52;
          a.vx-=nx*impulse;a.vy-=ny*impulse;a.vz-=nz*impulse;
          b.vx+=nx*impulse;b.vy+=ny*impulse;b.vz+=nz*impulse;
        }
      }
    }
    for (const b of balls) b.z=Math.max(b.radius,b.z);
    while(ripples.length && simulationTime-ripples[0].born>RIPPLE_LIFETIME) ripples.shift();
  }

  function useQuad(program, x,y,radius,dpr) {
    gl.useProgram(program.program);
    gl.uniform2f(program.uniforms.resolution,canvas.width,canvas.height);
    gl.uniform2f(program.uniforms.center,(worldWidth/2+x)*dpr,(worldHeight/2-y)*dpr);
    gl.uniform1f(program.uniforms.radius,radius*dpr);
  }
  function drawScene(dpr) {
    selectLayer(layers[0]);
    gl.clear(gl.COLOR_BUFFER_BIT);
    // Multiply each independent ShaderCode ripple into the white floor.
    gl.blendFunc(gl.DST_COLOR,gl.ZERO);
    for(const ripple of ripples) {
      const age=simulationTime-ripple.born;
      const extent=Math.min(age*85+40,Math.hypot(worldWidth,worldHeight));
      useQuad(rippleProgram,ripple.x,ripple.y,extent,dpr);
      gl.uniform1f(rippleProgram.uniforms.age,age);
      gl.uniform1f(rippleProgram.uniforms.extent,extent);
      gl.drawArrays(gl.TRIANGLES,0,6);
    }
    selectLayer(layers[1]);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    for(const b of balls) {
      const height=Math.max(0,b.z-b.radius);
      useQuad(shadowProgram,b.x+height*.10,b.y+height*.08,b.radius*(1.6+height*.003),dpr);
      gl.uniform1f(shadowProgram.uniforms.strength,0.28/(1+height*.009));
      gl.drawArrays(gl.TRIANGLES,0,6);
    }
    // Higher spheres are nearer the camera and cover lower ones in the pile.
    const sorted=[...balls].sort((a,b)=>a.z-b.z);
    for(const b of sorted) {
      const perspective=CAMERA_HEIGHT/(CAMERA_HEIGHT-Math.min(b.z,650));
      useQuad(sphereProgram,b.x*perspective,b.y*perspective,b.radius*perspective,dpr);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,b.texture);
      gl.uniform1i(sphereProgram.uniforms.snapshot,0);
      gl.uniform1f(sphereProgram.uniforms.rotation,b.rotation);
      gl.drawArrays(gl.TRIANGLES,0,6);
    }
  }
  function frame(now) {
    const dt=document.hidden?0:Math.min((now-previous)/1000,0.05);previous=now;
    worldWidth=innerWidth;worldHeight=innerHeight;
    const dpr=Math.min(devicePixelRatio||1,1.5),w=Math.max(1,Math.round(worldWidth*dpr)),h=Math.max(1,Math.round(worldHeight*dpr));
    for (const layer of layers) {
      if (layer.canvas.width !== w || layer.canvas.height !== h) {
        layer.canvas.width = w; layer.canvas.height = h;
        layer.gl.viewport(0, 0, w, h);
      }
    }
    if (pictureTexture && !document.hidden && balls.length < MAX_SPHERES && simulationTime >= nextSpawn) {
      spawnSphere();
      nextSpawn = simulationTime + SPAWN_INTERVAL;
    }
    accumulator+=dt;
    while(accumulator>=STEP){simulate(STEP);accumulator-=STEP;}
    drawScene(dpr);
    animation=requestAnimationFrame(frame);
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(animation);
    if (pictureTexture) layers[1].gl.deleteTexture(pictureTexture);
    for (const layer of layers) {
      layer.gl.deleteBuffer(layer.quad);
      for (const program of layer.programs) layer.gl.deleteProgram(program.program);
      layer.gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  }
  signal.addEventListener('abort', dispose, { once: true });
  window.addEventListener('pagehide', dispose, { signal });
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); }, { signal });
  for (const layer of layers) layer.canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    if (disposed) return;
    graphicsLost = true;
    cancelAnimationFrame(animation);
    message('Graphics interrupted. Reload to restart the scene.');
  }, { signal });
  message('Loading picture…');
  animation = requestAnimationFrame(frame);
  loadPictureTexture(PICTURE_URL).then(texture => {
    if (disposed || graphicsLost) { layers[1].gl.deleteTexture(texture); return; }
    pictureTexture = texture;
    nextSpawn = simulationTime;
    message('');
  }).catch(() => {
    if (disposed) return;
    message(graphicsLost ? 'Graphics interrupted. Reload to restart the scene.'
      : 'Add your face image at assets/picture-rain/sphere-picture.jpg, then reload.');
  });
};
