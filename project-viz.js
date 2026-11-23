// Per-project visuals: model type, default block diagram, default simulation, cover art (SVG) and block diagram renderer.
// The 3D model lives in project-model.js so Three.js only loads when a model is shown.
export const MODEL_TYPES = {
  cpu: { label: 'Bộ xử lý / Digital IC', short: 'CPU' },
  amplifier: { label: 'Mạch khuếch đại / Analog IC', short: 'AMP' },
  fpga: { label: 'FPGA / Logic khả trình', short: 'FPGA' },
  lowpower: { label: 'Thiết kế công suất thấp', short: 'LP' },
  adc: { label: 'ADC / Mixed-signal', short: 'ADC' },
  filter: { label: 'Bộ lọc / Xử lý tín hiệu', short: 'DSP' },
  codec: { label: 'Mã hóa kênh / Giải mã LDPC', short: 'LDPC' },
  nn: { label: 'AI phần cứng / Mạng nơ-ron', short: 'AI-HW' },
  uart: { label: 'Giao tiếp nối tiếp / UART', short: 'UART' },
  web: { label: 'Ứng dụng web / Cloud', short: 'WEB' }
};
export const SIM_MODELS = {
  basic: 'Dạng sóng cơ bản',
  clock: 'Xung clock & bus dữ liệu',
  counter: 'Bộ đếm / chia tần',
  amplifier: 'Khuếch đại tín hiệu nhỏ',
  gating: 'Clock gating (tiết kiệm công suất)',
  adc: 'Lấy mẫu & lượng tử hóa ADC',
  filter: 'Bộ lọc RC thông thấp',
  awgn: 'Kênh AWGN & giải mã (BER)',
  uart: 'Khung UART 8N1',
  request: 'Lưu lượng request web'
};
export function guessModel(item) {
  if (item.model && MODEL_TYPES[item.model]) return item.model;
  const s = `${item.category} ${item.tags} ${item.title}`.toLowerCase();
  if (/ldpc|mã hóa kênh|decoder|giải mã/.test(s)) return 'codec';
  if (/tinyml|mlp|neural|nơ-ron|mnist|ai phần cứng/.test(s)) return 'nn';
  if (/uart|serial|nối tiếp|fifo/.test(s)) return 'uart';
  if (/web|next\.js|react|cloud|fastapi|supabase/.test(s)) return 'web';
  if (/fpga|counter|đếm|verilog board/.test(s)) return 'fpga';
  if (/low-?power|công suất|clock gating|gating/.test(s)) return 'lowpower';
  if (/adc|dac|mixed|lấy mẫu|sampling/.test(s)) return 'adc';
  if (/filter|lọc|dsp|fir|iir/.test(s)) return 'filter';
  if (/analog|cmos|amp|khuếch đại|spice|op-?amp/.test(s)) return 'amplifier';
  return 'cpu';
}
export const DEFAULT_BLOCKS = {
  cpu: 'Bộ nhớ lệnh -> Fetch -> Decode -> Execute (ALU) -> Writeback\nDecode -> Register File -> Execute (ALU)\nExecute (ALU) -> Bộ nhớ dữ liệu -> Writeback\nWriteback -> Register File',
  amplifier: 'Tín hiệu vào -> Tầng vi sai -> Tầng khuếch đại -> Tầng đệm ra -> Tải\nNguồn phân cực -> Tầng vi sai\nNguồn phân cực -> Tầng khuếch đại\nTầng đệm ra -> Hồi tiếp -> Tầng vi sai',
  fpga: 'Dao động 50 MHz -> Bộ chia tần -> Bộ đếm 4-bit -> Giải mã LED 7 đoạn -> Hiển thị\nNút nhấn -> Chống dội -> Bộ đếm 4-bit\nBộ đếm 4-bit -> UART TX -> Máy tính',
  lowpower: 'Clock gốc -> Cổng gating -> Khối logic -> Thanh ghi\nBộ điều khiển công suất -> Cổng gating\nKhối logic -> Cảm biến hoạt động -> Bộ điều khiển công suất',
  adc: 'Tín hiệu analog -> Lọc chống chồng phổ -> Sample & Hold -> Bộ so sánh -> SAR logic -> Mã số N-bit\nSAR logic -> DAC nội -> Bộ so sánh\nĐiện áp tham chiếu -> DAC nội',
  filter: 'Tín hiệu vào -> Bộ lọc RC -> Khuếch đại đệm -> Tín hiệu ra\nNhiễu -> Tín hiệu vào',
  codec: 'Bit tin -> Bộ mã hóa QC-LDPC -> Điều chế BPSK -> Kênh AWGN -> LLR -> Bộ giải mã min-sum\nBộ giải mã min-sum -> VNP -> CNP -> Bộ giải mã min-sum\nBộ giải mã min-sum -> Bit giải mã -> Đếm BER',
  nn: 'Máy tính -> UART RX -> RAM ảnh -> Lớp FC 784→32 -> ReLU / Requant -> Lớp FC 32→10 -> Argmax -> LED 7 đoạn\nROM trọng số -> Lớp FC 784→32\nROM trọng số -> Lớp FC 32→10\nArgmax -> UART TX -> Máy tính',
  uart: 'Dữ liệu vào -> TX FIFO -> UART TX -> Đường TX\nBaud gen -> UART TX\nĐường RX -> UART RX -> RX FIFO -> Dữ liệu ra\nBaud gen -> UART RX',
  web: 'Người dùng -> Giao diện web -> API -> Cơ sở dữ liệu\nAPI -> Dịch vụ AI\nAPI -> Lưu trữ tệp\nGiao diện web -> Xác thực -> API'
};
export const DEFAULT_SIM = {
  cpu: { model: 'clock', amp: 1.2, freq: 4, phase: 0, wave: 'square', param: 4 },
  amplifier: { model: 'amplifier', amp: 0.3, freq: 2, phase: 0, wave: 'sine', param: 8 },
  fpga: { model: 'counter', amp: 1, freq: 4, phase: 0, wave: 'square', param: 4 },
  lowpower: { model: 'gating', amp: 1, freq: 6, phase: 0, wave: 'square', param: 40 },
  adc: { model: 'adc', amp: 2.5, freq: 1.5, phase: 0, wave: 'sine', param: 3 },
  filter: { model: 'filter', amp: 1.5, freq: 3, phase: 0, wave: 'square', param: 2 },
  codec: { model: 'awgn', amp: 1, freq: 8, phase: 0, wave: 'square', param: 4 },
  nn: { model: 'uart', amp: 1, freq: 6, phase: 0, wave: 'square', param: 77 },
  uart: { model: 'uart', amp: 1, freq: 6, phase: 0, wave: 'square', param: 85 },
  web: { model: 'request', amp: 2, freq: 2, phase: 0, wave: 'sine', param: 40 }
};
export const blocksOf = item => (item.blocks && item.blocks.trim()) ? item.blocks : DEFAULT_BLOCKS[guessModel(item)];
export const simOf = item => ({ ...DEFAULT_SIM[guessModel(item)], ...(item.sim || {}) });

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Block diagram ----------
export function parseBlocks(text) {
  const nodes = new Map(), edges = [];
  const add = name => { const key = name.trim().slice(0, 40); if (!key) return null; if (!nodes.has(key)) nodes.set(key, { id: key, out: [], in: [] }); return key; };
  for (const line of String(text || '').split('\n').slice(0, 40)) {
    const parts = line.split(/->|=>/).map(s => s.trim()).filter(Boolean);
    if (parts.length === 1) add(parts[0]);
    for (let i = 0; i < parts.length - 1; i++) { const a = add(parts[i]), b = add(parts[i + 1]); if (a && b && a !== b && !edges.some(e => e.a === a && e.b === b)) { edges.push({ a, b }); nodes.get(a).out.push(b); nodes.get(b).in.push(a); } }
    if (nodes.size > 30) break;
  }
  return { nodes, edges };
}
export function blockDiagramSVG(text, { compact = false } = {}) {
  const { nodes, edges } = parseBlocks(text);
  if (!nodes.size) return '<p class="info-note">Chưa có sơ đồ khối. Mở “Chỉnh sửa” và nhập dạng: Khối A -> Khối B -> Khối C</p>';
  // Detect back edges with DFS so cycles (feedback paths) still layout left-to-right.
  const state = new Map(), back = new Set();
  const visit = id => { state.set(id, 1); for (const n of nodes.get(id).out) { if (state.get(n) === 1) back.add(id + '\u0000' + n); else if (!state.get(n)) visit(n); } state.set(id, 2); };
  for (const id of nodes.keys()) if (!state.get(id) && !nodes.get(id).in.length) visit(id);
  for (const id of nodes.keys()) if (!state.get(id)) visit(id);
  const fwd = edges.filter(e => !back.has(e.a + '\u0000' + e.b));
  const layer = new Map([...nodes.keys()].map(k => [k, 0]));
  for (let pass = 0; pass < nodes.size; pass++) for (const e of fwd) if (layer.get(e.b) < layer.get(e.a) + 1) layer.set(e.b, layer.get(e.a) + 1);
  const cols = []; for (const [id, l] of layer) (cols[l] ||= []).push(id);
  // Order within a column by average position of predecessors (one barycenter sweep).
  const order = new Map(); cols.forEach(col => col.forEach((id, i) => order.set(id, i)));
  for (let l = 1; l < cols.length; l++) { cols[l].sort((a, b) => { const avg = id => { const p = nodes.get(id).in.filter(x => layer.get(x) < l); return p.length ? p.reduce((s, x) => s + order.get(x), 0) / p.length : 99; }; return avg(a) - avg(b); }); cols[l].forEach((id, i) => order.set(id, i)); }
  const W = 150, H = 50, GX = 70, GY = 26, pad = 20;
  const maxRows = Math.max(...cols.map(c => c.length));
  const width = pad * 2 + cols.length * W + (cols.length - 1) * GX, height = pad * 2 + maxRows * H + (maxRows - 1) * GY + 30;
  const pos = new Map();
  cols.forEach((col, l) => { const colH = col.length * H + (col.length - 1) * GY; col.forEach((id, i) => pos.set(id, { x: pad + l * (W + GX), y: pad + (maxRows * H + (maxRows - 1) * GY - colH) / 2 + i * (H + GY) })); });
  const palette = ['#6ce9d9', '#7fa8ec', '#b08edb', '#e6c27a', '#8fd6a0'];
  const wrap = name => { const words = name.split(/\s+/); const lines = ['']; for (const w of words) { if ((lines.at(-1) + ' ' + w).trim().length > 18 && lines.at(-1)) lines.push(w); else lines[lines.length - 1] = (lines.at(-1) + ' ' + w).trim(); } return lines.slice(0, 2); };
  let paths = '';
  for (const e of edges) {
    const A = pos.get(e.a), B = pos.get(e.b); const isBack = back.has(e.a + '\u0000' + e.b);
    if (!isBack && B.x > A.x) { const x1 = A.x + W, y1 = A.y + H / 2, x2 = B.x - 4, y2 = B.y + H / 2, mx = (x1 + x2) / 2; paths += `<path d="M${x1} ${y1}C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}" class="bd-edge"/>`; }
    else { const x1 = A.x + W / 2, y1 = A.y + H, x2 = B.x + W / 2, y2 = B.y + H + 4, low = height - 12; paths += `<path d="M${x1} ${y1}C${x1} ${low} ${x2} ${low} ${x2} ${y2}" class="bd-edge bd-back"/>`; }
  }
  const boxes = [...pos].map(([id, p]) => { const l = layer.get(id), c = palette[l % palette.length]; const lines = wrap(id); return `<g class="bd-node"><rect x="${p.x}" y="${p.y}" width="${W}" height="${H}" rx="9" style="stroke:${c}"/><rect x="${p.x}" y="${p.y}" width="4" height="${H}" rx="2" style="fill:${c}"/>${lines.map((t, i) => `<text x="${p.x + W / 2 + 2}" y="${p.y + H / 2 + (i - (lines.length - 1) / 2) * 15 + 4}">${esc(t)}</text>`).join('')}</g>`; }).join('');
  return `<svg class="block-diagram${compact ? ' compact' : ''}" viewBox="0 0 ${width} ${height}" style="width:${compact ? width * .6 : width}px" role="img" aria-label="Sơ đồ khối ${nodes.size} khối"><defs><marker id="bd-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="#6ce9d9"/></marker></defs>${paths}${boxes}</svg>`;
}

