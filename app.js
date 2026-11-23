import {MODEL_TYPES,SIM_MODELS,guessModel,blocksOf,simOf,blockDiagramSVG,coverArt,DEFAULT_SIM} from './project-viz.js';
import {drawSignals,PARAM_INFO} from './signals.js';
import * as cloud from './cloud.js';
import * as localFiles from './localfiles.js';
import {createAlgoPlayer,guessAlgo,ALGORITHMS} from './algorithms.js';
const GUEST=cloud.cloudEnabled&&cloud.isGuest();
const files=cloud.cloudEnabled&&!GUEST?cloud:localFiles;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const paths = {
  palette:'<circle cx="12" cy="12" r="9"/><circle cx="8" cy="9" r="1.5" fill="#8bd9ce" stroke="none"/><circle cx="14" cy="7" r="1.5" fill="#b59bda" stroke="none"/><circle cx="17" cy="12" r="1.5" fill="#d7b97b" stroke="none"/><circle cx="10" cy="16" r="1.5" fill="#88a5d4" stroke="none"/>',
  chip:'<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 3v3m6-3v3M9 18v3m6-3v3M3 9h3m-3 6h3m12-6h3m-3 6h3"/>',
  orbit:'<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="11" ry="5" transform="rotate(-35 12 12)"/><path d="M8 3a10 10 0 0 1 12 13M4 8a10 10 0 0 0 12 13"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  folder:'<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/>',
  flask:'<path d="M9 3h6m-5 0v6l-6 10a1.5 1.5 0 0 0 1.3 2h13.4a1.5 1.5 0 0 0 1.3-2L14 9V3M7 15h10"/><path d="m10 17 1 1m3-5h.01"/>',
  wave:'<path d="M1 12h3c2 0 2-8 4-8s2 16 4 16 2-16 4-16 2 8 4 8h3"/>',
  notebook:'<rect x="5" y="3" width="15" height="18" rx="2"/><path d="M3 7h4m-4 5h4m-4 5h4m4-10h6m-6 4h6m-6 4h4"/>',
  book:'<path d="M12 5v16M12 5C9 3 5 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 1Z"/>',
  settings:'<path d="m9 3-.6 3-2 .9-2.8-.9L2 9l2.3 2v2L2 15l1.6 3 2.8-.9 2 .9.6 3h6l.6-3 2-.9 2.8.9 1.6-3-2.3-2v-2L22 9l-1.6-3-2.8.9-2-.9L15 3Z"/><circle cx="12" cy="12" r="3"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  edit:'<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14Z"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  mouse:'<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 6v4"/>',
  pause:'<path d="M8 5v14M16 5v14"/>',
  play:'<path d="m7 4 14 8-14 8Z"/>',
  layers:'<path d="m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
  rotate:'<path d="M4 8a9 9 0 1 1-1 7M4 3v5h5"/>',
  users:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M17 14c2.5 0 4 2 4 5"/>',
  spark:'<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload:'<path d="M12 15V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check:'<path d="m5 12 4 4L20 5"/>',
  trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  external:'<path d="M14 3h7v7m0-7L11 13M10 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18"/>',
  file:'<path d="M14 2H5v20h14V7Zm0 0v5h5M8 12h8m-8 4h6"/>'
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.file}</svg>`;
function hydrateIcons(root=document){ $$('[data-icon]',root).forEach(el=>{el.innerHTML=icon(el.dataset.icon);el.removeAttribute('data-icon');}); }
hydrateIcons();
const esc = value => String(value??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const STORE = 'lab-tdv:v1';
const NOTE_TYPES={note:'Ghi chú',journal:'Nhật ký thí nghiệm',idea:'Ý tưởng',meeting:'Họp / trao đổi'};
const RESOURCE_CATS=['Bài báo khoa học','Datasheet','Giáo trình / Sách','Báo cáo / Luận văn','Mã nguồn','PDK / Công cụ','Học tập','Tài liệu'];
const STATUS = {idea:'Chờ thực hiện',active:'Đang thực hiện',testing:'Thử nghiệm',done:'Hoàn thành'};
const PAGES = {team:'Nhóm NCKH',portfolio:'Portfolio',welcome:'Chào mừng',home:'Phòng lab',overview:'Tổng quan',projects:'Dự án',research:'Nghiên cứu khoa học',simulation:'Mô phỏng tín hiệu',mathematics:'Không gian toán học',notes:'Sổ tay',library:'Thư viện',settings:'Cài đặt',search:'Kết quả tìm kiếm'};
const dateFormat = value => { if(!value)return 'Chưa đặt mốc';return new Date(value.length===10?value+'T00:00:00':value).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'}); };
const today = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
function sampleState(){
  const stamp=now();
  const P=(title,category,model,tags,description,tasks)=>({id:uid(),kind:'project',title,description,category,status:'done',progress:100,tags,due:'',demo:true,created:stamp,updated:stamp,tasks:tasks.map(text=>({id:uid(),text,done:true})),model,blocks:'',image:'',sim:null});
  return {version:1,settings:{labName:'MY LAB',owner:'Nhà nghiên cứu',motion:!reduceMotion,headline:'Không gian nghiên cứu vi mạch và bán dẫn',bio:'',skills:'',email:'',github:''},
    items:[P('Bộ đếm 8 bit đồng bộ','RTL số học','alu','Verilog, Counter','Dự án mẫu: bộ đếm lên/xuống có reset và enable, kèm testbench tự kiểm.',['Viết RTL','Viết testbench','Mô phỏng']),
      P('Bộ nhớ FIFO hai cổng','RTL số học','memory','Verilog, FIFO','Dự án mẫu: FIFO đồng bộ với cờ đầy/rỗng.',['Thiết kế','Kiểm chứng'])],
    notes:[],resources:[]};
}
function validCode(v){if(v==null)return [];if(!Array.isArray(v)||v.length>12)throw new Error('Mã nguồn đính kèm không hợp lệ.');return v.map(f=>{if(!f||typeof f.name!=='string'||typeof f.text!=='string'||f.text.length>200000||f.name.length>120)throw new Error('Tệp mã nguồn không hợp lệ.');const url=f.url?safeUrl(String(f.url).slice(0,500)):'';return {name:f.name,desc:typeof f.desc==='string'?f.desc.slice(0,200):'',lines:Number.isFinite(f.lines)?f.lines:0,url:url||'',text:f.text};});}
function validImage(v){if(v==null||v==='')return '';if(typeof v!=='string')throw new Error('Ảnh dự án không hợp lệ.');if(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v)&&v.length<=600000)return v;if(/^storage:[\w\-/.]{1,300}$/.test(v))return v;throw new Error('Ảnh dự án không hợp lệ.');}
function validSim(v){if(v==null)return null;if(typeof v!=='object'||!Object.hasOwn(SIM_MODELS,v.model))throw new Error('Thông số mô phỏng không hợp lệ.');const n=(x,a,b)=>{x=Number(x);if(!Number.isFinite(x)||x<a||x>b)throw new Error('Thông số mô phỏng không hợp lệ.');return x;};return {model:v.model,wave:['sine','square','triangle','saw'].includes(v.wave)?v.wave:'sine',amp:n(v.amp,0,5),freq:n(v.freq,0,50),phase:n(v.phase,0,360),param:n(v.param??0,0,255)};}
function safeDocUrl(v){const u=safeUrl(v);if(u)return u;return /^\.\/docs\/[A-Za-z0-9_.-]+\.(docx|pdf)$/.test(String(v))?String(v):null;}
function safeUrl(value){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)?u.href:null;}catch{return null;}}
function validateState(data){
  if(!data||data.version!==1||!data.settings||!Array.isArray(data.items)||!Array.isArray(data.notes)||!Array.isArray(data.resources))throw new Error('Bản sao không đúng định dạng MY LAB v1.');
  const text=(v,max,required=false)=>{if(typeof v!=='string'||v.length>max||(required&&!v.trim()))throw new Error('Dữ liệu chứa trường văn bản không hợp lệ.');return v;};
  const seen=new Set();const id=v=>{text(v,100,true);if(seen.has(v))throw new Error('Dữ liệu có mã mục trùng lặp.');seen.add(v);return v;};
  const stamp=v=>{text(v,40,true);if(!Number.isFinite(Date.parse(v)))throw new Error('Ngày lưu không hợp lệ.');return v;};
  const base=v=>({id:id(v.id),demo:v.demo===true,created:stamp(v.created),updated:stamp(v.updated)});
  if(data.items.length>2000||data.notes.length>2000||data.resources.length>2000)throw new Error('Bản sao quá nhiều mục (tối đa 2.000 mục mỗi loại).');
  return {version:1,settings:{labName:text(data.settings.labName,24,true),owner:text(data.settings.owner,40,true),motion:data.settings.motion===true,headline:text(data.settings.headline??'',140),seeds:text(data.settings.seeds??'',200),bio:text(data.settings.bio??'',600),skills:text(data.settings.skills??'',400),email:text(data.settings.email??'',120),github:(()=>{const g=text(data.settings.github??'',200);return g&&!safeUrl(g)?'':g;})()},items:data.items.map(v=>{
    if(!['project','research'].includes(v.kind)||!Object.hasOwn(STATUS,v.status)||typeof v.progress!=='number'||v.progress<0||v.progress>100||!Number.isFinite(v.progress)||!Array.isArray(v.tasks)||v.tasks.length>500)throw new Error('Dự án hoặc checklist không hợp lệ.');
    text(v.due,10);if(v.due&&(!/^\d{4}-\d{2}-\d{2}$/.test(v.due)||!Number.isFinite(Date.parse(v.due))))throw new Error('Mốc thời gian không hợp lệ.');
    return {...base(v),kind:v.kind,title:text(v.title,120,true),description:text(v.description,6000),category:text(v.category,50,true),status:v.status,progress:Math.round(v.progress),tags:text(v.tags,250),due:v.due,tasks:v.tasks.map(t=>({id:id(t.id),text:text(t.text,250,true),done:t.done===true})),metrics:Array.isArray(v.metrics)?v.metrics.slice(0,6).map(m=>text(m,100)).filter(Boolean):[],model:Object.hasOwn(MODEL_TYPES,v.model)?v.model:'',blocks:text(v.blocks??'',3000),image:validImage(v.image),sim:validSim(v.sim),codeFiles:validCode(v.codeFiles)};
  }),notes:data.notes.map(v=>({...base(v),title:text(v.title,120,true),body:text(v.body,30000),type:Object.hasOwn(NOTE_TYPES,v.type)?v.type:'note',project:typeof v.project==='string'?text(v.project,100):''})),resources:data.resources.map(v=>{
    const file=v.file?{path:text(v.file.path,400,true),name:text(v.file.name,200,true),size:Number(v.file.size)||0,type:text(v.file.type||'',100)}:null;
    if(file&&!/^[\w-]+\/[\w\-.]+$/.test(file.path))throw new Error('Tệp tài liệu không hợp lệ.');
    const url=v.url?safeDocUrl(text(v.url,2048)):'';if(url===null||(!url&&!file))throw new Error('Tài liệu chứa liên kết không hợp lệ.');return {...base(v),title:text(v.title,120,true),url,file,project:typeof v.project==='string'?text(v.project,100):'',authors:text(v.authors??'',300),year:text(String(v.year??''),4),venue:text(v.venue??'',200),category:text(v.category,50,true),description:text(v.description,2000)};
  })};
}
let state,loadWarning='',cloudUser=null,cloudBlocked=false;
if(GUEST){document.body.classList.add('guest-mode');state=sampleState();state.settings.motion=!reduceMotion;}
else if(cloud.cloudEnabled){
  document.body.classList.add('cloud-mode');
  try{const session=await cloud.startCloud();cloudUser=session.user;if(session.note)setTimeout(()=>toast(session.note),400);
    const remote=await cloud.loadRemoteState();
    if(remote){try{state=validateState(remote);}catch(err){cloudBlocked=true;state={version:1,settings:{labName:'MY LAB',owner:'Nhà nghiên cứu',motion:!reduceMotion},items:[],notes:[],resources:[]};loadWarning='Dữ liệu trên cloud không đọc được ('+err.message+'). Lab mở ở chế độ chỉ xem để không ghi đè bản cũ.';}}
    else{state=sampleState();cloud.queueSave(state,onCloudConflict);}
  }catch(err){cloudBlocked=true;state={version:1,settings:{labName:'MY LAB',owner:'Nhà nghiên cứu',motion:!reduceMotion},items:[],notes:[],resources:[]};loadWarning='Không tải được dữ liệu từ cloud: '+err.message+' Tải lại trang để thử lại.';}
  if(cloud.consumeLockNotice())loadWarning=loadWarning||'';
}
else try{const stored=localStorage.getItem(STORE);state=stored?validateState(JSON.parse(stored)):sampleState();
  // Bản cũ chỉ có dự án mẫu: thay bằng 6 dự án thật, giữ ghi chú / tài liệu / cài đặt do người dùng tự tạo.
  if(stored&&state.items.length&&state.items.every(i=>i.demo)){const fresh=sampleState();state={...state,items:fresh.items,notes:state.notes.filter(n=>!n.demo),resources:[...fresh.resources.filter(r=>!state.resources.some(x=>x.url===r.url)),...state.resources.filter(r=>!r.demo)]};if(state.settings.owner==='Nhà nghiên cứu')state.settings.owner='Thân Đức Việt';}
  if(!stored||state.items.some(i=>!i.demo&&i.tasks))localStorage.setItem(STORE,JSON.stringify(state));}
catch{state={version:1,settings:{labName:'MY LAB',owner:'Nhà nghiên cứu',motion:!reduceMotion},items:[],notes:[],resources:[]};loadWarning='Không đọc được dữ liệu đã lưu. Lab mở ở chế độ trống; bản cũ chưa bị ghi đè. Hãy nhập bản sao JSON nếu có.';}
let catFilter='all',page='home',filter='all',localQuery='',searchQuery='',editorContext=null,detailId=null,chipScene=null;
let mathStudio=null,mathLoading=null,eqPlotter=null;
let ambienceEnabled=!reduceMotion;
try{ambienceEnabled=!reduceMotion&&localStorage.getItem('lab-tdv:ambient')!=='off';}catch{}
function ensureMathStudio(){
  if(mathLoading)return;
  import('./equation-plotter.js').then(({createEquationPlotter})=>{eqPlotter=createEquationPlotter({root:$('#eq-plotter'),reducedMotion:reduceMotion});eqPlotter.setVisible(page==='mathematics');}).catch(err=>{$('#eq-plotter').innerHTML='<p class="info-note">Không tải được trình vẽ phương trình.</p>';console.warn(err);});
  mathLoading=import('./math-studio.js').then(({createMathStudio})=>{mathStudio=createMathStudio({canvas:$('#math-canvas'),reducedMotion:reduceMotion});mathStudio.setVisible(page==='mathematics');}).catch(err=>{$('#math-fallback').hidden=false;$('#math-canvas').hidden=true;$('.math-parameters').inert=true;$('#math-play').disabled=true;$('#math-reset').disabled=true;console.warn('Math 3D unavailable:',err.message);});
}
let toastTimer;
function toast(message,error=false){const el=$('#toast');el.textContent=message;el.classList.toggle('error',error);el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),error?7000:3300);}
async function onCloudConflict(){toast('Dữ liệu vừa được thay đổi ở thiết bị khác. Đang tải bản mới nhất…',true);try{const remote=await cloud.loadRemoteState();if(remote){state=validateState(remote);render();toast('Đã tải bản mới nhất. Hãy thực hiện lại thay đổi vừa rồi.');}}catch(err){toast(err.message,true);}}
function commit(mutation){if(cloudBlocked){toast('Lab đang ở chế độ chỉ xem vì chưa tải được dữ liệu cloud. Tải lại trang.',true);return false;}const previous=structuredClone(state);try{mutation();if(GUEST){}else if(cloud.cloudEnabled)cloud.queueSave(state,onCloudConflict);else localStorage.setItem(STORE,JSON.stringify(state));renderMeta();return true;}catch{state=previous;toast('Chưa lưu được. Bộ nhớ trình duyệt có thể đầy hoặc bị chặn. Hãy xuất bản sao dữ liệu.',true);return false;}}
const projects=()=>state.items.filter(i=>i.kind==='project');
const research=()=>state.items.filter(i=>i.kind==='research');
const badge = item => `<span class="tag ${item.status==='done'?'done':item.status==='idea'?'violet':item.status==='testing'?'amber':''}">${esc(STATUS[item.status])}</span>`;
const progress = value => `<div class="progress-line" role="progressbar" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="100" aria-label="Tiến độ"><span style="width:${value}%"></span></div>`;
const demoBanner=()=>[...state.items,...state.notes,...state.resources].some(i=>i.demo)?`<div class="demo-banner">${icon('info')}<span>Các mục có nhãn “Mẫu” giúp bạn khám phá lab. Thay bằng công việc của mình khi sẵn sàng.</span><a href="#settings">Quản lý dữ liệu</a></div>`:'';
function empty(title,description,action=''){return `<div class="empty-state"><span>${icon('spark')}</span><h3>${esc(title)}</h3><p>${esc(description)}</p>${action}</div>`;}
function pageHeading(eyebrow,title,description,button=''){return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div>${button}</div>`;}
const addButton=(kind,label)=>`<button class="btn primary" data-action="add" data-kind="${kind}">${icon('plus')}${label}</button>`;
function renderMeta(){
  $('#brand-name').textContent=state.settings.labName;$('#profile-name').textContent=state.settings.owner;$('#avatar').textContent=state.settings.owner.trim().slice(0,1).toUpperCase();$('#project-count').textContent=projects().length;
  $$('.welcome-lab-name').forEach(el=>el.textContent=state.settings.labName);
  $('#home-project-stat').textContent=`${projects().length} dự án · ${projects().filter(p=>p.status!=='done').length} đang mở`;
  $('#home-research-stat').textContent=`${research().length} đề tài nghiên cứu`;
  $('#home-library-stat').textContent=`${state.resources.length} tài liệu · ${state.notes.length} ghi chú`;
  $('#home-date').textContent=new Date().toLocaleDateString('vi-VN',{weekday:'long',day:'numeric',month:'long'});
  document.title=`${state.settings.labName} — ${PAGES[page]}`;
}
function projectArt(category){
  if(/analog|cmos|power/i.test(category))return `<svg viewBox="0 0 320 145" aria-hidden="true"><defs><pattern id="wavegrid" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0H0V16" fill="none" stroke="#2c6776" stroke-opacity=".3"/></pattern></defs><rect width="320" height="145" fill="url(#wavegrid)"/><path d="M0 75H30C45 75 45 28 60 28s15 94 30 94 15-94 30-94 15 94 30 94 15-94 30-94 15 94 30 94 15-94 30-94 15 47 30 47h50" fill="none" stroke="#66e6da" stroke-width="2"/><path d="M0 85H30C45 85 45 58 60 58s15 54 30 54 15-54 30-54 15 54 30 54 15-54 30-54 15 54 30 54 15-54 30-54 15 27 30 27h50" fill="none" stroke="#618fca" stroke-width="1" opacity=".5"/></svg>`;
  const blocks=Array.from({length:26},(_,i)=>{const x=91+(i%6)*23,y=30+Math.floor(i/6)*19;return `<rect x="${x}" y="${y}" width="${9+(i%3)*5}" height="${8+(i%2)*6}" fill="${['#365f61','#719f98','#9d8c6b','#526b89','#426b72'][i%5]}" opacity="${.4+(i%4)*.15}"/>`;}).join('');
  const lines=Array.from({length:8},(_,i)=>`<path d="M${95+i*19} 12v12m0 95v14M65 ${30+i*12}h17m153 0h20"/>`).join('');
  return `<svg viewBox="0 0 320 145" aria-hidden="true"><g fill="none" stroke="#456b70" stroke-width="1">${lines}<path d="M0 40h42l26 25h13M320 103h-40l-27-25h-18M0 119h52l17-18h12M320 25h-42l-25 25h-18"/><rect x="81" y="23" width="154" height="96" rx="5" stroke="#6caca8"/><rect x="87" y="28" width="142" height="86" stroke="#365967"/></g>${blocks}<rect x="139" y="51" width="48" height="43" rx="2" fill="#122a35" stroke="#6ce9d9"/><path d="M149 65h28m-28 7h20m-20 7h28" stroke="#6ce9d9" opacity=".7"/><circle cx="41" cy="40" r="3" fill="#6ce9d9"/><circle cx="279" cy="103" r="3" fill="#6ce9d9"/></svg>`;
}
function coverHTML(item){const src=imageSrc(item.image);return src?`<img src="${esc(src)}" alt="" loading="lazy">`:coverArt(guessModel(item),item.id);}
const imageCache=new Map();
function imageSrc(v){if(!v)return '';if(v.startsWith('data:image/'))return v;if(v.startsWith('storage:'))return imageCache.get(v)||'';return '';}
function itemCard(item){const tags=item.tags.split(',').map(s=>s.trim()).filter(Boolean).slice(0,2);return `<article class="project-card st-${item.status}"><button class="project-visual" data-action="detail" data-id="${esc(item.id)}" aria-label="Mở ${esc(item.title)}">${coverHTML(item)}<span class="visual-category">${esc(item.category.toUpperCase())}</span><span class="status-pill st-${item.status}">${item.status==='done'?'✓ ':''}${esc(STATUS[item.status])}</span><span class="visual-model">${esc(MODEL_TYPES[guessModel(item)].short)} · 3D · Sơ đồ khối</span></button><div class="project-card-body"><div class="card-title-row"><button class="card-title" data-action="detail" data-id="${esc(item.id)}">${esc(item.title)}</button><button class="icon-btn" data-action="edit" data-kind="${item.kind}" data-id="${esc(item.id)}" aria-label="Sửa ${esc(item.title)}">${icon('edit')}</button></div><p>${esc(item.description)||'Chưa có mô tả. Ghi lại ý tưởng đầu tiên cho dự án này.'}</p><div class="card-tags">${badge(item)}${tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}${item.demo?'<span class="tag">Mẫu</span>':''}</div><div class="progress-meta"><span>Tiến độ</span><span>${item.progress}%</span></div>${progress(item.progress)}<div class="card-bottom"><span>${icon('check')}${item.tasks.filter(t=>t.done).length}/${item.tasks.length} công việc</span><span>${icon('calendar')}${dateFormat(item.due)}</span></div></div></article>`;}
function taskRow(item,task,detail=false){return `<div class="task-row ${task.done?'completed':''}"><input type="checkbox" ${task.done?'checked':''} data-action="toggle-task" data-id="${esc(item.id)}" data-task="${esc(task.id)}" aria-label="${esc(task.text)}"><span>${esc(task.text)}${detail?'':`<small>${esc(item.title)}</small>`}</span>${detail?`<button class="icon-btn task-delete" data-action="delete-task" data-id="${esc(item.id)}" data-task="${esc(task.id)}" aria-label="Xóa công việc ${esc(task.text)}">${icon('close')}</button>`:''}</div>`;}
function renderOverview(){
  const active=state.items.filter(i=>i.status!=='done');const tasks=state.items.filter(i=>i.status==='active'||i.status==='testing').flatMap(item=>item.tasks.filter(t=>!t.done).map(task=>({item,task}))).slice(0,5);
  const list=state.items.slice().sort((x,y)=>(x.status==='done')-(y.status==='done')||y.updated.localeCompare(x.updated)).slice(0,6);const cats=Object.entries(state.items.reduce((m,i)=>(m[i.category]=(m[i.category]||0)+1,m),{})).sort((a,b)=>b[1]-a[1]);const maxCat=Math.max(1,...cats.map(c=>c[1]));
  $('#page-overview').innerHTML=pageHeading('YOUR RESEARCH SPACE',`Chào ${esc(state.settings.owner)}.`,`Hôm nay, mình tiến thêm một bước nhé.`,addButton('project','Dự án mới'))+demoBanner()+`<div class="stats-grid">${[[projects().length,'Dự án cá nhân','folder',`${projects().filter(i=>i.status==='active'||i.status==='testing').length} đang làm · ${projects().filter(i=>i.status==='idea').length} chờ thực hiện`],[research().length,'Đề tài NCKH','flask','Theo đuổi những câu hỏi mới'],[state.items.filter(i=>i.status==='done').length,'Đã hoàn thành','check','Từng cột mốc đều đáng nhớ'],[state.resources.length,'Tài liệu đã lưu','book',`${state.notes.length} ghi chú trong sổ tay`]].map(([num,title,ic,sub])=>`<div class="stat"><div class="stat-top">${title}${icon(ic)}</div><strong class="stat-number">${num.toString().padStart(2,'0')}</strong><small>${sub}</small></div>`).join('')}</div>${benchHTML()}<div class="overview-layout"><div class="panel"><div class="panel-heading"><h2>${icon('folder')}Dự án và đề tài gần đây</h2><a href="#projects" class="text-link">Xem dự án</a></div>${list.length?list.map(i=>`<div class="project-list-row"><button class="row-thumb" data-action="detail" data-id="${esc(i.id)}" aria-label="Mở ${esc(i.title)}">${coverHTML(i)}</button><div class="row-main"><button class="card-title" data-action="detail" data-id="${esc(i.id)}">${esc(i.title)}</button><p>${esc(i.category)} · ${esc(STATUS[i.status])}</p></div><div class="row-progress"><small>${i.progress}%</small>${progress(i.progress)}</div></div>`).join(''):empty('Bàn làm việc đang trống','Tạo một dự án mới để bắt đầu.',addButton('project','Thêm dự án'))}</div><div class="overview-side"><div class="panel"><div class="panel-heading"><h2>${icon('check')}Việc tiếp theo</h2><span class="tag">${tasks.length} việc</span></div><div class="mini-tasks">${tasks.length?tasks.map(({item,task})=>taskRow(item,task)).join(''):'<p class="info-note">Chưa có công việc đang chờ. Thêm checklist trong từng dự án hoặc đề tài.</p>'}</div></div><div class="panel"><div class="panel-heading"><h2>${icon('layers')}Phân bố lĩnh vực</h2></div><div class="cat-bars">${cats.map(([c,n])=>`<div class="cat-bar"><span>${esc(c)}</span><i><b style="width:${Math.round(n/maxCat*100)}%"></b></i><em>${n}</em></div>`).join('')||'<p class="info-note">Chưa có dự án.</p>'}</div></div></div></div>`;
}
function renderItems(){const kind=page==='research'?'research':'project';const isResearch=kind==='research';
  $('#page-'+page).innerHTML=pageHeading(isResearch?'RESEARCH & DISCOVERY':'BUILD SOMETHING NEW',isResearch?'Những câu hỏi đáng theo đuổi.':'Từng ý tưởng. Từng thiết kế.',isResearch?'Tập hợp đề tài, tài liệu nền tảng và từng bước thực nghiệm.':'Theo dõi thiết kế vi mạch, thử nghiệm và tiến độ của mình.',addButton(kind,isResearch?'Đề tài mới':'Dự án mới'))+demoBanner()+`<div class="filters"><div class="filter-tabs" aria-label="Lọc trạng thái">${[['all','Tất cả'],['active','Đang làm'],['idea','Chờ thực hiện'],['testing','Thử nghiệm'],['done','Hoàn thành']].map(([key,label])=>`<button data-action="filter" data-filter="${key}" class="${filter===key?'active':''}" aria-pressed="${filter===key}">${label}</button>`).join('')}</div><div class="inline-search"><span>${icon('search')}</span><input id="list-search" placeholder="Tìm ${isResearch?'đề tài':'dự án'}..." aria-label="Tìm trong danh sách" value="${esc(localQuery)}"></div></div><div class="cat-chips" id="cat-chips"></div><div class="cards-grid" id="items-grid"></div>`;
  renderItemGrid();
}
function renderItemGrid(){const kind=page==='research'?'research':'project';const q=localQuery.toLocaleLowerCase('vi');
  const cats=[...new Set(state.items.filter(i=>i.kind===kind).map(i=>i.category))].sort((a,b)=>a.localeCompare(b,'vi'));if(catFilter!=='all'&&!cats.includes(catFilter))catFilter='all';
  const chips=$('#cat-chips');if(chips)chips.innerHTML=cats.length>1?`<span class="cat-label">Phân loại</span>`+[['all','Tất cả lĩnh vực'],...cats.map(c=>[c,c])].map(([k,l])=>`<button data-action="cat" data-cat="${esc(k)}" class="${catFilter===k?'active':''}" aria-pressed="${catFilter===k}">${esc(l)}<small>${k==='all'?state.items.filter(i=>i.kind===kind).length:state.items.filter(i=>i.kind===kind&&i.category===k).length}</small></button>`).join(''):'';
  const ORD={active:0,testing:0,done:1,idea:2};const list=state.items.filter(i=>i.kind===kind&&(filter==='all'||i.status===filter)&&(catFilter==='all'||i.category===catFilter)&&`${i.title} ${i.description} ${i.tags} ${i.category}`.toLocaleLowerCase('vi').includes(q)).sort((a,b)=>ORD[a.status]-ORD[b.status]);$('#items-grid').innerHTML=list.length?list.map(itemCard).join(''):empty('Chỗ cho một ý tưởng mới',localQuery||filter!=='all'?'Không có mục phù hợp. Thử thay từ khóa hoặc bộ lọc.':'Tạo mục đầu tiên và bắt đầu ghi lại hành trình của mình.',addButton(kind,kind==='research'?'Thêm đề tài':'Thêm dự án'));}
