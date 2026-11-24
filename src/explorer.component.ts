import {AfterViewInit,Component,ElementRef,OnDestroy,ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
type Vector3Au={xAu:number;yAu:number;zAu:number};
type EphemerisBody={id:string;horizonsId:string;positionsAu:Vector3Au[]};
type Ephemeris={date:string;source:string;sampleDates:string[];bodies:EphemerisBody[];staleCache?:boolean};
type Planet={id:string;name:string;radiusKm:number;meanDistanceAu:number;orbitalPeriodDays:number;description:string};
const planets:Planet[]=[
{id:'mercury',name:'Mercury',radiusKm:2439.7,meanDistanceAu:.387,orbitalPeriodDays:87.97,description:'A heavily cratered rocky world.'},
{id:'venus',name:'Venus',radiusKm:6051.8,meanDistanceAu:.723,orbitalPeriodDays:224.7,description:'A bright planet beneath thick clouds.'},
{id:'earth',name:'Earth',radiusKm:6371,meanDistanceAu:1,orbitalPeriodDays:365.25,description:'Our ocean world, wrapped in clouds and a thin atmosphere.'},
{id:'mars',name:'Mars',radiusKm:3389.5,meanDistanceAu:1.524,orbitalPeriodDays:686.98,description:'The red planet, carved by canyons and volcanoes.'},
{id:'jupiter',name:'Jupiter',radiusKm:69911,meanDistanceAu:5.203,orbitalPeriodDays:4332.59,description:'A gas giant with spectacular cloud bands.'},
{id:'saturn',name:'Saturn',radiusKm:58232,meanDistanceAu:9.537,orbitalPeriodDays:10759.22,description:'A giant encircled by brilliant icy rings.'},
{id:'uranus',name:'Uranus',radiusKm:25362,meanDistanceAu:19.19,orbitalPeriodDays:30688.5,description:'A pale ice giant tipped on its side.'},
{id:'neptune',name:'Neptune',radiusKm:24622,meanDistanceAu:30.07,orbitalPeriodDays:60182,description:'A distant blue world with powerful winds.'}
];
@Component({selector:'app-root',standalone:true,imports:[CommonModule],template:`
<div class="shell"><header><div class="logo">✦ ORBIT<span>LAB</span> <small>EXPLORER / 04</small></div><div class="status">● LOCAL RENDER ENGINE / SOL SYSTEM</div></header>
<div #viewport class="viewport"></div>
<nav class="intro"><div class="eyebrow">IMMERSIVE SPACE EXPLORATION</div><h1>BEYOND<br><i>THE HORIZON.</i></h1><p>Travel between worlds. Explore the Solar System.</p><div class="planet-list"><button *ngFor="let p of planets;index as i" [class.active]="selected===p.id" (click)="focus(p.id)"><span class="index">{{i+1}}</span>{{p.name}}<span class="arrow">↗</span></button></div></nav>
<aside><small>NOW EXPLORING / {{planetIndex+1}} OF 8</small><h2>{{active.name | uppercase}}</h2><p>{{active.description}}</p><div class="stat"><span>MEAN RADIUS</span><b>{{active.radiusKm | number}} km</b></div><div class="stat"><span>MEAN SOLAR DISTANCE</span><b>{{active.meanDistanceAu}} AU</b></div><div class="stat"><span>ORBITAL PERIOD</span><b>{{active.orbitalPeriodDays | number}} days</b></div><button class="next" (click)="focus(planets[(planetIndex+1)%8].id)">NEXT DESTINATION ↗</button><div class="notice">{{textureStatus}}</div></aside>
<section class="asteroid-data" *ngIf="asteroidsVisible"><h3>NEAR-EARTH APPROACHES <button (click)="asteroidsVisible=false">✕</button></h3><p>Real NASA/JPL close-approach records — not impact predictions.</p><div class="asteroid-entry" *ngFor="let a of asteroids"><b>{{a["fullname"] || a["des"]}}</b><span>{{a["cd"]}}</span><span>{{a["dist"]}} AU · {{a["v_rel"]}} km/s</span></div><div class="notice">{{asteroidStatus}}</div></section><div class="controls"><button (click)="overview()">⊙ SYSTEM VIEW</button><button (click)="toggleAsteroids()">NASA ASTEROIDS</button><span>TIME</span><button *ngFor="let s of [0,1,10,100]" (click)="speed=s" [class.active]="speed===s">{{s===0?'PAUSE':s+'×'}}</button><button (click)="changeDate(-1)" aria-label="Previous UTC day">−1 DAY</button><input type="date" [value]="simulationDate" (change)="setDate($event)" aria-label="Simulation date in UTC" min="1900-01-02" max="2099-12-30"><button (click)="changeDate(1)" aria-label="Next UTC day">+1 DAY</button><button (click)="showOrbits=!showOrbits" [class.active]="showOrbits" [disabled]="ephemerisReady" title="Illustrative circular paths hidden in scientific mode">ORBITS</button><button (click)="focus(selected)">FOCUS</button><button (click)="toggleAutoOrbit()" [class.active]="autoOrbit">AUTO ORBIT</button></div><footer>DRAG TO ORBIT · SCROLL TO ZOOM · CLICK PLANETS · {{scienceStatus}} · DISPLAY DISTANCES COMPRESSED</footer></div>`})
export class AppComponent implements AfterViewInit,OnDestroy{
 @ViewChild('viewport',{static:true}) viewport!:ElementRef<HTMLDivElement>;
 planets=planets;selected='earth';speed=0;showOrbits=false;autoOrbit=false;simulationDate=new Date().toISOString().slice(0,10);scienceStatus='CONNECTING TO NASA/JPL...';ephemerisReady=false;private ephemeris?:Ephemeris;private fraction=0;private requestCounter=0;asteroidsVisible=false;asteroids:Record<string,string>[]=[];asteroidStatus='Not loaded';textureStatus='Loading local planetary textures...';
 get active(){return this.planets.find(p=>p.id===this.selected)??planets[2];}get planetIndex(){return this.planets.findIndex(p=>p.id===this.selected);}
 private scene=new THREE.Scene();private camera=new THREE.PerspectiveCamera(48,1,.1,3000);private renderer?:THREE.WebGLRenderer;private controls?:OrbitControls;private frame=0;private observer?:ResizeObserver;private last=0;
 private worlds:{p:Planet,mesh:THREE.Mesh,group:THREE.Group,orbit:number,radius:number,angle:number,cloud?:THREE.Mesh}[]=[];private lines:THREE.LineLoop[]=[];
 private travelTarget=new THREE.Vector3();private travelOffset=new THREE.Vector3(12,6,18);private overviewActive=false;private flight?:{elapsed:number,duration:number,fromPos:THREE.Vector3,fromTarget:THREE.Vector3,toPos:THREE.Vector3,toTarget:THREE.Vector3};private followedPosition=new THREE.Vector3();private textures:THREE.Texture[]=[];private down={x:0,y:0};
 private pointer=new THREE.Vector2();private ray=new THREE.Raycaster();
 ngAfterViewInit(){
 const host=this.viewport.nativeElement;
 this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',alpha:true});
 this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;
 this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.4;host.appendChild(this.renderer.domElement);
 this.camera.position.set(30,18,40);this.controls=new OrbitControls(this.camera,this.renderer.domElement);
 this.controls.enableDamping=true;this.controls.dampingFactor=.055;this.controls.rotateSpeed=.55;this.controls.zoomSpeed=.85;this.controls.enablePan=false;this.controls.minPolarAngle=.08;this.controls.maxPolarAngle=Math.PI-.08;this.controls.minDistance=2;this.controls.maxDistance=500;this.controls.addEventListener('start',()=>{this.flight=undefined;this.controls!.enabled=true;});
 this.scene.add(new THREE.AmbientLight(0x8c9dc0,.18));
 this.scene.add(new THREE.PointLight(0xffe7c4,7000));
 this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(5,64,48),new THREE.MeshBasicMaterial({color:0xffdb87})));
 const stars=new Float32Array(4500*3);for(let i=0;i<4500;i++){const a=Math.random()*6.283,u=Math.random()*2-1,r=600+Math.random()*600,k=Math.sqrt(1-u*u);stars[i*3]=r*k*Math.cos(a);stars[i*3+1]=r*u;stars[i*3+2]=r*k*Math.sin(a);}
 const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.BufferAttribute(stars,3));
 this.scene.add(new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xcfe0ff,size:1.4,sizeAttenuation:false})));
 const loader=new THREE.TextureLoader();const colors=[0xada69c,0xdfbe8c,0xffffff,0xbb7052,0xd3b18e,0xcdbb91,0x8fd5df,0x4e83d5];let loaded=0;
 planets.forEach((p,i)=>{
 const orbit=14+Math.pow(i+1,1.38)*9;const radius=Math.min(7,Math.max(1.4,Math.pow(p.radiusKm/6371,.42)*2.4));
 const group=new THREE.Group();this.scene.add(group);
 const mat=new THREE.MeshStandardMaterial({color:colors[i],roughness:1});
 const mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,96,64),mat);group.add(mesh);
 const world={p,group,mesh,orbit,radius,angle:1.5+i*2.35} as {p:Planet,group:THREE.Group,mesh:THREE.Mesh,orbit:number,radius:number,angle:number,cloud?:THREE.Mesh};this.worlds.push(world);
 loader.load('/textures/'+p.id+'.jpg',tex=>{tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=Math.min(8,this.renderer!.capabilities.getMaxAnisotropy());mat.map=tex;mat.color.set(0xffffff);mat.needsUpdate=true;this.textures.push(tex);loaded++;this.textureStatus='LOCAL PLANET TEXTURES '+loaded+'/8';},undefined,()=>{this.textureStatus='MAPS NOT INSTALLED: RUN npm run assets:download';});
 if(p.id==='earth'){
 const cloudsMat=new THREE.MeshStandardMaterial({transparent:true,opacity:.3,depthWrite:false,roughness:1});
 const clouds=new THREE.Mesh(new THREE.SphereGeometry(radius*1.012,72,48),cloudsMat);group.add(clouds);world.cloud=clouds;
 loader.load('/textures/earth-clouds.jpg',tex=>{tex.colorSpace=THREE.SRGBColorSpace;cloudsMat.map=tex;cloudsMat.alphaMap=tex;cloudsMat.needsUpdate=true;this.textures.push(tex);},undefined,()=>{clouds.visible=false;});
 const atmos=new THREE.Mesh(new THREE.SphereGeometry(radius*1.09,72,48),new THREE.ShaderMaterial({side:THREE.BackSide,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:'varying vec3 n;varying vec3 eye;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);eye=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 n;varying vec3 eye;void main(){float a=pow(1.-abs(dot(normalize(n),normalize(eye))),3.4);gl_FragColor=vec4(.14,.43,.9,a*.64);}'}));group.add(atmos);
 }
 if(p.id==='saturn'){const ring=new THREE.Mesh(new THREE.RingGeometry(radius*1.3,radius*2.4,160),new THREE.MeshBasicMaterial({color:0xe0cda8,transparent:true,opacity:.78,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2.2;group.add(ring);}
 const points=Array.from({length:256},(_,j)=>{const a=j/256*6.283185;return new THREE.Vector3(Math.cos(a)*orbit,0,Math.sin(a)*orbit);});
 const line=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x4c6d94,transparent:true,opacity:.32}));this.lines.push(line);this.scene.add(line);
 });
 this.renderer.domElement.addEventListener('pointerdown',this.onDown);this.renderer.domElement.addEventListener('pointerup',this.onUp);
 this.observer=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer!.setSize(w,h);}});this.observer.observe(host);this.focus('earth',true);this.frame=requestAnimationFrame(this.renderFrame);void this.loadEphemeris(this.simulationDate);fetch('http://localhost:8080/api/planets').then(response=>response.ok?response.json():Promise.reject('Backend offline')).then((data:Planet[])=>{if(data.length===8)this.planets=data;}).catch(()=>{console.info('OrbitLab: backend unavailable, using local planet catalog');});
 }
 async loadEphemeris(date:string){
  const request=++this.requestCounter;this.scienceStatus='LOADING NASA/JPL HORIZONS VECTORS';this.ephemerisReady=false;this.speed=0;this.fraction=0;
  try {
   const response=await fetch('http://localhost:8080/api/ephemerides?date='+encodeURIComponent(date));
   if(!response.ok)throw new Error('JPL backend HTTP '+response.status);
   const data=await response.json() as Ephemeris;
   if(!Array.isArray(data.bodies)||data.bodies.length!==8||data.bodies.some(b=>b.positionsAu?.length!==3))throw Error('Incomplete ephemerides response');
   if(request!==this.requestCounter)return;
   this.ephemeris=data;this.ephemerisReady=true;this.showOrbits=false;
   this.scienceStatus=(data.staleCache?'CACHED':'NASA/JPL')+' HELIOCENTRIC POSITIONS · ECLIPTIC J2000 · '+date+' UTC';
   this.updateWorldPositions();
  }catch(e){if(request!==this.requestCounter)return;this.ephemerisReady=false;this.scienceStatus='JPL UNAVAILABLE — ILLUSTRATIVE ORBITS (NOT SCIENTIFIC)';console.warn('OrbitLab Horizons error',e);}
 }
 setDate(event:Event){const input=event.target as HTMLInputElement;if(/^\d{4}-\d{2}-\d{2}$/.test(input.value)){this.simulationDate=input.value;void this.loadEphemeris(input.value);}}
 changeDate(delta:number){
  const date=new Date(this.simulationDate+'T00:00:00Z');
  date.setUTCDate(date.getUTCDate()+delta);
  const next=date.toISOString().slice(0,10);
  if(next<'1900-01-02'||next>'2099-12-30')return;
  this.simulationDate=next;void this.loadEphemeris(next);
 }
 private displayPosition(vector:Vector3Au):THREE.Vector3{
  // Real heliocentric direction; compressed radial distance so inner and outer planets remain explorable.
  const r=Math.hypot(vector.xAu,vector.yAu,vector.zAu);
  const radius=10+28*Math.sqrt(r);
  const scale=radius/Math.max(r,.000001);
  return new THREE.Vector3(vector.xAu*scale,vector.zAu*scale,vector.yAu*scale);
 }
 private updateWorldPositions(){
  if(!this.ephemerisReady||!this.ephemeris)return;
  for(const world of this.worlds){
   const body=this.ephemeris.bodies.find(b=>b.id===world.p.id);
   if(!body)continue;
   const a=this.displayPosition(body.positionsAu[1]);
   const b=this.displayPosition(body.positionsAu[2]);
   world.group.position.copy(a.lerp(b,this.fraction));
  }
 }
 async toggleAsteroids(){this.asteroidsVisible=!this.asteroidsVisible;if(!this.asteroidsVisible)return;this.asteroidStatus='Loading from Spring Boot and NASA/JPL...';try{const res=await fetch('http://localhost:8080/api/asteroids/close-approaches');if(!res.ok)throw Error('Backend returned '+res.status);const payload=await res.json() as {asteroids:Record<string,string>[],cached?:boolean};this.asteroids=payload.asteroids??[];this.asteroidStatus=payload.cached?'Showing cached JPL data':'NASA/JPL data received from Java backend';}catch(e){this.asteroidStatus='Could not load JPL data. Check backend connection.';}}
 focus(id:string,immediate=false){
 this.selected=id;this.overviewActive=false;
 const w=this.worlds.find(x=>x.p.id===id);if(!w||!this.controls)return;
 const distance=Math.max(w.radius*5.2,12);
 const direction=this.camera.position.clone().sub(this.controls.target).normalize();
 if(direction.lengthSq()<.001)direction.set(.5,.3,1).normalize();
 const destination=w.group.position.clone().addScaledVector(direction,distance);
 const target=w.group.position.clone();
 this.followedPosition.copy(target);
 this.startFlight(destination,target,immediate);
 }
 overview(){
 this.overviewActive=true;this.startFlight(new THREE.Vector3(0,155,215),new THREE.Vector3(),false);
 }
 toggleAutoOrbit(){
 this.autoOrbit=!this.autoOrbit;if(this.controls)this.controls.autoRotate=this.autoOrbit;
 }
 private startFlight(position:THREE.Vector3,target:THREE.Vector3,immediate:boolean){
 if(!this.controls)return;
 if(immediate){this.flight=undefined;this.camera.position.copy(position);this.controls.target.copy(target);this.controls.update();return;}
 this.flight={elapsed:0,duration:1.45,fromPos:this.camera.position.clone(),fromTarget:this.controls.target.clone(),toPos:position,toTarget:target};
 this.controls.enabled=false;
 }
 private onDown=(e:PointerEvent)=>{this.down={x:e.clientX,y:e.clientY};};
 private onUp=(e:PointerEvent)=>{if(Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)>5)return;const rect=this.renderer!.domElement.getBoundingClientRect();this.pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);const hit=this.ray.intersectObjects(this.worlds.map(w=>w.mesh),false)[0];const world=this.worlds.find(w=>w.mesh===hit?.object);if(world)this.focus(world.p.id);};
 private renderFrame=(now:number)=>{const dt=Math.min((now-this.last)/1000,.05);this.last=now;
 if(this.ephemerisReady){
  if(this.speed>0){
   this.fraction=Math.min(1,this.fraction+dt*this.speed/120);
   if(this.fraction>=1){this.speed=0;this.scienceStatus='NASA/JPL END OF LOADED DAY · SELECT NEXT DAY';}
  }
  this.updateWorldPositions();
 }else{
  for(const w of this.worlds){w.angle+=dt*this.speed*90/w.p.orbitalPeriodDays;w.group.position.set(Math.cos(w.angle)*w.orbit,0,Math.sin(w.angle)*w.orbit);}
 }
 for(const w of this.worlds){w.mesh.rotation.y+=dt*.04;if(w.cloud)w.cloud.rotation.y+=dt*.06;}
 this.lines.forEach(line=>line.visible=!this.ephemerisReady&&this.showOrbits);
 const current=this.worlds.find(w=>w.p.id===this.selected);
 if(this.controls){
  if(this.flight){
   const f=this.flight;f.elapsed+=dt;const progress=Math.min(1,f.elapsed/f.duration);
   const eased=1-Math.pow(1-progress,3);
   const movingTarget=!this.overviewActive&&current?current.group.position:new THREE.Vector3();
   const target=f.toTarget.clone().lerp(movingTarget,progress);
   const pos=f.toPos.clone().add(movingTarget.clone().sub(f.toTarget));
   this.camera.position.copy(f.fromPos).lerp(pos,eased);this.controls.target.copy(f.fromTarget).lerp(target,eased);
   if(progress>=1){this.flight=undefined;this.controls.enabled=true;this.followedPosition.copy(this.controls.target);}
  }else if(!this.overviewActive&&current){
   const displacement=current.group.position.clone().sub(this.followedPosition);
   this.camera.position.add(displacement);this.controls.target.add(displacement);
   this.followedPosition.copy(current.group.position);
  }
  this.controls.update(dt);
 }
 this.renderer?.render(this.scene,this.camera);this.frame=requestAnimationFrame(this.renderFrame);};
 ngOnDestroy(){cancelAnimationFrame(this.frame);this.observer?.disconnect();this.renderer?.domElement.removeEventListener('pointerdown',this.onDown);this.renderer?.domElement.removeEventListener('pointerup',this.onUp);this.controls?.dispose();this.scene.traverse(o=>{const m=o as THREE.Mesh;m.geometry?.dispose();if(m.material)(Array.isArray(m.material)?m.material:[m.material]).forEach(x=>x.dispose());});this.textures.forEach(x=>x.dispose());this.renderer?.dispose();}
}
