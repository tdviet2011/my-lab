// Step-by-step algorithm simulations for each project. Each algorithm precomputes its steps, then a
// small player lets you scrub, play and compare. Everything runs locally and is illustrative:
// the IEEE-754 adder, UART framing and LDPC min-sum decoder are real algorithms on small examples.
const COLORS = { cyan: '#6ce9d9', amber: '#e6c27a', violet: '#b08edb', blue: '#7fa8ec', green: '#8fd6a0', red: '#ef8f9b', dim: '#5d7f90', text: '#dbe9f2' };
const hash = n => { let x = (n | 0) ^ 0x9e3779b9; x = Math.imul(x ^ (x >>> 16), 0x85ebca6b); x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
const gauss = n => Math.sqrt(-2 * Math.log(hash(n * 2 + 1) + 1e-12)) * Math.cos(2 * Math.PI * hash(n * 2 + 2));
const bin = (n, w) => (n >>> 0).toString(2).padStart(w, '0');

function drawLines(ctx, w, h, lines, { top = 20, size = 13 } = {}) {
  ctx.font = `${size}px Consolas,monospace`; ctx.textBaseline = 'middle'; let y = top;
  for (const line of lines) {
    if (line.gap) { y += line.gap; continue; }
    let x = 18; if (line.label) { ctx.fillStyle = line.labelColor || COLORS.dim; ctx.fillText(line.label, x, y); }
    x = 18 + (line.labelW ?? 112);
    for (const part of line.parts || []) { ctx.fillStyle = part.color || COLORS.text; ctx.fillText(part.text, x, y); x += ctx.measureText(part.text).width; }
    y += size + 12;
  }
}
const P = (text, color) => ({ text, color });

// ============ IEEE 754 adder ============
const f32 = x => Math.fround(x);
const bitsOf = x => { const dv = new DataView(new ArrayBuffer(4)); dv.setFloat32(0, x); return dv.getUint32(0); };
const fromBits = u => { const dv = new DataView(new ArrayBuffer(4)); dv.setUint32(0, u >>> 0); return dv.getFloat32(0); };
const fmt28 = n => { const s = bin(n, 28); return [P(s[0], COLORS.red), P(s[1] + '.', COLORS.amber), P(s.slice(2, 25), COLORS.cyan), P(' ' + s.slice(25), COLORS.violet)]; };
function fieldParts(u) { return [P(bin(u >>> 31, 1), COLORS.red), P(' '), P(bin((u >>> 23) & 255, 8), COLORS.amber), P(' '), P(bin(u & 0x7fffff, 23), COLORS.cyan)]; }
function buildFpAdd({ a, b, op }) {
  a = f32(Number(a)); b = f32(Number(b)); if (!Number.isFinite(a) || !Number.isFinite(b)) return { steps: [{ title: 'Giá trị không hợp lệ', text: 'Hãy nhập hai số thực hữu hạn.', lines: [] }] };
  const bBits = bitsOf(b) ^ (op === 'sub' ? 0x80000000 : 0); b = fromBits(bBits); const ua = bitsOf(a), ub = bitsOf(b);
  const ref = f32(a + b), refBits = bitsOf(ref); const steps = [];
  const parts = u => ({ s: u >>> 31, e: (u >>> 23) & 255, f: u & 0x7fffff });
  const A = parts(ua), B = parts(ub);
  const special = [A, B].some(x => x.e === 0 || x.e === 255);
  steps.push({ title: '1. Tách trường bit', text: `Mỗi số float32 gồm 1 bit dấu, 8 bit mũ (lệch 127) và 23 bit phân số. A = ${a}, B = ${b}${op === 'sub' ? ' (đã đảo dấu vì phép trừ)' : ''}.`,
    lines: [{ label: 'dấu mũ phân số', labelColor: COLORS.dim, parts: [] }, { label: 'A', parts: fieldParts(ua) }, { label: 'B', parts: fieldParts(ub) }, { gap: 8 }, { label: 'mũ A / B', parts: [P(`${A.e}`, COLORS.amber), P('  /  '), P(`${B.e}`, COLORS.amber)] }] });
  if (special) {
    steps.push({ title: 'Trường hợp đặc biệt', text: 'Có số 0, dưới chuẩn (subnormal), Inf hoặc NaN. Bộ cộng thật xử lý riêng các trường hợp này; bản minh họa chỉ giải thích đường chính của số chuẩn hóa. Kết quả tham chiếu lấy từ float32 của trình duyệt.', lines: [{ label: 'kết quả', parts: fieldParts(refBits) }, { label: 'giá trị', parts: [P(String(ref), COLORS.green)] }] });
    return { steps };
  }
  let big = A, small = B, sBig = A.s;
  const swap = A.e < B.e || (A.e === B.e && A.f < B.f); if (swap) { big = B; small = A; sBig = B.s; }
  const d = big.e - small.e;
  steps.push({ title: '2. So sánh số mũ', text: `Số có mũ lớn hơn đứng trước (${swap ? 'đổi chỗ A và B' : 'giữ nguyên thứ tự'}). Chênh lệch mũ d = ${d}: mantissa số nhỏ phải dịch phải ${d} bit để cùng thang với số lớn.`,
    lines: [{ label: 'mũ lớn', parts: [P(String(big.e), COLORS.amber)] }, { label: 'mũ nhỏ', parts: [P(String(small.e), COLORS.amber)] }, { label: 'd = hiệu', parts: [P(String(d), COLORS.green)] }] });
  let Ma = ((1 << 23) | big.f) << 3, Mb = ((1 << 23) | small.f) << 3;
  steps.push({ title: '3. Thêm bit ẩn và 3 bit bảo vệ', text: 'Số chuẩn hóa có bit 1 ẩn ở đầu. Thêm 3 bit bảo vệ G, R, S (guard, round, sticky) bên phải để làm tròn chính xác về sau.',
    lines: [{ label: 'mantissa lớn', parts: fmt28(Ma) }, { label: 'mantissa nhỏ', parts: fmt28(Mb) }, { gap: 6 }, { label: 'chú thích', parts: [P('carry ', COLORS.red), P('nguyên ', COLORS.amber), P('phân số ', COLORS.cyan), P('GRS', COLORS.violet)] }] });
  let sticky = 0; const before = Mb;
  if (d >= 28) { sticky = Mb !== 0 ? 1 : 0; Mb = sticky; } else if (d > 0) { const lost = Mb & ((1 << d) - 1); Mb = Mb >>> d; if (lost) { Mb |= 1; sticky = 1; } }
  steps.push({ title: `4. Dịch phải mantissa nhỏ ${d} bit`, text: `Các bit bị đẩy ra khỏi vị trí S được gộp (OR) vào bit sticky${sticky ? ' — lần này có bit bị mất nên S = 1' : ' — lần này không mất bit 1 nào'}.`,
    lines: [{ label: 'trước khi dịch', parts: fmt28(before) }, { label: 'sau khi dịch', parts: fmt28(Mb) }] });
  const sub = A.s !== B.s; let sum = sub ? Ma - Mb : Ma + Mb; let e = big.e;
  steps.push({ title: sub ? '5. Trừ hai mantissa' : '5. Cộng hai mantissa', text: sub ? 'Hai số khác dấu nên thực chất là phép trừ độ lớn: lấy số lớn trừ số nhỏ, dấu kết quả theo số lớn.' : 'Hai số cùng dấu: cộng hai mantissa đã căn thẳng hàng, dấu kết quả giữ nguyên.',
    lines: [{ label: 'lớn', parts: fmt28(Ma) }, { label: sub ? '− nhỏ' : '+ nhỏ', parts: fmt28(Mb) }, { label: '= tổng', parts: fmt28(sum) }] });
  if (sum === 0) { steps.push({ title: 'Kết quả bằng 0', text: 'Hai số đối nhau nên tổng bằng +0 (theo quy tắc làm tròn về gần nhất).', lines: [{ label: 'kết quả', parts: fieldParts(0) }, { label: 'tham chiếu', parts: fieldParts(refBits) }] }); return { steps }; }
  let note = 'Tổng đã nằm trong khoảng [1, 2) nên không cần chuẩn hóa.';
  if (sum >= (1 << 27)) { sum = (sum >>> 1) | (sum & 1); e++; note = 'Tổng ≥ 2 (có carry): dịch phải 1 bit và tăng mũ thêm 1.'; }
  else { let n = 0; while (sum < (1 << 26)) { sum <<= 1; e--; n++; } if (n) note = `Tổng < 1: dịch trái ${n} bit và giảm mũ ${n}.`; }
  steps.push({ title: '6. Chuẩn hóa', text: note + ` Mũ mới = ${e}.`, lines: [{ label: 'sau chuẩn hóa', parts: fmt28(sum) }, { label: 'mũ mới', parts: [P(String(e), COLORS.amber)] }] });
  const grs = sum & 7; let mant = sum >>> 3; let roundUp = grs > 4 || (grs === 4 && (mant & 1) === 1);
  const why = grs > 4 ? 'GRS > 100: làm tròn lên' : grs === 4 ? (roundUp ? 'đúng nửa và bit cuối lẻ: làm tròn lên về số chẵn' : 'đúng nửa và bit cuối chẵn: giữ nguyên (về số chẵn)') : 'GRS < 100: cắt bỏ';
  if (roundUp) mant++; if (mant === (1 << 24)) { mant >>>= 1; e++; }
  steps.push({ title: '7. Làm tròn về số chẵn gần nhất', text: `GRS = ${bin(grs, 3)} → ${why}.`, lines: [{ label: 'GRS', parts: [P(bin(grs, 3), COLORS.violet)] }, { label: 'mantissa', parts: [P(bin(mant, 24), COLORS.cyan)] }] });
  let got;
  if (e >= 255) got = (sBig << 31 | 0x7f800000) >>> 0; else if (e <= 0) got = null; else got = ((sBig << 31) | (e << 23) | (mant & 0x7fffff)) >>> 0;
  const match = got === refBits;
  steps.push({ title: '8. Đóng gói và đối chiếu', text: got === null ? 'Kết quả rơi vào vùng subnormal; bản minh họa dừng ở đây.' : match ? 'Kết quả khớp từng bit với phép cộng float32 chuẩn của trình duyệt.' : 'Kết quả lệch so với tham chiếu (trường hợp biên chưa mô phỏng).',
    lines: [{ label: 'thuật toán', parts: got === null ? [P('—')] : fieldParts(got) }, { label: 'tham chiếu', parts: fieldParts(refBits) }, { gap: 6 }, { label: 'giá trị', parts: [P(String(ref), COLORS.green)] }, { label: 'đối chiếu', parts: [P(got === null ? 'n/a' : match ? '✓ khớp 32/32 bit' : '✗ lệch', match ? COLORS.green : COLORS.red)] }] });
  return { steps };
}

// ============ UART 8N1 ============
function buildUart({ byte, frameErr }) {
  byte = Math.max(0, Math.min(255, Math.round(Number(byte) || 0))); const frame = [0, ...Array.from({ length: 8 }, (_, i) => (byte >> i) & 1), frameErr === 'yes' ? 0 : 1];
  const steps = []; let reg = 0;
  steps.push({ kind: 'idle', i: -1, reg: 0, filled: 0, title: 'Rảnh (IDLE)', text: 'Đường truyền mức cao. TX chờ có byte trong FIFO; RX chờ sườn xuống.', tx: 'IDLE', rx: 'IDLE', frame, result: null });
  steps.push({ kind: 'start', i: 0, reg: 0, filled: 0, title: 'Bit START', text: 'TX kéo đường xuống 0 trong 16 tick. RX thấy sườn xuống, đếm 8 tick tới giữa bit và kiểm tra lại: vẫn 0 thì mới là START thật (lọc nhiễu).', tx: 'START', rx: 'START (đợi 8 tick)', frame, result: null });
  for (let k = 0; k < 8; k++) { reg = (reg >> 1) | (frame[k + 1] << 7); steps.push({ kind: 'data', i: k + 1, reg, filled: k + 1, title: `Bit dữ liệu D${k}`, text: `TX gửi bit D${k} = ${frame[k + 1]} (LSB gửi trước). RX lấy mẫu đúng tick 8 của 16 (giữa bit) rồi đẩy vào thanh ghi dịch: rx_reg = {bit, rx_reg[7:1]}.`, tx: `D${k}`, rx: `SAMPLE D${k}`, frame, result: null }); }
  const ok = frame[9] === 1;
  steps.push({ kind: 'stop', i: 9, reg, filled: 8, title: 'Bit STOP', text: ok ? 'Đường lên mức 1: STOP hợp lệ. RX đưa byte vào RX FIFO.' : 'Đường vẫn ở mức 0: STOP sai. RX báo frame_err và KHÔNG ghi byte vào FIFO.', tx: 'STOP', rx: ok ? 'STOP ✓' : 'FRAME ERROR', frame, result: null });
  steps.push({ kind: 'done', i: 10, reg, filled: 8, title: ok ? 'Hoàn tất' : 'Bỏ khung lỗi', text: ok ? `Nhận được byte 0x${reg.toString(16).toUpperCase().padStart(2, '0')} (${reg}), khớp với byte gửi ${byte === reg ? '✓' : '✗'}.` : 'Khung bị loại, cờ frame_err được giữ để phần mềm biết.', tx: 'IDLE', rx: 'IDLE', frame, result: ok ? reg : null, ok, sent: byte });
  return { steps };
}
function drawUart(ctx, w, h, st) {
  const L = 28, R = w - 20, nb = 11, bw = (R - L) / nb, hi = 70, lo = 120;
  ctx.fillStyle = '#09131d'; ctx.fillRect(0, 0, w, h);
  const names = ['START', 'D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'STOP', 'IDLE'];
  ctx.font = '10px Consolas,monospace'; ctx.textAlign = 'center';
  for (let i = 0; i < nb; i++) { const x = L + i * bw; ctx.fillStyle = i === st.i ? '#16363c' : 'transparent'; if (i === st.i) ctx.fillRect(x, 38, bw, 112); ctx.fillStyle = i === st.i ? COLORS.cyan : COLORS.dim; ctx.fillText(names[i], x + bw / 2, 30); }
  ctx.textAlign = 'left'; ctx.beginPath(); let prev = null; const level = i => i === 10 || i < 0 ? 1 : st.frame[i];
  for (let i = 0; i <= Math.max(0, st.i); i++) { const y = level(i) ? hi : lo, x0 = L + i * bw; if (prev === null) { ctx.moveTo(L - 10, hi); ctx.lineTo(x0, hi); } if (prev !== null && prev !== y) ctx.lineTo(x0, y); else if (prev === null && y !== hi) ctx.lineTo(x0, y); ctx.lineTo(x0 + bw, y); prev = y; }
  ctx.strokeStyle = COLORS.cyan; ctx.lineWidth = 2.2; ctx.shadowColor = COLORS.cyan; ctx.shadowBlur = 6; ctx.stroke(); ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.dim; ctx.fillText('1', 8, hi + 3); ctx.fillText('0', 8, lo + 3);
  // oversampling ticks
  if (st.i >= 0 && st.i <= 9) { const x = L + st.i * bw; ctx.strokeStyle = '#2c4a5a'; ctx.lineWidth = 1; for (let t = 0; t < 16; t++) { const tx = x + (t + .5) * bw / 16; ctx.beginPath(); ctx.moveTo(tx, 160); ctx.lineTo(tx, t === 8 ? 176 : 168); ctx.strokeStyle = t === 8 ? COLORS.red : '#2c4a5a'; ctx.lineWidth = t === 8 ? 2 : 1; ctx.stroke(); } ctx.fillStyle = COLORS.red; ctx.fillText('lấy mẫu tick 8/16', x, 194); }
  // FSM boxes
  const box = (x, y, label, val, color) => { ctx.strokeStyle = color; ctx.lineWidth = 1.4; ctx.strokeRect(x, y, 190, 44); ctx.fillStyle = COLORS.dim; ctx.fillText(label, x + 8, y + 14); ctx.fillStyle = color; ctx.font = '14px Consolas,monospace'; ctx.fillText(val, x + 8, y + 33); ctx.font = '10px Consolas,monospace'; };
  box(L, 214, 'TRẠNG THÁI TX', st.tx, COLORS.amber); box(L + 210, 214, 'TRẠNG THÁI RX', st.rx, st.rx.includes('ERROR') ? COLORS.red : COLORS.green);
  // shift register
  ctx.fillStyle = COLORS.dim; ctx.fillText('rx_reg[7:0]  (bit mới vào từ trái, dịch phải)', L, 282);
  for (let k = 0; k < 8; k++) { const bitIdx = 7 - k; const x = L + k * 34; const filled = (7 - bitIdx) < st.filled; ctx.strokeStyle = filled ? COLORS.violet : '#2c4a5a'; ctx.strokeRect(x, 292, 30, 30); ctx.fillStyle = filled ? COLORS.violet : '#40586a'; ctx.textAlign = 'center'; ctx.font = '14px Consolas,monospace'; ctx.fillText(String((st.reg >> bitIdx) & 1), x + 15, 312); ctx.font = '9px Consolas,monospace'; ctx.fillStyle = COLORS.dim; ctx.fillText(String(bitIdx), x + 15, 334); ctx.textAlign = 'left'; ctx.font = '10px Consolas,monospace'; }
  if (st.kind === 'done') { ctx.font = '15px Consolas,monospace'; ctx.fillStyle = st.ok ? COLORS.green : COLORS.red; ctx.fillText(st.ok ? `RX FIFO ← 0x${st.reg.toString(16).toUpperCase().padStart(2, '0')}` : 'frame_err = 1, FIFO không đổi', L + 290, 312); }
}

// ============ LDPC min-sum (7,4) ============
const H = [[1, 1, 1, 0, 1, 0, 0], [0, 1, 1, 1, 0, 1, 0], [1, 1, 0, 1, 0, 0, 1]];
function buildLdpc({ sigma, seed, flip, offset }) {
  sigma = Math.max(.2, Number(sigma) || .8); seed = Number(seed) || 1; flip = Number(flip); offset = Number(offset) || 0; const n = 7, m = 3;
  const y = Array.from({ length: n }, (_, i) => 1 + sigma * gauss(seed * 31 + i)); if (flip >= 0 && flip < n) y[flip] = -1;
  const Lch = y.map(v => 2 * v / (sigma * sigma)); const steps = [];
  const edges = []; H.forEach((row, c) => row.forEach((v, i) => { if (v) edges.push([c, i]); }));
  let v2c = {}; edges.forEach(([c, i]) => { v2c[c + ',' + i] = Lch[i]; }); let c2v = {}; let post = Lch.slice();
  const bitsOf2 = p => p.map(v => v < 0 ? 1 : 0); const synd = b => H.map(row => row.reduce((s, v, i) => s ^ (v & b[i]), 0));
  let bits = bitsOf2(post), syn = synd(bits);
  const snap = (title, text, extra = {}) => steps.push({ title, text, Lch, post: post.slice(), bits: bits.slice(), syn: syn.slice(), c2v: { ...c2v }, edges, ...extra });
  snap('Khởi tạo: LLR từ kênh', `Phát từ mã toàn 0 (BPSK +1). Kênh AWGN với σ = ${sigma}${flip >= 0 ? `, ép lỗi tại bit ${flip}` : ''}. LLR = 2y/σ² (dương → nghiêng về bit 0). Quyết định cứng: ${bits.join('')}, syndrome ${syn.join('')}.`);
  if (syn.every(s => !s)) { steps[0].converged = true; steps[0].text += ' Syndrome bằng 0 nên đã đúng ngay, không cần lặp.'; return { steps }; }
  for (let it = 1; it <= 6; it++) {
    c2v = {}; for (const [c, i] of edges) { const others = edges.filter(([cc, ii]) => cc === c && ii !== i).map(([, ii]) => v2c[c + ',' + ii]); const sign = others.reduce((s, v) => s * (v < 0 ? -1 : 1), 1); const mag = Math.max(0, Math.min(...others.map(Math.abs)) - offset); c2v[c + ',' + i] = sign * mag; }
    snap(`Vòng ${it}: nút kiểm tra (CNP)`, `Mỗi nút kiểm tra gửi cho từng nút biến: dấu = tích dấu các tin còn lại, độ lớn = min(|tin còn lại|) − offset ${offset}. Đây chính là khối CNP (min/secmin) trong bộ giải mã của bạn.`, { phase: 'cnp', iter: it });
    for (let i = 0; i < n; i++) post[i] = Lch[i] + edges.filter(([, ii]) => ii === i).reduce((s, [c]) => s + c2v[c + ',' + i], 0);
    for (const [c, i] of edges) v2c[c + ',' + i] = post[i] - c2v[c + ',' + i];
    bits = bitsOf2(post); syn = synd(bits); const ok = syn.every(s => !s);
    snap(`Vòng ${it}: nút biến (VNP) và quyết định`, `Mỗi nút biến cộng LLR kênh với các tin từ nút kiểm tra → LLR hậu nghiệm. Quyết định cứng: ${bits.join('')}, syndrome ${syn.join('')}${ok ? ' = 000 → giải mã xong ✓' : ' ≠ 0 → lặp tiếp'}.`, { phase: 'vnp', iter: it, converged: ok });
    if (ok) break;
  }
  return { steps };
}
function drawLdpc(ctx, w, h, st) {
  ctx.fillStyle = '#09131d'; ctx.fillRect(0, 0, w, h); const n = 7, m = 3, pad = 60, vx = i => pad + i * (w - 2 * pad) / (n - 1), cx = c => pad + 40 + c * (w - 2 * pad - 80) / (m - 1), vy = h - 110, cy = 70;
  for (const [c, i] of st.edges) { const val = st.c2v[c + ',' + i]; const active = st.phase === 'cnp' && val !== undefined; ctx.strokeStyle = val === undefined ? '#264255' : val >= 0 ? COLORS.cyan + (active ? 'ff' : '88') : COLORS.red + (active ? 'ff' : '88'); ctx.lineWidth = val === undefined ? 1 : 1 + Math.min(3, Math.abs(val) / 4); ctx.beginPath(); ctx.moveTo(cx(c), cy + 16); ctx.lineTo(vx(i), vy - 18); ctx.stroke(); if (val !== undefined) { ctx.fillStyle = val >= 0 ? COLORS.cyan : COLORS.red; ctx.font = '10px Consolas,monospace'; ctx.textAlign = 'center'; ctx.fillText(val.toFixed(1), (cx(c) * .35 + vx(i) * .65), (cy + 16) * .35 + (vy - 18) * .65); } }
  ctx.textAlign = 'center';
  for (let c = 0; c < m; c++) { const bad = st.syn[c]; ctx.fillStyle = bad ? '#3a1b24' : '#173126'; ctx.strokeStyle = bad ? COLORS.red : COLORS.green; ctx.lineWidth = 2; ctx.fillRect(cx(c) - 16, cy - 16, 32, 32); ctx.strokeRect(cx(c) - 16, cy - 16, 32, 32); ctx.fillStyle = bad ? COLORS.red : COLORS.green; ctx.font = '13px Consolas,monospace'; ctx.fillText(bad ? '✗' : '✓', cx(c), cy + 4); ctx.fillStyle = COLORS.dim; ctx.font = '10px Consolas,monospace'; ctx.fillText(`c${c}`, cx(c), cy - 24); }
  for (let i = 0; i < n; i++) { const wrong = st.bits[i] === 1; ctx.beginPath(); ctx.arc(vx(i), vy, 17, 0, 7); ctx.fillStyle = wrong ? '#3a1b24' : '#10303a'; ctx.fill(); ctx.strokeStyle = wrong ? COLORS.red : COLORS.cyan; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = COLORS.text; ctx.font = '14px Consolas,monospace'; ctx.fillText(String(st.bits[i]), vx(i), vy + 5); ctx.font = '10px Consolas,monospace'; ctx.fillStyle = COLORS.dim; ctx.fillText(`v${i}`, vx(i), vy + 34); ctx.fillStyle = st.Lch[i] >= 0 ? COLORS.blue : COLORS.red; ctx.fillText(`kênh ${st.Lch[i].toFixed(1)}`, vx(i), vy + 50); ctx.fillStyle = st.post[i] >= 0 ? COLORS.cyan : COLORS.red; ctx.fillText(`hậu ${st.post[i].toFixed(1)}`, vx(i), vy + 64); }
  ctx.textAlign = 'left'; ctx.fillStyle = COLORS.dim; ctx.font = '11px Consolas,monospace'; ctx.fillText('Nút kiểm tra (trên) ↔ nút biến (dưới) · xanh: tin “bit 0”, đỏ: tin “bit 1”', 16, h - 14);
  if (st.converged) { ctx.fillStyle = COLORS.green; ctx.font = '14px Consolas,monospace'; ctx.fillText('✓ HỘI TỤ', w - 120, 24); }
}

// ============ Digit classifier ============
const FONT = { 0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'], 1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'], 2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'], 3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'], 4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'], 5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'], 6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'], 7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'], 8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'], 9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'] };
const tpl = d => FONT[d].join('').split('').map(Number);
function buildDigit({ digit, noise, seed }) {
  digit = Number(digit); noise = Number(noise) / 100; seed = Number(seed) || 1; const img = tpl(digit).map((v, i) => hash(seed * 131 + i) < noise ? 1 - v : v);
  const W = Array.from({ length: 10 }, (_, k) => tpl(k).map(v => v ? 2 : -1)); const scores = W.map(w => w.reduce((s, wi, i) => s + wi * img[i], 0));
  const steps = [{ title: 'Ảnh đầu vào 5×7', text: `Ảnh chữ số ${digit}${noise ? ` với ${Math.round(noise * 100)}% điểm ảnh bị lật ngẫu nhiên` : ''}. Mỗi pixel là 0 hoặc 1, giống ảnh 28×28 của dự án nhưng thu nhỏ để nhìn được từng phép tính.`, img, scores: Array(10).fill(null), k: -1 }];
  const cur = Array(10).fill(null);
  for (let k = 0; k < 10; k++) { cur[k] = scores[k]; const hits = img.reduce((s, v, i) => s + (v && tpl(k)[i] ? 1 : 0), 0); steps.push({ title: `Lớp ${k}: tích chập MAC`, text: `score[${k}] = Σ pixel × trọng số int8 (+2 nếu mẫu số ${k} sáng, −1 nếu tối) = ${scores[k]}. Có ${hits} pixel sáng trùng mẫu. Đây là phép nhân-cộng mà khối MAC int8×int8→int32 trong FPGA làm song song.`, img, scores: cur.slice(), k }); }
  let best = 0; scores.forEach((s, i) => { if (s > scores[best]) best = i; });
  steps.push({ title: 'Argmax', text: `Chọn lớp có điểm cao nhất (khi bằng nhau lấy chỉ số nhỏ nhất, đúng quy ước của dự án): dự đoán = ${best}${best === digit ? ' ✓' : ' ✗ (nhiễu quá lớn)'}. Lưu ý: đây là mô hình mẫu minh họa, không phải trọng số MNIST thật của bạn.`, img, scores: scores.slice(), k: 10, best, digit });
  return { steps };
}
function drawDigit(ctx, w, h, st) {
  ctx.fillStyle = '#09131d'; ctx.fillRect(0, 0, w, h); const cell = 30, gx = 28, gy = 40;
  ctx.fillStyle = COLORS.dim; ctx.font = '11px Consolas,monospace'; ctx.fillText('ẢNH VÀO', gx, 24);
  st.img.forEach((v, i) => { const x = gx + (i % 5) * cell, y = gy + Math.floor(i / 5) * cell; ctx.fillStyle = v ? COLORS.cyan : '#10202c'; ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2); if (st.k >= 0 && st.k < 10 && tpl(st.k)[i]) { ctx.strokeStyle = COLORS.amber; ctx.lineWidth = 1.5; ctx.strokeRect(x + 2, y + 2, cell - 4, cell - 4); } });
  ctx.fillStyle = COLORS.dim; ctx.fillText(st.k >= 0 && st.k < 10 ? `viền vàng: mẫu số ${st.k}` : '', gx, gy + 7 * cell + 18);
  const bx = 240, bw = w - bx - 40, max = Math.max(1, ...st.scores.filter(s => s !== null).map(Math.abs));
  ctx.fillText('ĐIỂM TỪNG LỚP (int32)', bx, 24);
  for (let k = 0; k < 10; k++) { const y = 40 + k * 26, s = st.scores[k]; ctx.fillStyle = k === st.best && st.k === 10 ? COLORS.green : k === st.k ? COLORS.amber : COLORS.text; ctx.font = '13px Consolas,monospace'; ctx.fillText(String(k), bx, y + 14); ctx.fillStyle = '#10202c'; ctx.fillRect(bx + 22, y, bw, 18); if (s !== null) { const len = Math.max(0, s) / max * (bw - 46); ctx.fillStyle = k === st.best && st.k === 10 ? COLORS.green : k === st.k ? COLORS.amber : COLORS.blue; ctx.fillRect(bx + 22, y, len, 18); ctx.fillStyle = COLORS.text; ctx.fillText(String(s), bx + 22 + len + 6, y + 14); } }
}

