import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const container = document.getElementById("cityCanvas");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bb8c8);
scene.fog = new THREE.Fog(0x9bb8c8, 90, 260);

const camera = new THREE.PerspectiveCamera(
  55, container.clientWidth / container.clientHeight, 0.1, 600
);
camera.position.set(65, 65, 75);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2.05;
controls.minDistance = 12;
controls.maxDistance = 190;

const hemi = new THREE.HemisphereLight(0xc9e6ff, 0x48513c, 2);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffe0b0, 3);
sun.position.set(45, 90, 35);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -110;
sun.shadow.camera.right = 110;
sun.shadow.camera.top = 110;
sun.shadow.camera.bottom = -110;
scene.add(sun);

const city = new THREE.Group();
scene.add(city);

const materials = {
  grass: new THREE.MeshStandardMaterial({ color: 0x506b49, roughness: 1 }),
  road: new THREE.MeshStandardMaterial({ color: 0x292d32, roughness: 0.95 }),
  pavement: new THREE.MeshStandardMaterial({ color: 0x858783, roughness: 1 }),
  white: new THREE.MeshStandardMaterial({ color: 0xe4e1d8 }),
  glass: new THREE.MeshStandardMaterial({
    color: 0x75a8ba, metalness: 0.45, roughness: 0.2
  }),
  water: new THREE.MeshStandardMaterial({
    color: 0x187e9c, metalness: 0.4, roughness: 0.18
  })
};

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(260, 260),
  materials.grass
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
city.add(ground);

const objects = [];
const cars = [];
const trees = [];
let selected = null;
let currentTool = "select";
let isNight = false;
let isRaining = false;
let exploring = false;

function addBox(parent, x, y, z, w, h, d, material) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d), material
  );
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addRoad(x, z, w, d) {
  addBox(city, x, 0.025, z, w, 0.05, d, materials.road);

  const lineMat = new THREE.MeshStandardMaterial({
    color: 0xe8e0b9, emissive: 0x252015
  });

  if (w > d) {
    for (let i = -w / 2 + 2; i < w / 2; i += 5) {
      addBox(city, x + i, 0.06, z, 2.2, 0.025, 0.13, lineMat);
    }
  } else {
    for (let i = -d / 2 + 2; i < d / 2; i += 5) {
      addBox(city, x, 0.06, z + i, 0.13, 0.025, 2.2, lineMat);
    }
  }
}

function makeRoadNetwork() {
  for (let i = -100; i <= 100; i += 40) {
    addRoad(i, 0, 12, 220);
    addRoad(0, i, 220, 12);
  }

  for (let i = -100; i <= 100; i += 40) {
    addBox(city, i + 8, 0.04, 0, 4, 0.08, 220, materials.pavement);
    addBox(city, i - 8, 0.04, 0, 4, 0.08, 220, materials.pavement);
    addBox(city, 0, 0.04, i + 8, 220, 0.08, 4, materials.pavement);
    addBox(city, 0, 0.04, i - 8, 220, 0.08, 4, materials.pavement);
  }
}

makeRoadNetwork();

const buildingColors = [
  0xd1d2cf, 0xc6b6a1, 0xaaaeb2, 0x9eabb3,
  0xe0d8ca, 0x777f88, 0xb9c7ca
];

