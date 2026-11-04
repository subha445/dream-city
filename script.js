
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const container = document.getElementById("cityCanvas");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87bde8);
scene.fog = new THREE.Fog(0x87bde8, 55, 130);

const camera = new THREE.PerspectiveCamera(
  55,
  container.clientWidth / container.clientHeight,
  0.1,
  300
);
camera.position.set(28, 28, 32);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2.05;
controls.minDistance = 8;
controls.maxDistance = 90;

const ambient = new THREE.HemisphereLight(0xffffff, 0x52645a, 2);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.position.set(25, 40, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

const objects = [];
let selected = null;
let currentTool = "select";
let night = false;
let raining = false;
let rain = null;

const materials = {
  road: new THREE.MeshStandardMaterial({ color: 0x303943 }),
  white: new THREE.MeshStandardMaterial({ color: 0xe7edf0 }),
  glass: new THREE.MeshStandardMaterial({
    color: 0x78c7e8,
    metalness: 0.4,
    roughness: 0.2
  }),
  wood: new THREE.MeshStandardMaterial({ color: 0x96613d }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x277d3b }),
  concrete: new THREE.MeshStandardMaterial({ color: 0x9ca8b0 }),
  yellow: new THREE.MeshStandardMaterial({
    color: 0xf5cf65,
    emissive: 0x4b3100
  })
};

function makeMesh(geometry, material, x, y, z, parent) {
  const obj = new THREE.Mesh(geometry, material);
  obj.position.set(x, y, z);
  obj.castShadow = true;
  obj.receiveShadow = true;
  parent.add(obj);
  return obj;
}

// Ground
const ground = makeMesh(
  new THREE.BoxGeometry(100, 0.4, 100),
  new THREE.MeshStandardMaterial({ color: 0x4e9b57 }),
  0, -0.3, 0, scene
);

const grid = new THREE.GridHelper(100, 50, 0x47744d, 0x63916a);
grid.position.y = -0.08;
scene.add(grid);

// Object registration
function register(group, type) {
  group.userData.type = type;
  scene.add(group);
  objects.push(group);
  return group;
}

// Roads
function createRoad(x, z, width, length, rotation = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;

  makeMesh(
    new THREE.BoxGeometry(width, 0.12, length),
    materials.road,
    0, 0.02, 0, group
  );

  for (let i = -length / 2 + 2; i < length / 2; i += 4) {
    makeMesh(
      new THREE.BoxGeometry(0.16, 0.025, 1.8),
      materials.yellow,
      0, 0.09, i, group
    );
  }

  return register(group, "road");
}

function createRoadNetwork() {
  createRoad(0, 0, 8, 90);
  createRoad(0, 0, 90, 8, Math.PI / 2);
  createRoad(-25, 0, 6, 90);
  createRoad(25, 0, 6, 90);
  createRoad(0, -25, 90, 6, Math.PI / 2);
  createRoad(0, 25, 90, 6, Math.PI / 2);
}

// Buildings
function createBuilding(type, x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  let height = 3;
  let width = 3;
  let depth = 3;
  let color = 0xe8b98b;

  if (type === "office") {
    height = 7;
    width = 4;
    depth = 4;
    color = 0x91b8c9;
  }

  if (type === "tower") {
    height = 14;
    width = 4;
    depth = 4;
    color = 0x8aa6c5;
  }

  makeMesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.6 }),
    0, height / 2, 0, group
  );

  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0x9be1ff,
    emissive: 0x123c55,
    metalness: 0.4
  });

  for (let floor = 0; floor < Math.floor(height / 1.5); floor++) {
    for (let side = -1; side <= 1; side++) {
      const y = 0.8 + floor * 1.4;

      makeMesh(
        new THREE.BoxGeometry(0.65, 0.55, 0.06),
        windowMaterial,
        side * (width / 3.5),
        y,
        depth / 2 + 0.04,
        group
      );

      makeMesh(
        new THREE.BoxGeometry(0.06, 0.55, 0.65),
        windowMaterial,
        width / 2 + 0.04,
        y,
        side * (depth / 3.5),
        group
      );
    }
  }

  if (type === "house") {
    const roof = makeMesh(
      new THREE.ConeGeometry(2.7, 2, 4),
      new THREE.MeshStandardMaterial({ color: 0x9c4938 }),
      0, height + 0.8, 0, group
    );
    roof.rotation.y = Math.PI / 4;
  } else {
    makeMesh(
      new THREE.BoxGeometry(width + 0.3, 0.3, depth + 0.3),
      materials.concrete,
      0, height + 0.15, 0, group
    );
  }

  return register(group, type);
}