let noteFilter='all';
function renderNotes(){
  const list=state.notes.filter(n=>noteFilter==='all'||n.type===noteFilter).sort((a,b)=>b.updated.localeCompare(a.updated));
  $('#page-notes').innerHTML=pageHeading('NOTES & LAB JOURNAL','Giữ lại một suy nghĩ hay.','Nhật ký thí nghiệm, ý tưởng, ghi chép họp và những điều vừa học được.',addButton('note','Ghi chú mới'))+`<div class="cat-chips">${[['all','Tất cả'],...Object.entries(NOTE_TYPES)].map(([k,l])=>`<button data-action="note-filter" data-type="${k}" class="${noteFilter===k?'active':''}" aria-pressed="${noteFilter===k}">${esc(l)}<small>${k==='all'?state.notes.length:state.notes.filter(n=>n.type===k).length}</small></button>`).join('')}</div><div class="cards-grid">${list.length?list.map(n=>{const proj=state.items.find(i=>i.id===n.project);return `<article class="note-card note-${esc(n.type)}"><div class="note-meta">${icon(n.type==='journal'?'flask':n.type==='idea'?'spark':n.type==='meeting'?'calendar':'notebook')}<span>${esc(NOTE_TYPES[n.type])} · ${dateFormat(n.updated)}${n.demo?' · Mẫu':''}</span></div><h3>${esc(n.title)}</h3>${proj?`<button class="note-project" data-action="detail" data-id="${esc(proj.id)}">${icon('folder')}${esc(proj.title)}</button>`:''}<p>${esc(n.body)||'Chưa có nội dung.'}</p><div class="note-actions"><button class="btn small" data-action="edit" data-kind="note" data-id="${esc(n.id)}">${icon('edit')}Mở ghi chú</button><button class="icon-btn" data-action="delete" data-kind="note" data-id="${esc(n.id)}" aria-label="Xóa ${esc(n.title)}">${icon('trash')}</button></div></article>`;}).join(''):empty(noteFilter==='all'?'Sổ tay còn để ngỏ':'Chưa có mục nào loại này','Viết một ý tưởng, một nhật ký thí nghiệm hoặc một điều vừa khám phá.',addButton('note','Viết ghi chú'))}</div>`;
}
let libQuery='',libCat='all',libProject='all',libType='all';
const fileSize=n=>n>1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
function citation(r){const authors=r.authors?.trim();const parts=[authors,`“${r.title},”`,r.venue?.trim()?`<i>${esc(r.venue)}</i>`:'',r.year].filter(Boolean);return parts.map(p=>p.startsWith('<i>')?p:esc(p)).join(', ')+'.';}
function citationText(r){return [r.authors?.trim(),`“${r.title},”`,r.venue?.trim(),r.year].filter(Boolean).join(', ')+'.';}
function renderLibrary(){
  const cats=[...new Set([...state.resources.map(r=>r.category)])].sort((a,b)=>a.localeCompare(b,'vi'));
  $('#page-library').innerHTML=pageHeading('YOUR KNOWLEDGE BASE','Thư viện tài liệu.','Bài báo, datasheet, giáo trình, báo cáo và mã nguồn. Tải tệp lên hoặc lưu liên kết, gắn với từng dự án.',addButton('resource','Thêm tài liệu'))+
  `<div class="library-tools"><div class="inline-search"><span>${icon('search')}</span><input id="lib-search" placeholder="Tìm theo tên, tác giả, mô tả..." aria-label="Tìm tài liệu" value="${esc(libQuery)}"></div><select id="lib-cat" aria-label="Lọc phân loại"><option value="all">Mọi phân loại</option>${cats.map(c=>`<option ${libCat===c?'selected':''}>${esc(c)}</option>`).join('')}</select><select id="lib-project" aria-label="Lọc theo dự án"><option value="all">Mọi dự án</option><option value="" ${libProject===''?'selected':''}>Chưa gắn dự án</option>${state.items.map(i=>`<option value="${esc(i.id)}" ${libProject===i.id?'selected':''}>${esc(i.title)}</option>`).join('')}</select><select id="lib-type" aria-label="Lọc loại"><option value="all">Tệp & liên kết</option><option value="file" ${libType==='file'?'selected':''}>Chỉ tệp tải lên</option><option value="link" ${libType==='link'?'selected':''}>Chỉ liên kết</option></select></div><div class="library-grid" id="library-grid"></div>`;
  renderLibraryGrid();
}
function renderLibraryGrid(){
  const q=libQuery.toLocaleLowerCase('vi');
  const list=state.resources.filter(r=>(libCat==='all'||r.category===libCat)&&(libProject==='all'||r.project===libProject)&&(libType==='all'||(libType==='file')===Boolean(r.file))&&`${r.title} ${r.description} ${r.authors} ${r.venue} ${r.url} ${r.file?.name||''}`.toLocaleLowerCase('vi').includes(q)).sort((a,b)=>b.updated.localeCompare(a.updated));
  $('#library-grid').innerHTML=list.length?list.map(r=>{const proj=state.items.find(i=>i.id===r.project);const ext=(r.file?.name.split('.').pop()||'').slice(0,5).toUpperCase();return `<article class="resource-card"><span class="resource-icon">${r.file?`<b class="file-ext">${esc(ext||'FILE')}</b>`:icon('book')}</span><div class="resource-main"><h3>${esc(r.title)}</h3><span class="tag">${esc(r.category)}</span>${r.year?` <span class="tag">${esc(r.year)}</span>`:''}${r.demo?' <span class="tag">Mẫu</span>':''}${r.authors||r.venue?`<p class="resource-cite">${citation(r)}</p>`:''}<p>${esc(r.description)}</p>${r.file?`<span class="resource-file">${icon('file')}${esc(r.file.name)} · ${fileSize(r.file.size)}</span>`:''}${r.url?`<span class="resource-url">${esc(r.url)}</span>`:''}${proj?`<button class="resource-project" data-action="detail" data-id="${esc(proj.id)}">${icon('folder')}${esc(proj.title)}</button>`:''}<div class="resource-actions"><button class="btn small" data-action="open-resource" data-id="${esc(r.id)}">${r.file?'Xem tệp':'Mở liên kết'}${icon('external')}</button>${r.file?`<button class="btn small" data-action="download-resource" data-id="${esc(r.id)}">${icon('download')}Tải về</button>`:''}${r.authors||r.venue||r.year?`<button class="btn small" data-action="cite" data-id="${esc(r.id)}">Chép trích dẫn</button>`:''}<button class="btn small" data-action="edit" data-kind="resource" data-id="${esc(r.id)}">Sửa</button><button class="icon-btn" data-action="delete" data-kind="resource" data-id="${esc(r.id)}" aria-label="Xóa ${esc(r.title)}">${icon('trash')}</button></div></div></article>`;}).join(''):empty(state.resources.length?'Không có tài liệu phù hợp':'Xây kho tri thức của mình',state.resources.length?'Thử đổi từ khóa hoặc bộ lọc.':'Tải lên bài báo, datasheet, báo cáo hoặc lưu liên kết.',addButton('resource','Thêm tài liệu'));
}
async function openResource(id,download=false){const r=state.resources.find(x=>x.id===id);if(!r)return;
  if(r.file){const win=download?null:window.open('about:blank','_blank');try{const url=await files.fileUrl(r.file.path,download);if(download){const a=document.createElement('a');a.href=url;a.download=r.file.name;a.rel='noopener';document.body.append(a);a.click();a.remove();}else if(win){win.opener=null;win.location.href=url;}else location.href=url;}catch(err){win?.close();toast('Không mở được tệp: '+err.message,true);}return;}
  const url=safeDocUrl(r.url);if(url){const w=window.open(url.startsWith('./')?new URL(url,location.href).href:url,'_blank','noopener,noreferrer');if(w)w.opener=null;}}