function makeBuilding(type, x, z) {
  const group = new THREE.Group();
  const height = type === "tower" ? 35 + Math.random() * 30 :
    type === "office" ? 18 + Math.random() * 17 :
    type === "house" ? 7 + Math.random() * 4 :
    type === "mall" ? 13 : 12 + Math.random() * 10;

  const width = type === "house" ? 10 : 13;
  const depth = type === "house" ? 10 : 12;

  const wall = new THREE.MeshStandardMaterial({
    color: type === "hospital" ? 0xe9e9e5 :
      type === "school" ? 0xd5bd94 :
      buildingColors[Math.floor(Math.random() * buildingColors.length)],
    roughness: 0.75
  });

  addBox(group, 0, 0, 0, width, height, depth, wall);

  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x8bb8ce,
    metalness: 0.5,
    roughness: 0.22,
    emissive: 0x102533
  });

  for (let y = 2.5; y < height - 1; y += 3.5) {
    for (let xx = -width / 2 + 1.5; xx < width / 2; xx += 3) {
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(1.65, 1.9, 0.12), windowMat
      );
      win.position.set(xx, y, depth / 2 + 0.07);
      group.add(win);

      const win2 = win.clone();
      win2.position.z = -depth / 2 - 0.07;
      group.add(win2);
    }

    for (let zz = -depth / 2 + 1.5; zz < depth / 2; zz += 3) {
      const sideWin = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 1.9, 1.65), windowMat
      );
      sideWin.position.set(width / 2 + 0.07, y, zz);
      group.add(sideWin);
      const side2 = sideWin.clone();
      side2.position.x = -width / 2 - 0.07;
      group.add(side2);
    }
  }

  if (type === "house") {
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(9, 5, 4),
      new THREE.MeshStandardMaterial({ color: 0x8b5141 })
    );
    roof.position.y = height + 2;
    roof.rotation.y = Math.PI / 4;
    group.add(roof);
  } else {
    addBox(group, 0, height, 0, width + 0.5, 0.5, depth + 0.5,
      new THREE.MeshStandardMaterial({ color: 0x555d65 }));
  }

  group.position.set(x, 0, z);
  group.userData.kind = type;
  city.add(group);
  objects.push(group);
  return group;
}

function makeTree(x, z) {
  const group = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.55, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x705039 })
  );
  trunk.position.y = 2;
  trunk.castShadow = true;
  group.add(trunk);

  const leaves = new THREE.Mesh(
    new THREE.SphereGeometry(2.5, 10, 9),
    new THREE.MeshStandardMaterial({ color: 0x326d42, roughness: 1 })
  );
  leaves.position.y = 5;
  leaves.castShadow = true;
  group.add(leaves);

  group.position.set(x, 0, z);
  city.add(group);
  trees.push(group);
  objects.push(group);
}

function makeCar(x, z, color = 0xd94332) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color, metalness: 0.55, roughness: 0.3
  });

  addBox(group, 0, 0.5, 0, 4.5, 1.1, 2.2, bodyMat);
  addBox(group, 0, 1.45, 0, 2.5, 0.9, 1.8,
    new THREE.MeshStandardMaterial({ color: 0x263d4a, metalness: 0.5 }));

  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x17191c });
  for (const a of [-1.4, 1.4]) {
    for (const b of [-1.15, 1.15]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.48, 0.48, 0.3, 12), wheelMat
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(a, 0.48, b);
      group.add(wheel);
    }
  }

  group.position.set(x, 0, z);
  city.add(group);
  cars.push(group);
  objects.push(group);
}

function makePark(x, z) {
  const park = new THREE.Group();
  addBox(park, 0, 0, 0, 22, 0.12, 20,
    new THREE.MeshStandardMaterial({ color: 0x507c4b }));
  city.add(park);
  park.position.set(x, 0, z);
  for (let i = 0; i < 5; i++) {
    makeTree(x - 7 + i * 3.5, z - 4);
    makeTree(x - 7 + i * 3.5, z + 4);
  }
  objects.push(park);
}

function makeLake(x, z) {
  const lake = new THREE.Mesh(
    new THREE.CircleGeometry(11, 48), materials.water
  );
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(x, 0.12, z);
  city.add(lake);
  objects.push(lake);
}

function makeBridge(x, z) {
  const group = new THREE.Group();
  addBox(group, 0, 1, 0, 28, 1, 8,
    new THREE.MeshStandardMaterial({ color: 0x777d82 }));
  for (let i = -12; i <= 12; i += 4) {
    addBox(group, i, 2, -3.8, 0.3, 2, 0.3, materials.white);
    addBox(group, i, 2, 3.8, 0.3, 2, 0.3, materials.white);
  }
  group.position.set(x, 0, z);
  city.add(group);
  objects.push(group);
}

