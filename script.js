
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ======================================
// DREAM CITY 2.0
// ======================================

const container = document.getElementById("cityCanvas");
const status = document.getElementById("status");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x91c9ed);
scene.fog = new THREE.Fog(0x91c9ed, 65, 145);

const camera = new THREE.PerspectiveCamera(
  55,
  container.clientWidth / container.clientHeight,
  0.1,
  300
);

camera.position.set(35, 32, 42);

const renderer = new THREE.WebGLRenderer({
  antialias: true
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2.05;
controls.minDistance = 12;
controls.maxDistance = 100;

// ======================================
// LIGHTING
// ======================================

const ambient = new THREE.HemisphereLight(0xffffff, 0x526b56, 2);
scene.add(ambient);

const sunlight = new THREE.DirectionalLight(0xffffff, 2.5);
sunlight.position.set(35, 55, 25);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(1024, 1024);
scene.add(sunlight);

// ======================================
// MATERIALS
// ======================================

const materials = {
  grass: new THREE.MeshStandardMaterial({ color: 0x528b4d }),
  road: new THREE.MeshStandardMaterial({ color: 0x303944 }),
  line: new THREE.MeshStandardMaterial({ color: 0xf6d76a }),
  white: new THREE.MeshStandardMaterial({ color: 0xf1eee8 }),
  glass: new THREE.MeshStandardMaterial({
    color: 0x58b9d5,
    metalness: 0.35,
    roughness: 0.2
  }),
  wood: new THREE.MeshStandardMaterial({ color: 0x956044 }),
  tree: new THREE.MeshStandardMaterial({ color: 0x237343 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x765039 }),
  water: new THREE.MeshStandardMaterial({
    color: 0x20bde8,
    metalness: 0.2,
    roughness: 0.2
  })
};

// ======================================
// GROUND AND ROADS
// ======================================

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(110, 110),
  materials.grass
);

ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(100, 40, 0x8fbd7d, 0x75a76b);
grid.position.y = 0.025;
scene.add(grid);

function addBox(parent, w, h, d, material, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    material
  );

  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createRoads() {
  for (let i = -2; i <= 2; i++) {
    const p = i * 20;

    addBox(scene, 110, 0.12, 7, materials.road, 0, 0.08, p);
    addBox(scene, 7, 0.12, 110, materials.road, p, 0.09, 0);

    for (let n = -50; n <= 50; n += 5) {
      addBox(scene, 2.3, 0.025, 0.13, materials.line, n, 0.16, p);
      addBox(scene, 0.13, 0.025, 2.3, materials.line, p, 0.17, n);
    }
  }
}

createRoads();

// ======================================
// CITY OBJECTS
// ======================================

let objects = [];
let selectedObject = null;
let currentTool = "house";
let isNight = false;
let raining = false;

const random = (min, max) => Math.random() * (max - min) + min;

function register(group, kind, x, z) {
  group.userData.placeable = true;
  group.userData.kind = kind;
  group.userData.baseX = x;
  group.userData.baseZ = z;
  group.position.set(x, 0, z);
  scene.add(group);
  objects.push(group);
  updateStats();
  return group;
}

// ======================================
// TREES
// ======================================

function makeTree(parent, x, z, scale = 1) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.22, 1.4, 8),
    materials.trunk
  );

  trunk.position.set(x, 0.7 * scale, z);
  trunk.scale.setScalar(scale);
  trunk.castShadow = true;
  parent.add(trunk);

  const leaves = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 12, 10),
    materials.tree
  );

  leaves.position.set(x, 1.65 * scale, z);
  leaves.scale.set(1, 1.2, 1);
  leaves.scale.multiplyScalar(scale);
  leaves.castShadow = true;
  parent.add(leaves);
}

function createTree(x, z) {
  const group = new THREE.Group();
  makeTree(group, 0, 0, 1);
  return register(group, "tree", x, z);
}

// ======================================
// MODERN HOUSE
// ======================================

function createHouse(x, z) {
  const group = new THREE.Group();

  const colors = [0xe8e2d8, 0xd5e4e9, 0xe9d3bd, 0xd2d8e3];
  const wall = new THREE.MeshStandardMaterial({
    color: colors[Math.floor(Math.random() * colors.length)]
  });

  addBox(group, 5, 3.5, 5, wall, 0, 1.75, 0);
  addBox(group, 5.5, 0.3, 5.5, materials.wood, 0, 3.65, 0);

  addBox(group, 1.5, 2, 0.12, materials.wood, 0, 1.1, 2.56);

  addBox(group, 1.2, 1.1, 0.12, materials.glass, -1.5, 2.1, 2.56);
  addBox(group, 1.2, 1.1, 0.12, materials.glass, 1.5, 2.1, 2.56);

  addBox(group, 5.8, 0.2, 1.5, materials.white, 0, 0.1, 3.1);

  return register(group, "house", x, z);
}

