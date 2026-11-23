import {EXTRA_MODES,sampleShape,installShapeLibrary} from './math-shapes.js';
import * as THREE from './vendor/three.module.js';

const MODES={
  lorenz:{title:'Hệ Lorenz',label:'LORENZ ATTRACTOR',description:'Một quỹ đạo xoắn trong không gian pha. Thay tham số để khám phá cách hình dạng chuyển từ hội tụ sang phức tạp.',equations:['ẋ = σ(y − x)','ẏ = x(ρ − z) − y','ż = xy − βz'],a:{label:'ρ · Rho',min:1,max:50,step:.5,value:28},b:{label:'σ · Sigma',min:1,max:25,step:.5,value:10},note:'β = 8/3. Quỹ đạo được tích phân số bằng phương pháp Runge–Kutta bậc 4.'},
  lissajous:{title:'Đường Lissajous',label:'LISSAJOUS / HARMONIC MOTION',description:'Ba dao động vuông góc đan thành một đường cong. Tỉ lệ tần số thay đổi cách những nhịp sóng gặp nhau.',equations:['x = 2.7 sin(at + φ)','y = 2.1 sin(bt)','z = 1.8 sin(5t)'],a:{label:'a · Tần số trục x',min:1,max:9,step:1,value:3},b:{label:'b · Tần số trục y',min:1,max:9,step:1,value:2},note:'Pha φ biến thiên chậm khi chạy. Nhấn tạm dừng để quan sát một hình dạng cố định.'},
  torus:{title:'Nút xuyến',label:'TORUS KNOT / PARAMETRIC CURVE',description:'Một đường cong quấn quanh mặt xuyến. Hai số nguyên quyết định số vòng quay theo hai hướng.',equations:['x = (R + r cos qt) cos pt','y = (R + r cos qt) sin pt','z = r sin qt'],a:{label:'p · Vòng quanh trục',min:1,max:7,step:1,value:2},b:{label:'q · Vòng quanh ống',min:1,max:9,step:1,value:3},note:'R = 2, r = 0.8. Với p, q không nguyên tố cùng nhau, mô hình vẽ một thành phần của liên kết.'},
  interference:{title:'Giao thoa sóng',label:'INTERFERENCE / TWO COHERENT SOURCES',description:'Hai nguồn cùng pha phát ra sóng tròn. Các đỉnh và đáy chồng lên nhau tạo nên những vân giao thoa.',equations:['h = A(s₁ + s₂)','sᵢ = sin(krᵢ − 2t) / √(1 + 0.2rᵢ)','rᵢ = distance to source i'],a:{label:'A · Biên độ',min:.2,max:1.6,step:.1,value:.7},b:{label:'k · Số sóng',min:.5,max:4,step:.1,value:2},note:'Hai nguồn cách nhau 4 đơn vị. Mặt sóng là minh họa trực quan với độ suy giảm theo khoảng cách.'}
};
Object.assign(MODES,EXTRA_MODES);
const $=selector=>document.querySelector(selector);
export function createMathStudio({canvas,reducedMotion=false}){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(43,1,.1,100),target=new THREE.Vector3();
  let mode='lorenz',a=28,b=10,playing=!reducedMotion,speed=1,visible=false,time=0,yaw=-.45,elevation=.2,radius=11,width=0,height=0,last=0,lastDraw=0,drag=null,dirty=true;
  const content=new THREE.Group();scene.add(content);
  const grid=new THREE.GridHelper(18,36,0x274554,0x152b3d);grid.position.y=-3;grid.material.transparent=true;grid.material.opacity=.35;scene.add(grid);
  const axis=new THREE.AxesHelper(.8);axis.position.set(-3.6,-2.85,0);axis.material.transparent=true;axis.material.opacity=.35;scene.add(axis);
  const curves=new THREE.Group();content.add(curves);
  let geometry=null,line=null,points=null,surface=null,tracer=null,sourceA=null,sourceB=null,count=0;
  let surfacePositions=null,surfaceColors=null;
  const color=new THREE.Color(),c1=new THREE.Color('#4ba8d4'),c2=new THREE.Color('#93e6d8'),c3=new THREE.Color('#b08edb');
  function clearGeometry(){for(const child of [...curves.children]){curves.remove(child);child.geometry?.dispose();if(Array.isArray(child.material))child.material.forEach(m=>m.dispose());else child.material?.dispose();}geometry=line=points=surface=tracer=sourceA=sourceB=null;}
  function rk4(x,y,z,h){const f=(x,y,z)=>[b*(y-x),x*(a-z)-y,x*y-(8/3)*z];const k1=f(x,y,z),k2=f(x+h*k1[0]/2,y+h*k1[1]/2,z+h*k1[2]/2),k3=f(x+h*k2[0]/2,y+h*k2[1]/2,z+h*k2[2]/2),k4=f(x+h*k3[0],y+h*k3[1],z+h*k3[2]);return [x+h*(k1[0]+2*k2[0]+2*k3[0]+k4[0])/6,y+h*(k1[1]+2*k2[1]+2*k3[1]+k4[1])/6,z+h*(k1[2]+2*k2[2]+2*k3[2]+k4[2])/6];}
  function createLine(){
    count=mode==='lorenz'?8500:2401;const pos=new Float32Array(count*3),colors=new Float32Array(count*3);
    if(mode==='lorenz'){let x=.1,y=0,z=0;for(let i=0;i<count+800;i++){[x,y,z]=rk4(x,y,z,.006);if(i>=800)pos.set([x*.12,(z-25)*.12,y*.12],(i-800)*3);}}
    geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(pos,3));
    for(let i=0;i<count;i++){const t=i/(count-1);color.copy(t<.5?c1:c2).lerp(t<.5?c2:c3,t<.5?t*2:(t-.5)*2);colors.set([color.r,color.g,color.b],i*3);}geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
    line=new THREE.Line(geometry,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false}));curves.add(line);
    points=new THREE.Points(geometry,new THREE.PointsMaterial({size:mode==='lorenz'?.017:.025,vertexColors:true,transparent:true,opacity:.4,blending:THREE.AdditiveBlending,depthWrite:false}));curves.add(points);
    tracer=new THREE.Mesh(new THREE.SphereGeometry(.045,12,8),new THREE.MeshBasicMaterial({color:0xd5fff1}));curves.add(tracer);updateCurve();
  }
  function updateCurve(){if(!geometry||mode==='interference')return;const pos=geometry.attributes.position;
    if(mode!=='lorenz')for(let i=0;i<count;i++){const t=i/(count-1)*Math.PI*2;if(mode==='lissajous')pos.setXYZ(i,2.7*Math.sin(a*t+time*.11),2.1*Math.sin(b*t),1.8*Math.sin(5*t));else if(EXTRA_MODES[mode]){const p=sampleShape(mode,t,a,b);pos.setXYZ(i,...p);}else{const r=2+.8*Math.cos(b*t);pos.setXYZ(i,r*Math.cos(a*t),r*Math.sin(a*t),.8*Math.sin(b*t));}}
    pos.needsUpdate=true;geometry.computeBoundingSphere();
    const reveal=count;geometry.setDrawRange(0,reveal);
    const index=Math.min(count-1,Math.floor((time*.06%1)*(reveal-1)));tracer.position.fromBufferAttribute(pos,index);
  }
  function createSurface(){
    const n=55;surfacePositions=new Float32Array(n*n*3);surfaceColors=new Float32Array(n*n*3);const indices=[];
    for(let z=0;z<n;z++)for(let x=0;x<n;x++){const i=z*n+x;surfacePositions.set([(x/(n-1)-.5)*10,0,(z/(n-1)-.5)*8],i*3);if(x<n-1&&z<n-1)indices.push(i,i+1,i+n,i+1,i+n+1,i+n);}
    geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(surfacePositions,3));geometry.setAttribute('color',new THREE.BufferAttribute(surfaceColors,3));geometry.setIndex(indices);surface=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({vertexColors:true,wireframe:true,transparent:true,opacity:.55,side:THREE.DoubleSide}));curves.add(surface);
    sourceA=new THREE.Mesh(new THREE.SphereGeometry(.075,12,8),new THREE.MeshBasicMaterial({color:0xc1ffdd}));sourceB=sourceA.clone();sourceB.material=sourceA.material.clone();curves.add(sourceA,sourceB);updateSurface();
  }
  function waveHeight(x,z){const r1=Math.hypot(x+2,z),r2=Math.hypot(x-2,z);return a*(Math.sin(b*r1-2*time)/Math.sqrt(1+.2*r1)+Math.sin(b*r2-2*time)/Math.sqrt(1+.2*r2));}
  function updateSurface(){if(!surface)return;for(let i=0;i<surfacePositions.length;i+=3){const y=waveHeight(surfacePositions[i],surfacePositions[i+2]);surfacePositions[i+1]=y;const t=THREE.MathUtils.clamp((y/(a*2)+1)/2,0,1);color.copy(c1).lerp(c2,t);surfaceColors.set([color.r,color.g,color.b],i);}geometry.attributes.position.needsUpdate=true;geometry.attributes.color.needsUpdate=true;geometry.computeBoundingSphere();sourceA.position.set(-2,waveHeight(-2,0),0);sourceB.position.set(2,waveHeight(2,0),0);}
  function syncPlaying(){$('#math-play').textContent=playing?'Tạm dừng':'Chạy mô hình';$('#math-play').setAttribute('aria-pressed',String(playing));}
  function updateMode(value){mode=value;dirty=true;const config=MODES[mode];a=config.a.value;b=config.b.value;time=0;clearGeometry();if(mode==='interference'){createSurface();elevation=.58;radius=13;}else{createLine();elevation=.2;radius=11;}
    $('#math-title').textContent=config.title;$('#math-model-label').textContent=config.label;$('#math-description').textContent=config.description;$('#math-note').textContent=config.note;$('#math-equations').replaceChildren(...config.equations.map(text=>{const span=document.createElement('span');span.textContent=text;return span;}));
    for(const key of ['a','b']){const s=config[key],el=$('#math-param-'+key);el.min=s.min;el.max=s.max;el.step=s.step;el.value=s.value;$('#math-label-'+key).textContent=s.label;$('#math-output-'+key).value=String(s.value);}
    document.querySelectorAll('[data-math-mode],[data-math-extra]').forEach(button=>button.setAttribute('aria-pressed',String((button.dataset.mathMode||button.dataset.mathExtra)===mode)));
  }
  installShapeLibrary(updateMode);
  document.querySelectorAll('[data-math-mode]').forEach(button=>button.addEventListener('click',()=>updateMode(button.dataset.mathMode)));
  let pendingRebuild=false;
  for(const key of ['a','b'])$('#math-param-'+key).addEventListener('input',event=>{dirty=true;const value=Number(event.target.value);if(key==='a')a=value;else b=value;$('#math-output-'+key).value=String(value);if(mode==='lorenz')pendingRebuild=true;else if(mode==='interference')updateSurface();else updateCurve();});
  $('#math-speed').addEventListener('input',event=>{speed=Number(event.target.value);$('#math-output-speed').value=speed.toFixed(1).replace('.0','')+'×';});
  $('#math-play').addEventListener('click',()=>{playing=!playing;dirty=true;syncPlaying();});
  $('#math-reset').addEventListener('click',()=>{dirty=true;yaw=-.45;elevation=mode==='interference'?.58:.2;radius=mode==='interference'?13:11;});
  $('#math-defaults').addEventListener('click',()=>{speed=1;$('#math-speed').value=1;$('#math-output-speed').value='1×';updateMode(mode);});
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!drag)return;dirty=true;yaw-=(e.clientX-drag.x)*.008;elevation=THREE.MathUtils.clamp(elevation+(e.clientY-drag.y)*.006,-1.1,1.2);drag={x:e.clientX,y:e.clientY};});for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>drag=null);
  canvas.addEventListener('wheel',event=>{event.preventDefault();dirty=true;radius=THREE.MathUtils.clamp(radius+event.deltaY*.007,5,22);},{passive:false});
  function animate(timestamp){requestAnimationFrame(animate);if(!visible||document.hidden){last=timestamp;return;}if(timestamp-lastDraw<25)return;const dt=last?Math.min((timestamp-last)/1000,.06):0;last=timestamp;lastDraw=timestamp;
    const rect=canvas.getBoundingClientRect();if(rect.width<1||rect.height<1)return;if(width!==rect.width||height!==rect.height){dirty=true;width=rect.width;height=rect.height;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
    if(pendingRebuild){clearGeometry();time=0;createLine();pendingRebuild=false;}
    if(playing){dirty=true;time+=dt*speed;if(!drag)yaw+=dt*.035;if(mode==='interference')updateSurface();else updateCurve();}
    if(dirty){camera.position.set(Math.sin(yaw)*Math.cos(elevation)*radius,Math.sin(elevation)*radius,Math.cos(yaw)*Math.cos(elevation)*radius);camera.lookAt(target);renderer.render(scene,camera);dirty=false;}
  }
  updateMode('lorenz');syncPlaying();requestAnimationFrame(animate);
  return {setVisible(value){visible=value;last=0;if(value)dirty=true;}};
}
