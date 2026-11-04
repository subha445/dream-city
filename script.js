
import * as THREE from "three";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js";

// =================================
// DREAM CITY - 3D CITY BUILDER
// =================================

const canvas = document.getElementById("cityCanvas");

if (!canvas) {
  throw new Error("cityCanvas not found in index.html");
}

const scene = new THREE.Scene();
scene.background = new THREE.Color("#91c9ee");
scene.fog = new THREE.Fog("#91c9ee", 45, 120);

const camera = new THREE.PerspectiveCamera(
  60,
  1,
  0.1,
  500
);

camera.position.set(20, 22, 25);

const renderer = new THREE.WebGLRenderer({
  antialias: true
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
canvas.appendChild(renderer.domElement);

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

window.addEventListener("resize", resize);
resize();

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2.05;
controls.minDistance = 7;
controls.maxDistance = 75;
controls.target.set(0, 0, 0);

// =================================
// LIGHTING
// =================================

const ambientLight = new THREE.HemisphereLight(
  "#d9edff",
  "#63764d",
  2
);

scene.add(ambientLight);

const sun = new THREE.DirectionalLight("#fff1d1", 2.5);
sun.position.set(15, 30, 15);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

// =================================
// GROUND AND GRID
// =================================

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({ color: "#6d9560" })
);

ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(100, 50, "#466d43", "#78966e");
grid.position.y = 0.02;
scene.add(grid);

// =================================
// CITY DATA
// =================================

const objects = [];
let selectedObject = null;
let activeTool = "house";
let isNight = false;
let weather = 0;
let rain = null;

const colors = {
  house: "#e8b879",
  office: "#719cba",
  skyscraper: "#7896b5",
  tree: "#32834a",
  park: "#65ad63",
  road: "#343b43"
};

// =================================
// BASIC BUILDING PARTS
// =================================

function material(color) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.75
  });
}

function box(parent, w, h, d, color, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    material(color)
  );

  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);

  return mesh;
}

function cylinder(parent, radius, height, color, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 12),
    material(color)
  );

  mesh.position.set(x, y + height / 2, z);
  mesh.castShadow = true;
  parent.add(mesh);

  return mesh;
}

// =================================
// HOUSE
// =================================

function createHouse(color) {
  const group = new THREE.Group();

  box(group, 2.4, 1.8, 2.2, color, 0, 0, 0);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(1.8, 1.3, 4),
    material("#a94f42")
  );

  roof.position.y = 2.45;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);

  box(group, 0.45, 0.9, 0.08, "#65432d", 0, 0, 1.14);
  box(group, 0.4, 0.4, 0.08, "#a8e3fa", -0.7, 0.9, 1.14);
  box(group, 0.4, 0.4, 0.08, "#a8e3fa", 0.7, 0.9, 1.14);

  return group;
}

// =================================
// OFFICE
// =================================

function createOffice(color) {
  const group = new THREE.Group();

  box(group, 3.2, 5, 3.2, color, 0, 0, 0);

  for (let floor = 0; floor < 4; floor++) {
    for (let side = -1; side <= 1; side++) {
      box(
        group, 0.5, 0.6, 0.05,
        "#c8edff",
        side * 0.9,
        0.7 + floor * 1.05,
        1.63
      );
    }
  }

  return group;
}

// =================================
// SKYSCRAPER
// =================================

function createSkyscraper(color) {
  const group = new THREE.Group();

  box(group, 3.4, 12, 3.4, color, 0, 0, 0);
  box(group, 2.7, 1.5, 2.7, "#a8c7db", 0, 12, 0);
  cylinder(group, 0.08, 2, "#dddddd", 0, 13.5, 0);

  for (let floor = 0; floor < 10; floor++) {
    for (let side = -1; side <= 1; side++) {
      box(
        group, 0.55, 0.65, 0.05,
        "#c8edff",
        side * 0.9,
        0.7 + floor * 1.05,
        1.73
      );
    }
  }

  return group;
}

// =================================
// TREE
// =================================

function createTree() {
  const group = new THREE.Group();

  cylinder(group, 0.18, 1.4, "#76502e", 0, 0, 0);

  const leaves = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 14, 12),
    material("#32834a")
  );

  leaves.position.y = 1.9;
  leaves.castShadow = true;
  group.add(leaves);

  return group;
}

// =================================
// PARK
// =================================

