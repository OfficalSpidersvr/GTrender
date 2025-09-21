let scene;
let camera;
let renderer;
let controls;
let gorilla;
let gorillaMeasurements;

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

const loader = new THREE.GLTFLoader();
const assetCache = new Map();
const selectedCosmetics = new Set();
const cosmeticInstances = new Map();
let currentPoseId = "default";
let isChangingPose = false;

const POSES = [
  {
    id: "default",
    label: "Default",
    path: "./assets/gorilla.glb",
  },
  {
    id: "pose2",
    label: "Power Stance",
    path: "./assets/pose2.glb",
  },
  {
    id: "lookout",
    label: "Lookout",
    path: "./assets/gorilla.glb",
    tweak(model) {
      model.rotation.y = THREE.MathUtils.degToRad(-25);
      model.rotation.z = THREE.MathUtils.degToRad(8);
      model.position.x += 0.12;
    },
  },
];

const COSMETICS = [
  {
    id: "hat",
    label: "Feesthoed",
    description: "Een feestelijke hoed voor elke gelegenheid.",
    type: "gltf",
    path: "./assets/hat.glb",
    adjust(instance, measurements) {
      const wrapper = new THREE.Group();
      wrapper.add(instance);
      const hatBox = new THREE.Box3().setFromObject(instance);
      const hatSize = hatBox.getSize(new THREE.Vector3());
      const hatCenter = hatBox.getCenter(new THREE.Vector3());
      instance.position.sub(hatCenter);
      const targetWidth = measurements.size.x * 0.55;
      const scaleFactor = hatSize.x > 0 ? targetWidth / hatSize.x : 1;
      wrapper.scale.setScalar(scaleFactor);
      const headHeight = measurements.top + (hatSize.y * scaleFactor) * 0.25;
      wrapper.position.set(measurements.center.x, headHeight, measurements.center.z);
      return wrapper;
    },
  },
  {
    id: "badge",
    label: "Naam Badge",
    description: "Plaats een badge op de borst van de gorilla.",
    create(measurements) {
      const badgeWidth = measurements.size.x * 0.32;
      const badgeHeight = measurements.size.y * 0.16;
      const geometry = THREE.RoundedBoxGeometry
        ? new THREE.RoundedBoxGeometry(badgeWidth, badgeHeight, measurements.size.z * 0.02, 2, 0.02)
        : new THREE.BoxGeometry(badgeWidth, badgeHeight, measurements.size.z * 0.02);
      const material = new THREE.MeshStandardMaterial({
        color: 0xff9356,
        emissive: 0x331400,
        roughness: 0.35,
        metalness: 0.15,
      });
      const badge = new THREE.Mesh(geometry, material);
      badge.position.set(
        measurements.center.x + measurements.size.x * 0.15,
        measurements.center.y + measurements.size.y * 0.05,
        measurements.front + measurements.size.z * 0.05
      );
      badge.rotation.y = THREE.MathUtils.degToRad(-8);
      badge.castShadow = true;
      badge.receiveShadow = true;
      return badge;
    },
  },
  {
    id: "wristbands",
    label: "Neon Polsbanden",
    description: "Dubbele neon armbanden voor beide polsen.",
    create(measurements) {
      const group = new THREE.Group();
      const radius = measurements.size.x * 0.18;
      const tube = measurements.size.x * 0.035;
      const geometry = new THREE.TorusGeometry(radius, tube, 14, 32);
      const material = new THREE.MeshStandardMaterial({
        color: 0x6d9bf7,
        emissive: 0x0a1639,
        roughness: 0.25,
        metalness: 0.4,
      });

      const left = new THREE.Mesh(geometry, material.clone());
      const right = new THREE.Mesh(geometry, material.clone());

      const wristHeight = measurements.center.y - measurements.size.y * 0.2;
      left.position.set(measurements.left - radius * 0.15, wristHeight, measurements.center.z + radius * 0.6);
      right.position.set(measurements.right + radius * 0.15, wristHeight, measurements.center.z - radius * 0.6);

      left.rotation.x = THREE.MathUtils.degToRad(65);
      right.rotation.x = THREE.MathUtils.degToRad(115);

      [left, right].forEach((mesh) => {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
      });

      return group;
    },
  },
];

const POSE_MAP = new Map(POSES.map((pose) => [pose.id, pose]));
const COSMETIC_MAP = new Map(COSMETICS.map((cosmetic) => [cosmetic.id, cosmetic]));

