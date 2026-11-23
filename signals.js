// Signal models for the oscilloscope. Pure drawing, illustrative (not SPICE).
export const PARAM_INFO = {
  basic: null,
  clock: { label: 'Độ rộng bus (bit)', min: 2, max: 8, step: 1, unit: ' bit' },
  counter: { label: 'Số bit bộ đếm', min: 2, max: 6, step: 1, unit: ' bit' },
  amplifier: { label: 'Hệ số khuếch đại Av', min: 1, max: 30, step: 1, unit: '×' },
  gating: { label: 'Tỉ lệ thời gian bật EN', min: 5, max: 95, step: 5, unit: '%' },
  adc: { label: 'Độ phân giải ADC', min: 1, max: 8, step: 1, unit: ' bit' },
  filter: { label: 'Tần số cắt fc', min: .5, max: 20, step: .5, unit: ' Hz' },
  awgn: { label: 'Eb/N0', min: 0, max: 10, step: .5, unit: ' dB' },
  uart: { label: 'Byte gửi đi (thập phân)', min: 0, max: 255, step: 1, unit: '' },
  request: { label: 'Ngưỡng tải máy chủ', min: 10, max: 100, step: 5, unit: '%' }
};
const hash = n => { let x = (n | 0) ^ 0x9e3779b9; x = Math.imul(x ^ (x >>> 16), 0x85ebca6b); x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
const gauss = n => Math.sqrt(-2 * Math.log(hash(n * 2) + 1e-12)) * Math.cos(2 * Math.PI * hash(n * 2 + 1));
function erfc(x) { const t = 1 / (1 + .5 * Math.abs(x)); const y = t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (.37409196 + t * (.09678418 + t * (-.18628806 + t * (.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-.82215223 + t * .17087277))))))))); return x >= 0 ? y : 2 - y; }
const COLORS = ['#6ce9d9', '#e6c27a', '#b08edb', '#7fa8ec', '#8fd6a0', '#ef8f9b', '#9ad0ff', '#f3a86b', '#c6e67a'];
function base(type, angle) { const v = Math.sin(angle); return type === 'square' ? (v >= 0 ? 1 : -1) : type === 'triangle' ? 2 / Math.PI * Math.asin(v) : type === 'saw' ? 2 * ((angle / (2 * Math.PI)) % 1 + 1) % 1 * 2 - 1 : v; }

function grid(ctx, w, h, L, R, T, B) {
  ctx.fillStyle = '#09131d'; ctx.fillRect(0, 0, w, h);
  ctx.lineWidth = 1; ctx.strokeStyle = '#1c3441'; ctx.beginPath();
  for (let i = 0; i <= 10; i++) { const x = L + (w - L - R) * i / 10; ctx.moveTo(x, T); ctx.lineTo(x, h - B); }
  for (let i = 0; i <= 6; i++) { const y = T + (h - T - B) * i / 6; ctx.moveTo(L, y); ctx.lineTo(w - R, y); }
  ctx.stroke();
}
function trace(ctx, L, R, w, color, fn, glow = true) {
  ctx.beginPath(); for (let x = L; x <= w - R; x++) { const y = fn((x - L) / (w - L - R)); if (x === L) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
  ctx.strokeStyle = color; ctx.lineWidth = 2; if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 6; } ctx.stroke(); ctx.shadowBlur = 0;
}

