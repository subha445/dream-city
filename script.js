
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const container = document.getElementById("cityCanvas");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bc9e8);
scene.fog = new THREE.Fog(0x9bc9e8, 150, 420);

const camera = new THREE.PerspectiveCamera(
  60, container.clientWidth / container.clientHeight, 0.1, 1000
);
camera.position.set(75, 65, 85);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2.05;
controls.maxDistance = 230;
controls.minDistance = 15;
controls.target.set(0, 0, 0);

const hemi = new THREE.HemisphereLight(0xd9efff, 0x45513c, 2);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff0d5, 3);
sun.position.set(90, 130, 70);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -150;
sun.shadow.camera.right = 150;
sun.shadow.camera.top = 150;
sun.shadow.camera.bottom = -150;
scene.add(sun);

const mat = (color, roughness = 0.8, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

const materials = {
  grass: mat(0x527d48),
  road: mat(0x30363b, 0.95),
  sidewalk: mat(0x9b9b91),
  line: mat(0xf5e8bd),
  white: mat(0xe8e8e2),
  glass: new THREE.MeshStandardMaterial({
    color: 0x75c9e8, roughness: 0.16, metalness: 0.55,
    transparent: true, opacity: 0.8
  }),
  darkGlass: mat(0x183b50, 0.2, 0.5),
  concrete: mat(0xaaa99e),
  water: new THREE.MeshStandardMaterial({
    color: 0x168bb5, roughness: 0.2, metalness: 0.35,
    transparent: true, opacity: 0.85
  }),
  tree: mat(0x286c38),
  trunk: mat(0x725039),
  metal: mat(0x535e68, 0.35, 0.8)
};

function box(parent, x, y, z, w, h, d, material) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d), material
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinder(parent, x, y, z, r1, r2, h, material) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(r1, r2, h, 12), material
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(500, 500),
  materials.grass
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const objects = [];
let selected = null;
let currentTool = "select";
let isNight = false;
let raining = false;
let exploring = false;
let rainPoints = null;
let rainVelocity = null;

function register(group, type) {
  group.userData.type = type;
  group.userData.placeable = true;
  scene.add(group);
  objects.push(group);
  updateStats();
  return group;
}

function updateStats() {
  const buildings = objects.filter(o =>
    ["house", "office", "tower", "mall", "hospital", "school",
     "airport", "station"].includes(o.userData.type)
  ).length;

  const trees = objects.filter(o => o.userData.type === "park").length;

  document.getElementById("buildingCount").textContent = buildings;
  document.getElementById("treeCount").textContent = trees * 5;
  document.getElementById("objectCount").textContent = objects.length;
}

function createRoads() {
  for (let i = -4; i <= 4; i++) {
    const p = i * 40;

    box(scene, 0, 0.04, p, 500, 0.08, 12, materials.road);
    box(scene, p, 0.04, 0, 12, 0.08, 500, materials.road);

    for (let n = -240; n < 240; n += 12) {
      box(scene, n, 0.09, p, 5, 0.025, 0.18, materials.line);
      box(scene, p, 0.09, n, 0.18, 0.025, 5, materials.line);
    }

    for (const side of [-1, 1]) {
      box(scene, 0, 0.12, p + side * 7.5, 500, 0.2, 3, materials.sidewalk);
      box(scene, p + side * 7.5, 0.12, 0, 3, 0.2, 500, materials.sidewalk);
    }
  }
}

createRoads();

function addWindows(group, width, height, depth, floors, color = 0x183e54) {
  const windowMat = mat(color, 0.2, 0.3);
  const rows = Math.max(2, Math.floor(height / 3));

  for (let row = 0; row < rows; row++) {
    const y = 2 + row * (height - 3) / rows;

    for (let x = -width / 2 + 2; x < width / 2 - 1; x += 3.2) {
      box(group, x, y, depth / 2 + 0.035, 1.8, 1.5, 0.08, windowMat);
      box(group, x, y, -depth / 2 - 0.035, 1.8, 1.5, 0.08, windowMat);
    }

    for (let z = -depth / 2 + 2; z < depth / 2 - 1; z += 3.2) {
      box(group, width / 2 + 0.035, y, z, 0.08, 1.5, 1.8, windowMat);
      box(group, -width / 2 - 0.035, y, z, 0.08, 1.5, 1.8, windowMat);
    }
  }
}

