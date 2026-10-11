import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

export function createScene(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xefe8de);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 40);
  camera.position.set(1.4, 1.05, 1.7);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.inset = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  container.appendChild(labelRenderer.domElement);

  renderer.domElement.style.touchAction = 'none';
  renderer.domElement.style.display = 'block';

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.7;
  controls.maxDistance = 6;
  controls.maxPolarAngle = Math.PI / 2 - 0.06;
  controls.target.set(0, 0.4, 0);
  controls.rotateSpeed = 0.85;
  controls.zoomSpeed = 0.9;

  const mobileQuery = window.matchMedia('(max-width: 900px), (pointer: coarse)');
  function applyControlMode() {
    const mobile = mobileQuery.matches;
    controls.enablePan = !mobile;
    controls.rotateSpeed = mobile ? 0.72 : 0.85;
  }
  applyControlMode();
  mobileQuery.addEventListener('change', applyControlMode);

  const hemi = new THREE.HemisphereLight(0xfff6ea, 0x8d8578, 0.9);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(2.2, 3.4, 2.4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 12;
  key.shadow.camera.left = -3;
  key.shadow.camera.right = 3;
  key.shadow.camera.top = 3;
  key.shadow.camera.bottom = -3;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xfff2e4, 0.35);
  fill.position.set(-2.2, 1.6, -1.2);
  scene.add(fill);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(4, 72),
    new THREE.MeshStandardMaterial({
      color: 0xe7e0d4,
      roughness: 1,
      metalness: 0,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const furnitureRoot = new THREE.Group();
  const dimensionsRoot = new THREE.Group();
  scene.add(furnitureRoot);
  scene.add(dimensionsRoot);

  function resize() {
    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    labelRenderer.setSize(width, height);
  }

  function getCenter(object) {
    const box = new THREE.Box3().setFromObject(object);
    return box.isEmpty() ? null : { box, center: box.getCenter(new THREE.Vector3()) };
  }

  function fitCamera(object) {
    const result = getCenter(object);
    if (!result) return;
    const size = result.box.getSize(new THREE.Vector3());
    const { center } = result;
    const maxSize = Math.max(size.x, size.y, size.z);
    const distance = maxSize * 2.15;
    camera.position.set(center.x + distance * 0.72, center.y + distance * 0.38, center.z + distance * 0.92);
    controls.target.copy(center);
    controls.minDistance = maxSize * 0.8;
    controls.maxDistance = maxSize * 8;
    controls.update();
    controls.saveState();
  }

  function recenter(object) {
    const result = getCenter(object);
    if (!result) return;
    controls.target.copy(result.center);
  }

  function startLoop(onFrame) {
    const clock = new THREE.Clock();
    resize();
    renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.04);
      onFrame?.(dt);
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    });
  }

  const observer = new ResizeObserver(resize);
  observer.observe(container);
  window.addEventListener('resize', resize);

  return {
    scene,
    camera,
    renderer,
    controls,
    furnitureRoot,
    dimensionsRoot,
    fitCamera,
    recenter,
    resetCamera: () => controls.reset(),
    startLoop,
    resize,
  };
}
