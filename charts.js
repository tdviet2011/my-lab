// Biểu đồ NCKH: đọc bảng số liệu dạng CSV / dán từ Excel và vẽ bằng SVG (không cần thư viện).
export const CHART_TYPES={line:'Đường',bar:'Cột',scatter:'Phân tán'};
const COLORS=['#8fe0d6','#c79cff','#f0cf8a','#7fa8ff','#ff9db5','#9be38f'];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

export function parseTable(text){
  const lines=String(text||'').split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  if(lines.length<2)return {error:'Cần ít nhất một dòng tiêu đề và một dòng số liệu.'};
  const delim=lines[0].includes('\t')?'\t':lines[0].includes(';')&&!lines[0].includes(',')?';':',';
  const rows=lines.map(l=>l.split(delim).map(c=>c.trim()));
  const head=rows[0];if(head.length<2)return {error:'Cần ít nhất hai cột (cột đầu là trục X).'};
  const body=rows.slice(1);
  const num=v=>{const n=Number(String(v).replace(',','.'));return v!==''&&Number.isFinite(n)?n:null;};
  const labels=body.map(r=>r[0]??'');
  const numericX=labels.every(l=>num(l)!==null);
  const series=head.slice(1).map((name,i)=>({name:name||'Chuỗi '+(i+1),values:body.map(r=>num(r[i+1]??''))}));
  if(series.every(s=>s.values.every(v=>v===null)))return {error:'Không đọc được số liệu nào. Kiểm tra dấu phân cách và định dạng số.'};
  return {xName:head[0]||'x',labels,xs:numericX?labels.map(num):null,series};
}

function niceScale(min,max,ticks=5){
  if(min===max){const d=Math.abs(min)||1;min-=d/2;max+=d/2;}
  const span=max-min,raw=span/ticks,mag=10**Math.floor(Math.log10(raw)),f=raw/mag;
  const step=(f<1.5?1:f<3?2:f<7?5:10)*mag;
  const lo=Math.floor(min/step)*step,hi=Math.ceil(max/step)*step;const out=[];
  for(let v=lo;v<=hi+step/2;v+=step)out.push(Math.round(v/step*1e6)/1e6*step);
  return {lo,hi,ticks:out};
}
const fmt=v=>{const a=Math.abs(v);if(a>=1e6||(a>0&&a<1e-3))return v.toExponential(1).replace('e+','e');return String(Math.round(v*1e4)/1e4);};

