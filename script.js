let scene, camera, renderer, gorilla, hat;
let THREEjs, LoaderClass;

export function init(THREE, GLTFLoader) {
  THREEjs = THREE;
  LoaderClass = GLTFLoader;

  // Scene setup
  scene = new THREEjs.Scene();
  camera = new THREEjs.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 3;

  renderer = new THREEjs.WebGLRenderer({ canvas: document.getElementById("canvas"), antialias: true });
  renderer.setSize(window.innerWidth * 0.8, window.innerHeight * 0.6);

  // Lights
  const light = new THREEjs.DirectionalLight(0xffffff, 1);
  light.position.set(5, 5, 5);
  scene.add(light);
  scene.add(new THREEjs.AmbientLight(0x404040));

  // Load Gorilla model
  const loader = new LoaderClass();
  loader.load("./assets/gorilla.glb", (gltf) => {
    gorilla = gltf.scene;
    scene.add(gorilla);
    updateColor();
  });

  // Event listeners
  document.getElementById("r").addEventListener("input", updateColor);
  document.getElementById("g").addEventListener("input", updateColor);
  document.getElementById("b").addEventListener("input", updateColor);

  document.getElementById("pose").addEventListener("change", changePose);
  document.getElementById("hat").addEventListener("change", toggleHat);
  document.getElementById("download").addEventListener("click", downloadImage);
}

function updateColor() {
  if (!gorilla) return;
  let r = document.getElementById("r").value * 28;
  let g = document.getElementById("g").value * 28;
  let b = document.getElementById("b").value * 28;
  gorilla.traverse((child) => {
    if (child.isMesh) {
      child.material.color.setRGB(r / 255, g / 255, b / 255);
    }
  });
}

function changePose(e) {
  const loader = new LoaderClass();
  if (gorilla) scene.remove(gorilla);

  if (e.target.value === "pose2") {
    loader.load("./assets/pose2.glb", (gltf) => {
      gorilla = gltf.scene;
      scene.add(gorilla);
      updateColor();
    });
  } else {
    loader.load("./assets/gorilla.glb", (gltf) => {
      gorilla = gltf.scene;
      scene.add(gorilla);
      updateColor();
    });
  }
}

function toggleHat(e) {
  const loader = new LoaderClass();
  if (e.target.checked) {
    loader.load("./assets/hat.glb", (gltf) => {
      hat = gltf.scene;
      scene.add(hat);
    });
  } else if (hat) {
    scene.remove(hat);
    hat = null;
  }
}

function downloadImage() {
  const link = document.createElement("a");
  link.download = "gorillatag.png";
  link.href = renderer.domElement.toDataURL("image/png");
  link.click();
}

export function animate() {
  requestAnimationFrame(animate);
  if (gorilla) gorilla.rotation.y += 0.01;
  renderer.render(scene, camera);
}
