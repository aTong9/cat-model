import * as THREE from 'three'
import { normalizeSynthwaveWorld9038Config, SYNTHWAVE_QUALITY } from './SynthwaveWorld9038Config.js'

const TAU = Math.PI * 2
function rngFactory(seed = 9038) { let s = seed >>> 0; return () => ((s = Math.imul(s, 1664525) + 1013904223 >>> 0) / 4294967296) }
function mesh(geometry, material, name, x = 0, y = 0, z = 0) { const value = new THREE.Mesh(geometry, material); value.name = name; value.position.set(x, y, z); return value }
function standard(color, options = {}) { return new THREE.MeshStandardMaterial({ color, roughness: .82, metalness: .08, flatShading: true, ...options }) }
function setInstance(target, index, x, y, z, sx, sy, sz, ry = 0) { const helper = new THREE.Object3D(); helper.position.set(x, y, z); helper.scale.set(sx, sy, sz); helper.rotation.y = ry; helper.updateMatrix(); target.setMatrixAt(index, helper.matrix) }

function createTerrain(config) {
  const root = new THREE.Group(); root.name = 'terrain'
  const ground = mesh(new THREE.PlaneGeometry(config.worldSize, config.worldSize), standard('#100828', { emissive: '#07031b', emissiveIntensity: .5, roughness: .74 }), 'centralGridPlaza')
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.52; ground.receiveShadow = true; root.add(ground)

  const linePositions = [], half = config.playableRadius
  for (let value = -half; value <= half; value += config.gridSize) {
    linePositions.push(-half, -.505, value, half, -.505, value, value, -.505, -half, value, -.505, half)
  }
  const lineGeometry = new THREE.BufferGeometry(); lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))
  const grid = new THREE.LineSegments(lineGeometry, new THREE.LineBasicMaterial({ color: config.gridColor, transparent: true, opacity: config.gridBrightness, depthWrite: false }))
  grid.name = 'perspectiveNeonGrid'; root.add(grid)

  const roadMaterial = new THREE.MeshBasicMaterial({ color: '#190b3d', transparent: true, opacity: .72 })
  const mainRoads = new THREE.Group(); mainRoads.name = 'mainRoads'
  mainRoads.add(mesh(new THREE.PlaneGeometry(9, 94), roadMaterial, 'northSouthRoad', 0, -.515, 0), mesh(new THREE.PlaneGeometry(94, 9), roadMaterial, 'eastWestRoad', 0, -.514, 0))
  mainRoads.children.forEach(r => { r.rotation.x = -Math.PI / 2 }); root.add(mainRoads)
  const sideRoads = new THREE.Group(); sideRoads.name = 'sideRoads'; root.add(sideRoads)
  const platforms = new THREE.Group(); platforms.name = 'platforms'
  for (const [x, z] of [[0,-34],[34,0],[0,34],[-34,0]]) { const p = mesh(new THREE.CylinderGeometry(7, 7.5, .28, 8), standard('#1b0d3d', { emissive: '#151258', emissiveIntensity: .45 }), 'observationPlatform', x, -.38, z); platforms.add(p) }
  root.add(platforms)
  const ramps = new THREE.Group(); ramps.name = 'ramps'; root.add(ramps)
  const voidMesh = mesh(new THREE.RingGeometry(config.playableRadius + 1, config.worldSize * .66, 64), new THREE.MeshBasicMaterial({ color: '#050213' }), 'worldVoid'); voidMesh.rotation.x = -Math.PI / 2; voidMesh.position.y = -.56; root.add(voidMesh)
  return { root, grid }
}