// ============ Binary search by timestamp ============
const SEGMENTS = [0, 45, 120, 210, 300, 420, 555, 690, 810, 930, 1050, 1180];
function buildBsearch({ t }) {
  t = Math.max(0, Math.min(1500, Number(t) || 0)); let lo = 0, hi = SEGMENTS.length - 1; const steps = [{ title: 'Câu hỏi tại mốc thời gian', text: `Học viên bấm “Hỏi tại đây” ở giây thứ ${t}. Hệ thống cần biết câu hỏi thuộc đoạn bài giảng nào để giảng viên mở đúng clip. Các mốc bắt đầu đoạn đã sắp tăng dần nên dùng tìm nhị phân.`, lo, hi, mid: null, t }];
  let ans = 0; while (lo <= hi) { const mid = (lo + hi) >> 1; const go = SEGMENTS[mid] <= t; steps.push({ title: `So sánh với đoạn ${mid + 1}`, text: `mid = ${mid + 1}, bắt đầu ở ${SEGMENTS[mid]}s ${go ? '≤' : '>'} ${t}s → ${go ? 'ghi nhận ứng viên, tìm tiếp bên phải' : 'bỏ nửa phải'}.`, lo, hi, mid, t, ans: go ? mid : ans }); if (go) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
  steps.push({ title: 'Kết quả', text: `Câu hỏi thuộc đoạn ${ans + 1} (bắt đầu ${SEGMENTS[ans]}s). Chỉ cần ${steps.length - 1} lần so sánh thay vì quét ${SEGMENTS.length} đoạn.`, lo: ans, hi: ans, mid: ans, t, ans, done: true });
  return { steps };
}
function drawBsearch(ctx, w, h, st) {
  ctx.fillStyle = '#09131d'; ctx.fillRect(0, 0, w, h); const n = SEGMENTS.length, bw = Math.min(60, (w - 40) / n), x0 = (w - bw * n) / 2, y = 90;
  ctx.textAlign = 'center'; ctx.font = '11px Consolas,monospace';
  for (let i = 0; i < n; i++) { const inRange = st.lo <= i && i <= st.hi && !st.done; ctx.fillStyle = i === st.mid ? (st.done ? '#173126' : '#3b2f14') : inRange ? '#10303a' : '#0b1722'; ctx.fillRect(x0 + i * bw + 2, y, bw - 4, 60); ctx.strokeStyle = i === st.mid ? (st.done ? COLORS.green : COLORS.amber) : inRange ? COLORS.cyan : '#233747'; ctx.lineWidth = i === st.mid ? 2.4 : 1; ctx.strokeRect(x0 + i * bw + 2, y, bw - 4, 60); ctx.fillStyle = COLORS.text; ctx.fillText(`#${i + 1}`, x0 + i * bw + bw / 2, y + 24); ctx.fillStyle = COLORS.dim; ctx.fillText(`${SEGMENTS[i]}s`, x0 + i * bw + bw / 2, y + 44); }
  ctx.fillStyle = COLORS.red; const tx = x0 + (Math.max(0, SEGMENTS.findLastIndex(v => v <= st.t)) + Math.min(1, (st.t - SEGMENTS[Math.max(0, SEGMENTS.findLastIndex(v => v <= st.t))]) / 150)) * bw; ctx.fillText('▼ ' + st.t + 's', Math.min(w - 30, Math.max(30, tx)), y - 14);
  if (st.mid !== null && !st.done) { ctx.fillStyle = COLORS.amber; ctx.fillText('mid', x0 + st.mid * bw + bw / 2, y + 80); } ctx.fillStyle = COLORS.cyan; if (!st.done) { ctx.fillText('lo', x0 + st.lo * bw + bw / 2, y + 100); ctx.fillText('hi', x0 + st.hi * bw + bw / 2, y + 116); }
  ctx.textAlign = 'left';
}

// ============ Token bucket quota ============
function buildQuota({ capacity, refill, gap }) {
  capacity = Math.max(1, Math.min(10, Number(capacity) || 5)); refill = Math.max(1, Number(refill) || 6); gap = Math.max(1, Number(gap) || 2); let tokens = capacity, last = 0; const log = [];
  const steps = [{ title: 'Khởi tạo xô token', text: `Mỗi người dùng có xô chứa tối đa ${capacity} lượt gọi AI, đầy lúc đầu. Cứ ${refill}s nạp thêm 1 lượt. Hàm consume_ai_quota trong cơ sở dữ liệu làm đúng việc này để chống lạm dụng.`, tokens, capacity, log: [], t: 0 }];
  for (let k = 1; k <= 14; k++) { const t = k * gap; const add = Math.floor((t - last) / refill); if (add > 0) { tokens = Math.min(capacity, tokens + add); last += add * refill; } const allow = tokens > 0; if (allow) tokens--; log.push({ t, allow }); steps.push({ title: `Yêu cầu #${k} lúc ${t}s`, text: allow ? `Còn token → cho phép, trừ 1. Còn ${tokens}.` : 'Hết token → từ chối (HTTP 429), người dùng phải đợi nạp.', tokens, capacity, log: log.slice(), t, allow }); }
  return { steps };
}
function drawQuota(ctx, w, h, st) {
  ctx.fillStyle = '#09131d'; ctx.fillRect(0, 0, w, h); ctx.font = '11px Consolas,monospace'; ctx.fillStyle = COLORS.dim; ctx.fillText('XÔ TOKEN', 28, 28);
  for (let i = 0; i < st.capacity; i++) { const x = 40 + i * 44; ctx.beginPath(); ctx.arc(x, 78, 17, 0, 7); ctx.fillStyle = i < st.tokens ? '#10303a' : '#0b1722'; ctx.fill(); ctx.strokeStyle = i < st.tokens ? COLORS.cyan : '#2b4250'; ctx.lineWidth = 2; ctx.stroke(); if (i < st.tokens) { ctx.fillStyle = COLORS.cyan; ctx.beginPath(); ctx.arc(x, 78, 7, 0, 7); ctx.fill(); } }
  ctx.fillStyle = COLORS.dim; ctx.fillText('DÒNG YÊU CẦU', 28, 150); const bw = Math.min(38, (w - 60) / 14);
  st.log.forEach((e, i) => { const x = 30 + i * bw; ctx.fillStyle = e.allow ? '#173126' : '#3a1b24'; ctx.fillRect(x, 164, bw - 4, 56); ctx.strokeStyle = e.allow ? COLORS.green : COLORS.red; ctx.lineWidth = 1.5; ctx.strokeRect(x, 164, bw - 4, 56); ctx.fillStyle = e.allow ? COLORS.green : COLORS.red; ctx.textAlign = 'center'; ctx.fillText(e.allow ? '200' : '429', x + (bw - 4) / 2, 188); ctx.fillStyle = COLORS.dim; ctx.fillText(`${e.t}s`, x + (bw - 4) / 2, 208); ctx.textAlign = 'left'; });
}

export const ALGORITHMS = {
  fpadd: { title: 'Cộng số thực IEEE 754 (float32)', desc: 'Từng bước bộ cộng dấu phẩy động: tách trường bit, căn mũ, cộng mantissa, chuẩn hóa, làm tròn về chẵn, đối chiếu với float32 chuẩn.', controls: [{ id: 'a', label: 'Số A', type: 'text', value: '5.75' }, { id: 'b', label: 'Số B', type: 'text', value: '0.15625' }, { id: 'op', label: 'Phép tính', type: 'select', value: 'add', options: [['add', 'A + B'], ['sub', 'A − B']] }], build: buildFpAdd, draw: (ctx, w, h, st) => { ctx.fillStyle = '#09131d'; ctx.fillRect(0, 0, w, h); drawLines(ctx, w, h, st.lines, { top: 30 }); } },
  uart: { title: 'Khung truyền UART 8N1 (TX → RX)', desc: 'Một byte đi từ máy phát sang máy thu: START, 8 bit dữ liệu LSB trước, STOP; RX lấy mẫu giữa bit với oversampling 16×. Thử gây lỗi STOP để thấy frame_err.', controls: [{ id: 'byte', label: 'Byte gửi (0–255)', type: 'number', value: 165, min: 0, max: 255, step: 1 }, { id: 'frameErr', label: 'Gây lỗi bit STOP', type: 'select', value: 'no', options: [['no', 'Không'], ['yes', 'Có (STOP = 0)']] }], build: buildUart, draw: drawUart },
  ldpc: { title: 'Giải mã LDPC offset min-sum (mã (7,4) minh họa)', desc: 'Lan truyền niềm tin trên đồ thị Tanner: nút kiểm tra (CNP) và nút biến (VNP) trao đổi LLR qua từng vòng cho tới khi syndrome bằng 0. Dùng mã nhỏ để nhìn rõ từng thông điệp; thuật toán giống bộ giải mã QC-LDPC của đề tài.', controls: [{ id: 'sigma', label: 'Độ lệch chuẩn nhiễu σ', type: 'number', value: 0.9, min: 0.3, max: 2, step: 0.1 }, { id: 'seed', label: 'Hạt giống nhiễu', type: 'number', value: 7, min: 1, max: 99, step: 1 }, { id: 'flip', label: 'Ép lỗi tại bit', type: 'select', value: '2', options: [['-1', 'Không'], ...Array.from({ length: 7 }, (_, i) => [String(i), `v${i}`])] }, { id: 'offset', label: 'Offset', type: 'number', value: 0.5, min: 0, max: 2, step: 0.25 }], build: buildLdpc, draw: drawLdpc },
  digit: { title: 'Nhận diện chữ số bằng phép nhân-cộng int8', desc: 'Suy luận một lớp: mỗi lớp 0–9 tính tích vô hướng ảnh với trọng số int8, rồi argmax. Cùng cấu trúc MAC → argmax của bộ tăng tốc TinyML, nhưng dùng mẫu 5×7 để nhìn thấy từng phép tính.', controls: [{ id: 'digit', label: 'Chữ số', type: 'select', value: '4', options: Array.from({ length: 10 }, (_, i) => [String(i), String(i)]) }, { id: 'noise', label: 'Nhiễu (% pixel lật)', type: 'number', value: 8, min: 0, max: 40, step: 2 }, { id: 'seed', label: 'Hạt giống', type: 'number', value: 3, min: 1, max: 99, step: 1 }], build: buildDigit, draw: drawDigit },
  bsearch: { title: 'Tìm đoạn bài giảng theo mốc thời gian', desc: 'Khi học viên hỏi tại phút đang xem, tìm nhị phân trên danh sách mốc đoạn để mở đúng clip cho giảng viên.', controls: [{ id: 't', label: 'Mốc thời gian (giây)', type: 'number', value: 640, min: 0, max: 1500, step: 5 }], build: buildBsearch, draw: drawBsearch },
  quota: { title: 'Giới hạn lượt dùng AI bằng xô token', desc: 'Cơ chế token bucket: mỗi lượt gọi AI tiêu 1 token, token được nạp dần theo thời gian; hết token thì từ chối.', controls: [{ id: 'capacity', label: 'Dung lượng xô', type: 'number', value: 5, min: 1, max: 10, step: 1 }, { id: 'refill', label: 'Nạp 1 token mỗi (giây)', type: 'number', value: 8, min: 1, max: 30, step: 1 }, { id: 'gap', label: 'Khoảng cách yêu cầu (giây)', type: 'number', value: 2, min: 1, max: 10, step: 1 }], build: buildQuota, draw: drawQuota }
};
export function guessAlgo(item) {
  const s = `${item.title} ${item.category} ${item.tags}`.toLowerCase();
  if (/ldpc/.test(s)) return 'ldpc'; if (/mnist|tinyml/.test(s)) return 'digit'; if (/ieee ?754|dấu phẩy động|alu/.test(s)) return 'fpadd'; if (/uart/.test(s)) return 'uart'; if (/mooc/.test(s)) return 'bsearch'; if (/wardrobe/.test(s)) return 'quota'; return 'fpadd';
}

// ============ Player ============
export function createAlgoPlayer({ root, reducedMotion = false }) {
  root.innerHTML = `<div class="algo-top"><div><label for="algo-select">Thuật toán</label><select id="algo-select"></select></div><p class="algo-desc" id="algo-desc"></p></div>
  <div class="algo-main"><div class="algo-controls" id="algo-controls"></div><div class="algo-stage"><canvas id="algo-canvas" aria-label="Mô phỏng thuật toán"></canvas></div></div>
  <div class="algo-explain" aria-live="polite"><strong id="algo-step-title"></strong><p id="algo-step-text"></p></div>
  <div class="algo-transport"><button class="btn small" id="algo-prev" aria-label="Bước trước">◀ Lùi</button><button class="btn primary small" id="algo-play">▶ Chạy</button><button class="btn small" id="algo-next" aria-label="Bước tiếp">Tiếp ▶</button><button class="btn small" id="algo-reset">Về đầu</button><input type="range" id="algo-scrub" min="0" max="0" value="0" aria-label="Chọn bước"><span id="algo-count" class="algo-count"></span><select id="algo-speed" aria-label="Tốc độ"><option value="1400">Chậm</option><option value="900" selected>Vừa</option><option value="450">Nhanh</option></select></div>`;
  const $ = s => root.querySelector(s), canvas = $('#algo-canvas'), ctx = canvas.getContext('2d');
  $('#algo-select').innerHTML = Object.entries(ALGORITHMS).map(([k, a]) => `<option value="${k}">${a.title}</option>`).join('');
  let key = 'fpadd', built = { steps: [] }, idx = 0, playing = false, timer = 0, visible = false, dirty = true;
  const params = () => Object.fromEntries([...root.querySelectorAll('#algo-controls [data-p]')].map(el => [el.dataset.p, el.value]));
  function renderControls() {
    const a = ALGORITHMS[key]; $('#algo-desc').textContent = a.desc;
    $('#algo-controls').innerHTML = a.controls.map(c => `<label for="p-${c.id}">${c.label}</label>${c.type === 'select' ? `<select id="p-${c.id}" data-p="${c.id}">${c.options.map(([v, l]) => `<option value="${v}" ${String(v) === String(c.value) ? 'selected' : ''}>${l}</option>`).join('')}</select>` : `<input id="p-${c.id}" data-p="${c.id}" type="${c.type}" value="${c.value}" ${c.min !== undefined ? `min="${c.min}" max="${c.max}" step="${c.step}"` : ''}>`}`).join('');
  }
  function rebuild(keepIndex = false) { built = ALGORITHMS[key].build(params()); idx = keepIndex ? Math.min(idx, built.steps.length - 1) : 0; $('#algo-scrub').max = built.steps.length - 1; show(); }
  function show() { const st = built.steps[idx]; $('#algo-step-title').textContent = st?.title || ''; $('#algo-step-text').textContent = st?.text || ''; $('#algo-scrub').value = idx; $('#algo-count').textContent = `${idx + 1} / ${built.steps.length}`; $('#algo-prev').disabled = idx === 0; $('#algo-next').disabled = idx >= built.steps.length - 1; dirty = true; }
  function go(i) { idx = Math.max(0, Math.min(built.steps.length - 1, i)); show(); }
  function stop() { playing = false; clearInterval(timer); $('#algo-play').textContent = '▶ Chạy'; }
  function play() { if (idx >= built.steps.length - 1) idx = 0; playing = true; $('#algo-play').textContent = '⏸ Dừng'; show(); clearInterval(timer); timer = setInterval(() => { if (idx >= built.steps.length - 1) { stop(); return; } go(idx + 1); }, Number($('#algo-speed').value)); }
  $('#algo-select').addEventListener('change', e => { stop(); key = e.target.value; renderControls(); rebuild(); });
  $('#algo-controls').addEventListener('input', () => { stop(); rebuild(true); });
  $('#algo-prev').addEventListener('click', () => { stop(); go(idx - 1); }); $('#algo-next').addEventListener('click', () => { stop(); go(idx + 1); });
  $('#algo-reset').addEventListener('click', () => { stop(); go(0); }); $('#algo-scrub').addEventListener('input', e => { stop(); go(Number(e.target.value)); });
  $('#algo-play').addEventListener('click', () => playing ? stop() : play());
  $('#algo-speed').addEventListener('change', () => { if (playing) play(); });
  document.addEventListener('keydown', e => { if (!visible || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return; if (e.key === 'ArrowRight') { stop(); go(idx + 1); } else if (e.key === 'ArrowLeft') { stop(); go(idx - 1); } else if (e.key === ' ') { e.preventDefault(); playing ? stop() : play(); } });
  function loop() { requestAnimationFrame(loop); if (!visible || !dirty) return; const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio, 2); if (r.width < 1) return; if (canvas.width !== Math.round(r.width * dpr) || canvas.height !== Math.round(r.height * dpr)) { canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr); } ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; const st = built.steps[idx]; if (st) ALGORITHMS[key].draw(ctx, r.width, r.height, st, idx, built.steps); dirty = false; }
  new ResizeObserver(() => { dirty = true; }).observe(canvas);
  renderControls(); rebuild(); requestAnimationFrame(loop);
  return { setVisible(v) { visible = v; dirty = true; if (!v) stop(); }, select(k) { if (!ALGORITHMS[k]) return; stop(); key = k; $('#algo-select').value = k; renderControls(); rebuild(); } };
}