// ======================================
// OFFICE BUILDING
// ======================================

function createOffice(x, z) {
  const group = new THREE.Group();

  const wall = new THREE.MeshStandardMaterial({
    color: 0xb8d4df,
    metalness: 0.25,
    roughness: 0.25
  });

  addBox(group, 7, 10, 7, wall, 0, 5, 0);

  for (let y = 1.5; y < 10; y += 2) {
    addBox(group, 7.08, 0.12, 7.08, materials.white, 0, y, 0);
  }

  for (let y = 1; y < 10; y += 1.5) {
    for (let x1 = -2.2; x1 <= 2.2; x1 += 1.5) {
      addBox(group, 0.9, 0.8, 0.08, materials.glass, x1, y, 3.55);
    }
  }

  addBox(group, 7.5, 0.35, 7.5, materials.white, 0, 10.15, 0);

  return register(group, "office", x, z);
}

// ======================================
// SKYSCRAPER
// ======================================

function createTower(x, z) {
  const group = new THREE.Group();

  const height = random(20, 30);

  addBox(group, 7, height, 7, materials.glass, 0, height / 2, 0);

  for (let y = 2; y < height; y += 2.5) {
    addBox(group, 7.1, 0.13, 7.1, materials.white, 0, y, 0);
  }

  const top = new THREE.Mesh(
    new THREE.ConeGeometry(4.5, 4, 4),
    materials.white
  );

  top.position.y = height + 2;
  top.castShadow = true;
  group.add(top);

  return register(group, "tower", x, z);
}

// ======================================
// SWIMMING POOL
// ======================================

function createPool(x, z) {
  const group = new THREE.Group();

  addBox(group, 7, 0.4, 5, materials.white, 0, 0.2, 0);
  addBox(group, 6.4, 0.12, 4.4, materials.water, 0, 0.43, 0);

  const border = new THREE.MeshStandardMaterial({ color: 0xc5c5c5 });

  addBox(group, 7.2, 0.15, 0.25, border, 0, 0.48, 2.55);
  addBox(group, 7.2, 0.15, 0.25, border, 0, 0.48, -2.55);

  return register(group, "pool", x, z);
}

// ======================================
// PARK
// ======================================

function createPark(x, z) {
  const group = new THREE.Group();

  addBox(group, 10, 0.15, 10, materials.grass, 0, 0.08, 0);

  for (let i = 0; i < 7; i++) {
    makeTree(
      group,
      random(-4, 4),
      random(-4, 4),
      random(0.7, 1.1)
    );
  }

  return register(group, "park", x, z);
}

// ======================================
// STREETLIGHT
// ======================================

function createLamp(x, z) {
  const group = new THREE.Group();

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 4, 8),
    materials.white
  );

  pole.position.y = 2;
  group.add(pole);

  addBox(group, 0.8, 0.15, 0.25, materials.white, 0.3, 4, 0);

  const bulb = new THREE.PointLight(0xffe5a3, 0, 12);
  bulb.position.set(0.3, 3.8, 0);
  group.add(bulb);

  group.userData.bulb = bulb;

  return register(group, "lamp", x, z);
}

// ======================================
// CARS
// ======================================

const carColors = [0xe83d3d, 0xeeeeee, 0x2673cf, 0xe9b83d, 0x333333];

function createCar(x, z, moving = true) {
  const group = new THREE.Group();

  const color = new THREE.MeshStandardMaterial({
    color: carColors[Math.floor(Math.random() * carColors.length)],
    metalness: 0.35,
    roughness: 0.3
  });

  addBox(group, 2.2, 0.65, 3.8, color, 0, 0.65, 0);
  addBox(group, 1.6, 0.8, 1.8, materials.glass, 0, 1.3, -0.15);

  const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x171717 });

  for (const xx of [-1, 1]) {
    for (const zz of [-1.2, 1.2]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 0.2, 12),
        wheelMaterial
      );

      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(xx, 0.38, zz);
      group.add(wheel);
    }
  }

  const car = register(group, "car", x, z);

  car.userData.moving = moving;
  car.userData.speed = random(3, 6);
  car.userData.startX = x;

  return car;
}

// ======================================
// WALKING PEOPLE
// ======================================

