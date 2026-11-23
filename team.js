// Nhóm NCKH chung: nhiều tài khoản cùng xem / sửa biểu đồ, báo cáo, hình ảnh và ghi chú. Dữ liệu nằm ở Supabase (xem supabase/team.sql).
import {chartSVG,parseTable,svgToPng,CHART_TYPES} from './charts.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ROLE={owner:'Chủ nhóm',editor:'Được sửa',viewer:'Chỉ xem'};
const BUCKET='team-files',MAX_FILE=50*1024*1024;
const SAMPLE_TABLE='Mẫu,Gốc,Cải tiến\nCARRY4,853,693\nLUT (nghìn),49.4,48.0';
const T={teams:[],teamId:localStorage.getItem?.('lab-tdv:team')||'',tab:'charts',items:[],members:[],invites:[],loading:false,error:'',urls:new Map()};

export function createTeamPage({root,client,me,toast,confirmAction}){
  const $=(s,r=root)=>r.querySelector(s);
  const team=()=>T.teams.find(t=>t.id===T.teamId);
  const role=()=>T.members.find(m=>m.user_id===me.id)?.role||'viewer';
  const canWrite=()=>['owner','editor'].includes(role());
  const fail=e=>{console.warn(e);toast(e?.message||'Có lỗi xảy ra.',true);};

  async function loadTeams(){
    T.loading=true;T.error='';draw();
    try{
      await client.rpc('claim_team_invites');
      const {data,error}=await client.from('teams').select('id,name,description,owner_id,created_at,github_url').order('created_at');
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
  }

  function draw(){
    const t=team();
    const side=`<aside class="team-side"><div class="team-side-head"><h3>Nhóm của bạn</h3><button class="btn small primary" data-t="new-team">+ Nhóm mới</button></div>${T.teams.map(x=>`<button class="team-pick ${x.id===T.teamId?'active':''}" data-t="pick" data-id="${esc(x.id)}"><b>${esc(x.name)}</b><small>${x.owner_id===me.id?'Bạn là chủ nhóm':'Thành viên'}</small></button>`).join('')||'<p class="muted">Chưa có nhóm nào.</p>'}</aside>`;
    let main='';
    if(T.error)main=`<div class="team-empty"><h3>Chưa dùng được nhóm</h3><p>${esc(T.error)}</p></div>`;
    else if(T.loading&&!t)main='<div class="team-empty"><p>Đang tải…</p></div>';
    else if(!t)main='<div class="team-empty"><h3>Tạo nhóm nghiên cứu đầu tiên</h3><p>Nhóm là nơi chung để bạn và người cùng làm đề tài đặt biểu đồ, báo cáo và hình ảnh. Bạn thêm thành viên bằng email của họ.</p><button class="btn primary" data-t="new-team">+ Tạo nhóm</button></div>';
    else main=`<div class="team-main"><header class="team-head"><div><span class="eyebrow">DỰ ÁN NCKH CHUNG · ${esc(ROLE[role()]).toUpperCase()}</span><h2>${esc(t.name)}</h2>${t.description?`<p class="muted">${esc(t.description)}</p>`:''}</div><div class="team-head-actions">${t.github_url?`<a class="btn small" href="${esc(t.github_url)}" target="_blank" rel="noopener noreferrer">GitHub ↗</a>`:''}<button class="btn small" data-t="reload">Làm mới</button>${role()==='owner'?'<button class="btn small" data-t="edit-team">Sửa nhóm</button><button class="btn small danger" data-t="del-team">Xóa nhóm</button>':''}</div></header>
      <nav class="team-tabs">${[['charts','Biểu đồ'],['files','Báo cáo & hình ảnh'],['notes','Ghi chú'],['members','Thành viên']].map(([k,l])=>`<button data-t="tab" data-k="${k}" class="${T.tab===k?'active':''}">${l}${k==='members'?` (${T.members.length})`:k==='charts'?` (${T.items.filter(i=>i.kind==='chart').length})`:k==='files'?` (${T.items.filter(i=>i.kind==='file').length})`:k==='notes'?` (${T.items.filter(i=>i.kind==='note').length})`:''}</button>`).join('')}</nav>
      <section class="team-body">${body()}</section></div>`;
    root.innerHTML=`<header class="page-heading"><div><span class="eyebrow">LÀM VIỆC CHUNG</span><h1>Nhóm NCKH</h1><p>Nhiều người cùng dùng biểu đồ, báo cáo và hình ảnh của một đề tài.</p></div></header><div class="team-layout">${side}${main}</div>`;
    T.items.filter(i=>i.kind==='file'&&/^image\//.test(i.file_type||'')).forEach(async i=>{if(T.urls.has(i.id))return;try{const {data}=await client.storage.from(BUCKET).createSignedUrl(i.file_path,3600);if(data){T.urls.set(i.id,data.signedUrl);const img=root.querySelector(`img[data-img="${i.id}"]`);if(img)img.src=data.signedUrl;}}catch{}});
  }
  const who=i=>esc(i.author_email||'');
  const when=i=>new Date(i.updated_at).toLocaleDateString('vi-VN');
  function body(){
    const w=canWrite();
    if(T.tab==='charts'){const list=T.items.filter(i=>i.kind==='chart');
      return `${w?'<div class="team-bar"><button class="btn primary" data-t="chart-new">+ Biểu đồ mới</button></div>':''}<div class="chart-grid">${list.map(i=>`<article class="chart-card"><header><h3>${esc(i.title)}</h3><small>${who(i)} · ${when(i)}</small></header><div class="chart-wrap">${chartSVG(i.data||{})}</div>${i.data?.note?`<p class="muted">${esc(i.data.note)}</p>`:''}<footer><button class="btn small" data-t="chart-png" data-id="${i.id}">Tải PNG</button>${w?`<button class="btn small" data-t="chart-edit" data-id="${i.id}">Sửa</button><button class="btn small danger" data-t="item-del" data-id="${i.id}">Xóa</button>`:''}</footer></article>`).join('')||'<p class="muted">Chưa có biểu đồ. Dán bảng số liệu từ Excel là vẽ được ngay.</p>'}</div>`;}
    if(T.tab==='files'){const list=T.items.filter(i=>i.kind==='file');
      return `${w?'<div class="team-bar"><label class="btn primary file-btn">+ Tải lên báo cáo / hình ảnh<input type="file" id="team-file" multiple hidden></label><small class="muted">Tối đa 50 MB mỗi tệp. Hình ảnh sẽ hiện xem trước.</small></div>':''}<div class="file-grid">${list.map(i=>`<article class="file-card">${/^image\//.test(i.file_type||'')?`<img data-img="${i.id}" alt="${esc(i.title)}" ${T.urls.get(i.id)?`src="${esc(T.urls.get(i.id))}"`:''}>`:`<div class="file-ico">${esc((i.file_name||'').split('.').pop().slice(0,4).toUpperCase()||'TỆP')}</div>`}<h4>${esc(i.title)}</h4><small>${who(i)} · ${when(i)} · ${Math.max(1,Math.round((i.file_size||0)/1024))} KB</small><div class="file-actions"><button class="btn small" data-t="file-open" data-id="${i.id}">Mở</button>${w?`<button class="btn small danger" data-t="item-del" data-id="${i.id}">Xóa</button>`:''}</div></article>`).join('')||'<p class="muted">Chưa có tệp nào.</p>'}</div>`;}
    if(T.tab==='notes'){const list=T.items.filter(i=>i.kind==='note');
      return `${w?'<div class="team-bar"><button class="btn primary" data-t="note-new">+ Ghi chú mới</button></div>':''}<div class="note-list">${list.map(i=>`<article class="team-note"><header><h3>${esc(i.title)}</h3><small>${who(i)} · ${when(i)}</small></header><p>${esc(i.data?.body||'').replace(/\n/g,'<br>')}</p>${w?`<footer><button class="btn small" data-t="note-edit" data-id="${i.id}">Sửa</button><button class="btn small danger" data-t="item-del" data-id="${i.id}">Xóa</button></footer>`:''}</article>`).join('')||'<p class="muted">Chưa có ghi chú.</p>'}</div>`;}
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
        const data={type:f.type,xLabel:f.xLabel,yLabel:f.yLabel,table:f.table,note:f.note,title:f.title};
        if(item){const {error}=await client.from('team_items').update({title:f.title,data,updated_at:new Date().toISOString()}).eq('id',item.id);if(error)throw error;}
        else{const {error}=await client.from('team_items').insert({team_id:T.teamId,kind:'chart',title:f.title,data,created_by:me.id,author_email:me.email});if(error)throw error;}
        await refresh();});
    const prev=()=>{const f=Object.fromEntries(new FormData($('form',d)));$('#chart-preview',d).innerHTML=chartSVG({...f},{width:560,height:300});};
    $('form',d).addEventListener('input',prev);prev();
  }
  function noteDialog(item){modal(`<h2>${item?'Sửa':'Thêm'} ghi chú</h2><label>Tiêu đề<input name="title" required maxlength="160" value="${esc(item?.title||'')}"></label><label>Nội dung<textarea name="body" rows="8" maxlength="20000">${esc(item?.data?.body||'')}</textarea></label>`,
    async f=>{const data={body:f.body};
      if(item){const {error}=await client.from('team_items').update({title:f.title,data,updated_at:new Date().toISOString()}).eq('id',item.id);if(error)throw error;}
      else{const {error}=await client.from('team_items').insert({team_id:T.teamId,kind:'note',title:f.title,data,created_by:me.id,author_email:me.email});if(error)throw error;}
      await refresh();});}
  async function refresh(){try{await loadTeam();}catch(e){fail(e);}draw();}
  async function upload(files){
    for(const file of files){
      if(file.size>MAX_FILE){toast(file.name+': quá 50 MB.',true);continue;}
      const safe=file.name.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').replace(/[^\w.-]+/g,'_').slice(-80)||'tep';
      const path=`${T.teamId}/${crypto.randomUUID()}-${safe}`;toast('Đang tải '+file.name+'…');
      const up=await client.storage.from(BUCKET).upload(path,file,{upsert:false,contentType:file.type||'application/octet-stream'});
      if(up.error){fail(up.error);continue;}
      const {error}=await client.from('team_items').insert({team_id:T.teamId,kind:'file',title:file.name.slice(0,160),file_path:path,file_name:file.name.slice(0,200),file_type:(file.type||'').slice(0,100),file_size:file.size,created_by:me.id,author_email:me.email});
      if(error){await client.storage.from(BUCKET).remove([path]);fail(error);}
    }
    toast('Đã tải lên.');await refresh();
  }

  root.addEventListener('change',e=>{if(e.target.id==='team-file'&&e.target.files.length){const fs=[...e.target.files];e.target.value='';upload(fs);}});
  root.addEventListener('submit',async e=>{if(e.target.id!=='invite-form')return;e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
    try{const {data,error}=await client.rpc('add_team_member',{t:T.teamId,member_email:f.email,member_role:f.role});if(error)throw error;toast(data==='added'?'Đã thêm vào nhóm.':'Chưa có tài khoản: lời mời đã lưu, người đó vào nhóm khi đăng ký.');await refresh();}catch(err){fail(err);}});
  root.addEventListener('click',async e=>{
    const b=e.target.closest('[data-t]');if(!b)return;const k=b.dataset.t,id=b.dataset.id,item=T.items.find(i=>i.id===id);
    try{
      if(k==='pick'){T.teamId=id;T.loading=true;draw();await loadTeam();T.loading=false;draw();}
      else if(k==='tab'){T.tab=b.dataset.k;draw();}
      else if(k==='reload')await loadTeams();
      else if(k==='new-team')modal('<h2>Nhóm nghiên cứu mới</h2><label>Tên nhóm / đề tài<input name="name" required maxlength="120"></label><label>Mô tả ngắn<textarea name="desc" rows="3" maxlength="2000"></textarea></label>',async f=>{const {data,error}=await client.rpc('create_team',{team_name:f.name,team_desc:f.desc||''});if(error)throw error;T.teamId=data;T.tab='charts';await loadTeams();});
      else if(k==='edit-team'){const t=team();modal(`<h2>Sửa nhóm</h2><label>Tên nhóm / đề tài<input name="name" required maxlength="120" value="${esc(t.name)}"></label><label>Mô tả ngắn<textarea name="desc" rows="3" maxlength="2000">${esc(t.description)}</textarea></label><label>Liên kết GitHub <small>repo hoặc trang tài khoản, ví dụ https://github.com/tdviet2011/my-lab</small><input name="github" type="url" maxlength="200" placeholder="https://github.com/..." value="${esc(t.github_url)}"></label>`,async f=>{const g=(f.github||'').trim();if(g&&!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+(\/[A-Za-z0-9_.-]+)?\/?$/.test(g))throw new Error('Chỉ nhận liên kết dạng https://github.com/tên/repo.');const {error}=await client.from('teams').update({name:f.name,description:f.desc||'',github_url:g}).eq('id',T.teamId);if(error)throw error;await loadTeams();});}
      else if(k==='del-team'){if(await confirmAction('Xóa nhóm?','Toàn bộ biểu đồ, ghi chú và tệp của nhóm sẽ mất với mọi thành viên.')){const files=T.items.filter(i=>i.file_path).map(i=>i.file_path);if(files.length)await client.storage.from(BUCKET).remove(files);const {error}=await client.from('teams').delete().eq('id',T.teamId);if(error)throw error;T.teamId='';await loadTeams();}}
      else if(k==='chart-new')chartDialog(null);
      else if(k==='chart-edit'&&item)chartDialog(item);
      else if(k==='chart-png'&&item)svgToPng(chartSVG(item.data||{}),item.title);
      else if(k==='note-new')noteDialog(null);
      else if(k==='note-edit'&&item)noteDialog(item);
      else if(k==='file-open'&&item){const {data,error}=await client.storage.from(BUCKET).createSignedUrl(item.file_path,300);if(error)throw error;window.open(data.signedUrl,'_blank','noopener,noreferrer');}
      else if(k==='item-del'&&item){if(await confirmAction('Xóa mục này?',item.title)){if(item.file_path)await client.storage.from(BUCKET).remove([item.file_path]);const {error}=await client.from('team_items').delete().eq('id',item.id);if(error)throw error;await refresh();}}
      else if(k==='member-del'){const self=id===me.id;if(await confirmAction(self?'Rời nhóm?':'Xóa thành viên?',self?'Bạn sẽ không xem được nhóm này nữa.':'Người này sẽ không còn truy cập nhóm.')){const {error}=await client.rpc('remove_team_member',{t:T.teamId,member:id});if(error)throw error;if(self){T.teamId='';await loadTeams();}else await refresh();}}
      else if(k==='invite-del'){const {error}=await client.rpc('cancel_team_invite',{t:T.teamId,mail:b.dataset.email});if(error)throw error;await refresh();}
    }catch(err){fail(err);}
  });
  return {open:loadTeams};
}
