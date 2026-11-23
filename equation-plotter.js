import * as THREE from './vendor/three.module.js';
import { parseEquation } from './math-expr.js';

const COLORS = ['#6ce9d9', '#b08edb', '#e6c27a', '#7fa8ec', '#ef8f9b'];
const EXAMPLES2D = [['y = sin(x)', 'Hình sin'], ['y = x^3 - 3x', 'Bậc ba'], ['y = exp(-x^2/4) * cos(3x)', 'Sóng tắt dần'], ['y = sin(x - t)', 'Sóng chạy (t)'], ['y = abs(x) - 2', 'Trị tuyệt đối'], ['y = 1/x', 'Hyperbol']];
const EXAMPLES3D = [['z = sin(sqrt(x^2 + y^2) - t)', 'Sóng tròn (t)'], ['z = x^2 - y^2', 'Yên ngựa'], ['z = sin(x) * cos(y)', 'Hộp trứng'], ['z = exp(-(x^2 + y^2) / 4) * 3', 'Gauss'], ['z = cos(x + t) + sin(y)', 'Sóng phẳng (t)'], ['z = x*y/4', 'Hyperbolic paraboloid']];

// Thư viện mô hình toán học phổ biến trong thiết kế vi mạch. Mỗi mục: dim, eqs (phương trình), x/y (khoảng), cy (tâm dọc 2D).
const CHIP_MODELS = [
  { group: 'Linh kiện bán dẫn', items: [
    { name: 'MOSFET: đặc tuyến Id–Vds', dim: 2, eqs: ['y = min(x, 0.8) * (0.8 - min(x, 0.8) / 2)', 'y = min(x, 1.3) * (1.3 - min(x, 1.3) / 2)', 'y = min(x, 1.8) * (1.8 - min(x, 1.8) / 2)'], x: [0, 4], cy: 1, note: 'Id = k·[Vov·Vds − Vds²/2] vùng triode, bão hòa phẳng khi Vds ≥ Vov. Ba đường ứng với Vov = 0,8 / 1,3 / 1,8 V (k = 1).' },
    { name: 'MOSFET: mặt Id(Vov, Vds)', dim: 3, eqs: ['z = min(y, x) * (x - min(y, x) / 2)'], x: [0, 3], y: [0, 4], note: 'Toàn bộ họ đặc tuyến thành một mặt 3D: x = Vov, y = Vds, z = Id. Sườn dốc là vùng triode, mặt phẳng là vùng bão hòa.' },
    { name: 'Diode Shockley', dim: 2, eqs: ['y = exp(x) - 1'], x: [-3, 3], cy: 6, note: 'Id/Is = exp(Vd/nVT) − 1, trục x chuẩn hóa theo nVT. Phân cực ngược dòng ≈ −Is, phân cực thuận tăng theo hàm mũ.' },
    { name: 'Bộ đảo CMOS: đặc tuyến truyền VTC', dim: 2, eqs: ['y = 1.8 / (1 + exp(12 * (x - 0.9)))'], x: [0, 1.8], cy: 0.9, note: 'Vout theo Vin của inverter CMOS (VDD = 1,8 V), ngưỡng chuyển ≈ VDD/2. Độ dốc vùng chuyển là độ lợi, quyết định lề nhiễu.' },
    { name: 'Phân bố nhiễu Gauss', dim: 2, eqs: ['y = exp(-x^2 / 2) / sqrt(2 * pi)'], x: [-4, 4], cy: 0.2, note: 'Hàm mật độ xác suất nhiễu nhiệt/AWGN, σ = 1. Diện tích dưới đường cong bằng 1; dùng để ước tính BER.' }
  ] },
  { group: 'Mạch số và thời gian', items: [
    { name: 'RC nạp / xả', dim: 2, eqs: ['y = 1 - exp(-x)', 'y = exp(-x)'], x: [0, 5], cy: 0.5, note: 'Điện áp trên tụ theo thời gian tính bằng τ = RC. Sau 1τ đạt 63%, sau 5τ gần như hoàn tất. Nền tảng của trễ dây dẫn và tải cổng.' },
    { name: 'Xác suất metastability (CDC)', dim: 2, eqs: ['y = exp(-x / 0.4)'], x: [0, 4], cy: 0.5, note: 'P(lỗi) = exp(−tr/τ): thời gian chờ phân giải càng dài thì xác suất flip-flop kẹt giữa càng giảm theo hàm mũ. Cơ sở của đồng bộ 2-FF và MTBF.' },
    { name: 'Sóng vuông xấp xỉ Fourier', dim: 2, eqs: ['y = 4 / pi * (sin(x) + sin(3x) / 3 + sin(5x) / 5 + sin(7x) / 7)', 'y = sign(sin(x))'], x: [-7, 7], cy: 0, note: 'Xung clock vuông = tổng các hài lẻ. Băng thông hạn chế làm cạnh lên bị tròn và gợn Gibbs. Đường thẳng là sóng vuông lý tưởng.' },
    { name: 'BER của DPSK theo Eb/N0', dim: 2, eqs: ['y = 0.5 * exp(-x)'], x: [0, 8], cy: 0.25, note: 'Pb = ½·exp(−Eb/N0) (x tuyến tính). Dùng để chọn SNR yêu cầu cho khối thu trong thiết kế modem / giải mã.' }
  ] },
  { group: 'Tín hiệu và số hóa', items: [
    { name: 'Đáp ứng biên độ RC thông thấp (Bode)', dim: 2, eqs: ['y = -10 * log(1 + 10^(2 * x))'], x: [-2, 2], cy: -10, note: '|H| (dB) với x = log10(f/fc). Phẳng 0 dB tới fc, giảm −3 dB tại fc và −20 dB/decade sau đó.' },
    { name: 'Đáp ứng pha RC thông thấp', dim: 2, eqs: ['y = -atan(10^x) * 180 / pi'], x: [-2, 2], cy: -45, note: 'Pha (độ) tiến từ 0° về −90°, đạt −45° tại fc. Quan trọng khi tính lề pha của vòng hồi tiếp.' },
    { name: 'Bộ lượng tử hóa ADC 3 bit', dim: 2, eqs: ['y = sin(x)', 'y = round(4 * sin(x)) / 4'], x: [-7, 7], cy: 0, note: 'Tín hiệu liên tục và đầu ra ADC 3 bit (8 mức). Sai số lượng tử hóa tối đa ½ LSB, SQNR ≈ 6,02·N + 1,76 dB.' },
    { name: 'Hàm sinc (bộ lọc FIR lý tưởng)', dim: 2, eqs: ['y = sin(pi * x) / (pi * x)'], x: [-8, 8], cy: 0.3, note: 'Đáp ứng xung của bộ lọc thông thấp lý tưởng, cũng là nội suy chuẩn của định lý lấy mẫu. Cắt bớt hệ số sẽ ra bộ FIR thực tế.' },
    { name: 'Sinc 2D (lọc ảnh)', dim: 3, eqs: ['z = 3 * sin(2 * sqrt(x^2 + y^2 + 0.0001)) / (2 * sqrt(x^2 + y^2 + 0.0001))'], x: [-8, 8], y: [-8, 8], note: 'Đáp ứng xung bộ lọc thông thấp tròn 2D, dùng trong xử lý ảnh và bộ tăng tốc conv.' }
  ] },
  { group: 'Công suất và nhiệt', items: [
    { name: 'Công suất động P = C·V²·f', dim: 3, eqs: ['z = x^2 * y'], x: [0, 3], y: [0, 3], note: 'x = điện áp (V), y = tần số tương đối, z = công suất. Tăng điện áp tốn hơn tăng tần số vì phụ thuộc bình phương; cơ sở của DVFS.' },
    { name: 'Công suất theo điện áp (DVFS)', dim: 2, eqs: ['y = x^2', 'y = x^3'], x: [0, 3], cy: 4, note: 'Công suất động ∝ V², còn năng lượng + tần số kéo theo ≈ V³ khi f ∝ V. Giảm điện áp nhẹ tiết kiệm công suất rất nhiều.' },
    { name: 'Khuếch tán nhiệt trên die', dim: 3, eqs: ['z = 4 * exp(-(x^2 + y^2) / (0.5 + t)) / (0.5 + t)'], x: [-6, 6], y: [-6, 6], anim: true, note: 'Một điểm nóng lan ra và nguội dần theo thời gian (t). Mô tả định tính cách nhiệt tản trên silicon.' }
  ] }
];
const $ = (s, r = document) => r.querySelector(s);
const usesT = src => /(^|[^a-z])t([^a-z]|$)/i.test(String(src).split('=').pop());

