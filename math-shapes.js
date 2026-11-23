export const EXTRA_MODES={
 helix:{title:'Xoắn ốc 3D',label:'HELIX',description:'Đường xoắn chạy quanh một trục. Thay bán kính và số vòng để đổi cấu trúc.',equations:['x = a cos(bt)','y = 4(t / 2π − ½)','z = a sin(bt)'],a:{label:'a · Bán kính',min:.5,max:3,step:.1,value:2},b:{label:'b · Số vòng',min:1,max:12,step:1,value:5},note:'Đường xoắn mở; hai đầu không nối với nhau.'},
 spherical:{title:'Xoắn cầu',label:'SPHERICAL SPIRAL',description:'Một đường cong quấn trên mặt cầu, đi qua các cực và khép lại.',equations:['x = a sin(t) cos(bt)','y = a cos(t)','z = a sin(t) sin(bt)'],a:{label:'a · Bán kính cầu',min:1,max:3.5,step:.1,value:2.5},b:{label:'b · Mật độ vòng',min:2,max:24,step:1,value:12},note:'Mọi điểm đều nằm trên mặt cầu bán kính a.'},
 rose:{title:'Hoa thị 3D',label:'SPATIAL ROSE CURVE',description:'Hoa thị cực được nâng vào không gian bởi một dao động vuông góc.',equations:['r = a cos(bt)','x = r cos(t), z = r sin(t)','y = 0.9 sin(2bt)'],a:{label:'a · Bán kính cánh',min:.5,max:3.5,step:.1,value:2.7},b:{label:'b · Tần số cánh',min:2,max:10,step:1,value:5},note:'Cánh hoa và chiều cao cùng thay đổi nhịp khi đổi b.'},
 eight:{title:'Nút số tám',label:'FIGURE-EIGHT KNOT',description:'Một đường cong khép kín với bốn giao cắt trong hình chiếu thích hợp.',equations:['x = (a + 0.7 cos 2t) cos 3t','z = (a + 0.7 cos 2t) sin 3t','y = b sin 4t'],a:{label:'a · Bán kính chính',min:1.2,max:3,step:.1,value:2},b:{label:'b · Độ cao',min:.3,max:2,step:.1,value:1},note:'Kéo để xoay và xem các đoạn đường cong đi qua nhau trong không gian.'}
};
export function sampleShape(mode,t,a,b){
 if(mode==='helix')return [a*Math.cos(b*t),4*(t/(2*Math.PI)-.5),a*Math.sin(b*t)];
 if(mode==='spherical')return [a*Math.sin(t)*Math.cos(b*t),a*Math.cos(t),a*Math.sin(t)*Math.sin(b*t)];
 if(mode==='rose'){const r=a*Math.cos(b*t);return [r*Math.cos(t),.9*Math.sin(2*b*t),r*Math.sin(t)];}
 const r=a+.7*Math.cos(2*t);return [r*Math.cos(3*t),b*Math.sin(4*t),r*Math.sin(3*t)];
}
export function installShapeLibrary(select){
 const anchor=document.querySelector('.math-mode-tabs');
 if(!anchor||document.querySelector('#more-math-shapes'))return;
 const bar=document.createElement('div');bar.className='math-library-bar';
 const toggle=document.createElement('button');toggle.className='btn';toggle.id='more-math-shapes';toggle.type='button';toggle.textContent='+ Thêm dạng 3D';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','math-shape-library');
 const hint=document.createElement('span');hint.textContent='Khám phá thêm các đường cong trong không gian.';bar.append(toggle,hint);
 const library=document.createElement('div');library.id='math-shape-library';library.className='math-shape-library';library.hidden=true;library.setAttribute('aria-label','Thư viện mẫu hình 3D');
 for(const [key,config] of Object.entries(EXTRA_MODES)){
   const button=document.createElement('button');button.type='button';button.dataset.mathExtra=key;button.setAttribute('aria-pressed','false');
   const points=Array.from({length:400},(_,i)=>{const [x,y,z]=sampleShape(key,i/399*Math.PI*2,config.a.value,config.b.value);return `${80+(x-z*.4)*18},${48-y*13-z*4}`;}).join(' ');
   button.innerHTML=`<svg viewBox="0 0 160 96" aria-hidden="true"><polyline points="${points}" fill="none" stroke="#b69aef" stroke-width=".8"/></svg><strong>${config.title}</strong><small>Xoay 3D · Chỉnh tham số</small>`;
   button.addEventListener('click',()=>select(key));library.append(button);
 }
 toggle.addEventListener('click',()=>{library.hidden=!library.hidden;toggle.setAttribute('aria-expanded',String(!library.hidden));});
 anchor.after(bar,library);
}
