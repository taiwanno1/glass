import * as THREE from 'three';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/manrope/latin-500.css';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const canvas = document.querySelector('#scene');
let renderer;
try { renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'}); }
catch { document.querySelector('#error').hidden=false; document.querySelector('#error').textContent='This light study needs WebGL. Please open it in a browser with hardware acceleration enabled.'; document.querySelector('#loading').hidden=true; throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setClearColor(0xf6f5f1); renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.15;
const scene=new THREE.Scene();scene.background=new THREE.Color('#f6f5f1');
const camera=new THREE.PerspectiveCamera(35,1,.1,70);
const pmrem=new THREE.PMREMGenerator(renderer);const env=pmrem.fromScene(new RoomEnvironment(),.04);scene.environment=env.texture;pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xffffff,0xd9c9aa,1.0));
const sunlight=new THREE.DirectionalLight(0xfff6dc,2.8);sunlight.position.set(-5,9,5);scene.add(sunlight);
const glass=new THREE.Group();scene.add(glass);
const radius=1.38;
let randState=731;function rand(){randState=(randState*1664525+1013904223)>>>0;return randState/4294967296;}
const palette=['#ffcf14','#f39512','#e73e29','#ce176c','#60279c','#174ed5','#00aab5','#0c986a','#8bbb25'];
const seeds=[];
// A hand-laid radial mosaic: small central panes and irregular outer fragments.
seeds.push({x:0,y:0});
for(let ring=1;ring<=4;ring++){let n=ring*8;for(let j=0;j<n;j++){let a=j/n*Math.PI*2+(ring%2)*.18+(rand()-.5)*.16;let r=ring/4*radius*.91+(rand()-.5)*.15;seeds.push({x:Math.cos(a)*r,y:Math.sin(a)*r});}}
for(const s of seeds){let a=(Math.atan2(s.y,s.x)+Math.PI)/(2*Math.PI);let idx=(Math.floor(a*9)+Math.floor(rand()*3))%palette.length;s.color=new THREE.Color(palette[idx]);s.rough=.1+rand()*.2;}
function clip(poly,nx,ny,d){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];let da=a.x*nx+a.y*ny-d,db=b.x*nx+b.y*ny-d;if(da<=0)out.push(a);if((da<0)!==(db<0)){let t=da/(da-db);out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}}return out;}
const boundaries=Array.from({length:96},(_,i)=>({x:Math.cos(i/96*Math.PI*2)*radius,y:Math.sin(i/96*Math.PI*2)*radius}));
const leadMaterial=new THREE.MeshStandardMaterial({color:0x37372e,metalness:.42,roughness:.62});
const panes=[];
const paneGeometries=[],leadGeometries=[];let sharedGlassMaterial;
seeds.forEach((s,idx)=>{let p=boundaries.map(v=>({...v}));for(const other of seeds){if(other===s)continue;let nx=other.x-s.x,ny=other.y-s.y;let d=(other.x**2+other.y**2-s.x**2-s.y**2)/2;p=clip(p,nx,ny,d);if(!p.length)break;}if(p.length<3)return;
 const shape=new THREE.Shape();p.forEach((v,i)=>{let x=s.x+(v.x-s.x)*.958,y=s.y+(v.y-s.y)*.958;i?shape.lineTo(x,y):shape.moveTo(x,y)});shape.closePath();
 const geo=new THREE.ExtrudeGeometry(shape,{depth:.052+rand()*.025,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:2,steps:1});
 const mat=new THREE.MeshPhysicalMaterial({color:s.color,metalness:.05,roughness:s.rough,transmission:.24,thickness:.09,ior:1.48,envMapIntensity:.45,clearcoat:.6,clearcoatRoughness:.2,emissive:s.color,emissiveIntensity:.07});
 mat.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vGlassPos;').replace('#include <begin_vertex>','#include <begin_vertex>\nvGlassPos=position;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vGlassPos;').replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>\n normal=normalize(normal + vec3(sin(vGlassPos.x*75.+sin(vGlassPos.y*42.)*2.)*.075,cos(vGlassPos.y*64.+sin(vGlassPos.x*35.)*2.)*.075,0.));`);};
 const vertexColors=new Float32Array(geo.attributes.position.count*3);for(let v=0;v<geo.attributes.position.count;v++){vertexColors[v*3]=s.color.r;vertexColors[v*3+1]=s.color.g;vertexColors[v*3+2]=s.color.b;}geo.setAttribute('color',new THREE.BufferAttribute(vertexColors,3));paneGeometries.push(geo);
 if(!sharedGlassMaterial){sharedGlassMaterial=mat;mat.vertexColors=true;mat.color.set(0xffffff);mat.emissive.set(0x222222);}else mat.dispose();
 const linePoints=p.map(v=>new THREE.Vector3(v.x,v.y,.037));linePoints.push(linePoints[0]);const curve=new THREE.CatmullRomCurve3(linePoints,false,'catmullrom',.01);leadGeometries.push(new THREE.TubeGeometry(curve,p.length*3,.014,5,false));
 panes.push({seed:s,p});
});
glass.add(new THREE.Mesh(mergeGeometries(paneGeometries),sharedGlassMaterial));
glass.add(new THREE.Mesh(mergeGeometries(leadGeometries),leadMaterial));
paneGeometries.forEach(g=>g.dispose());leadGeometries.forEach(g=>g.dispose());
const rim=new THREE.Mesh(new THREE.TorusGeometry(radius+.005,.033,10,160),leadMaterial);rim.position.z=.037;glass.add(rim);
// The receiver is shaded by a GPU photon-density render target, not a colored overlay.
const targetSize=innerWidth<700?768:1024;
const causticTarget=new THREE.WebGLRenderTarget(targetSize,targetSize,{type:THREE.HalfFloatType,depthBuffer:false,stencilBuffer:false});
const photonScene=new THREE.Scene();const photonCamera=new THREE.Camera();
const photonCount=innerWidth<700?145000:310000;
const positions=new Float32Array(photonCount*3),colors=new Float32Array(photonCount*3),ids=new Float32Array(photonCount);
for(let i=0;i<photonCount;i++){let a=rand()*Math.PI*2,r=Math.sqrt(rand())*radius,x=Math.cos(a)*r,y=Math.sin(a)*r;let nearest=Infinity,second=Infinity,s;
 for(let j=0;j<seeds.length;j++){let d=(x-seeds[j].x)**2+(y-seeds[j].y)**2;if(d<nearest){second=nearest;nearest=d;s=seeds[j];}else if(d<second)second=d;}
 positions[i*3]=x;positions[i*3+1]=y;positions[i*3+2]=.04;
 // Preserve the unlit shadows from the lead between the glass panes.
 const lead=THREE.MathUtils.smoothstep(second-nearest,.004,.021);colors[i*3]=s.color.r*lead;colors[i*3+1]=s.color.g*lead;colors[i*3+2]=s.color.b*lead;ids[i]=rand();}