export function createEquationPlotter({ root, reducedMotion = false }) {
  root.innerHTML = `
  <div class="eq-head"><div><div class="eyebrow">TỰ NHẬP PHƯƠNG TRÌNH</div><h2>Vẽ đồ thị 2D hoặc 3D</h2><p>Gõ phương trình như trên giấy: <code>y = x^2 - 1</code>, <code>z = sin(x)*cos(y)</code>. Dùng <code>t</code> để đồ thị chuyển động.</p></div>
  <div class="eq-dim" role="group" aria-label="Chọn số chiều"><button data-dim="2" aria-pressed="true">2D · y = f(x)</button><button data-dim="3" aria-pressed="false">3D · z = f(x, y)</button></div></div>
  <div class="eq-lib"><button type="button" class="btn small eq-lib-toggle" aria-expanded="false">Thư viện mô hình vi mạch ▾</button><div class="eq-lib-list" hidden>${CHIP_MODELS.map(g => `<div class="eq-lib-group"><h3>${g.group}</h3><div>${g.items.map(m => `<button type="button" class="eq-chip eq-lib-item" data-model="${m.name.replace(/"/g, '&quot;')}">${m.name}<em>${m.dim}D</em></button>`).join('')}</div></div>`).join('')}</div><div class="eq-lib-note" hidden></div></div>
  <div class="eq-layout"><div class="eq-view"><canvas class="eq-canvas2d" aria-label="Đồ thị 2D"></canvas><canvas class="eq-canvas3d" aria-label="Đồ thị 3D" hidden></canvas><div class="eq-readout" aria-live="polite"></div><div class="eq-view-hint">Kéo để di chuyển · Cuộn để thu phóng</div></div>
  <aside class="eq-panel"><div class="eq-inputs"></div><button class="btn small eq-add" type="button">+ Thêm phương trình</button>
  <div class="eq-range"><label>x từ <input type="number" class="eq-xmin" value="-10" step="1"></label><label>đến <input type="number" class="eq-xmax" value="10" step="1"></label><label class="eq-yrow" hidden>y từ <input type="number" class="eq-ymin" value="-6" step="1"></label><label class="eq-yrow" hidden>đến <input type="number" class="eq-ymax" value="6" step="1"></label></div>
  <div class="eq-actions"><button class="btn primary small eq-plot" type="button">Vẽ đồ thị</button><button class="btn small eq-anim" type="button" aria-pressed="false">Chạy t</button><button class="btn small eq-reset" type="button">Đặt lại khung</button></div>
  <div class="eq-error" role="alert"></div>
  <div class="eyebrow eq-ex-title">VÍ DỤ NHANH</div><div class="eq-examples"></div>
  <details class="eq-help"><summary>Hàm và ký hiệu hỗ trợ</summary><p><code>+ − * / ^</code>, nhân ngầm <code>2x</code>, <code>sin cos tan asin acos atan sinh cosh tanh exp ln log sqrt cbrt abs floor ceil round sign min max mod hypot atan2</code>, hằng số <code>pi e</code>, biến thời gian <code>t</code>.</p></details></aside></div>`;
  const c2 = $('.eq-canvas2d', root), c3 = $('.eq-canvas3d', root), readout = $('.eq-readout', root), err = $('.eq-error', root);
  let dim = 2, visible = false, animating = false, t = 0, last = 0, dirty = true;
  let view = { cx: 0, cy: 0, scale: 40 }; // px per unit
  let funcs2 = [], func3 = null, hover = null;
  const inputs = { 2: ['y = sin(x)', 'y = x^2 / 8 - 2'], 3: ['z = sin(sqrt(x^2 + y^2) - t)'] };

  function renderInputs() {
    const list = inputs[dim];
    $('.eq-inputs', root).innerHTML = list.map((v, i) => `<div class="eq-row"><i style="background:${COLORS[i % COLORS.length]}"></i><input value="${v.replace(/"/g, '&quot;')}" data-i="${i}" maxlength="300" spellcheck="false" aria-label="Phương trình ${i + 1}">${list.length > 1 ? `<button class="icon-btn" data-remove="${i}" aria-label="Xóa phương trình ${i + 1}">×</button>` : ''}</div>`).join('');
    $('.eq-add', root).hidden = dim === 3 || list.length >= 5;
    $('.eq-examples', root).innerHTML = (dim === 2 ? EXAMPLES2D : EXAMPLES3D).map(([eq, label]) => `<button type="button" class="eq-chip" data-eq="${eq}" title="${eq}">${label}</button>`).join('');
    root.querySelectorAll('.eq-yrow').forEach(el => el.hidden = dim === 2);
  }
  function loadModel(name) {
    const m = CHIP_MODELS.flatMap(g => g.items).find(x => x.name === name); if (!m) return;
    setDim(m.dim); inputs[m.dim] = m.dim === 2 ? m.eqs.slice(0, 5) : [m.eqs[0]]; renderInputs();
    $('.eq-xmin', root).value = m.x[0]; $('.eq-xmax', root).value = m.x[1];
    if (m.dim === 3) { $('.eq-ymin', root).value = m.y[0]; $('.eq-ymax', root).value = m.y[1]; }
    t = 0; setAnim(!!m.anim); if (m.dim === 2) { fitX(); view.cy = m.cy || 0; }
    plot();
    const n = $('.eq-lib-note', root); n.hidden = false; n.innerHTML = `<strong>${name}</strong><p>${m.note}</p>`;
    root.querySelectorAll('.eq-lib-item').forEach(el => el.classList.toggle('active', el.dataset.model === name));
    const l = $('.eq-lib-list', root); l.hidden = true; const tg = $('.eq-lib-toggle', root); tg.setAttribute('aria-expanded', 'false'); tg.textContent = 'Thư viện mô hình vi mạch ▾';
    $('.eq-lib-note', root).scrollIntoView({ block: 'start' });
  }
  function plot() {
    err.textContent = '';
    try {
      if (dim === 2) {
        funcs2 = inputs[2].map((src, i) => src.trim() ? { f: parseEquation(src, 2), color: COLORS[i % COLORS.length], src, anim: usesT(src) } : null).filter(Boolean);
        if (!funcs2.length) throw new Error('Hãy nhập ít nhất một phương trình.');
      } else { const src = inputs[3][0]; func3 = { f: parseEquation(src, 3), src, anim: usesT(src) }; buildSurface(); }
      const anyT = dim === 2 ? funcs2.some(f => f.anim) : func3.anim;
      if (anyT && !animating && !reducedMotion) setAnim(true);
    } catch (e) { err.textContent = '⚠ ' + e.message; }
    dirty = true;
  }
  function setAnim(v) { animating = v; const b = $('.eq-anim', root); b.textContent = v ? 'Dừng t' : 'Chạy t'; b.setAttribute('aria-pressed', String(v)); dirty = true; }
  function setDim(d) {
    dim = d; root.querySelectorAll('[data-dim]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.dim) === d)));
    c2.hidden = d !== 2; c3.hidden = d !== 2 ? false : true; readout.textContent = ''; renderInputs(); if (d === 3) ensure3D(); plot();
  }

  // ---------- 2D ----------
  const ctx = c2.getContext('2d');
  function niceStep(px) { const raw = 80 / px; const p = Math.pow(10, Math.floor(Math.log10(raw))); const n = raw / p; return (n < 2 ? 2 : n < 5 ? 5 : 10) * p / (n < 2 ? 2 : 1) * (n < 2 ? 1 : 1); }
  function draw2D() {
    const r = c2.getBoundingClientRect(), dpr = Math.min(devicePixelRatio, 2); if (r.width < 1) return;
    if (c2.width !== Math.round(r.width * dpr) || c2.height !== Math.round(r.height * dpr)) { c2.width = Math.round(r.width * dpr); c2.height = Math.round(r.height * dpr); }
    const w = r.width, h = r.height; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#08121b'; ctx.fillRect(0, 0, w, h);
    const sx = x => w / 2 + (x - view.cx) * view.scale, sy = y => h / 2 - (y - view.cy) * view.scale;
    const x0 = view.cx - w / 2 / view.scale, x1 = view.cx + w / 2 / view.scale, y0 = view.cy - h / 2 / view.scale, y1 = view.cy + h / 2 / view.scale;
    let step = Math.pow(10, Math.floor(Math.log10(90 / view.scale))); if (step * view.scale < 35) step *= 2; if (step * view.scale < 35) step *= 2.5;
    ctx.lineWidth = 1; ctx.strokeStyle = '#13283a'; ctx.beginPath();
    for (let gx = Math.ceil(x0 / step) * step; gx <= x1; gx += step) { ctx.moveTo(sx(gx), 0); ctx.lineTo(sx(gx), h); }
    for (let gy = Math.ceil(y0 / step) * step; gy <= y1; gy += step) { ctx.moveTo(0, sy(gy)); ctx.lineTo(w, sy(gy)); }
    ctx.stroke();
    ctx.strokeStyle = '#4b7584'; ctx.beginPath(); ctx.moveTo(sx(0), 0); ctx.lineTo(sx(0), h); ctx.moveTo(0, sy(0)); ctx.lineTo(w, sy(0)); ctx.stroke();
    ctx.fillStyle = '#6d8fa0'; ctx.font = '11px Consolas, monospace';
    const fmt = v => Math.abs(v) < 1e-9 ? '0' : Number(v.toPrecision(4)).toString();
    const ay = Math.min(Math.max(sy(0) + 14, 14), h - 4), ax = Math.min(Math.max(sx(0) + 4, 4), w - 40);
    for (let gx = Math.ceil(x0 / step) * step; gx <= x1; gx += step) if (Math.abs(gx) > step / 2) ctx.fillText(fmt(gx), sx(gx) + 3, ay);
    for (let gy = Math.ceil(y0 / step) * step; gy <= y1; gy += step) if (Math.abs(gy) > step / 2) ctx.fillText(fmt(gy), ax, sy(gy) - 3);
    ctx.fillText('x', w - 12, Math.min(Math.max(sy(0) - 6, 12), h - 6)); ctx.fillText('y', Math.min(Math.max(sx(0) + 6, 6), w - 10), 12);
    for (const fn of funcs2) {
      ctx.strokeStyle = fn.color; ctx.lineWidth = 2.2; ctx.shadowColor = fn.color; ctx.shadowBlur = 6; ctx.beginPath(); let pen = false, prev = null;
      for (let px = 0; px <= w; px += .75) {
        const x = view.cx + (px - w / 2) / view.scale; let y; try { y = fn.f(x, t); } catch { y = NaN; }
        if (!Number.isFinite(y)) { pen = false; prev = null; continue; }
        const py = sy(y); if (prev !== null && Math.abs(py - prev) > h * 1.5) pen = false;
        if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py); prev = py;
      }
      ctx.stroke(); ctx.shadowBlur = 0;
    }
    if (hover && funcs2.length) {
      const x = view.cx + (hover.x - w / 2) / view.scale; ctx.strokeStyle = '#ffffff22'; ctx.beginPath(); ctx.moveTo(hover.x, 0); ctx.lineTo(hover.x, h); ctx.stroke();
      const parts = funcs2.map(fn => { let y; try { y = fn.f(x, t); } catch { y = NaN; } if (Number.isFinite(y)) { ctx.fillStyle = fn.color; ctx.beginPath(); ctx.arc(hover.x, sy(y), 4, 0, 7); ctx.fill(); } return `<span style="color:${fn.color}">y=${Number.isFinite(y) ? fmt(y) : '—'}</span>`; });
      readout.innerHTML = `x=${fmt(x)} · ${parts.join(' · ')}${animating ? ` · t=${t.toFixed(1)}` : ''}`;
    } else readout.textContent = animating ? `t = ${t.toFixed(1)}` : '';
  }
  function fitX() { const a = Number($('.eq-xmin', root).value), b = Number($('.eq-xmax', root).value); if (Number.isFinite(a) && Number.isFinite(b) && b > a) { const w = c2.getBoundingClientRect().width || 600; view.cx = (a + b) / 2; view.scale = w / (b - a); view.cy = 0; } dirty = true; }
  let drag = null;
  c2.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; c2.setPointerCapture(e.pointerId); });
  c2.addEventListener('pointermove', e => { const r = c2.getBoundingClientRect(); hover = { x: e.clientX - r.left, y: e.clientY - r.top }; if (drag) { view.cx -= (e.clientX - drag.x) / view.scale; view.cy += (e.clientY - drag.y) / view.scale; drag = { x: e.clientX, y: e.clientY }; } dirty = true; });
  c2.addEventListener('pointerleave', () => { hover = null; dirty = true; });
  for (const ev of ['pointerup', 'pointercancel']) c2.addEventListener(ev, () => drag = null);
  c2.addEventListener('wheel', e => { e.preventDefault(); const r = c2.getBoundingClientRect(); const mx = e.clientX - r.left - r.width / 2, my = e.clientY - r.top - r.height / 2; const wx = view.cx + mx / view.scale, wy = view.cy - my / view.scale; view.scale = Math.min(Math.max(view.scale * Math.exp(-e.deltaY * .0015), 2), 4000); view.cx = wx - mx / view.scale; view.cy = wy + my / view.scale; dirty = true; }, { passive: false });

  // ---------- 3D ----------
  let renderer, scene, camera, mesh, wire, geo, N = 70, yaw = -.7, elev = .55, radius = 17, drag3 = null, zRange = 1;
  function ensure3D() {
    if (renderer) return;
    renderer = new THREE.WebGLRenderer({ canvas: c3, antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); renderer.setClearColor(0x08121b, 1);
    scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(42, 1, .1, 200);
    scene.add(new THREE.AmbientLight(0xbfd8ff, 1.1)); const l = new THREE.DirectionalLight(0xffffff, 2.2); l.position.set(5, 10, 6); scene.add(l); const l2 = new THREE.DirectionalLight(0x57ead7, 1); l2.position.set(-6, 3, -4); scene.add(l2);
    const grid = new THREE.GridHelper(12, 24, 0x2b5060, 0x16303f); grid.position.y = -4; scene.add(grid);
    const axes = new THREE.AxesHelper(6.5); axes.position.y = 0; scene.add(axes);
    geo = new THREE.PlaneGeometry(10, 10, N - 1, N - 1); geo.rotateX(-Math.PI / 2);
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * N * 3), 3));
    mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, metalness: .15, roughness: .55, transparent: true, opacity: .92 })); scene.add(mesh);
    wire = new THREE.LineSegments(new THREE.WireframeGeometry(geo), new THREE.LineBasicMaterial({ color: 0x9df5e8, transparent: true, opacity: .12 })); scene.add(wire);
    c3.addEventListener('pointerdown', e => { drag3 = { x: e.clientX, y: e.clientY }; c3.setPointerCapture(e.pointerId); });
    c3.addEventListener('pointermove', e => { if (!drag3) return; yaw -= (e.clientX - drag3.x) * .008; elev = Math.min(Math.max(elev + (e.clientY - drag3.y) * .006, -1.2), 1.45); drag3 = { x: e.clientX, y: e.clientY }; dirty = true; });
    for (const ev of ['pointerup', 'pointercancel']) c3.addEventListener(ev, () => drag3 = null);
    c3.addEventListener('wheel', e => { e.preventDefault(); radius = Math.min(Math.max(radius + e.deltaY * .01, 6), 45); dirty = true; }, { passive: false });
  }
  const cLow = new THREE.Color('#3a6fd8'), cMid = new THREE.Color('#5fe3d2'), cHigh = new THREE.Color('#f0c27a'), tmp = new THREE.Color();
  function buildSurface(first = true) {
    if (!renderer || !func3) return;
    const xmin = Number($('.eq-xmin', root).value), xmax = Number($('.eq-xmax', root).value), ymin = Number($('.eq-ymin', root).value), ymax = Number($('.eq-ymax', root).value);
    const okRange = [xmin, xmax, ymin, ymax].every(Number.isFinite) && xmax > xmin && ymax > ymin;
    const [a0, a1, b0, b1] = okRange ? [xmin, xmax, ymin, ymax] : [-6, 6, -6, 6];
    const pos = geo.attributes.position, col = geo.attributes.color; const zs = new Float32Array(N * N); let lo = Infinity, hi = -Infinity;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = a0 + (a1 - a0) * i / (N - 1), y = b1 - (b1 - b0) * j / (N - 1); let z; try { z = func3.f(x, y, t); } catch { z = NaN; }
      zs[j * N + i] = z; if (Number.isFinite(z)) { lo = Math.min(lo, z); hi = Math.max(hi, z); }
    }
    if (!Number.isFinite(lo)) { lo = -1; hi = 1; }
    if (first) zRange = Math.max(hi - lo, 1e-6);
    const span = Math.max(a1 - a0, b1 - b0), k = 10 / span; const zk = Math.min(k, 8 / zRange);
    const mid = first || !Number.isFinite(buildSurface.mid) ? (lo + hi) / 2 : buildSurface.mid; if (first) buildSurface.mid = mid;
    for (let n = 0; n < N * N; n++) {
      const z = zs[n]; const zc = Number.isFinite(z) ? Math.min(Math.max((z - mid) * zk, -6), 6) : 0;
      pos.setY(n, zc); const u = Number.isFinite(z) ? Math.min(Math.max((z - lo) / (hi - lo || 1), 0), 1) : .5;
      tmp.copy(u < .5 ? cLow : cMid).lerp(u < .5 ? cMid : cHigh, u < .5 ? u * 2 : (u - .5) * 2); col.setXYZ(n, tmp.r, tmp.g, tmp.b);
    }
    pos.needsUpdate = true; col.needsUpdate = true; geo.computeVertexNormals();
    if (first || !wire.userData.fast) { wire.geometry.dispose(); wire.geometry = new THREE.WireframeGeometry(geo); }
    readout.textContent = `${func3.src} · z ∈ [${Number(lo.toPrecision(3))}, ${Number(hi.toPrecision(3))}]${animating ? ` · t = ${t.toFixed(1)}` : ''}`;
    dirty = true;
  }
  function draw3D() {
    const r = c3.getBoundingClientRect(); if (r.width < 1) return;
    const s = renderer.getSize(new THREE.Vector2()); if (s.x !== r.width || s.y !== r.height) { renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); }
    camera.position.set(Math.sin(yaw) * Math.cos(elev) * radius, Math.sin(elev) * radius, Math.cos(yaw) * Math.cos(elev) * radius); camera.lookAt(0, 0, 0); renderer.render(scene, camera);
  }

  // ---------- events ----------
  root.addEventListener('input', e => { if (e.target.dataset.i !== undefined) inputs[dim][Number(e.target.dataset.i)] = e.target.value; });
  root.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('.eq-row input, .eq-range input')) { e.preventDefault(); if (e.target.closest('.eq-range')) { if (dim === 2) fitX(); else buildSurface(); } else plot(); } });
  root.addEventListener('change', e => { if (e.target.closest('.eq-range')) { if (dim === 2) fitX(); else buildSurface(); } });
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !root.contains(b)) return;
    if (b.classList.contains('eq-lib-toggle')) { const l = $('.eq-lib-list', root); l.hidden = !l.hidden; b.setAttribute('aria-expanded', String(!l.hidden)); b.textContent = 'Thư viện mô hình vi mạch ' + (l.hidden ? '▾' : '▴'); return; }
    if (b.classList.contains('eq-lib-item')) { loadModel(b.dataset.model); return; }
    if (b.dataset.dim) setDim(Number(b.dataset.dim));
    else if (b.dataset.remove !== undefined) { inputs[dim].splice(Number(b.dataset.remove), 1); renderInputs(); plot(); }
    else if (b.dataset.eq) { if (dim === 2) { const empty = inputs[2].findIndex(v => !v.trim()); if (empty >= 0) inputs[2][empty] = b.dataset.eq; else if (inputs[2].length < 5) inputs[2].push(b.dataset.eq); else inputs[2][4] = b.dataset.eq; } else inputs[3][0] = b.dataset.eq; renderInputs(); plot(); }
    else if (b.classList.contains('eq-add')) { inputs[2].push(''); renderInputs(); root.querySelector(`[data-i="${inputs[2].length - 1}"]`)?.focus(); }
    else if (b.classList.contains('eq-plot')) plot();
    else if (b.classList.contains('eq-anim')) setAnim(!animating);
    else if (b.classList.contains('eq-reset')) { if (dim === 2) { $('.eq-xmin', root).value = -10; $('.eq-xmax', root).value = 10; fitX(); } else { $('.eq-xmin', root).value = -6; $('.eq-xmax', root).value = 6; $('.eq-ymin', root).value = -6; $('.eq-ymax', root).value = 6; yaw = -.7; elev = .55; radius = 17; buildSurface(); } t = 0; }
  });
  function loop(ts) {
    requestAnimationFrame(loop); if (!visible || document.hidden) { last = 0; return; }
    const dt = last ? Math.min((ts - last) / 1000, .06) : 0; last = ts;
    if (animating) { t += dt; dirty = true; if (dim === 3 && func3?.anim) buildSurface(false); }
    if (!dirty) return; dirty = false;
    if (dim === 2) draw2D(); else if (renderer) draw3D();
  }
  renderInputs(); requestAnimationFrame(() => { fitX(); plot(); }); requestAnimationFrame(loop);
  new ResizeObserver(() => { dirty = true; }).observe(root);
  return {
    setVisible(v) { visible = v; dirty = true; },
    load(dimension, equation) { setDim(dimension); inputs[dimension][0] = equation; renderInputs(); plot(); }
  };
}
