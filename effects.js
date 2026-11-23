export function createAmbience({canvas,enabled=true,reducedMotion=false}){
  const context=canvas.getContext('2d');
  let active=enabled,width=0,height=0,lastFrame=0,clock=0,oldCard=null,lastData=0;
  const pointer={x:-1000,y:-1000};const mobile=matchMedia('(max-width: 720px)').matches;
  const dots=Array.from({length:mobile?27:65},(_,i)=>({x:((i*.61803398875)%1),y:((i*.41421356237+.13)%1),phase:i*2.39996,r:i%7===0?1.5:.7}));
  function resize(){width=innerWidth;height=innerHeight;const dpr=Math.min(devicePixelRatio,1.5);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);context?.setTransform(dpr,0,0,dpr,0,0);if(!active)context?.clearRect(0,0,width,height);}
  function render(time){requestAnimationFrame(render);if(!context||!active||document.hidden||reducedMotion)return;if(time-lastFrame<33)return;const dt=lastFrame?Math.min((time-lastFrame)/1000,.08):0;lastFrame=time;clock+=dt;context.clearRect(0,0,width,height);
    const points=dots.map(d=>{let x=d.x*width+Math.sin(clock*.1+d.phase)*24,y=d.y*height+Math.cos(clock*.08+d.phase)*20;const dx=x-pointer.x,dy=y-pointer.y,dist=Math.hypot(dx,dy);if(dist<150&&dist>0){const force=(150-dist)*.1;x+=dx/dist*force;y+=dy/dist*force;}return {x,y,r:d.r};});
    for(let i=0;i<points.length;i++){const a=points[i];for(let j=i+1;j<points.length;j++){const b=points[j],d=Math.hypot(a.x-b.x,a.y-b.y);if(d<135){context.strokeStyle=`rgba(100,172,183,${(1-d/135)*.16})`;context.lineWidth=.5;context.beginPath();context.moveTo(a.x,a.y);context.lineTo(b.x,b.y);context.stroke();}}context.fillStyle=a.r>1?'rgba(150,218,219,.6)':'rgba(110,162,184,.35)';context.beginPath();context.arc(a.x,a.y,a.r,0,Math.PI*2);context.fill();}
    // A few quiet superposed harmonics sweep through the ambient background.
    for(let k=0;k<3;k++){context.beginPath();for(let x=width*.42;x<width+5;x+=8){const u=x/width,y=height*.73+Math.sin(u*10-clock*.3+k*.4)*35+Math.sin(u*19+clock*.22)*13+k*8;if(x===width*.42)context.moveTo(x,y);else context.lineTo(x,y);}context.strokeStyle=`rgba(${k===2?'136,132,189':'92,167,178'},.06)`;context.lineWidth=.7;context.stroke();}
    if(clock-lastData>.65){lastData=clock;const binary=document.querySelector('.binary-flow');if(binary)binary.textContent=Array.from({length:4},(_,i)=>((Math.floor(clock*13)+i*7)%16).toString(2).padStart(4,'0')).join(' ');}
  }
  const finePointer=matchMedia('(hover: hover) and (pointer: fine)').matches;
  if(finePointer)document.addEventListener('pointermove',event=>{
    pointer.x=event.clientX;pointer.y=event.clientY;if(!active||reducedMotion)return;
    const card=event.target.closest('.portal,.project-card,.note-card,.resource-card');
    if(oldCard&&oldCard!==card){oldCard.style.setProperty('--tilt-x','0deg');oldCard.style.setProperty('--tilt-y','0deg');}
    oldCard=card;if(!card)return;const r=card.getBoundingClientRect(),x=event.clientX-r.left,y=event.clientY-r.top;
    card.style.setProperty('--pointer-x',`${x}px`);card.style.setProperty('--pointer-y',`${y}px`);card.style.setProperty('--tilt-x',`${-(y/r.height-.5)*3}deg`);card.style.setProperty('--tilt-y',`${(x/r.width-.5)*3}deg`);
  },{passive:true});
  document.addEventListener('pointerleave',()=>{pointer.x=pointer.y=-1000;});
  const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('in-view');observer.unobserve(entry.target);}});},{threshold:.08});
  const selector='.portal,.project-card,.note-card,.resource-card,.math-invitation,.stat';
  function observe(root){const elements=[...(root.matches?.(selector)?[root]:[]),...root.querySelectorAll(selector)];elements.forEach(el=>{if(el.classList.contains('motion-reveal'))return;el.classList.add('motion-reveal');observer.observe(el);});}
  if(!reducedMotion){document.body.classList.add('motion-ready');observe(document.body);new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)observe(node);}).observe(document.querySelector('#main'),{childList:true,subtree:true});}
  addEventListener('resize',resize,{passive:true});resize();requestAnimationFrame(render);
  return {setEnabled(value){active=value;lastFrame=0;if(!active){context?.clearRect(0,0,width,height);if(oldCard){oldCard.style.setProperty('--tilt-x','0deg');oldCard.style.setProperty('--tilt-y','0deg');}}}};
}
