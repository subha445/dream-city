
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ==========================================
// DREAM CITY 3.0 - OPEN WORLD ENGINE
// ==========================================

const container = document.getElementById("cityCanvas");
const status = document.getElementById("status");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x91c9ed);
scene.fog = new THREE.Fog(0x91c9ed, 100, 230);

const camera = new THREE.PerspectiveCamera(
  60,
  container.clientWidth / container.clientHeight,
  0.1,
  500
);

camera.position.set(55, 55, 65);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2.05;
controls.minDistance = 8;
controls.maxDistance = 160;

// ==========================================
// LIGHTING
// ==========================================

const ambient = new THREE.HemisphereLight(0xffffff, 0x526b56, 2);
scene.add(ambient);

const sunlight = new THREE.DirectionalLight(0xffffff, 2.5);
sunlight.position.set(50, 80, 40);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(2048, 2048);
scene.add(sunlight);

// ==========================================
// MATERIALS
// ==========================================

const mat = {
  grass: new THREE.MeshStandardMaterial({ color: 0x568d4c }),
  road: new THREE.MeshStandardMaterial({ color: 0x303943 }),
  line: new THREE.MeshStandardMaterial({ color: 0xf8d66a }),
  white: new THREE.MeshStandardMaterial({ color: 0xf1eee8 }),
  glass: new THREE.MeshStandardMaterial({
    color: 0x65c2df,
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
  }),
  sand: new THREE.MeshStandardMaterial({ color: 0xe5cf91 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0xc3cbd1 }),
  red: new THREE.MeshStandardMaterial({ color: 0xd93636 }),
  blue: new THREE.MeshStandardMaterial({ color: 0x267ac4 })
};

// ==========================================
// GROUND
// ==========================================

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(220, 220),
  mat.grass
);

ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(200, 80, 0x8fbd7d, 0x75a76b);
grid.position.y = 0.025;
scene.add(grid);

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function box(parent, w, h, d, material, x, y, z) {
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

function register(group, kind, x, z) {
  group.userData.placeable = true;
  group.userData.kind = kind;
  group.position.set(x, 0, z);
  scene.add(group);
  objects.push(group);
  updateStats();
  return group;
}

let objects = [];
let selectedObject = null;
let currentTool = "house";
let isNight = false;
let raining = false;
let exploring = false;

// ==========================================
// ROAD NETWORK
// ==========================================

function createRoads() {
  for (let p = -4; p <= 4; p++) {
    const position = p * 25;

    box(scene, 220, 0.12, 8, mat.road, 0, 0.08, position);
    box(scene, 8, 0.12, 220, mat.road, position, 0.09, 0);

    for (let n = -105; n <= 105; n += 6) {
      box(scene, 2.5, 0.025, 0.15, mat.line, n, 0.16, position);
      box(scene, 0.15, 0.025, 2.5, mat.line, position, 0.17, n);
    }
  }
}

createRoads();

// ==========================================
// TREES AND PARKS
// ==========================================

function makeTree(parent, x, z, scale = 1) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.22, 1.4, 8),
    mat.trunk
  );

  trunk.position.set(x, 0.7 * scale, z);
  trunk.scale.setScalar(scale);
  trunk.castShadow = true;
  parent.add(trunk);

  const leaves = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 12, 10),
    mat.tree
  );

  leaves.position.set(x, 1.65 * scale, z);
  leaves.scale.set(1, 1.2, 1);
  leaves.scale.multiplyScalar(scale);
  leaves.castShadow = true;
  parent.add(leaves);
}

function createPark(x, z) {
  const group = new THREE.Group();

  box(group, 13, 0.15, 13, mat.grass, 0, 0.08, 0);

  for (let i = 0; i < 9; i++) {
    makeTree(
      group,
      THREE.MathUtils.randFloat(-5, 5),
      THREE.MathUtils.randFloat(-5, 5),
      THREE.MathUtils.randFloat(0.7, 1.1)
    );
  }

  return register(group, "park", x, z);
}