function createPerson(x, z, moving = true) {
  const group = new THREE.Group();

  const skin = new THREE.MeshStandardMaterial({ color: 0xd7a17c });
  const shirt = new THREE.MeshStandardMaterial({
    color: carColors[Math.floor(Math.random() * carColors.length)]
  });

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 12, 12),
    skin
  );

  head.position.y = 1.7;
  group.add(head);

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.3, 0.85, 8),
    shirt
  );

  body.position.y = 1.05;
  group.add(body);

  for (const side of [-0.13, 0.13]) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.1, 0.65, 8),
      materials.road
    );

    leg.position.set(side, 0.3, 0);
    group.add(leg);
  }

  const person = register(group, "person", x, z);

  person.userData.moving = moving;
  person.userData.startX = x;
  person.userData.startZ = z;
  person.userData.speed = random(0.5, 1.2);

  return person;
}

// ======================================
// OBJECT CREATION
// ======================================

function createObject(kind, x, z) {
  switch (kind) {
    case "house": return createHouse(x, z);
    case "office": return createOffice(x, z);
    case "tower": return createTower(x, z);
    case "pool": return createPool(x, z);
    case "tree": return createTree(x, z);
    case "park": return createPark(x, z);
    case "car": return createCar(x, z, true);
    case "person": return createPerson(x, z, true);
    case "lamp": return createLamp(x, z);
  }
}

// ======================================
// INITIAL CITY
// ======================================

createHouse(-12, -12);
createHouse(12, 12);
createOffice(12, -12);
createTower(-12, 12);
createPark(-30, -30);
createPool(30, 30);
createTree(25, -25);
createTree(-25, 25);
createLamp(-5, -5);
createLamp(5, 5);

for (let i = 0; i < 4; i++) {
  createCar(-35 + i * 12, 0, true);
}

for (let i = 0; i < 4; i++) {
  createPerson(-15 + i * 10, 5, true);
}

// ======================================
// RAIN SYSTEM
// ======================================

const rainCount = 1800;
const rainPositions = new Float32Array(rainCount * 3);

for (let i = 0; i < rainCount; i++) {
  rainPositions[i * 3] = random(-50, 50);
  rainPositions[i * 3 + 1] = random(1, 45);
  rainPositions[i * 3 + 2] = random(-50, 50);
}

const rainGeometry = new THREE.BufferGeometry();
rainGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(rainPositions, 3)
);

const rainMaterial = new THREE.PointsMaterial({
  color: 0xc8e8ff,
  size: 0.12
});

const rain = new THREE.Points(rainGeometry, rainMaterial);
rain.visible = false;
scene.add(rain);

// ======================================
// DAY / NIGHT
// ======================================

function setNight(value) {
  isNight = value;

  if (isNight) {
    scene.background.set(0x08142c);
    scene.fog.color.set(0x08142c);
    ambient.intensity = 0.45;
    sunlight.intensity = 0.25;
  } else {
    scene.background.set(0x91c9ed);
    scene.fog.color.set(0x91c9ed);
    ambient.intensity = 2;
    sunlight.intensity = 2.5;
  }

  objects.forEach(obj => {
    if (obj.userData.bulb) {
      obj.userData.bulb.intensity = isNight ? 2 : 0;
    }
  });

  setStatus(isNight ? "Night mode enabled 🌙" : "Day mode enabled ☀️");
}

document.getElementById("dayBtn").onclick = () => setNight(false);
document.getElementById("nightBtn").onclick = () => setNight(true);

document.getElementById("rainBtn").onclick = () => {
  raining = !raining;
  rain.visible = raining;
  setStatus(raining ? "Rain started 🌧️" : "Rain stopped");
};

// ======================================
// TOOL SELECTION
// ======================================

document.querySelectorAll(".tool").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tool").forEach(b => {
      b.classList.remove("active");
    });

    button.classList.add("active");
    currentTool = button.dataset.tool;
    setStatus("Selected: " + currentTool);
  });
});

document.getElementById("selectBtn").onclick = () => {
  currentTool = "select";
  setStatus("Select mode enabled");
};

document.getElementById("rotateBtn").onclick = () => {
  if (selectedObject) {
    selectedObject.rotation.y += Math.PI / 4;
    setStatus("Object rotated 🔄");
  } else {
    setStatus("Select an object first");
  }
};

document.getElementById("deleteBtn").onclick = () => {
  if (selectedObject) {
    scene.remove(selectedObject);
    objects = objects.filter(obj => obj !== selectedObject);
    selectedObject = null;
    updateStats();
    setStatus("Object deleted");
  } else {
    setStatus("Select an object first");
  }
};

