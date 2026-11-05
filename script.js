
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ==========================================
// DREAM CITY 7.0 - REALISTIC OPEN WORLD
// ==========================================

const container = document.getElementById("cityCanvas");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9eb8c8);
scene.fog = new THREE.Fog(0x9eb8c8, 130, 340);

const camera = new THREE.PerspectiveCamera(
  55,
  container.clientWidth / container.clientHeight,
  0.1,
  1000
);
camera.position.set(65, 65, 80);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2.05;
controls.minDistance = 10;
controls.maxDistance = 230;

// ==========================================
// LIGHTING
// ==========================================

const hemisphere = new THREE.HemisphereLight(
  0xcce5ff, 0x56604b, 2
);
scene.add(hemisphere);

const sunlight = new THREE.DirectionalLight(0xffe1b5, 3.2);
sunlight.position.set(70, 110, 50);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(2048, 2048);
sunlight.shadow.camera.left = -150;
sunlight.shadow.camera.right = 150;
sunlight.shadow.camera.top = 150;
sunlight.shadow.camera.bottom = -150;
scene.add(sunlight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.7);
fillLight.position.set(-60, 40, -50);
scene.add(fillLight);

// ==========================================
// WORLD
// ==========================================

const world = new THREE.Group();
scene.add(world);

const objects = [];
const animatedCars = [];
const streetLights = [];
const rainParticles = [];

let selectedObject = null;
let currentTool = "select";
let nightMode = false;
let rainMode = false;
let exploreMode = false;

const mat = (color, roughness = 0.8, metalness = 0) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness
  });

const M = {
  grass: mat(0x526b45),
  road: mat(0x292d32, 0.95),
  sidewalk: mat(0xaaa9a1),
  concrete: mat(0xbab8af),
  white: mat(0xf0eee7),
  glass: mat(0x527f96, 0.18, 0.65),
  darkGlass: mat(0x203a4a, 0.15, 0.7),
  asphalt: mat(0x34373a),
  metal: mat(0x555d63, 0.35, 0.8),
  trunk: mat(0x64452e),
  leaves: mat(0x356443),
  water: mat(0x187b98, 0.15, 0.45),
  roof: mat(0x54434a),
  orange: mat(0xff542e, 0.35, 0.2),
  amber: mat(0xffab45, 0.3, 0.2)
};

function addBox(parent, x, y, z, w, h, d, material) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    material
  );

  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent, x, y, z, radius, height, material) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 12),
    material
  );
  mesh.position.set(x, y + height / 2, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 400),
  M.grass
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
world.add(ground);

// ==========================================
// ROADS AND SIDEWALKS
// ==========================================

function road(x, z, width, depth) {
  addBox(world, x, 0.03, z, width, 0.06, depth, M.road);

  const line = mat(0xe5dfc8);

  if (width > depth) {
    for (let i = -width / 2 + 2; i < width / 2; i += 7) {
      addBox(world, x + i, 0.07, z, 3.2, 0.025, 0.16, line);
    }
  } else {
    for (let i = -depth / 2 + 2; i < depth / 2; i += 7) {
      addBox(world, x, 0.07, z + i, 0.16, 0.025, 3.2, line);
    }
  }
}

function buildRoadNetwork() {
  for (let i = -120; i <= 120; i += 60) {
    road(i, 0, 15, 300);
    road(0, i, 300, 15);

    addBox(world, i + 10, 0.05, 0, 4, 0.1, 300, M.sidewalk);
    addBox(world, i - 10, 0.05, 0, 4, 0.1, 300, M.sidewalk);

    addBox(world, 0, 0.05, i + 10, 300, 0.1, 4, M.sidewalk);
    addBox(world, 0, 0.05, i - 10, 300, 0.1, 4, M.sidewalk);
  }

  // Crosswalk markings
  for (let i = -5; i <= 5; i++) {
    addBox(world, i * 1.4, 0.09, 10, 0.8, 0.025, 4, M.white);
    addBox(world, 10, 0.09, i * 1.4, 4, 0.025, 0.8, M.white);
  }
}

