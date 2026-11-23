// Nhóm NCKH chung: nhiều tài khoản cùng xem / sửa biểu đồ, báo cáo, hình ảnh và ghi chú. Dữ liệu nằm ở Supabase (xem supabase/team.sql).
import {chartSVG,parseTable,svgToPng,CHART_TYPES} from './charts.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const AV=t=>/^data:image\/(png|jpeg|webp);base64,/.test(t?.avatar||'')?`<img class="team-av" src="${t.avatar}" alt="">`:`<span class="team-av ph">${esc((t?.name||'?').trim().slice(0,1).toUpperCase())}</span>`;
async function toAvatar(file){if(!/^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(file.type))throw new Error('Chỉ nhận ảnh PNG, JPG, WebP, GIF hoặc SVG.');if(file.size>8*1024*1024)throw new Error('Ảnh tối đa 8 MB.');const url=URL.createObjectURL(file);try{const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(new Error('Không đọc được ảnh.'));i.src=url;});const S=256,c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d');const k=Math.max(S/img.width,S/img.height);x.drawImage(img,(S-img.width*k)/2,(S-img.height*k)/2,img.width*k,img.height*k);let d=c.toDataURL('image/webp',.88);if(!d.startsWith('data:image/webp'))d=c.toDataURL('image/png');return d;}finally{URL.revokeObjectURL(url);}}
const ROLE={owner:'Chủ nhóm',editor:'Được sửa',viewer:'Chỉ xem'};
const BUCKET='team-files',MAX_FILE=50*1024*1024;
const SAMPLE_TABLE='Mẫu,Gốc,Cải tiến\nCARRY4,853,693\nLUT (nghìn),49.4,48.0';
const T={teams:[],teamId:localStorage.getItem?.('lab-tdv:team')||'',tab:'progress',folder:'all',items:[],members:[],invites:[],activity:[],actFilter:'all',loading:false,error:'',urls:new Map()};