// ======================================
// MOUSE / TOUCH BUILDING
// ======================================

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function findRoot(object) {
  let current = object;

  while (current && current !== scene) {
    if (current.userData.placeable) return current;
    current = current.parent;
  }

  return null;
}

renderer.domElement.addEventListener("pointerdown", event => {
  const rect = renderer.domElement.getBoundingClientRect();

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObjects(scene.children, true);

  if (!hits.length) return;

  const root = findRoot(hits[0].object);

  if (currentTool === "select") {
    if (root) {
      selectedObject = root;
      setStatus("Selected " + root.userData.kind);
    }
    return;
  }

  if (currentTool === "rotate") {
    if (root) root.rotation.y += Math.PI / 4;
    return;
  }

  if (currentTool === "delete") {
    if (root) {
      scene.remove(root);
      objects = objects.filter(obj => obj !== root);
      updateStats();
      setStatus("Object deleted");
    }
    return;
  }

  if (hits[0].object === ground || hits[0].object.parent === scene) {
    const point = hits[0].point;

    if (
      Math.abs(point.x) < 48 &&
      Math.abs(point.z) < 48
    ) {
      createObject(currentTool, point.x, point.z);
      setStatus(currentTool + " created!");
    }
  }
});

// ======================================
// SAVE / LOAD
// ======================================

function saveCity() {
  const data = objects.map(obj => ({
    kind: obj.userData.kind,
    x: obj.position.x,
    z: obj.position.z,
    rotation: obj.rotation.y
  }));

  try {
    localStorage.setItem("dreamCitySave", JSON.stringify(data));
    setStatus("City saved successfully! 💾");
  } catch (error) {
    setStatus("Could not save city");
  }
}

function loadCity() {
  const saved = localStorage.getItem("dreamCitySave");

  if (!saved) {
    setStatus("No saved city found");
    return;
  }

  try {
    const data = JSON.parse(saved);

    objects.forEach(obj => scene.remove(obj));
    objects = [];
    selectedObject = null;

    data.forEach(item => {
      const obj = createObject(item.kind, item.x, item.z);
      if (obj) obj.rotation.y = item.rotation || 0;
    });

    updateStats();
    setStatus("City loaded! 🏙️");
  } catch (error) {
    setStatus("Could not load saved city");
  }
}

function resetCity() {
  objects.forEach(obj => scene.remove(obj));
  objects = [];
  selectedObject = null;
  updateStats();
  setStatus("City cleared. Start building!");
}

document.getElementById("saveBtn").onclick = saveCity;
document.getElementById("loadBtn").onclick = loadCity;
document.getElementById("resetBtn").onclick = resetCity;

// ======================================
// CITY STATISTICS
// ======================================

function updateStats() {
  const buildings = objects.filter(obj =>
    ["house", "office", "tower"].includes(obj.userData.kind)
  ).length;

  const trees = objects.filter(obj =>
    ["tree", "park"].includes(obj.userData.kind)
  ).length;

  document.getElementById("buildingCount").textContent = buildings;
  document.getElementById("treeCount").textContent = trees;
  document.getElementById("objectCount").textContent = objects.length;
}

function setStatus(message) {
  status.textContent = message;
}

// ======================================
// ANIMATION
// ======================================

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  objects.forEach(obj => {
    if (obj.userData.kind === "car" && obj.userData.moving) {
      obj.position.x += obj.userData.speed * delta;

      if (obj.position.x > 50) {
        obj.position.x = -50;
      }
    }

    if (obj.userData.kind === "person" && obj.userData.moving) {
      obj.position.x =
        obj.userData.startX + Math.sin(time * obj.userData.speed) * 2;

      obj.position.z =
        obj.userData.startZ + Math.cos(time * obj.userData.speed) * 1.5;
    }
  });

  if (raining) {
    const positions = rain.geometry.attributes.position.array;

    for (let i = 0; i < rainCount; i++) {
      positions[i * 3 + 1] -= 0.7;

      if (positions[i * 3 + 1] < 0) {
        positions[i * 3 + 1] = random(25, 45);
      }
    }

    rain.geometry.attributes.position.needsUpdate = true;
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();

// ======================================
// RESPONSIVE RESIZE
// ======================================

window.addEventListener("resize", () => {
  const width = container.clientWidth;
  const height = container.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
});

updateStats();
setStatus("Welcome to DREAM CITY 2.0! 🏙️");
         