const photonGeo=new THREE.BufferGeometry();photonGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));photonGeo.setAttribute('color',new THREE.BufferAttribute(colors,3));photonGeo.setAttribute('seed',new THREE.BufferAttribute(ids,1));
const photonMaterial=new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,vertexColors:true,uniforms:{glassMatrix:{value:new THREE.Matrix4()},resolution:{value:targetSize},strength:{value:1}},vertexShader:`
attribute float seed;
uniform mat4 glassMatrix;
uniform float resolution;
varying vec3 vColor;
varying float vPower;
void main(){
 vec2 p=position.xy;
 // Two scales of rolled-glass corrugation yield folds, cusps, and fine light filaments.
 float u=p.x*9.0+p.y*3.0;
 float v=p.y*12.0-p.x*2.0;
 vec2 slope=vec2(cos(u+sin(v*.65)*1.2)*.15+cos(p.x*37.+p.y*21.)*.035,
 sin(v+cos(u*.8)*1.1)*.15+sin(p.y*42.-p.x*17.)*.035);
 vec3 n=normalize(mat3(glassMatrix)*vec3(slope,1.0));
 vec3 incident=normalize(vec3(.58,-1.0,-.2));
 if(dot(n,incident)>0.)n=-n;
 float wavelength=seed;
 vec3 inside=refract(incident,n,1./(1.47+wavelength*.045));
 // Finite thickness and a rough rear surface alter the emerging ray.
 vec3 ray=normalize(mix(incident,inside,.50)+mat3(glassMatrix)*vec3(slope*1.2,0.));
 ray.y=min(ray.y,-.15);
 vec3 world=(glassMatrix*vec4(position,1.)).xyz;
 vec3 hit=world+ray*(-world.y/ray.y);
 gl_Position=vec4(hit.x/7.,-hit.z/7.,0.,1.);
 gl_PointSize=2.3;
 vColor=color;
 vPower=clamp(abs(dot(n,-incident))*.9+.25,.15,1.);
}`,fragmentShader:`varying vec3 vColor;varying float vPower;
void main(){float d=length(gl_PointCoord-.5)*2.;float spot=exp(-d*d*3.5);gl_FragColor=vec4(vColor*vPower*.48*spot,1.);}`});
const photons=new THREE.Points(photonGeo,photonMaterial);photons.frustumCulled=false;photonScene.add(photons);
const floorMaterial=new THREE.ShaderMaterial({uniforms:{lightMap:{value:causticTarget.texture},pixel:{value:1/targetSize},glassPosition:{value:new THREE.Vector3()},time:{value:0}},vertexShader:`varying vec3 vWorld;void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,fragmentShader:`
uniform sampler2D lightMap;uniform float pixel;uniform vec3 glassPosition;varying vec3 vWorld;
void main(){vec2 uv=vec2(vWorld.x/14.+.5,.5-vWorld.z/14.);vec3 c=texture2D(lightMap,uv).rgb;
vec3 bloom=vec3(0.);for(int i=0;i<8;i++){float a=float(i)*.7854;bloom+=texture2D(lightMap,uv+vec2(cos(a),sin(a))*pixel*5.).rgb;}bloom/=8.;
vec3 energy=c*.79+bloom*.28;
float illumination=max(energy.r,max(energy.g,energy.b));
vec3 saturated=pow(max(energy,vec3(0.)),vec3(.7));
vec3 paper=vec3(.921,.913,.888);
float ao=exp(-length((vWorld.xz-glassPosition.xz)/vec2(1.1,.55))*2.1)*.12;
float pool=exp(-dot(vWorld.xz-vec2(1.3,.3),vWorld.xz-vec2(1.3,.3))*.065);
paper-=ao;paper+=pool*.014;
float ink=clamp(illumination*2.5,0.,.91);
vec3 transmitted=saturated/(max(max(saturated.r,saturated.g),saturated.b)+.0001);
vec3 result=mix(paper,transmitted*.92+vec3(.08),ink);
result+=pow(max(energy,vec3(0.)),vec3(1.5))*.13;
gl_FragColor=vec4(result,1.);

#include <colorspace_fragment>
}`});
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),floorMaterial);floor.rotation.x=-Math.PI/2;scene.add(floor);
// Soft grounding shadow; the colored transmission carries the fine framing shadows.
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;const ctx=shadowCanvas.getContext('2d');const grad=ctx.createRadialGradient(64,64,0,64,64,64);grad.addColorStop(0,'rgba(40,35,20,0.18)');grad.addColorStop(.4,'rgba(40,35,20,0.07)');grad.addColorStop(1,'rgba(40,35,20,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.5,2.1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.set(-.8,.008,-.25);scene.add(shadow);
let targetX=.0,targetY=.0,currentX=0,currentY=0,active=false;const clock=new THREE.Clock();let lastMove=0;
function point(e){targetX=(e.clientX/innerWidth-.5)*2;targetY=(e.clientY/innerHeight-.5)*2;active=true;lastMove=performance.now();}
window.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||e.buttons)point(e)});canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);point(e)});canvas.addEventListener('keydown',e=>{if(e.key.startsWith('Arrow')){e.preventDefault();targetX=THREE.MathUtils.clamp(targetX+(e.key==='ArrowRight'?.15:e.key==='ArrowLeft'?-.15:0),-1,1);targetY=THREE.MathUtils.clamp(targetY+(e.key==='ArrowDown'?.15:e.key==='ArrowUp'?-.15:0),-1,1);active=true;}});document.querySelector('#reset').onclick=()=>{targetX=0;targetY=0;active=false;};
function resize(){let w=innerWidth,h=innerHeight;renderer.setSize(w,h);camera.aspect=w/h;const mobile=w<700;camera.position.set(mobile?7.8:7.8,mobile?10.7:8.7,mobile?14.5:12.7);camera.lookAt(mobile?new THREE.Vector3(-.2,1.3,0):new THREE.Vector3(-1.5,.7,0));camera.fov=mobile?43:34;camera.updateProjectionMatrix();}window.addEventListener('resize',resize);resize();
let first=true,frames=0,frameTime=0;
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05),t=clock.elapsedTime;const ease=1-Math.exp(-dt*4.2);currentX+=(targetX-currentX)*ease;currentY+=(targetY-currentY)*ease;
 glass.position.set(-.8,2.15,0);glass.rotation.set(-.78+currentY*.55,-.18+currentX*.8,-.18+currentX*.12);if(!active){glass.rotation.y+=Math.sin(t*.19)*.035;glass.rotation.x+=Math.cos(t*.16)*.018;}glass.updateMatrixWorld();photonMaterial.uniforms.glassMatrix.value.copy(glass.matrixWorld);floorMaterial.uniforms.glassPosition.value.copy(glass.position);
 renderer.setRenderTarget(causticTarget);renderer.setClearColor(0x000000);renderer.clear();renderer.render(photonScene,photonCamera);renderer.setRenderTarget(null);renderer.setClearColor(0xf6f5f1);renderer.render(scene,camera);
 if(first){document.querySelector('#loading').style.opacity=0;first=false;window.__CHROMA_READY__=true;}frames++;frameTime+=dt;if(frames===150){if(frameTime/frames>.032)renderer.setPixelRatio(Math.min(devicePixelRatio,1));}
}
animate();
window.__CHROMA__={renderer,scene,glass,camera,causticTarget,get orientation(){return {x:currentX,y:currentY}}};