function renderSearch(){const q=searchQuery.toLocaleLowerCase('vi');const groups=[['Dự án & NCKH',state.items.filter(i=>`${i.title} ${i.description} ${i.tags}`.toLocaleLowerCase('vi').includes(q)),'item'],['Ghi chú',state.notes.filter(i=>`${i.title} ${i.body}`.toLocaleLowerCase('vi').includes(q)),'note'],['Tài liệu',state.resources.filter(i=>`${i.title} ${i.description} ${i.url}`.toLocaleLowerCase('vi').includes(q)),'resource']];const count=groups.reduce((n,g)=>n+g[1].length,0);
  $('#page-search').innerHTML=pageHeading('SEARCH YOUR SPACE','Tìm trong phòng lab.',`${count} kết quả cho “${esc(searchQuery)}”.`,`<button class="btn" data-action="search">${icon('search')}Tìm lại</button>`)+`<div class="search-groups">${count?groups.filter(g=>g[1].length).map(([title,list,kind])=>`<div class="search-group"><h2>${title}</h2>${list.map(i=>`<button class="search-result" data-action="${kind==='item'?'detail':'edit'}" data-kind="${kind}" data-id="${esc(i.id)}"><span>${icon(kind==='item'?'chip':kind==='note'?'notebook':'book')}</span><span><strong>${esc(i.title)}</strong><p>${esc((i.description||i.body||i.url||'').slice(0,150))}</p></span></button>`).join('')}</div>`).join(''):empty('Chưa tìm thấy điều bạn cần','Thử một từ khóa khác trong lab.')}</div>`;
}
function render(){renderMeta();if(page==='overview')renderOverview();else if(['projects','research'].includes(page))renderItems();else if(page==='notes')renderNotes();else if(page==='library')renderLibrary();else if(page==='search')renderSearch();else if(page==='portfolio')renderPortfolio();else if(page==='team')renderTeam();else if(page==='settings'){ $('#lab-name').value=state.settings.labName;$('#owner-name').value=state.settings.owner;$('#default-motion').checked=state.settings.motion;for(const k of ['headline','bio','skills','email','github'])$('#profile-'+k).value=state.settings[k]||'';}}
function route(){let next=location.hash.slice(1)||'welcome';if(!Object.hasOwn(PAGES,next))next='welcome';if(next!==page){filter='all';localQuery='';catFilter='all';}$$('dialog[open]').forEach(d=>{if(d.id!=='confirm-dialog')d.close();});page=next;const welcome=page==='welcome';document.body.classList.toggle('welcome-mode',welcome);$('#welcome-page').hidden=!welcome;$('.shell').hidden=welcome;$('#sidebar').hidden=welcome;const sceneWrap=$('#scene-wrap');(welcome?$('#welcome-scene-host'):$('#page-home .home-hero')).append(sceneWrap);$$('.page').forEach(el=>el.hidden=el.id!=='page-'+page);$$('[data-page]').forEach(el=>{const active=el.dataset.page===page;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});$('#breadcrumb-page').textContent=PAGES[page];render();chipScene?.setPresentation(welcome);chipScene?.setVisible(page==='home'||welcome);mathStudio?.setVisible(page==='mathematics');algoPlayer?.setVisible(page==='simulation'&&simTab==='algo');if(page==='mathematics')ensureMathStudio();if(page==='simulation'){if(simProject)loadSimProject(simProject);else renderSimProjects();}eqPlotter?.setVisible(page==='mathematics');closeMenu();window.scrollTo({top:0,behavior:'instant'});}
window.addEventListener('hashchange',route);
function closeMenu(){$('#sidebar').classList.remove('open');$('#scrim').classList.remove('open');$('#menu-button').setAttribute('aria-expanded','false');}
$('#menu-button').addEventListener('click',()=>{const open=$('#sidebar').classList.toggle('open');$('#scrim').classList.toggle('open',open);$('#menu-button').setAttribute('aria-expanded',String(open));});
$('#scrim').addEventListener('click',closeMenu);
$('.skip-link').addEventListener('click',event=>{event.preventDefault();const main=page==='welcome'?$('#welcome-page main'):$('#main');main.setAttribute('tabindex','-1');main.focus();});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(!$$('dialog[open]').length)openSearch();}if(e.key==='Escape')closeMenu();});
function collection(kind){return kind==='note'?state.notes:kind==='resource'?state.resources:state.items;}
function openEditor(kind,id=null){
  if(!['project','research','note','resource'].includes(kind))return;
  const entry=id?collection(kind).find(i=>i.id===id):null;if(id&&!entry)return;
  editorContext={kind,id};$('#detail-dialog').close();
  const titles={project:'dự án',research:'đề tài nghiên cứu',note:'ghi chú',resource:'tài liệu'};$('#editor-title').textContent=(id?'Chỉnh sửa ':'Thêm ')+titles[kind];
  let fields=`<label for="entry-title">${kind==='resource'?'Tên tài liệu':'Tiêu đề'} *</label><input id="entry-title" name="title" maxlength="120" required value="${esc(entry?.title||'')}" placeholder="${kind==='project'?'Ví dụ: Thiết kế ALU 32-bit':kind==='research'?'Câu hỏi nghiên cứu của mình':kind==='note'?'Điều mình muốn ghi lại':'Tên bài báo, datasheet, công cụ...'}">`;
  const projectSelect=(sel)=>`<select id="entry-project" name="project"><option value="">— Không gắn dự án —</option>${state.items.map(i=>`<option value="${esc(i.id)}" ${sel===i.id?'selected':''}>${esc(i.title)}</option>`).join('')}</select>`;
  if(kind==='note')fields+=`<div class="form-row"><div><label for="entry-type">Loại ghi chép</label><select id="entry-type" name="type">${Object.entries(NOTE_TYPES).map(([k,l])=>`<option value="${k}" ${(entry?.type||'note')===k?'selected':''}>${l}</option>`).join('')}</select></div><div><label for="entry-project">Gắn với dự án</label>${projectSelect(entry?.project||'')}</div></div>`;
  if(kind==='note')fields+=`<label for="entry-body">Nội dung <small>với nhật ký thí nghiệm: mục tiêu, cấu hình, kết quả, nhận xét</small></label><textarea id="entry-body" name="body" rows="12" maxlength="30000" placeholder="Ý tưởng, câu hỏi, ghi chép từ một lần thử nghiệm...">${esc(entry?.body||'')}</textarea>`;
  else if(kind==='resource'){editorFile=entry?.file||null;fields+=`<label>Tệp tài liệu <small>PDF, Word, slide, ảnh, mã nguồn… tối đa 50 MB</small></label><div class="drop-zone" id="drop-zone"><span id="drop-label">${entry?.file?`Đang có: <b>${esc(entry.file.name)}</b> (${fileSize(entry.file.size)}). Kéo tệp mới vào đây hoặc`:'Kéo thả tệp vào đây hoặc'}</span> <label class="btn small" for="entry-file" style="margin:0;display:inline-flex">Chọn tệp</label><input id="entry-file" type="file" hidden><div class="upload-progress" hidden><span></span></div></div>
  <label for="entry-url">Liên kết (http / https) <small>không bắt buộc nếu đã có tệp</small></label><input id="entry-url" name="url" type="text" inputmode="url" maxlength="2048" placeholder="https://..." value="${esc(entry?.url||'')}">
  <div class="form-row"><div><label for="entry-category">Phân loại *</label><input id="entry-category" name="category" list="resource-cats" maxlength="50" required value="${esc(entry?.category||'Bài báo khoa học')}"><datalist id="resource-cats">${RESOURCE_CATS.map(c=>`<option value="${esc(c)}">`).join('')}</datalist></div><div><label for="entry-project">Gắn với dự án</label>${projectSelect(entry?.project||'')}</div></div>
  <div class="form-row"><div><label for="entry-authors">Tác giả <small>để tạo trích dẫn</small></label><input id="entry-authors" name="authors" maxlength="300" value="${esc(entry?.authors||'')}" placeholder="L. Ma, H.-F. Chou, C.-W. Sham"></div><div><label for="entry-year">Năm</label><input id="entry-year" name="year" maxlength="4" inputmode="numeric" pattern="\\d{4}" value="${esc(entry?.year||'')}" placeholder="2019"></div></div>
  <label for="entry-venue">Nơi công bố <small>hội nghị, tạp chí, nhà xuất bản</small></label><input id="entry-venue" name="venue" maxlength="200" value="${esc(entry?.venue||'')}" placeholder="IEEE GCCE">
  <label for="entry-description">Ghi chú ngắn</label><textarea id="entry-description" name="description" maxlength="2000" rows="3">${esc(entry?.description||'')}</textarea>`;}
  else fields+=`<label for="entry-description">Mục tiêu & mô tả</label><textarea id="entry-description" name="description" maxlength="6000" rows="3" placeholder="Mình muốn xây dựng hoặc tìm hiểu điều gì?">${esc(entry?.description||'')}</textarea><div class="form-row"><div><label for="entry-category">Chuyên mục *</label><input id="entry-category" name="category" maxlength="50" required value="${esc(entry?.category||(kind==='research'?'Nghiên cứu vi mạch':'Digital IC'))}" placeholder="Digital IC, Analog IC, FPGA..."></div><div><label for="entry-status">Trạng thái</label><select id="entry-status" name="status">${Object.entries(STATUS).map(([key,title])=>`<option value="${key}" ${entry?.status===key?'selected':''}>${title}</option>`).join('')}</select></div></div><div class="form-row"><div><label for="entry-progress">Tiến độ (%) <small>cập nhật thủ công</small></label><input id="entry-progress" name="progress" type="number" min="0" max="100" step="1" value="${entry?.progress||0}" required></div><div><label for="entry-due">Mốc thời gian <small>không bắt buộc</small></label><input id="entry-due" name="due" type="date" value="${esc(entry?.due||'')}"></div></div><label for="entry-tags">Nhãn <small>ngăn cách bằng dấu phẩy</small></label><input id="entry-tags" name="tags" maxlength="250" value="${esc(entry?.tags||'')}" placeholder="Verilog, CMOS, SPICE...">
  <div class="editor-section"><h3>Hình ảnh, mô hình 3D & sơ đồ khối</h3>
  <div class="image-field"><div class="image-preview" id="image-preview">${entry?.image&&imageSrc(entry.image)?`<img src="${esc(imageSrc(entry.image))}" alt="">`:coverArt(guessModel(entry||{category:'',tags:'',title:''}),entry?.id||'x')}</div><div><label for="entry-image">Ảnh đại diện <small>JPG / PNG / WebP, tự thu nhỏ</small></label><input id="entry-image" type="file" accept="image/png,image/jpeg,image/webp"><button type="button" class="btn small" data-action="remove-image" ${entry?.image?'':'hidden'}>Bỏ ảnh, dùng hình minh họa</button></div></div>
  <label for="entry-model">Loại mô hình 3D & mô phỏng</label><select id="entry-model" name="model"><option value="">Tự nhận theo chuyên mục (${esc(MODEL_TYPES[guessModel({...(entry||{category:'',tags:'',title:''}),model:''})].label)})</option>${Object.entries(MODEL_TYPES).map(([k,v])=>`<option value="${k}" ${entry?.model===k?'selected':''}>${esc(v.label)}</option>`).join('')}</select>
  <label for="entry-blocks">Sơ đồ khối <small>mỗi dòng một chuỗi: Khối A -> Khối B -> Khối C</small></label><textarea id="entry-blocks" name="blocks" rows="5" maxlength="3000" placeholder="${esc(entry?blocksOf(entry):'Đầu vào -> Xử lý -> Đầu ra')}">${esc(entry?.blocks||'')}</textarea><p class="field-hint">Để trống để dùng sơ đồ mặc định theo loại mô hình.</p></div>`;
  $('#editor-form').innerHTML=fields+`<div class="dialog-actions"><button type="button" class="btn" data-close>Hủy</button><button type="submit" class="btn primary">${id?'Lưu thay đổi':'Tạo '+titles[kind]}</button></div>`;
  editorImage=entry?.image||'';
  $('#editor-dialog').showModal();
}
let editorImage='',editorFile=null,uploading=false;
async function handleUpload(file){if(!file)return;const bar=$('.upload-progress');bar.hidden=false;const fill=bar.querySelector('span');uploading=true;$('#drop-label').textContent='Đang tải lên '+file.name+'…';
  try{const info=await files.uploadFile(file,p=>fill.style.width=p+'%');if(editorFile&&editorFile.path!==collection('resource').find(i=>i.id===editorContext?.id)?.file?.path)files.removeFile(editorFile.path);editorFile=info;$('#drop-label').innerHTML=`Đã tải lên: <b>${esc(info.name)}</b> (${fileSize(info.size)}).`;const t=$('#entry-title');if(t&&!t.value.trim())t.value=info.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').slice(0,120);}
  catch(err){$('#drop-label').textContent='Chưa tải được: '+err.message;fill.style.width='0';}uploading=false;}
document.addEventListener('change',e=>{if(e.target.id==='entry-file')handleUpload(e.target.files[0]);});
for(const ev of ['dragover','dragleave','drop'])document.addEventListener(ev,e=>{const zone=e.target.closest?.('#drop-zone');if(!zone)return;e.preventDefault();zone.classList.toggle('over',ev==='dragover');if(ev==='drop')handleUpload(e.dataTransfer.files[0]);});
async function resizeImage(file){
  if(!/^image\/(png|jpeg|webp)$/.test(file.type))throw new Error('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.');if(file.size>15*1024*1024)throw new Error('Ảnh tối đa 15 MB.');
  const bmp=await createImageBitmap(file);const scale=Math.min(1,960/bmp.width,640/bmp.height);const c=document.createElement('canvas');c.width=Math.round(bmp.width*scale);c.height=Math.round(bmp.height*scale);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);bmp.close?.();
  for(const q of [.82,.7,.55]){const url=c.toDataURL('image/jpeg',q);if(url.length<=560000)return url;}throw new Error('Ảnh quá lớn sau khi nén.');
}
document.addEventListener('change',async e=>{if(e.target.id!=='entry-image')return;const file=e.target.files[0];if(!file)return;try{editorImage=await resizeImage(file);$('#image-preview').innerHTML=`<img src="${editorImage}" alt="">`;$('[data-action="remove-image"]').hidden=false;}catch(err){toast(err.message,true);e.target.value='';}});
$('#editor-form').addEventListener('submit',e=>{
  e.preventDefault();const {kind,id}=editorContext;const values=Object.fromEntries(new FormData(e.currentTarget));values.title=values.title.trim();if(!values.title){toast('Hãy nhập tiêu đề.',true);return;}
  if(kind==='resource'){if(uploading){toast('Đợi tệp tải lên xong đã nhé.',true);return;}values.url=(values.url||'').trim();if(values.url){const url=safeDocUrl(values.url);if(!url){toast('Chỉ dùng liên kết http hoặc https hợp lệ.',true);return;}values.url=url;}if(!values.url&&!editorFile){toast('Hãy chọn tệp hoặc nhập liên kết.',true);return;}if(values.year&&!/^\d{4}$/.test(values.year)){toast('Năm cần 4 chữ số.',true);return;}const old=collection('resource').find(i=>i.id===id)?.file;if(old&&old.path!==editorFile?.path)files.removeFile(old.path);values.file=editorFile;}
  if(kind==='note'){values.type=Object.hasOwn(NOTE_TYPES,values.type)?values.type:'note';}
  if(values.category!==undefined){values.category=values.category.trim();if(!values.category){toast('Hãy nhập chuyên mục.',true);return;}}
  if(kind==='project'||kind==='research'){values.progress=Math.round(Number(values.progress));if(!Number.isFinite(values.progress)||values.progress<0||values.progress>100){toast('Tiến độ cần từ 0 đến 100%.',true);return;}if(values.status==='done')values.progress=100;values.kind=kind;values.model=Object.hasOwn(MODEL_TYPES,values.model)?values.model:'';values.blocks=(values.blocks||'').slice(0,3000);values.image=editorImage||'';}
  const saved=commit(()=>{const list=collection(kind);const existing=list.find(i=>i.id===id);if(existing)Object.assign(existing,values,{updated:now(),demo:false});else list.unshift({id:uid(),...values,...(['project','research'].includes(kind)?{tasks:[],sim:null}:{}),created:now(),updated:now(),demo:false});});
  if(saved){$('#editor-dialog').close();render();toast(id?'Đã lưu thay đổi.':'Đã thêm vào không gian của mình.');}
});
let detailTab='overview',detailModel=null,detailSimRaf=0;
function showDetail(id,tab){const item=state.items.find(i=>i.id===id);if(!item)return;if(detailId!==id||!$('#detail-dialog').open)detailTab=tab||'overview';else if(tab)detailTab=tab;detailId=id;
  const type=guessModel(item),sim=simOf(item);
  $('#detail-content').innerHTML=`<div class="detail-cover">${coverHTML(item)}<div class="detail-cover-shade"></div><span class="visual-model">${esc(MODEL_TYPES[type].label)}</span></div><div class="detail-head"><div class="detail-toolbar"><div>${badge(item)} <span class="tag">${esc(item.category)}</span> <span class="tag violet">${item.kind==='research'?'NCKH':'Dự án'}</span>${item.demo?' <span class="tag">Mẫu</span>':''}</div><button class="icon-btn" data-close aria-label="Đóng chi tiết">${icon('close')}</button></div><h2>${esc(item.title)}</h2></div>
  <div class="detail-tabs" role="tablist">${[['overview','Tổng quan'],['model','Mô hình 3D'],['blocks','Sơ đồ khối'],['sim','Mô phỏng'],...(codeSlug(item)?[['code','Mã nguồn']]:[])].map(([k,l])=>`<button role="tab" data-action="detail-tab" data-tab="${k}" aria-selected="${detailTab===k}">${l}</button>`).join('')}</div>
  <div class="detail-body">
  <div class="detail-pane" data-pane="overview" ${detailTab==='overview'?'':'hidden'}><div class="detail-desc">${esc(item.description||'Thêm mô tả để ghi lại mục tiêu của mình.').split('\n\n').map(p=>`<p>${p.replace(/\n/g,'<br>')}</p>`).join('')}</div><div class="detail-meta"><span>Mốc: ${dateFormat(item.due)}</span><span>Cập nhật: ${dateFormat(item.updated)}</span></div><div class="progress-meta"><span>Tiến độ dự án (cập nhật khi chỉnh sửa)</span><strong>${item.progress}%</strong></div>${progress(item.progress)}<h3>Checklist công việc <span class="tag">${item.tasks.filter(t=>t.done).length}/${item.tasks.length}</span></h3><div class="detail-tasks">${item.tasks.length?item.tasks.map(t=>taskRow(item,t,true)).join(''):'<p class="info-note">Thêm công việc đầu tiên bên dưới.</p>'}</div><form class="task-form" id="task-form"><input name="task" maxlength="250" placeholder="Một bước nhỏ tiếp theo..." aria-label="Công việc mới" required><button class="btn primary" type="submit">${icon('plus')}Thêm</button></form>${linkedResources(item)}</div>
  <div class="detail-pane" data-pane="model" ${detailTab==='model'?'':'hidden'}><div class="model-viewport"><canvas id="project-model-canvas" aria-label="Mô hình 3D của dự án"></canvas><div class="model-caption" id="model-caption">Đang tải mô hình 3D…</div><div class="model-hint">Kéo để xoay · Cuộn để thu phóng</div></div><p class="info-note">Mô hình minh họa cấu trúc theo loại “${esc(MODEL_TYPES[type].label)}”. Đổi loại trong Chỉnh sửa.</p></div>
  <div class="detail-pane" data-pane="blocks" ${detailTab==='blocks'?'':'hidden'}><div class="block-wrap">${blockDiagramSVG(blocksOf(item))}</div><p class="info-note">${item.blocks?'Sơ đồ do bạn nhập.':'Sơ đồ mặc định theo loại mô hình.'} Sửa trong “Chỉnh sửa → Sơ đồ khối”.</p></div>
  <div class="detail-pane" data-pane="sim" ${detailTab==='sim'?'':'hidden'}><div class="mini-scope"><canvas id="detail-sim-canvas" aria-label="Xem trước mô phỏng"></canvas></div><div class="mini-scope-meta"><span id="detail-sim-readout"></span></div><div class="sim-param-list"><span><b>Mô hình</b>${esc(SIM_MODELS[sim.model])}</span><span><b>Biên độ</b>${sim.amp} V</span><span><b>Tần số</b>${sim.freq} Hz</span>${PARAM_INFO[sim.model]?`<span><b>${esc(PARAM_INFO[sim.model].label)}</b>${sim.param}${PARAM_INFO[sim.model].unit}</span>`:''}</div><button class="btn primary" data-action="run-sim" data-id="${esc(item.id)}">${icon('play')}Mở trong phòng mô phỏng</button></div>
  ${codeSlug(item)?`<div class="detail-pane" data-pane="code" ${detailTab==='code'?'':'hidden'}><div id="code-view" class="code-view"><div id="code-list" class="code-list"></div><div class="code-main"><div class="code-head"><div id="code-meta" class="code-meta"></div><div id="code-links" class="code-links"></div></div><pre class="code-pre"><code id="code-text">Đang tải…</code></pre></div></div></div>`:''}
  <div class="detail-actions"><button class="btn danger small" data-action="delete" data-kind="${item.kind}" data-id="${esc(item.id)}">${icon('trash')}Xóa mục</button><button class="btn small" data-action="edit" data-kind="${item.kind}" data-id="${esc(item.id)}">${icon('edit')}Chỉnh sửa</button></div></div>`;
  if(!$('#detail-dialog').open)$('#detail-dialog').showModal();
  $('#task-form').addEventListener('submit',e=>{e.preventDefault();const text=new FormData(e.currentTarget).get('task').trim();if(!text)return;if(item.tasks.length>=500){toast('Checklist tối đa 500 công việc.',true);return;}if(commit(()=>{item.tasks.push({id:uid(),text,done:false});item.updated=now();item.demo=false;})){render();showDetail(id);$('#task-form input').focus();}});
  setDetailTab(detailTab);
}
function linkedResources(item){const notes=state.notes.filter(n=>n.project===item.id).sort((a,b)=>b.updated.localeCompare(a.updated));const noteHtml=`<h3>Nhật ký & ghi chép <span class="tag">${notes.length}</span></h3><div class="linked-docs">${notes.map(n=>`<button class="linked-doc" data-action="edit" data-kind="note" data-id="${esc(n.id)}">${icon(n.type==='journal'?'flask':'notebook')}<span>${esc(n.title)} <small>· ${esc(NOTE_TYPES[n.type])} · ${dateFormat(n.updated)}</small></span></button>`).join('')}<button class="linked-doc add" data-action="add-note-for" data-id="${esc(item.id)}">${icon('plus')}<span>Thêm nhật ký thí nghiệm</span></button><button class="linked-doc add" data-action="add-resource-for" data-id="${esc(item.id)}">${icon('upload')}<span>Thêm tài liệu cho dự án</span></button></div>`;return noteHtml+linkedDocs(item);}
function linkedDocs(item){const list=state.resources.filter(r=>r.project===item.id);return list.length?`<h3>Tài liệu của dự án <span class="tag">${list.length}</span></h3><div class="linked-docs">${list.map(r=>`<button class="linked-doc" data-action="open-resource" data-id="${esc(r.id)}">${icon(r.file?'file':'external')}<span>${esc(r.title)}</span></button>`).join('')}</div>`:'';}
function stopDetailMedia(){detailModel?.dispose();detailModel=null;cancelAnimationFrame(detailSimRaf);detailSimRaf=0;}