export function chartSVG(chart,{width=640,height=340}={}){
  const t=parseTable(chart.table);
  if(t.error)return `<svg viewBox="0 0 ${width} 120" class="chart-svg" role="img"><text x="20" y="60" fill="#e7a0a0" font-size="14">${esc(t.error)}</text></svg>`;
  const m={l:62,r:18,t:20,b:58},w=width-m.l-m.r,h=height-m.t-m.b;
  const type=Object.hasOwn(CHART_TYPES,chart.type)?chart.type:'line';
  const all=t.series.flatMap(s=>s.values).filter(v=>v!==null);
  let lo=Math.min(...all),hi=Math.max(...all);if(type==='bar'){lo=Math.min(0,lo);hi=Math.max(0,hi);}
  const ys=niceScale(lo,hi);const Y=v=>m.t+h-(v-ys.lo)/(ys.hi-ys.lo)*h;
  const n=t.labels.length;let X,xticks=[];
  if(type==='bar'){X=i=>m.l+w/n*(i+.5);xticks=t.labels.map((l,i)=>[X(i),l]);}
  else if(!t.xs){X=i=>m.l+(n===1?w/2:i/(n-1)*w);xticks=t.labels.map((l,i)=>[X(i),l]);}
  else{const xmin=Math.min(...t.xs),xmax=Math.max(...t.xs),xsn=niceScale(xmin,xmax);X=(_,v)=>m.l+(v-xsn.lo)/(xsn.hi-xsn.lo)*w;xticks=xsn.ticks.map(v=>[m.l+(v-xsn.lo)/(xsn.hi-xsn.lo)*w,fmt(v)]);}
  const px=(i)=>t.xs&&type!=='bar'?X(i,t.xs[i]):X(i);
  let g=`<rect width="${width}" height="${height}" rx="12" fill="#0e0a1c"/>`;
  ys.ticks.forEach(v=>{const y=Y(v);g+=`<line x1="${m.l}" x2="${m.l+w}" y1="${y}" y2="${y}" stroke="#ffffff1c"/><text x="${m.l-8}" y="${y+4}" text-anchor="end" fill="#a99cc4" font-size="11">${fmt(v)}</text>`;});
  const skip=Math.ceil(xticks.length/10);
  xticks.forEach(([x,l],i)=>{if(i%skip)return;g+=`<line x1="${x}" x2="${x}" y1="${m.t+h}" y2="${m.t+h+4}" stroke="#a99cc4"/><text x="${x}" y="${m.t+h+17}" text-anchor="middle" fill="#a99cc4" font-size="11">${esc(String(l).slice(0,14))}</text>`;});
  g+=`<line x1="${m.l}" x2="${m.l+w}" y1="${m.t+h}" y2="${m.t+h}" stroke="#a99cc4"/><line x1="${m.l}" x2="${m.l}" y1="${m.t}" y2="${m.t+h}" stroke="#a99cc4"/>`;
  if(type==='bar'){
    const group=w/n,bw=Math.min(46,group*.72/t.series.length);
    t.series.forEach((s,si)=>s.values.forEach((v,i)=>{if(v===null)return;const cx=m.l+group*(i+.5)-bw*t.series.length/2+bw*si;const y0=Y(0),y1=Y(v);g+=`<rect x="${cx}" y="${Math.min(y0,y1)}" width="${bw-2}" height="${Math.abs(y1-y0)||1}" rx="3" fill="${COLORS[si%6]}"><title>${esc(s.name)} · ${esc(t.labels[i])}: ${fmt(v)}</title></rect>`;}));
  }else{
    t.series.forEach((s,si)=>{const col=COLORS[si%6];const pts=s.values.map((v,i)=>v===null?null:[px(i),Y(v),v,i]).filter(Boolean);
      if(type==='line'&&pts.length>1)g+=`<polyline points="${pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linejoin="round"/>`;
      pts.forEach(p=>{g+=`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${type==='scatter'?4:3}" fill="${col}"><title>${esc(s.name)} · ${esc(t.labels[p[3]])}: ${fmt(p[2])}</title></circle>`;});});
  }
  if(chart.xLabel||t.xName)g+=`<text x="${m.l+w/2}" y="${height-24}" text-anchor="middle" fill="#cdbfe6" font-size="12">${esc(chart.xLabel||t.xName)}</text>`;
  if(chart.yLabel)g+=`<text transform="translate(14 ${m.t+h/2}) rotate(-90)" text-anchor="middle" fill="#cdbfe6" font-size="12">${esc(chart.yLabel)}</text>`;
  if(t.series.length>1||true){let lx=m.l;t.series.forEach((s,si)=>{g+=`<rect x="${lx}" y="${height-14}" width="10" height="10" rx="2" fill="${COLORS[si%6]}"/><text x="${lx+14}" y="${height-5}" fill="#cdbfe6" font-size="11">${esc(s.name.slice(0,22))}</text>`;lx+=26+Math.min(s.name.length,22)*6.4;});}
  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="chart-svg" role="img" aria-label="${esc(chart.title||'Biểu đồ')}" font-family="system-ui,Segoe UI,sans-serif">${g}</svg>`;
}

export function svgToPng(svg,name){
  const s=new XMLSerializer().serializeToString(new DOMParser().parseFromString(svg,'image/svg+xml').documentElement);
  const img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=1280;c.height=Math.round(1280*img.height/img.width)||680;c.getContext('2d').drawImage(img,0,0,c.width,c.height);c.toBlob(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=(name||'bieu-do')+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000);});};
  img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s);
}