function createBuildingInstances(name, count, radiusMin, radiusMax, color, neonColor, config, rng, colliders, collisionStride = 3) {
  const root = new THREE.Group(); root.name = name
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const buildings = new THREE.InstancedMesh(geometry, standard(color, { emissive: '#130525', emissiveIntensity: .32 }), count); buildings.name = `${name}Blocks`
  const trim = new THREE.InstancedMesh(new THREE.BoxGeometry(1.04, .035, 1.04), new THREE.MeshBasicMaterial({ color: neonColor, transparent: true, opacity: .7 }), count); trim.name = `${name}NeonEdges`
  for (let i = 0; i < count; i++) {
    const sector = i % 4, side = i % 2 ? 1 : -1, angle = sector * Math.PI / 2 + side * (.34 + rng() * .72), radius = radiusMin + rng() * (radiusMax - radiusMin)
    const x = Math.sin(angle) * radius, z = Math.cos(angle) * radius
    const sx = 1.4 + rng() * 3.2, sz = 1.4 + rng() * 3.2, sy = 3 + rng() * (name === 'distantSkyline' ? 12 : 9)
    setInstance(buildings, i, x, sy / 2 - .48, z, sx, sy, sz, -angle)
    setInstance(trim, i, x, sy - .44, z, sx, 1, sz, -angle)
    if (radiusMin < config.playableRadius && i % collisionStride === 0) colliders.push({ x, z, radius: Math.max(sx, sz) * .62, type: 'building' })
  }
  buildings.instanceMatrix.needsUpdate = true; trim.instanceMatrix.needsUpdate = true; root.add(buildings, trim); return root
}

function addArch(parent, name, x, z, rotation, color, colliders) {
  const arch = new THREE.Group(); arch.name = name; arch.position.set(x, 0, z); arch.rotation.y = rotation
  const material = standard('#1a0c35', { emissive: color, emissiveIntensity: .9 })
  arch.add(mesh(new THREE.BoxGeometry(.65, 5, .8), material, 'archPillarLeft', -3.1, 1.95, 0), mesh(new THREE.BoxGeometry(.65, 5, .8), material, 'archPillarRight', 3.1, 1.95, 0), mesh(new THREE.BoxGeometry(6.8, .55, .8), material, 'archBeam', 0, 4.2, 0))
  parent.add(arch); const c = Math.cos(rotation), s = Math.sin(rotation)
  for (const side of [-3.1, 3.1]) colliders.push({ x: x + c * side, z: z - s * side, radius: .65, type: 'arch' })
}

function createCity(config, profile, rng, colliders) {
  const root = new THREE.Group(); root.name = 'city'
  const near = createBuildingInstances('nearBuildings', profile.nearBuildings, 19, 38, '#160728', '#24cfee', config, rng, colliders, 2)
  const middle = createBuildingInstances('middleBuildings', profile.middleBuildings, 40, 54, '#3a0a4d', '#ee168e', config, rng, colliders, 8)
  const distant = createBuildingInstances('distantSkyline', profile.skylineBuildings, 55, 67, '#260738', '#8b176d', config, rng, colliders, 99)
  root.add(near, middle, distant)
  const towers = new THREE.Group(); towers.name = 'towers'
  for (const [x,z,h] of [[-24,-31,15],[29,-23,18],[27,29,13],[-30,25,16]]) { const tower = mesh(new THREE.CylinderGeometry(1.6, 2.3, h, 6), standard('#140626', { emissive: '#6d0c66', emissiveIntensity: .55 }), 'retroTower', x, h/2-.5, z); towers.add(tower); colliders.push({x,z,radius:2.4,type:'tower'}) }
  root.add(towers)
  const north = new THREE.Group(); north.name = 'northernSunsetBoulevard'
  for (const [x,h,w] of [[-18,8,5],[-13,12,4],[-8,7,4],[8,9,4],[13,14,4],[18,8,5]]) {
    const building = mesh(new THREE.BoxGeometry(w,h,4), standard('#10041f',{emissive:'#31063e',emissiveIntensity:.28}), 'sunsetSilhouette', x, h/2-.5, -48)
    north.add(building)
  }
  root.add(north)
  const east = new THREE.Object3D(); east.name = 'easternHighCity'; root.add(east)
  const south = new THREE.Object3D(); south.name = 'southernReturnDistrict'; root.add(south)
  const west = new THREE.Object3D(); west.name = 'westernRetroPromenade'; root.add(west)
  const arches = new THREE.Group(); arches.name = 'neonArches'; addArch(arches,'eastNeonArch',34,0,Math.PI/2,'#29d9ff',colliders); addArch(arches,'southPortalArch',0,34,0,'#ff168f',colliders); root.add(arches)
  const decks = new THREE.Group(); decks.name = 'observationDecks'; root.add(decks)
  return root
}