// ---------- Cover art ----------
export function coverArt(type, seed = '') {
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0; const r = i => ((h >> (i % 24)) & 7) / 7;
  const grid = `<defs><pattern id="g-${type}" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0H0V16" fill="none" stroke="#2c6776" stroke-opacity=".25"/></pattern><radialGradient id="glow-${type}" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#6ce9d9" stop-opacity=".18"/><stop offset="1" stop-color="#6ce9d9" stop-opacity="0"/></radialGradient></defs><rect width="320" height="145" fill="url(#g-${type})"/><rect width="320" height="145" fill="url(#glow-${type})"/>`;
  let art = '';
  if (type === 'amplifier') {
    art = `<g fill="none" stroke-width="2"><path d="M110 30v85l90-42.5z" stroke="#6ce9d9" fill="#10303a"/><path d="M60 55h50M60 92h50M200 72h60" stroke="#618fca"/><path d="M200 72v-48h-75v18" stroke="#b08edb" stroke-dasharray="4 4"/></g><text x="120" y="61" fill="#6ce9d9" font-size="16">−</text><text x="119" y="99" fill="#6ce9d9" font-size="16">+</text><path d="M8 92q8-${18 + r(1) * 10} 16 0t16 0t16 0" fill="none" stroke="#e6c27a" stroke-width="1.6"/><path d="M262 72q12-${40 + r(2) * 12} 24 0t24 0" fill="none" stroke="#6ce9d9" stroke-width="2"/>`;
  } else if (type === 'fpga') {
    const cells = Array.from({ length: 48 }, (_, i) => { const x = 70 + (i % 12) * 15, y = 26 + Math.floor(i / 12) * 24; const on = ((h >> (i % 30)) & 1); return `<rect x="${x}" y="${y}" width="11" height="17" rx="2" fill="${on ? '#1f5a5e' : '#132836'}" stroke="${on ? '#6ce9d9' : '#2c4a5a'}" stroke-width=".8"/>`; }).join('');
    art = `<rect x="60" y="16" width="200" height="113" rx="6" fill="#0b1823" stroke="#4f8f93"/>${cells}<path d="M20 40h40M20 60h40M20 80h40M20 100h40M260 50h40M260 72h40M260 94h40" stroke="#456b70"/><text x="160" y="140" fill="#6d8fa0" font-size="9" text-anchor="middle" font-family="monospace">CLB ARRAY</text>`;
  } else if (type === 'lowpower') {
    art = `<path d="M10 40h18v-16h18v16h18v-16h18v16h18v-16h18v16h18v-16h18v16" fill="none" stroke="#618fca" stroke-width="1.6"/><path d="M10 105h18v-16h18v16h18v-16h18v16h60v-16h18v16h18v-16h18v16h40" fill="none" stroke="#6ce9d9" stroke-width="2"/><rect x="120" y="82" width="64" height="30" fill="#e6c27a18" stroke="#e6c27a" stroke-dasharray="3 3"/><text x="152" y="128" fill="#e6c27a" font-size="9" text-anchor="middle" font-family="monospace">GATED</text><circle cx="270" cy="62" r="26" fill="none" stroke="#8fd6a0" stroke-width="2"/><path d="M270 44v18" stroke="#8fd6a0" stroke-width="2"/>`;
  } else if (type === 'adc') {
    let stair = 'M20 110'; for (let i = 0; i <= 14; i++) { const y = 72 - Math.round(Math.sin(i / 14 * Math.PI * 2) * 4) * 9; stair += `H${20 + i * 20}V${y}`; }
    art = `<path d="M20 72${Array.from({ length: 57 }, (_, i) => `L${20 + i * 5} ${72 - Math.sin(i / 56 * Math.PI * 2) * 38}`).join('')}" fill="none" stroke="#618fca" stroke-width="1.5"/><path d="${stair}" fill="none" stroke="#6ce9d9" stroke-width="2"/><text x="300" y="20" fill="#6d8fa0" font-size="9" text-anchor="end" font-family="monospace">${3 + Math.round(r(3) * 5)}-BIT</text>`;
  } else if (type === 'filter') {
    art = `<path d="M20 100h60v-50h60v50h60v-50h60v50h40" fill="none" stroke="#618fca" stroke-width="1.4" opacity=".7"/><path d="M20 100h60c20 0 20-48 60-50s20 50 60 50 20-48 60-50 20 50 40 50" fill="none" stroke="#6ce9d9" stroke-width="2.2"/><text x="300" y="20" fill="#6d8fa0" font-size="9" text-anchor="end" font-family="monospace">RC LOW-PASS</text>`;
  } else if (type === 'codec') {
    const bits = Array.from({ length: 16 }, (_, i) => ((h >> i) & 1)); let path = 'M10 50'; bits.forEach((b, i) => { path += `V${b ? 30 : 60}H${10 + (i + 1) * 18}`; });
    let noisy = 'M10 110'; for (let i = 0; i <= 96; i++) { const b = bits[Math.min(15, Math.floor(i / 6))]; noisy += `L${10 + i * 3} ${110 - (b ? 14 : -14) - Math.sin(i * 2.3 + h) * 8 - Math.sin(i * 5.1) * 5}`; }
    art = `<path d="${path}" fill="none" stroke="#6ce9d9" stroke-width="2"/><path d="${noisy}" fill="none" stroke="#e6c27a" stroke-width="1.3" opacity=".85"/><text x="306" y="20" fill="#6d8fa0" font-size="9" text-anchor="end" font-family="monospace">QC-LDPC · AWGN</text><g fill="#b08edb">${Array.from({ length: 6 }, (_, i) => `<circle cx="${236 + (i % 3) * 22}" cy="${i < 3 ? 45 : 70}" r="4"/>`).join('')}</g>`;
  } else if (type === 'nn') {
    const layers = [5, 4, 3]; let lines = '', dots = '';
    layers.forEach((n, l) => { for (let i = 0; i < n; i++) { const x = 90 + l * 70, y = 72 + (i - (n - 1) / 2) * 24; dots += `<circle cx="${x}" cy="${y}" r="6" fill="#10303a" stroke="${['#7fa8ec', '#6ce9d9', '#e6c27a'][l]}" stroke-width="1.6"/>`; if (l < 2) for (let j = 0; j < layers[l + 1]; j++) lines += `<path d="M${x} ${y}L${x + 70} ${72 + (j - (layers[l + 1] - 1) / 2) * 24}" stroke="#2c6776" stroke-width=".8"/>`; } });
    art = `<rect x="22" y="44" width="42" height="42" fill="#0d2230" stroke="#4f8f93"/>${Array.from({ length: 16 }, (_, i) => `<rect x="${24 + (i % 4) * 10}" y="${46 + Math.floor(i / 4) * 10}" width="8" height="8" fill="#6ce9d9" opacity="${((h >> i) & 1) ? .8 : .1}"/>`).join('')}${lines}${dots}<rect x="270" y="52" width="30" height="40" rx="3" fill="#0d2230" stroke="#e6c27a"/><text x="285" y="80" fill="#e6c27a" font-size="22" text-anchor="middle" font-family="monospace">${h % 10}</text>`;
  } else if (type === 'uart') {
    const byte = h & 255; const frame = [0, ...Array.from({ length: 8 }, (_, i) => (byte >> i) & 1), 1]; let path = 'M10 40H40'; frame.forEach((b, i) => { path += `V${b ? 40 : 70}H${40 + (i + 1) * 24}`; }); path += 'V40H310';
    art = `<path d="${path}" fill="none" stroke="#6ce9d9" stroke-width="2"/>${frame.map((b, i) => `<text x="${52 + i * 24}" y="88" fill="#6d8fa0" font-size="9" text-anchor="middle" font-family="monospace">${i === 0 ? 'S' : i === 9 ? 'P' : b}</text>`).join('')}<g fill="none" stroke="#b08edb">${Array.from({ length: 8 }, (_, i) => `<rect x="${40 + i * 30}" y="104" width="24" height="22" rx="2"/>`).join('')}</g><text x="306" y="20" fill="#6d8fa0" font-size="9" text-anchor="end" font-family="monospace">8N1 · FIFO 16</text>`;
  } else if (type === 'web') {
    art = `<rect x="30" y="28" width="120" height="86" rx="6" fill="#0d2230" stroke="#4f8f93"/><rect x="30" y="28" width="120" height="14" rx="6" fill="#16303f"/><circle cx="40" cy="35" r="2.5" fill="#ef8f9b"/><circle cx="49" cy="35" r="2.5" fill="#e6c27a"/><circle cx="58" cy="35" r="2.5" fill="#8fd6a0"/><rect x="40" y="52" width="60" height="8" rx="2" fill="#6ce9d9" opacity=".7"/><rect x="40" y="66" width="96" height="5" rx="2" fill="#2c6776"/><rect x="40" y="76" width="80" height="5" rx="2" fill="#2c6776"/><rect x="40" y="92" width="36" height="12" rx="3" fill="#b08edb" opacity=".7"/><path d="M150 72h50" stroke="#6ce9d9" stroke-dasharray="4 4"/><g fill="#0d2230" stroke="#e6c27a"><ellipse cx="240" cy="44" rx="30" ry="9"/><path d="M210 44v50c0 5 13 9 30 9s30-4 30-9V44"/><ellipse cx="240" cy="69" rx="30" ry="9" fill="none"/></g>`;
  } else {
    const blocks = Array.from({ length: 26 }, (_, i) => { const x = 91 + (i % 6) * 23, y = 30 + Math.floor(i / 6) * 19; return `<rect x="${x}" y="${y}" width="${9 + (i % 3) * 5}" height="${8 + (i % 2) * 6}" fill="${['#365f61', '#719f98', '#9d8c6b', '#526b89', '#426b72'][(i + h) % 5]}" opacity="${.4 + (i % 4) * .15}"/>`; }).join('');
    const lines = Array.from({ length: 8 }, (_, i) => `<path d="M${95 + i * 19} 12v12m0 95v14M65 ${30 + i * 12}h17m153 0h20"/>`).join('');
    art = `<g fill="none" stroke="#456b70">${lines}<rect x="81" y="23" width="154" height="96" rx="5" stroke="#6caca8"/></g>${blocks}<rect x="139" y="51" width="48" height="43" rx="2" fill="#122a35" stroke="#6ce9d9"/><path d="M149 65h28m-28 7h20m-20 7h28" stroke="#6ce9d9" opacity=".7"/>`;
  }
  return `<svg viewBox="0 0 320 145" aria-hidden="true" preserveAspectRatio="xMidYMid slice">${grid}${art}</svg>`;
}