// ==========================================
// MODERN HOUSE
// ==========================================

function createHouse(x, z) {
  const group = new THREE.Group();

  const wall = new THREE.MeshStandardMaterial({
    color: [0xe8e2d8, 0xd5e4e9, 0xe9d3bd, 0xd2d8e3][
      Math.floor(Math.random() * 4)
    ]
  });

  box(group, 6, 4, 6, wall, 0, 2, 0);
  box(group, 6.5, 0.3, 6.5, mat.wood, 0, 4.15, 0);
  box(group, 1.5, 2, 0.12, mat.wood, 0, 1.1, 3.06);

  box(group, 1.3, 1.2, 0.12, mat.glass, -1.7, 2.5, 3.06);
  box(group, 1.3, 1.2, 0.12, mat.glass, 1.7, 2.5, 3.06);

  box(group, 6.5, 0.2, 1.5, mat.white, 0, 0.1, 3.6);

  return register(group, "house", x, z);
}

// ==========================================
// OFFICE AND SKYSCRAPER
// ==========================================

function createOffice(x, z) {
  const group = new THREE.Group();

  box(group, 8, 12, 8, mat.glass, 0, 6, 0);

  for (let y = 2; y < 12; y += 2) {
    box(group, 8.1, 0.12, 8.1, mat.white, 0, y, 0);
  }

  box(group, 8.5, 0.35, 8.5, mat.white, 0, 12.2, 0);

  return register(group, "office", x, z);
}

function createTower(x, z) {
  const group = new THREE.Group();
  const height = 25 + Math.random() * 15;

  box(group, 8, height, 8, mat.glass, 0, height / 2, 0);

  for (let y = 2; y < height; y += 3) {
    box(group, 8.1, 0.12, 8.1, mat.white, 0, y, 0);
  }

  const top = new THREE.Mesh(
    new THREE.ConeGeometry(5, 5, 4),
    mat.white
  );

  top.position.y = height + 2.5;
  group.add(top);

  return register(group, "tower", x, z);
}

// ==========================================
// SHOPPING MALL
// ==========================================

function createMall(x, z) {
  const group = new THREE.Group();

  const mallWall = new THREE.MeshStandardMaterial({
    color: 0xe4e8ec
  });

  box(group, 17, 7, 13, mallWall, 0, 3.5, 0);
  box(group, 17.2, 0.5, 13.2, mat.white, 0, 7.2, 0);

  for (let i = -6; i <= 6; i += 3) {
    box(group, 2, 3, 0.12, mat.glass, i, 3.2, 6.56);
  }

  box(group, 5, 2.5, 0.15, mat.red, 0, 8.7, 6.7);

  return register(group, "mall", x, z);
}

// ==========================================
// HOSPITAL
// ==========================================

function createHospital(x, z) {
  const group = new THREE.Group();

  box(group, 13, 9, 12, mat.white, 0, 4.5, 0);

  for (let i = -4; i <= 4; i += 4) {
    box(group, 2, 1.5, 0.12, mat.glass, i, 5, 6.06);
  }

  box(group, 1.2, 5, 0.3, mat.red, 0, 10, 6);
  box(group, 4, 1.2, 0.3, mat.red, 0, 10, 6);

  return register(group, "hospital", x, z);
}

// ==========================================
// SCHOOL
// ==========================================

function createSchool(x, z) {
  const group = new THREE.Group();

  box(group, 15, 7, 11, new THREE.MeshStandardMaterial({
    color: 0xf1d39b
  }), 0, 3.5, 0);

  for (let i = -5; i <= 5; i += 3) {
    box(group, 1.5, 1.5, 0.12, mat.glass, i, 4.5, 5.56);
  }

  box(group, 16, 0.4, 12, mat.red, 0, 7.2, 0);

  return register(group, "school", x, z);
}

// ==========================================
// AIRPORT
// ==========================================