export function createTeamPage({root,client,me,toast,confirmAction}){
  const $=(s,r=root)=>r.querySelector(s);
  const team=()=>T.teams.find(t=>t.id===T.teamId);
  const role=()=>T.members.find(m=>m.user_id===me.id)?.role||'viewer';
  const canWrite=()=>['owner','editor'].includes(role());
  const fail=e=>{console.warn(e);toast(e?.message||'Có lỗi xảy ra.',true);};
  const folders=()=>T.items.filter(i=>i.kind==='folder');
  const fname=id=>id?(folders().find(f=>f.id===id)?.title||'Thư mục đã xóa'):'Thư mục chính';
  const fpath=id=>{const out=[];let cur=id,guard=0;while(cur&&guard++<20){const f=folders().find(x=>x.id===cur);if(!f)break;out.unshift(f.title);cur=f.data?.parent||'';}return ['Thư mục chính',...out].join(' / ');};
  const cur=()=>T.folder==='all'?'':T.folder;
  const inFolder=i=>T.folder==='all'||(i.data?.folder||'')===T.folder;
  const tag=i=>T.folder==='all'?` · <span class="folder-tag">📁 ${esc(fname(i.data?.folder||''))}</span>`:'';
  const TABS=[['progress','Tiến độ'],['charts','Biểu đồ','chart'],['experiments','Nhật ký thí nghiệm','experiment'],['files','Báo cáo & hình ảnh','file'],['refs','Tài liệu tham khảo','ref'],['notes','Ghi chú','note'],['code','Mã nguồn'],['members','Thành viên'],['history','Lịch sử']];
  const TASK_ST={todo:'Cần làm',doing:'Đang làm',done:'Xong'};
  const today=()=>new Date().toISOString().slice(0,10);
  const fmtDate=d=>d?new Date(d+'T00:00:00').toLocaleDateString('vi-VN'):'';
  const daysLeft=d=>d?Math.round((new Date(d+'T00:00:00')-new Date(today()+'T00:00:00'))/864e5):null;
  const dueTag=(d,done)=>{if(!d)return '';const n=daysLeft(d);const cls=done?'ok':n<0?'late':n<=7?'soon':'';return `<span class="due ${cls}">${done?'✓ ':''}${fmtDate(d)}${done?'':n<0?` · trễ ${-n} ngày`:n===0?' · hôm nay':n<=7?` · còn ${n} ngày`:''}</span>`;};
  const memberOpts=sel=>`<option value="">Chưa giao</option>`+T.members.map(m=>`<option value="${esc(m.email)}" ${sel===m.email?'selected':''}>${esc(m.email)}</option>`).join('');
  const kindTitle={task:'việc',milestone:'mốc',experiment:'lần thí nghiệm',ref:'tài liệu'};
  const askSave=async t=>{if(!await confirmAction('Lưu thay đổi?',`Cập nhật “${t}”. Thay đổi sẽ được ghi vào lịch sử nhóm kèm tên bạn.`))throw new Error('Đã hủy, chưa lưu gì.');};
  async function saveItem(item,kind,title,data,quiet=false){
    if(item){if(!quiet)await askSave(item.title);const {error}=await client.from('team_items').update({title,data:{...(item.data||{}),...data}}).eq('id',item.id);if(error)throw error;}
    else{const {error}=await client.from('team_items').insert({team_id:T.teamId,kind,title,data:{folder:cur(),...data},created_by:me.id,author_email:me.email});if(error)throw error;}
    await refresh();}
  // Trích dẫn
  const authorsList=a=>String(a||'').split(/;|\band\b|\n/).map(x=>x.trim()).filter(Boolean);
  const initials=n=>{const p=n.split(',').map(x=>x.trim());if(p.length>1)return p[1].split(/[\s.-]+/).filter(Boolean).map(x=>x[0]+'.').join(' ')+' '+p[0];const w=n.split(/\s+/);return w.length>1?w.slice(0,-1).map(x=>x[0]+'.').join(' ')+' '+w.at(-1):n;};
  const apaName=n=>{const p=n.split(',').map(x=>x.trim());if(p.length>1)return p[0]+', '+p[1].split(/[\s.-]+/).filter(Boolean).map(x=>x[0]+'.').join(' ');const w=n.split(/\s+/);return w.length>1?w.at(-1)+', '+w.slice(0,-1).map(x=>x[0]+'.').join(' '):n;};
  function cite(i,style,n){const d=i.data||{},A=authorsList(d.authors),t=i.title,v=d.venue||'',y=d.year||'n.d.',link=d.doi?`https://doi.org/${d.doi}`:(d.url||'');
    if(style==='ieee'){const au=A.map(initials);const aj=au.length>2?au.slice(0,-1).join(', ')+', and '+au.at(-1):au.join(' and ');return `[${n}] ${aj?aj+', ':''}"${t}," ${v?v+', ':''}${y}.${d.doi?' doi: '+d.doi+'.':link?' [Online]. Available: '+link:''}`;}
    if(style==='apa'){const au=A.map(apaName);const aj=au.length>1?au.slice(0,-1).join(', ')+', & '+au.at(-1):au.join('');return `${aj||t} (${y}). ${aj?t+'. ':''}${v?v+'. ':''}${link}`.trim();}
    const key=(A[0]||'ref').split(/[,\s]/)[0].normalize('NFD').replace(/[^A-Za-z]/g,'').toLowerCase()+y+(n||'');return `@article{${key},\n  title={${t}},\n  author={${A.join(' and ')}},\n  journal={${v}},\n  year={${y}}${d.doi?`,\n  doi={${d.doi}}`:''}${d.url?`,\n  url={${d.url}}`:''}\n}`;}
  function download(name,text){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000);}
  const PRESET=[['Đăng ký đề tài',''],['Thuyết minh được duyệt',''],['Báo cáo tiến độ giữa kỳ',''],['Nộp báo cáo tổng kết',''],['Nghiệm thu đề tài','']];
  const moveBtn=i=>`<button class="btn small" data-t="move" data-id="${i.id}">Chuyển thư mục</button>`;
  function folderBar(){
    const kids=p=>folders().filter(f=>(f.data?.parent||'')===p).sort((a,b)=>a.title.localeCompare(b.title,'vi'));
    const tree=(p,d)=>kids(p).map(f=>`<button class="folder-chip ${T.folder===f.id?'active':''}" style="--d:${d}" data-t="folder" data-k="${f.id}">📁 ${esc(f.title)} <small>${T.items.filter(i=>i.kind!=='folder'&&(i.data?.folder||'')===f.id).length}</small></button>`+tree(f.id,d+1)).join('');
    const w=canWrite(),isF=T.folder!=='all'&&T.folder!=='';
    return `<div class="folder-bar"><div class="folder-tree"><button class="folder-chip all ${T.folder==='all'?'active':''}" data-t="folder" data-k="all">🗂 Tổng hợp <small>${T.items.filter(i=>i.kind!=='folder').length}</small></button><button class="folder-chip ${T.folder===''?'active':''}" style="--d:0" data-t="folder" data-k="">📂 Thư mục chính <small>${T.items.filter(i=>i.kind!=='folder'&&!(i.data?.folder)).length}</small></button>${tree('',1)}</div>
      <div class="folder-actions"><span class="muted">${T.folder==='all'?'Đang xem tất cả mục trong nhóm':'Đang ở: '+esc(fpath(T.folder))}</span>${w?`<button class="btn small" data-t="folder-new">+ Thư mục${T.folder==='all'?'':' con'}</button>${isF?'<button class="btn small" data-t="folder-rename">Đổi tên</button><button class="btn small danger" data-t="folder-del">Xóa thư mục</button>':''}`:''}</div></div>`;
  }

  async function loadTeams(){
    T.loading=true;T.error='';draw();
    try{
      await client.rpc('claim_team_invites');
      const {data,error}=await client.from('teams').select('id,name,description,owner_id,created_at,github_url,avatar').order('created_at');
      if(error)throw error;T.teams=data||[];
      if(!team())T.teamId=T.teams[0]?.id||'';
      await loadTeam();
    }catch(e){T.error=/relation|schema cache|does not exist/i.test(e.message||'')?'Chưa tạo bảng nhóm. Chạy file supabase/team.sql trong Supabase → SQL Editor.':(e.message||'Không tải được nhóm.');}
    T.loading=false;draw();
  }
  async function loadTeam(){
    T.items=[];T.members=[];T.invites=[];if(!T.teamId)return;
    try{localStorage.setItem('lab-tdv:team',T.teamId);}catch{}
    const [i,m,v]=await Promise.all([
      client.from('team_items').select('*').eq('team_id',T.teamId).order('updated_at',{ascending:false}),
      client.from('team_members').select('user_id,email,role,added_at').eq('team_id',T.teamId).order('added_at'),
      client.from('team_invites').select('email,role').eq('team_id',T.teamId)]);
    if(i.error)throw i.error;if(m.error)throw m.error;
    T.items=i.data||[];T.members=m.data||[];T.invites=v.data||[];
    client.rpc('log_team_access',{t:T.teamId}).then(()=>{},()=>{});
    const a=await client.from('team_activity').select('*').eq('team_id',T.teamId).order('at',{ascending:false}).limit(400);T.activity=a.error?[]:(a.data||[]);T.activityError=a.error?'Chưa bật lịch sử: chạy lại supabase/team.sql trong Supabase.':'';
  }

  function draw(){
    const t=team();
    const side=`<aside class="team-side"><div class="team-side-head"><h3>Nhóm của bạn</h3><button class="btn small primary" data-t="new-team">+ Nhóm mới</button></div>${T.teams.map(x=>`<button class="team-pick ${x.id===T.teamId?'active':''}" data-t="pick" data-id="${esc(x.id)}">${AV(x)}<span><b>${esc(x.name)}</b><small>${x.owner_id===me.id?'Bạn là chủ nhóm':'Thành viên'}</small></span></button>`).join('')||'<p class="muted">Chưa có nhóm nào.</p>'}</aside>`;
    let main='';
    if(T.error)main=`<div class="team-empty"><h3>Chưa dùng được nhóm</h3><p>${esc(T.error)}</p></div>`;
    else if(T.loading&&!t)main='<div class="team-empty"><p>Đang tải…</p></div>';
    else if(!t)main='<div class="team-empty"><h3>Tạo nhóm nghiên cứu đầu tiên</h3><p>Nhóm là nơi chung để bạn và người cùng làm đề tài đặt biểu đồ, báo cáo và hình ảnh. Bạn thêm thành viên bằng email của họ.</p><button class="btn primary" data-t="new-team">+ Tạo nhóm</button></div>';
    else main=`<div class="team-main"><header class="team-head">${AV(t)}<div class="team-title"><span class="eyebrow">DỰ ÁN NCKH CHUNG · ${esc(ROLE[role()]).toUpperCase()}</span><h2>${esc(t.name)}</h2>${t.description?`<p class="muted">${esc(t.description)}</p>`:''}</div><div class="team-head-actions">${t.github_url?`<a class="btn small" href="${esc(t.github_url)}" target="_blank" rel="noopener noreferrer">GitHub ↗</a>`:''}<button class="btn small" data-t="reload">Làm mới</button>${role()==='owner'?'<button class="btn small" data-t="edit-team">Sửa nhóm</button><button class="btn small danger" data-t="del-team">Xóa nhóm</button>':''}</div></header>
      ${folderBar()}<nav class="team-tabs">${TABS.map(([k,l,kind])=>`<button data-t="tab" data-k="${k}" class="${T.tab===k?'active':''}">${l}${k==='history'||k==='code'?'':` (${k==='members'?T.members.length:k==='progress'?T.items.filter(i=>i.kind==='task'||i.kind==='milestone').length:T.items.filter(i=>i.kind===kind&&inFolder(i)).length})`}</button>`).join('')}</nav>
      <section class="team-body">${body()}</section></div>`;
    root.innerHTML=`<header class="page-heading"><div><span class="eyebrow">LÀM VIỆC CHUNG</span><h1>Nhóm NCKH</h1><p>Nhiều người cùng dùng biểu đồ, báo cáo và hình ảnh của một đề tài.</p></div></header><div class="team-layout">${side}${main}</div>`;
    mountCode();
    T.items.filter(i=>i.kind==='file'&&/^image\//.test(i.file_type||'')).forEach(async i=>{if(T.urls.has(i.id))return;try{const {data}=await client.storage.from(BUCKET).createSignedUrl(i.file_path,3600);if(data){T.urls.set(i.id,data.signedUrl);const img=root.querySelector(`img[data-img="${i.id}"]`);if(img)img.src=data.signedUrl;}}catch{}});
  }
  const who=i=>esc(i.author_email||'');
  const when=i=>new Date(i.updated_at).toLocaleDateString('vi-VN');
  let GH=null;
  function mountCode(){
    const slot=root.querySelector('#gh-root');if(!slot)return;const t=team();const key=T.teamId+'|'+(t?.github_url||'');
    if(GH&&GH.key===key){slot.replaceWith(GH.el);return;}
    const el=document.createElement('div');el.id='gh-root';el.className='gh-root';slot.replaceWith(el);GH={key,el};
    import('./github-code.js').then(m=>{if(GH?.el!==el)return;m.createCodeBrowser({root:el,repoUrl:t?.github_url||'',toast,onOpen:p=>client.rpc('log_team_access',{t:T.teamId,what:'open',title:'GitHub: '+p}).then(()=>{},()=>{})}).start();}).catch(fail);
  }
  function body(){
    const w=canWrite();
    if(T.tab==='code')return '<div id="gh-root"></div>';
    if(T.tab==='charts'){const list=T.items.filter(i=>i.kind==='chart'&&inFolder(i));
      return `${w?'<div class="team-bar"><button class="btn primary" data-t="chart-new">+ Biểu đồ mới</button></div>':''}<div class="chart-grid">${list.map(i=>`<article class="chart-card"><header><h3>${esc(i.title)}</h3><small>${who(i)} · ${when(i)}${tag(i)}</small></header><div class="chart-wrap">${chartSVG(i.data||{})}</div>${i.data?.note?`<p class="muted">${esc(i.data.note)}</p>`:''}<footer><button class="btn small" data-t="chart-png" data-id="${i.id}">Tải PNG</button>${w?`${moveBtn(i)}<button class="btn small" data-t="chart-edit" data-id="${i.id}">Sửa</button><button class="btn small danger" data-t="item-del" data-id="${i.id}">Xóa</button>`:''}</footer></article>`).join('')||'<p class="muted">Chưa có biểu đồ. Dán bảng số liệu từ Excel là vẽ được ngay.</p>'}</div>`;}
    if(T.tab==='files'){const list=T.items.filter(i=>i.kind==='file'&&inFolder(i));
      return `${w?'<div class="team-bar"><label class="btn primary file-btn">+ Tải lên báo cáo / hình ảnh<input type="file" id="team-file" multiple hidden></label><label class="btn file-btn">+ Tải cả thư mục<input type="file" id="team-dir" webkitdirectory directory multiple hidden></label><small class="muted">Tối đa 50 MB mỗi tệp. Hình ảnh sẽ hiện xem trước.</small></div>':''}<div class="file-grid">${list.map(i=>`<article class="file-card">${/^image\//.test(i.file_type||'')?`<img data-img="${i.id}" alt="${esc(i.title)}" ${T.urls.get(i.id)?`src="${esc(T.urls.get(i.id))}"`:''}>`:`<div class="file-ico">${esc((i.file_name||'').split('.').pop().slice(0,4).toUpperCase()||'TỆP')}</div>`}<h4>${esc(i.title)}</h4><small>${who(i)} · ${when(i)}${tag(i)} · ${Math.max(1,Math.round((i.file_size||0)/1024))} KB</small><div class="file-actions"><button class="btn small" data-t="file-open" data-id="${i.id}">Mở</button>${w?`${moveBtn(i)}<button class="btn small danger" data-t="item-del" data-id="${i.id}">Xóa</button>`:''}</div></article>`).join('')||'<p class="muted">Chưa có tệp nào.</p>'}</div>`;}
    if(T.tab==='history'){
      const ACT={access:['👁','Truy cập nhóm'],open:['📖','Mở tệp'],upload:['⬆','Tải lên'],create:['＋','Thêm'],update:['✎','Sửa'],delete:['🗑','Xóa'],member_add:['👤','Thêm thành viên'],member_remove:['👤','Xóa thành viên'],member_role:['👤','Đổi vai trò'],invite:['✉','Mời'],invite_cancel:['✉','Hủy lời mời'],team_update:['⚙','Sửa thông tin nhóm']};
      const KIND={chart:'biểu đồ',file:'tệp',note:'ghi chú',folder:'thư mục',task:'việc',milestone:'mốc',experiment:'thí nghiệm',ref:'tài liệu tham khảo',member:'',team:''};
      const groups={all:()=>true,access:a=>a.action==='access'||a.action==='open',upload:a=>a.action==='upload',edit:a=>['create','update','team_update'].includes(a.action),delete:a=>a.action==='delete',member:a=>a.action.startsWith('member')||a.action.startsWith('invite')};
      const list=T.activity.filter(groups[T.actFilter]||groups.all).filter(a=>!T.actUser||a.email===T.actUser);
      const users=[...new Set(T.activity.map(a=>a.email).filter(Boolean))];
      return `<div class="team-bar hist-bar"><select id="act-filter">${[['all','Tất cả hoạt động'],['access','Truy cập / mở tệp'],['upload','Tải lên'],['edit','Thêm / sửa'],['delete','Xóa'],['member','Thành viên']].map(([k,l])=>`<option value="${k}" ${T.actFilter===k?'selected':''}>${l}</option>`).join('')}</select><select id="act-user"><option value="">Mọi người</option>${users.map(u=>`<option value="${esc(u)}" ${T.actUser===u?'selected':''}>${esc(u)}</option>`).join('')}</select><button class="btn small" data-t="act-export">Xuất CSV</button><small class="muted">Lịch sử do máy chủ ghi, không ai sửa hay xóa được.</small></div>
        ${T.activityError?`<p class="muted">${esc(T.activityError)}</p>`:''}<ol class="act-list">${list.map(a=>{const [ic,lb]=ACT[a.action]||['•',a.action];const d=new Date(a.at);return `<li class="act-${esc(a.action)}"><span class="act-ic">${ic}</span><div><p><b>${esc(a.email||'(không rõ)')}</b> ${lb}${KIND[a.item_kind]?' '+KIND[a.item_kind]:''}${a.item_title?` <q>${esc(a.item_title)}</q>`:''}${a.detail?` <small>· ${esc(a.detail)}</small>`:''}</p><time>${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</time></div></li>`;}).join('')||'<p class="muted">Chưa có hoạt động nào.</p>'}</ol>`;}
    if(T.tab==='progress'){
      const ms=T.items.filter(i=>i.kind==='milestone').sort((a,b)=>(a.data?.date||'9').localeCompare(b.data?.date||'9'));
      const tasks=T.items.filter(i=>i.kind==='task');
      const doneT=tasks.filter(t=>t.data?.status==='done').length,pct=tasks.length?Math.round(doneT/tasks.length*100):0;
      const msHtml=ms.length?`<ol class="ms-line">${ms.map(m=>`<li class="${m.data?.done?'done':daysLeft(m.data?.date)<0?'late':''}"><span class="ms-dot"></span><div><b>${esc(m.title)}</b>${dueTag(m.data?.date,m.data?.done)}${m.data?.desc?`<small>${esc(m.data.desc)}</small>`:''}</div>${w?`<div class="ms-act"><button class="btn small" data-t="ms-toggle" data-id="${m.id}">${m.data?.done?'Mở lại':'Đã xong'}</button><button class="btn small" data-t="ms-edit" data-id="${m.id}">Sửa</button><button class="btn small danger" data-t="item-del" data-id="${m.id}">Xóa</button></div>`:''}</li>`).join('')}</ol>`:'<p class="muted">Chưa có mốc nào.</p>';
      const col=st=>`<div class="kb-col"><h4>${TASK_ST[st]} <small>${tasks.filter(t=>(t.data?.status||'todo')===st).length}</small></h4>${tasks.filter(t=>(t.data?.status||'todo')===st).sort((a,b)=>(a.data?.due||'9').localeCompare(b.data?.due||'9')).map(t=>`<article class="kb-card"><b>${esc(t.title)}</b>${t.data?.desc?`<p>${esc(t.data.desc)}</p>`:''}<div class="kb-meta">${t.data?.assignee?`<span class="who">👤 ${esc(t.data.assignee)}</span>`:'<span class="who muted">Chưa giao</span>'}${dueTag(t.data?.due,st==='done')}</div>${w?`<div class="kb-act">${st!=='todo'?`<button class="btn small" data-t="task-move" data-id="${t.id}" data-k="${st==='done'?'doing':'todo'}">←</button>`:''}${st!=='done'?`<button class="btn small" data-t="task-move" data-id="${t.id}" data-k="${st==='todo'?'doing':'done'}">→</button>`:''}<button class="btn small" data-t="task-edit" data-id="${t.id}">Sửa</button><button class="btn small danger" data-t="item-del" data-id="${t.id}">Xóa</button></div>`:''}</article>`).join('')||'<p class="muted small">Trống</p>'}</div>`;
      return `<section class="prog-sec"><div class="sec-head"><h3>Mốc của đề tài</h3>${w?`<div class="sec-act"><button class="btn small primary" data-t="ms-new">+ Mốc</button>${ms.length?'':'<button class="btn small" data-t="ms-preset">Thêm mốc NCKH chuẩn</button>'}</div>`:''}</div>${msHtml}</section>
        <section class="prog-sec"><div class="sec-head"><h3>Công việc <small class="muted">${doneT}/${tasks.length} xong</small></h3>${w?'<div class="sec-act"><button class="btn small primary" data-t="task-new">+ Việc</button></div>':''}</div><div class="prog-bar"><span style="width:${pct}%"></span></div><div class="kanban">${col('todo')}${col('doing')}${col('done')}</div></section>`;}
    if(T.tab==='experiments'){const list=T.items.filter(i=>i.kind==='experiment'&&inFolder(i)).sort((a,b)=>(b.data?.date||'').localeCompare(a.data?.date||''));const charts=T.items.filter(i=>i.kind==='chart');
      return `${w?'<div class="team-bar"><button class="btn primary" data-t="exp-new">+ Ghi lần thí nghiệm</button><small class="muted">Ghi cấu hình, tham số và kết quả mỗi lần chạy để so sánh và viết báo cáo.</small></div>':''}<div class="exp-list">${list.map(i=>{const d=i.data||{};const ch=charts.find(c=>c.id===d.chart);return `<article class="exp-card"><header><div><h3>${esc(i.title)}</h3><small>${fmtDate(d.date)} · ${who(i)}${tag(i)}</small></div>${d.outcome?`<span class="exp-st ${esc(d.outcome)}">${{ok:'Đạt',partial:'Một phần',fail:'Chưa đạt'}[d.outcome]||''}</span>`:''}</header>
        <div class="exp-grid">${d.goal?`<div><h5>Mục tiêu</h5><p>${esc(d.goal)}</p></div>`:''}${d.setup?`<div><h5>Cấu hình</h5><p>${esc(d.setup)}</p></div>`:''}${d.params?`<div><h5>Tham số</h5><pre>${esc(d.params)}</pre></div>`:''}${d.result?`<div><h5>Kết quả</h5><pre>${esc(d.result)}</pre></div>`:''}${d.next?`<div><h5>Nhận xét / bước tiếp</h5><p>${esc(d.next)}</p></div>`:''}</div>
        ${ch?`<div class="chart-wrap exp-chart"><small>Biểu đồ gắn kèm: ${esc(ch.title)}</small>${chartSVG(ch.data||{},{width:640,height:300})}</div>`:''}${w?`<footer>${moveBtn(i)}<button class="btn small" data-t="exp-copy" data-id="${i.id}">Nhân bản</button><button class="btn small" data-t="exp-edit" data-id="${i.id}">Sửa</button><button class="btn small danger" data-t="item-del" data-id="${i.id}">Xóa</button></footer>`:''}</article>`;}).join('')||'<p class="muted">Chưa có lần thí nghiệm nào.</p>'}</div>`;}
    if(T.tab==='refs'){const list=T.items.filter(i=>i.kind==='ref'&&inFolder(i)).sort((a,b)=>a.created_at.localeCompare(b.created_at));
      return `<div class="team-bar">${w?'<button class="btn primary" data-t="ref-new">+ Tài liệu</button>':''}${list.length?'<button class="btn small" data-t="ref-export" data-k="ieee">Xuất IEEE</button><button class="btn small" data-t="ref-export" data-k="apa">Xuất APA</button><button class="btn small" data-t="ref-export" data-k="bib">Xuất BibTeX</button>':''}</div>
        <ol class="ref-list">${list.map((i,n)=>{const d=i.data||{},link=d.doi?`https://doi.org/${d.doi}`:d.url;return `<li><div class="ref-main"><p>${esc(cite(i,'ieee',n+1))}</p><small>${who(i)}${tag(i)}${d.note?` · ${esc(d.note)}`:''}</small></div><div class="ref-act">${link&&/^https:\/\//.test(link)?`<a class="btn small" href="${esc(link)}" target="_blank" rel="noopener noreferrer">Mở</a>`:''}<button class="btn small" data-t="ref-copy" data-id="${i.id}" data-k="${n+1}">Chép IEEE</button>${w?`${moveBtn(i)}<button class="btn small" data-t="ref-edit" data-id="${i.id}">Sửa</button><button class="btn small danger" data-t="item-del" data-id="${i.id}">Xóa</button>`:''}</div></li>`;}).join('')||'<p class="muted">Chưa có tài liệu nào. Thêm bài báo nhóm đang dùng để xuất danh mục tham khảo cho báo cáo.</p>'}</ol>`;}
    if(T.tab==='notes'){const list=T.items.filter(i=>i.kind==='note'&&inFolder(i));
      return `${w?'<div class="team-bar"><button class="btn primary" data-t="note-new">+ Ghi chú mới</button></div>':''}<div class="note-list">${list.map(i=>`<article class="team-note"><header><h3>${esc(i.title)}</h3><small>${who(i)} · ${when(i)}${tag(i)}</small></header><p>${esc(i.data?.body||'').replace(/\n/g,'<br>')}</p>${w?`<footer>${moveBtn(i)}<button class="btn small" data-t="note-edit" data-id="${i.id}">Sửa</button><button class="btn small danger" data-t="item-del" data-id="${i.id}">Xóa</button></footer>`:''}</article>`).join('')||'<p class="muted">Chưa có ghi chú.</p>'}</div>`;}
    const own=role()==='owner';
    return `${own?`<form class="team-invite" id="invite-form"><input type="email" name="email" placeholder="Email người cùng làm (đã hoặc chưa có tài khoản)" required maxlength="254"><select name="role"><option value="editor">Được sửa</option><option value="viewer">Chỉ xem</option></select><button class="btn primary" type="submit">Thêm</button></form><p class="muted">Nếu người đó chưa đăng ký, lời mời được giữ lại và tự vào nhóm ngay khi họ đăng ký bằng đúng email này.</p>`:''}
      <ul class="member-list">${T.members.map(m=>`<li><span><b>${esc(m.email)}</b>${m.user_id===me.id?' (bạn)':''}</span><em>${esc(ROLE[m.role])}</em>${own&&m.role!=='owner'?`<button class="btn small danger" data-t="member-del" data-id="${m.user_id}">Xóa</button>`:m.user_id===me.id&&m.role!=='owner'?`<button class="btn small" data-t="member-del" data-id="${m.user_id}">Rời nhóm</button>`:''}</li>`).join('')}${T.invites.map(v=>`<li class="pending"><span><b>${esc(v.email)}</b> · chờ đăng ký</span><em>${esc(ROLE[v.role])}</em>${own?`<button class="btn small" data-t="invite-del" data-email="${esc(v.email)}">Hủy</button>`:''}</li>`).join('')}</ul>`;
  }

  // ---- hộp thoại
  function modal(html,onSubmit){
    const d=document.createElement('dialog');d.className='editor-dialog team-dialog';d.innerHTML=`<form method="dialog" class="team-form">${html}<div class="form-actions"><button class="btn" type="button" data-x>Hủy</button><button class="btn primary" type="submit">Lưu</button></div></form>`;
    document.body.appendChild(d);d.showModal();$('[data-x]',d).addEventListener('click',()=>d.close());d.addEventListener('close',()=>d.remove());
    $('form',d).addEventListener('submit',async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));try{await onSubmit(f);d.close();}catch(err){fail(err);}});return d;
  }
  function chartDialog(item){
    const c=item?.data||{type:'bar',table:SAMPLE_TABLE};
    const d=modal(`<h2>${item?'Sửa':'Thêm'} biểu đồ</h2><label>Tên biểu đồ<input name="title" required maxlength="160" value="${esc(item?.title||'')}"></label>
      <label>Loại<select name="type">${Object.entries(CHART_TYPES).map(([k,v])=>`<option value="${k}" ${c.type===k?'selected':''}>${v}</option>`).join('')}</select></label>
      <div class="two"><label>Nhãn trục X<input name="xLabel" maxlength="60" value="${esc(c.xLabel||'')}"></label><label>Nhãn trục Y<input name="yLabel" maxlength="60" value="${esc(c.yLabel||'')}"></label></div>
      <label>Số liệu <small>dán từ Excel hoặc CSV: dòng đầu là tiêu đề, cột đầu là trục X</small><textarea name="table" rows="7" required maxlength="20000" spellcheck="false">${esc(c.table||'')}</textarea></label>
      <label>Ghi chú <small>không bắt buộc</small><input name="note" maxlength="300" value="${esc(c.note||'')}"></label><div class="chart-preview" id="chart-preview"></div>`,
      async f=>{const p=parseTable(f.table);if(p.error)throw new Error(p.error);
        const data={type:f.type,xLabel:f.xLabel,yLabel:f.yLabel,table:f.table,note:f.note,title:f.title,folder:item?(item.data?.folder||''):cur()};
        if(item){await askSave(item.title);const {error}=await client.from('team_items').update({title:f.title,data,updated_at:new Date().toISOString()}).eq('id',item.id);if(error)throw error;}
        else{const {error}=await client.from('team_items').insert({team_id:T.teamId,kind:'chart',title:f.title,data,created_by:me.id,author_email:me.email});if(error)throw error;}
        await refresh();});
    const prev=()=>{const f=Object.fromEntries(new FormData($('form',d)));$('#chart-preview',d).innerHTML=chartSVG({...f},{width:560,height:300});};
    $('form',d).addEventListener('input',prev);prev();
  }
  function msDialog(item){const d=item?.data||{};modal(`<h2>${item?'Sửa':'Thêm'} mốc</h2><label>Tên mốc<input name="title" required maxlength="160" value="${esc(item?.title||'')}" placeholder="Ví dụ: Báo cáo giữa kỳ"></label><label>Ngày<input name="date" type="date" value="${esc(d.date||'')}"></label><label>Ghi chú<input name="desc" maxlength="300" value="${esc(d.desc||'')}"></label>`,f=>saveItem(item,'milestone',f.title.trim(),{date:f.date||'',desc:f.desc||'',done:!!d.done}));}
  function taskDialog(item){const d=item?.data||{};modal(`<h2>${item?'Sửa':'Thêm'} việc</h2><label>Việc cần làm<input name="title" required maxlength="160" value="${esc(item?.title||'')}"></label><label>Mô tả<textarea name="desc" rows="3" maxlength="1000">${esc(d.desc||'')}</textarea></label><div class="two"><label>Người phụ trách<select name="assignee">${memberOpts(d.assignee||'')}</select></label><label>Hạn chót<input name="due" type="date" value="${esc(d.due||'')}"></label></div><label>Trạng thái<select name="status">${Object.entries(TASK_ST).map(([k,v])=>`<option value="${k}" ${(d.status||'todo')===k?'selected':''}>${v}</option>`).join('')}</select></label>`,f=>saveItem(item,'task',f.title.trim(),{desc:f.desc||'',assignee:f.assignee||'',due:f.due||'',status:f.status}));}
  function expDialog(item,copy=false){const d=item?.data||{};const charts=T.items.filter(i=>i.kind==='chart');modal(`<h2>${item&&!copy?'Sửa':'Ghi'} lần thí nghiệm</h2><div class="two"><label>Tên lần chạy<input name="title" required maxlength="160" value="${esc(copy?(item.title+' (lặp lại)'):(item?.title||''))}" placeholder="Ví dụ: Chạy #12 · T = 85 °C"></label><label>Ngày<input name="date" type="date" value="${esc(copy?today():(d.date||today()))}"></label></div>
      <label>Mục tiêu<input name="goal" maxlength="400" value="${esc(d.goal||'')}"></label><label>Cấu hình (phần cứng, phần mềm, phiên bản mã)<textarea name="setup" rows="2" maxlength="2000">${esc(d.setup||'')}</textarea></label>
      <label>Tham số <small>mỗi dòng một tham số, ví dụ T = 85 °C</small><textarea name="params" rows="4" maxlength="3000" spellcheck="false">${esc(d.params||'')}</textarea></label><label>Kết quả <small>số đo, BER/FER…</small><textarea name="result" rows="3" maxlength="3000" spellcheck="false">${esc(copy?'':(d.result||''))}</textarea></label>
      <div class="two"><label>Đánh giá<select name="outcome"><option value="">Chưa đánh giá</option>${[['ok','Đạt'],['partial','Một phần'],['fail','Chưa đạt']].map(([k,v])=>`<option value="${k}" ${!copy&&d.outcome===k?'selected':''}>${v}</option>`).join('')}</select></label><label>Gắn biểu đồ<select name="chart"><option value="">Không</option>${charts.map(c=>`<option value="${c.id}" ${d.chart===c.id?'selected':''}>${esc(c.title)}</option>`).join('')}</select></label></div>
      <label>Nhận xét / bước tiếp theo<textarea name="next" rows="2" maxlength="2000">${esc(copy?'':(d.next||''))}</textarea></label>`,f=>saveItem(copy?null:item,'experiment',f.title.trim(),{date:f.date||'',goal:f.goal||'',setup:f.setup||'',params:f.params||'',result:f.result||'',outcome:f.outcome||'',chart:f.chart||'',next:f.next||'',...(copy?{folder:d.folder||''}:{})}));}
  function refDialog(item){const d=item?.data||{};modal(`<h2>${item?'Sửa':'Thêm'} tài liệu tham khảo</h2><label>Tên bài / sách<input name="title" required maxlength="160" value="${esc(item?.title||'')}"></label><label>Tác giả <small>cách nhau bằng dấu ;  ví dụ: Chi, W.; Nguyen, V. A.</small><input name="authors" maxlength="600" value="${esc(d.authors||'')}"></label><div class="two"><label>Nơi đăng (tạp chí, hội nghị)<input name="venue" maxlength="200" value="${esc(d.venue||'')}"></label><label>Năm<input name="year" maxlength="4" inputmode="numeric" value="${esc(d.year||'')}"></label></div><div class="two"><label>DOI<input name="doi" maxlength="120" value="${esc(d.doi||'')}" placeholder="10.xxxx/xxxx"></label><label>Liên kết<input name="url" type="url" maxlength="500" value="${esc(d.url||'')}" placeholder="https://..."></label></div><label>Ghi chú (dùng cho phần nào)<input name="note" maxlength="300" value="${esc(d.note||'')}"></label>`,
    f=>{const url=(f.url||'').trim();if(url&&!/^https:\/\//.test(url))throw new Error('Liên kết phải bắt đầu bằng https://');const doi=(f.doi||'').trim().replace(/^https?:\/\/(dx\.)?doi\.org\//,'');if(doi&&!/^10\.\d{3,9}\/\S+$/.test(doi))throw new Error('DOI không hợp lệ (dạng 10.xxxx/...).');if(f.year&&!/^\d{4}$/.test(f.year))throw new Error('Năm gồm 4 chữ số.');return saveItem(item,'ref',f.title.trim(),{authors:f.authors||'',venue:f.venue||'',year:f.year||'',doi,url,note:f.note||''});});}
  function noteDialog(item){modal(`<h2>${item?'Sửa':'Thêm'} ghi chú</h2><label>Tiêu đề<input name="title" required maxlength="160" value="${esc(item?.title||'')}"></label><label>Nội dung<textarea name="body" rows="8" maxlength="20000">${esc(item?.data?.body||'')}</textarea></label>`,
    async f=>{const data={body:f.body,folder:item?(item.data?.folder||''):cur()};
      if(item){await askSave(item.title);const {error}=await client.from('team_items').update({title:f.title,data,updated_at:new Date().toISOString()}).eq('id',item.id);if(error)throw error;}
      else{const {error}=await client.from('team_items').insert({team_id:T.teamId,kind:'note',title:f.title,data,created_by:me.id,author_email:me.email});if(error)throw error;}
      await refresh();});}
  async function refresh(){try{await loadTeam();}catch(e){fail(e);}draw();}
  const OK_TYPES=new Set(['application/pdf','image/png','image/jpeg','image/webp','image/gif','image/svg+xml','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.ms-powerpoint','text/plain','text/csv','application/zip','application/x-zip-compressed','application/json']);
  async function ensureFolder(parts,parent){let cur=parent;for(const name of parts){const t=name.trim().slice(0,80);if(!t)continue;let f=folders().find(x=>x.title===t&&(x.data?.parent||'')===cur);
      if(!f){const {data,error}=await client.from('team_items').insert({team_id:T.teamId,kind:'folder',title:t,data:{parent:cur},created_by:me.id,author_email:me.email}).select('*').single();if(error)throw error;f=data;T.items.push(f);}cur=f.id;}return cur;}
  async function uploadDir(files){
    files=files.filter(f=>!f.webkitRelativePath.split('/').some(seg=>seg.startsWith('.')||seg==='node_modules'||seg==='__MACOSX'));
    if(!files.length){toast('Thư mục trống.',true);return;}
    if(files.length>300){toast('Mỗi lần tải tối đa 300 tệp. Hãy chia nhỏ thư mục.',true);return;}
    const big=files.filter(f=>f.size>MAX_FILE).length,total=files.reduce((n,f)=>n+f.size,0);
    if(!await confirmAction('Tải cả thư mục lên?',`${files.length} tệp, khoảng ${Math.max(1,Math.round(total/1048576))} MB, vào “${fpath(cur())}”. Cấu trúc thư mục con được giữ nguyên.${big?` ${big} tệp quá 50 MB sẽ bị bỏ qua.`:''}`))return;
    const map=new Map();
    try{for(const f of files){const dir=f.webkitRelativePath.split('/').slice(0,-1).join('/');if(!map.has(dir))map.set(dir,await ensureFolder(dir.split('/'),cur()));}}catch(e){fail(e);return;}
    await upload(files,f=>map.get(f.webkitRelativePath.split('/').slice(0,-1).join('/')));
  }
  async function upload(files,folderOf=()=>cur()){
    let done=0;
    for(const file of files){
      if(file.size>MAX_FILE){toast(file.name+': quá 50 MB.',true);continue;}
      const safe=file.name.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').replace(/[^\w.-]+/g,'_').slice(-80)||'tep';
      const path=`${T.teamId}/${crypto.randomUUID()}-${safe}`;toast(`Đang tải ${++done}/${files.length}: ${file.name}`);
      const up=await client.storage.from(BUCKET).upload(path,file,{upsert:false,contentType:OK_TYPES.has(file.type)?file.type:'application/octet-stream'});
      if(up.error){fail(up.error);continue;}
      const {error}=await client.from('team_items').insert({team_id:T.teamId,kind:'file',title:file.name.slice(0,160),data:{folder:folderOf(file)||''},file_path:path,file_name:file.name.slice(0,200),file_type:(file.type||'').slice(0,100),file_size:file.size,created_by:me.id,author_email:me.email});
      if(error){await client.storage.from(BUCKET).remove([path]);fail(error);}
    }
    toast('Đã tải lên.');await refresh();
  }

  root.addEventListener('change',async e=>{if(e.target.id==='act-filter'){T.actFilter=e.target.value;draw();return;}if(e.target.id==='act-user'){T.actUser=e.target.value;draw();return;}if(!e.target.files?.length)return;const fs=[...e.target.files];if(e.target.id==='team-file'){e.target.value='';if(await confirmAction('Tải lên?',`${fs.length} tệp (${fs.slice(0,3).map(f=>f.name).join(', ')}${fs.length>3?'…':''}) vào “${fpath(cur())}”. Mọi thành viên sẽ thấy và lịch sử ghi tên bạn.`))upload(fs);}else if(e.target.id==='team-dir'){e.target.value='';uploadDir(fs);}});
  root.addEventListener('submit',async e=>{if(e.target.id!=='invite-form')return;e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
    try{const {data,error}=await client.rpc('add_team_member',{t:T.teamId,member_email:f.email,member_role:f.role});if(error)throw error;toast(data==='added'?'Đã thêm vào nhóm.':'Chưa có tài khoản: lời mời đã lưu, người đó vào nhóm khi đăng ký.');await refresh();}catch(err){fail(err);}});
  root.addEventListener('click',async e=>{
    const b=e.target.closest('[data-t]');if(!b)return;const k=b.dataset.t,id=b.dataset.id,item=T.items.find(i=>i.id===id);
    try{
      if(k==='pick'){T.teamId=id;T.loading=true;draw();await loadTeam();T.loading=false;draw();}
      else if(k==='tab'){T.tab=b.dataset.k;draw();}
      else if(k==='folder'){T.folder=b.dataset.k;if(T.tab==='members')T.tab='progress';draw();}
      else if(k==='folder-new')modal(`<h2>Thư mục mới</h2><p class="muted">Nằm trong: ${esc(fpath(cur()))}</p><label>Tên thư mục<input name="name" required maxlength="80" placeholder="Ví dụ: Báo cáo giữa kỳ"></label>`,async f=>{const {error}=await client.from('team_items').insert({team_id:T.teamId,kind:'folder',title:f.name.trim().slice(0,80),data:{parent:cur()},created_by:me.id,author_email:me.email});if(error)throw error;await refresh();});
      else if(k==='folder-rename'){const f0=folders().find(f=>f.id===T.folder);if(f0)modal(`<h2>Đổi tên thư mục</h2><label>Tên thư mục<input name="name" required maxlength="80" value="${esc(f0.title)}"></label>`,async f=>{await askSave(f0.title);const {error}=await client.from('team_items').update({title:f.name.trim().slice(0,80),data:f0.data||{}}).eq('id',f0.id);if(error)throw error;await refresh();});}
      else if(k==='folder-del'){const f0=folders().find(f=>f.id===T.folder);if(f0&&await confirmAction('Xóa thư mục “'+f0.title+'”?','Các mục và thư mục con bên trong sẽ được chuyển lên thư mục cha, không bị xóa.')){const parent=f0.data?.parent||'';
        for(const i of T.items.filter(i=>i.id!==f0.id&&(i.kind==='folder'?(i.data?.parent||''):(i.data?.folder||''))===f0.id)){const data={...(i.data||{})};if(i.kind==='folder')data.parent=parent;else data.folder=parent;const {error}=await client.from('team_items').update({data}).eq('id',i.id);if(error)throw error;}
        const {error}=await client.from('team_items').delete().eq('id',f0.id);if(error)throw error;T.folder=parent;await refresh();}}
      else if(k==='move'&&item){const opts=[['','Thư mục chính'],...folders().map(f=>[f.id,fpath(f.id)])];modal(`<h2>Chuyển “${esc(item.title)}”</h2><label>Tới thư mục<select name="folder">${opts.map(([v,l])=>`<option value="${esc(v)}" ${(item.data?.folder||'')===v?'selected':''}>${esc(l)}</option>`).join('')}</select></label>`,async f=>{await askSave(item.title);const {error}=await client.from('team_items').update({data:{...(item.data||{}),folder:f.folder}}).eq('id',item.id);if(error)throw error;await refresh();});}
      else if(k==='reload')await loadTeams();
      else if(k==='new-team')modal('<h2>Nhóm nghiên cứu mới</h2><label>Tên nhóm / đề tài<input name="name" required maxlength="120"></label><label>Mô tả ngắn<textarea name="desc" rows="3" maxlength="2000"></textarea></label>',async f=>{const {data,error}=await client.rpc('create_team',{team_name:f.name,team_desc:f.desc||''});if(error)throw error;T.teamId=data;T.tab='progress';await loadTeams();});
      else if(k==='edit-team'){const t=team();modal(`<h2>Sửa nhóm</h2><label>Tên nhóm / đề tài<input name="name" required maxlength="120" value="${esc(t.name)}"></label><label>Mô tả ngắn<textarea name="desc" rows="3" maxlength="2000">${esc(t.description)}</textarea></label><label>Ảnh đại diện nhóm <small>PNG, JPG, WebP hoặc SVG; tự cắt vuông 256×256</small><input name="avatarFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"></label>${t.avatar?'<label class="check-label"><input type="checkbox" name="clearAvatar"> Bỏ ảnh hiện tại</label>':''}<label>Liên kết GitHub <small>dán link repo (https://github.com/tên/repo) để xem mã nguồn ở thẻ Mã nguồn; repo private cũng được</small><input name="github" type="url" maxlength="200" placeholder="https://github.com/..." value="${esc(t.github_url)}"></label>`,async f=>{const g=(f.github||'').trim();if(g&&!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+(\/[A-Za-z0-9_.-]+)?\/?$/.test(g))throw new Error('Chỉ nhận liên kết dạng https://github.com/tên/repo.');await askSave(t.name);let avatar=t.avatar||'';if(f.clearAvatar)avatar='';if(f.avatarFile&&f.avatarFile.size)avatar=await toAvatar(f.avatarFile);const {error}=await client.from('teams').update({name:f.name,description:f.desc||'',github_url:g,avatar}).eq('id',T.teamId);if(error)throw error;await loadTeams();});}
      else if(k==='del-team'){if(await confirmAction('Xóa nhóm?','Toàn bộ biểu đồ, ghi chú và tệp của nhóm sẽ mất với mọi thành viên.')){const files=T.items.filter(i=>i.file_path).map(i=>i.file_path);if(files.length)await client.storage.from(BUCKET).remove(files);const {error}=await client.from('teams').delete().eq('id',T.teamId);if(error)throw error;T.teamId='';await loadTeams();}}
      else if(k==='chart-new')chartDialog(null);
      else if(k==='chart-edit'&&item)chartDialog(item);
      else if(k==='chart-png'&&item)svgToPng(chartSVG(item.data||{}),item.title);
      else if(k==='note-new')noteDialog(null);
      else if(k==='act-export'){const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';download('lich-su-nhom.csv','\ufeff'+['Thời gian,Người,Hành động,Loại,Mục,Chi tiết',...T.activity.map(a=>[new Date(a.at).toLocaleString('vi-VN'),a.email,a.action,a.item_kind,a.item_title,a.detail].map(q).join(','))].join('\n'));}
      else if(k==='ms-new')msDialog(null);
      else if(k==='ms-edit'&&item)msDialog(item);
      else if(k==='ms-toggle'&&item)await saveItem(item,'milestone',item.title,{done:!item.data?.done});
      else if(k==='ms-preset'){for(const [title] of PRESET){const {error}=await client.from('team_items').insert({team_id:T.teamId,kind:'milestone',title,data:{date:'',desc:'',done:false,folder:''},created_by:me.id,author_email:me.email});if(error)throw error;}await refresh();toast('Đã thêm 5 mốc. Bấm Sửa để đặt ngày cho từng mốc.');}
      else if(k==='task-new')taskDialog(null);
      else if(k==='task-edit'&&item)taskDialog(item);
      else if(k==='task-move'&&item)await saveItem(item,'task',item.title,{status:b.dataset.k});
      else if(k==='exp-new')expDialog(null);
      else if(k==='exp-edit'&&item)expDialog(item);
      else if(k==='exp-copy'&&item)expDialog(item,true);
      else if(k==='ref-new')refDialog(null);
      else if(k==='ref-edit'&&item)refDialog(item);
      else if(k==='ref-copy'&&item){try{await navigator.clipboard.writeText(cite(item,'ieee',Number(b.dataset.k)));toast('Đã chép trích dẫn IEEE.');}catch{toast('Trình duyệt không cho chép tự động.',true);}}
      else if(k==='ref-export'){const list=T.items.filter(i=>i.kind==='ref'&&inFolder(i)).sort((a,c)=>a.created_at.localeCompare(c.created_at));const st=b.dataset.k;const text=list.map((i,n)=>cite(i,st,n+1)).join(st==='bib'?'\n\n':'\n');download(`tai-lieu-tham-khao.${st==='bib'?'bib':'txt'}`,text);}
      else if(k==='note-edit'&&item)noteDialog(item);
      else if(k==='file-open'&&item){client.rpc('log_team_access',{t:T.teamId,what:'open',title:item.title}).then(()=>{},()=>{});const {data,error}=await client.storage.from(BUCKET).createSignedUrl(item.file_path,300);if(error)throw error;window.open(data.signedUrl,'_blank','noopener,noreferrer');}
      else if(k==='item-del'&&item){if(await confirmAction('Xóa mục này?',item.title)){if(item.file_path)await client.storage.from(BUCKET).remove([item.file_path]);const {error}=await client.from('team_items').delete().eq('id',item.id);if(error)throw error;await refresh();}}
      else if(k==='member-del'){const self=id===me.id;if(await confirmAction(self?'Rời nhóm?':'Xóa thành viên?',self?'Bạn sẽ không xem được nhóm này nữa.':'Người này sẽ không còn truy cập nhóm.')){const {error}=await client.rpc('remove_team_member',{t:T.teamId,member:id});if(error)throw error;if(self){T.teamId='';await loadTeams();}else await refresh();}}
      else if(k==='invite-del'){const {error}=await client.rpc('cancel_team_invite',{t:T.teamId,mail:b.dataset.email});if(error)throw error;await refresh();}
    }catch(err){fail(err);}
  });
  return {open:loadTeams};
}
