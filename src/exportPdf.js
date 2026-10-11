import { jsPDF } from 'jspdf';
import notoBoldUrl from './assets/fonts/NotoSans-Bold.ttf?url';
import notoRegularUrl from './assets/fonts/NotoSans-Regular.ttf?url';

const TEMPLATE_LABELS = {
  open: 'Простая тумба',
  door: 'С дверцей',
  drawers: 'С ящиками',
};

const COLOR_LABELS = {
  white: 'Белый',
  gray: 'Серый',
  walnut: 'Орех',
};

const COLORS = {
  ink: [28, 25, 22],
  muted: [111, 104, 96],
  line: [228, 221, 212],
  accent: [138, 90, 50],
  paper: [255, 252, 248],
  stripe: [241, 228, 214],
  preview: [239, 232, 222],
};

let cachedFonts = null;

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return btoa(binary);
}

async function loadFonts() {
  if (cachedFonts) return cachedFonts;
  const [regular, bold] = await Promise.all([
    fetch(notoRegularUrl).then((response) => response.arrayBuffer()),
    fetch(notoBoldUrl).then((response) => response.arrayBuffer()),
  ]);
  cachedFonts = {
    regular: arrayBufferToBase64(regular),
    bold: arrayBufferToBase64(bold),
  };
  return cachedFonts;
}

function registerFonts(doc, fonts) {
  doc.addFileToVFS('NotoSans-Regular.ttf', fonts.regular);
  doc.addFileToVFS('NotoSans-Bold.ttf', fonts.bold);
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
  doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');
  doc.setFont('NotoSans', 'normal');
}

function getEquipment(template) {
  if (template === 'door') {
    return [
      ['Корпус', 'Есть, закрытый фасадом'],
      ['Дверца', '1 шт., распашная'],
      ['Ящики', 'Нет'],
      ['Ручки', '1 шт., металлическая'],
    ];
  }
  if (template === 'drawers') {
    return [
      ['Корпус', 'Есть, с выдвижными ящиками'],
      ['Дверца', 'Нет'],
      ['Ящики', '2 шт., выдвижные'],
      ['Ручки', '2 шт., металлические'],
    ];
  }
  return [
    ['Корпус', 'Есть, открытый, без фасадов'],
    ['Дверца', 'Нет'],
    ['Ящики', 'Нет'],
    ['Ручки', 'Нет'],
  ];
}

export function getFurnitureSpec(state) {
  return {
    title: 'Qdesign.kz — Спецификация мебели',
    template: TEMPLATE_LABELS[state.template] || state.template,
    width: `${state.width} мм`,
    height: `${state.height} мм`,
    depth: `${state.depth} мм`,
    color: COLOR_LABELS[state.color] || state.color,
    equipment: getEquipment(state.template),
    createdAt: new Date().toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

function captureModelImage(renderer, scene, camera) {
  renderer.render(scene, camera);
  return renderer.domElement.toDataURL('image/jpeg', 0.92);
}

function drawHeader(doc, pageWidth, margin) {
  doc.setFillColor(...COLORS.ink);
  doc.roundedRect(margin, 14, 12, 12, 2.2, 2.2, 'F');
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('Q', margin + 6, 22.2, { align: 'center' });

  doc.setTextColor(...COLORS.ink);
  doc.setFontSize(16);
  doc.text('Qdesign.kz — Спецификация мебели', margin + 16, 22);

  doc.setDrawColor(...COLORS.line);
  doc.setLineWidth(0.45);
  doc.line(margin, 30, pageWidth - margin, 30);
}

function drawTable(doc, rows, x, y, width) {
  const labelWidth = width * 0.4;
  const rowHeight = 9;
  const headerHeight = 9.5;

  doc.setFillColor(...COLORS.accent);
  doc.rect(x, y, width, headerHeight, 'F');
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('Характеристика', x + 4, y + 6.4);
  doc.text('Значение', x + labelWidth + 4, y + 6.4);

  let cursor = y + headerHeight;
  rows.forEach((row, index) => {
    doc.setFillColor(...(index % 2 === 0 ? COLORS.paper : COLORS.stripe));
    doc.rect(x, cursor, width, rowHeight, 'F');
    doc.setDrawColor(...COLORS.line);
    doc.setLineWidth(0.2);
    doc.rect(x, cursor, width, rowHeight, 'S');

    doc.setTextColor(...COLORS.ink);
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(10);
    doc.text(row[0], x + 4, cursor + 6.1);
    doc.setFont('NotoSans', 'bold');
    doc.text(row[1], x + labelWidth + 4, cursor + 6.1);
    cursor += rowHeight;
  });

  return cursor;
}

export async function downloadFurnitureSpecPdf({ state, renderer, scene, camera }) {
  const spec = getFurnitureSpec(state);
  const fonts = await loadFonts();
  const preview = captureModelImage(renderer, scene, camera);

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  registerFonts(doc, fonts);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  drawHeader(doc, pageWidth, margin);

  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.muted);
  doc.text(`Дата формирования: ${spec.createdAt}`, margin, 38);

  const canvas = renderer.domElement;
  const maxPreviewHeight = 92;
  const ratio = canvas.width / Math.max(canvas.height, 1);
  let previewWidth = contentWidth;
  let previewHeight = previewWidth / ratio;
  if (previewHeight > maxPreviewHeight) {
    previewHeight = maxPreviewHeight;
    previewWidth = previewHeight * ratio;
  }
  const previewX = margin + (contentWidth - previewWidth) / 2;
  const previewY = 44;

  doc.setFillColor(...COLORS.preview);
  doc.roundedRect(margin, previewY, contentWidth, previewHeight + 8, 3, 3, 'F');
  doc.addImage(preview, 'JPEG', previewX, previewY + 4, previewWidth, previewHeight, undefined, 'FAST');

  const sectionY = previewY + previewHeight + 18;
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.ink);
  doc.text('Характеристики конфигурации', margin, sectionY);

  const rows = [
    ['Шаблон', spec.template],
    ['Ширина', spec.width],
    ['Высота', spec.height],
    ['Глубина', spec.depth],
    ['Цвет', spec.color],
    ...spec.equipment,
  ];
  const tableBottom = drawTable(doc, rows, margin, sectionY + 6, contentWidth);

  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.text(
    'Комплектация зависит от выбранного шаблона и соответствует текущей 3D-модели.',
    margin,
    tableBottom + 8,
  );

  doc.setDrawColor(...COLORS.line);
  doc.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);
  doc.setFontSize(8);
  doc.text('Документ сформирован локально в 3D-конфигураторе Qdesign.kz', margin, pageHeight - 10);

  const fileName = `Qdesign-спецификация-${spec.template}-${state.width}x${state.height}x${state.depth}.pdf`;
  doc.save(fileName);
}
