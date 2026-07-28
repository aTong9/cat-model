import * as THREE from 'three'

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .7, ...extra })
const glow = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra })
const mesh = (geometry, material, x, y, z, name) => {
  const item = new THREE.Mesh(geometry, material)
  item.position.set(x, y, z); item.name = name
  item.castShadow = true; item.receiveShadow = true
  return item
}

function galactic() {
  const root = new THREE.Group(); root.name = 'GalacticVoyageScene'
  const moving = []
  const stars = new Float32Array(360)
  for (let i = 0; i < stars.length; i += 3) {
    stars[i] = (Math.random() - .5) * 10
    stars[i + 1] = Math.random() * 6 - .6
    stars[i + 2] = -2.5 - Math.random() * 3
  }
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(stars, 3))
  const starField = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#f4f2ff', size: .045, transparent: true, opacity: .85 }))
  starField.name = 'StarField'; root.add(starField)

  const planet = new THREE.Group(); planet.name = 'RingedPlanet'; planet.position.set(-2.35, 2.25, -2.6)
  planet.add(mesh(new THREE.SphereGeometry(.72, 28, 20), mat('#ee6874', { emissive: '#381420' }), 0, 0, 0, 'Planet'))
  const ring = mesh(new THREE.TorusGeometry(1.0, .055, 10, 64), glow('#ffc5d3'), 0, 0, 0, 'PlanetRing')
  ring.rotation.set(1.1, 0, -.32); planet.add(ring); root.add(planet); moving.push(planet)

  const moon = mesh(new THREE.SphereGeometry(.52, 22, 16), mat('#686d6b'), 2.2, 2.8, -3.2, 'Moon')
  root.add(moon); moving.push(moon)
  const comet = new THREE.Group(); comet.name = 'Comet'; comet.position.set(.2, 3.15, -2.1)
  comet.add(mesh(new THREE.SphereGeometry(.09, 12, 8), glow('#dcffff'), 0, 0, 0, 'CometHead'))
  const tail = mesh(new THREE.ConeGeometry(.12, 1.15, 10), glow('#35dfdc', { transparent: true, opacity: .72 }), -.48, .40, 0, 'CometTail')
  tail.rotation.z = -2.26; comet.add(tail); root.add(comet); moving.push(comet)

  const rocket = new THREE.Group(); rocket.name = 'Rocket'; rocket.position.set(2.2, .25, -1.9); rocket.rotation.z = -.8
  rocket.add(mesh(new THREE.CapsuleGeometry(.11, .38, 6, 12), mat('#e9f1ff'), 0, 0, 0, 'RocketBody'))
  rocket.add(mesh(new THREE.ConeGeometry(.09, .35, 10), glow('#ff9d20'), 0, -.43, 0, 'RocketFlame'))
  root.add(rocket); moving.push(rocket)

  root.userData.update = (t) => {
    starField.rotation.z = t * .012
    planet.rotation.y = t * .12; moon.rotation.y = -t * .09
    comet.position.x = Math.sin(t * .35) * 1.1; comet.position.y = 3 + Math.cos(t * .35) * .35
    rocket.position.y = .25 + Math.sin(t * 1.8) * .18
    rocket.children[1].scale.y = .75 + Math.sin(t * 8) * .25
  }
  return root
}