function makeTraffic(x, z) {
  const group = new THREE.Group();
  addBox(group, 0, 0, 0, 0.25, 5, 0.25,
    new THREE.MeshStandardMaterial({ color: 0x333333 }));
  addBox(group, 0, 5, 0, 0.9, 2.6, 0.8,
    new THREE.MeshStandardMaterial({ color: 0x252525 }));
  const colors = [0xff2525, 0xffc928, 0x22dd66];
  colors.forEach((color, i) => {
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 12),
      new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.5
      })
    );
    light.position.set(0, 5.8 - i * 0.8, 0.45);
    group.add(light);
  });
  group.position.set(x, 0, z);
  city.add(group);
  objects.push(group);
}

function placeObject(type, x, z) {
  if (type === "house" || type === "office" || type === "tower" ||
      type === "mall" || type === "hospital" || type === "school" ||
      type === "airport" || type === "station") {
    makeBuilding(type, x, z);
  } else if (type === "park") {
    makePark(x, z);
  } else if (type === "lake" || type === "beach") {
    makeLake(x, z);
  } else if (type === "bridge") {
    makeBridge(x, z);
  } else if (type === "car") {
    makeCar(x, z, [0xd94332, 0xeeeeee, 0x245c9a, 0x222222][
      Math.floor(Math.random() * 4)
    ]);
  } else if (type === "traffic") {
    makeTraffic(x, z);
  }
  updateStats();
}

function updateStats() {
  document.getElementById("buildingCount").textContent =
    objects.filter(o => ["house", "office", "tower", "mall",
      "hospital", "school", "airport", "station"].includes(o.userData.kind)).length;
  document.getElementById("treeCount").textContent = trees.length;
  document.getElementById("objectCount").textContent = objects.length;
}

function setStatus(message) {
  document.getElementById("status").textContent = message;
}

function updateActiveTool() {
  document.querySelectorAll("[data-tool], #selectBtn, #rotateBtn, #deleteBtn")
    .forEach(button => button.classList.remove("active"));
  const active = document.querySelector(`[data-tool="${currentTool}"]`) ||
    document.getElementById(currentTool + "Btn");
  if (active) active.classList.add("active");
}

document.querySelectorAll("[data-tool]").forEach(button => {
  button.addEventListener("click", () => {
    currentTool = button.dataset.tool;
    updateActiveTool();
    setStatus("Selected: " + currentTool.toUpperCase());
  });
});

["select", "rotate", "delete"].forEach(tool => {
  document.getElementById(tool + "Btn").onclick = () => {
    currentTool = tool;
    updateActiveTool();
    setStatus(tool.toUpperCase() + " mode");
  };
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

renderer.domElement.addEventListener("pointerdown", event => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObjects(city.children, true);
  let hitObject = hits.length ? hits[0].object : null;

  while (hitObject && hitObject.parent !== city) {
    hitObject = hitObject.parent;
  }

  if (currentTool === "select" && hitObject && hitObject !== ground) {
    selected = hitObject;
    setStatus("Object selected");
    return;
  }

  if (currentTool === "delete" && hitObject && hitObject !== ground) {
    city.remove(hitObject);
    objects.splice(objects.indexOf(hitObject), 1);
    selected = null;
    updateStats();
    setStatus("Object deleted");
    return;
  }

  if (currentTool === "rotate" && hitObject && hitObject !== ground) {
    hitObject.rotation.y += Math.PI / 2;
    setStatus("Object rotated");
    return;
  }

  if (currentTool !== "select" && currentTool !== "delete" &&
      currentTool !== "rotate") {
    const point = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(groundPlane, point)) {
      placeObject(currentTool, Math.round(point.x / 4) * 4,
        Math.round(point.z / 4) * 4);
      setStatus(currentTool.toUpperCase() + " placed");
    }
  }
});

