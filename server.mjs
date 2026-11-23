import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.LAB_PORT || 4173);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json; charset=utf-8', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.pdf': 'application/pdf' };
const server = http.createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  let relative;
  try { relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html'; }
  catch { res.writeHead(400); return res.end('Bad request'); }
  if (relative === 'welcome/') { res.writeHead(302, { Location: '/welcome' }); return res.end(); }
  if (relative === 'welcome') relative = 'index.html';
  const file = path.resolve(root, relative);
  const publicFile = /^[a-zA-Z0-9_-]+\.(html|css|js|svg|json)$/.test(relative) && !['server.mjs', 'package.json'].includes(relative);
  if (!file.startsWith(root + path.sep) || !(publicFile || /^vendor\/[a-zA-Z0-9_.-]+$/.test(relative) || /^code\/[a-z0-9-]+\/[a-zA-Z0-9_.-]+\.(txt|json)$/.test(relative) || /^docs\/[a-zA-Z0-9_.-]+\.(docx|pdf)$/.test(relative))) { res.writeHead(404); return res.end('Not found'); }
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error('not a file');
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'text/plain; charset=utf-8', 'Content-Length': info.size, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    if (req.method === 'HEAD') return res.end();
    createReadStream(file).on('error', () => res.destroy()).pipe(res);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.on('error', err => { console.error(err.code === 'EADDRINUSE' ? `Cong ${port} dang duoc su dung. Thu mo http://localhost:${port} hoac dat LAB_PORT khac.` : err.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => {
  const url = `http://localhost:${port}`;
  console.log(`\n  MY LAB — Phong lab vi mach\n  ${url}\n\n  Giu cua so nay mo khi dung lab. Nhan Ctrl+C de dung.\n`);
  if (process.argv.includes('--open')) {
    const command = process.platform === 'win32' ? 'explorer.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    const child = spawn(command, [url], { stdio: 'ignore', detached: true, windowsHide: true });
    child.on('error', () => console.log(`Mo trinh duyet tai ${url}`)); child.unref();
  }
});
