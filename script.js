let scene;
let camera;
let renderer;
let gorillaState = null;
let currentPoseId = "idle";

const THREE_NS = window.THREE;
if (!THREE_NS) {
  throw new Error("Three.js kon niet geladen worden. Controleer je internetverbinding en probeer het opnieuw.");
}

const canvas = document.getElementById("canvas");
const poseSelect = document.getElementById("pose");
const cosmeticsContainer = document.getElementById("cosmetics");
const downloadButton = document.getElementById("download");
const randomColorButton = document.getElementById("random-color");
const colorPreview = document.getElementById("color-preview");
const colorCode = document.getElementById("color-code");
const outputs = {
  r: document.getElementById("r-value"),
  g: document.getElementById("g-value"),
  b: document.getElementById("b-value"),
};
const sliders = {
  r: document.getElementById("r"),
  g: document.getElementById("g"),
  b: document.getElementById("b"),
};

const selectedCosmetics = new Set();
const cosmeticInstances = new Map();

const cameraTarget = new THREE_NS.Vector3(0, 1.1, 0);
let isPointerDown = false;
let activePointerId = null;
let lastPointerX = 0;
let rotationVelocity = 0;
let autoRotate = true;
let autoRotateTimeout = null;

const POSES = [
  {
    id: "idle",
    label: "Relaxed",
    apply(state) {
      // Default neutral stance.
    },
  },
  {
    id: "power",
    label: "Power Stance",
    apply(state) {
      const { parts } = state;
      parts.leftArm.rotation.x = THREE_NS.MathUtils.degToRad(-55);
      parts.leftArm.rotation.z = THREE_NS.MathUtils.degToRad(14);
      parts.rightArm.rotation.x = THREE_NS.MathUtils.degToRad(-35);
      parts.rightArm.rotation.z = THREE_NS.MathUtils.degToRad(-18);
      parts.leftLeg.rotation.x = THREE_NS.MathUtils.degToRad(10);
      parts.leftLeg.rotation.z = THREE_NS.MathUtils.degToRad(6);
      parts.rightLeg.rotation.x = THREE_NS.MathUtils.degToRad(-6);
      parts.headPivot.rotation.x = THREE_NS.MathUtils.degToRad(-6);
    },
  },
  {
    id: "lookout",
    label: "Lookout",
    apply(state) {
      const { parts } = state;
      parts.leftArm.rotation.x = THREE_NS.MathUtils.degToRad(-90);
      parts.leftArm.rotation.z = THREE_NS.MathUtils.degToRad(-15);
      parts.rightArm.rotation.x = THREE_NS.MathUtils.degToRad(-18);
      parts.rightArm.rotation.z = THREE_NS.MathUtils.degToRad(16);
      parts.headPivot.rotation.y = THREE_NS.MathUtils.degToRad(-25);
      parts.headPivot.rotation.x = THREE_NS.MathUtils.degToRad(-12);
    },
  },
  {
    id: "swing",
    label: "Swing",
    apply(state) {
      const { parts } = state;
      parts.leftArm.rotation.x = THREE_NS.MathUtils.degToRad(-35);
      parts.leftArm.rotation.z = THREE_NS.MathUtils.degToRad(55);
      parts.rightArm.rotation.x = THREE_NS.MathUtils.degToRad(-120);
      parts.rightArm.rotation.z = THREE_NS.MathUtils.degToRad(-32);
      parts.leftLeg.rotation.x = THREE_NS.MathUtils.degToRad(22);
      parts.rightLeg.rotation.x = THREE_NS.MathUtils.degToRad(-18);
      parts.rightLeg.rotation.z = THREE_NS.MathUtils.degToRad(8);
      parts.headPivot.rotation.y = THREE_NS.MathUtils.degToRad(18);
      parts.headPivot.rotation.x = THREE_NS.MathUtils.degToRad(-4);
    },
  },
];