function createPark() {
  const group = new THREE.Group();

  const grass = new THREE.Mesh(
    new THREE.BoxGeometry(5, 0.12, 5),
    material("#65ad63")
  );

  grass.position.y = 0.06;
  grass.receiveShadow = true;
  group.add(grass);

  const tree1 = createTree();
  tree1.position.set(-1.4, 0.1, -1.2);
  group.add(tree1);

  const tree2 = createTree();
  tree2.position.set(1.4, 0.1, 1.2);
  group.add(tree2);

  box(group, 1.5, 0.15, 0.35, "#98704b", 0, 0.12, 0);

  return group;
}

// =================================
// ROAD
// =================================

function createRoad() {
  const group = new THREE.Group();

  const road = new THREE.Mesh(
    new THREE.BoxGeometry(5, 0.08, 2),
    material("#343b43")
  );

  road.position.y = 0.04;
  road.receiveShadow = true;
  group.add(road);

  for (let x = -2; x <= 2; x += 1.5) {
    box(group, 0.6, 0.02, 0.08, "#f5e7a2", x, 0.09, 0);
  }

  return group;
}

// =================================
// CREATE CITY OBJECT
// =================================

function snap(value) {
  return Math.round(value / 2) * 2;
}

function createObject(kind, x, z, color) {
  const chosenColor = color || colors[kind];
  let object;

  if (kind === "house") object = createHouse(chosenColor);
  if (kind === "office") object = createOffice(chosenColor);
  if (kind === "skyscraper") object = createSkyscraper(chosenColor);
  if (kind === "tree") object = createTree();
  if (kind === "park") object = createPark();
  if (kind === "road") object = createRoad();

  if (!object) return null;

  object.position.set(snap(x), 0, snap(z));

  object.userData.kind = kind;
  object.userData.color = chosenColor;

  scene.add(object);
  objects.push(object);

  updateStats();

  return object;
}

// =================================
// SELECTION
// =================================

const selectionBox = new THREE.BoxHelper(
  new THREE.Object3D(),
  "#ffe45e"
);

selectionBox.visible = false;
scene.add(selectionBox);

function selectObject(object) {
  selectedObject = object;
  selectionBox.visible = Boolean(object);

  if (object) {
    selectionBox.setFromObject(object);
  }
}

function findCityObject(object) {
  let current = object;

  while (current && current !== scene) {
    if (current.userData?.kind) return current;
    current = current.parent;
  }

  return null;
}

// =================================
// CLICK TO BUILD OR SELECT
// =================================

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

renderer.domElement.addEventListener("pointerdown", (event) => {
  const rect = renderer.domElement.getBoundingClientRect();

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObjects(scene.children, true);
  const hit = hits.find((item) => findCityObject(item.object));

  if (activeTool === "select") {
    selectObject(hit ? findCityObject(hit.object) : null);
    return;
  }

  const groundHit = raycaster.intersectObject(ground);

  if (groundHit.length) {
    const point = groundHit[0].point;
    const newObject = createObject(activeTool, point.x, point.z);

    if (newObject) selectObject(newObject);
  }
});

// =================================
// TOOL BUTTONS
// =================================

document.querySelectorAll("[data-tool]").forEach((button) => {
  button.addEventListener("click", () => {
    activeTool = button.dataset.tool;

    document.querySelectorAll("[data-tool]").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
  });
});

// =================================
// BUTTON FINDER
// =================================

function findButton(words) {
  return [...document.querySelectorAll("button")].find((button) => {
    const text = button.textContent.toLowerCase();
    return words.some((word) => text.includes(word));
  });
}

// =================================
// DELETE OBJECT
// =================================

findButton(["delete"])?.addEventListener("click", () => {
  if (!selectedObject) return;

  scene.remove(selectedObject);

  const index = objects.indexOf(selectedObject);
  if (index !== -1) objects.splice(index, 1);

  selectObject(null);
  updateStats();
});

// =================================
// ROTATE OBJECT
// =================================

function rotateSelected() {
  if (!selectedObject) return;

  selectedObject.rotation.y += Math.PI / 4;
  selectionBox.setFromObject(selectedObject);
}

findButton(["rotate"])?.addEventListener("click", rotateSelected);

window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "r") rotateSelected();
  if (event.key === "Escape") selectObject(null);
});

// =================================
// DAY AND NIGHT
// =================================