function thunder() {
  const root = new THREE.Group(); root.name = 'ThunderousMightScene'
  const clouds = [], bolts = [], rain = []
  for (let i = 0; i < 13; i++) {
    const cloud = mesh(new THREE.SphereGeometry(.48 + i % 3 * .12, 14, 9), mat('#66717a'), -4 + i * .68, 3.1 + i % 2 * .18, -2.1 - i % 3 * .25, `StormCloud${i}`)
    cloud.scale.x = 1.7; cloud.userData.homeX = cloud.position.x; root.add(cloud); clouds.push(cloud)
  }
  for (let i = 0; i < 7; i++) {
    const bolt = new THREE.Group(); bolt.name = `Lightning${i}`
    const boltMat = glow(i % 2 ? '#e7ffff' : '#83e9ff')
    ;[[0,.55],[-.10,.14],[.05,-.28]].forEach(([x,y], part) => {
      const shard = mesh(new THREE.BoxGeometry(.06,.5,.035), boltMat, x, y, 0, `Shard${part}`)
      shard.rotation.z = part % 2 ? -.28 : .25; bolt.add(shard)
    })
    bolt.position.set(-3.2 + i * 1.05, 1.65 - i % 2 * .55, -1.8); bolt.userData.phase = i * .9
    root.add(bolt); bolts.push(bolt)
  }
  for (let i = 0; i < 90; i++) {
    const drop = mesh(new THREE.BoxGeometry(.018,.34,.018), glow('#bcefff', { transparent: true, opacity: .68 }), (Math.random()-.5)*8, Math.random()*5-.8, -1.2-Math.random()*3, `Rain${i}`)
    drop.rotation.z = -.12; drop.userData.speed = .035 + Math.random() * .045; root.add(drop); rain.push(drop)
  }
  const flash = new THREE.PointLight('#bcefff', 0, 12, 2); flash.position.set(0, 3, 1); root.add(flash)
  root.userData.update = (t) => {
    clouds.forEach((c,i) => { c.position.x = c.userData.homeX + Math.sin(t*.28+i)*.16 })
    bolts.forEach(b => { b.visible = Math.sin(t*6+b.userData.phase) > .7 })
    rain.forEach(d => { d.position.y -= d.userData.speed; if(d.position.y < -1)d.position.y = 4.5 })
    flash.intensity = Math.sin(t * 6) > .82 ? 7 : 0
  }
  return root
}

function onsen() {
  const root = new THREE.Group(); root.name = 'OnsenJourneyScene'
  const water = mesh(new THREE.CircleGeometry(3.0, 64), mat('#6bdce8', { transparent: true, opacity: .76, metalness: .05, roughness: .18 }), 0, -.49, -.25, 'HotSpringWater')
  water.rotation.x = -Math.PI/2; root.add(water)
  const ripples = [], petals = [], steam = []
  for(let i=0;i<10;i++){
    const ripple=mesh(new THREE.TorusGeometry(.18+i%3*.07,.012,6,30),glow('#eaffff',{transparent:true,opacity:.7}),(i%5-2)*.75,-.45,-.2-Math.floor(i/5)*.65,`Ripple${i}`)
    ripple.rotation.x=Math.PI/2;ripple.userData.phase=i*.6;root.add(ripple);ripples.push(ripple)
  }
  for(let i=0;i<12;i++){
    const rock=mesh(new THREE.DodecahedronGeometry(.34+i%3*.08,0),mat('#575d65'),-3.1+i*.56,-.35,-.55+(i%2)*.28,`Rock${i}`);rock.scale.y=.68;root.add(rock)
  }
  for(const side of [-1,1]){
    const lantern=new THREE.Group();lantern.position.set(side*2.4,.15,-1);lantern.name=side<0?'LanternLeft':'LanternRight'
    lantern.add(mesh(new THREE.BoxGeometry(.55,.8,.32),mat('#342b28'),0,0,0,'Frame'))
    const light=mesh(new THREE.BoxGeometry(.4,.62,.34),glow('#fff0a8'),0,0,.02,'LanternGlow');lantern.add(light)
    const lamp=new THREE.PointLight('#ffd98a',2.5,3,2);lamp.position.z=.35;lantern.add(lamp);root.add(lantern)
  }
  const tree=new THREE.Group();tree.name='SakuraTree';tree.position.set(2.45,1.1,-1.8)
  tree.add(mesh(new THREE.CylinderGeometry(.11,.18,2.6,8),mat('#49353a'),0,0,0,'Trunk'))
  for(let i=0;i<11;i++){const b=mesh(new THREE.SphereGeometry(.5+i%2*.1,12,8),mat('#ef76a9'),-.9+i%4*.55,.85+Math.floor(i/4)*.4,0,`Blossom${i}`);b.scale.y=.75;tree.add(b)}root.add(tree)
  for(let i=0;i<30;i++){const p=mesh(new THREE.CircleGeometry(.045,6),glow('#ff9ec4'),(Math.random()-.5)*7,Math.random()*4,-.5-Math.random()*2,`Petal${i}`);p.userData.phase=i*.4;root.add(p);petals.push(p)}
  for(let i=0;i<12;i++){const s=mesh(new THREE.SphereGeometry(.12,10,8),glow('#fff',{transparent:true,opacity:.18}),-2.4+i*.45,.15+Math.random()*.7,-.5,`Steam${i}`);s.userData.phase=i;root.add(s);steam.push(s)}
  root.userData.update=(t)=>{
    ripples.forEach((r,i)=>{const s=.82+(Math.sin(t*1.5+r.userData.phase)+1)*.25;r.scale.set(s,s,1)})
    petals.forEach(p=>{p.position.y-=.008;p.position.x+=Math.sin(t+p.userData.phase)*.003;p.rotation.z+=.02;if(p.position.y<-.7)p.position.y=4})
    steam.forEach(s=>{s.position.y+=.006;s.position.x+=Math.sin(t*.7+s.userData.phase)*.002;s.material.opacity=.12+Math.sin(t+s.userData.phase)*.06;if(s.position.y>2)s.position.y=.1})
  }
  return root
}

