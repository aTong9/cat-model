import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createCosmicWorld3000 } from '../src/three/cosmic/createCosmicWorld3000.js'
import { shouldUseCosmicWorld3000 } from '../src/three/cosmic/CosmicWorld3000Config.js'

test('cosmic replacement follows the Galactic Voyage trait for every token',()=>{assert.equal(shouldUseCosmicWorld3000(3000,'Galactic Voyage'),true);assert.equal(shouldUseCosmicWorld3000('3000','Galactic Voyage'),true);assert.equal(shouldUseCosmicWorld3000(3001,'Galactic Voyage'),true);assert.equal(shouldUseCosmicWorld3000(3000,'Time Traveler'),false)})
test('cosmic world exposes platform, six-direction space and all reference landmarks',()=>{const runtime=createCosmicWorld3000({quality:'low'});assert.deepEqual(runtime.world.children.map(c=>c.name),['deepSpaceDome','platform','celestialBodies','spaceObjects','stars','landmarks','effects','lighting','navigation']);for(const name of['centralPlaza','northPath','eastPath','southPath','westPath','ringWalkway','energyBarriers','ringedPlanet','planetRing','cyanHomePlanet','moon','asteroids','comet','cometTail','rocket','rocketTrail','starsFar','starsMiddle','starsNear','spaceDust','moonObservatory'])assert.ok(runtime.world.getObjectByName(name),name);runtime.dispose()})
test('flat platform, landmark collision and visible boundary prevent falling into space',()=>{const runtime=createCosmicWorld3000({quality:'low'}),origin=new THREE.Vector3();assert.equal(runtime.sampleCharacterGroundY(0,0),0);assert.equal(runtime.resolveMovement(origin,new THREE.Vector3(100,0,0)).collided,true);const c=runtime.colliders[0];assert.equal(runtime.resolveMovement(origin,new THREE.Vector3(c.x,0,c.z)).collided,true);runtime.update(1);runtime.dispose()})