buildRoadNetwork();

// ==========================================
// REALISTIC BUILDING SYSTEM
// ==========================================

const buildingPalette = [
  0xc9c3b8,
  0xb7b6b0,
  0xd8d1c6,
  0xaaaeb2,
  0x777f88,
  0xe0d9cc,
  0x9badaf,
  0x987c69
];

const windowDay = mat(0x78a9c0, 0.18, 0.65);

const windowNight = new THREE.MeshStandardMaterial({
  color: 0xffbd71,
  emissive: 0xff8b35,
  emissiveIntensity: 0.8,
  roughness: 0.2
});

const balconyMat = mat(0x555d62, 0.35, 0.6);

function createBuilding(type, x, z) {
  const group = new THREE.Group();

  let width = 14;
  let depth = 13;
  let height = 20;

  if (type === "house") {
    width = 11;
    depth = 10;
    height = 8 + Math.random() * 3;
  }

  if (type === "office") {
    height = 25 + Math.random() * 15;
  }

  if (type === "tower") {
    width = 17;
    depth = 17;
    height = 45 + Math.random() * 35;
  }

  if (type === "mall") {
    width = 27;
    depth = 22;
    height = 14;
  }

  if (type === "hospital" || type === "school") {
    width = 22;
    depth = 17;
    height = 15;
  }

  if (type === "airport") {
    width = 38;
    depth = 27;
    height = 13;
  }

  if (type === "station") {
    width = 27;
    depth = 18;
    height = 12;
  }

  const wallMat = mat(
    buildingPalette[Math.floor(Math.random() * buildingPalette.length)],
    0.7
  );

  // Main structure
  addBox(group, 0, 0, 0, width, height, depth, wallMat);

  // Floor divisions
  const floors = Math.floor(height / 3.4);

  for (let floor = 0; floor < floors; floor++) {
    const y = floor * 3.4 + 1.7;

    // Front windows
    for (let xx = -width / 2 + 1.5; xx < width / 2 - 0.5; xx += 3) {
      const window = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 2.15, 0.12),
        windowDay
      );
      window.position.set(xx, y, depth / 2 + 0.08);
      group.add(window);

      const rearWindow = window.clone();
      rearWindow.position.z = -depth / 2 - 0.08;
      group.add(rearWindow);
    }

    // Side windows
    for (let zz = -depth / 2 + 1.5; zz < depth / 2 - 0.5; zz += 3) {
      const window = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 2.15, 1.8),
        windowDay
      );
      window.position.set(width / 2 + 0.08, y, zz);
      group.add(window);

      const other = window.clone();
      other.position.x = -width / 2 - 0.08;
      group.add(other);
    }

    // Balcony details on selected buildings
    if (type === "house" || type === "office") {
      if (floor > 0 && Math.random() > 0.55) {
        addBox(
          group, 0, y - 1.25, depth / 2 + 0.7,
          width * 0.65, 0.18, 1.3, balconyMat
        );

        addBox(
          group, 0, y - 0.65, depth / 2 + 1.25,
          width * 0.65, 1.1, 0.1, balconyMat
        );
      }
    }
  }

  // Rooftop
  if (type === "house") {
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(width * 0.78, 5, 4),
      mat(0x754c42)
    );
    roof.position.y = height + 2;
    roof.rotation.y = Math.PI / 4;
    group.add(roof);
  } else {
    addBox(group, 0, height, 0, width + 0.5, 0.6, depth + 0.5, M.roof);

    // Rooftop equipment
    for (let i = 0; i < 3; i++) {
      addBox(
        group,
        -width / 3 + i * width / 3,
        height + 0.6,
        0,
        1.5,
        1.2,
        1.5,
        M.metal
      );
    }
  }

  // Ground floor entrance
  addBox(
    group, 0, 0, depth / 2 + 0.12,
    2.3, 3, 0.2, M.darkGlass
  );

  // Signboard accent
  if (type !== "house") {
    addBox(
      group, 0, height * 0.35, depth / 2 + 0.16,
      width * 0.45, 0.45, 0.15, M.orange
    );
  }

  group.position.set(x, 0, z);
  group.userData.kind = type;

  world.add(group);
  objects.push(group);
  return group;
}