function starterCity() {
  for (let x = -85; x <= 85; x += 40) {
    for (let z = -85; z <= 85; z += 40) {
      if (Math.abs(x) < 15 || Math.abs(z) < 15) continue;
      const types = ["house", "office", "tower", "mall"];
      const type = types[Math.floor(Math.random() * types.length)];
      makeBuilding(type, x + 10, z + 10);
      if (Math.random() > 0.5) makeTree(x + 2, z + 3);
    }
  }

  makePark(-30, 30);
  makeLake(45, -35);
  makeCar(-30, 5);
  makeCar(30, -5, 0x245c9a);
  makeTraffic(7, 7);
  updateStats();
}

starterCity();

document.getElementById("dayBtn").onclick = () => {
  isNight = false;
  scene.background.set(0x9bb8c8);
  scene.fog.color.set(0x9bb8c8);
  sun.intensity = 3;
  hemi.intensity = 2;
  setStatus("Daytime enabled");
};

document.getElementById("nightBtn").onclick = () => {
  isNight = true;
  scene.background.set(0x080e20);
  scene.fog.color.set(0x080e20);
  sun.intensity = 0.25;
  hemi.intensity = 0.35;
  setStatus("Night mode enabled");
};

let rain = null;

document.getElementById("rainBtn").onclick = () => {
  isRaining = !isRaining;
  if (isRaining && !rain) {
    const positions = [];
    for (let i = 0; i < 1800; i++) {
      positions.push(
        (Math.random() - 0.5) * 220,
        Math.random() * 60,
        (Math.random() - 0.5) * 220
      );
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position",
      new THREE.Float32BufferAttribute(positions, 3));
    rain = new THREE.Points(geometry,
      new THREE.PointsMaterial({ color: 0xb9d9ef, size: 0.18 }));
    scene.add(rain);
  }
  if (!isRaining && rain) {
    scene.remove(rain);
    rain = null;
  }
  setStatus(isRaining ? "Rain enabled" : "Rain stopped");
};

document.getElementById("exploreBtn").onclick = () => {
  exploring = !exploring;
  controls.enabled = !exploring;
  setStatus(exploring ? "Explore mode: use WASD or arrow keys" : "City view mode");
};

const keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

document.getElementById("saveBtn").onclick = () => {
  const data = objects.map(o => ({
    type: o.userData.kind || "object",
    x: o.position.x, z: o.position.z,
    rotation: o.rotation.y
  }));
  localStorage.setItem("dreamCity6Save", JSON.stringify(data));
  setStatus("City saved on this device");
};

document.getElementById("loadBtn").onclick = () => {
  const data = JSON.parse(localStorage.getItem("dreamCity6Save") || "[]");
  if (!data.length) return setStatus("No saved city found");
  objects.slice().forEach(o => city.remove(o));
  objects.length = 0;
  trees.length = 0;
  cars.length = 0;
  data.forEach(item => {
    placeObject(item.type, item.x, item.z);
    const obj = objects[objects.length - 1];
    if (obj) obj.rotation.y = item.rotation || 0;
  });
  updateStats();
  setStatus("Saved city loaded");
};

document.getElementById("resetBtn").onclick = () => {
  objects.slice().forEach(o => city.remove(o));
  objects.length = 0;
  trees.length = 0;
  cars.length = 0;
  starterCity();
  setStatus("City reset");
};

function animate() {
  requestAnimationFrame(animate);

  if (exploring) {
    const speed = 0.65;
    if (keys.w || keys.arrowup) camera.position.z -= speed;
    if (keys.s || keys.arrowdown) camera.position.z += speed;
    if (keys.a || keys.arrowleft) camera.position.x -= speed;
    if (keys.d || keys.arrowright) camera.position.x += speed;
    controls.target.copy(camera.position).add(
      new THREE.Vector3(0, -5, -10)
    );
  }

  cars.forEach((car, i) => {
    car.position.x += i % 2 === 0 ? 0.035 : -0.035;
    if (car.position.x > 110) car.position.x = -110;
    if (car.position.x < -110) car.position.x = 110;
  });

  if (rain) {
    const positions = rain.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      let y = positions.getY(i) - 0.8;
      if (y < 0) y = 60;
      positions.setY(i, y);
    }
    positions.needsUpdate = true;
  }

  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});

updateActiveTool();
animate();
