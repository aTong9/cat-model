import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

/**
 * 创建完整的 Three.js 场景
 * @param {HTMLCanvasElement} canvas
 * @returns {{ renderer, scene, camera, controls, envGroup, updateSize }}
 */
export function createScene(canvas) {
  // --- Renderer ---
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1

  // --- Scene ---
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#11111c')
  scene.fog = new THREE.Fog('#11111c', 6, 18)

  // --- Camera ---
  const camera = new THREE.PerspectiveCamera(38, 2, 0.5, 30)
  camera.position.set(3.2, 2.0, 4.8)
  camera.lookAt(0, 1.1, 0)

  // --- OrbitControls ---
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 1.1, 0)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minDistance = 2.5
  controls.maxDistance = 10
  controls.maxPolarAngle = Math.PI * 0.75
  controls.update()

  // --- Lights ---
  scene.add(new THREE.HemisphereLight('#7383c8', '#16121f', 1.4))

  const sun = new THREE.DirectionalLight('#fff1b0', 4.5)
  sun.position.set(5, 8, 3)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.near = 0.5
  sun.shadow.camera.far = 30
  sun.shadow.camera.left = -5; sun.shadow.camera.right = 5
  sun.shadow.camera.top = 5; sun.shadow.camera.bottom = -2
  sun.shadow.bias = -0.0003
  scene.add(sun)

  const fill = new THREE.DirectionalLight('#8899ff', 2.2)
  fill.position.set(-2, 1, -1)
  scene.add(fill)

  const rim = new THREE.DirectionalLight('#ffffff', 1.5)
  rim.position.set(0, 0.5, -3)
  scene.add(rim)

  // --- Ground ---
  const groundGeo = new THREE.PlaneGeometry(12, 12)
  const groundMat = new THREE.MeshStandardMaterial({ color: '#171523', roughness: 0.9 })
  const ground = new THREE.Mesh(groundGeo, groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -1.0
  ground.receiveShadow = true
  scene.add(ground)

  // --- Podium ---
  const podiumGeo = new THREE.CylinderGeometry(0.65, 0.7, 0.08, 48)
  const podiumMat = new THREE.MeshStandardMaterial({ color: '#302b42', roughness: 0.48, metalness: 0.28 })
  const podium = new THREE.Mesh(podiumGeo, podiumMat)
  podium.position.y = -0.55
  podium.receiveShadow = true; podium.castShadow = true
  scene.add(podium)

  // --- Environment root (weather effects) ---
  const envGroup = new THREE.Group()
  scene.add(envGroup)

  // --- Resize ---
  function updateSize() {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (canvas.width !== w || canvas.height !== h) {
      renderer.setSize(w, h, false)
      camera.aspect = w / Math.max(h, 1)
      camera.updateProjectionMatrix()
    }
  }

  return { renderer, scene, camera, controls, envGroup, updateSize }
}
