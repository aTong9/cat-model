import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

/**
 * 创建完整的 Three.js 场景
 * @param {HTMLCanvasElement} canvas
 * @returns {{ renderer, scene, camera, controls, envGroup, updateSize }}
 */
export function createScene(canvas) {
  // --- Renderer ---
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setClearAlpha(1)
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
  camera.position.set(0, 1.15, 4.6)
  camera.lookAt(0, 0.72, 0)

  // --- OrbitControls ---
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 0.72, 0)
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
  ground.name = 'PreviewGround'
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.62
  ground.receiveShadow = true
  scene.add(ground)

  // --- Podium ---
  const podiumGeo = new THREE.CylinderGeometry(0.78, 0.82, 0.06, 48)
  const podiumMat = new THREE.MeshStandardMaterial({ color: '#302b42', roughness: 0.48, metalness: 0.28 })
  const podium = new THREE.Mesh(podiumGeo, podiumMat)
  podium.name = 'PreviewPodium'
  podium.position.y = -0.55
  podium.receiveShadow = true; podium.castShadow = true
  scene.add(podium)

  // --- Environment root (weather effects) ---
  const envGroup = new THREE.Group()
  scene.add(envGroup)

  // --- Resize ---
  let lastWidth = 0
  let lastHeight = 0
  function updateSize() {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (lastWidth !== w || lastHeight !== h) {
      lastWidth = w
      lastHeight = h
      renderer.setSize(w, h, false)
      camera.aspect = w / Math.max(h, 1)
      camera.updateProjectionMatrix()
    }
  }

  let podiumTexture = null
  function setStage({ style = 'minimal', scale = 1, height = 0, textureUrl = null } = {}) {
    podium.visible = style !== 'hidden'
    podium.scale.setScalar(THREE.MathUtils.clamp(Number(scale) || 1, .75, 1.6))
    podium.position.y = -.55 + THREE.MathUtils.clamp(Number(height) || 0, -.04, .12)
    podiumTexture?.dispose?.()
    podiumTexture = null
    podiumMat.map = null
    podiumMat.color.set(style === 'wood' ? '#8b5a35' : style === 'grid' ? '#293654' : '#302b42')
    podiumMat.roughness = style === 'wood' ? .72 : .48
    if (textureUrl) {
      new THREE.TextureLoader().load(textureUrl, texture => {
        podiumTexture?.dispose?.()
        podiumTexture = texture
        texture.colorSpace = THREE.SRGBColorSpace
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping
        texture.repeat.set(4, 4)
        podiumMat.map = texture
        podiumMat.color.set('#ffffff')
        podiumMat.needsUpdate = true
      })
    }
    podiumMat.needsUpdate = true
  }

  return { renderer, scene, camera, controls, envGroup, updateSize, setStage }
}
