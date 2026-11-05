
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const container = document.getElementById("cityCanvas");
if (!container) throw new Error("cityCanvas not found");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb9d5e8);
scene.fog = new THREE.Fog(0xb9d5e8, 100, 330);

const camera = new THREE.PerspectiveCamera(
  55,
  container.clientWidth / container.clientHeight,
  0.1,
  1000
);
camera.position.set(42, 35, 55);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2.05;
controls.minDistance = 8;
controls.maxDistance = 150;

const hemi = new THREE.HemisphereLight(0xdceeff, 0x6a6257, 2);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffedcf, 3.2);
sun.position.set(-45, 80, 35);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -100;
sun.shadow.camera.right = 100;
sun.shadow.camera.top = 100;
sun.shadow.camera.bottom = -100;
scene.add(sun);

const nightLight = new THREE.AmbientLight(0x526b9a, 0);
scene.add(nightLight);

const world = new THREE.Group();
scene.add(world);

const placedObjects = [];
const animatedCars = [];
let selected = null;
let isNight = false;
let isRaining = false;
let exploring = false;
let rain = null;

const materials = {
  road: new THREE.MeshStandardMaterial({ color: 0x252a30, roughness: 0.94 }),
  pavement: new THREE.MeshStandardMaterial({ color: 0xb7b3a9, roughness: 1 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0xc8c8c2, roughness: 0.88 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0x8bb8ca,
    metalness: 0.55,
    roughness: 0.16,
    transparent: true,
    opacity: 0.82
  }),
  darkGlass: new THREE.MeshPhysicalMaterial({
    color: 0x263e50,
    metalness: 0.72,
    roughness: 0.12
  }),
  steel: new THREE.MeshStandardMaterial({
    color: 0x59636b,
    metalness: 0.82,
    roughness: 0.28
  }),
  amber: new THREE.MeshStandardMaterial({
    color: 0xffb04b,
    emissive: 0xff741c,
    emissiveIntensity: 0.35
  }),
  red: new THREE.MeshStandardMaterial({
    color: 0xb52b32,
    roughness: 0.42
  }),
  green: new THREE.MeshStandardMaterial({
    color: 0x456b55,
    roughness: 0.88
  }),
  white: new THREE.MeshStandardMaterial({ color: 0xe8e5df }),
  black: new THREE.MeshStandardMaterial({ color: 0x171a20, roughness: 0.55 })
};

function box(parent, x, y, z, w, h, d, material, cast = true) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    material
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinder(parent, x, y, z, r1, r2, h, material, segments = 12) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(r1, r2, h, segments),
    material
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function makeGround() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(320, 320),
    new THREE.MeshStandardMaterial({ color: 0x73816d, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.12;
  ground.receiveShadow = true;
  world.add(ground);

  // Main roads
  for (let i = -2; i <= 2; i++) {
    box(world, i * 34, 0, 0, 12, 0.12, 260, materials.road, false);
    box(world, 0, 0, i * 34, 260, 0.12, 12, materials.road, false);
  }

  // Sidewalks
  for (let i = -2; i <= 2; i++) {
    const p = i * 34;
    for (const side of [-7.5, 7.5]) {
      box(world, p + side, 0.08, 0, 2.8, 0.25, 260, materials.pavement, false);
      box(world, 0, 0.08, p + side, 260, 0.25, 2.8, materials.pavement, false);
    }
  }

  // Road markings
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xe8e0ca });
  for (let i = -2; i <= 2; i++) {
    for (let z = -120; z <= 120; z += 12) {
      box(world, i * 34, 0.08, z, 0.18, 0.025, 5, lineMat, false);
      box(world, z, 0.08, i * 34, 5, 0.025, 0.18, lineMat, false);
    }
  }

  // Crosswalks
  for (let x = -2; x <= 2; x++) {
    for (let z = -2; z <= 2; z++) {
      if (Math.abs(x) === 2 && Math.abs(z) === 2) continue;
      const cx = x * 34;
      const cz = z * 34;
      for (let k = -3; k <= 3; k++) {
        box(world, cx + k * 0.9, 0.1, cz + 8, 0.55, 0.035, 3, lineMat, false);
        box(world, cx + 8, 0.1, cz + k * 0.9, 3, 0.035, 0.55, lineMat, false);
      }
    }
  }
}