// Trees
function createTree(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  makeMesh(
    new THREE.CylinderGeometry(0.18, 0.25, 1.5, 8),
    materials.wood,
    0, 0.75, 0, group
  );

  makeMesh(
    new THREE.SphereGeometry(1.1, 12, 10),
    materials.leaf,
    0, 2, 0, group
  );

  return register(group, "tree");
}

// Parks
function createPark(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  makeMesh(
    new THREE.BoxGeometry(9, 0.18, 9),
    new THREE.MeshStandardMaterial({ color: 0x65b86b }),
    0, 0.05, 0, group
  );

  for (let i = 0; i < 4; i++) {
    const a = (i % 2) * 5 - 2.5;
    const b = Math.floor(i / 2) * 5 - 2.5;

    createTree(x + a, z + b);
  }

  return register(group, "park");
}

// Street lamps
function createLamp(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  makeMesh(
    new THREE.CylinderGeometry(0.08, 0.1, 4, 8),
    materials.concrete,
    0, 2, 0, group
  );

  makeMesh(
    new THREE.SphereGeometry(0.35, 12, 12),
    new THREE.MeshStandardMaterial({
      color: 0xffe5a0,
      emissive: 0xffc44d,
      emissiveIntensity: 1
    }),
    0, 4.1, 0, group
  );

  const light = new THREE.PointLight(0xffd58a, 0, 12);
  light.position.set(0, 4, 0);
  group.add(light);
  group.userData.light = light;

  return register(group, "lamp");
}

// Initial city
function buildInitialCity() {
  createRoadNetwork();
  createBuilding("house", -12, -12);
  createBuilding("house", -19, -12);
  createBuilding("office", 12, -12);
  createBuilding("tower", 15, 13);
  createBuilding("office", -12, 13);
  createTree(-19, 15);
  createTree(20, -15);
}

buildInitialCity();

// Selection
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function findRoot(object) {
  let current = object;
  while (current && current.parent !== scene) {
    current = current.parent;
  }
  return current;
}

function selectObject(object) {
  if (selected) {
    selected.traverse(child => {
      if (child.material && child.material.emissive) {
        child.material.emissive.setHex(0x000000);
      }
    });
  }

  selected = object;

  if (selected) {
    selected.traverse(child => {
      if (child.material && child.material.emissive) {
        child.material.emissive.setHex(0x333333);
      }
    });
  }
}

// Placement and selection
renderer.domElement.addEventListener("pointerdown", event => {
  const rect = renderer.domElement.getBoundingClientRect();

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  if (currentTool === "select") {
    const hits = raycaster.intersectObjects(objects, true);
    selectObject(hits.length ? findRoot(hits[0].object) : null);
    return;
  }

  const hits = raycaster.intersectObject(ground);
  if (!hits.length) return;

  const point = hits[0].point;
  const x = Math.round(point.x / 3) * 3;
  const z = Math.round(point.z / 3) * 3;

  let created = null;

  if (["house", "office", "tower"].includes(currentTool)) {
    created = createBuilding(currentTool, x, z);
  }

  if (currentTool === "tree") created = createTree(x, z);
  if (currentTool === "park") created = createPark(x, z);
  if (currentTool === "lamp") created = createLamp(x, z);
  if (currentTool === "road") created = createRoad(x, z, 6, 18);

  if (created) {
    selectObject(created);
    updateStats();
    showMessage("Object added to your city!");
  }
});

// Tool selection
document.querySelectorAll(".tool").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tool").forEach(b =>
      b.classList.remove("active")
    );

    button.classList.add("active");
    currentTool = button.dataset.tool;
    showMessage("Selected: " + currentTool);
  });
});

// Rotate
document.getElementById("rotateBtn").addEventListener("click", () => {
  if (!selected) return showMessage("Select an object first!");
  selected.rotation.y += Math.PI / 4;
});

// Delete
document.getElementById("deleteBtn").addEventListener("click", () => {
  if (!selected) return showMessage("Select an object first!");

  scene.remove(selected);

  const index = objects.indexOf(selected);
  if (index !== -1) objects.splice(index, 1);

  selected = null;
  updateStats();
  showMessage("Object deleted!");
});