function createAirport(x, z) {
  const group = new THREE.Group();

  box(group, 24, 5, 15, mat.white, 0, 2.5, 0);
  box(group, 22, 0.3, 13, mat.glass, 0, 5.2, 0);

  for (let i = -8; i <= 8; i += 4) {
    box(group, 0.15, 4, 0.15, mat.white, i, 2.5, 7);
  }

  box(group, 38, 0.15, 7, mat.road, 0, 0.1, 16);

  return register(group, "airport", x, z);
}

// ==========================================
// RAILWAY STATION
// ==========================================

function createStation(x, z) {
  const group = new THREE.Group();

  box(group, 20, 5, 10, mat.white, 0, 2.5, 0);
  box(group, 21, 0.4, 11, mat.red, 0, 5.2, 0);

  for (let i = -7; i <= 7; i += 4) {
    box(group, 1.8, 2, 0.12, mat.glass, i, 2.5, 5.06);
  }

  for (let i = -2; i <= 2; i++) {
    box(group, 0.15, 0.08, 20, mat.road, i * 1.2, 0.15, 11);
  }

  return register(group, "station", x, z);
}

// ==========================================
// TRAFFIC SIGNAL
// ==========================================

function createTraffic(x, z) {
  const group = new THREE.Group();

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.15, 5, 8),
    mat.white
  );

  pole.position.y = 2.5;
  group.add(pole);

  box(group, 0.9, 2.4, 0.8, mat.road, 0, 4.8, 0);

  const bulbs = [];

  [0.7, 0, -0.7].forEach((y, i) => {
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 12, 12),
      new THREE.MeshStandardMaterial({
        color: [0xff2020, 0xffd52a, 0x20df65][i],
        emissive: [0xff2020, 0xffd52a, 0x20df65][i],
        emissiveIntensity: 0.6
      })
    );

    bulb.position.set(0, 4.8 + y, 0.43);
    group.add(bulb);
    bulbs.push(bulb);
  });

  group.userData.bulbs = bulbs;

  return register(group, "traffic", x, z);
}

// ==========================================
// SWIMMING POOL
// ==========================================

function createPool(x, z) {
  const group = new THREE.Group();

  box(group, 8, 0.4, 6, mat.white, 0, 0.2, 0);
  box(group, 7.3, 0.12, 5.3, mat.water, 0, 0.43, 0);

  return register(group, "pool", x, z);
}

// ==========================================
// LAKE
// ==========================================

function createLake(x, z) {
  const group = new THREE.Group();

  const water = new THREE.Mesh(
    new THREE.CircleGeometry(11, 48),
    mat.water
  );

  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.15;
  group.add(water);

  return register(group, "lake", x, z);
}

// ==========================================
// BEACH
// ==========================================

function createBeach(x, z) {
  const group = new THREE.Group();

  box(group, 20, 0.2, 13, mat.sand, 0, 0.1, 0);
  box(group, 20, 0.15, 5, mat.water, 0, 0.2, -8);

  for (let i = -7; i <= 7; i += 7) {
    makeTree(group, i, 3, 1);
  }

  return register(group, "beach", x, z);
}

// ==========================================
// BRIDGE
// ==========================================

function createBridge(x, z) {
  const group = new THREE.Group();

  box(group, 22, 0.8, 5, mat.concrete, 0, 1, 0);

  for (let i = -9; i <= 9; i += 3) {
    box(group, 0.2, 1, 0.2, mat.white, i, 1.9, 2.2);
    box(group, 0.2, 1, 0.2, mat.white, i, 1.9, -2.2);
  }

  return register(group, "bridge", x, z);
}

// ==========================================
// STREETLIGHT
// ==========================================

function createLamp(x, z) {
  const group = new THREE.Group();

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 4, 8),
    mat.white
  );

  pole.position.y = 2;
  group.add(pole);

  box(group, 0.8, 0.15, 0.25, mat.white, 0.3, 4, 0);

  const bulb = new THREE.PointLight(0xffe5a3, 0, 14);
  bulb.position.set(0.3, 3.8, 0);
  group.add(bulb);
  group.userData.bulb = bulb;

  return register(group, "lamp", x, z);
}