function makeWindow(parent, x, y, z, w, h, depth, material) {
  const win = box(parent, x, y, z, w, h, depth, material, false);
  return win;
}

function makeTower(x, z, floors, width, depth, style = "glass") {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const height = floors * 2.5;
  const palette = [
    0x89949b, 0xc0b8a8, 0x697b88, 0xb4b8b5,
    0x8b7770, 0x596c7d, 0xd0c6b5
  ];
  const facade = new THREE.MeshStandardMaterial({
    color: palette[Math.floor(Math.random() * palette.length)],
    roughness: 0.72,
    metalness: 0.22
  });

  const glassMat = style === "glass" ? materials.glass : materials.darkGlass;

  // Main structure
  box(g, 0, height / 2, 0, width, height, depth, facade);

  // Glass facade panels
  const columns = Math.max(3, Math.floor(width / 1.35));
  const rows = floors;
  const panelW = width / columns;

  for (let row = 0; row < rows; row++) {
    const y = 1.15 + row * 2.5;
    for (let col = 0; col < columns; col++) {
      const xx = -width / 2 + panelW * (col + 0.5);
      const windowMaterial = Math.random() > 0.1 ? glassMat : materials.concrete;

      makeWindow(g, xx, y, depth / 2 + 0.025, panelW * 0.72, 1.45, 0.06, windowMaterial);
      makeWindow(g, xx, y, -depth / 2 - 0.025, panelW * 0.72, 1.45, 0.06, windowMaterial);
    }
  }

  const sideColumns = Math.max(2, Math.floor(depth / 1.5));
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < sideColumns; col++) {
      const zz = -depth / 2 + depth / sideColumns * (col + 0.5);
      const yy = 1.15 + row * 2.5;
      makeWindow(g, width / 2 + 0.03, yy, zz, 0.06, 1.45, depth / sideColumns * 0.7, glassMat);
      makeWindow(g, -width / 2 - 0.03, yy, zz, 0.06, 1.45, depth / sideColumns * 0.7, glassMat);
    }
  }

  // Horizontal floor divisions
  const floorMat = materials.steel;
  for (let f = 1; f < floors; f++) {
    box(g, 0, f * 2.5, depth / 2 + 0.06, width, 0.07, 0.08, floorMat, false);
  }

  // Vertical architectural fins
  if (style === "glass" || style === "premium") {
    for (let i = 0; i <= columns; i++) {
      const xx = -width / 2 + i * panelW;
      box(g, xx, height / 2, depth / 2 + 0.11, 0.09, height, 0.12, materials.steel);
      box(g, xx, height / 2, -depth / 2 - 0.11, 0.09, height, 0.12, materials.steel);
    }
  }

  // Podium
  box(g, 0, 1.1, 0, width + 2, 2.2, depth + 2, materials.concrete);
  for (let i = -2; i <= 2; i++) {
    makeWindow(g, i * (width / 5), 1.1, depth / 2 + 1.04, width / 8, 1.3, 0.04, materials.darkGlass);
  }

  // Rooftop details
  box(g, 0, height + 0.2, 0, width * 0.65, 0.4, depth * 0.65, materials.concrete);
  box(g, 0, height + 1.0, 0, width * 0.25, 1.5, depth * 0.25, facade);

  for (let i = 0; i < 4; i++) {
    const rx = (Math.random() - 0.5) * width * 0.55;
    const rz = (Math.random() - 0.5) * depth * 0.55;
    box(g, rx, height + 0.7, rz, 0.7, 0.8, 0.7, materials.steel);
  }

  // Luxury tower setbacks
  if (style === "premium") {
    for (let level = 2; level < floors; level += 5) {
      const yy = level * 2.5;
      box(g, 0, yy, depth / 2 + 0.3, width + 0.5, 0.18, 0.8, materials.concrete);
      box(g, 0, yy, -depth / 2 - 0.3, width + 0.5, 0.18, 0.8, materials.concrete);
    }
  }

  world.add(g);
  placedObjects.push({ group: g, type: "tower" });
  return g;
}