// Day and night
function setNight(value) {
  night = value;

  scene.background = new THREE.Color(
    night ? 0x071326 : 0x87bde8
  );

  scene.fog.color.set(night ? 0x071326 : 0x87bde8);
  ambient.intensity = night ? 0.35 : 2;
  sun.intensity = night ? 0.25 : 3;

  objects.forEach(object => {
    if (object.userData.light) {
      object.userData.light.intensity = night ? 2 : 0;
    }
  });

  showMessage(night ? "Night mode enabled!" : "Day mode enabled!");
}

document.getElementById("dayBtn").addEventListener("click", () => {
  setNight(false);
});

document.getElementById("nightBtn").addEventListener("click", () => {
  setNight(true);
});

// Rain
function toggleRain() {
  raining = !raining;

  if (raining) {
    const positions = [];

    for (let i = 0; i < 1500; i++) {
      positions.push(
        Math.random() * 100 - 50,
        Math.random() * 25 + 5,
        Math.random() * 100 - 50
      );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );

    rain = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: 0xc7e9ff,
        size: 0.12
      })
    );

    scene.add(rain);
  } else if (rain) {
    scene.remove(rain);
    rain.geometry.dispose();
    rain.material.dispose();
    rain = null;
  }

  showMessage(raining ? "Rain started!" : "Rain stopped!");
}

document.getElementById("rainBtn").addEventListener("click", toggleRain);

// Save
function saveCity() {
  const data = objects
    .filter(obj => obj.userData.type !== "road")
    .map(obj => ({
      type: obj.userData.type,
      x: obj.position.x,
      z: obj.position.z,
      rotation: obj.rotation.y
    }));

  localStorage.setItem("dreamCitySave", JSON.stringify(data));
  showMessage("City saved successfully!");
}

// Load
function loadCity() {
  const saved = localStorage.getItem("dreamCitySave");

  if (!saved) return showMessage("No saved city found!");

  objects.slice().forEach(obj => scene.remove(obj));
  objects.length = 0;
  selected = null;

  createRoadNetwork();

  JSON.parse(saved).forEach(item => {
    let obj = null;

    if (["house", "office", "tower"].includes(item.type)) {
      obj = createBuilding(item.type, item.x, item.z);
    } else if (item.type === "tree") {
      obj = createTree(item.x, item.z);
    } else if (item.type === "park") {
      obj = createPark(item.x, item.z);
    } else if (item.type === "lamp") {
      obj = createLamp(item.x, item.z);
    }

    if (obj) obj.rotation.y = item.rotation || 0;
  });

  updateStats();
  showMessage("Saved city loaded!");
}

document.getElementById("saveBtn").addEventListener("click", saveCity);
document.getElementById("loadBtn").addEventListener("click", loadCity);

// Reset
document.getElementById("resetBtn").addEventListener("click", () => {
  objects.slice().forEach(obj => scene.remove(obj));
  objects.length = 0;
  selected = null;

  buildInitialCity();

  localStorage.removeItem("dreamCitySave");
  updateStats();
  showMessage("City reset!");
});

// Statistics
function updateStats() {
  const count = type =>
    objects.filter(obj => obj.userData.type === type).length;

  document.getElementById("buildingCount").textContent =
    count("house") + count("office") + count("tower");

  document.getElementById("treeCount").textContent = count("tree");
  document.getElementById("roadCount").textContent = count("road");
  document.getElementById("totalCount").textContent = objects.length;
}

// Messages
let messageTimer;

function showMessage(message) {
  const box = document.getElementById("message");
  box.textContent = message;

  clearTimeout(messageTimer);

  messageTimer = setTimeout(() => {
    box.textContent = "Build your dream city!";
  }, 2500);
}

// Resize
window.addEventListener("resize", () => {
  const width = container.clientWidth;
  const height = container.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});

// Animation
function animate() {
  requestAnimationFrame(animate);

  if (rain) {
    const positions = rain.geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      let y = positions.getY(i) - 0.45;
      if (y < 0) y = 25;
      positions.setY(i, y);
    }

    positions.needsUpdate = true;
  }

  controls.update();
  renderer.render(scene, camera);
}

updateStats();
animate();

console.log("DREAM CITY successfully loaded!");
        