function createBuilding(type, x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  let width = 18, depth = 16, height = 15;
  let color = 0xd0c7b7;

  if (type === "house") {
    width = 13; depth = 12; height = 8; color = 0xe5d4b8;
  }
  if (type === "office") {
    width = 17; depth = 15; height = 30; color = 0x718995;
  }
  if (type === "tower") {
    width = 18; depth = 18; height = 65; color = 0x789baa;
  }
  if (type === "mall") {
    width = 30; depth = 24; height = 14; color = 0xd8d8d0;
  }
  if (type === "hospital") {
    width = 25; depth = 20; height = 25; color = 0xe8e9e6;
  }
  if (type === "school") {
    width = 25; depth = 18; height = 12; color = 0xe6c99c;
  }
  if (type === "airport") {
    width = 42; depth = 28; height = 12; color = 0xb7c8d0;
  }
  if (type === "station") {
    width = 35; depth = 20; height = 12; color = 0xc3c8c6;
  }

  box(group, 0, height / 2, 0, width, height, depth, mat(color, 0.65));

  if (type === "house") {
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(10, 7, 4),
      mat(0x8b4538)
    );
    roof.position.y = height + 3;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);
    box(group, 0, 2, depth / 2 + 0.08, 2.5, 4, 0.15, mat(0x68412d));
  } else {
    addWindows(group, width, height, depth);

    if (type === "tower" || type === "office") {
      box(group, 0, height + 0.5, 0, width + 1, 1, depth + 1, materials.concrete);
      box(group, 0, height / 2, depth / 2 + 0.1, width * 0.35, height * 0.65, 0.15, materials.glass);
    }

    if (type === "mall") {
      box(group, 0, 1.5, depth / 2 + 0.1, 12, 3, 0.2, materials.darkGlass);
      box(group, 0, height + 0.5, 0, width + 2, 1, depth + 2, mat(0xffffff));
      box(group, 0, height + 2, 0, 8, 2, 5, mat(0x1686a1));
    }

    if (type === "hospital") {
      box(group, 0, height + 2, 0, 5, 4, 5, mat(0xffffff));
      box(group, 0, height + 2, 2.6, 1, 3, 0.2, mat(0xd52b36));
      box(group, 0, height + 2, 2.7, 3, 1, 0.2, mat(0xd52b36));
    }

    if (type === "school") {
      box(group, 0, height + 1, 0, 9, 2, 5, mat(0xb34a32));
      box(group, 0, 2, depth / 2 + 0.12, 6, 3, 0.2, materials.darkGlass);
    }

    if (type === "airport" || type === "station") {
      const roof = new THREE.Mesh(
        new THREE.CylinderGeometry(width / 2, width / 2, 2, 4, 1, false, 0, Math.PI),
        mat(0x647985)
      );
      roof.position.y = height + 1;
      roof.scale.z = depth / width;
      group.add(roof);
      box(group, 0, 2, depth / 2 + 0.1, width * 0.65, 3, 0.2, materials.glass);
    }
  }

  return register(group, type);
}

function createTree(parent, x, z, scale = 1) {
  cylinder(parent, x, 2 * scale, z, 0.45 * scale, 0.6 * scale, 4 * scale, materials.trunk);

  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(2.3 * scale, 10, 8),
    materials.tree
  );
  crown.position.set(x, 5 * scale, z);
  crown.castShadow = true;
  parent.add(crown);

  const crown2 = new THREE.Mesh(
    new THREE.SphereGeometry(1.6 * scale, 10, 8),
    mat(0x39834a)
  );
  crown2.position.set(x + 1 * scale, 6 * scale, z);
  parent.add(crown2);
}