const COSMETICS = [
  {
    id: "hat",
    label: "Feesthoed",
    description: "Een feestelijke hoed voor elke gelegenheid.",
    create(state) {
      const hatGroup = new THREE_NS.Group();

      const cone = new THREE_NS.Mesh(
        new THREE_NS.ConeGeometry(0.22, 0.38, 24),
        new THREE_NS.MeshStandardMaterial({
          color: 0xff6b6b,
          emissive: 0x331400,
          roughness: 0.35,
          metalness: 0.18,
        })
      );
      cone.position.y = 0.19;
      hatGroup.add(cone);

      const brim = new THREE_NS.Mesh(
        new THREE_NS.CylinderGeometry(0.24, 0.24, 0.04, 24),
        new THREE_NS.MeshStandardMaterial({
          color: 0xff9356,
          emissive: 0x2a1200,
          roughness: 0.45,
          metalness: 0.12,
        })
      );
      brim.position.y = -0.01;
      hatGroup.add(brim);

      hatGroup.rotation.z = THREE_NS.MathUtils.degToRad(-10);
      hatGroup.position.set(0, 0.24, 0);
      state.anchors.head.add(hatGroup);
      return hatGroup;
    },
  },
  {
    id: "badge",
    label: "Naam Badge",
    description: "Plaats een badge op de borst van de gorilla.",
    create(state) {
      const badge = new THREE_NS.Mesh(
        new THREE_NS.BoxGeometry(0.32, 0.18, 0.04),
        new THREE_NS.MeshStandardMaterial({
          color: 0xff9356,
          emissive: 0x3a1600,
          roughness: 0.3,
          metalness: 0.25,
        })
      );
      badge.position.set(0.18, 0.04, 0.1);
      badge.rotation.y = THREE_NS.MathUtils.degToRad(-12);
      state.anchors.chest.add(badge);
      return badge;
    },
  },
  {
    id: "wristbands",
    label: "Neon Polsbanden",
    description: "Dubbele neon armbanden voor beide polsen.",
    create(state) {
      const geometry = new THREE_NS.TorusGeometry(0.12, 0.025, 12, 28);
      const material = new THREE_NS.MeshStandardMaterial({
        color: 0x6d9bf7,
        emissive: 0x0a1639,
        roughness: 0.25,
        metalness: 0.5,
      });

      const leftWrapper = new THREE_NS.Group();
      const leftBand = new THREE_NS.Mesh(geometry, material.clone());
      leftBand.rotation.x = THREE_NS.MathUtils.degToRad(95);
      leftBand.rotation.z = THREE_NS.MathUtils.degToRad(-20);
      leftBand.position.set(0, -0.02, 0.06);
      leftWrapper.add(leftBand);
      state.anchors.leftWrist.add(leftWrapper);

      const rightWrapper = new THREE_NS.Group();
      const rightBand = new THREE_NS.Mesh(geometry, material.clone());
      rightBand.rotation.x = THREE_NS.MathUtils.degToRad(95);
      rightBand.rotation.z = THREE_NS.MathUtils.degToRad(20);
      rightBand.position.set(0, -0.02, -0.06);
      rightWrapper.add(rightBand);
      state.anchors.rightWrist.add(rightWrapper);

      return [leftWrapper, rightWrapper];
    },
  },
];

const POSE_MAP = new Map(POSES.map((pose) => [pose.id, pose]));
const COSMETIC_MAP = new Map(COSMETICS.map((cosmetic) => [cosmetic.id, cosmetic]));

init();
setupUI();
createGorilla();
applyPose(currentPoseId);
animate();

function init() {
  scene = new THREE_NS.Scene();
  scene.background = new THREE_NS.Color(0x06070d);
  scene.fog = new THREE_NS.Fog(0x06070d, 8, 18);

  camera = new THREE_NS.PerspectiveCamera(50, getAspect(), 0.1, 100);
  camera.position.set(1.8, 1.55, 2.8);

  renderer = new THREE_NS.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.outputColorSpace = THREE_NS.SRGBColorSpace;
  renderer.setPixelRatio(window.devicePixelRatio);
  resizeRenderer();
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE_NS.PCFSoftShadowMap;

  const ambient = new THREE_NS.HemisphereLight(0xe8efff, 0x0d0f16, 0.6);
  scene.add(ambient);

  const keyLight = new THREE_NS.DirectionalLight(0xffffff, 1.15);
  keyLight.position.set(2.5, 4.5, 3.4);
  keyLight.castShadow = true;
  keyLight.shadow.radius = 6;
  keyLight.shadow.mapSize.set(1024, 1024);
  scene.add(keyLight);

  const rimLight = new THREE_NS.DirectionalLight(0x6d9bf7, 0.7);
  rimLight.position.set(-3.2, 3.2, -2.5);
  scene.add(rimLight);

  const floor = new THREE_NS.Mesh(
    new THREE_NS.CylinderGeometry(2.8, 2.8, 0.05, 64),
    new THREE_NS.MeshStandardMaterial({
      color: 0x1a1c2c,
      roughness: 0.85,
      metalness: 0.1,
    })
  );
  floor.receiveShadow = true;
  floor.position.y = -0.02;
  scene.add(floor);

  setupInteractions();
  window.addEventListener("resize", resizeRenderer);
}