// ==========================================
// TREES AND PARKS
// ==========================================

function createTree(x, z) {
  const tree = new THREE.Group();

  addCylinder(tree, 0, 0, 0, 0.35, 4, M.trunk);

  const leafMat = new THREE.MeshStandardMaterial({
    color: [0x356b42, 0x487a43, 0x2f5940][
      Math.floor(Math.random() * 3)
    ],
    roughness: 1
  });

  for (let i = 0; i < 3; i++) {
    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(2.4 - i * 0.25, 12, 10),
      leafMat
    );
    leaves.position.set(
      (Math.random() - 0.5) * 1.2,
      4.5 + i * 1.2,
      (Math.random() - 0.5) * 1.2
    );
    leaves.castShadow = true;
    tree.add(leaves);
  }

  tree.position.set(x, 0, z);
  world.add(tree);
  objects.push(tree);
  tree.userData.kind = "tree";
}

function createPark(x, z) {
  const park = new THREE.Group();

  addBox(
    park, 0, 0, 0, 25, 0.2, 23,
    mat(0x4d7c4c)
  );

  // Walkway
  addBox(
    park, 0, 0.12, 0, 3, 0.08, 20,
    M.concrete
  );

  park.position.set(x, 0, z);
  world.add(park);
  objects.push(park);
  park.userData.kind = "park";

  for (let i = 0; i < 5; i++) {
    createTree(x - 9 + i * 4.5, z - 7);
    createTree(x - 9 + i * 4.5, z + 7);
  }
}

function createLake(x, z) {
  const lake = new THREE.Mesh(
    new THREE.CircleGeometry(12, 48),
    M.water
  );
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(x, 0.15, z);
  lake.userData.kind = "lake";
  world.add(lake);
  objects.push(lake);
}

// ==========================================
// DETAILED CARS
// ==========================================

const carColors = [
  0xb51f35, 0x151b25, 0xd8d8d5,
  0x23528b, 0x555b64, 0x9a713d
];

function createCar(x, z, color) {
  const car = new THREE.Group();

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: color || carColors[Math.floor(Math.random() * carColors.length)],
    metalness: 0.7,
    roughness: 0.23
  });

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(5, 1.1, 2.3),
    bodyMaterial
  );
  body.position.y = 1;
  body.castShadow = true;
  car.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 1.05, 1.9),
    M.darkGlass
  );
  cabin.position.set(-0.25, 2, 0);
  car.add(cabin);

  // Hood and rear section
  addBox(car, 1.65, 1.05, 0, 1.6, 0.2, 2.2, bodyMaterial);
  addBox(car, -1.85, 1.05, 0, 1.1, 0.2, 2.2, bodyMaterial);

  // Wheels
  const wheelMaterial = mat(0x161719, 0.95);
  const rimMaterial = mat(0xb4b7ba, 0.3, 0.8);

  const wheels = [];

  for (const px of [-1.6, 1.6]) {
    for (const pz of [-1.2, 1.2]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.52, 0.52, 0.28, 20),
        wheelMaterial
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(px, 0.55, pz);
      car.add(wheel);
      wheels.push(wheel);

      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.25, 0.3, 16),
        rimMaterial
      );
      rim.rotation.z = Math.PI / 2;
      rim.position.copy(wheel.position);
      car.add(rim);
    }
  }

  // Headlights
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 1.3
  });

  for (const zSide of [-0.75, 0.75]) {
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.3, 0.5),
      headMat
    );
    head.position.set(2.55, 1.15, zSide);
    car.add(head);

    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.3, 0.5),
      M.orange
    );
    tail.position.set(-2.55, 1.15, zSide);
    car.add(tail);
  }

  car.position.set(x, 0, z);
  car.userData.kind = "car";
  car.userData.wheels = wheels;
  car.userData.speed = 0.025 + Math.random() * 0.025;

  world.add(car);
  objects.push(car);
  animatedCars.push(car);

  return car;
}

