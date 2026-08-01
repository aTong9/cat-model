import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createSynthwaveWorld9038 } from '../src/three/synthwave/createSynthwaveWorld9038.js'
import { shouldUseSynthwaveWorld9038 } from '../src/three/synthwave/SynthwaveWorld9038Config.js'

test('synthwave replacement follows the Time Traveler trait for every token',()=>{assert.equal(shouldUseSynthwaveWorld9038(9038,'Time Traveler'),true);assert.equal(shouldUseSynthwaveWorld9038('9038','Time Traveler'),true);assert.equal(shouldUseSynthwaveWorld9038(9039,'Time Traveler'),true);assert.equal(shouldUseSynthwaveWorld9038(9038,'Fitness Guru'),false)})
test('synthwave world exposes complete city, sky, effects and navigation hierarchy',()=>{const runtime=createSynthwaveWorld9038({quality:'low'});assert.deepEqual(runtime.world.children.map(c=>c.name),['terrain','city','sky','decorations','effects','lighting','navigation']);for(const name of ['centralGridPlaza','perspectiveNeonGrid','nearBuildings','middleBuildings','distantSkyline','stripedSun','horizonGlow','neonArches','neonPalms','dataParticles','catStepGlow','spawnPoint'])assert.ok(runtime.world.getObjectByName(name),name);runtime.dispose()})
test('central grid is flat while buildings and world boundary resolve movement',()=>{const runtime=createSynthwaveWorld9038({quality:'low'}),origin=new THREE.Vector3();assert.equal(runtime.sampleCharacterGroundY(0,0),0);assert.equal(runtime.resolveMovement(origin,new THREE.Vector3(100,0,0)).collided,true);const obstacle=runtime.colliders[0];assert.equal(runtime.resolveMovement(origin,new THREE.Vector3(obstacle.x,0,obstacle.z)).collided,true);runtime.update(1);runtime.dispose()})