function setupUI() {
  POSES.forEach((pose) => {
    const option = document.createElement("option");
    option.value = pose.id;
    option.textContent = pose.label;
    poseSelect.appendChild(option);
  });

  poseSelect.value = currentPoseId;
  poseSelect.addEventListener("change", (event) => {
    if (event.target.value === currentPoseId) return;
    applyPose(event.target.value);
  });

  COSMETICS.forEach((cosmetic) => {
    const label = document.createElement("label");
    label.className = "cosmetic";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = cosmetic.id;
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedCosmetics.add(cosmetic.id);
      } else {
        selectedCosmetics.delete(cosmetic.id);
      }
      refreshCosmetics();
    });

    const text = document.createElement("div");
    text.className = "cosmetic-text";
    const title = document.createElement("span");
    title.textContent = cosmetic.label;
    const description = document.createElement("small");
    description.textContent = cosmetic.description;
    text.append(title, description);

    label.append(checkbox, text);
    cosmeticsContainer.appendChild(label);
  });

  Object.entries(sliders).forEach(([channel, input]) => {
    input.addEventListener("input", () => updateColor(channel));
    outputs[channel].textContent = input.value;
  });

  randomColorButton.addEventListener("click", () => {
    Object.values(sliders).forEach((input) => {
      const randomValue = Math.floor(Math.random() * 10);
      input.value = randomValue.toString();
    });
    updateColor();
  });

  downloadButton.addEventListener("click", downloadImage);

  updateColor();
}

function setupInteractions() {
  const handlePointerDown = (event) => {
    if (isPointerDown) return;
    isPointerDown = true;
    activePointerId = event.pointerId;
    lastPointerX = event.clientX;
    rotationVelocity = 0;
    autoRotate = false;
    if (autoRotateTimeout) {
      clearTimeout(autoRotateTimeout);
      autoRotateTimeout = null;
    }
    canvas.setPointerCapture(activePointerId);
  };

  const handlePointerMove = (event) => {
    if (!isPointerDown || event.pointerId !== activePointerId || !gorillaState) return;
    const deltaX = event.clientX - lastPointerX;
    lastPointerX = event.clientX;
    const deltaRotation = deltaX * 0.0045;
    gorillaState.group.rotation.y += deltaRotation;
    rotationVelocity = deltaRotation;
  };

  const handlePointerUp = (event) => {
    if (event.pointerId !== activePointerId) return;
    isPointerDown = false;
    rotationVelocity *= 0.92;
    canvas.releasePointerCapture(activePointerId);
    activePointerId = null;
    autoRotateTimeout = setTimeout(() => {
      autoRotate = true;
    }, 2200);
  };

  const handleWheel = (event) => {
    event.preventDefault();
    const delta = Math.sign(event.deltaY);
    const offset = camera.position.clone().sub(cameraTarget);
    const newLength = THREE_NS.MathUtils.clamp(offset.length() + delta * 0.3, 1.6, 4.5);
    offset.setLength(newLength);
    camera.position.copy(cameraTarget.clone().add(offset));
  };

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);
  canvas.addEventListener("pointerleave", handlePointerUp);
  canvas.addEventListener("wheel", handleWheel, { passive: false });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
}