function createPark(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  box(group, 0, 0.15, 0, 28, 0.3, 25, mat(0x6a9a50));

  for (let i = 0; i < 5; i++) {
    createTree(group, -10 + i * 5, -7, 0.9);
  }

  box(group, 0, 0.4, 5, 16, 0.3, 2, materials.sidewalk);
  return register(group, "park");
}

function createWater(type, x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const water = new THREE.Mesh(
    new THREE.CircleGeometry(type === "beach" ? 19 : 13, 48),
    materials.water
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.2;
  group.add(water);

  if (type === "beach") {
    const sand = new THREE.Mesh(
      new THREE.CircleGeometry(23, 48),
      mat(0xe6d19a)
    );
    sand.rotation.x = -Math.PI / 2;
    sand.position.y = 0.05;
    group.add(sand);
    water.scale.set(0.75, 0.75, 1);
    for (let i = 0; i < 4; i++) createTree(group, -13 + i * 8, 12, 0.8);
  }

  return register(group, type);
}

function createBridge(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  box(group, 0, 2, 0, 30, 1, 9, materials.concrete);

  for (const side of [-1, 1]) {
    box(group, 0, 3.2, side * 4.2, 30, 0.25, 0.25, materials.metal);
    for (let i = -13; i <= 13; i += 3) {
      box(group, i, 2.6, side * 4.2, 0.2, 1.2, 0.2, materials.metal);
    }
  }
  return register(group, "bridge");
}

function createTraffic(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  cylinder(group, 0, 3, 0, 0.12, 0.12, 6, materials.metal);
  box(group, 0, 5, 0, 1.1, 2.8, 0.8, mat(0x22272a));

  [0x26d45c, 0xffc928, 0xe52e37].forEach((color, i) => {
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 12, 12),
      new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: i === 0 ? 1 : 0.08
      })
    );
    bulb.position.set(0, 4.1 - i * 0.85, 0.45);
    group.add(bulb);
  });
  return register(group, "traffic");
}

function createCar(x, z, color = 0xc52e35) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const paint = new THREE.MeshStandardMaterial({
    color, metalness: 0.55, roughness: 0.28
  });

  box(group, 0, 1, 0, 5, 1.2, 2.5, paint);
  box(group, -0.3, 1.9, 0, 2.7, 0.9, 2.1, materials.darkGlass);

  for (const xx of [-1.6, 1.6]) {
    for (const zz of [-1.3, 1.3]) {
      const wheel = cylinder(group, xx, 0.55, zz, 0.55, 0.55, 0.3, mat(0x17191b));
      wheel.rotation.z = Math.PI / 2;
    }
  }

  box(group, 2.53, 1, -0.7, 0.08, 0.35, 0.35, mat(0xfff2c0));
  box(group, 2.53, 1, 0.7, 0.08, 0.35, 0.35, mat(0xfff2c0));

  return register(group, "car");
}

function createStreetlights() {
  for (let i = -4; i <= 4; i++) {
    for (const side of [-1, 1]) {
      const x = i * 40 + side * 10;
      const z = 10;
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      cylinder(group, 0, 4, 0, 0.12, 0.18, 8, materials.metal);
      box(group, 0.8, 8, 0, 1.8, 0.15, 0.2, materials.metal);
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 12, 12),
        new THREE.MeshStandardMaterial({
          color: 0xffe5a0, emissive: 0xffd477, emissiveIntensity: 0.5
        })
      );
      bulb.position.set(1.5, 7.8, 0);
      group.add(bulb);
      scene.add(group);
    }
  }
}

createStreetlights();

// Starter city
createBuilding("house", -25, -25);
createBuilding("house", 25, -25);
createBuilding("office", -65, -25);
createBuilding("tower", 65, -25);
createBuilding("mall", -65, 25);
createBuilding("hospital", 65, 25);
createBuilding("school", -25, 65);
createBuilding("airport", 105, 65);
createBuilding("station", -105, 65);
createPark(25, 65);
createWater("lake", 105, -65);
createWater("beach", -105, -65);
createBridge(0, 105);
createTraffic(12, 12);
createCar(-15, 10, 0xd52f35);
createCar(20, -10, 0x2567bd);
createCar(-55, 10, 0xe5e5e5);