// ==========================================
// STREETLIGHTS
// ==========================================

function createStreetlight(x, z) {
  const pole = new THREE.Group();

  addCylinder(pole, 0, 0, 0, 0.12, 7, M.metal);

  addBox(pole, 0.7, 6.7, 0, 1.5, 0.12, 0.15, M.metal);

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 12, 12),
    new THREE.MeshStandardMaterial({
      color: 0xffd28b,
      emissive: 0xffa03b,
      emissiveIntensity: 1
    })
  );
  bulb.position.set(1.4, 6.6, 0);
  pole.add(bulb);

  const light = new THREE.PointLight(0xffb45e, 0, 20);
  light.position.set(1.4, 6.2, 0);
  pole.add(light);

  pole.position.set(x, 0, z);
  world.add(pole);
  streetLights.push(light);
}

for (let i = -120; i <= 120; i += 30) {
  createStreetlight(i, 11);
  createStreetlight(i, -11);
}

// ==========================================
// TRAFFIC LIGHTS
// ==========================================

function createTraffic(x, z) {
  const group = new THREE.Group();

  addCylinder(group, 0, 0, 0, 0.12, 5.5, M.metal);

  addBox(group, 0, 5.5, 0, 0.9, 2.5, 0.8, mat(0x202327));

  [0xff2020, 0xffc72c, 0x26df65].forEach((color, i) => {
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 12),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.7
      })
    );
    bulb.position.set(0, 6.3 - i * 0.8, 0.45);
    group.add(bulb);
  });

  group.position.set(x, 0, z);
  group.userData.kind = "traffic";
  world.add(group);
  objects.push(group);
}

// ==========================================
// BUILDING PLACEMENT
// ==========================================

function placeObject(type, x, z) {
  if (
    ["house", "office", "tower", "mall", "hospital",
     "school", "airport", "station"].includes(type)
  ) {
    createBuilding(type, x, z);
  } else if (type === "park") {
    createPark(x, z);
  } else if (type === "lake" || type === "beach") {
    createLake(x, z);
  } else if (type === "car") {
    createCar(x, z);
  } else if (type === "traffic") {
    createTraffic(x, z);
  } else if (type === "bridge") {
    const bridge = new THREE.Group();
    addBox(bridge, 0, 1, 0, 28, 1, 9, M.concrete);
    bridge.position.set(x, 0, z);
    bridge.userData.kind = "bridge";
    world.add(bridge);
    objects.push(bridge);
  }

  updateStats();
}

// ==========================================
// STARTER CITY
// ==========================================

function starterCity() {
  for (let x = -110; x <= 110; x += 60) {
    for (let z = -110; z <= 110; z += 60) {
      if (Math.abs(x) < 20 || Math.abs(z) < 20) continue;

      const types = [
        "house", "office", "tower",
        "mall", "hospital", "school"
      ];

      const type = types[Math.floor(Math.random() * types.length)];

      createBuilding(
        type,
        x + 18 + Math.random() * 8,
        z + 18 + Math.random() * 8
      );

      if (Math.random() > 0.45) {
        createTree(x + 5, z + 6);
      }
    }
  }

  createPark(-35, 35);
  createLake(55, -40);

  createCar(-60, 4, 0xb51f35);
  createCar(20, -4, 0x222a36);
  createCar(80, 4, 0xd8d8d5);

  createTraffic(8, 8);
  updateStats();
}

starterCity();

