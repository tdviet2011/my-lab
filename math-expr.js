// Safe math expression compiler: no eval / Function. Supports + - * / ^, implicit multiplication,
// functions (sin, cos, tan, asin, acos, atan, sinh, cosh, tanh, exp, ln, log, log2, sqrt, cbrt, abs,
// floor, ceil, round, sign, min, max, pow, atan2, hypot, mod) and constants pi, e, tau.
const FUNCS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, exp: Math.exp, ln: Math.log, log: Math.log10,
  log10: Math.log10, log2: Math.log2, sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, floor: Math.floor,
  ceil: Math.ceil, round: Math.round, sign: Math.sign, min: Math.min, max: Math.max, pow: Math.pow,
  atan2: Math.atan2, hypot: Math.hypot, mod: (a, b) => ((a % b) + b) % b,
  sec: x => 1 / Math.cos(x), csc: x => 1 / Math.sin(x), cot: x => 1 / Math.tan(x),
  arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan, tg: Math.tan, cotg: x => 1 / Math.tan(x)
};
const CONSTS = { pi: Math.PI, 'π': Math.PI, e: Math.E, tau: Math.PI * 2 };

function tokenize(src) {
  const tokens = []; let i = 0;
  const s = src.replace(/\*\*/g, '^').replace(/[×·]/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/²/g, '^2').replace(/³/g, '^3');
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(s.slice(i));
      if (!m) throw new Error(`Số không hợp lệ ở vị trí ${i + 1}`);
      tokens.push({ t: 'num', v: Number(m[0]) }); i += m[0].length; continue;
    }
    if (/[a-zA-Zπ_]/.test(c)) {
      const m = /^[a-zA-Zπ_][a-zA-Z0-9_]*/.exec(s.slice(i));
      tokens.push({ t: 'id', v: m[0].toLowerCase() }); i += m[0].length; continue;
    }
    if ('+-*/^(),'.includes(c)) { tokens.push({ t: c }); i++; continue; }
    throw new Error(`Ký tự không hỗ trợ: “${c}”`);
  }
  return tokens;
}

// Split identifiers like "xy" or "2pix" into known parts so "sin x y" and "xy" work.
function splitId(id, vars) {
  if (FUNCS[id] || CONSTS[id] !== undefined || vars.includes(id)) return [id];
  const out = []; let rest = id;
  const names = [...Object.keys(FUNCS), ...Object.keys(CONSTS), ...vars].sort((a, b) => b.length - a.length);
  while (rest) {
    const hit = names.find(n => rest.startsWith(n));
    if (!hit) throw new Error(`Không biết “${id}”. Biến cho phép: ${vars.join(', ')}`);
    out.push(hit); rest = rest.slice(hit.length);
  }
  return out;
}

export function compile(src, vars = ['x']) {
  if (typeof src !== 'string' || !src.trim()) throw new Error('Hãy nhập một biểu thức.');
  if (src.length > 300) throw new Error('Biểu thức quá dài (tối đa 300 ký tự).');
  const raw = tokenize(src); const tokens = [];
  for (const tok of raw) { if (tok.t === 'id') splitId(tok.v, vars).forEach(v => tokens.push({ t: 'id', v })); else tokens.push(tok); }
  let p = 0;
  const peek = () => tokens[p]; const next = () => tokens[p++];
  const expect = t => { const tok = next(); if (!tok || tok.t !== t) throw new Error(`Thiếu “${t}”`); };
  const startsAtom = tok => tok && (tok.t === 'num' || tok.t === 'id' || tok.t === '(');
  function expr() { let left = term(); while (peek() && (peek().t === '+' || peek().t === '-')) { const op = next().t, a = left, b = term(); left = op === '+' ? s => a(s) + b(s) : s => a(s) - b(s); } return left; }
  function term() {
    let left = unary();
    while (peek() && (peek().t === '*' || peek().t === '/' || startsAtom(peek()))) {
      const tok = peek(); const op = tok.t === '/' ? '/' : '*'; if (tok.t === '*' || tok.t === '/') next();
      const a = left, b = unary(); left = op === '*' ? s => a(s) * b(s) : s => a(s) / b(s);
    }
    return left;
  }
  function unary() { if (peek() && peek().t === '-') { next(); const a = unary(); return s => -a(s); } if (peek() && peek().t === '+') { next(); return unary(); } return power(); }
  function power() { const base = atom(); if (peek() && peek().t === '^') { next(); const ex = unary(); return s => Math.pow(base(s), ex(s)); } return base; }
  function atom() {
    const tok = next(); if (!tok) throw new Error('Biểu thức chưa hoàn chỉnh.');
    if (tok.t === 'num') { const v = tok.v; return () => v; }
    if (tok.t === '(') { const e = expr(); expect(')'); return e; }
    if (tok.t === 'id') {
      if (FUNCS[tok.v]) {
        const f = FUNCS[tok.v]; const args = [];
        if (peek() && peek().t === '(') { next(); if (peek() && peek().t !== ')') { args.push(expr()); while (peek() && peek().t === ',') { next(); args.push(expr()); } } expect(')'); }
        else args.push(power()); // sin x, sin 2x
        if (args.length === 1) { const a = args[0]; return s => f(a(s)); }
        return s => f(...args.map(g => g(s)));
      }
      if (CONSTS[tok.v] !== undefined) { const v = CONSTS[tok.v]; return () => v; }
      const idx = vars.indexOf(tok.v); if (idx >= 0) return s => s[idx];
      throw new Error(`Không biết “${tok.v}”.`);
    }
    throw new Error(`Không mong đợi “${tok.t}”.`);
  }
  const fn = expr();
  if (p < tokens.length) throw new Error(`Thừa “${tokens[p].t === 'id' || tokens[p].t === 'num' ? tokens[p].v : tokens[p].t}”.`);
  return (...args) => fn(args);
}

// Parse a user line like "y = sin(x)", "z = x^2 - y^2", "f(x) = ..." or just the right-hand side.
export function parseEquation(line, dim) {
  let src = String(line).trim(); let lhs = '';
  const eq = src.indexOf('=');
  if (eq >= 0) { lhs = src.slice(0, eq).trim().toLowerCase(); src = src.slice(eq + 1).trim(); }
  if (dim === 3) {
    if (lhs && !/^(z|f\(x,\s*y\)|f)$/.test(lhs)) throw new Error('Dạng 3D: z = f(x, y), ví dụ z = sin(x)*cos(y).');
    return compile(src, ['x', 'y', 't']);
  }
  if (lhs === 'x' ) throw new Error('Dạng 2D: y = f(x).');
  if (lhs && !/^(y|f\(x\)|f|g\(x\)|h\(x\))$/.test(lhs)) throw new Error('Dạng 2D: y = f(x), ví dụ y = x^2 - 1.');
  return compile(src, ['x', 't']);
}