function makeApartment(x, z, floors = 8) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const h = floors * 2.5;
  const facade = new THREE.MeshStandardMaterial({ color: 0xd1c7b5, roughness: 0.82 });

  box(g, 0, h / 2, 0, 12, h, 10, facade);

  for (let f = 0; f < floors; f++) {
    for (let c = -2; c <= 2; c++) {
      const xx = c * 2.15;
      const yy = 1.35 + f * 2.5;

      makeWindow(g, xx, yy, 5.05, 1.25, 1.45, 0.08, materials.darkGlass);

      // Balconies
      box(g, xx, yy - 0.9, 5.7, 1.9, 0.13, 1.25, materials.concrete);
      box(g, xx, yy - 0.35, 6.25, 1.8, 0.08, 0.08, materials.steel);
      box(g, xx - 0.85, yy - 0.6, 6.25, 0.08, 0.55, 0.08, materials.steel);
      box(g, xx + 0.85, yy - 0.6, 6.25, 0.08, 0.55, 0.08, materials.steel);
    }
  }

  box(g, 0, h + 0.25, 0, 12.6, 0.5, 10.6, materials.concrete);
  box(g, 0, h + 1.1, 0, 3, 1.2, 3, materials.steel);

  world.add(g);
  placedObjects.push({ group: g, type: "apartment" });
  return g;
}

function makeHouse(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const wall = new THREE.MeshStandardMaterial({ color: 0xe0d4bd, roughness: 0.9 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x873b36, roughness: 0.85 });

  box(g, 0, 2.1, 0, 8, 4.2, 7, wall);

  const roofGeo = new THREE.ConeGeometry(6.1, 2.6, 4);
  const roofMesh = new THREE.Mesh(roofGeo, roof);
  roofMesh.position.y = 5.5;
  roofMesh.rotation.y = Math.PI / 4;
  roofMesh.castShadow = true;
  g.add(roofMesh);

  makeWindow(g, -2.2, 2.5, 3.55, 1.3, 1.5, 0.08, materials.darkGlass);
  makeWindow(g, 2.2, 2.5, 3.55, 1.3, 1.5, 0.08, materials.darkGlass);
  box(g, 0, 1.2, 3.8, 1.3, 2.4, 0.2, materials.red);

  world.add(g);
  placedObjects.push({ group: g, type: "house" });
  return g;
}

function makeMall(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  box(g, 0, 4, 0, 20, 8, 15, materials.concrete);
  box(g, 0, 4, 7.6, 17, 6.7, 0.18, materials.darkGlass);
  box(g, 0, 8.2, 0, 21, 0.45, 16, materials.steel);

  for (let i = -7; i <= 7; i += 2) {
    box(g, i, 4, 7.8, 0.12, 6.5, 0.15, materials.steel);
  }

  box(g, 0, 7.1, 7.9, 8, 0.45, 0.35, materials.amber);
  world.add(g);
  placedObjects.push({ group: g, type: "mall" });
}

function makeTree(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  cylinder(g, 0, 1.5, 0, 0.25, 0.38, 3, new THREE.MeshStandardMaterial({ color: 0x70503a }));
  const green = new THREE.MeshStandardMaterial({ color: 0x426c45, roughness: 1 });

  for (let i = 0; i < 3; i++) {
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(1.5 - i * 0.15, 12, 10),
      green
    );
    crown.position.set((Math.random() - 0.5) * 0.6, 3.2 + i * 0.7, 0);
    crown.castShadow = true;
    g.add(crown);
  }

  world.add(g);
  placedObjects.push({ group: g, type: "tree" });
}

function makeCar(x, z, color = 0xc52d31) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.55,
    roughness: 0.24,
    clearcoat: 0.9
  });

  box(g, 0, 0.8, 0, 4.5, 0.85, 2.05, bodyMat);
  box(g, -0.15, 1.45, 0, 2.5, 0.9, 1.75, materials.darkGlass);

  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.85 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xaeb6bb, metalness: 0.9 });

  for (const xx of [-1.45, 1.45]) {
    for (const zz of [-1.05, 1.05]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.43, 0.43, 0.25, 20),
        wheelMat
      );
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(xx, 0.48, zz);
      g.add(wheel);

      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 0.27, 12),
        rimMat
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.copy(wheel.position);
      g.add(rim);
    }
  }

  const headlight = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.8
  });

  box(g, 2.28, 0.9, -0.65, 0.08, 0.28, 0.4, headlight);
  box(g, 2.28, 0.9, 0.65, 0.08, 0.28, 0.4, headlight);

  world.add(g);
  placedObjects.push({ group: g, type: "car" });
  animatedCars.push(g);
}