init();
setupUI();
loadPose(currentPoseId);
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06070d);
  scene.fog = new THREE.Fog(0x06070d, 8, 18);

  camera = new THREE.PerspectiveCamera(50, getAspect(), 0.1, 100);
  camera.position.set(1.8, 1.55, 2.8);

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(window.devicePixelRatio);
  resizeRenderer();
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1.2;
  controls.maxDistance = 6;
  controls.maxPolarAngle = Math.PI / 1.75;

  const ambient = new THREE.HemisphereLight(0xe8efff, 0x0d0f16, 0.55);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(2.5, 4.5, 3.4);
  keyLight.castShadow = true;
  keyLight.shadow.radius = 6;
  keyLight.shadow.mapSize.set(1024, 1024);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x6d9bf7, 0.8);
  rimLight.position.set(-3.2, 3.2, -2.5);
  scene.add(rimLight);

  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(2.8, 2.8, 0.05, 64),
    new THREE.MeshStandardMaterial({
      color: 0x1a1c2c,
      roughness: 0.85,
      metalness: 0.1,
    })
  );
  floor.receiveShadow = true;
  floor.position.y = -0.02;
  scene.add(floor);

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
  poseSelect.addEventListener("change", async (event) => {
    if (event.target.value === currentPoseId || isChangingPose) return;
    currentPoseId = event.target.value;
    await loadPose(currentPoseId);
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

async function loadPose(poseId) {
  const pose = POSE_MAP.get(poseId) ?? POSE_MAP.get("default");
  if (!pose) return;
  isChangingPose = true;

  if (gorilla) {
    scene.remove(gorilla);
    gorilla = undefined;
    gorillaMeasurements = undefined;
  }

  try {
    const template = await loadGLTF(pose.path);
    const model = template.clone(true);
    prepareModel(model);
    if (pose.tweak) {
      pose.tweak(model);
    }
    gorilla = model;
    scene.add(gorilla);
    gorillaMeasurements = measureModel(gorilla);
    updateColor();
    await refreshCosmetics();
  } catch (error) {
    console.error("Kon pose niet laden", error);
  } finally {
    isChangingPose = false;
  }
}

function prepareModel(model) {
  model.traverse((child) => {
    if (child.isMesh) {
      child.material = child.material.clone();
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= box.min.y;
}

function measureModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  return {
    box,
    size,
    center,
    top: box.max.y,
    bottom: box.min.y,
    front: box.max.z,
    back: box.min.z,
    left: box.min.x,
    right: box.max.x,
  };
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

  const color = new THREE.Color(`rgb(${r}, ${g}, ${b})`);

  colorPreview.style.background = `rgb(${r}, ${g}, ${b})`;
  const hex = `#${color.getHexString().toUpperCase()}`;
  colorCode.textContent = `RGB (${rSteps}, ${gSteps}, ${bSteps}) • Hex ${hex}`;

  if (!gorilla) return;

  gorilla.traverse((child) => {
    if (child.isMesh && child.material && child.material.color) {
      child.material.color.copy(color);
      if (child.material.emissive) {
        child.material.emissive.setRGB(color.r * 0.1, color.g * 0.1, color.b * 0.1);
      }
    }
  });

}

async function refreshCosmetics() {
  if (!gorilla || !gorillaMeasurements) return;

  cosmeticInstances.forEach((object) => {
    gorilla.remove(object);
  });
  cosmeticInstances.clear();

  for (const id of selectedCosmetics) {
    const cosmetic = COSMETIC_MAP.get(id);
    if (!cosmetic) continue;

    let instance;
    if (cosmetic.type === "gltf") {
      instance = (await loadGLTF(cosmetic.path)).clone(true);
      instance.traverse((child) => {
        if (child.isMesh) {
          child.material = child.material.clone();
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    } else if (typeof cosmetic.create === "function") {
      instance = cosmetic.create(gorillaMeasurements);
    }

    if (!instance) continue;

    let finalInstance = instance;
    if (typeof cosmetic.adjust === "function") {
      const adjusted = cosmetic.adjust(instance, gorillaMeasurements);
      if (adjusted instanceof THREE.Object3D) {
        finalInstance = adjusted;
      }
    }

    gorilla.add(finalInstance);
    cosmeticInstances.set(id, finalInstance);
  }
}

function downloadImage() {
  const link = document.createElement("a");
  link.download = `gorillatag-${Date.now()}.png`;
  link.href = renderer.domElement.toDataURL("image/png");
  link.click();
}

function animate() {
  requestAnimationFrame(animate);
  if (gorilla && !isChangingPose) {
    gorilla.rotation.y += 0.0035;
  }
  controls.update();
  renderer.render(scene, camera);
}

function getAspect() {
  const { clientWidth, clientHeight } = canvas.parentElement;
  return clientWidth / clientHeight;
}

function resizeRenderer() {
  const { clientWidth, clientHeight } = canvas.parentElement;
  renderer.setSize(clientWidth, clientHeight, false);
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
}

function loadGLTF(path) {
  if (!assetCache.has(path)) {
    const promise = new Promise((resolve, reject) => {
      loader.load(
        path,
        (gltf) => resolve(gltf.scene),
        undefined,
        (error) => reject(error)
      );
    });
    assetCache.set(path, promise);
  }
  return assetCache.get(path);
}
