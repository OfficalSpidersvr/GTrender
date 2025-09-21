import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js";
let scene, camera, renderer, gorilla, hat;

init();
animate();

function init() {
  // Scene setup
  scene = const loader = new GLTFLoader();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.z = 3;

  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("canvas"), antialias: true });
  renderer.setSize(window.innerWidth*0.8, window.innerHeight*0.6);

  // Lights
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5, 5, 5);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x404040));

  // Load Gorilla model
  const loader = new THREE.GLTFLoader();
  loader.load(".assets/gorilla.glb", (gltf) => {
    gorilla = gltf.scene;
    scene.add(gorilla);
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
      child.material.color.setRGB(r/255, g/255, b/255);
    }
  });
}

function changePose(e) {
  const value = e.target.value;
  const loader = new THREE.GLTFLoader();

  if (value === "pose2") {
    loader.load("assets/pose2.glb", (gltf) => {
      if (gorilla) scene.remove(gorilla);
      gorilla = gltf.scene;
      scene.add(gorilla);
      updateColor();
    });
  } else {
    loader.load("assets/gorilla.glb", (gltf) => {
      if (gorilla) scene.remove(gorilla);
      gorilla = gltf.scene;
      scene.add(gorilla);
      updateColor();
    });
  }
}

function toggleHat(e) {
  const checked = e.target.checked;
  const loader = new THREE.GLTFLoader();
  if (checked) {
    loader.load("assets/hat.glb", (gltf) => {
      hat = gltf.scene;
      scene.add(hat);
    });
  } else {
    if (hat) {
      scene.remove(hat);
      hat = null;
    }
  }
}

function downloadImage() {
  const link = document.createElement("a");
  link.download = "gorillatag.png";
  link.href = renderer.domElement.toDataURL("image/png");
  link.click();
}

function animate() {
  requestAnimationFrame(animate);
  if (gorilla) gorilla.rotation.y += 0.01;
  renderer.render(scene, camera);
}
