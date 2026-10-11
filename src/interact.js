import * as THREE from 'three';
import { applyTapImpulse, stepAll } from './physics.js';

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const hitPoint = new THREE.Vector3();
const hingeWorld = new THREE.Vector3();
const plane = new THREE.Plane();

function setPointer(event, element) {
  const rect = element.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function pickMechanism(event, camera, element, root) {
  setPointer(event, element);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(root, true);
  return hits.find((hit) => hit.object.userData.mechanism)?.object.userData.mechanism ?? null;
}

function pointerOnYPlane(event, camera, element, y) {
  setPointer(event, element);
  raycaster.setFromCamera(pointer, camera);
  plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, y, 0));
  return raycaster.ray.intersectPlane(plane, hitPoint) ? hitPoint.clone() : null;
}

function doorTargetFromPointer(event, camera, element, mech) {
  mech.pivot.getWorldPosition(hingeWorld);
  const hit = pointerOnYPlane(event, camera, element, hingeWorld.y);
  if (!hit) return mech.angle;
  const x = hit.x - hingeWorld.x;
  const z = hit.z - hingeWorld.z;
  return Math.atan2(z, x);
}

function drawerTargetFromPointer(event, camera, element, mech, grabOffset) {
  const hit = pointerOnYPlane(event, camera, element, mech.pivot.position.y);
  if (!hit) return mech.pos;
  return hit.z - grabOffset;
}

export function bindInteraction({ camera, renderer, controls, furnitureRoot, getMechanisms }) {
  const element = renderer.domElement;
  const drag = { active: false, mech: null, moved: false, startX: 0, startY: 0, grabOffset: 0, target: 0 };

  function currentDrag() {
    return drag.active ? drag : null;
  }

  function onDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    const mech = pickMechanism(event, camera, element, furnitureRoot);
    if (!mech) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    drag.active = true;
    drag.mech = mech;
    drag.moved = false;
    drag.startX = event.clientX;
    drag.startY = event.clientY;
    controls.enabled = false;

    if (mech.type === 'door') {
      drag.target = mech.angle;
    } else {
      const hit = pointerOnYPlane(event, camera, element, mech.pivot.position.y);
      drag.grabOffset = hit ? hit.z - mech.pos : 0;
      drag.target = mech.pos;
    }
  }

  function onMove(event) {
    if (!drag.active || !drag.mech) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (dx * dx + dy * dy > 144) drag.moved = true;

    if (drag.mech.type === 'door') {
      drag.target = doorTargetFromPointer(event, camera, element, drag.mech);
    } else {
      drag.target = drawerTargetFromPointer(event, camera, element, drag.mech, drag.grabOffset);
    }
  }

  function onUp() {
    if (!drag.active) return;
    if (!drag.moved && drag.mech) applyTapImpulse(drag.mech);
    drag.active = false;
    drag.mech = null;
    controls.enabled = true;
  }

  element.addEventListener('pointerdown', onDown, { capture: true });
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  return {
    update(dt) {
      stepAll(getMechanisms(), dt, currentDrag());
    },
  };
}