function makeStreetLight(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  cylinder(g, 0, 4, 0, 0.08, 0.13, 8, materials.steel);
  box(g, 0.7, 7.9, 0, 1.5, 0.12, 0.12, materials.steel);

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 12, 12),
    new THREE.MeshStandardMaterial({
      color: 0xffe4a6,
      emissive: 0xffb34f,
      emissiveIntensity: 1.2
    })
  );
  bulb.position.set(1.3, 7.8, 0);
  g.add(bulb);

  const light = new THREE.PointLight(0xffc879, 0.5, 13);
  light.position.set(1.3, 7.6, 0);
  g.add(light);

  world.add(g);
  placedObjects.push({ group: g, type: "streetlight" });
}

function createCity() {
  makeGround();

  // Central business district
  makeTower(-18, -18, 27, 12, 11, "premium");
  makeTower(18, -18, 22, 10, 10, "glass");
  makeTower(-18, 18, 18, 11, 10, "glass");
  makeTower(18, 18, 30, 12, 12, "premium");

  // Surrounding skyline
  for (let i = 0; i < 16; i++) {
    const x = (Math.random() - 0.5) * 145;
    const z = (Math.random() - 0.5) * 145;
    if (Math.abs(x % 34) < 10 || Math.abs(z % 34) < 10) continue;

    const floors = 4 + Math.floor(Math.random() * 14);
    if (Math.random() > 0.5) makeApartment(x, z, floors);
    else makeTower(x, z, floors, 7 + Math.random() * 5, 7 + Math.random() * 4, "glass");
  }

  makeMall(-50, 15);
  makeMall(52, -48);

  // Houses and green spaces
  for (let i = 0; i < 12; i++) {
    makeHouse(-65 + Math.random() * 25, 45 + Math.random() * 35);
  }

  for (let i = 0; i < 45; i++) {
    const x = (Math.random() - 0.5) * 170;
    const z = (Math.random() - 0.5) * 170;
    if (Math.abs(x % 34) < 10 || Math.abs(z % 34) < 10) continue;
    makeTree(x, z);
  }

  for (let i = 0; i < 18; i++) {
    makeCar(-120 + i * 13, 7.5, [0xc52d31, 0x202b39, 0xe0e0dc, 0x9b9b9b][i % 4]);
  }

  for (let i = -2; i <= 2; i++) {
    makeStreetLight(i * 34 + 9, 9);
    makeStreetLight(9, i * 34 + 9);
  }
}

createCity();

function setDay() {
  isNight = false;
  scene.background.set(0xb9d5e8);
  scene.fog.color.set(0xb9d5e8);
  hemi.intensity = 2;
  sun.intensity = 3.2;
  nightLight.intensity = 0;
  renderer.toneMappingExposure = 1.15;
}

function setNight() {
  isNight = true;
  scene.background.set(0x08111f);
  scene.fog.color.set(0x101b2c);
  hemi.intensity = 0.35;
  sun.intensity = 0.18;
  nightLight.intensity = 0.8;
  renderer.toneMappingExposure = 1.4;
}

function toggleRain() {
  isRaining = !isRaining;

  if (isRaining) {
    const count = 1800;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 180;
      positions[i * 3 + 1] = Math.random() * 65;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 180;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    rain = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ color: 0xaac9e6, size: 0.12 })
    );
    scene.add(rain);
  } else if (rain) {
    scene.remove(rain);
    rain.geometry.dispose();
    rain.material.dispose();
    rain = null;
  }
}

