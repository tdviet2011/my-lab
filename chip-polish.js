export function polishChip(T,{scene,renderer,assembly,substrate,die,lid,canvasTexture}){
 // Procedural studio reflections: no external HDR or image dependency.
 const env=canvasTexture((c,w,h)=>{const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#829bc2');g.addColorStop(.42,'#273048');g.addColorStop(.55,'#070c18');g.addColorStop(1,'#25223a');c.fillStyle=g;c.fillRect(0,0,w,h);c.shadowBlur=45;c.shadowColor='#dceaff';c.fillStyle='#d9e9ff';c.fillRect(w*.12,h*.18,w*.24,h*.1);c.fillStyle='#c7a6eb';c.fillRect(w*.62,h*.15,w*.12,h*.4);c.shadowColor='#ffe5ba';c.fillStyle='#edd4a8';c.fillRect(w*.83,h*.35,w*.06,h*.3);},1024,512);
 env.mapping=T.EquirectangularReflectionMapping;
 const pmrem=new T.PMREMGenerator(renderer);const environment=pmrem.fromEquirectangular(env);scene.environment=environment.texture;env.dispose();pmrem.dispose();
 const gold=new T.MeshStandardMaterial({color:0xdfb77d,metalness:.88,roughness:.22});
 const copper=new T.MeshStandardMaterial({color:0xa96f4c,metalness:.9,roughness:.28});
 const under=new T.Mesh(new T.BoxGeometry(1.78,.045,1.78),copper);under.position.y=-.145;lid.add(under);
 // Instanced interconnects preserve depth without adding one draw call per pin.
 const pins=new T.InstancedMesh(new T.CylinderGeometry(.014,.014,1,7),gold,64);assembly.add(pins);
 const transform=new T.Object3D(),up=new T.Vector3(0,1,0),direction=new T.Vector3(),start=new T.Vector3(),end=new T.Vector3();let last=-1;
 function update(){const height=substrate.position.y;if(Math.abs(last-height)<.00001)return;last=height;
   for(let i=0;i<64;i++){const side=Math.floor(i/16),u=-.93+(i%16)*.124,angle=side*Math.PI/2;start.set(u,.12,1.17).applyAxisAngle(up,angle);end.set(u,height-.045,1.06).applyAxisAngle(up,angle);direction.subVectors(end,start);transform.position.copy(start).add(end).multiplyScalar(.5);transform.quaternion.setFromUnitVectors(up,direction.clone().normalize());transform.scale.set(1,direction.length(),1);transform.updateMatrix();pins.setMatrixAt(i,transform.matrix);}pins.instanceMatrix.needsUpdate=true;
 }
 const bonds=new T.Group();die.add(bonds);
 for(let side=0;side<4;side++)for(let i=0;i<12;i++){
   const u=-.66+i*.12,angle=side*Math.PI/2;
   const points=[new T.Vector3(u,.015,.76),new T.Vector3(u,.11,.88),new T.Vector3(u,-.02,.98)].map(p=>p.applyAxisAngle(up,angle));
   const curve=new T.CatmullRomCurve3(points);bonds.add(new T.Mesh(new T.TubeGeometry(curve,8,.004,4,false),gold));
 }
 // Fine etched metal seams catch the reflected softboxes.
 for(const z of [-.93,.93]){const edge=new T.Mesh(new T.BoxGeometry(1.83,.008,.012),gold);edge.position.set(0,.15,z);lid.add(edge);}
 return update;
}