// Tool selection
document.querySelectorAll("[data-tool]").forEach(button => {
  button.addEventListener("click", () => {
    currentTool = button.dataset.tool;
    setStatus("Selected: " + currentTool.toUpperCase() + " — tap the ground to place it");
  });
});

function setStatus(message) {
  document.getElementById("status").textContent = message;
}

document.getElementById("selectBtn").onclick = () => currentTool = "select";
document.getElementById("rotateBtn").onclick = () => currentTool = "rotate";
document.getElementById("deleteBtn").onclick = () => currentTool = "delete";

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function getGroundPoint(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(ground);
  return hit.length ? hit[0].point : null;
}

function findPlaceable(obj) {
  while (obj && !obj.userData.placeable) obj = obj.parent;
  return obj;
}

renderer.domElement.addEventListener("pointerdown", event => {
  if (exploring) return;

  const point = getGroundPoint(event);
  if (!point) return;

  if (currentTool === "select" || currentTool === "delete" || currentTool === "rotate") {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(objects, true);
    if (!hits.length) return;

    const target = findPlaceable(hits[0].object);
    if (!target) return;

    if (currentTool === "delete") {
      scene.remove(target);
      objects.splice(objects.indexOf(target), 1);
      selected = null;
      updateStats();
      setStatus("Object deleted");
    } else if (currentTool === "rotate") {
      target.rotation.y += Math.PI / 4;
      setStatus("Object rotated");
    } else {
      selected = target;
      setStatus("Selected: " + target.userData.type);
    }
    return;
  }

  const x = Math.round(point.x / 5) * 5;
  const z = Math.round(point.z / 5) * 5;

  if (["house", "office", "tower", "mall", "hospital",
       "school", "airport", "station"].includes(currentTool)) {
    createBuilding(currentTool, x, z);
  } else if (currentTool === "park") {
    createPark(x, z);
  } else if (currentTool === "lake" || currentTool === "beach") {
    createWater(currentTool, x, z);
  } else if (currentTool === "bridge") {
    createBridge(x, z);
  } else if (currentTool === "traffic") {
    createTraffic(x, z);
  } else if (currentTool === "car") {
    createCar(x, z, Math.random() * 0xffffff);
  }

  setStatus(currentTool.toUpperCase() + " placed!");
});

// Save and load
document.getElementById("saveBtn").onclick = () => {
  const data = objects.map(o => ({
    type: o.userData.type,
    x: o.position.x,
    z: o.position.z,
    rotation: o.rotation.y
  }));
  localStorage.setItem("dreamCity4Save", JSON.stringify(data));
  setStatus("City saved on this device!");
};

function clearObjects() {
  objects.forEach(o => scene.remove(o));
  objects.length = 0;
  selected = null;
  updateStats();
}

function loadCity() {
  const saved = localStorage.getItem("dreamCity4Save");
  if (!saved) {
    setStatus("No saved city found");
    return;
  }

  clearObjects();

  JSON.parse(saved).forEach(item => {
    const { type, x, z, rotation } = item;

    if (["house", "office", "tower", "mall", "hospital",
         "school", "airport", "station"].includes(type)) {
      createBuilding(type, x, z);
    } else if (type === "park") createPark(x, z);
    else if (type === "lake" || type === "beach") createWater(type, x, z);
    else if (type === "bridge") createBridge(x, z);
    else if (type === "traffic") createTraffic(x, z);
    else if (type === "car") createCar(x, z);

    if (objects.length) objects[objects.length - 1].rotation.y = rotation;
  });

  setStatus("Saved city loaded!");
}

document.getElementById("loadBtn").onclick = loadCity;

document.getElementById("resetBtn").onclick = () => {
  if (!confirm("Reset your city?")) return;
  clearObjects();
  createBuilding("house", -25, -25);
  createBuilding("office", -65, -25);
  createBuilding("tower", 65, -25);
  createBuilding("mall", -65, 25);
  createBuilding("hospital", 65, 25);
  createBuilding("school", -25, 65);
  createPark(25, 65);
  createWater("lake", 105, -65);
  createCar(-15, 10);
  setStatus("City reset!");
};