findButton(["day/night", "night", "day"])?.addEventListener("click", () => {
  isNight = !isNight;

  if (isNight) {
    scene.background.set("#101b38");
    scene.fog.color.set("#101b38");
    ambientLight.intensity = 0.4;
    sun.intensity = 0.5;
    ground.material.color.set("#354b3b");
  } else {
    scene.background.set("#91c9ee");
    scene.fog.color.set("#91c9ee");
    ambientLight.intensity = 2;
    sun.intensity = 2.5;
    ground.material.color.set("#6d9560");
  }
});

// =================================
// WEATHER
// =================================

function changeWeather() {
  weather = (weather + 1) % 3;

  if (rain) {
    scene.remove(rain);
    rain.geometry.dispose();
    rain.material.dispose();
    rain = null;
  }

  if (weather === 0) {
    scene.background.set(isNight ? "#101b38" : "#91c9ee");
  }

  if (weather === 1) {
    scene.background.set(isNight ? "#182238" : "#8998a8");
  }

  if (weather === 2) {
    scene.background.set(isNight ? "#111a2b" : "#71869b");

    const positions = [];

    for (let i = 0; i < 700; i++) {
      positions.push(
        (Math.random() - 0.5) * 70,
        Math.random() * 25 + 2,
        (Math.random() - 0.5) * 70
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
        color: "#dceeff",
        size: 0.12
      })
    );

    scene.add(rain);
  }

  const button = findButton(["weather"]);
  if (button) {
    button.textContent = ["Weather: Sunny", "Weather: Cloudy", "Weather: Rainy"][weather];
  }
}

findButton(["weather"])?.addEventListener("click", changeWeather);

// =================================
// SAVE CITY
// =================================

function saveCity() {
  const cityData = objects.map((object) => ({
    kind: object.userData.kind,
    x: object.position.x,
    z: object.position.z,
    rotation: object.rotation.y,
    color: object.userData.color
  }));

  localStorage.setItem("dreamCitySave", JSON.stringify(cityData));
  alert("Your city has been saved!");
}

findButton(["save"])?.addEventListener("click", saveCity);

// =================================
// LOAD CITY
// =================================

function loadCity() {
  const saved = localStorage.getItem("dreamCitySave");

  if (!saved) {
    alert("No saved city found!");
    return;
  }

  objects.forEach((object) => scene.remove(object));
  objects.length = 0;
  selectObject(null);

  try {
    const cityData = JSON.parse(saved);

    cityData.forEach((item) => {
      const object = createObject(
        item.kind,
        item.x,
        item.z,
        item.color
      );

      if (object) object.rotation.y = item.rotation || 0;
    });

    updateStats();
    alert("Your city has been loaded!");
  } catch (error) {
    alert("Could not load the saved city.");
    console.error(error);
  }
}

findButton(["load"])?.addEventListener("click", loadCity);

// =================================
// RESET CITY
// =================================

function resetCity() {
  if (!confirm("Are you sure you want to reset your city?")) return;

  objects.forEach((object) => scene.remove(object));
  objects.length = 0;

  selectObject(null);
  updateStats();
}

findButton(["reset"])?.addEventListener("click", resetCity);

// =================================
// CITY STATISTICS
// =================================

function updateStats() {
  const houses = objects.filter((o) => o.userData.kind === "house").length;
  const offices = objects.filter((o) => o.userData.kind === "office").length;
  const towers = objects.filter((o) => o.userData.kind === "skyscraper").length;
  const nature = objects.filter((o) =>
    ["tree", "park"].includes(o.userData.kind)
  ).length;

  const population = houses * 4 + offices * 30 + towers * 100;

  const stats = {
    buildings: houses + offices + towers,
    population,
    nature,
    roads: objects.filter((o) => o.userData.kind === "road").length
  };

  const display = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  display("buildingCount", stats.buildings);
  display("population", stats.population.toLocaleString());
  display("treeCount", stats.nature);
  display("roadCount", stats.roads);

  // Also update elements using common stat labels.
  document.querySelectorAll("[data-stat]").forEach((element) => {
    const key = element.dataset.stat;
    if (key in stats) element.textContent = stats[key].toLocaleString();
  });
}

updateStats();

// =================================
// ANIMATION
// =================================

function animate() {
  requestAnimationFrame(animate);

  controls.update();

  if (rain) {
    const positions = rain.geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      let y = positions.getY(i) - 0.35;

      if (y < 0) y = 25;

      positions.setY(i, y);
    }

    positions.needsUpdate = true;
  }

  if (selectedObject) {
    selectionBox.setFromObject(selectedObject);
  }

  renderer.render(scene, camera);
}

animate();

console.log("DREAM CITY loaded successfully!");