function createSun(config) {
  const material = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, uniforms: { topColor: { value: new THREE.Color(config.sunTopColor) }, bottomColor: { value: new THREE.Color(config.sunBottomColor) }, time: { value: 0 } }, vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}', fragmentShader: 'varying vec2 vUv; uniform vec3 topColor; uniform vec3 bottomColor; uniform float time; void main(){vec2 p=vUv*2.0-1.0; if(dot(p,p)>1.0) discard; float band=floor(vUv.y*15.0); float gap=step(0.16+vUv.y*.22,fract(vUv.y*15.0)); if(vUv.y<.72 && gap<.5) discard; vec3 c=mix(bottomColor,topColor,smoothstep(0.,1.,vUv.y)); gl_FragColor=vec4(c,0.96);}' })
  const sun = mesh(new THREE.PlaneGeometry(config.sunScale * 2, config.sunScale * 2), material, 'stripedSun', 0, 14, -61); sun.renderOrder = -2; return sun
}

function createSky(config, rng) {
  const root = new THREE.Group(); root.name = 'sky'
  const skyMaterial = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, vertexShader: 'varying vec3 vPos; void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'varying vec3 vPos; void main(){float h=clamp(vPos.y/70.+.30,0.,1.);vec3 low=vec3(.43,.015,.34);vec3 high=vec3(.025,.008,.16);gl_FragColor=vec4(mix(low,high,h),1.);}' })
  root.add(mesh(new THREE.SphereGeometry(config.worldSize * .72, 24, 12), skyMaterial, 'gradientSky'))
  const sun = createSun(config); root.add(sun)
  const glow = mesh(new THREE.CylinderGeometry(68, 68, .4, 64, 1, true), new THREE.MeshBasicMaterial({ color: config.horizonColor, transparent: true, opacity: .22, side: THREE.DoubleSide, depthWrite: false }), 'horizonGlow', 0, 2.2, 0); root.add(glow)
  const haze = mesh(new THREE.TorusGeometry(59, 5, 6, 64), new THREE.MeshBasicMaterial({ color: '#a20e7d', transparent: true, opacity: .12, depthWrite: false }), 'haze', 0, 2, 0); haze.rotation.x = Math.PI/2; root.add(haze)
  const starPositions = []; for(let i=0;i<120;i++){const a=rng()*TAU,r=34+rng()*34;starPositions.push(Math.cos(a)*r,7+rng()*34,Math.sin(a)*r)}
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3)); const stars = new THREE.Points(starGeo,new THREE.PointsMaterial({color:'#ceb6ff',size:.12,transparent:true,opacity:.6,depthWrite:false,fog:false})); stars.name='stars'; root.add(stars)
  return { root, sun, glow }
}

function createPalm(x,z,rotation,color) {
  const palm = new THREE.Group(); palm.position.set(x,0,z); palm.rotation.y=rotation
  palm.add(mesh(new THREE.CylinderGeometry(.11,.18,4.8,6),standard('#2a0a39',{emissive:color,emissiveIntensity:.25}),'palmTrunk',0,1.9,0))
  const leafMat = new THREE.MeshBasicMaterial({color,transparent:true,opacity:.78}); for(let i=0;i<7;i++){const leaf=mesh(new THREE.ConeGeometry(.18,2.2,4),leafMat,'palmLeaf',0,4.3,0); leaf.rotation.z=Math.PI/2.8; leaf.rotation.y=i*TAU/7; leaf.position.x=Math.cos(i*TAU/7)*.65; leaf.position.z=Math.sin(i*TAU/7)*.65; palm.add(leaf)} return palm
}

