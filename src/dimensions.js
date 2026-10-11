import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

function mm(value) {
  return value / 1000;
}

function makeLine(points) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0x5c534a,
    depthTest: false,
    transparent: true,
    opacity: 0.85,
  });
  const line = new THREE.Line(geometry, material);
  line.renderOrder = 20;
  return line;
}

function makeLabel(text) {
  const el = document.createElement('div');
  el.className = 'dim-label';
  el.textContent = text;
  const label = new CSS2DObject(el);
  return label;
}

function addDimension(parent, from, to, offset, text) {
  const a = from.clone().add(offset);
  const b = to.clone().add(offset);
  parent.add(makeLine([from, a]));
  parent.add(makeLine([to, b]));
  parent.add(makeLine([a, b]));

  const mid = a.clone().add(b).multiplyScalar(0.5);
  const label = makeLabel(text);
  label.position.copy(mid);
  parent.add(label);
}

export function clearDimensions(group) {
  group.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
    if (child.element && child.element.parentNode) {
      child.element.parentNode.removeChild(child.element);
    }
  });
  while (group.children.length > 0) {
    group.remove(group.children[0]);
  }
}

export function buildDimensions(state) {
  const group = new THREE.Group();
  const width = mm(state.width);
  const height = mm(state.height);
  const depth = mm(state.depth);
  const pad = 0.07;

  addDimension(
    group,
    new THREE.Vector3(-width / 2, 0, depth / 2),
    new THREE.Vector3(width / 2, 0, depth / 2),
    new THREE.Vector3(0, 0, pad),
    `${state.width} мм`,
  );

  addDimension(
    group,
    new THREE.Vector3(-width / 2, 0, depth / 2),
    new THREE.Vector3(-width / 2, height, depth / 2),
    new THREE.Vector3(-pad, 0, pad * 0.4),
    `${state.height} мм`,
  );

  addDimension(
    group,
    new THREE.Vector3(width / 2, 0, -depth / 2),
    new THREE.Vector3(width / 2, 0, depth / 2),
    new THREE.Vector3(pad, 0, 0),
    `${state.depth} мм`,
  );

  return group;
}