function addObject(type) {
  const point = new THREE.Vector3();
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  point.copy(camera.position).add(direction.multiplyScalar(18));
  point.y = 0;

  switch (type) {
    case "house": makeHouse(point.x, point.z); break;
    case "office": makeTower(point.x, point.z, 12, 10, 10, "glass"); break;
    case "tower": makeTower(point.x, point.z, 28, 12, 12, "premium"); break;
    case "mall": makeMall(point.x, point.z); break;
    case "car": makeCar(point.x, point.z); break;
    case "park":
      for (let i = 0; i < 9; i++) makeTree(point.x + (Math.random() - 0.5) * 12, point.z + (Math.random() - 0.5) * 12);
      break;
    case "school": makeApartment(point.x, point.z, 3); break;
    case "hospital": makeTower(point.x, point.z, 6, 14, 12, "glass"); break;
    case "tree": makeTree(point.x, point.z); break;
    default: makeTower(point.x, point.z, 8, 9, 9, "glass");
  }
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

renderer.domElement.addEventListener("pointerdown", (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(world.children, true);

  if (!hits.length) return;

  let target = hits[0].object;
  while (target.parent && target.parent !== world) target = target.parent;

  selected = placedObjects.find(item => item.group === target)?.group || null;
  updateStatus(selected ? "Object selected" : "City view");
});

function updateStatus(message) {
  const el = document.getElementById("status");
  if (el) el.textContent = message;
}

function bind(id, callback) {
  document.getElementById(id)?.addEventListener("click", callback);
}

bind("dayBtn", setDay);
bind("nightBtn", setNight);
bind("rainBtn", toggleRain);

bind("exploreBtn", () => {
  exploring = !exploring;
  updateStatus(exploring ? "Explore mode enabled" : "Explore mode disabled");
});

document.querySelectorAll("[data-tool]").forEach(button => {
  button.addEventListener("click", () => {
    addObject(button.dataset.tool);
    updateStatus(button.dataset.tool + " added");
  });
});

bind("rotateBtn", () => {
  if (selected) selected.rotation.y += Math.PI / 2;
});

bind("deleteBtn", () => {
  if (!selected) return;
  world.remove(selected);
  const index = placedObjects.findIndex(item => item.group === selected);
  if (index >= 0) placedObjects.splice(index, 1);
  selected = null;
  updateStatus("Object deleted");
});

bind("selectBtn", () => updateStatus("Tap a building to select it"));

bind("resetBtn", () => {
  location.reload();
});

bind("saveBtn", () => {
  const data = placedObjects
    .filter(item => ["house", "tower", "apartment", "mall", "car", "tree"].includes(item.type))
    .map(item => ({
      type: item.type,
      x: item.group.position.x,
      z: item.group.position.z,
      rotation: item.group.rotation.y
    }));
  localStorage.setItem("dreamCitySave", JSON.stringify(data));
  updateStatus("City saved");
});

bind("loadBtn", () => {
  const data = JSON.parse(localStorage.getItem("dreamCitySave") || "[]");
  data.forEach(item => {
    if (item.type === "house") makeHouse(item.x, item.z);
    if (item.type === "tower") makeTower(item.x, item.z, 18, 10, 10, "glass");
    if (item.type === "apartment") makeApartment(item.x, item.z, 8);
    if (item.type === "mall") makeMall(item.x, item.z);
    if (item.type === "car") makeCar(item.x, item.z);
    if (item.type === "tree") makeTree(item.x, item.z);
    const last = placedObjects[placedObjects.length - 1];
    if (last) last.group.rotation.y = item.rotation || 0;
  });
  updateStatus("Saved city loaded");
});

const keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

function animate() {
  requestAnimationFrame(animate);

  if (exploring) {
    const speed = 0.35;
    if (keys.w) camera.position.z -= speed;
    if (keys.s) camera.position.z += speed;
    if (keys.a) camera.position.x -= speed;
    if (keys.d) camera.position.x += speed;
  }

  if (isRaining && rain) {
    const positions = rain.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      positions.array[i * 3 + 1] -= 0.65;
      if (positions.array[i * 3 + 1] < 0) {
        positions.array[i * 3 + 1] = 60;
      }
    }
    positions.needsUpdate = true;
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  const width = container.clientWidth;
  const height = container.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});