function createDecorations(config, profile, rng, colliders) {
  const root = new THREE.Group(); root.name='decorations'; const palms = new THREE.Group(); palms.name='neonPalms'
  for(let i=0;i<profile.palms;i++){const a=Math.PI*1.5+(rng()-.5)*1.2,r=20+rng()*18,x=Math.cos(a)*r,z=Math.sin(a)*r;palms.add(createPalm(x,z,-a,i%2?'#29d9ff':'#ff168f')); if(i%3===0)colliders.push({x,z,radius:.7,type:'palm'})} root.add(palms)
  const signs=new THREE.Group(); signs.name='geometricSigns'; for(let i=0;i<8;i++){const sign=mesh(new THREE.TorusGeometry(.7+i%2*.3,.08,6,4),new THREE.MeshBasicMaterial({color:i%2?'#29d9ff':'#ff168f'}),'abstractNeonSign',-34+i%4*3,2.3,18+Math.floor(i/4)*6);sign.rotation.y=Math.PI/2;signs.add(sign)}root.add(signs)
  const floating=new THREE.Group(); floating.name='floatingShapes'; for(let i=0;i<10;i++)floating.add(mesh(new THREE.OctahedronGeometry(.25+i%3*.12),new THREE.MeshBasicMaterial({color:i%2?'#29d9ff':'#ff4caf'}),'floatingShape',(rng()-.5)*55,4+rng()*6,(rng()-.5)*55));root.add(floating)
  const markers=new THREE.Group();markers.name='lightMarkers';root.add(markers);return {root,palms,floating}
}

function createEffects(config,profile,rng){const root=new THREE.Group();root.name='effects';const pulse=new THREE.Object3D();pulse.name='gridPulse';root.add(pulse);const dataPositions=[];for(let i=0;i<profile.particles;i++)dataPositions.push((rng()-.5)*90,rng()*12,(rng()-.5)*90);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(dataPositions,3));const particles=new THREE.Points(geo,new THREE.PointsMaterial({color:'#36e4ff',size:.12,transparent:true,opacity:config.particlesEnabled?.45:0,depthWrite:false}));particles.name='dataParticles';root.add(particles);const flying=new THREE.Group();flying.name='flyingLights';for(let i=0;i<profile.flyingLights;i++)flying.add(mesh(new THREE.BoxGeometry(.35,.035,.035),new THREE.MeshBasicMaterial({color:i%2?'#29d9ff':'#ff168f'}),'flyingLight',(rng()-.5)*70,5+rng()*9,(rng()-.5)*70));root.add(flying);const heat=new THREE.Object3D();heat.name='heatDistortion';root.add(heat);const step=mesh(new THREE.RingGeometry(.45,.62,24),new THREE.MeshBasicMaterial({color:'#29d9ff',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}),'catStepGlow');step.rotation.x=-Math.PI/2;step.position.y=-.49;root.add(step);return{root,particles,flying,step}}

function createLighting(config){const root=new THREE.Group();root.name='lighting';const ambient=new THREE.HemisphereLight('#542a88','#08031b',1.55);ambient.name='ambientLight';root.add(ambient);const sunset=new THREE.DirectionalLight('#ffad5a',1.6);sunset.name='sunsetLight';sunset.position.set(0,12,-25);root.add(sunset);const cyan=new THREE.PointLight('#29d9ff',config.dynamicLightsEnabled?16:0,34,2);cyan.name='cyanRimLight';cyan.position.set(0,2,7);root.add(cyan);const horizon=new THREE.PointLight('#ff168f',config.dynamicLightsEnabled?10:0,48,2);horizon.name='horizonLight';horizon.position.set(0,5,-24);root.add(horizon);return{root,cyan,horizon}}