function fitness() {
  const root=new THREE.Group();root.name='FitnessGuruScene'
  const bag=new THREE.Group();bag.name='PunchingBag';bag.position.set(-2.3,.55,-.7)
  bag.add(mesh(new THREE.CapsuleGeometry(.36,1.45,10,22),mat('#ec5860'),0,0,0,'Bag'))
  const stripe=mesh(new THREE.TorusGeometry(.34,.03,8,32),glow('#fff'),0,.58,.34,'Stripe');bag.add(stripe);root.add(bag)
  const bell=new THREE.Group();bell.name='Kettlebell';bell.position.set(0,2.4,-1.7)
  bell.add(mesh(new THREE.TorusGeometry(.48,.15,14,30,Math.PI),mat('#28252a'),0,0,0,'Handle'))
  bell.add(mesh(new THREE.SphereGeometry(.52,20,14),mat('#302d32'),0,-.4,0,'Weight'));root.add(bell)
  const rack=new THREE.Group();rack.name='BarbellRack';rack.position.set(2.3,.4,-1.2)
  for(const x of [-.7,.7])rack.add(mesh(new THREE.BoxGeometry(.13,2.4,.13),mat('#283033'),x,0,0,'Post'))
  const bar=mesh(new THREE.CylinderGeometry(.045,.045,2.0,12),mat('#bdcbce',{metalness:.75}),0,.42,.22,'Barbell');bar.rotation.z=Math.PI/2;rack.add(bar)
  for(const x of [-.86,.86]){const plate=mesh(new THREE.CylinderGeometry(.36,.36,.16,22),mat('#343b3e'),x,.42,.22,'Plate');plate.rotation.z=Math.PI/2;rack.add(plate)}root.add(rack)
  root.add(mesh(new THREE.BoxGeometry(1.55,.2,.55),mat('#aa7044'),2.05,-.35,.1,'Bench'))
  const dumbbells=[]
  for(let i=0;i<6;i++){const d=new THREE.Group();d.name=`Dumbbell${i}`;const h=mesh(new THREE.CylinderGeometry(.04,.04,.42,8),mat('#768083'),0,0,0,'Handle');h.rotation.z=Math.PI/2;d.add(h);for(const x of [-.24,.24])d.add(mesh(new THREE.CylinderGeometry(.13,.13,.12,12),mat('#34383a'),x,0,0,'Weight'));d.position.set(-1.8+i%3*.65,-.45+Math.floor(i/3)*.32,-.15);root.add(d);dumbbells.push(d)}
  root.userData.update=t=>{bag.rotation.z=Math.sin(t*1.35)*.08;bell.position.y=2.4+Math.sin(t*1.1)*.08;bar.position.y=.42+Math.sin(t*1.6)*.06;dumbbells.forEach((d,i)=>d.rotation.z=Math.sin(t*.9+i)*.08)}
  return root
}

export function createReferenceSpecialScene(type) {
  if(type==='Galactic Voyage')return galactic()
  if(type==='Thunderous Might')return thunder()
  if(type==='Onsen journey')return onsen()
  if(type==='Fitness Guru')return fitness()
  return null
}