// ==========================================
// UI AND STATS
// ==========================================

function updateStats() {
  document.getElementById("buildingCount").textContent =
    objects.filter(o =>
      ["house", "office", "tower", "mall", "hospital",
       "school", "airport", "station"].includes(o.userData.kind)
    ).length;

  document.getElementById("treeCount").textContent =
    objects.filter(o => o.userData.kind === "tree").length;

  document.getElementById("objectCount").textContent = objects.length;
}

function status(message) {
  document.getElementById("status").textContent = message;
}

function updateActiveTool() {
  document.querySelectorAll(
    "[data-tool], #selectBtn, #rotateBtn, #deleteBtn"
  ).forEach(b => b.classList.remove("active"));

  const button =
    document.querySelector(`[data-tool="${currentTool}"]`) ||
    document.getElementById(currentTool + "Btn");

  if (button) button.classList.add("active");
}

document.querySelectorAll("[data-tool]").forEach(button => {
  button.addEventListener("click", () => {
    currentTool = button.dataset.tool;
    updateActiveTool();
    status("Selected: " + currentTool);
  });
});

["select", "rotate", "delete"].forEach(tool => {
  document.getElementById(tool + "Btn").onclick = () => {
    currentTool = tool;
    updateActiveTool();
    status(tool.toUpperCase() + " MODE");
  };
});

// ==========================================
// MOUSE INTERACTION
// ==========================================

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const groundPlane = new THREE.Plane(
  new THREE.Vector3(0, 1, 0), 0
);

renderer.domElement.addEventListener("pointerdown", event => {
  if (exploreMode) return;

  const rect = renderer.domElement.getBoundingClientRect();

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObjects(world.children, true);

  let root = null;

  for (const hit of hits) {
    let obj = hit.object;

    while (obj.parent && obj.parent !== world) {
      obj = obj.parent;
    }

    if (obj !== ground) {
      root = obj;
      break;
    }
  }

  if (currentTool === "select" && root) {
    selectedObject = root;
    status("Object selected");
    return;
  }

  if (currentTool === "delete" && root) {
    world.remove(root);
    objects.splice(objects.indexOf(root), 1);

    const carIndex = animatedCars.indexOf(root);
    if (carIndex !== -1) animatedCars.splice(carIndex, 1);

    selectedObject = null;
    updateStats();
    status("Object deleted");
    return;
  }

  if (currentTool === "rotate" && root) {
    root.rotation.y += Math.PI / 2;
    status("Object rotated");
    return;
  }

  if (!["select", "delete", "rotate"].includes(currentTool)) {
    const point = new THREE.Vector3();

    if (raycaster.ray.intersectPlane(groundPlane, point)) {
      const x = Math.round(point.x / 4) * 4;
      const z = Math.round(point.z / 4) * 4;
      placeObject(currentTool, x, z);
      status(currentTool.toUpperCase() + " placed");
    }
  }
});

// ==========================================
// DAY AND NIGHT
// ==========================================

function setDay() {
  nightMode = false;

  scene.background.set(0x9eb8c8);
  scene.fog.color.set(0x9eb8c8);

  hemisphere.intensity = 2;
  sunlight.intensity = 3.2;
  fillLight.intensity = 0.7;

  streetLights.forEach(light => light.intensity = 0);

  windowDay.emissive.set(0x000000);
  windowDay.emissiveIntensity = 0;

  renderer.toneMappingExposure = 1.15;
  status("DAYLIGHT MODE");
}

function setNight() {
  nightMode = true;

  scene.background.set(0x080e1d);
  scene.fog.color.set(0x080e1d);

  hemisphere.intensity = 0.35;
  sunlight.intensity = 0.25;
  fillLight.intensity = 0.1;

  streetLights.forEach(light => light.intensity = 2);

  windowDay.emissive.set(0xff9a42);
  windowDay.emissiveIntensity = 0.85;

  renderer.toneMappingExposure = 1.35;
  status("MIDNIGHT LUXURY MODE");
}