export function drawSignals(ctx, w, h, cfg, simTime) {
  const L = 52, R = 14, T = 12, B = 28; const mode = cfg.model || 'basic';
  grid(ctx, w, h, L, R, T, B);
  ctx.font = '10px Consolas,monospace'; ctx.fillStyle = '#618292';
  const amp = Number(cfg.amp) || 1, freq = Number(cfg.freq) || 1, phase = (Number(cfg.phase) || 0) * Math.PI / 180, p = Number(cfg.param);
  const shift = simTime * .3; const legend = [];
  const angleAt = (u, f = freq) => (u - shift) * f * 2 * Math.PI + phase;
  ctx.fillText('0 s', L, h - 9); ctx.fillText('1 s', w - R - 18, h - 9);

  if (mode === 'awgn') {
    const ebn0 = Number.isFinite(p) ? p : 4, sigma = Math.sqrt(1 / (2 * 10 ** (ebn0 / 10))), bitsPerWin = Math.max(4, Math.round(freq * 2)), spb = 8;
    const middle = (h - B + T) / 2, scale = (h - T - B) / 6, Y = v => middle - Math.max(-3, Math.min(3, v)) * scale;
    ctx.strokeStyle = '#3e666e'; ctx.beginPath(); ctx.moveTo(L, middle); ctx.lineTo(w - R, middle); ctx.stroke();
    const bitAt = k => hash(k * 7 + 3) > .5 ? 1 : 0; const kOf = u => Math.floor((u + shift) * bitsPerWin);
    trace(ctx, L, R, w, COLORS[3], u => { const k = Math.floor((u + shift) * bitsPerWin * spb); return Y(1.6 * (2 * bitAt(Math.floor(k / spb)) - 1) + 1.6 * sigma * gauss(k)); }, false);
    trace(ctx, L, R, w, COLORS[0], u => Y(1.6 * (2 * bitAt(kOf(u)) - 1)));
    let errs = 0, total = 0; for (let k = kOf(0); k <= kOf(1); k++) { const u0 = k / bitsPerWin - shift; let acc = 0; for (let s2 = 0; s2 < spb; s2++) acc += (2 * bitAt(k) - 1) + sigma * gauss(k * spb + s2); const dec = acc > 0 ? 1 : 0; total++; if (dec !== bitAt(k)) { errs++; const x = L + Math.max(0, Math.min(1, u0 + .5 / bitsPerWin)) * (w - L - R); ctx.fillStyle = '#ef8f9b'; ctx.beginPath(); ctx.arc(x, T + 10, 4, 0, 7); ctx.fill(); } }
    const ber = .5 * erfc(Math.sqrt(10 ** (ebn0 / 10)));
    return { legend: [['Bit phát (BPSK)', COLORS[0]], ['Tín hiệu nhận (có nhiễu)', COLORS[3]], ['Bit lỗi', '#ef8f9b']], readout: `Eb/N0 = ${ebn0} dB · BER lý thuyết chưa mã hóa ${ber.toExponential(1)} · lỗi trong khung ${errs}/${total}` };
  }
  if (mode === 'uart') {
    const byte = Math.max(0, Math.min(255, Math.round(Number.isFinite(p) ? p : 85))); const frame = [0, ...Array.from({ length: 8 }, (_, i) => (byte >> i) & 1), 1, 1, 1];
    const nb = frame.length, hi = T + (h - T - B) * .25, lo = T + (h - T - B) * .55; const off = (shift * freq * .5) % 1;
    const bitAt = u => frame[Math.floor((((u + off) % 1) + 1) % 1 * nb)];
    ctx.fillStyle = COLORS[0]; ctx.fillText('TX', 14, (hi + lo) / 2 + 3);
    ctx.beginPath(); let prev = null; for (let x = L; x <= w - R; x++) { const y = bitAt((x - L) / (w - L - R)) ? hi : lo; if (prev === null) ctx.moveTo(x, y); else if (prev !== y) { ctx.lineTo(x, prev); ctx.lineTo(x, y); } else ctx.lineTo(x, y); prev = y; }
    ctx.strokeStyle = COLORS[0]; ctx.lineWidth = 2; ctx.shadowColor = COLORS[0]; ctx.shadowBlur = 6; ctx.stroke(); ctx.shadowBlur = 0;
    const names = ['START', 'D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'STOP', 'IDLE', 'IDLE'];
    for (let i = 0; i < nb; i++) { const u = ((i + .5) / nb - off + 1) % 1; const x = L + u * (w - L - R); ctx.fillStyle = i === 0 || i === 9 ? COLORS[1] : i > 9 ? '#4b6574' : COLORS[2]; ctx.textAlign = 'center'; ctx.fillText(names[i], x, lo + 22); if (i > 0 && i < 9) ctx.fillText(String(frame[i]), x, hi - 8); ctx.fillStyle = '#ef8f9b'; ctx.fillRect(x - 1, lo + 30, 2, 8); ctx.textAlign = 'left'; }
    ctx.fillStyle = '#ef8f9b'; ctx.fillText('Lấy mẫu RX (giữa bit)', L, lo + 52);
    return { legend: [['Đường TX', COLORS[0]], ['Start/Stop', COLORS[1]], ['Bit dữ liệu (LSB trước)', COLORS[2]]], readout: `Byte ${byte} = 0x${byte.toString(16).toUpperCase().padStart(2, '0')} = ${byte.toString(2).padStart(8, '0')}b · khung 10 bit (8N1)` };
  }
  if (mode === 'request') {
    const cap = (Number.isFinite(p) ? p : 40) / 100 * 3; const middle = h - B, scale = (h - T - B) / 3, Y = v => middle - Math.max(0, Math.min(3, v)) * scale;
    const load = u => { const x = u + shift; return Math.max(0, amp * (.55 + .35 * Math.sin(x * freq * 2 * Math.PI)) + (hash(Math.floor(x * 40)) > .9 ? amp * .6 : 0)); };
    ctx.setLineDash([5, 5]); ctx.strokeStyle = '#ef8f9b88'; ctx.beginPath(); ctx.moveTo(L, Y(cap)); ctx.lineTo(w - R, Y(cap)); ctx.stroke(); ctx.setLineDash([]);
    trace(ctx, L, R, w, COLORS[0], u => Y(load(u)));
    let over = 0; for (let i = 0; i < 100; i++) if (load(i / 100) > cap) over++;
    ctx.fillStyle = '#618292'; ctx.fillText('100%', 14, T + 6); ctx.fillText('0', 30, middle);
    return { legend: [['Request / giây (chuẩn hóa)', COLORS[0]], ['Ngưỡng tải', '#ef8f9b']], readout: `${over}% thời gian vượt ngưỡng · cần cache / hàng đợi khi tải đột biến` };
  }
  if (mode === 'clock' || mode === 'counter' || mode === 'gating') {
    // Digital timing diagram: stacked lanes
    let lanes = [];
    const clk = u => Math.sin(angleAt(u) - phase + phase) >= 0 ? 1 : 0;
    const cyc = u => Math.floor((u - shift) * freq + phase / (2 * Math.PI)); // clock cycle index
    if (mode === 'clock') {
      const bits = Math.round(p) || 4; lanes.push(['CLK', u => clk(u)]);
      const lfsr = n => { let s = (n * 2654435761) >>> 0; s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return s >>> 0; };
      for (let b = 0; b < bits; b++) lanes.push([`D${b}`, u => (lfsr(cyc(u)) >> b) & 1]);
      legend.push(`Bus ${bits} bit`, `${freq.toFixed(1)} Hz`);
    } else if (mode === 'counter') {
      const bits = Math.round(p) || 4; lanes.push(['CLK', u => clk(u)]);
      for (let b = 0; b < bits; b++) lanes.push([`Q${b}`, u => (((cyc(u) % 2 ** bits) + 2 ** bits) % 2 ** bits >> b) & 1]);
      legend.push(`Đếm 0…${2 ** bits - 1}`, `Q${bits - 1} = f/${2 ** bits}`);
    } else {
      const duty = (p || 40) / 100; const en = u => (((u - shift) * freq / 8) % 1 + 1) % 1 < duty ? 1 : 0;
      lanes.push(['CLK', u => clk(u)], ['EN', en], ['GCLK', u => clk(u) & en(u)]);
      legend.push(`EN bật ${Math.round(duty * 100)}%`, `Giảm ~${Math.round((1 - duty) * 100)}% công suất động`);
    }
    const laneH = (h - T - B) / lanes.length;
    lanes.forEach(([name, fn], i) => {
      const top = T + i * laneH, hi = top + laneH * .2, lo = top + laneH * .8; const color = COLORS[i % COLORS.length];
      ctx.fillStyle = color; ctx.fillText(name, 6, (hi + lo) / 2 + 3);
      ctx.beginPath(); let prev = null;
      for (let x = L; x <= w - R; x++) { const v = fn((x - L) / (w - L - R)); const y = v ? hi : lo; if (prev === null) ctx.moveTo(x, y); else if (prev !== y) { ctx.lineTo(x, prev); ctx.lineTo(x, y); } else ctx.lineTo(x, y); prev = y; }
      ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.shadowColor = color; ctx.shadowBlur = name === 'GCLK' ? 8 : 4; ctx.stroke(); ctx.shadowBlur = 0;
    });
    return { legend: lanes.map(([n], i) => [n, COLORS[i % COLORS.length]]), readout: legend.join(' · ') };
  }

  // Analog modes share a ±3 V axis
  const middle = (h - B + T) / 2, scale = (h - T - B) / 6, Y = v => middle - Math.max(-3.2, Math.min(3.2, v)) * scale;
  ctx.strokeStyle = '#3e666e'; ctx.beginPath(); ctx.moveTo(L, middle); ctx.lineTo(w - R, middle); ctx.stroke();
  ctx.fillStyle = '#618292'; ctx.fillText('+3V', 14, T + 6); ctx.fillText('0V', 22, middle + 3); ctx.fillText('−3V', 14, h - B);
  const vin = u => amp * base(cfg.wave || 'sine', angleAt(u));
  if (mode === 'amplifier') {
    const gain = p || 8, rail = 2.7; const vout = u => -Math.max(-rail, Math.min(rail, gain * vin(u)));
    ctx.setLineDash([4, 4]); ctx.strokeStyle = '#ef8f9b55'; ctx.beginPath(); ctx.moveTo(L, Y(rail)); ctx.lineTo(w - R, Y(rail)); ctx.moveTo(L, Y(-rail)); ctx.lineTo(w - R, Y(-rail)); ctx.stroke(); ctx.setLineDash([]);
    trace(ctx, L, R, w, COLORS[1], u => Y(vin(u))); trace(ctx, L, R, w, COLORS[0], u => Y(vout(u)));
    const clipped = gain * amp > rail;
    return { legend: [['Vin', COLORS[1]], ['Vout (đảo pha)', COLORS[0]]], readout: `Av = ${gain}× · Vout đỉnh ${Math.min(gain * amp, rail).toFixed(2)} V${clipped ? ' · ⚠ bão hòa' : ''}` };
  }
  if (mode === 'adc') {
    const bits = Math.round(p) || 3, levels = 2 ** bits, vref = 3, fs = Math.max(freq * 10, 8);
    const q = v => { const code = Math.max(0, Math.min(levels - 1, Math.floor((v + vref) / (2 * vref) * levels))); return { code, v: -vref + (code + .5) * 2 * vref / levels }; };
    trace(ctx, L, R, w, COLORS[3], u => Y(vin(u)));
    trace(ctx, L, R, w, COLORS[0], u => { const k = Math.floor((u - shift) * fs); const us = k / fs + shift; return Y(q(vin(us)).v); });
    ctx.fillStyle = COLORS[0]; const n = Math.floor(fs); for (let k = Math.ceil(-shift * fs); k / fs + shift <= 1; k++) { const u = k / fs + shift; if (u < 0) continue; const x = L + u * (w - L - R); ctx.beginPath(); ctx.arc(x, Y(vin(u)), 2.5, 0, 7); ctx.fill(); }
    const now = q(vin(1)); return { legend: [['Analog', COLORS[3]], ['Đầu ra ADC', COLORS[0]]], readout: `${bits} bit · ${levels} mức · LSB ${(2 * vref / levels * 1000).toFixed(0)} mV · mã ${now.code.toString(2).padStart(bits, '0')}` };
  }
  if (mode === 'filter') {
    const fc = p || 2, tau = 1 / (2 * Math.PI * fc), N = 600; const outs = new Float32Array(N + 1);
    let y = 0; const dt = 1 / N; for (let k = -N * 2; k <= N; k++) { const u = k / N; const x = vin(u); y += (x - y) * (dt / (tau + dt)); if (k >= 0) outs[k] = y; }
    trace(ctx, L, R, w, COLORS[3], u => Y(vin(u)), false); trace(ctx, L, R, w, COLORS[0], u => Y(outs[Math.min(N, Math.round(u * N))]));
    const gain = 1 / Math.sqrt(1 + (freq / fc) ** 2);
    return { legend: [['Vào', COLORS[3]], ['Ra (sau RC)', COLORS[0]]], readout: `fc = ${fc} Hz · |H(f)| = ${gain.toFixed(2)} (${(20 * Math.log10(gain)).toFixed(1)} dB) · τ = ${(tau * 1000).toFixed(0)} ms` };
  }
  trace(ctx, L, R, w, COLORS[0], u => Y(vin(u)));
  return { legend: [['CH1 · Tín hiệu', COLORS[0]]], readout: `${amp.toFixed(1)} V · ${freq.toFixed(1)} Hz` };
}