function createGorilla() {
  if (gorillaState?.group) {
    scene.remove(gorillaState.group);
  }

  const materials = [];
  const group = new THREE_NS.Group();
  group.castShadow = true;
  group.receiveShadow = true;
  scene.add(group);

  const anchors = {};
  const parts = {};

  const baseColor = new THREE_NS.Color(0x7f7f7f);

  const trackedMeshes = [];
  function registerMesh(mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    trackedMeshes.push(mesh);
  }

  function createMaterial() {
    const material = new THREE_NS.MeshStandardMaterial({
      color: baseColor.clone(),
      roughness: 0.55,
      metalness: 0.25,
      flatShading: true,
    });
    materials.push(material);
    return material;
  }

  const torso = new THREE_NS.Mesh(
    new THREE_NS.CapsuleGeometry(0.32, 0.85, 12, 18),
    createMaterial()
  );
  torso.position.set(0, 1.05, 0);
  registerMesh(torso);
  group.add(torso);
  parts.body = torso;

  const pelvis = new THREE_NS.Mesh(
    new THREE_NS.BoxGeometry(0.55, 0.24, 0.4),
    createMaterial()
  );
  pelvis.position.set(0, 0.78, 0);
  registerMesh(pelvis);
  group.add(pelvis);

  const chestAnchor = new THREE_NS.Object3D();
  chestAnchor.position.set(0.2, 0.22, 0.24);
  torso.add(chestAnchor);
  anchors.chest = chestAnchor;

  const headPivot = new THREE_NS.Group();
  headPivot.position.set(0, 1.52, 0.12);
  group.add(headPivot);
  parts.headPivot = headPivot;

  const head = new THREE_NS.Mesh(new THREE_NS.SphereGeometry(0.24, 22, 22), createMaterial());
  head.position.set(0, 0.22, 0);
  registerMesh(head);
  headPivot.add(head);
  parts.head = head;

  const snout = new THREE_NS.Mesh(
    new THREE_NS.CapsuleGeometry(0.14, 0.12, 8, 12),
    createMaterial()
  );
  snout.position.set(0, 0.02, 0.24);
  snout.rotation.x = THREE_NS.MathUtils.degToRad(90);
  registerMesh(snout);
  head.add(snout);

  const headAnchor = new THREE_NS.Object3D();
  headAnchor.position.set(0, 0.35, 0);
  head.add(headAnchor);
  anchors.head = headAnchor;

  const earGeometry = new THREE_NS.SphereGeometry(0.08, 14, 14, 0, Math.PI * 2, 0, Math.PI / 1.2);
  const leftEar = new THREE_NS.Mesh(earGeometry, createMaterial());
  leftEar.position.set(-0.22, 0.1, -0.02);
  registerMesh(leftEar);
  head.add(leftEar);

  const rightEar = leftEar.clone();
  rightEar.material = rightEar.material.clone();
  rightEar.position.x *= -1;
  head.add(rightEar);

  function createArm(side) {
    const pivot = new THREE_NS.Group();
    pivot.position.set(0.45 * side, 1.35, 0);
    group.add(pivot);

    const upper = new THREE_NS.Mesh(
      new THREE_NS.CapsuleGeometry(0.11, 0.55, 12, 16),
      createMaterial()
    );
    upper.position.set(0, -0.38, 0);
    upper.rotation.z = THREE_NS.MathUtils.degToRad(side === 1 ? -8 : 8);
    registerMesh(upper);
    pivot.add(upper);

    const hand = new THREE_NS.Mesh(new THREE_NS.SphereGeometry(0.14, 16, 16), createMaterial());
    hand.position.set(0, -0.4, 0.08 * side);
    registerMesh(hand);
    upper.add(hand);

    const wristAnchor = new THREE_NS.Object3D();
    wristAnchor.position.set(0, -0.34, 0.06 * side);
    upper.add(wristAnchor);

    return { pivot, wristAnchor };
  }

  const leftArm = createArm(-1);
  parts.leftArm = leftArm.pivot;
  anchors.leftWrist = leftArm.wristAnchor;

  const rightArm = createArm(1);
  parts.rightArm = rightArm.pivot;
  anchors.rightWrist = rightArm.wristAnchor;

  function createLeg(side) {
    const pivot = new THREE_NS.Group();
    pivot.position.set(0.26 * side, 0.84, -0.02);
    group.add(pivot);

    const thigh = new THREE_NS.Mesh(
      new THREE_NS.CapsuleGeometry(0.14, 0.6, 12, 16),
      createMaterial()
    );
    thigh.position.set(0, -0.4, 0);
    registerMesh(thigh);
    pivot.add(thigh);

    const foot = new THREE_NS.Mesh(
      new THREE_NS.BoxGeometry(0.2, 0.08, 0.42),
      createMaterial()
    );
    foot.position.set(0, -0.36, 0.18);
    registerMesh(foot);
    thigh.add(foot);

    return pivot;
  }

  parts.leftLeg = createLeg(-1);
  parts.rightLeg = createLeg(1);

  gorillaState = {
    group,
    anchors,
    parts,
    materials,
    meshes: trackedMeshes,
  };

  resetPose(gorillaState);
  updateColor();
  refreshCosmetics();
}

