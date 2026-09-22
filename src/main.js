(function () {
  "use strict";

  // ================= renderer / scene / camera =================
  var renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  document.body.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  var bgColor = new THREE.Color(0xa9cfe8);
  scene.background = bgColor;

  // fixed camera -> screen top/bottom mapping stays correct
  var D = 16;
  var camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 400);
  camera.position.set(0, 0, D);
  camera.lookAt(0, 0, 0);
  var BASE_CAM = { x: 0, y: 0, z: D };

  var halfH = Math.tan((50 * Math.PI / 180) * 0.5) * D; // vertical half-view at z=0 plane
  var fireBaseY = -halfH * 0.5; // center of the wood pile = middle of lower half of screen

  // ================= colours =================
  var dayTop = new THREE.Color(0x3f8fd6), dayBottom = new THREE.Color(0xeaf4fb), daySky = new THREE.Color(0xa9cfe8);
  var nightTop = new THREE.Color(0x070a18), nightBottom = new THREE.Color(0x16192b), nightSky = new THREE.Color(0x0a0c1a);
  var WHITE = new THREE.Color(0xffffff);

  // ================= sky =================
  var skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color(0x3f8fd6) },
      bottom: { value: new THREE.Color(0xeaf4fb) }
    },
    vertexShader: "varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: [
      "uniform vec3 top; uniform vec3 bottom; varying vec3 vPos;",
      "void main(){",
      "  float h = normalize(vPos).y;",
      "  float t = clamp(h*0.5+0.5, 0.0, 1.0);",
      "  gl_FragColor = vec4(mix(bottom, top, t), 1.0);",
      "}"
    ].join("\n")
  });
  var sky = new THREE.Mesh(new THREE.SphereGeometry(120, 32, 16), skyMat);
  sky.frustumCulled = false;
  scene.add(sky);

  // ================= lights =================
  var hemiL = new THREE.HemisphereLight(0xdfefff, 0xb6bcae, 0.95);
  scene.add(hemiL);
  var sunL = new THREE.DirectionalLight(0xfff2dd, 1.7);
  sunL.position.set(8, 12, 6);
  scene.add(sunL);
  var fillL = new THREE.DirectionalLight(0xcfdfff, 0.4);
  fillL.position.set(-6, 2, 4);
  scene.add(fillL);

  var fireLight = new THREE.PointLight(0xff8a2a, 0, 40, 2);
  fireLight.position.set(0, fireBaseY + 2.0, 3.0);
  scene.add(fireLight);
  var fireLight2 = new THREE.PointLight(0xffb347, 0, 26, 2);
  fireLight2.position.set(0, fireBaseY + 1.4, 2.0);
  scene.add(fireLight2);

  // ================= canvas textures =================
  function makeWoodTexture() {
    var c = document.createElement("canvas");
    c.width = c.height = 512;
    var g = c.getContext("2d");
    var base = g.createLinearGradient(0, 0, 256, 512);
    base.addColorStop(0, "#4a2a10");
    base.addColorStop(0.55, "#38200c");
    base.addColorStop(1, "#241406");
    g.fillStyle = base;
    g.fillRect(0, 0, 512, 512);
    for (var i = 0; i < 340; i++) {
      var x0 = Math.random() * 512;
      var w = 0.5 + Math.random() * 2.6;
      var dark = Math.random() < 0.62;
      var alpha = 0.06 + Math.random() * 0.24;
      g.strokeStyle = dark ? "rgba(10,5,1," + alpha + ")" : "rgba(150,99,50," + alpha + ")";
      g.lineWidth = w;
      var k = 0.002 + Math.random() * 0.024;
      var ph = Math.random() * 6.283;
      var amp = 0.8 + Math.random() * 6;
      g.beginPath();
      g.moveTo(x0, 0);
      for (var y = 0; y <= 512; y += 16) g.lineTo(x0 + Math.sin(y * k + ph) * amp, y);
      g.stroke();
    }
    for (i = 0; i < 6; i++) {
      var kx = Math.random() * 512, ky = Math.random() * 512, kr = 6 + Math.random() * 16;
      var rg = g.createRadialGradient(kx, ky, kr * 0.2, kx, ky, kr);
      rg.addColorStop(0, "rgba(4,2,0,0.7)");
      rg.addColorStop(1, "rgba(4,2,0,0)");
      g.fillStyle = rg;
      g.beginPath(); g.arc(kx, ky, kr, 0, 6.283); g.fill();
    }
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1.6, 1);
    return t;
  }

  function makePuffTexture() {
    var c = document.createElement("canvas");
    c.width = c.height = 128;
    var g = c.getContext("2d");
    var rg = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    rg.addColorStop(0, "rgba(255,255,255,0.9)");
    rg.addColorStop(0.5, "rgba(255,255,255,0.40)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = rg;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  function makeGlowTexture() {
    var c = document.createElement("canvas");
    c.width = c.height = 256;
    var g = c.getContext("2d");
    var rg = g.createRadialGradient(128, 128, 6, 128, 128, 128);
    rg.addColorStop(0, "rgba(255,252,235,1)");
    rg.addColorStop(0.22, "rgba(255,238,175,0.72)");
    rg.addColorStop(0.6, "rgba(255,210,140,0.18)");
    rg.addColorStop(1, "rgba(255,200,110,0)");
    g.fillStyle = rg;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }

  var woodTex = makeWoodTexture();
  var puffTex = makePuffTexture();
  var glowTex = makeGlowTexture();

  function cylBetween(p1, p2, r, material, parent) {
    var dir = new THREE.Vector3().subVectors(p2, p1);
    var len = dir.length();
    var m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 18, 1), material);
    m.position.copy(p1).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    parent.add(m);
    return m;
  }

  // ================= wooden torch (dark, unlit) =================
  var staffMat = new THREE.MeshStandardMaterial({ map: woodTex, color: 0xffffff, roughness: 0.55, metalness: 0.05 });
  var flameMatWood = new THREE.MeshStandardMaterial({ map: woodTex, color: 0x6e4a20, roughness: 0.7, metalness: 0.06 });
  var metalMat = new THREE.MeshStandardMaterial({ color: 0x6a4520, roughness: 0.4, metalness: 0.85 });

  var torch = new THREE.Group();
  var spin = new THREE.Group();
  torch.add(spin);

  var staff = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.36, 3.4, 36, 1), staffMat);
  spin.add(staff);
  function band(y, r) {
    var m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 10, 36), metalMat);
    m.rotation.x = Math.PI / 2;
    m.position.y = y;
    spin.add(m);
  }
  band(-0.9, 0.335);
  band(-0.05, 0.335);
  var cup = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.30, 0.26, 36, 1), metalMat);
  cup.position.y = 1.82;
  spin.add(cup);
  var flamePts = [
    [0.001, 0.00], [0.14, 0.03], [0.26, 0.16], [0.44, 0.45],
    [0.53, 0.78], [0.55, 1.02], [0.48, 1.26], [0.35, 1.45],
    [0.20, 1.60], [0.08, 1.71], [0.001, 1.80]
  ].map(function (p) { return new THREE.Vector2(p[0], p[1]); });
  var flameWood = new THREE.Mesh(new THREE.LatheGeometry(flamePts, 42), flameMatWood);
  flameWood.position.y = 1.88;
  spin.add(flameWood);

  scene.add(torch);
  torch.visible = false;

  var TORCH_MAX = 1.88 + 1.80;
  var TORCH_MIN = -1.7;

  // ================= campfire (bonfire) =================
  var campfire = new THREE.Group();
  campfire.position.set(0, fireBaseY, 0);
  campfire.visible = false;
  scene.add(campfire);

  var logMat = new THREE.MeshStandardMaterial({ map: woodTex, color: 0x9a6a3a, roughness: 0.6, metalness: 0.03 });

  var LOGS = 7;
  for (var li = 0; li < LOGS; li++) {
    var ang = li / LOGS * Math.PI * 2;
    cylBetween(
      new THREE.Vector3(Math.cos(ang) * 1.15, 0.05, Math.sin(ang) * 1.15),
      new THREE.Vector3(Math.cos(ang + 0.35) * 0.18, 1.05, Math.sin(ang + 0.35) * 0.18),
      0.13, logMat, campfire);
  }
  cylBetween(new THREE.Vector3(-0.95, 0.16, 0), new THREE.Vector3(0.95, 0.16, 0), 0.15, logMat, campfire);
  cylBetween(new THREE.Vector3(0, 0.36, -0.95), new THREE.Vector3(0, 0.36, 0.95), 0.15, logMat, campfire);

  // ================= realistic fire (woven flame tongues) =================
  var TONGUE_VERT = [
    "varying vec2 vUv;",
    "void main(){",
    "  vUv = uv;",
    "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
    "}"
  ].join("\n");

  var TONGUE_FRAG = [
    "uniform float uTime;",
    "uniform float uIntensity;",
    "uniform vec3 uColor1; uniform vec3 uColor2; uniform vec3 uColor3;",
    "varying vec2 vUv;",
    "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
    "void main(){",
    "  float h = vUv.y;",
    "  float n = hash(vec2(floor(h * 36.0 + uTime * 5.0), floor(vUv.x * 8.0)));",
    "  float band = smoothstep(0.0, 0.16, h);",
    "  float tip  = 1.0 - smoothstep(0.60, 1.0, h);",
    "  vec3 col = mix(uColor1, uColor2, smoothstep(0.04, 0.45, h));",
    "  col = mix(col, uColor3, smoothstep(0.34, 0.78, h));",
    "  float flick = 0.80 + 0.20 * sin(uTime * 11.0 + h * 19.0) + 0.12 * n;",
    "  float edge = 1.0 - smoothstep(0.12, 0.55, abs(vUv.x - 0.5) * 2.0);",
    "  float alpha = band * tip * flick * uIntensity * (0.5 + 0.5 * edge);",
    "  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));",
    "}"
  ].join("\n");

  function tongueMat(c1, c2, c3) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uIntensity: { value: 0 },
        uColor1: { value: new THREE.Color(c1) },
        uColor2: { value: new THREE.Color(c2) },
        uColor3: { value: new THREE.Color(c3) }
      },
      vertexShader: TONGUE_VERT, fragmentShader: TONGUE_FRAG,
      transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide
    });
  }

  function makeTongue(width, height, segs, mat) {
    var pos = new Float32Array((segs + 1) * 6);
    var uv = new Float32Array((segs + 1) * 4);
    var idx = [];
    for (var i = 0; i <= segs; i++) {
      var h = i / segs;
      pos[i * 6 + 0] = -width * 0.5; pos[i * 6 + 1] = h * height; pos[i * 6 + 2] = 0;
      pos[i * 6 + 3] = width * 0.5;  pos[i * 6 + 4] = h * height; pos[i * 6 + 5] = 0;
      uv[i * 4 + 0] = 0; uv[i * 4 + 1] = h;
      uv[i * 4 + 2] = 1; uv[i * 4 + 3] = h;
    }
    for (i = 0; i < segs; i++) {
      var a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
      idx.push(a, c, b, b, c, d);
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    var mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    var rnd = [Math.random() * 6.28, Math.random() * 6.28, 0.8 + Math.random() * 0.5];
    return { mesh: mesh, height: height, segs: segs, baseWidth: width, pos: pos, rnd: rnd };
  }

  function updateTongue(tg, t, ampMul) {
    var pos = tg.pos, segs = tg.segs, H = tg.height, W = tg.baseWidth, r = tg.rnd;
    for (var i = 0; i <= segs; i++) {
      var h = i / segs;
      var pow = Math.pow(h, 1.45);
      var sx = Math.sin(t * r[2] * 1.4 + i * 0.42) * 0.10 * pow + Math.sin(t * 7.0 + i * 0.8) * 0.035 * pow;
      var sz = Math.cos(t * r[2] * 1.1 + i * 0.5) * 0.10 * pow + Math.cos(t * 6.2 + i * 0.66) * 0.035 * pow;
      var ww = W * (0.16 + 0.84 * (1 - h)) * (0.92 + 0.08 * Math.sin(t * 9.0 + i * 0.55)) * ampMul;
      pos[i * 6 + 0] = sx - ww * 0.5; pos[i * 6 + 1] = h * H; pos[i * 6 + 2] = sz - ww * 0.12;
      pos[i * 6 + 3] = sx + ww * 0.5; pos[i * 6 + 4] = h * H; pos[i * 6 + 5] = sz + ww * 0.12;
    }
    tg.mesh.geometry.attributes.position.needsUpdate = true;
  }

  var flameFireGroup = new THREE.Group();
  flameFireGroup.position.y = 0.35;
  campfire.add(flameFireGroup);

  var outerMat = tongueMat(0xff7a1a, 0xff4a06, 0x8a1600);
  var midMat = tongueMat(0xffe9b0, 0xffc14a, 0xff5a06);
  var coreMat = tongueMat(0xbfe3ff, 0xffffff, 0xffe9a8);

  var tongues = [];
  function addTongue(width, height, mat, spread) {
    var tg = makeTongue(width, height, 16, mat);
    tg.mesh.rotation.y = (Math.random() - 0.5) * spread;
    flameFireGroup.add(tg.mesh);
    tongues.push({ tg: tg, mat: mat });
  }
  var i;
  for (i = 0; i < 8; i++) addTongue(1.10 + Math.random() * 0.35, 3.6 + Math.random() * 1.4, outerMat, Math.PI * 2);
  for (i = 0; i < 5; i++) addTongue(0.55 + Math.random() * 0.22, 2.5 + Math.random() * 0.9, midMat, Math.PI * 2);
  for (i = 0; i < 2; i++) addTongue(0.26 + Math.random() * 0.1, 1.2 + Math.random() * 0.5, coreMat, Math.PI * 1.2);

  // hot glowing base pool
  var fireGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xffa14a, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
  }));
  fireGlow.position.y = 1.3;
  fireGlow.scale.set(9, 9, 1);
  flameFireGroup.add(fireGlow);

  var groundPool = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xff6a1e, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
  }));
  groundPool.position.set(0, -0.22, 0);
  groundPool.scale.set(7.5, 2.2, 1);
  campfire.add(groundPool);

  // huge warm haze that "replaces the sky"
  var haze = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xff6a1e, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
  }));
  haze.position.set(0, fireBaseY + 2.2, -6);
  haze.scale.set(48, 36, 1);
  scene.add(haze);

  // dark ground silhouette
  var groundDisc = new THREE.Mesh(
    new THREE.CircleGeometry(60, 48),
    new THREE.MeshBasicMaterial({ color: 0x0d0a08, transparent: true, opacity: 0, depthWrite: false })
  );
  groundDisc.rotation.x = -Math.PI / 2;
  groundDisc.position.y = fireBaseY - 0.3;
  scene.add(groundDisc);

  // ================= background props (day) =================
  var clouds = [];
  for (var ci = 0; ci < 8; ci++) {
    var cs = new THREE.Sprite(new THREE.SpriteMaterial({
      map: puffTex, color: 0xffffff, transparent: true, opacity: 0.5 + Math.random() * 0.4, depthWrite: false
    }));
    var cw = 5 + Math.random() * 12;
    cs.scale.set(cw, cw * 0.35, 1);
    cs.position.set((Math.random() - 0.5) * 26, 2.5 + Math.random() * 7, -8 - Math.random() * 14);
    cs.userData.spd = 0.15 + Math.random() * 0.35;
    cs.userData.baseOp = cs.material.opacity;
    scene.add(cs);
    clouds.push(cs);
  }
  var sun = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xffe9c0, transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  sun.position.set(7, 6.5, -24);
  sun.scale.set(11, 11, 1);
  scene.add(sun);

  var stars = [];
  for (var sti = 0; sti < 100; sti++) {
    var sm = new THREE.SpriteMaterial({
      map: glowTex, color: sti % 7 === 0 ? 0xffd9a0 : 0xbfd4ff,
      transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false
    });
    var st = new THREE.Sprite(sm);
    var ss = 0.2 + Math.random() * 0.36;
    st.scale.set(ss, ss, 1);
    st.position.set((Math.random() - 0.5) * 42, 1.5 + Math.random() * 19, -22 - Math.random() * 20);
    st.userData = { ph: Math.random() * 6.28, spd: 0.5 + Math.random() * 1.6 };
    scene.add(st);
    stars.push(st);
  }

  // ================= dust particles (torch impact) =================
  var dust = [];
  var bottomEdgeY = -halfH + 0.3;
  function spawnDust() {
    var n = 24;
    for (var i = 0; i < n; i++) {
      var sm = new THREE.SpriteMaterial({ map: puffTex, color: 0xd8c9a8, transparent: true, opacity: 0.65, depthWrite: false });
      var s = new THREE.Sprite(sm);
      s.position.set((Math.random() - 0.5) * 2.4, bottomEdgeY + Math.random() * 0.5, (Math.random() - 0.5) * 1.2);
      var sc = 0.5 + Math.random() * 0.9;
      s.scale.set(sc, sc, 1);
      s.userData = { vx: (Math.random() - 0.5) * 2.6, vy: 1.5 + Math.random() * 2.6, life: 0, max: 1.1 + Math.random() * 0.6, base: sc };
      scene.add(s);
      dust.push(s);
    }
  }
  function updateDust(dt) {
    for (var i = dust.length - 1; i >= 0; i--) {
      var s = dust[i], u = s.userData;
      u.life += dt;
      u.vy -= 2.0 * dt;
      u.vx *= (1 - 1.2 * dt);
      s.position.x += u.vx * dt;
      s.position.y += u.vy * dt;
      var k = 1 + u.life * 1.4;
      s.scale.set(u.base * k, u.base * k, 1);
      s.material.opacity = 0.65 * Math.max(0, 1 - u.life / u.max);
      if (u.life >= u.max) { scene.remove(s); s.material.dispose(); dust.splice(i, 1); }
    }
  }

  // ================= embers / sparks =================
  var embers = [];
  var emberAcc = 0;
  function resetEmber(s) {
    s.position.set((Math.random() - 0.5) * 1.5, fireBaseY + 0.5 + Math.random() * 1.8, (Math.random() - 0.5) * 1.1);
    var u = s.userData;
    u.vx = (Math.random() - 0.5) * 1.2;
    u.vy = 1.3 + Math.random() * 2.9;
    u.vz = (Math.random() - 0.5) * 0.9;
    u.life = 0; u.max = 0.8 + Math.random() * 1.5;
    u.base = 0.07 + Math.random() * 0.2;
    u.trail = 1.0 + Math.random() * 1.2;
    s.material.color.setHSL(0.055 + Math.random() * 0.09, 0.95, 0.45 + Math.random() * 0.35);
  }
  function spawnEmber() {
    var sm = new THREE.SpriteMaterial({
      map: glowTex, color: 0xffd27a, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
    });
    var s = new THREE.Sprite(sm);
    s.userData = { vx: 0, vy: 0, vz: 0, life: 0, max: 1, base: 0.12, trail: 1.6 };
    resetEmber(s);
    scene.add(s);
    embers.push(s);
  }
  function updateEmbers(dt, t) {
    if (fireE > 0.4 && fireActive) {
      emberAcc += dt * 30;
      var cap = 70;
      while (emberAcc > 1) {
        emberAcc -= 1;
        var made = false;
        for (var j = 0; j < embers.length; j++) {
          if (embers[j].userData.life >= embers[j].userData.max) { resetEmber(embers[j]); made = true; break; }
        }
        if (!made && embers.length < cap) spawnEmber();
      }
    }
    for (var i = embers.length - 1; i >= 0; i--) {
      var s = embers[i], u = s.userData;
      u.life += dt;
      if (u.life >= u.max) {
        if (fireE > 0.4 && fireActive) { resetEmber(s); }
        else {
          s.material.opacity = 0;
          if (fireE < 0.05 && !fireActive) { scene.remove(s); s.material.dispose(); embers.splice(i, 1); }
        }
        continue;
      }
      u.vy += 1.5 * dt;
      u.vz += 0.6 * dt;
      s.position.x += u.vx * dt;
      s.position.y += u.vy * dt;
      s.position.z += u.vz * dt;
      var p = 1 - u.life / u.max;
      var tw = 0.55 + 0.45 * Math.sin(t * 21.0 + i * 1.7);
      s.material.opacity = Math.min(1, 1.4 * p) * tw;
      var sc = u.base * (0.5 + p * 1.1);
      s.scale.set(sc * u.trail, sc, 1);
      s.material.rotation = Math.atan2(u.vy, u.vx) + Math.PI / 2;
    }
  }

  // ================= fireflies around the flame =================
  var fireflies = [];
  for (var ffi = 0; ffi < 8; ffi++) {
    var ff = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0xffd27a, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
    }));
    ff.userData = { ang: ffi / 8 * Math.PI * 2, r: 1.6 + ffi * 0.13, y: 0.8 + (ffi % 4) * 0.7, spd: 0.3 + (ffi % 3) * 0.16, ph: Math.random() * 6.28 };
    var fs = 0.16 + Math.random() * 0.14;
    ff.scale.set(fs, fs, 1);
    scene.add(ff);
    fireflies.push(ff);
  }

  // ================= smoke =================
  var smokes = [];
  function resetSmoke(s) {
    s.position.set((Math.random() - 0.5) * 1.4, fireBaseY + 1.0 + Math.random() * 1.6, (Math.random() - 0.5) * 1.1);
    var u = s.userData;
    u.vx = (Math.random() - 0.5) * 0.5;
    u.vy = 0.75 + Math.random() * 1.0;
    u.life = 0; u.max = 3.2 + Math.random() * 2.2;
    u.base = 0.9 + Math.random() * 1.5;
  }
  function updateSmoke(dt) {
    if (fireE > 0.55 && fireActive) {
      for (var i = 0; i < smokes.length; i++) { if (smokes[i].userData.life >= smokes[i].userData.max) { resetSmoke(smokes[i]); break; } }
    }
    for (var i = smokes.length - 1; i >= 0; i--) {
      var s = smokes[i], u = s.userData;
      u.life += dt;
      if (u.life >= u.max) { s.material.opacity = 0; continue; }
      u.vx *= (1 - 0.4 * dt);
      s.position.x += u.vx * dt;
      s.position.y += u.vy * dt;
      var p = u.life / u.max;
      s.material.opacity = fireE * 0.18 * Math.sin(Math.PI * Math.min(p * 1.15, 1.0));
      var sc = u.base * (0.8 + p * 2.1);
      s.scale.set(sc, sc, 1);
    }
  }
  for (var smi = 0; smi < 16; smi++) {
    var smMat = new THREE.SpriteMaterial({ map: puffTex, color: 0x8a8f96, transparent: true, opacity: 0, depthWrite: false });
    var sm = new THREE.Sprite(smMat);
    sm.userData = { vx: 0, vy: 0, life: 1, max: 1, base: 1 };
    resetSmoke(sm); sm.material.opacity = 0;
    scene.add(sm);
    smokes.push(sm);
  }

  // ================= logo =================
  var logoTexture = null;
  var logo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: null, color: 0xffffff, transparent: true, opacity: 0,
    depthTest: false, depthWrite: false, toneMapped: false
  }));
  logo.position.set(0, 0.2, 0);
  logo.scale.set(1, 1, 1);
  logo.renderOrder = 50;
  scene.add(logo);

  var logoGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xffd27a, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false
  }));
  logoGlow.position.set(0, 0.2, -1);
  logoGlow.scale.set(20, 20, 1);
  logoGlow.renderOrder = 49;
  scene.add(logoGlow);

  function loadLogo() {
    if (typeof window.LOGO_B64 === "string" && window.LOGO_B64.length > 0) {
      var img = new Image();
      img.onload = function () {
        var t = new THREE.Texture(img);
        t.needsUpdate = true;
        t.minFilter = THREE.LinearFilter;
        t.generateMipmaps = false;
        logoTexture = t;
        logo.material.map = t;
        logo.material.needsUpdate = true;
        var worldH = halfH * 1.5;
        logo.scale.set(worldH * t.image.width / t.image.height, worldH, 1);
      };
      img.src = "data:image/png;base64," + window.LOGO_B64;
    }
  }
  loadLogo();

  // ================= fireworks =================
  var explosions = [];
  var boomSched = [];
  var PALETTE = [0xffe27a, 0xff5a5a, 0x62dcff, 0x74ffa0, 0xff77e0, 0xffffff, 0xffa63c, 0x8ea2ff];

  function spawnExplosion(x, y, color) {
    var col = new THREE.Color(color);
    var mat = new THREE.SpriteMaterial({
      map: glowTex, color: col.clone(), transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
    });
    var parts = [];
    var N = 48;
    for (var i = 0; i < N; i++) {
      var s = new THREE.Sprite(mat);
      var a = Math.random() * Math.PI * 2;
      var sp = 0.9 + Math.pow(Math.random(), 0.6) * 4.6;
      s.userData = {
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0, max: 0.7 + Math.random() * 1.05,
        base: 0.09 + Math.random() * 0.18,
        whiteAt: 0.75 + Math.random() * 0.25
      };
      s.position.set(x, y, 0.3 + Math.random() * 0.7);
      s.scale.set(0.05, 0.05, 1);
      scene.add(s);
      parts.push(s);
    }
    var flash = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0xffffff, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
    }));
    flash.position.set(x, y, 0.3);
    flash.scale.set(0.2, 0.2, 1);
    flash.userData = { life: 0, max: 0.24 };
    scene.add(flash);
    explosions.push({ mat: mat, col: col, parts: parts, flash: flash });
  }

  function updateExplosions(dt) {
    for (var e = explosions.length - 1; e >= 0; e--) {
      var ex = explosions[e];
      if (ex.flash) {
        var fl = ex.flash;
        fl.userData.life += dt;
        var flp = fl.userData.life / fl.userData.max;
        if (flp >= 1) { scene.remove(fl); fl.material.dispose(); ex.flash = null; }
        else { fl.material.opacity = 1 - flp; fl.scale.setScalar(0.3 + flp * 4.0); }
      }
      var alive = 0;
      for (var i = 0; i < ex.parts.length; i++) {
        var s = ex.parts[i], u = s.userData;
        u.life += dt;
        if (u.life >= u.max) { s.material.opacity = 0; s.scale.set(0.01, 0.01, 1); continue; }
        u.vx *= (1 - 2.4 * dt);
        u.vy *= (1 - 1.7 * dt);
        u.vy -= 1.35 * dt;
        s.position.x += u.vx * dt;
        s.position.y += u.vy * dt;
        var p = u.life / u.max;
        var op = Math.min(1, p * 7.0) * (1 - p);
        var sc = u.base * (0.4 + p * 2.6) * (1 - p * 0.35);
        s.scale.set(sc * (1 + p * 1.35), sc, 1);
        s.material.rotation = Math.atan2(u.vy, u.vx) + Math.PI / 2;
        s.material.opacity = op;
        var wh = Math.max(0, (p - u.whiteAt));
        s.material.color.copy(ex.col).lerp(WHITE, Math.min(1, wh * 5));
        alive++;
      }
      if (!ex.flash && alive === 0) {
        for (var j = 0; j < ex.parts.length; j++) { scene.remove(ex.parts[j]); }
        ex.mat.dispose();
        explosions.splice(e, 1);
      }
    }
  }

  function clearFireworks() {
    for (var e = 0; e < explosions.length; e++) {
      for (var j = 0; j < explosions[e].parts.length; j++) scene.remove(explosions[e].parts[j]);
      if (explosions[e].flash) { scene.remove(explosions[e].flash); explosions[e].flash.material.dispose(); }
      explosions[e].mat.dispose();
    }
    explosions = [];
    boomSched = [];
  }

  function scheduleBooms() {
    boomSched = [];
    boomSched.push({ t: 0.10, x: 0, y: 1.2, color: 0xffe27a, big: true });
    var N = 15;
    for (var i = 0; i < N; i++) {
      var a = i / N * Math.PI * 2 + Math.random() * 0.5;
      var r = 4.2 + Math.random() * 3.8;
      boomSched.push({
        t: 0.25 + i * 0.17 + Math.random() * 0.1,
        x: Math.cos(a) * r,
        y: Math.sin(a) * r * 0.72 + 0.4,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)]
      });
    }
  }

  // ================= ambient sparkles around logo =================
  var ambient = [];
  for (var asi = 0; asi < 46; asi++) {
    var asp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: PALETTE[Math.floor(Math.random() * PALETTE.length)], transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
    }));
    var aa = Math.random() * Math.PI * 2;
    var ar = 2.6 + Math.random() * 5.6;
    asp.position.set(Math.cos(aa) * ar, Math.sin(aa) * ar * 0.72, -0.5 + Math.random() * 1.5);
    var asz = 0.14 + Math.random() * 0.3;
    asp.scale.set(asz, asz, 1);
    asp.userData = { ph: Math.random() * 6.28, spd: 1.0 + Math.random() * 2.5, op: 0.4 + Math.random() * 0.6 };
    scene.add(asp);
    ambient.push(asp);
  }

  // ================= physics / state =================
  var GRAV = 22;
  var REST = 0.52;
  var stage = "IDLE";     // IDLE | FALLING | GROUND | FIRE | LOGO | FADEOUT
  var centerY = 0, vy = 0, bounces = 0;
  var squash = 1;
  var tumbleSpeed = 1.9;
  var shake = { mag: 0 };

  var fireActive = false;
  var fireTarget = 0;
  var fireE = 0;
  var flare = 0;

  var logoE = 0;
  var logoT = 0;
  var logoRevealed = false;
  var fadeT = 0;

  function spawnY() { return halfH + (-TORCH_MIN) + 1.5; }
  function floorY() { return -halfH - TORCH_MAX - 0.5; }

  function startDrop() {
    stage = "FALLING";
    bounces = 0; vy = 0; squash = 1; tumbleSpeed = 1.9;
    centerY = spawnY();
    spin.rotation.x = Math.random() * Math.PI * 2;
    spin.rotation.y = Math.random() * Math.PI * 2;
    torch.visible = true;
    torch.position.set(0, centerY, 0);
  }

  function onAction() {
    if (stage === "FALLING") return;
    if (stage === "FADEOUT") return;
    if (stage === "IDLE") { startDrop(); return; }
    if (stage === "GROUND") {
      // light the bonfire
      fireActive = true;
      fireTarget = 1;
      flare = 1;
      stage = "FIRE";
      return;
    }
    if (stage === "FIRE") {
      // hide the fire, begin logo + fireworks
      fireActive = false;
      fireTarget = 0;
      stage = "LOGO";
      logoT = 0; logoE = 0; logoRevealed = false;
      scheduleBooms();
      return;
    }
    if (stage === "LOGO") {
      stage = "FADEOUT";
      fadeT = 0;
      return;
    }
  }

  // ================= controls (no on-screen text) =================
  window.addEventListener("keydown", function (e) {
    if (e.code === "Space") { e.preventDefault(); onAction(); }
    else if (e.code === "KeyF") {
      e.preventDefault();
      if (document.fullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen();
      } else {
        var el = document.documentElement;
        if (el.requestFullscreen) el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      }
    }
  });
  window.addEventListener("pointerdown", function (e) {
    if (e.target === renderer.domElement) onAction();
  });
  window.addEventListener("resize", function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ================= animate =================
  var clock = new THREE.Clock();

  function easeOutBack(x) { var c = 1.70158; var p = x - 1; return 1 + (c + 1) * p * p * p + c * p * p; }

  function updateClouds(dt) {
    for (var i = 0; i < clouds.length; i++) {
      var c = clouds[i];
      c.position.x += c.userData.spd * dt;
      if (c.position.x > 16) c.position.x = -16;
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    var dt = Math.min(clock.getDelta(), 0.05);
    var t = clock.elapsedTime;

    // ---------- fire level easing ----------
    var k = (stage === "LOGO" || stage === "FADEOUT") ? 5.0 : (fireActive ? 1.4 : 1.2);
    fireE += (fireTarget - fireE) * Math.min(1, dt * k);
    if (Math.abs(fireE - fireTarget) < 0.002) fireE = fireTarget;
    if (flare > 0) flare *= Math.exp(-3.4 * dt);
    var ap = Math.sqrt(fireE); // flame growth curve

    // ---------- logo easing ----------
    if (stage === "LOGO") {
      logoT += dt;
      if (!logoRevealed && logoT > 0.55) logoRevealed = true;
      var lt = logoRevealed ? Math.min(1, (logoT - 0.55) / 0.8) : 0;
      logoE = lt;
      // schedule booms
      for (var bi = 0; bi < boomSched.length; bi++) {
        var bm = boomSched[bi];
        if (!bm.done && logoT >= bm.t) { bm.done = true; spawnExplosion(bm.x, bm.y, bm.color); }
      }
    } else if (stage === "FADEOUT") {
      fadeT += dt;
      logoE = Math.max(0, logoE - dt * 1.6);
      if (logoE <= 0.001 && fadeT > 0.35) {
        logoE = 0;
        stage = "IDLE";
        logoRevealed = false;
        clearFireworks();
        lastFrameLogoE = 0;
      }
    } else {
      logoE = 0;
    }

    var dark = Math.min(1, fireE + logoE); // atmosphere darkness level

    // ---------- atmosphere ----------
    skyMat.uniforms.top.value.lerpColors(dayTop, nightTop, dark);
    skyMat.uniforms.bottom.value.lerpColors(dayBottom, nightBottom, dark);
    bgColor.lerpColors(daySky, nightSky, dark);

    hemiL.intensity = 0.95 * (1 - dark) + 0.16 * dark;
    sunL.intensity = 1.7 * (1 - dark) + 0.08 * dark;
    fillL.intensity = 0.4 * (1 - dark) + 0.1 * dark;

    sun.material.opacity = 1 - dark;
    for (var ci2 = 0; ci2 < clouds.length; ci2++) clouds[ci2].material.opacity = clouds[ci2].userData.baseOp * (1 - dark);
    for (var si2 = 0; si2 < stars.length; si2++) {
      var sts = stars[si2];
      var tw = 0.45 + 0.55 * Math.max(0, Math.sin(t * sts.userData.spd + sts.userData.ph));
      sts.material.opacity = dark * dark * tw * 0.95;
    }
    groundDisc.material.opacity = 0.92 * dark;

    // ---------- fire visuals ----------
    var flick = 0.88 + 0.12 * Math.sin(t * 12.0) + 0.05 * Math.sin(t * 27.0 + 2.0);
    for (var ti = 0; ti < tongues.length; ti++) {
      updateTongue(tongues[ti].tg, t, ap);
      tongues[ti].mat.uniforms.uTime.value = t;
      tongues[ti].mat.uniforms.uIntensity.value = fireE * (0.85 + 0.15 * flick);
    }
    fireGlow.material.opacity = 0.55 * fireE * flick * (1 + flare * 0.8);
    var gs2 = 9 * (0.7 + 0.4 * fireE) * (1 + flare * 0.5);
    fireGlow.scale.set(gs2, gs2, 1);
    groundPool.material.opacity = 0.5 * fireE * flick;
    haze.material.opacity = 0.3 * fireE * (0.85 + 0.15 * Math.sin(t * 6.0));
    fireLight.intensity = 9 * fireE * flick * (1 + flare * 0.7);
    fireLight2.intensity = 6 * fireE * flick;

    campfire.visible = fireE > 0.004;
    campfire.scale.setScalar(1);

    for (var ffi2 = 0; ffi2 < fireflies.length; ffi2++) {
      var fa = fireflies[ffi2];
      var ffd = fa.userData;
      var fx = Math.cos(t * ffd.spd + ffd.ang) * ffd.r;
      var fz = Math.sin(t * ffd.spd + ffd.ang) * ffd.r * 0.6;
      fa.position.set(fx, fireBaseY + ffd.y + 0.4 + Math.sin(t * 1.3 + ffd.ph) * 0.25, fz);
      fa.material.opacity = fireE * (0.35 + 0.65 * Math.max(0, Math.sin(t * ffd.spd * 3 + ffd.ph)));
    }

    // ---------- particles ----------
    updateDust(dt);
    updateEmbers(dt, t);
    updateSmoke(dt);
    updateExplosions(dt);

    // ---------- logo presentation ----------
    if (logoE > 0) {
      logo.material.opacity = Math.min(1, logoE) * (logoTexture ? 1 : 0);
      var pop = easeOutBack(Math.min(1, logoE));
      if (logoTexture) {
        var wh = halfH * 1.5;
        logo.scale.set(wh * (logoTexture.image.width / logoTexture.image.height) * pop, wh * pop, 1);
      }
      logoGlow.material.opacity = 0.22 * logoE * (0.8 + 0.2 * Math.sin(t * 4.0));
    } else {
      logo.material.opacity = 0;
      logoGlow.material.opacity = 0;
    }
    for (var asi2 = 0; asi2 < ambient.length; asi2++) {
      var asp2 = ambient[asi2];
      asp2.material.opacity = logoE * asp2.userData.op * Math.max(0, Math.sin(t * asp2.userData.spd + asp2.userData.ph));
      var drift = Math.sin(t * 0.4 + asi2) * 0.3;
      asp2.position.x += drift * dt * 0.2;
    }

    // ---------- torch fall ----------
    if (stage === "FALLING") {
      vy -= GRAV * dt;
      centerY += vy * dt;
      spin.rotation.x += tumbleSpeed * dt;
      spin.rotation.y += 0.45 * dt;

      if (centerY <= floorY()) {
        if (bounces === 0) {
          vy = -vy * REST;
          bounces = 1;
          squash = 0.82;
          tumbleSpeed = -tumbleSpeed * 0.75;
          spawnDust();
          shake.mag = 0.6;
        } else if (vy < 0 && centerY <= floorY() - 6) {
          stage = "GROUND";
          torch.visible = false;
        }
      }
      torch.position.y = centerY;
      torch.rotation.z = Math.sin(t * 7.0) * 0.12;
    }

    if (squash < 1) squash += (1 - squash) * Math.min(1, dt * 10);
    if (squash > 0.999) squash = 1;
    torch.scale.set(2 - squash, squash, 2 - squash);

    // ---------- camera shake ----------
    if (shake.mag > 0.001) {
      camera.position.x = BASE_CAM.x + (Math.random() - 0.5) * 2 * shake.mag;
      camera.position.y = BASE_CAM.y + (Math.random() - 0.5) * 2 * shake.mag;
      camera.position.z = BASE_CAM.z;
      camera.lookAt(0, 0, 0);
      shake.mag *= Math.exp(-6 * dt);
    } else {
      camera.position.set(BASE_CAM.x, BASE_CAM.y, BASE_CAM.z);
      camera.lookAt(0, 0, 0);
    }

    renderer.render(scene, camera);
  }
  animate();
})();
