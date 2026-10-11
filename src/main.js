import './style.css';
import {
  SIZE_LIMITS,
  applyColor,
  buildCabinet,
  createMaterials,
  createWoodTexture,
  disposeObject,
} from './furniture.js';
import { buildDimensions, clearDimensions } from './dimensions.js';
import { bindInteraction } from './interact.js';
import { createScene } from './scene.js';
import { downloadFurnitureSpecPdf } from './exportPdf.js';

const state = {
  template: 'open',
  width: 600,
  height: 800,
  depth: 400,
  color: 'white',
};

const root = document.querySelector('#canvas-root');
const hint = document.querySelector('#view-hint');
const sceneApi = createScene(root);
const materials = createMaterials(createWoodTexture());
applyColor(materials, state.color);

let fittedOnce = false;
let mechanisms = [];

const interaction = bindInteraction({
  camera: sceneApi.camera,
  renderer: sceneApi.renderer,
  controls: sceneApi.controls,
  furnitureRoot: sceneApi.furnitureRoot,
  getMechanisms: () => mechanisms,
});

function readSize(id, key) {
  const input = document.querySelector(`#${id}`);
  const limits = SIZE_LIMITS[key];
  const value = Number(input.value);
  const valid = Number.isFinite(value) && value >= limits.min && value <= limits.max;
  input.classList.toggle('invalid', !valid);
  return valid ? Math.round(value) : null;
}

function syncSizesFromInputs() {
  const width = readSize('width', 'width');
  const height = readSize('height', 'height');
  const depth = readSize('depth', 'depth');
  const error = document.querySelector('#size-error');
  const valid = width !== null && height !== null && depth !== null;
  error.hidden = valid;
  if (!valid) return false;
  state.width = width;
  state.height = height;
  state.depth = depth;
  return true;
}

function updateHint() {
  if (state.template === 'door') {
    hint.textContent = 'Нажмите дверцу или потяните за ручку.';
  } else if (state.template === 'drawers') {
    hint.textContent = 'Нажмите ящик или выдвиньте его рукой.';
  } else {
    hint.textContent = 'Вращайте модель мышью или касанием';
  }
}

function rebuild(shouldFit) {
  disposeObject(sceneApi.furnitureRoot);
  clearDimensions(sceneApi.dimensionsRoot);

  const built = buildCabinet(state, materials);
  mechanisms = built.mechanisms;
  sceneApi.furnitureRoot.add(built.group);
  sceneApi.dimensionsRoot.add(buildDimensions(state));
  updateHint();

  if (shouldFit || !fittedOnce) {
    sceneApi.fitCamera(sceneApi.furnitureRoot);
    fittedOnce = true;
  } else {
    sceneApi.recenter(sceneApi.furnitureRoot);
  }
}

function setActive(buttons, attr, value) {
  buttons.forEach((button) => {
    const on = button.dataset[attr] === value;
    button.classList.toggle('is-active', on);
    button.setAttribute('aria-pressed', String(on));
  });
}

document.querySelectorAll('[data-template]').forEach((button) => {
  button.addEventListener('click', () => {
    state.template = button.dataset.template;
    setActive(document.querySelectorAll('[data-template]'), 'template', state.template);
    rebuild(true);
    if (window.matchMedia('(max-width: 900px)').matches) setPanelOpen(false);
  });
});

document.querySelectorAll('[data-color]').forEach((button) => {
  button.addEventListener('click', () => {
    state.color = button.dataset.color;
    setActive(document.querySelectorAll('[data-color]'), 'color', state.color);
    applyColor(materials, state.color);
  });
});

['width', 'height', 'depth'].forEach((id) => {
  document.querySelector(`#${id}`).addEventListener('input', () => {
    if (syncSizesFromInputs()) rebuild(false);
  });
});

document.querySelector('#reset-camera').addEventListener('click', () => {
  sceneApi.resetCamera();
});

const downloadPdfButton = document.querySelector('#download-pdf');
downloadPdfButton.addEventListener('click', async () => {
  if (!syncSizesFromInputs()) return;
  downloadPdfButton.disabled = true;
  try {
    await downloadFurnitureSpecPdf({
      state: { ...state },
      renderer: sceneApi.renderer,
      scene: sceneApi.scene,
      camera: sceneApi.camera,
    });
  } catch (error) {
    console.error(error);
    window.alert('Не удалось сформировать PDF. Попробуйте ещё раз.');
  } finally {
    downloadPdfButton.disabled = false;
  }
});

const sidebar = document.querySelector('#sidebar');
const backdrop = document.querySelector('#backdrop');
const settingsToggle = document.querySelector('#settings-toggle');

function setPanelOpen(open) {
  sidebar.classList.toggle('is-open', open);
  backdrop.classList.toggle('is-open', open);
  settingsToggle.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('panel-open', open);
}

settingsToggle.addEventListener('click', () => {
  setPanelOpen(!sidebar.classList.contains('is-open'));
});
backdrop.addEventListener('click', () => setPanelOpen(false));
document.querySelector('#close-panel').addEventListener('click', () => setPanelOpen(false));

sceneApi.resize();
rebuild(true);
sceneApi.startLoop((dt) => interaction.update(dt));