document.getElementById("dayBtn").onclick = setDay;
document.getElementById("nightBtn").onclick = setNight;

// ==========================================
// RAIN
// ==========================================

function createRain() {
  const count = 1600;
  const positions = [];

  for (let i = 0; i < count; i++) {
    positions.push(
      (Math.random() - 0.5) * 240,
      Math.random() * 80,
      (Math.random() - 0.5) * 240
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );

  const rain = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xc6dff0,
      size: 0.18
    })
  );

  scene.add(rain);
  return rain;
}

let rain = null;

document.getElementById("rainBtn").onclick = () => {
  rainMode = !rainMode;

  if (rainMode) {
    rain = createRain();
    status("RAIN ENABLED");
  } else {
    if (rain) scene.remove(rain);
    rain = null;
    status("RAIN STOPPED");
  }
};

// ==========================================
// EXPLORE MODE
// ==========================================

const keys = {};

window.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
});

window.addEventListener("keyup", e => {
  keys[e.key.toLowerCase()] = false;
});

document.getElementById("exploreBtn").onclick = () => {
  exploreMode = !exploreMode;
  controls.enabled = !exploreMode;
  status(exploreMode
    ? "EXPLORE MODE - WASD / ARROW KEYS"
    : "CITY CAMERA MODE");
};

// ==========================================
// SAVE AND LOAD
// ==========================================

document.getElementById("saveBtn").onclick = () => {
  const data = objects
    .filter(o => o.userData.kind && o.userData.kind !== "tree")
    .map(o => ({
      type: o.userData.kind,
      x: o.position.x,
      z: o.position.z,
      rotation: o.rotation.y
    }));

  localStorage.setItem("dreamCity7Save", JSON.stringify(data));
  status("CITY SAVED");
};

document.getElementById("loadBtn").onclick = () => {
  const data = JSON.parse(
    localStorage.getItem("dreamCity7Save") || "[]"
  );

  if (!data.length) {
    status("NO SAVED CITY FOUND");
    return;
  }

  objects.slice().forEach(o => world.remove(o));
  objects.length = 0;
  animatedCars.length = 0;

  data.forEach(item => {
    placeObject(item.type, item.x, item.z);
    const obj = objects[objects.length - 1];
    if (obj) obj.rotation.y = item.rotation || 0;
  });

  updateStats();
  status("CITY LOADED");
};

document.getElementById("resetBtn").onclick = () => {
  objects.slice().forEach(o => world.remove(o));
  objects.length = 0;
  animatedCars.length = 0;

  starterCity();
  status("CITY RESET");
};

// ==========================================
// ANIMATION
// ==========================================

function animate() {
  requestAnimationFrame(animate);

  if (exploreMode) {
    const speed = 0.45;

    if (keys.w || keys.arrowup) camera.position.z -= speed;
    if (keys.s || keys.arrowdown) camera.position.z += speed;
    if (keys.a || keys.arrowleft) camera.position.x -= speed;
    if (keys.d || keys.arrowright) camera.position.x += speed;

    controls.target.set(
      camera.position.x,
      camera.position.y - 10,
      camera.position.z - 12
    );
  }

  animatedCars.forEach(car => {
    car.position.x += car.userData.speed;

    car.userData.wheels.forEach(wheel => {
      wheel.rotation.x += 0.04;
    });

    if (car.position.x > 145) car.position.x = -145;
  });

  if (rain) {
    const positions = rain.geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      let y = positions.getY(i) - 0.85;
      if (y < 0) y = 80;
      positions.setY(i, y);
    }

    positions.needsUpdate = true;
  }

  controls.update();
  renderer.render(scene, camera);
}

// ==========================================
// RESPONSIVE DISPLAY
// ==========================================

window.addEventListener("resize", () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(
    container.clientWidth,
    container.clientHeight
  );
});

updateActiveTool();
animate();