// Day and night
function setNight(value) {
  isNight = value;
  if (value) {
    scene.background = new THREE.Color(0x071426);
    scene.fog.color.set(0x071426);
    hemi.intensity = 0.35;
    sun.intensity = 0.3;
    renderer.toneMappingExposure = 0.75;
  } else {
    scene.background = new THREE.Color(0x9bc9e8);
    scene.fog.color.set(0x9bc9e8);
    hemi.intensity = 2;
    sun.intensity = 3;
    renderer.toneMappingExposure = 1.15;
  }
}

document.getElementById("dayBtn").onclick = () => setNight(false);
document.getElementById("nightBtn").onclick = () => setNight(true);

// Rain
function toggleRain() {
  raining = !raining;

  if (raining) {
    const count = 1200;
    const positions = new Float32Array(count * 3);
    rainVelocity = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 250;
      positions[i * 3 + 1] = Math.random() * 100;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 250;
      rainVelocity.push(0.5 + Math.random() * 0.8);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    rainPoints = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ color: 0xcceaff, size: 0.35 })
    );
    scene.add(rainPoints);
    setStatus("Rain started");
  } else {
    if (rainPoints) scene.remove(rainPoints);
    rainPoints = null;
    setStatus("Rain stopped");
  }
}

document.getElementById("rainBtn").onclick = toggleRain;

// Explore mode
const keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

let mobileControls;

function movePlayer() {
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  direction.y = 0;
  direction.normalize();

  const right = new THREE.Vector3().crossVectors(direction, camera.up).normalize();
  const speed = 0.65;

  if (keys.w || keys.arrowup) camera.position.addScaledVector(direction, speed);
  if (keys.s || keys.arrowdown) camera.position.addScaledVector(direction, -speed);
  if (keys.a || keys.arrowleft) camera.position.addScaledVector(right, speed);
  if (keys.d || keys.arrowright) camera.position.addScaledVector(right, -speed);

  controls.target.copy(camera.position).add(direction);
}

function createMobileControls() {
  if (mobileControls) return;

  mobileControls = document.createElement("div");
  mobileControls.style.cssText =
    "position:absolute;bottom:18px;left:18px;z-index:10;display:grid;grid-template-columns:repeat(3,48px);gap:5px;";

  const directions = [
    ["", ""], ["↑", "w"], ["", ""],
    ["←", "a"], ["↓", "s"], ["→", "d"]
  ];

  directions.forEach(([label, key]) => {
    const button = document.createElement("button");
    button.textContent = label;
    button.style.cssText = "height:44px;font-size:20px;padding:4px;";
    if (key) {
      button.addEventListener("pointerdown", e => {
        e.preventDefault();
        keys[key] = true;
      });
      ["pointerup", "pointerleave", "pointercancel"].forEach(type =>
        button.addEventListener(type, () => keys[key] = false)
      );
    }
    mobileControls.appendChild(button);
  });

  container.appendChild(mobileControls);
}

document.getElementById("exploreBtn").onclick = () => {
  exploring = !exploring;
  controls.enabled = !exploring;

  if (exploring) {
    createMobileControls();
    if (mobileControls) mobileControls.style.display = "grid";
    setStatus("Explore mode: use WASD, arrow keys or touch controls");
  } else {
    if (mobileControls) mobileControls.style.display = "none";
    setStatus("City building mode");
  }
};

// Animation
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);

  if (exploring) movePlayer();
  else controls.update();

  if (rainPoints) {
    const positions = rainPoints.geometry.attributes.position.array;
    for (let i = 0; i < positions.length / 3; i++) {
      positions[i * 3 + 1] -= rainVelocity[i] * 2;
      if (positions[i * 3 + 1] < 0) {
        positions[i * 3 + 1] = 100;
      }
    }
    rainPoints.geometry.attributes.position.needsUpdate = true;
  }

  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});

animate();
setStatus("DREAM CITY 4.0 — Welcome to your city!");