export function createSynthwaveWorld9038(overrides={}){
  const config=normalizeSynthwaveWorld9038Config(overrides),profile=SYNTHWAVE_QUALITY[config.quality],rng=rngFactory(),colliders=[];const world=new THREE.Group();world.name='synthwaveWorld9038';world.userData.targetTokenId='9038';world.userData.config=config
  const terrain=createTerrain(config),city=createCity(config,profile,rng,colliders),sky=createSky(config,rng),decorations=createDecorations(config,profile,rng,colliders),effects=createEffects(config,profile,rng),lighting=createLighting(config)
  const navigation=new THREE.Group();navigation.name='navigation';const spawn=new THREE.Object3D();spawn.name='spawnPoint';spawn.userData.spawn={facing:[0,0,-1]};navigation.add(spawn);const walkable=new THREE.Object3D();walkable.name='walkableAreas';navigation.add(walkable);const debug=new THREE.Group();debug.name='colliders';debug.visible=config.debug.showColliders;navigation.add(debug);const boundary=new THREE.Object3D();boundary.name='worldBoundaries';navigation.add(boundary)
  const modules={terrain:terrain.root,city,sky:sky.root,decorations:decorations.root,effects:effects.root,lighting:lighting.root,navigation};world.add(...Object.values(modules));world.visible=config.enabled
  let disposed=false,characterState=null,previous=0
  function sampleSurfaceHeight(){return-.52} function sampleCharacterGroundY(){return 0}
  function resolveMovement(current,proposed){const next=proposed.clone();let collided=false;const distance=Math.hypot(next.x,next.z),max=config.playableRadius-.7;if(distance>max){next.x*=max/distance;next.z*=max/distance;collided=true}if(config.collisionEnabled)for(const c of colliders){let dx=next.x-c.x,dz=next.z-c.z,d=Math.hypot(dx,dz),minimum=c.radius+.44;if(d<minimum){if(d<.001){dx=1;dz=0;d=1}next.x=c.x+dx/d*minimum;next.z=c.z+dz/d*minimum;collided=true}}next.y=0;return{position:next,collided}}
  function update(time){if(disposed)return;const dt=Math.min(Math.max(time-previous,0),.05);previous=time;if(config.gridPulseEnabled)terrain.grid.material.opacity=config.gridBrightness*(.88+Math.sin(time*config.gridFlowSpeed)*.1);sky.sun.material.uniforms.time.value=time;sky.glow.material.opacity=.18+Math.sin(time*.24)*.035;decorations.floating.children.forEach((o,i)=>{o.position.y+=Math.sin(time*.55+i)*dt*.08;o.rotation.y+=dt*.16});effects.particles.rotation.y=time*.006;effects.flying.children.forEach((o,i)=>{o.position.x+=dt*(.35+i%3*.12);if(o.position.x>45)o.position.x=-45});if(characterState&&config.catStepGlowEnabled){effects.step.position.x=characterState.position?.x||0;effects.step.position.z=characterState.position?.z||0;effects.step.material.opacity=characterState.moving?.22+Math.sin(time*6)*.06:0;const scale=1+(time%1.2)*.25;effects.step.scale.setScalar(scale)}lighting.cyan.intensity=(config.dynamicLightsEnabled?16:0)+Math.sin(time*.7)*1.5}
  function dispose(){if(disposed)return;disposed=true;world.traverse(o=>{o.geometry?.dispose?.();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose?.());else o.material?.dispose?.()});world.removeFromParent()}
  const runtime=Object.freeze({config,world,modules:Object.freeze(modules),colliders,sampleSurfaceHeight,sampleCharacterGroundY,resolveMovement,setCharacterState(v){characterState=v},update,setEnabled(v){world.visible=Boolean(v)},setModuleVisible(name,v){if(modules[name])modules[name].visible=Boolean(v)},setDebugColliders(v){debug.visible=Boolean(v)},dispose});Object.defineProperty(world,'environmentRuntime',{value:runtime});world.userData.update=t=>runtime.update(t);return runtime
}