// ==========================================
// CARS
// ==========================================

function createCar(x, z) {
  const group = new THREE.Group();

  const colors = [0xe83d3d, 0xeeeeee, 0x2673cf, 0xe9b83d, 0x333333];

  const paint = new THREE.MeshStandardMaterial({
    color: colors[Math.floor(Math.random() * colors.length)],
    metalness: 0.35,
    roughness: 0.3
  });

  box(group, 2.2, 0.65, 3.8, paint, 0, 0.65, 0);
  box(group, 1.6, 0.8, 1.8, mat.glass, 0, 1.3, -0.15);

  const wheels = new THREE.MeshStandardMaterial({ color: 0x171717 });

  for (const xx of [-1, 1]) {
    for (const zz of [-1.2, 1.2]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 0.2, 12),
        wheels
      );

      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(xx, 0.38, zz);
      group.add(wheel);
    }
  }

  const car = register(group, "car", x, z);

  car.userData.speed = 3 + Math.random() * 3;
  car.userData.startX = x;

  return car;
}

// ==========================================
// OBJECT CREATION
// ==========================================

function createObject(kind, x, z) {
  switch (kind) {
    case "house": return createHouse(x, z);
    case "office": return createOffice(x, z);
    case "tower": return createTower(x, z);
    case "mall": return createMall(x, z);
    case "hospital": return createHospital(x, z);
    case "school": return createSchool(x, z);
    case "airport": return createAirport(x, z);
    case "station": return createStation(x, z);
    case "traffic": return createTraffic(x, z);
    case "park": return createPark(x, z);
    case "pool": return createPool(x, z);
    case "lake": return createLake(x, z);
    case "beach": return createBeach(x, z);
    case "bridge": return createBridge(x, z);
    case "car": return createCar(x, z);
    case "lamp": return createLamp(x, z);
  }
}

// ==========================================
// STARTER CITY
// ==========================================

createHouse(-15, -15);
createOffice(15, -15);
createTower(-15, 15);
createMall(35, 35);
createHospital(-35, 35);
createSchool(35, -35);
createAirport(-65, -55);
createStation(65, -55);
createPark(-55, 55);
createLake(60, 55);
createBeach(-75, 65);
createBridge(0, 65);
createPool(55, 0);
createTraffic(0, 0);
createLamp(-8, -8);
createLamp(8, 8);

for (let i = 0; i < 5; i++) {
  createCar(-45 + i * 15, 25);
}

// ==========================================
// RAIN
// ==========================================

const rainCount = 1500;
const rainPositions = new Float32Array(rainCount * 3);

for (let i = 0; i < rainCount; i++) {
  rainPositions[i * 3] = THREE.MathUtils.randFloat(-100, 100);
  rainPositions[i * 3 + 1] = THREE.MathUtils.randFloat(1, 60);
  rainPositions[i * 3 + 2] = THREE.MathUtils.randFloat(-100, 100);
}

const rainGeometry = new THREE.BufferGeometry();

rainGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(rainPositions, 3)
);

const rain = new THREE.Points(
  rainGeometry,
  new THREE.PointsMaterial({ color: 0xd5edff, size: 0.15 })
);

rain.visible = false;
scene.add(rain);

// ==========================================
// DAY AND NIGHT
// ==========================================

function setNight(value) {
  isNight = value;

  if (isNight) {
    scene.background.set(0x08142c);
    scene.fog.color.set(0x08142c);
    ambient.intensity = 0.5;
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

  setStatus(isNight ? "Night mode 🌙" : "Day mode ☀️");
}

document.getElementById("dayBtn").onclick = () => setNight(false);
document.getElementById("nightBtn").onclick = () => setNight(true);

document.getElementById("rainBtn").onclick = () => {
  raining = !raining;
  rain.visible = raining;
  setStatus(raining ? "Rain started 🌧️" : "Rain stopped");
};

// ==========================================
// TOOL BUTTONS
// ==========================================

document.querySelectorAll(".tool").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tool").forEach(b =>
      b.classList.remove("active")
    );

    button.classList.add("active");
    currentTool = button.dataset.tool;
    setStatus("Selected: " + currentTool);
  });
});

