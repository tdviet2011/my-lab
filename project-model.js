import * as THREE from './vendor/three.module.js';

// Procedural 3D model for one project type. Illustrative only; geometry is generated locally.
export function createProjectModel({ canvas, type = 'cpu', reducedMotion = false, label = () => {} }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); renderer.setClearColor(0, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 1, .1, 80);
  scene.add(new THREE.AmbientLight(0xbad6ff, 1.4));
  const key = new THREE.DirectionalLight(0xdcecff, 3.2); key.position.set(-4, 8, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0x57ead7, 2.2); rim.position.set(5, 3, -4); scene.add(rim);
  const mat = (color, metalness = .5, roughness = .4, extra = {}) => new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  const glowMat = color => new THREE.MeshBasicMaterial({ color });
  const root = new THREE.Group(); scene.add(root);
  const animated = [];
  const box = (w, h, d, m, x = 0, y = 0, z = 0, parent = root) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); parent.add(o); return o; };
  const cyl = (rt, rb, h, m, x = 0, y = 0, z = 0, seg = 24, parent = root) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.position.set(x, y, z); parent.add(o); return o; };
  const pcb = mat(0x10303a, .4, .6), dark = mat(0x16222c, .6, .35), metal = mat(0x9fb3c2, .9, .25), gold = mat(0xc9a55a, .85, .25), silicon = mat(0x5a6f9a, .55, .25), cyanGlow = glowMat(0x6ce9d9);
  const grid = new THREE.GridHelper(14, 28, 0x27404c, 0x183040); grid.position.y = -.6; grid.material.transparent = true; grid.material.opacity = .35; scene.add(grid);
  let title = '';

  if (type === 'amplifier') {
    title = 'MOSFET · cặp vi sai & tầng khuếch đại';
    box(6, .2, 4, pcb, 0, -.45, 0);
    // Two NMOS transistors (differential pair) as layered cross-sections
    for (const x of [-1.4, 1.4]) {
      const g = new THREE.Group(); g.position.set(x, 0, 0); root.add(g);
      box(1.8, .5, 1.6, mat(0x3d4e7a, .3, .5), 0, -.1, 0, g);       // p-substrate
      box(.45, .12, 1.6, mat(0x7a5bb0, .3, .4), -.6, .2, 0, g);      // n+ source
      box(.45, .12, 1.6, mat(0x7a5bb0, .3, .4), .6, .2, 0, g);       // n+ drain
      box(.7, .05, 1.6, mat(0xd8e6f0, .1, .2, { transparent: true, opacity: .7 }), 0, .2, 0, g); // oxide
      box(.7, .3, 1.6, mat(0xb84a4a, .4, .35), 0, .37, 0, g);         // poly gate
      for (const cx of [-.6, 0, .6]) cyl(.07, .07, .9, metal, cx, .75, 0, 12, g);
      const ch = box(.6, .02, 1.5, glowMat(0x6ce9d9), 0, .15, 0, g); animated.push(t => { ch.material.color.setHSL(.47, .7, .35 + .25 * Math.sin(t * 3 + x)); });
    }
    box(4.2, .06, .12, gold, 0, 1.2, -.5); box(4.2, .06, .12, gold, 0, 1.2, .5);
    // Signal particles flowing through the channel
    const dots = Array.from({ length: 24 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(.04, 8, 6), cyanGlow); root.add(m); return { m, o: i / 24 }; });
    animated.push(t => dots.forEach(({ m, o }) => { const u = (t * .25 + o) % 1; const side = o < .5 ? -1.4 : 1.4; m.position.set(side - .6 + u * 1.2, .16, (o * 7 % 1 - .5) * 1.2); }));
  } else if (type === 'fpga') {
    title = 'FPGA · mảng CLB, định tuyến và I/O';
    box(5.4, .2, 5.4, pcb, 0, -.45, 0);
    box(3.6, .25, 3.6, dark, 0, -.22, 0);
    const cells = [];
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const c = box(.32, .12, .32, mat(0x1f4d5a, .5, .4, { emissive: 0x000000 }), -1.4 + i * .4, -.03, -1.4 + j * .4); cells.push(c); }
    animated.push(t => { const step = Math.floor(t * 4); cells.forEach((c, k) => { const on = ((step >> (k % 6)) & 1) && (k % 3 !== step % 3); c.material.emissive.setHex(on ? 0x2a8f88 : 0x000000); c.position.y = on ? .0 : -.03; }); });
    for (let k = 0; k < 9; k++) { box(3.4, .015, .03, gold, 0, .04, -1.6 + k * .4); box(.03, .015, 3.4, gold, -1.6 + k * .4, .04, 0); }
    for (let k = 0; k < 12; k++) for (const s of [-1, 1]) { box(.12, .08, .35, metal, -2.2 + k * .4, -.3, s * 2.05); box(.35, .08, .12, metal, s * 2.05, -.3, -2.2 + k * .4); }
  } else if (type === 'lowpower') {
    title = 'Cây clock · vùng được gating tắt khi rảnh';
    box(6, .2, 4.6, pcb, 0, -.45, 0);
    const domains = [];
    for (let i = 0; i < 4; i++) { const x = -2.1 + i * 1.4; const d = box(1.1, .35, 1.4, mat(0x2d4a6b, .4, .4, { emissive: 0x000000 }), x, -.15, 1); domains.push(d); box(.06, .04, 1.4, gold, x, .02, -.3); }
    box(4.4, .05, .08, gold, 0, .02, -1); cyl(.3, .3, .4, mat(0x7a5bb0, .4, .3), -2.6, -.15, -1);
    const gates = domains.map((d, i) => box(.3, .25, .3, mat(0xe6c27a, .6, .3, { emissive: 0x000000 }), d.position.x, -.12, -.3));
    animated.push(t => domains.forEach((d, i) => { const on = Math.sin(t * 1.3 + i * 1.7) > -.1; d.material.emissive.setHex(on ? 0x1d6d6a : 0x000000); d.material.opacity = 1; gates[i].material.emissive.setHex(on ? 0x5a4410 : 0x000000); d.scale.y = on ? 1 : .85; }));
  } else if (type === 'adc') {
    title = 'SAR ADC · tụ DAC, bộ so sánh và logic';
    box(6, .2, 4.4, pcb, 0, -.45, 0);
    const caps = []; for (let i = 0; i < 6; i++) { const w = .2 + i * .14; const c = box(w, .5, .7, mat(0x4a6fa0, .5, .35, { emissive: 0 }), -2.3 + i * .75 + w / 2, -.1, -1); caps.push(c); }
    const comp = new THREE.Mesh(new THREE.ConeGeometry(.55, 1, 3), mat(0x6ce9d9, .3, .4, { emissive: 0x0c3a36 })); comp.rotation.z = -Math.PI / 2; comp.position.set(1.2, .1, -1); root.add(comp);
    box(1.4, .4, 1.2, dark, 1.6, -.15, 1.1);
    const bits = Array.from({ length: 6 }, (_, i) => box(.16, .12, .16, mat(0x223344, .4, .4, { emissive: 0 }), 1.05 + i * .22, .12, 1.1));
    animated.push(t => { const code = Math.round((Math.sin(t * .8) * .5 + .5) * 63); const step = Math.floor(t * 6) % 7; bits.forEach((b, i) => { const v = (code >> (5 - i)) & 1; b.material.emissive.setHex(i < step && v ? 0x2cbfae : 0); }); caps.forEach((c, i) => c.material.emissive.setHex(5 - i === step ? 0x284a7a : 0)); });
    box(2.6, .03, .08, gold, -.6, .05, -1); box(.08, .03, 2, gold, 1.2, .05, 0);
  } else if (type === 'filter') {
    title = 'Mạch lọc RC · điện trở, tụ và đường tín hiệu';
    box(6, .2, 3.6, pcb, 0, -.45, 0);
    const res = cyl(.18, .18, 1.2, mat(0xc9a27a, .2, .6), -1, -.1, 0); res.rotation.z = Math.PI / 2;
    for (let i = 0; i < 4; i++) { const band = cyl(.19, .19, .08, glowMat([0x8b4513, 0x111111, 0xd03030, 0xc9a55a][i]), -1.4 + i * .25, -.1, 0); band.rotation.z = Math.PI / 2; }
    cyl(.35, .35, .9, mat(0x2a4f8a, .5, .3), 1.1, .1, 0);
    box(5.2, .03, .07, gold, 0, -.32, 0);
    const dots = Array.from({ length: 30 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(.045, 8, 6), cyanGlow); root.add(m); return { m, o: i / 30 }; });
    animated.push(t => dots.forEach(({ m, o }) => { const u = (t * .15 + o) % 1; const x = -2.6 + u * 5.2; const amp = x < -1 ? .5 : x < 1.1 ? .5 - (x + 1) * .18 : .12; m.position.set(x, -.2 + .35 + Math.sign(Math.sin(u * 40)) * amp * (x < -1 ? 1 : Math.abs(Math.sin(u * 40))), 0); }));
  } else if (type === 'codec') {
    title = 'Đồ thị Tanner QC-LDPC · nút biến (VNP) và nút kiểm tra (CNP)';
    box(6.4, .2, 3.6, pcb, 0, -.45, 0);
    const vn = [], cn = [], links = [];
    for (let i = 0; i < 10; i++) vn.push(cyl(.16, .16, .12, mat(0x6ce9d9, .3, .4, { emissive: 0 }), -2.7 + i * .6, -.25, 1.1, 20));
    for (let i = 0; i < 5; i++) cn.push(box(.32, .2, .32, mat(0xb08edb, .3, .4, { emissive: 0 }), -2.4 + i * 1.2, 1.1, -.6));
    const lineMat = new THREE.LineBasicMaterial({ color: 0x3d7f86, transparent: true, opacity: .55 });
    vn.forEach((v, i) => [i % 5, (i * 3 + 1) % 5].forEach(c => { const g = new THREE.BufferGeometry().setFromPoints([v.position, cn[c].position]); const l = new THREE.Line(g, lineMat.clone()); root.add(l); links.push({ l, i, c }); }));
    animated.push(t => { const phase = Math.floor(t * 1.5) % 2, k = Math.floor(t * 3) % 10; vn.forEach((v, i) => v.material.emissive.setHex(phase === 0 && i === k ? 0x2a8f88 : 0)); cn.forEach((c, i) => c.material.emissive.setHex(phase === 1 && i === k % 5 ? 0x5b3d8a : 0)); links.forEach(({ l, i, c }) => { const on = (phase === 0 && i === k) || (phase === 1 && c === k % 5); l.material.color.setHex(on ? 0x9ffff2 : 0x3d7f86); l.material.opacity = on ? 1 : .45; }); });
  } else if (type === 'nn') {
    title = 'MLP 784-32-10 trên FPGA · các lớp nơ-ron int8';
    box(6, .2, 4, pcb, 0, -.45, 0); box(3, .2, 3, dark, 0, -.25, 0);
    const layers = [[16, -2], [8, 0], [10, 2]], nodes = [];
    layers.forEach(([n, x], li) => { const arr = []; for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(li === 0 ? .07 : .11, 12, 8), mat([0x7fa8ec, 0x6ce9d9, 0xe6c27a][li], .3, .4, { emissive: 0 })); m.position.set(x, .4 + (li === 0 ? (Math.floor(i / 4) - 1.5) * .35 : 0), (li === 0 ? (i % 4 - 1.5) * .35 : (i - (n - 1) / 2) * .3)); root.add(m); arr.push(m); } nodes.push(arr); });
    const lm = new THREE.LineBasicMaterial({ color: 0x2c6776, transparent: true, opacity: .35 });
    for (let l = 0; l < 2; l++) for (const a of nodes[l]) for (const b of nodes[l + 1]) if ((a.id + b.id) % 3 === 0) root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a.position, b.position]), lm));
    animated.push(t => { const digit = Math.floor(t / 2) % 10, wave = (t % 2) / 2; nodes.forEach((arr, l) => arr.forEach((m, i) => { const active = Math.abs(wave * 3 - l - .5) < .5; m.material.emissive.setHex(active && (l < 2 ? (i + digit) % 3 === 0 : i === digit) ? 0x3b8f86 : (l === 2 && i === digit && wave > .8 ? 0x8a6a20 : 0)); })); });
  } else if (type === 'uart') {
    title = 'UART 8N1 · TX/RX nối vòng qua FIFO';
    box(6.4, .2, 3.2, pcb, 0, -.45, 0);
    const tx = box(1.2, .5, 1, mat(0x2d4a6b, .4, .4), -2.2, -.1, 0), rx = box(1.2, .5, 1, mat(0x2d4a6b, .4, .4), 2.2, -.1, 0);
    for (const x of [-2.2, 2.2]) for (let i = 0; i < 6; i++) box(.14, .3, .5, mat(0xb08edb, .3, .4), x + (x < 0 ? -1.1 : 1.1) - (x < 0 ? 0 : 0) + (i - 2.5) * .02, -.18 + i * .0, 0).position.x = x + (x < 0 ? -.9 - i * .18 : .9 + i * .18);
    box(3.2, .04, .08, gold, 0, -.32, 0);
    const bits = Array.from({ length: 10 }, (_, i) => box(.2, .2, .2, mat(0x6ce9d9, .3, .4, { emissive: 0x1a5752 }), 0, 0, 0));
    animated.push(t => bits.forEach((b, i) => { const u = ((t * .35) + i / 10) % 1; b.position.set(-1.6 + u * 3.2, (i === 0 ? -.18 : i === 9 ? .02 : ((0x55 >> (i - 1)) & 1) ? .02 : -.18), 0); b.visible = u < .98; }));
  } else if (type === 'web') {
    title = 'Kiến trúc web · trình duyệt, API, CSDL và lưu trữ';
    box(6.4, .1, 4, mat(0x0f2230, .3, .7), 0, -.5, 0);
    const screen = box(1.8, 1.1, .08, mat(0x16303f, .4, .4), -2.2, .3, 0); box(1.7, 1, .02, glowMat(0x10303a), -2.2, .3, .05); box(1.3, .12, .02, cyanGlow, -2.3, .55, .07);
    const server = []; for (let i = 0; i < 3; i++) server.push(box(1, .3, .9, mat(0x2d4a6b, .5, .3, { emissive: 0 }), 0, -.25 + i * .36, 0));
    const db = []; for (let i = 0; i < 3; i++) db.push(cyl(.45, .45, .25, mat(0xe6c27a, .5, .3, { emissive: 0 }), 2.2, -.3 + i * .3, -.6, 28));
    cyl(.35, .35, .5, mat(0xb08edb, .4, .3), 2.2, -.2, 1);
    const pk = Array.from({ length: 8 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 6), cyanGlow); root.add(m); return m; });
    animated.push(t => { pk.forEach((m, i) => { const u = (t * .4 + i / 8) % 1; const x = -1.3 + u * 3.5; m.position.set(x, .2 + Math.sin(u * Math.PI) * .4, i % 2 ? -.3 : .3); }); server.forEach((s, i) => s.material.emissive.setHex(Math.floor(t * 4) % 3 === i ? 0x1d5c6d : 0)); db.forEach((d, i) => d.material.emissive.setHex(Math.floor(t * 3) % 3 === i ? 0x4a3a10 : 0)); });
  } else {
    title = 'Bộ xử lý · die silicon, các khối chức năng';
    box(5, .2, 5, pcb, 0, -.45, 0);
    box(3.6, .2, 3.6, mat(0x1a2a36, .6, .35), 0, -.25, 0);
    for (let k = 0; k < 14; k++) for (const s of [-1, 1]) { box(.1, .06, .4, gold, -1.6 + k * .25, -.32, s * 2.0); box(.4, .06, .1, gold, s * 2.0, -.32, -1.6 + k * .25); }
    const die = box(2.4, .12, 2.4, silicon, 0, -.08, 0);
    const units = [['ALU', 0x6ce9d9, -.55, -.55, .9, .9], ['REG', 0xb08edb, .55, -.55, .9, .9], ['CTRL', 0xe6c27a, -.55, .55, .9, .9], ['MEM', 0x7fa8ec, .55, .55, .9, .9]];
    const uMesh = units.map(([, c, x, z, w, d]) => box(w, .1, d, mat(c, .4, .35, { emissive: 0 }), x, .03, z));
    animated.push(t => { const s = Math.floor(t * 2.5) % 4; uMesh.forEach((m, i) => { m.material.emissive.setHex(i === s ? 0x264d52 : 0); m.position.y = i === s ? .08 : .03; }); });
    const lid = box(3, .1, 3, mat(0xa9b9c6, .9, .22, { transparent: true, opacity: .25 }), 0, .55, 0);
    animated.push(t => { lid.position.y = .55 + Math.sin(t * .8) * .12; });
  }
  label(title);

  let yaw = .7, elev = .55, radius = 8.5, drag = null, visible = true, auto = !reducedMotion, width = 0, height = 0, start = performance.now(), raf = 0, disposed = false;
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); auto = false; });
  canvas.addEventListener('pointermove', e => { if (!drag) return; yaw -= (e.clientX - drag.x) * .01; elev = Math.min(Math.max(elev + (e.clientY - drag.y) * .006, .05), 1.4); drag = { x: e.clientX, y: e.clientY }; });
  for (const ev of ['pointerup', 'pointercancel']) canvas.addEventListener(ev, () => drag = null);
  canvas.addEventListener('wheel', e => { e.preventDefault(); radius = Math.min(Math.max(radius + e.deltaY * .008, 4.5), 16); }, { passive: false });
  function frame(ts) {
    if (disposed) return; raf = requestAnimationFrame(frame); if (!visible || document.hidden) return;
    const r = canvas.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return;
    if (r.width !== width || r.height !== height) { width = r.width; height = r.height; renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); }
    const t = (ts - start) / 1000; if (!reducedMotion) animated.forEach(f => f(t)); if (auto) yaw += .004;
    camera.position.set(Math.sin(yaw) * Math.cos(elev) * radius, Math.sin(elev) * radius, Math.cos(yaw) * Math.cos(elev) * radius); camera.lookAt(0, 0, 0); renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);
  return {
    setVisible(v) { visible = v; },
    dispose() { disposed = true; cancelAnimationFrame(raf); scene.traverse(o => { o.geometry?.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); }); renderer.dispose(); renderer.forceContextLoss?.(); }
  };
}
