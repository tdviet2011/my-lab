import {polishChip} from './chip-polish.js';
import * as THREE from './vendor/three.module.js';

// All geometry and textures are generated locally. No network or 3D model files.
export function createChipScene({canvas,autoRotate=true,reducedMotion=false,ambienceEnabled=true,finish='spectrum',onState=()=>{}}){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setClearColor(0x000000,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.35;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(40,1,.1,80);
  const target=new THREE.Vector3(.35,.7,0);
  let yaw=.74,elevation=.58,radius=10.7,visible=true,rotating=autoRotate,exploded=false,explosion=0,dragging=false,lastPointer=null,moved=false;
  let width=0,height=0,lastTime=0;
  let welcomeMode=false,ambientMotion=ambienceEnabled;
  const finishes={spectrum:{label:'Titan quang phổ',colors:['#567c9d','#8b7da6','#a0a58b','#639c9e','#787ca7'],edge:0xb0a087,base:0x43576d,substrate:0x3b665e},copper:{label:'Đồng & tím',colors:['#8971a0','#a88688','#b99c77','#8479a4','#617da1'],edge:0xc3a275,base:0x625466,substrate:0x57556d},aurora:{label:'Cực quang',colors:['#548a96','#6aa597','#839ca8','#7d7baa','#6589af'],edge:0x91b8b0,base:0x425e74,substrate:0x345f67}};
  if(!Object.hasOwn(finishes,finish))finish='spectrum';
  const ambient=new THREE.AmbientLight(0xb9d8ff,.65);scene.add(ambient);
  const key=new THREE.DirectionalLight(0xcde4ff,3.8);key.position.set(-3,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-7;key.shadow.camera.right=7;key.shadow.camera.top=7;key.shadow.camera.bottom=-7;key.shadow.bias=-.001;scene.add(key);
  const rim=new THREE.DirectionalLight(0x91cfc9,1.25);rim.position.set(4,3,-3);scene.add(rim);
  const fill=new THREE.PointLight(0x5f8ef5,25,15);fill.position.set(-4,2,-2);scene.add(fill);
  const glow=new THREE.PointLight(0xb6d5dd,2.5,5);glow.position.set(0,1.5,0);scene.add(glow);
  const mat=(color,metalness=.5,roughness=.35)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
  const dark=mat(0x14232d,.7,.3),metal=mat(0x7f99aa,.85,.28),gold=mat(0xb99954,.82,.25);
  const cyan=new THREE.MeshBasicMaterial({color:0x66e8d8});
  function mesh(geometry,material,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function box(w,h,d,material,parent,x=0,y=0,z=0){return mesh(new THREE.BoxGeometry(w,h,d),material,parent,x,y,z);}
  function roundedPlate(w,d,h,material,parent,x=0,y=0,z=0){
    const shape=new THREE.Shape();const r=.09,hw=w/2,hd=d/2;
    shape.moveTo(-hw+r,-hd);shape.lineTo(hw-r,-hd);shape.quadraticCurveTo(hw,-hd,hw,-hd+r);shape.lineTo(hw,hd-r);shape.quadraticCurveTo(hw,hd,hw-r,hd);shape.lineTo(-hw+r,hd);shape.quadraticCurveTo(-hw,hd,-hw,hd-r);shape.lineTo(-hw,-hd+r);shape.quadraticCurveTo(-hw,-hd,-hw+r,-hd);
    const geo=new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.025,bevelThickness:.025});geo.rotateX(-Math.PI/2);geo.translate(0,-h/2,0);return mesh(geo,material,parent,x,y,z);
  }
  function canvasTexture(draw,w=1024,h=1024){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;}
  const platform=new THREE.Group();scene.add(platform);
  mesh(new THREE.CylinderGeometry(3.85,3.95,.19,80),mat(0x101e29,.65,.45),platform,0,-.43,0);
  const stageTop=mesh(new THREE.CylinderGeometry(3.82,3.82,.025,80),mat(0x172a36,.7,.4),platform,0,-.32,0);
  const ring=mesh(new THREE.TorusGeometry(3.84,.012,6,120),cyan,platform,0,-.33,0);ring.rotation.x=Math.PI/2;
  const ring2=mesh(new THREE.TorusGeometry(3.42,.004,4,100),new THREE.MeshBasicMaterial({color:0x36616b}),platform,0,-.303,0);ring2.rotation.x=Math.PI/2;
  const grid=new THREE.GridHelper(20,50,0x27404c,0x1d3541);grid.position.y=-.56;grid.material.transparent=true;grid.material.opacity=.15;scene.add(grid);
  const assembly=new THREE.Group();assembly.position.set(-.35,0,.25);scene.add(assembly);
  const boardTexture=canvasTexture((c,w,h)=>{
    c.fillStyle='#102c38';c.fillRect(0,0,w,h);
    c.strokeStyle='#37636b';c.lineWidth=2;
    for(let i=0;i<18;i++){
      const offset=85+i*48;c.beginPath();c.moveTo(offset,0);c.lineTo(offset,180+i%4*24);c.lineTo(offset+60,240+i%4*24);c.lineTo(offset+60,340);c.stroke();
      c.beginPath();c.moveTo(w-offset,h);c.lineTo(w-offset,h-180-i%4*24);c.lineTo(w-offset-60,h-240-i%4*24);c.lineTo(w-offset-60,h-340);c.stroke();
      c.beginPath();c.moveTo(0,offset);c.lineTo(145+i%3*30,offset);c.lineTo(220+i%3*30,offset+70);c.lineTo(330,offset+70);c.stroke();
      c.beginPath();c.moveTo(w,h-offset);c.lineTo(w-145-i%3*30,h-offset);c.lineTo(w-220-i%3*30,h-offset-70);c.lineTo(w-330,h-offset-70);c.stroke();
    }
    c.fillStyle='#8b9c7d';for(let i=0;i<70;i++){let x=35+(i*137)%950,y=35+(i*223)%950;if(x>320&&x<704&&y>320&&y<704)continue;c.beginPath();c.arc(x,y,3,0,Math.PI*2);c.fill();}
    c.strokeStyle='#78aaa3';c.lineWidth=3;c.strokeRect(18,18,w-36,h-36);
    c.fillStyle='#739993';c.font='18px monospace';c.fillText('MY LAB / SEMICONDUCTOR RESEARCH',55,h-45);
  });
  const boardMaterial=mat(0xffffff,.42,.5);boardMaterial.map=boardTexture;
  roundedPlate(5.25,4.4,.13,mat(0x122a32,.6,.4),assembly,0,-.05,0);
  const top=mesh(new THREE.PlaneGeometry(5.15,4.3),boardMaterial,assembly,0,.045,0);top.rotation.x=-Math.PI/2;
  for(const x of [-2.35,2.35])for(const z of [-1.9,1.9]){mesh(new THREE.CylinderGeometry(.095,.095,.16,16),metal,assembly,x,.04,z);mesh(new THREE.CylinderGeometry(.035,.035,.008,12),dark,assembly,x,.125,z);}
  // Passive components and memory packages around the central processor.
  for(const side of [-1,1]){
    for(let i=0;i<3;i++){
      const z=-1.3+i*.72;box(.5,.14,.34,dark,assembly,side*1.85,.13,z);
      for(let p=0;p<4;p++){const zz=z-.12+p*.08;box(.075,.035,.028,gold,assembly,side*1.85-.28,.08,zz);box(.075,.035,.028,gold,assembly,side*1.85+.28,.08,zz);}
    }
    for(let i=0;i<7;i++){
      const x=-.92+i*.31;box(.13,.11,.2,mat(i%2?0x334652:0x9eab9b,.6,.3),assembly,x,.105,side*1.78);
      box(.14,.05,.04,gold,assembly,x,.09,side*1.78+.115);box(.14,.05,.04,gold,assembly,x,.09,side*1.78-.115);
    }
  }
  const socket=new THREE.Group();assembly.add(socket);socket.position.y=.16;
  roundedPlate(2.48,2.48,.1,mat(0x283c44,.75,.32),socket);
  const balls=new THREE.Group();assembly.add(balls);
  for(let ix=0;ix<10;ix++)for(let iz=0;iz<10;iz++)mesh(new THREE.SphereGeometry(.042,8,6),metal,balls,-.95+ix*.21,.285,-.95+iz*.21);
  const substrate=new THREE.Group();assembly.add(substrate);substrate.position.y=.36;
  const substrateMaterial=mat(0x3b665e,.55,.42);roundedPlate(2.3,2.3,.1,substrateMaterial,substrate);
  const substrateTexture=canvasTexture((c,w,h)=>{
    c.fillStyle='#665347';c.fillRect(0,0,w,h);c.fillStyle='#65546b';c.fillRect(16,16,w/2-20,h-32);c.fillStyle='#3c5a59';c.fillRect(w/2+4,16,w/2-20,h-32);
    c.strokeStyle='#d0ab72';c.lineWidth=3;
    for(let i=0;i<20;i++){const p=45+i*48;c.beginPath();c.moveTo(p,8);c.lineTo(p,160+(i%3)*18);c.lineTo(p+24,205+(i%3)*18);c.lineTo(p+24,360);c.stroke();c.beginPath();c.moveTo(w-p,h-8);c.lineTo(w-p,h-160-(i%3)*18);c.lineTo(w-p-24,h-205-(i%3)*18);c.lineTo(w-p-24,h-360);c.stroke();}
    c.strokeStyle='#e0c39b';c.lineWidth=5;c.strokeRect(10,10,w-20,h-20);c.strokeStyle='#cbb57f';c.lineWidth=3;c.strokeRect(310,310,404,404);
    c.fillStyle='#d4bf8d';for(let i=0;i<16;i++){const p=70+i*59;c.fillRect(p,20,18,28);c.fillRect(p,h-48,18,28);c.fillRect(20,p,28,18);c.fillRect(w-48,p,28,18);}
  });
  const substrateTopMaterial=mat(0xffffff,.5,.42);substrateTopMaterial.map=substrateTexture;const substrateTop=mesh(new THREE.PlaneGeometry(2.25,2.25),substrateTopMaterial,substrate,0,.077,0);substrateTop.rotation.x=-Math.PI/2;
  for(let i=0;i<12;i++)for(let side=0;side<4;side++){
    const pad=box(.08,.012,.12,gold,substrate,-.98+i*.177,.058,1.03);pad.position.applyAxisAngle(new THREE.Vector3(0,1,0),side*Math.PI/2);pad.rotation.y=side*Math.PI/2;
  }
  const die=new THREE.Group();assembly.add(die);die.position.y=.46;
  const dieTex=canvasTexture((c,w,h)=>{
    c.fillStyle='#373e69';c.fillRect(0,0,w,h);
    const colors=['#527f85','#af916b','#8b74a4','#688da6','#8b967b','#5a6a9e'];
    for(let row=0;row<13;row++)for(let col=0;col<13;col++){
      const x=20+col*76,y=20+row*76;c.fillStyle=colors[(row*7+col*3)%colors.length];c.fillRect(x,y,69,69);
      c.strokeStyle='#d2c1a066';c.lineWidth=1;for(let line=0;line<7;line++){c.beginPath();c.moveTo(x+4,y+line*9+4);c.lineTo(x+65,y+line*9+4);c.stroke();}
    }
    c.fillStyle='#304c6b';c.fillRect(320,320,380,380);c.strokeStyle='#b6c2a6';c.lineWidth=5;c.strokeRect(320,320,380,380);
    for(let i=0;i<24;i++){c.strokeStyle=i%3===0?'#deb9a3':'#6dd5ce';c.lineWidth=2;c.beginPath();c.moveTo(340+i*14,0);c.lineTo(340+i*14,1024);c.stroke();}
  });
  const dieMat=mat(0xffffff,.65,.3);dieMat.map=dieTex;
  box(1.55,.085,1.55,mat(0x64677d,.8,.2),die);
  const dieSurface=mesh(new THREE.PlaneGeometry(1.53,1.53),dieMat,die,0,.045,0);dieSurface.rotation.x=-Math.PI/2;
  const lid=new THREE.Group();assembly.add(lid);lid.position.y=.65;
  const lidBodyMaterial=mat(0x43576d,.72,.34),lidEdgeMaterial=mat(0xb0a087,.8,.32);
  roundedPlate(2.02,2.02,.23,lidBodyMaterial,lid);
  roundedPlate(1.84,1.84,.015,lidEdgeMaterial,lid,0,.13,0);
  const finishMaterial=new THREE.MeshPhysicalMaterial({color:0xffffff,metalness:.58,roughness:.35,iridescence:.55,iridescenceIOR:1.35,iridescenceThicknessRange:[150,450],clearcoat:.4,clearcoatRoughness:.3});
  const finishSurface=mesh(new THREE.PlaneGeometry(1.81,1.81),finishMaterial,lid,0,.167,0);finishSurface.rotation.x=-Math.PI/2;
  function applyFinish(){
    const palette=finishes[finish];const old=finishMaterial.map;
    finishMaterial.map=canvasTexture((c,w,h)=>{const g=c.createLinearGradient(0,h*.15,w,h*.85);palette.colors.forEach((value,i)=>g.addColorStop(i/(palette.colors.length-1),value));c.fillStyle=g;c.fillRect(0,0,w,h);c.strokeStyle='#dbe8f51b';c.lineWidth=1;for(let y=0;y<h;y+=5){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}c.strokeStyle='#d5e3e82e';c.lineWidth=2;c.strokeRect(20,20,w-40,h-40);});
    finishMaterial.needsUpdate=true;old?.dispose();lidBodyMaterial.color.setHex(palette.base);lidEdgeMaterial.color.setHex(palette.edge);substrateMaterial.color.setHex(palette.substrate);
  }
  applyFinish();
  const labelTexture=canvasTexture((c,w,h)=>{
    c.clearRect(0,0,w,h);c.textAlign='center';c.fillStyle='#1c3542';c.lineWidth=5;c.strokeStyle='#1c3542';c.strokeRect(w*.42,h*.19,w*.16,h*.16);c.strokeRect(w*.46,h*.23,w*.08,h*.08);
    for(let i=0;i<3;i++){const off=w*(.45+i*.05);c.beginPath();c.moveTo(off,h*.15);c.lineTo(off,h*.19);c.moveTo(off,h*.35);c.lineTo(off,h*.39);c.stroke();}
    c.font='600 108px Segoe UI, sans-serif';c.fillText('MY LAB',w/2,h*.57);
    c.font='32px Consolas, monospace';c.fillStyle='#3d5662';c.fillText('S I L I C O N   /   I C',w/2,h*.7);c.font='24px Consolas, monospace';c.fillText('PERSONAL RESEARCH',w/2,h*.79);
  });
  const label=mesh(new THREE.PlaneGeometry(1.74,1.74),new THREE.MeshBasicMaterial({map:labelTexture,transparent:true,depthWrite:false}),lid,0,.172,0);label.rotation.x=-Math.PI/2;
  const outline=mesh(new THREE.TorusGeometry(1.43,.009,4,4),cyan,assembly,0,.2,0);outline.rotation.x=Math.PI/2;outline.rotation.z=Math.PI/4;outline.scale.set(1.1,1.1,1);
  // Moving luminous signal packets on actual trace paths.
  const signals=[];
  for(let side=0;side<4;side++)for(let i=0;i<3;i++){
    const points=[new THREE.Vector3(-.55+i*.55,.053,1.21),new THREE.Vector3(-.55+i*.55,.053,1.46),new THREE.Vector3(-.75+i*.55,.053,1.66),new THREE.Vector3(-.75+i*.55,.053,2.05)].map(p=>p.applyAxisAngle(new THREE.Vector3(0,1,0),side*Math.PI/2));
    const curve=new THREE.CurvePath();for(let p=0;p<points.length-1;p++)curve.add(new THREE.LineCurve3(points[p],points[p+1]));
    const geometry=new THREE.BufferGeometry().setFromPoints(points);assembly.add(new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0x3d9d98,transparent:true,opacity:.6})));
    const packet=mesh(new THREE.SphereGeometry(.025,8,6),cyan,assembly);signals.push({curve,packet,offset:(side*3+i)/12});
  }
  // A vertical wafer display gives context without competing with the main chip.
  const waferGroup=new THREE.Group();waferGroup.position.set(2.5,.85,-2);waferGroup.rotation.set(-.25,-.5,.08);scene.add(waferGroup);
  const waferTex=canvasTexture((c,w,h)=>{
    const grad=c.createLinearGradient(0,0,w,h);grad.addColorStop(0,'#6383b4');grad.addColorStop(.25,'#916f9e');grad.addColorStop(.5,'#b09c79');grad.addColorStop(.7,'#679e9d');grad.addColorStop(1,'#6b7eac');c.fillStyle=grad;c.fillRect(0,0,w,h);
    for(let row=0;row<20;row++)for(let col=0;col<20;col++){
      const x=col*52,y=row*52;c.strokeStyle='#263c5a';c.lineWidth=4;c.strokeRect(x,y,52,52);c.strokeStyle='#c5b49a77';c.lineWidth=1;c.strokeRect(x+6,y+6,40,40);c.strokeRect(x+11,y+11,15,25);c.fillStyle='#b8b5ab66';c.fillRect(x+30,y+11,9,26);
    }
  });
  const waferMat=mat(0xffffff,.8,.3);waferMat.map=waferTex;waferMat.side=THREE.DoubleSide;
  mesh(new THREE.CircleGeometry(1.18,80),waferMat,waferGroup);
  mesh(new THREE.TorusGeometry(1.19,.018,8,80),metal,waferGroup);
  const standBase=box(.5,.1,.4,dark,scene,2.5,-.2,-1.7),standStem=box(.065,.8,.065,metal,scene,2.5,.15,-1.7);
  // Sparse suspended particles; still when reduced motion is requested.
  const pts=new Float32Array(90);for(let i=0;i<30;i++){pts[i*3]=Math.sin(i*83)*5;pts[i*3+1]=.2+(i%7)*.5;pts[i*3+2]=Math.cos(i*61)*4;}
  const pointGeo=new THREE.BufferGeometry();pointGeo.setAttribute('position',new THREE.BufferAttribute(pts,3));
  const particles=new THREE.Points(pointGeo,new THREE.PointsMaterial({color:0x7bbbc2,size:.018,transparent:true,opacity:.5}));scene.add(particles);
  // Parametric orbits, wave fields, data rails and rotating crystal networks.
  const fx=new THREE.Group();scene.add(fx);fx.visible=ambientMotion;
  const haloMap=canvasTexture((c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'#dfffff');g.addColorStop(.13,'#6ee0d5aa');g.addColorStop(.38,'#5abed230');g.addColorStop(1,'#00000000');c.fillStyle=g;c.fillRect(0,0,w,h);},128,128);
  function glowSprite(color,size,parent,x,y,z){const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:haloMap,color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:.8}));sprite.position.set(x,y,z);sprite.scale.set(size,size,1);parent.add(sprite);return sprite;}
  const orbitalGroup=new THREE.Group();orbitalGroup.position.set(-.35,1.15,.25);fx.add(orbitalGroup);
  for(let k=0;k<2;k++){
    const points=[];for(let i=0;i<=400;i++){const t=i/400*Math.PI*2;points.push(new THREE.Vector3(3.1*Math.cos(t),.7*Math.sin(2*t+k*Math.PI/2),2.55*Math.sin(t)));}
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:k?0xa9a0df:0x6daeb5,transparent:true,opacity:k?.12:.2,blending:THREE.AdditiveBlending,depthWrite:false}));line.rotation.y=k*.8;orbitalGroup.add(line);
  }
  const networks=[];
  for(let side=0;side<2;side++){
    const group=new THREE.Group();group.position.set(side?3.1:-3.1,side?1.9:1.1,side?-1.3:1.1);group.scale.setScalar(side?.55:.47);fx.add(group);
    const geo=new THREE.IcosahedronGeometry(.85,1);group.add(new THREE.LineSegments(new THREE.WireframeGeometry(geo),new THREE.LineBasicMaterial({color:side?0x9bafc1:0x739aa8,transparent:true,opacity:.3})));
    const positions=geo.getAttribute('position');for(let i=0;i<positions.count;i+=3)glowSprite(i%2?0xe4d6a6:0x8cbede,.09,group,positions.getX(i),positions.getY(i),positions.getZ(i));networks.push(group);
  }
  const fieldCount=52*32,fieldPositions=new Float32Array(fieldCount*3),fieldColors=new Float32Array(fieldCount*3);
  for(let i=0;i<fieldCount;i++){const x=(i%52-26)*.27,z=(Math.floor(i/52)-16)*.32;fieldPositions.set([x,-.8,z-2],i*3);fieldColors.set([.22,.48+(i%7)*.02,.61],i*3);}
  const fieldGeometry=new THREE.BufferGeometry();fieldGeometry.setAttribute('position',new THREE.BufferAttribute(fieldPositions,3));fieldGeometry.setAttribute('color',new THREE.BufferAttribute(fieldColors,3));
  const field=new THREE.Points(fieldGeometry,new THREE.PointsMaterial({size:.013,vertexColors:true,transparent:true,opacity:.35,depthWrite:false}));fx.add(field);
  const rails=[];
  for(let k=0;k<4;k++){
    const tex=canvasTexture((c,w,h)=>{c.clearRect(0,0,w,h);c.font='14px Consolas, monospace';for(let i=0;i<28;i++){c.fillStyle=i%4?'#658d9c':'#9ab9c5';const row=Array.from({length:26},(_,j)=>((i*7+j*3+k)%5<2?'1':'0')).join(' ');c.fillText(row,5,18+i*34);}},256,1024);tex.wrapT=THREE.RepeatWrapping;
    const material=new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});const rail=mesh(new THREE.PlaneGeometry(.75,12),material,fx,(k-1.5)*2.6,-.68,-1);rail.rotation.x=-Math.PI/2;rail.rotation.z=.18;rails.push(tex);
  }
  const pulseNodes=[];for(let k=0;k<12;k++)pulseNodes.push(glowSprite(k%4===0?0xf0d492:0x73cdd1,.12,fx,0,0,0));
  const dieGlow=glowSprite(0x66c5bd,2.2,assembly,0,.7,0);dieGlow.material.opacity=.045;
  const updateChipDetail=polishChip(THREE,{scene,renderer,assembly,substrate,die,lid,canvasTexture});
  function notify(){onState({autoRotate:rotating,exploded,finishLabel:finishes[finish].label});}
  function reset(){yaw=.74;elevation=.58;radius=10.7;exploded=false;notify();}
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragging=true;moved=false;lastPointer={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-lastPointer.x,dy=e.clientY-lastPointer.y;lastPointer={x:e.clientX,y:e.clientY};if(Math.abs(dx)+Math.abs(dy)>1)moved=true;yaw-=dx*.007;elevation=THREE.MathUtils.clamp(elevation+dy*.005,.15,1.22);if(moved&&rotating){rotating=false;notify();}});
  function endDrag(){dragging=false;lastPointer=null;}canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);canvas.addEventListener('lostpointercapture',endDrag);
  canvas.addEventListener('wheel',e=>{e.preventDefault();radius=THREE.MathUtils.clamp(radius+e.deltaY*.006,6.5,15);},{passive:false});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();visible=false;});
  canvas.addEventListener('webglcontextrestored',()=>{visible=document.querySelector('#page-home')?.hidden===false;});
  let elapsed=0;
  function animate(time){requestAnimationFrame(animate);const dt=lastTime?Math.min((time-lastTime)/1000,.05):0;lastTime=time;if(!visible||document.hidden)return;elapsed+=dt;
    const r=canvas.getBoundingClientRect();if(r.width<1||r.height<1)return;
    if(width!==r.width||height!==r.height){width=r.width;height=r.height;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
    if(rotating&&!dragging)yaw+=dt*.095;
    const goal=exploded?1:0;explosion=reducedMotion?goal:THREE.MathUtils.damp(explosion,goal,5,dt);
    substrate.position.y=.36+explosion*.32;die.position.y=.46+explosion*1.05;lid.position.y=.65+explosion*1.85;
    updateChipDetail();
    balls.position.y=explosion*.1;lid.rotation.y=explosion*.045;
    for(const s of signals)s.packet.position.copy(s.curve.getPointAt(reducedMotion?s.offset:(elapsed*.22+s.offset)%1));
    if(!reducedMotion)particles.rotation.y=elapsed*.016;
    if(ambientMotion&&!reducedMotion){
      orbitalGroup.rotation.y=elapsed*.035;networks.forEach((g,i)=>{g.rotation.y=elapsed*(i?.13:-.1);g.rotation.z=Math.sin(elapsed*.2+i)*.2;});
      for(let i=0;i<fieldCount;i++){const x=fieldPositions[i*3],z=fieldPositions[i*3+2];fieldPositions[i*3+1]=-.95+Math.sin(x*.7+elapsed*.5)*Math.cos(z*.6-elapsed*.3)*.24;}fieldGeometry.attributes.position.needsUpdate=true;
      rails.forEach((tex,i)=>tex.offset.y=-elapsed*(.025+i*.007));
      pulseNodes.forEach((node,i)=>{const phase=(elapsed*.28+i/12)%1;node.position.set((i%2?1:-1)*(1.7+phase*2.2),-.18+phase*.9,4.5-phase*10);node.material.opacity=Math.sin(phase*Math.PI)*.65;});
    }
    dieGlow.position.y=.65+explosion*.75;
    target.y=.7+explosion*.35;camera.position.set(target.x+Math.sin(yaw)*Math.cos(elevation)*radius,target.y+Math.sin(elevation)*radius,target.z+Math.cos(yaw)*Math.cos(elevation)*radius);camera.lookAt(target);renderer.render(scene,camera);
  }
  notify();requestAnimationFrame(animate);
  return {setVisible(value){visible=value;},cycleFinish(){const keys=Object.keys(finishes);finish=keys[(keys.indexOf(finish)+1)%keys.length];applyFinish();notify();return finish;},setAmbience(value){ambientMotion=value;fx.visible=value;particles.visible=value;},setPresentation(value){if(welcomeMode===value)return;welcomeMode=value;exploded=value;radius=value?11.4:10.7;yaw=.74;elevation=value?.59:.58;platform.visible=!value;standBase.visible=!value;standStem.visible=!value;waferGroup.position.set(value?-.35:2.5,value?-.28:.85,value?.25:-2);waferGroup.rotation.set(value?-Math.PI/2:-.25,value?0:-.5,value?0:.08);waferGroup.scale.setScalar(value?2.85:1);notify();},setAutoRotate(value){rotating=value;notify();},toggleRotation(){rotating=!rotating;notify();},toggleExplode(){exploded=!exploded;notify();},reset};
}