document.getElementById("selectBtn").onclick = () => {
  currentTool = "select";
  setStatus("Select mode");
};

document.getElementById("rotateBtn").onclick = () => {
  if (selectedObject) {
    selectedObject.rotation.y += Math.PI / 4;
    setStatus("Object rotated");
  } else {
    setStatus("Select an object first");
  }
};

document.getElementById("deleteBtn").onclick = () => {
  if (!selectedObject) {
    setStatus("Select an object first");
    return;
  }

  scene.remove(selectedObject);
  objects = objects.filter(obj => obj !== selectedObject);
  selectedObject = null;
  updateStats();
  setStatus("Object deleted");
};

// ==========================================
// BUILDING AND SELECTION
// ==========================================

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

let pointerStart = null;

renderer.domElement.addEventListener("pointerdown", event => {
  pointerStart = {
    x: event.clientX,
    y: event.clientY
  };
});

renderer.domElement.addEventListener("pointerup", event => {
  if (!pointerStart) return;

  const moved = Math.hypot(
    event.clientX - pointerStart.x,
    event.clientY - pointerStart.y
  );

  pointerStart = null;

  if (moved > 8 || exploring) return;

  const rect = renderer.domElement.getBoundingClientRect();

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObjects(scene.children, true);

  if (currentTool === "select" || currentTool === "delete" || currentTool === "rotate") {
    if (!hits.length) return;

    const root = findRoot(hits[0].object);
    if (!root) return;

    if (currentTool === "select") {
      selectedObject = root;
      setStatus("Selected " + root.userData.kind);
    }

    if (currentTool === "rotate") {
      root.rotation.y += Math.PI / 4;
      setStatus("Object rotated");
    }

    if (currentTool === "delete") {
      scene.remove(root);
      objects = objects.filter(obj => obj !== root);
      if (selectedObject === root) selectedObject = null;
      updateStats();
      setStatus("Object deleted");
    }

    return;
  }

  const groundHits = raycaster.intersectObject(ground);

  if (!groundHits.length) return;

  const point = groundHits[0].point;

  if (Math.abs(point.x) < 105 && Math.abs(point.z) < 105) {
    createObject(currentTool, point.x, point.z);
    setStatus(currentTool + " created!");
  }
});

// ==========================================
// FIRST-PERSON EXPLORATION
// ==========================================

const aerialPosition = new THREE.Vector3(55, 55, 65);
const aerialTarget = new THREE.Vector3(0, 0, 0);

const explorePosition = new THREE.Vector3(0, 2.5, 12);
const exploreDirection = new THREE.Vector3(0, 0, -1);

const keys = {};

window.addEventListener("keydown", event => {
  keys[event.key.toLowerCase()] = true;
});

window.addEventListener("keyup", event => {
  keys[event.key.toLowerCase()] = false;
});

function movePlayer(direction) {
  if (!exploring) return;

  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  const right = new THREE.Vector3()
    .crossVectors(forward, camera.up)
    .normalize();

  const speed = 3;

  if (direction === "forward") camera.position.addScaledVector(forward, speed);
  if (direction === "back") camera.position.addScaledVector(forward, -speed);
  if (direction === "left") camera.position.addScaledVector(right, speed);
  if (direction === "right") camera.position.addScaledVector(right, -speed);

  camera.position.y = 2.5;
}

function createExploreControls() {
  const pad = document.createElement("div");

  pad.style.cssText = `
    position:absolute;
    bottom:18px;
    left:18px;
    z-index:5;
    display:none;
    grid-template-columns:repeat(3,48px);
    gap:5px;
  `;

  const buttons = [
    ["", ""],
    ["↑", "forward"],
    ["", ""],
    ["←", "left"],
    ["↓", "back"],
    ["→", "right"]
  ];

  buttons.forEach(([label, direction]) => {
    const button = document.createElement("button");
    button.textContent = label;
    button.style.cssText = `
      width:48px;
      height:44px;
      font-size:20px;
      padding:4px;
      touch-action:none;
    `;

    if (direction) {
      button.addEventListener("pointerdown", event => {
        event.preventDefault();
        movePlayer(direction);
      });
    }

    pad.appendChild(button);
  });

  container.style.position = "relative";
  container.appendChild(pad);

  return pad;
}

