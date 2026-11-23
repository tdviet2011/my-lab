// Xem mã nguồn repo GitHub của nhóm ngay trong MY LAB (cả repo private).
// Token GitHub là của từng người, chỉ nằm trong trình duyệt của người đó và chỉ gửi tới api.github.com.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='lab-tdv:gh-token';
const API='https://api.github.com';
export function parseRepo(url){const m=/^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/.exec(String(url||'').trim());return m?{owner:m[1],repo:m[2]}:null;}
function getToken(){try{return sessionStorage.getItem(KEY)||localStorage.getItem(KEY)||'';}catch{return '';}}
function setToken(t,remember){try{sessionStorage.removeItem(KEY);localStorage.removeItem(KEY);if(t)(remember?localStorage:sessionStorage).setItem(KEY,t);}catch{}}
async function gh(path,{raw=false}={}){
  const tok=getToken();const h={Accept:raw?'application/vnd.github.raw+json':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};if(tok)h.Authorization='Bearer '+tok;
  const r=await fetch(API+path,{headers:h,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
  if(r.status===401)throw new Error('Token GitHub không hợp lệ hoặc đã hết hạn. Bấm "Token GitHub" để nhập lại.');
  if(r.status===404)throw new Error(tok?'Không thấy repo, hoặc token của bạn không có quyền đọc repo này.':'Không thấy repo. Nếu repo là private, bấm "Token GitHub" để nhập token có quyền đọc.');
  if(r.status===403&&r.headers.get('x-ratelimit-remaining')==='0')throw new Error('GitHub tạm giới hạn số lần truy cập. Nhập token để được hạn mức cao hơn, hoặc thử lại sau.');
  if(!r.ok)throw new Error('GitHub báo lỗi '+r.status+'.');
  return raw?r:r.json();
}
const TEXT_EXT=/\.(v|sv|svh|vh|vhd|vhdl|c|h|cpp|hpp|cc|py|ipynb|m|js|mjs|ts|tsx|jsx|json|yml|yaml|toml|ini|cfg|xdc|sdc|tcl|do|f|mk|cmake|txt|md|rst|csv|tsv|sh|bat|ps1|html|css|scss|xml|lef|lib|sp|cir|ld|s|asm|rs|go|java|kt|r|jl|tex|bib|log|gitignore|env\.example)$|(^|\/)(Makefile|Dockerfile|LICENSE|README)$/i;
const IMG_EXT=/\.(png|jpe?g|gif|webp|svg)$/i;

export function createCodeBrowser({root,repoUrl,toast,onOpen=()=>{}}){
  const repo=parseRepo(repoUrl);
  const S={branch:'',branches:[],tree:[],path:'',filter:'',file:null,loading:false,error:'',truncated:false,info:null};
  const $=s=>root.querySelector(s);
  function tokenForm(){const has=!!getToken();return `<form class="gh-token" id="gh-token-form"><p><b>Token GitHub của bạn</b> · chỉ cần khi repo là private. Token chỉ lưu trong trình duyệt này và chỉ gửi tới api.github.com, không lưu lên MY LAB.</p>
    <ol><li>Mở <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">GitHub → Fine-grained token</a>.</li><li>Repository access: chọn <b>Only select repositories</b> → repo của nhóm.</li><li>Permissions → Repository → <b>Contents: Read-only</b> (không cấp gì khác). Đặt hạn dùng ngắn, ví dụ 90 ngày.</li></ol>
    <div class="gh-token-row"><input type="password" name="token" autocomplete="off" spellcheck="false" placeholder="${has?'Đã có token, nhập token mới để thay':'github_pat_…'}" maxlength="300"><label class="check-label"><input type="checkbox" name="remember"> Ghi nhớ trên máy này</label><button class="btn small primary" type="submit">Lưu</button>${has?'<button class="btn small danger" type="button" data-g="forget">Xóa token</button>':''}<button class="btn small" type="button" data-g="close-token">Đóng</button></div></form>`;}
  function draw(){
    if(!repo){root.innerHTML=`<div class="team-empty"><h3>Chưa có repo</h3><p>Chủ nhóm bấm <b>Sửa nhóm</b> và dán liên kết repo dạng <code>https://github.com/tên/repo</code> (không phải trang tài khoản).</p></div>`;return;}
    const q=S.filter.toLowerCase();
    const files=S.tree.filter(n=>n.type==='blob'&&(!q||n.path.toLowerCase().includes(q)));
    const groups=new Map();files.slice(0,1500).forEach(n=>{const d=n.path.includes('/')?n.path.slice(0,n.path.lastIndexOf('/')):'';if(!groups.has(d))groups.set(d,[]);groups.get(d).push(n);});
    const list=[...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([d,arr])=>`${d?`<div class="gh-dir">📁 ${esc(d)}</div>`:''}${arr.map(n=>`<button type="button" class="gh-file ${S.path===n.path?'active':''}" data-g="open" data-p="${esc(n.path)}" style="--d:${d?1:0}">${esc(n.path.split('/').pop())}<small>${n.size>1024?Math.round(n.size/1024)+' KB':n.size+' B'}</small></button>`).join('')}`).join('');
    const f=S.file;
    root.innerHTML=`<div class="gh-head"><div><b>${esc(repo.owner)}/${esc(repo.repo)}</b>${S.info?` <span class="gh-vis ${S.info.private?'priv':''}">${S.info.private?'Private':'Public'}</span>`:''}</div>
      <div class="gh-tools">${S.branches.length?`<select id="gh-branch">${S.branches.map(b=>`<option ${b===S.branch?'selected':''}>${esc(b)}</option>`).join('')}</select>`:''}<button class="btn small" data-g="reload">Tải lại</button><button class="btn small" data-g="token">Token GitHub${getToken()?' ✓':''}</button><a class="btn small" href="https://github.com/${esc(repo.owner)}/${esc(repo.repo)}${S.branch?'/tree/'+encodeURIComponent(S.branch):''}" target="_blank" rel="noopener noreferrer">Mở trên GitHub ↗</a></div></div>
      <div id="gh-token-slot">${S.showToken||(!getToken()&&S.error&&/private|token/i.test(S.error))?tokenForm():''}</div>
      ${S.error?`<p class="gh-error">${esc(S.error)}</p>`:''}
      ${S.loading?'<p class="muted">Đang tải…</p>':''}
      ${S.tree.length?`<div class="code-view gh-view"><div class="gh-side"><input id="gh-filter" placeholder="Tìm tệp… (${S.tree.filter(n=>n.type==='blob').length} tệp)" value="${esc(S.filter)}"><div class="code-list gh-list">${list||'<p class="muted">Không có tệp khớp.</p>'}</div>${S.truncated?'<small class="muted">Repo quá lớn, GitHub chỉ trả một phần danh sách.</small>':''}</div>
        <div class="code-main"><div class="code-head"><div class="code-meta">${f?`<strong>${esc(f.path)}</strong><span>${f.text!=null?f.text.split('\n').length+' dòng · ':''}${esc(S.branch)}</span>`:'<span>Chọn một tệp để xem</span>'}</div><div class="code-links">${f&&f.text!=null?'<button class="btn small" data-g="copy">Sao chép</button>':''}${f?`<a class="btn small" href="https://github.com/${esc(repo.owner)}/${esc(repo.repo)}/blob/${encodeURIComponent(S.branch)}/${f.path.split('/').map(encodeURIComponent).join('/')}" target="_blank" rel="noopener noreferrer">GitHub ↗</a>`:''}</div></div>
        ${f?(f.img?`<div class="gh-img"><img src="${f.img}" alt="${esc(f.path)}"></div>`:f.text!=null?`<pre class="code-pre"><code>${esc(f.text)}</code></pre>`:`<p class="muted">${esc(f.note||'Không xem trước được tệp này.')}</p>`):''}</div></div>`:''}`;
  }
  async function loadTree(){
    if(!repo)return draw();
    S.loading=true;S.error='';draw();
    try{
      if(!S.info){S.info=await gh(`/repos/${repo.owner}/${repo.repo}`);S.branch=S.branch||S.info.default_branch;}
      const br=await gh(`/repos/${repo.owner}/${repo.repo}/branches?per_page=100`);S.branches=br.map(b=>b.name);if(!S.branches.includes(S.branch))S.branches.unshift(S.branch);
      const t=await gh(`/repos/${repo.owner}/${repo.repo}/git/trees/${encodeURIComponent(S.branch)}?recursive=1`);S.tree=t.tree||[];S.truncated=!!t.truncated;
    }catch(e){S.error=e.message;S.tree=[];}
    S.loading=false;draw();
  }
  async function openFile(path){
    const n=S.tree.find(x=>x.path===path);if(!n)return;S.path=path;if(S.file?.img)URL.revokeObjectURL(S.file.img);S.file={path,text:null,note:'Đang tải…'};draw();
    try{
      if(n.size>1500000){S.file={path,text:null,note:'Tệp lớn hơn 1,5 MB, hãy mở trên GitHub.'};}
      else{const r=await gh(`/repos/${repo.owner}/${repo.repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(S.branch)}`,{raw:true});
        if(IMG_EXT.test(path)&&!/\.svg$/i.test(path)){const b=await r.blob();S.file={path,img:URL.createObjectURL(b)};}
        else{const buf=new Uint8Array(await r.arrayBuffer());const bin=buf.subarray(0,8000).some(c=>c===0);
          S.file=bin&&!TEXT_EXT.test(path)?{path,text:null,note:'Tệp nhị phân, không xem trước được.'}:{path,text:new TextDecoder().decode(buf)};}
        onOpen(path);}
    }catch(e){S.file={path,text:null,note:e.message};}
    draw();
  }
  root.addEventListener('click',async e=>{const b=e.target.closest('[data-g]');if(!b)return;const g=b.dataset.g;
    if(g==='open')openFile(b.dataset.p);
    else if(g==='reload'){S.info=null;loadTree();}
    else if(g==='token'){S.showToken=!S.showToken;draw();}
    else if(g==='close-token'){S.showToken=false;draw();}
    else if(g==='forget'){setToken('',false);S.showToken=false;toast('Đã xóa token khỏi trình duyệt này.');S.info=null;loadTree();}
    else if(g==='copy'&&S.file?.text!=null){try{await navigator.clipboard.writeText(S.file.text);toast('Đã sao chép.');}catch{toast('Trình duyệt không cho sao chép tự động.',true);}}
  });
  root.addEventListener('submit',e=>{if(e.target.id!=='gh-token-form')return;e.preventDefault();const f=new FormData(e.target);const t=String(f.get('token')||'').trim();
    if(t&&!/^(github_pat_|ghp_|gho_|ghu_)[A-Za-z0-9_]{20,}$/.test(t)){toast('Token không đúng định dạng GitHub.',true);return;}
    if(t){setToken(t,!!f.get('remember'));toast('Đã lưu token trên trình duyệt này.');}S.showToken=false;S.info=null;loadTree();});
  root.addEventListener('change',e=>{if(e.target.id==='gh-branch'){S.branch=e.target.value;S.path='';S.file=null;loadTree();}});
  root.addEventListener('input',e=>{if(e.target.id==='gh-filter'){S.filter=e.target.value;const pos=e.target.selectionStart;draw();const i=$('#gh-filter');if(i){i.focus();i.setSelectionRange(pos,pos);}}});
  return {start:loadTree};
}
