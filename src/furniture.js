import * as THREE from 'three';

export const SIZE_LIMITS = {
  width: { min: 400, max: 1600, fallback: 600 },
  height: { min: 400, max: 1600, fallback: 800 },
  depth: { min: 250, max: 700, fallback: 400 },
};

const PANEL = 0.018;
const BACK = 0.012;
const GAP = 0.002;

function mm(value) {
  return value / 1000;
}

function addBox(parent, w, h, d, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function createWoodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#8a5a32');
  gradient.addColorStop(0.5, '#6f4324');
  gradient.addColorStop(1, '#5a341b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 70; i += 1) {
    const y = i * 8 + Math.random() * 4;
    ctx.strokeStyle = `rgba(40, 22, 10, ${0.08 + Math.random() * 0.18})`;
    ctx.lineWidth = 1 + Math.random() * 1.6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= canvas.width; x += 12) {
      ctx.lineTo(x, y + Math.sin(x * 0.015 + i) * 5 + Math.random() * 1.5);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

export function createMaterials(woodTexture) {
  const body = new THREE.MeshStandardMaterial({
    color: 0xf3f1ec,
    roughness: 0.48,
    metalness: 0.02,
  });
  const interior = new THREE.MeshStandardMaterial({
    color: 0xf6f3ee,
    roughness: 0.78,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const handle = new THREE.MeshStandardMaterial({
    color: 0x9a9a9a,
    roughness: 0.28,
    metalness: 0.78,
  });
  return { body, interior, handle, woodTexture };
}

export function applyColor(materials, colorId) {
  if (colorId === 'white') {
    materials.body.map = null;
    materials.body.color.setHex(0xf3f1ec);
    materials.body.roughness = 0.48;
  } else if (colorId === 'gray') {
    materials.body.map = null;
    materials.body.color.setHex(0x8d8f8c);
    materials.body.roughness = 0.52;
  } else {
    materials.body.map = materials.woodTexture;
    materials.body.color.setHex(0xffffff);
    materials.body.roughness = 0.68;
  }
  materials.body.needsUpdate = true;
  materials.interior.map = null;
  materials.interior.color.setHex(0xf6f3ee);
  materials.interior.needsUpdate = true;
}

export function disposeObject(root) {
  root.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose();
    }
  });
  while (root.children.length > 0) {
    root.remove(root.children[0]);
  }
}

function addCarcass(group, width, height, depth, material) {
  const innerW = width - PANEL * 2;
  const innerH = height - PANEL * 2;

  addBox(group, width, PANEL, depth, material, 0, PANEL / 2, 0);
  addBox(group, width, PANEL, depth, material, 0, height - PANEL / 2, 0);
  addBox(group, PANEL, innerH, depth, material, -width / 2 + PANEL / 2, height / 2, 0);
  addBox(group, PANEL, innerH, depth, material, width / 2 - PANEL / 2, height / 2, 0);
  addBox(group, innerW, innerH, BACK, material, 0, height / 2, -depth / 2 + BACK / 2);
}

function addEmptyCavity(group, width, height, depth, interior) {
  const skin = 0.001;
  const z0 = -depth / 2 + BACK;
  const z1 = depth / 2;
  const depthInner = z1 - z0;
  const zc = (z0 + z1) / 2;
  const innerW = width - PANEL * 2;
  const innerH = height - PANEL * 2;

  addBox(group, innerW, skin, depthInner, interior, 0, PANEL + skin / 2, zc);
  addBox(group, innerW, skin, depthInner, interior, 0, height - PANEL - skin / 2, zc);
  addBox(group, skin, innerH, depthInner, interior, -width / 2 + PANEL + skin / 2, height / 2, zc);
  addBox(group, skin, innerH, depthInner, interior, width / 2 - PANEL - skin / 2, height / 2, zc);
  addBox(group, innerW, innerH, skin, interior, 0, height / 2, z0 + skin / 2);
}

const DENSITY = 680;

function tag(object, mechanism) {
  object.traverse((child) => {
    child.userData.mechanism = mechanism;
  });
}

function addDoor(group, width, height, depth, body, handleMat) {
  const doorW = width - PANEL * 2 - GAP * 2;
  const doorH = height - PANEL * 2 - GAP * 2;
  const doorZ = depth / 2 - PANEL / 2;
  const mass = DENSITY * doorW * doorH * PANEL;
  const pivot = new THREE.Group();
  pivot.position.set(-width / 2 + PANEL + GAP, height / 2, doorZ);
  group.add(pivot);

  addBox(pivot, doorW, doorH, PANEL, body, doorW / 2, 0, 0);
  const handleH = Math.min(0.12, doorH * 0.22);
  addBox(pivot, 0.012, handleH, 0.028, handleMat, doorW - 0.04, 0, PANEL / 2 + 0.014);

  const mechanism = {
    type: 'door',
    pivot,
    angle: 0,
    omega: 0,
    min: 0,
    max: (108 * Math.PI) / 180,
    mass,
    inertia: (mass * doorW * doorW) / 3,
    viscous: 0.58,
    coulomb: 0.16,
    restitution: 0.28,
  };
  tag(pivot, mechanism);
  return mechanism;
}

function addEmptyDrawerBox(parent, boxW, boxH, boxD, frontInnerZ, interior) {
  const wall = 0.012;
  const bottomT = 0.008;
  const z = frontInnerZ - boxD / 2;
  const sideH = boxH - bottomT;
  const sideY = -boxH / 2 + bottomT + sideH / 2;

  addBox(parent, boxW, bottomT, boxD, interior, 0, -boxH / 2 + bottomT / 2, z);
  addBox(parent, wall, sideH, boxD, interior, -boxW / 2 + wall / 2, sideY, z);
  addBox(parent, wall, sideH, boxD, interior, boxW / 2 - wall / 2, sideY, z);
  addBox(
    parent,
    Math.max(0.04, boxW - wall * 2),
    sideH,
    wall,
    interior,
    0,
    sideY,
    frontInnerZ - boxD + wall / 2,
  );

  return (
    boxW * bottomT * boxD +
    wall * sideH * boxD * 2 +
    Math.max(0.04, boxW - wall * 2) * sideH * wall
  );
}

function addDrawers(group, width, height, depth, body, interior, handleMat) {
  const innerW = width - PANEL * 2;
  const innerH = height - PANEL * 2;
  const gap = 0.003;
  const frontH = (innerH - gap * 3) / 2;
  const frontW = innerW - GAP * 2;
  const boxD = Math.max(0.12, depth - BACK - PANEL - 0.008);
  const boxH = Math.max(0.08, frontH - 0.012);
  const boxW = innerW - 0.016;
  const frontZ = depth / 2 - PANEL / 2;
  const frontInnerZ = frontZ - PANEL / 2;
  const mechanisms = [];

  for (let index = 0; index < 2; index += 1) {
    const y = PANEL + gap + frontH / 2 + index * (frontH + gap);
    const slide = new THREE.Group();
    slide.position.set(0, y, 0);
    group.add(slide);

    addBox(slide, frontW, frontH, PANEL, body, 0, 0, frontZ);
    const boxVolume = addEmptyDrawerBox(slide, boxW, boxH, boxD, frontInnerZ, interior);
    addBox(slide, 0.09, 0.012, 0.026, handleMat, 0, 0, frontZ + PANEL / 2 + 0.013);

    const mass = DENSITY * (frontW * frontH * PANEL + boxVolume);
    const mechanism = {
      type: 'drawer',
      pivot: slide,
      pos: 0,
      vel: 0,
      min: 0,
      max: boxD * 0.75,
      mass,
      viscous: 3.8,
      mu: 0.18,
      restitution: 0.24,
    };
    tag(slide, mechanism);
    mechanisms.push(mechanism);
  }

  return mechanisms;
}

export function buildCabinet(state, materials) {
  const group = new THREE.Group();
  const mechanisms = [];
  const width = mm(state.width);
  const height = mm(state.height);
  const depth = mm(state.depth);

  addCarcass(group, width, height, depth, materials.body);
  if (state.template !== 'drawers') {
    addEmptyCavity(group, width, height, depth, materials.interior);
  }

  if (state.template === 'door') {
    mechanisms.push(addDoor(group, width, height, depth, materials.body, materials.handle));
  }
  if (state.template === 'drawers') {
    mechanisms.push(
      ...addDrawers(group, width, height, depth, materials.body, materials.interior, materials.handle),
    );
  }

  return { group, mechanisms };
}