const movementPad = createExploreControls();

document.getElementById("exploreBtn").onclick = () => {
  exploring = !exploring;

  if (exploring) {
    controls.enabled = false;
    camera.position.set(0, 2.5, 12);
    camera.lookAt(0, 2.5, 0);
    movementPad.style.display = "grid";
    setStatus("Explore mode! Use arrows or WASD");
  } else {
    controls.enabled = true;
    camera.position.copy(aerialPosition);
    controls.target.copy(aerialTarget);
    movementPad.style.display = "none";
    setStatus("City builder mode");
  }
};

// ==========================================
// SAVE AND LOAD
// ==========================================

function saveCity() {
  const data = objects.map(obj => ({
    kind: obj.userData.kind,
    x: obj.position.x,
    z: obj.position.z,
    rotation: obj.rotation.y
  }));

  try {
    localStorage.setItem("dreamCity3Save", JSON.stringify(data));
    setStatus("City saved! 💾");
  } catch (error) {
    setStatus("Could not save city");
  }
}

function loadCity() {
  const saved = localStorage.getItem("dreamCity3Save");

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

// ==========================================
// STATISTICS
// ==========================================

function updateStats() {
  const buildings = objects.filter(obj =>
    ["house", "office", "tower", "mall", "hospital", "school", "airport", "station"]
      .includes(obj.userData.kind)
  ).length;

  const trees = objects.filter(obj =>
    ["park"].includes(obj.userData.kind)
  ).length;

  document.getElementById("buildingCount").textContent = buildings;
  document.getElementById("treeCount").textContent = trees;
  document.getElementById("objectCount").textContent = objects.length;
}

function setStatus(message) {
  status.textContent = message;
}

// ==========================================
// ANIMATION
// ==========================================

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  objects.forEach(obj => {
    if (obj.userData.kind === "car") {
      obj.position.x += obj.userData.speed * delta;

      if (obj.position.x > 105) {
        obj.position.x = -105;
      }
    }

    if (obj.userData.kind === "traffic") {
      const bulbs = obj.userData.bulbs;
      const active = Math.floor(time / 3) % 3;

      bulbs.forEach((bulb, index) => {
        bulb.material.emissiveIntensity = index === active ? 2 : 0.15;
      });
    }
  });

  if (raining) {
    const positions = rain.geometry.attributes.position.array;

    for (let i = 0; i < rainCount; i++) {
      positions[i * 3 + 1] -= 0.8;

      if (positions[i * 3 + 1] < 0) {
        positions[i * 3 + 1] = THREE.MathUtils.randFloat(30, 60);
      }
    }

    rain.geometry.attributes.position.needsUpdate = true;
  }

  if (exploring) {
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3()
      .crossVectors(forward, camera.up)
      .normalize();

    const speed = 8 * delta;

    if (keys["w"] || keys["arrowup"]) {
      camera.position.addScaledVector(forward, speed);
    }
    if (keys["s"] || keys["arrowdown"]) {
      camera.position.addScaledVector(forward, -speed);
    }
    if (keys["a"] || keys["arrowleft"]) {
      camera.position.addScaledVector(right, speed);
    }
    if (keys["d"] || keys["arrowright"]) {
      camera.position.addScaledVector(right, -speed);
    }

    camera.position.y = 2.5;
  } else {
    controls.update();
  }

  renderer.render(scene, camera);
}

animate();

// ==========================================
// RESPONSIVE SCREEN
// ==========================================

window.addEventListener("resize", () => {
  const width = container.clientWidth;
  const height = container.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});

updateStats();
setStatus("Welcome to DREAM CITY 3.0! 🌆");