function resetPose(state) {
  if (!state) return;
  const { parts, group } = state;
  group.rotation.set(0, 0, 0);

  parts.headPivot.rotation.set(0, 0, 0);

  parts.leftArm.rotation.set(
    THREE_NS.MathUtils.degToRad(-35),
    THREE_NS.MathUtils.degToRad(4),
    THREE_NS.MathUtils.degToRad(18)
  );
  parts.rightArm.rotation.set(
    THREE_NS.MathUtils.degToRad(-32),
    THREE_NS.MathUtils.degToRad(-4),
    THREE_NS.MathUtils.degToRad(-18)
  );

  parts.leftLeg.rotation.set(
    THREE_NS.MathUtils.degToRad(6),
    0,
    THREE_NS.MathUtils.degToRad(4)
  );
  parts.rightLeg.rotation.set(
    THREE_NS.MathUtils.degToRad(-4),
    0,
    THREE_NS.MathUtils.degToRad(-4)
  );
}

function applyPose(poseId) {
  if (!gorillaState) return;
  const pose = POSE_MAP.get(poseId) ?? POSE_MAP.get("idle");
  currentPoseId = pose?.id ?? "idle";
  poseSelect.value = currentPoseId;
  resetPose(gorillaState);
  if (pose && typeof pose.apply === "function") {
    pose.apply(gorillaState);
  }
  refreshCosmetics();
}

function updateColor(changedChannel) {
  Object.entries(sliders).forEach(([channel, input]) => {
    if (!changedChannel || changedChannel === channel) {
      outputs[channel].textContent = input.value;
    }
  });

  const rSteps = Number(sliders.r.value);
  const gSteps = Number(sliders.g.value);
  const bSteps = Number(sliders.b.value);

  const to255 = (value) => Math.round((value / 9) * 255);
  const r = to255(rSteps);
  const g = to255(gSteps);
  const b = to255(bSteps);

  colorPreview.style.background = `rgb(${r}, ${g}, ${b})`;
  const color = new THREE_NS.Color(`rgb(${r}, ${g}, ${b})`);
  const hex = `#${color.getHexString().toUpperCase()}`;
  colorCode.textContent = `RGB (${rSteps}, ${gSteps}, ${bSteps}) • Hex ${hex}`;

  if (!gorillaState) return;

  gorillaState.materials.forEach((material) => {
    material.color.copy(color);
    if (material.emissive) {
      material.emissive.setRGB(color.r * 0.08, color.g * 0.08, color.b * 0.08);
    }
  });
}

function refreshCosmetics() {
  if (!gorillaState) return;

  cosmeticInstances.forEach((objects) => {
    const items = Array.isArray(objects) ? objects : [objects];
    items.forEach((object) => {
      if (object.parent) {
        object.parent.remove(object);
      }
    });
  });
  cosmeticInstances.clear();

  selectedCosmetics.forEach((id) => {
    const cosmetic = COSMETIC_MAP.get(id);
    if (!cosmetic || typeof cosmetic.create !== "function") return;
    const created = cosmetic.create(gorillaState);
    if (!created) return;
    cosmeticInstances.set(id, created);
  });
}

function downloadImage() {
  renderer.render(scene, camera);
  const link = document.createElement("a");
  link.download = `gorillatag-${Date.now()}.png`;
  link.href = renderer.domElement.toDataURL("image/png");
  link.click();
}

function animate() {
  requestAnimationFrame(animate);
  if (gorillaState && !isPointerDown) {
    if (Math.abs(rotationVelocity) > 0.0001) {
      gorillaState.group.rotation.y += rotationVelocity;
      rotationVelocity *= 0.92;
    } else if (autoRotate) {
      gorillaState.group.rotation.y += 0.0025;
    }
  }
  camera.lookAt(cameraTarget);
  renderer.render(scene, camera);
}

function getAspect() {
  const { clientWidth, clientHeight } = canvas.parentElement;
  return clientWidth / Math.max(clientHeight, 1);
}

function resizeRenderer() {
  const { clientWidth, clientHeight } = canvas.parentElement;
  renderer.setSize(clientWidth, Math.max(clientHeight, 1), false);
  camera.aspect = clientWidth / Math.max(clientHeight, 1);
  camera.updateProjectionMatrix();
}