// ---- Mã nguồn đính kèm: nằm trong dữ liệu riêng của từng dự án (item.codeFiles), không có trong mã web công khai.
const codeSlug=item=>Array.isArray(item.codeFiles)&&item.codeFiles.length?'x':'';
function showCodeFile(item,i){const pane=$('#code-view');if(!pane)return;const f=item.codeFiles[i];if(!f)return;
  $$('[data-codefile]',pane).forEach(b=>b.classList.toggle('active',Number(b.dataset.codefile)===i));
  $('#code-text').textContent=f.text;
  $('#code-meta').innerHTML=`<strong>${esc(f.name)}</strong><span>${esc(f.desc||'')} · ${f.lines||f.text.split('\n').length} dòng</span>`;
  const gh=safeUrl(f.url||'');$('#code-links').innerHTML=`<button class="btn small" id="code-copy" type="button">Sao chép</button>${gh?`<a class="btn small" href="${esc(gh)}" target="_blank" rel="noopener noreferrer">Mở trên GitHub</a>`:''}`;
  $('#code-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(f.text);toast('Đã sao chép '+f.name);}catch{toast('Trình duyệt không cho sao chép tự động.',true);}});}
function initCodePane(item){const pane=$('#code-view');if(!codeSlug(item)||!pane||pane.dataset.ready)return;pane.dataset.ready='1';
  $('#code-list').innerHTML=item.codeFiles.map((f,i)=>`<button type="button" data-codefile="${i}"><b>${esc(f.name)}</b><small>${esc(f.desc||'')}</small></button>`).join('');
  $('#code-list').addEventListener('click',e=>{const b=e.target.closest('[data-codefile]');if(b)showCodeFile(item,Number(b.dataset.codefile));});showCodeFile(item,0);}

function setDetailTab(tab){detailTab=tab;const dlg=$('#detail-dialog');$$('[data-pane]',dlg).forEach(p=>p.hidden=p.dataset.pane!==tab);$$('[data-tab]',dlg).forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===tab)));
  stopDetailMedia();const item=state.items.find(i=>i.id===detailId);if(!item)return;if(tab==='code')initCodePane(item);
  if(tab==='model'){const canvas=$('#project-model-canvas');import('./project-model.js').then(({createProjectModel})=>{if(detailTab!=='model'||!canvas.isConnected)return;detailModel=createProjectModel({canvas,type:guessModel(item),reducedMotion:reduceMotion,label:t=>{$('#model-caption').textContent=t;}});}).catch(err=>{$('#model-caption').textContent='Trình duyệt chưa hỗ trợ WebGL nên không hiện được mô hình 3D.';console.warn(err);});}
  if(tab==='sim'){const canvas=$('#detail-sim-canvas'),c=canvas.getContext('2d'),cfg=simOf(item);let t0=performance.now();const loop=ts=>{detailSimRaf=requestAnimationFrame(loop);const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio,2);if(r.width<1)return;if(canvas.width!==Math.round(r.width*dpr)){canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);}c.setTransform(dpr,0,0,dpr,0,0);const info=drawSignals(c,r.width,r.height,cfg,reduceMotion?0:(ts-t0)/1000);$('#detail-sim-readout').textContent=info.readout;};detailSimRaf=requestAnimationFrame(loop);}
}
$('#detail-dialog').addEventListener('close',stopDetailMedia);
let confirmResolve=null;
function confirmAction(title,message){$('#confirm-title').textContent=title;$('#confirm-message').textContent=message;$('#confirm-dialog').showModal();return new Promise(resolve=>confirmResolve=resolve);}
function finishConfirm(value){$('#confirm-dialog').close();const resolve=confirmResolve;confirmResolve=null;resolve?.(value);}
$('#confirm-accept').addEventListener('click',()=>finishConfirm(true));$('#confirm-cancel').addEventListener('click',()=>finishConfirm(false));$('#confirm-dialog').addEventListener('cancel',e=>{e.preventDefault();finishConfirm(false);});
async function deleteEntry(kind,id){const entry=collection(kind).find(i=>i.id===id);if(!entry)return;if(!await confirmAction('Xóa mục này?',`“${entry.title}” sẽ được xóa khỏi không gian của bạn.`))return;if(commit(()=>{const list=collection(kind);list.splice(list.findIndex(i=>i.id===id),1);if(kind==='project'||kind==='research'){state.notes.forEach(n=>{if(n.project===id)n.project='';});state.resources.forEach(r=>{if(r.project===id)r.project='';});}})){if(simProject===id)simProject='';if(kind==='resource'&&entry.file)files.removeFile(entry.file.path);if($('#detail-dialog').open)$('#detail-dialog').close();render();toast('Đã xóa mục.');}}
document.addEventListener('click',async e=>{
  const closer=e.target.closest('[data-close]');if(closer){closer.closest('dialog')?.close();return;}
  const target=e.target.closest('[data-action]');if(!target||target.matches('input'))return;
  const {action,kind,id}=target.dataset;
  if(action==='add')openEditor(kind);
  else if(action==='edit')openEditor(kind,id);
  else if(action==='detail')showDetail(id);
  else if(action==='delete')await deleteEntry(kind,id);
  else if(action==='filter'){filter=target.dataset.filter;renderItems();}
  else if(action==='cat'){catFilter=target.dataset.cat;renderItemGrid();}
  else if(action==='add-note-for'){openEditor('note');const sel=$('#entry-project');if(sel)sel.value=id;const t=$('#entry-type');if(t)t.value='journal';const b=$('#entry-body');if(b&&!b.value)b.value='Mục tiêu:\n\nCấu hình / công cụ:\n\nKết quả:\n\nNhận xét & bước tiếp theo:\n';}
  else if(action==='add-resource-for'){openEditor('resource');const sel=$('#entry-project');if(sel)sel.value=id;}
  else if(action==='note-filter'){noteFilter=target.dataset.type;renderNotes();}
  else if(action==='open-resource')openResource(id);
  else if(action==='download-resource')openResource(id,true);
  else if(action==='cite'){const r=state.resources.find(x=>x.id===id);if(r)navigator.clipboard?.writeText(citationText(r)).then(()=>toast('Đã chép trích dẫn.'),()=>toast(citationText(r)));}
  else if(action==='sign-out'){if(await confirmAction('Đăng xuất?','Phiên làm việc trên trình duyệt này sẽ kết thúc.'))cloud.signOut();}
  else if(action==='detail-tab')setDetailTab(target.dataset.tab);
  else if(action==='run-sim'){simProject=id;if(location.hash==='#simulation')loadSimProject(id);else location.hash='simulation';}
  else if(action==='remove-image'){editorImage='';$('#image-preview').innerHTML=coverArt(guessModel({category:$('#entry-category')?.value||'',tags:'',title:'',model:$('#entry-model')?.value||''}),'x');target.hidden=true;}
  else if(action==='search')openSearch();
  else if(action==='delete-task'){
    const item=state.items.find(i=>i.id===id);if(!item)return;
    if(!await confirmAction('Xóa công việc?','Công việc này sẽ được xóa khỏi checklist.'))return;
    if(commit(()=>{item.tasks=item.tasks.filter(t=>t.id!==target.dataset.task);item.updated=now();item.demo=false;})){render();showDetail(id);}
  }
});
document.addEventListener('change',e=>{
  const target=e.target;if(target.dataset.action!=='toggle-task')return;
  const item=state.items.find(i=>i.id===target.dataset.id),task=item?.tasks.find(t=>t.id===target.dataset.task);if(!task)return;
  const checked=target.checked;if(commit(()=>{const tot=item.tasks.length||1,prev=Math.round(item.tasks.filter(t=>t.done).length/tot*100);task.done=checked;const cur=Math.round(item.tasks.filter(t=>t.done).length/tot*100);if(item.status!=='done'&&item.progress===prev)item.progress=cur;if(item.status==='idea'&&checked)item.status='active';item.updated=now();item.demo=false;})){render();if($('#detail-dialog').open){showDetail(item.id);const checkbox=$$('input[data-task]',$('#detail-dialog')).find(el=>el.dataset.task===task.id);checkbox?.focus();}}else target.checked=!checked;
});
document.addEventListener('input',e=>{if(e.target.id==='list-search'){localQuery=e.target.value;renderItemGrid();}if(e.target.id==='lib-search'){libQuery=e.target.value;renderLibraryGrid();}});
document.addEventListener('change',e=>{const id=e.target.id;if(id==='lib-cat'){libCat=e.target.value;renderLibraryGrid();}else if(id==='lib-project'){libProject=e.target.value;renderLibraryGrid();}else if(id==='lib-type'){libType=e.target.value;renderLibraryGrid();}});
$$('dialog').forEach(dialog=>dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){if(dialog.id==='confirm-dialog')finishConfirm(false);else dialog.close();}}}));
function openSearch(){$('#global-search').value=searchQuery;$('#search-dialog').showModal();$('#global-search').focus();}
$('#search-button').addEventListener('click',openSearch);$('#quick-note').addEventListener('click',()=>openEditor('note'));
$('#search-form').addEventListener('submit',e=>{e.preventDefault();searchQuery=$('#global-search').value.trim();if(!searchQuery)return;$('#search-dialog').close();if(page==='search')renderSearch();else location.hash='search';});
$('#settings-form').addEventListener('submit',e=>{e.preventDefault();const name=$('#lab-name').value.trim(),owner=$('#owner-name').value.trim();if(!name||!owner){toast('Hãy nhập tên lab và tên của bạn.',true);return;}{const g=$('#profile-github').value.trim();if(g&&!safeUrl(g)){toast('Liên kết GitHub phải bắt đầu bằng https://',true);return;}}if(commit(()=>{state.settings={...state.settings,labName:name,owner,motion:$('#default-motion').checked,headline:$('#profile-headline').value.trim().slice(0,140),bio:$('#profile-bio').value.trim().slice(0,600),skills:$('#profile-skills').value.trim().slice(0,400),email:$('#profile-email').value.trim().slice(0,120),github:$('#profile-github').value.trim()};})){chipScene?.setAutoRotate(state.settings.motion);render();toast('Đã cập nhật không gian của bạn.');}});
$('#export-data').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`MY-LAB-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Đã xuất bản sao dữ liệu.');});
$('#import-data').addEventListener('click',()=>$('#import-file').click());
$('#import-file').addEventListener('change',async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;if(file.size>5*1024*1024){toast('Bản sao tối đa 5 MB.',true);return;}let imported;try{imported=validateState(JSON.parse(await file.text()));}catch(err){toast('Không nhập được: '+(err instanceof SyntaxError?'File JSON không hợp lệ.':err.message),true);return;}if(!await confirmAction('Khôi phục bản sao?',`Thay dữ liệu hiện tại bằng ${imported.items.length} dự án / đề tài, ${imported.notes.length} ghi chú và ${imported.resources.length} tài liệu. Hãy xuất bản sao hiện tại trước nếu muốn giữ lại.`))return;if(commit(()=>{state=imported;})){chipScene?.setAutoRotate(state.settings.motion);render();toast('Đã khôi phục bản sao.');}});
$('#remove-demo').addEventListener('click',async()=>{if(![...state.items,...state.notes,...state.resources].some(i=>i.demo)){toast('Không còn nội dung minh họa.');return;}if(!await confirmAction('Xóa các mục minh họa?','Những mục mẫu chưa chỉnh sửa sẽ được xóa. Các mục bạn đã tạo hoặc thay đổi vẫn được giữ lại.'))return;if(commit(()=>{state.items=state.items.filter(i=>!i.demo);state.notes=state.notes.filter(i=>!i.demo);state.resources=state.resources.filter(i=>!i.demo);})){render();toast('Lab đã sẵn sàng cho dự án của riêng bạn.');}});

// Signal lab: each project carries a simulation model and parameters (see project-viz.js / signals.js).
let simRunning=!reduceMotion,simTime=0,previousFrame=0,simProject='';
const wave=$('#wave-canvas'),ctx=wave.getContext('2d');
$('#sim-model').innerHTML=Object.entries(SIM_MODELS).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('');
function simConfig(){return {model:$('#sim-model').value,wave:$('#wave-type').value,amp:Number($('#amplitude').value),freq:Number($('#frequency').value),phase:Number($('#phase').value),param:Number($('#sim-param').value)};}
function syncParamControl(value){const info=PARAM_INFO[$('#sim-model').value];$('#sim-param-wrap').hidden=!info;if(!info)return;const el=$('#sim-param');el.min=info.min;el.max=info.max;el.step=info.step;if(value!==undefined)el.value=value;else if(Number(el.value)<info.min||Number(el.value)>info.max)el.value=(info.min+info.max)/2;$('#sim-param-label').textContent=info.label;}
function updateWaveControls(){const info=PARAM_INFO[$('#sim-model').value];$('#amp-output').value=`${Number($('#amplitude').value).toFixed(1)} V`;$('#freq-output').value=`${Number($('#frequency').value).toFixed(1)} Hz`;$('#phase-output').value=$('#phase').value+'°';if(info)$('#sim-param-output').value=$('#sim-param').value+info.unit;
  const item=state.items.find(i=>i.id===simProject);if(item){const saved=simOf(item),cur=simConfig();const changed=['model','wave','amp','freq','phase','param'].some(k=>String(saved[k])!==String(cur[k]));$('#sim-save').hidden=!changed;}}
['amplitude','frequency','phase','wave-type','sim-param'].forEach(id=>$('#'+id).addEventListener('input',updateWaveControls));
$('#sim-model').addEventListener('input',()=>{syncParamControl();updateWaveControls();});
function applySim(cfg){$('#sim-model').value=cfg.model;$('#wave-type').value=cfg.wave||'sine';$('#amplitude').value=cfg.amp;$('#frequency').value=cfg.freq;$('#phase').value=cfg.phase||0;syncParamControl(cfg.param);simTime=0;updateWaveControls();}
function renderSimProjects(){const sel=$('#sim-project');const groups=[['research','Nghiên cứu khoa học'],['project','Dự án']].map(([k,l])=>{const list=state.items.filter(i=>i.kind===k);return list.length?`<optgroup label="${l}">${list.map(i=>`<option value="${esc(i.id)}">${esc(i.title)}</option>`).join('')}</optgroup>`:'';}).join('');sel.innerHTML=`<option value="">— Tự do, không gắn dự án —</option>`+groups;sel.value=state.items.some(i=>i.id===simProject)?simProject:'';}

let teamPage=null;
async function renderTeam(){const root=$('#page-team');
  if(!cloudUser||GUEST||!cloud.cloudEnabled){root.innerHTML='<header class="page-heading"><div><span class="eyebrow">LÀM VIỆC CHUNG</span><h1>Nhóm NCKH</h1></div></header><div class="team-empty"><h3>Cần đăng nhập</h3><p>'+(GUEST?'Bạn đang ở chế độ tham quan. Đăng ký hoặc đăng nhập để tạo nhóm và làm việc chung.':'Nhóm NCKH chỉ có trong bản trực tuyến, sau khi đăng nhập.')+'</p></div>';return;}
  if(!teamPage){const {createTeamPage}=await import('./team.js');teamPage=createTeamPage({root,client:cloud.getClient(),me:cloudUser,toast,confirmAction});}
  teamPage.open();}
function renderPortfolio(){
  const st=state.settings,list=state.items.filter(i=>i.status==='done').sort((a,b)=>(b.progress||0)-(a.progress||0)),pending=state.items.filter(i=>i.status!=='done').sort((a,b)=>(b.progress||0)-(a.progress||0));
  const skills=(st.skills||'').split(',').map(x=>x.trim()).filter(Boolean);
  const gh=safeUrl(st.github||''),mail=/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(st.email||'')?st.email:'';
  const done=list.length,cats=new Set(list.map(i=>i.category)).size;
  $('#page-portfolio').innerHTML=`<header class="pf-hero"><div class="pf-avatar">${esc(st.owner.trim().slice(0,1).toUpperCase())}</div><div class="pf-id"><span class="eyebrow">PORTFOLIO · ${esc(st.labName)}</span><h1>${esc(st.owner)}</h1><p class="pf-headline">${esc(st.headline||'')}</p></div><div class="pf-actions">${gh?`<a class="btn small" href="${esc(gh)}" target="_blank" rel="noopener noreferrer">GitHub</a>`:''}${mail?`<a class="btn small" href="mailto:${esc(mail)}">Email</a>`:''}<button class="btn small primary" id="pf-print">In / lưu PDF</button></div></header>
  <div class="pf-stats"><div><strong>${done}</strong><span>Đã hoàn thành</span></div><div><strong>${cats}</strong><span>Lĩnh vực</span></div><div><strong>${pending.length}</strong><span>Đang làm &amp; chờ</span></div><div><strong>${state.resources.length}</strong><span>Tài liệu tham khảo</span></div></div>
  ${st.bio?`<section class="pf-section"><h2>Giới thiệu</h2><p class="pf-bio">${esc(st.bio)}</p></section>`:''}
  ${skills.length?`<section class="pf-section"><h2>Kỹ năng &amp; công cụ</h2><div class="pf-skills">${skills.map(k=>`<span class="tag">${esc(k)}</span>`).join('')}</div></section>`:''}
  <section class="pf-section"><h2>Dự án tiêu biểu</h2><div class="pf-projects">${list.map(i=>`<article class="pf-card"><button class="pf-cover" data-action="detail" data-id="${esc(i.id)}" aria-label="Mở ${esc(i.title)}">${coverHTML(i)}</button><div class="pf-body"><span class="tag">${esc(i.category)}</span><h3>${esc(i.title)}</h3><p>${esc((i.description||'').slice(0,220))}${(i.description||'').length>220?'…':''}</p>${(i.metrics||[]).length?`<ul class="pf-metrics">${i.metrics.map(m=>`<li>${esc(m)}</li>`).join('')}</ul>`:''}<div class="pf-foot"><small>${esc(STATUS[i.status])} · ${i.progress}%</small><span>${(Array.isArray(i.tags)?i.tags:String(i.tags||'').split(',').map(x=>x.trim()).filter(Boolean)).slice(0,4).map(t=>`<em>${esc(t)}</em>`).join('')}</span></div></div></article>`).join('')||empty('Chưa có dự án','Thêm dự án để chúng hiện ở đây.')}</div></section>
  ${pending.length?`<section class="pf-section"><h2>Đang làm và chờ thực hiện</h2><p class="pf-bio">Những dự án chưa hoàn thành, nằm trong hàng đợi của lab.</p><ul class="pf-queue">${pending.map(i=>`<li><button data-action="detail" data-id="${esc(i.id)}"><span>${esc(i.title)}</span><em>${esc(STATUS[i.status])}${i.progress?` · ${i.progress}%`:''}</em></button></li>`).join('')}</ul></section>`:''}
  <p class="info-note pf-note">Chỉnh thông tin giới thiệu, kỹ năng và liên hệ trong <a href="#settings" class="text-link">Cài đặt</a>.</p>`;
  $('#pf-print').addEventListener('click',()=>window.print());
}
function benchHTML(){
  const groups=new Map();state.items.forEach(i=>{if(!groups.has(i.category))groups.set(i.category,[]);groups.get(i.category).push(i);});
  if(!groups.size)return '';
  return `<div class="panel bench-panel"><div class="panel-heading"><h2>${icon('layers')}Bàn thí nghiệm</h2><span class="tag">${groups.size} khu vực</span></div><div class="bench-grid">${[...groups].map(([c,arr])=>{const open=arr.filter(i=>i.status!=='done').length,avg=Math.round(arr.reduce((a,i)=>a+i.progress,0)/arr.length),led=open?(avg>=80?'ok':'run'):'idle';return `<button class="bench" data-bench="${esc(c)}"><i class="led ${led}"></i><strong>${esc(c)}</strong><small>${arr.length} mục · ${open} đang mở</small><span class="bench-bar"><b style="width:${avg}%"></b></span><em>${avg}%</em></button>`;}).join('')}</div></div>`;
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-bench]');if(b){catFilter=b.dataset.bench;location.hash='projects';}});
let algoPlayer=null,simTab='signal';
function setSimTab(tab){simTab=tab;$$('[data-simtab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.simtab===tab)));$('#sim-pane-signal').hidden=tab!=='signal';$('#sim-pane-algo').hidden=tab!=='algo';
  if(tab==='algo'){if(!algoPlayer)algoPlayer=createAlgoPlayer({root:$('#algo-panel'),reducedMotion:reduceMotion});const item=state.items.find(i=>i.id===simProject);if(item)algoPlayer.select(guessAlgo(item));algoPlayer.setVisible(page==='simulation');}else algoPlayer?.setVisible(false);}
$$('[data-simtab]').forEach(b=>b.addEventListener('click',()=>setSimTab(b.dataset.simtab)));
function loadSimProject(id){simProject=id||'';renderSimProjects();const item=state.items.find(i=>i.id===simProject);const card=$('#sim-project-card');
  if(!item){card.innerHTML='<p class="muted">Chọn một dự án hoặc đề tài: thông số và mô hình mô phỏng của nó sẽ được nạp và chạy ngay.</p>';$('#sim-save').hidden=true;return;}
  const type=guessModel(item);card.innerHTML=`<div class="sim-card-top"><div class="sim-card-art">${coverHTML(item)}</div><div class="sim-card-main"><div class="sim-card-tags"><span class="tag">${esc(item.category)}</span><span class="tag violet">${esc(MODEL_TYPES[type].short)}</span><span class="tag amber">${esc(STATUS[item.status])} · ${item.progress}%</span></div><strong>${esc(item.title)}</strong><p>${esc((item.description||'').split('\n')[0].slice(0,190))}${(item.description||'').split('\n')[0].length>190?'…':''}</p><div class="sim-card-actions"><button class="btn small" data-action="detail" data-id="${esc(item.id)}">Mở dự án · mô hình 3D</button><button class="btn small" id="sim-goto-algo" type="button">Chạy thuật toán từng bước</button></div></div></div><div class="sim-card-blocks">${blockDiagramSVG(blocksOf(item),{compact:true})}</div>`;
  if(algoPlayer)algoPlayer.select(guessAlgo(item));$('#sim-goto-algo')?.addEventListener('click',()=>setSimTab('algo'));applySim(simOf(item));if(!simRunning&&!reduceMotion){simRunning=true;updateSimButton();}toast(`Đã nạp mô phỏng: ${SIM_MODELS[simOf(item).model]}`);}
$('#sim-project').addEventListener('change',e=>loadSimProject(e.target.value));
$('#sim-save').addEventListener('click',()=>{const item=state.items.find(i=>i.id===simProject);if(!item)return;const cfg=simConfig();if(commit(()=>{item.sim=cfg;item.updated=now();})){$('#sim-save').hidden=true;toast('Đã lưu thông số mô phỏng vào dự án.');}});
function updateSimButton(){$('#sim-pause').textContent=simRunning?'Tạm dừng':'Chạy tín hiệu';$('#sim-pause').setAttribute('aria-pressed',String(!simRunning));}
$('#sim-pause').addEventListener('click',()=>{simRunning=!simRunning;updateSimButton();});
$('#sim-reset').addEventListener('click',()=>{const item=state.items.find(i=>i.id===simProject);applySim(item?simOf(item):{model:'basic',wave:'sine',amp:1,freq:2,phase:0,param:0});});
let legendKey='';
function drawWave(t){requestAnimationFrame(drawWave);const delta=previousFrame?Math.min((t-previousFrame)/1000,.05):0;previousFrame=t;if(page!=='simulation'||document.hidden)return;if(simRunning)simTime+=delta;
  const rect=wave.getBoundingClientRect(),dpr=Math.min(devicePixelRatio,2);if(wave.width!==Math.round(rect.width*dpr)||wave.height!==Math.round(rect.height*dpr)){wave.width=Math.round(rect.width*dpr);wave.height=Math.round(rect.height*dpr);}const w=rect.width,h=rect.height;if(w<1||h<1)return;ctx.setTransform(dpr,0,0,dpr,0,0);
  const info=drawSignals(ctx,w,h,simConfig(),simTime);$('#sim-readout').textContent=info.readout;const key=info.legend.map(l=>l.join()).join('|');if(key!==legendKey){legendKey=key;$('#sim-legend').innerHTML=info.legend.map(([n,c])=>`<span><i style="background:${c}"></i>${esc(n)}</span>`).join('');}
}
syncParamControl();updateWaveControls();updateSimButton();requestAnimationFrame(drawWave);
const finishControl=document.createElement('button');finishControl.id='chip-finish-button';finishControl.setAttribute('aria-label','Đổi phối màu chip');finishControl.title='Đổi phối màu chip';finishControl.innerHTML=icon('palette');$('.scene-controls').insertBefore(finishControl,$('#reset-view'));
let chipFinish='spectrum';try{chipFinish=localStorage.getItem('lab-tdv:chip-finish')||chipFinish;}catch{}
if(cloudUser){$('#account-panel').hidden=false;$('#account-email').textContent=cloudUser.email;$('#data-where').textContent='Dữ liệu được đồng bộ lên cloud mỗi khi bạn thay đổi và truy cập được từ mọi thiết bị sau khi đăng nhập. Vẫn nên xuất bản sao JSON định kỳ để có bản lưu riêng.';$('.profile small').textContent=cloudUser.email;cloud.setStatus('cloud','Đã đồng bộ');$('#sync-status').title='Dữ liệu lưu trên cloud';
  $('#change-password').addEventListener('click',async()=>{const v=$('#new-password').value;try{await cloud.changePassword(v);$('#new-password').value='';toast('Đã đổi mật khẩu.');}catch(err){toast(err.message,true);}});}


if(GUEST){const b=document.createElement('div');b.className='guest-bar';b.innerHTML='<span>Chế độ tham quan: bạn đang xem bản mẫu, mọi thay đổi sẽ không được lưu.</span><button type="button" id="guest-exit">Thoát</button>';document.body.appendChild(b);$('#guest-exit').addEventListener('click',()=>{try{sessionStorage.removeItem('lab-guest');}catch{}location.reload();});}
route();if(loadWarning)toast(loadWarning,true);
import('./scene.js').then(({createChipScene})=>{
  chipScene=createChipScene({canvas:$('#chip-canvas'),autoRotate:state.settings.motion,reducedMotion:reduceMotion,ambienceEnabled,finish:chipFinish,onState:({autoRotate,exploded,finishLabel})=>{
    const rotate=$('#rotate-button');rotate.setAttribute('aria-pressed',String(autoRotate));rotate.innerHTML=icon(autoRotate?'pause':'play')+`<span>${autoRotate?'Tự xoay':'Đã dừng'}</span>`;$('#explode-button').setAttribute('aria-pressed',String(exploded));$('#chip-label').textContent=exploded?'Nắp · Silicon die · Đế chip':'Bộ xử lý · IC package';
    finishControl.title=`Phối màu: ${finishLabel}. Bấm để đổi.`;finishControl.dataset.finishLabel=finishLabel;
  }});chipScene.setPresentation(page==='welcome');chipScene.setVisible(page==='home'||page==='welcome');
  $('#rotate-button').addEventListener('click',()=>chipScene.toggleRotation());$('#explode-button').addEventListener('click',()=>chipScene.toggleExplode());$('#reset-view').addEventListener('click',()=>chipScene.reset());
  finishControl.addEventListener('click',()=>{const finish=chipScene.cycleFinish();try{localStorage.setItem('lab-tdv:chip-finish',finish);}catch{}toast('Phối màu chip: '+finishControl.dataset.finishLabel);});
}).catch(err=>{$('#scene-fallback').hidden=false;$('#chip-canvas').hidden=true;$('.scene-controls').hidden=true;$('.scene-label').hidden=true;console.warn('3D unavailable:',err.message);});
import('./effects.js').then(({createAmbience})=>{
  const ambience=createAmbience({canvas:$('#ambient-canvas'),enabled:ambienceEnabled,reducedMotion:reduceMotion});
  const toggles=$$('[data-effects-switch]');
  function sync(){toggles.forEach(toggle=>toggle.setAttribute('aria-pressed',String(ambienceEnabled)));document.body.classList.toggle('effects-paused',!ambienceEnabled);chipScene?.setAmbience(ambienceEnabled);}
  sync();toggles.forEach(toggle=>toggle.addEventListener('click',()=>{ambienceEnabled=!ambienceEnabled;ambience.setEnabled(ambienceEnabled);sync();try{localStorage.setItem('lab-tdv:ambient',ambienceEnabled?'on':'off');}catch{}}));
}).catch(err=>{$('#effects-toggle').disabled=true;console.warn('Ambient visuals unavailable:',err.message);});
function welcomeDemo(){if(!chipScene){toast('Mô hình 3D đang khởi tạo, thử lại sau một chút.');return;}chipScene.toggleExplode();chipScene.setAutoRotate(true);}
$('#welcome-demo').addEventListener('click',welcomeDemo);$('#welcome-tech').addEventListener('click',welcomeDemo);
