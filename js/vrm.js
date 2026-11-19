/* =========================================================
   VRM viewer (VRoid Studio characters) — three.js + @pixiv/three-vrm.
   Loaded only when someone opens a character in 3D.
   ========================================================= */
import { THREE, GLTFLoader, DRACOLoader, MeshoptDecoder, OrbitControls, VRMLoaderPlugin, VRMUtils } from './vendor/vrm-viewer.bundle.js';

export async function mountVRM(host, url, { autoRotate = true } = {}) {
  const w = () => host.clientWidth || 300;
  const h = () => host.clientHeight || 400;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(w(), h());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  renderer.domElement.className = 'vrm-canvas';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, w() / h(), 0.1, 50);
  camera.position.set(0, 1.25, 3.4);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.95, 0);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 1.2; controls.maxDistance = 6;
  controls.autoRotate = autoRotate; controls.autoRotateSpeed = 1.2;
  controls.update();
  const stopAuto = () => { controls.autoRotate = false; };
  renderer.domElement.addEventListener('pointerdown', stopAuto, { once: true });

  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(1.5, 3, 2.5);
  scene.add(sun);

  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath(new URL('js/vendor/draco/', document.baseURI).href);
  loader.setDRACOLoader(draco);
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const gltf = await loader.loadAsync(url);
  const vrm = gltf.userData.vrm;
  if (!vrm) throw new Error('not a VRM file');
  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.combineSkeletons?.(gltf.scene);
  VRMUtils.rotateVRM0(vrm); // VRM 0.x models face -Z
  vrm.scene.traverse((o) => { o.frustumCulled = false; });
  scene.add(vrm.scene);

  // frame the model
  const box = new THREE.Box3().setFromObject(vrm.scene);
  const height = box.max.y - box.min.y;
  controls.target.set(0, box.min.y + height * 0.55, 0);
  camera.position.set(0, box.min.y + height * 0.6, height * 1.9);
  controls.update();

  // relaxed arms instead of the T-pose. VRM 0.x and 1.0 use opposite arm axes, so instead of
  // guessing the sign we try both and keep the one that puts the hand below the shoulder.
  const bone = (name) => vrm.humanoid?.getNormalizedBoneNode(name);
  const lArm = bone('leftUpperArm'), rArm = bone('rightUpperArm');
  const ARM = 1.2;
  const handY = (arm, handName, angle) => {
    arm.rotation.z = angle;
    vrm.humanoid.update?.();
    vrm.scene.updateMatrixWorld(true);
    const raw = vrm.humanoid.getRawBoneNode(handName) || bone(handName);
    return raw ? raw.getWorldPosition(new THREE.Vector3()).y : 0;
  };
  const pickSign = (arm, handName) => {
    if (!arm) return 0;
    return handY(arm, handName, ARM) < handY(arm, handName, -ARM) ? 1 : -1;
  };
  const lSign = pickSign(lArm, 'leftHand'), rSign = pickSign(rArm, 'rightHand');
  if (lArm) lArm.rotation.z = lSign * ARM;
  if (rArm) rArm.rotation.z = rSign * ARM;
  const spine = bone('spine'), neck = bone('neck');
  if (vrm.lookAt) vrm.lookAt.target = camera;

  const clock = new THREE.Clock();
  let raf = 0, nextBlink = 2, blinkT = -1, alive = true;
  const loop = () => {
    if (!alive) return;
    const dt = clock.getDelta(), time = clock.elapsedTime;
    if (spine) spine.rotation.x = Math.sin(time * 1.6) * 0.02;            // breathing
    if (neck) neck.rotation.y = Math.sin(time * 0.7) * 0.06;
    if (lArm) lArm.rotation.z = lSign * (ARM + Math.sin(time * 1.6) * 0.02);
    if (rArm) rArm.rotation.z = rSign * (ARM + Math.sin(time * 1.6) * 0.02);
    if (vrm.expressionManager) {                                            // blinking
      if (time > nextBlink && blinkT < 0) blinkT = 0;
      if (blinkT >= 0) {
        blinkT += dt;
        const v = blinkT < 0.08 ? blinkT / 0.08 : Math.max(0, 1 - (blinkT - 0.08) / 0.1);
        vrm.expressionManager.setValue('blink', v);
        if (blinkT > 0.2) { blinkT = -1; nextBlink = time + 2 + Math.random() * 3; }
      }
    }
    vrm.update(dt);
    controls.update();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };
  loop();

  const ro = new ResizeObserver(() => {
    renderer.setSize(w(), h());
    camera.aspect = w() / h(); camera.updateProjectionMatrix();
  });
  ro.observe(host);

  return () => {
    alive = false; cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
    VRMUtils.deepDispose(vrm.scene); renderer.dispose(); renderer.domElement.remove();
  };
}
