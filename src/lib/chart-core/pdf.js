const PAPER = { width: 612, height: 792 };
const KAPPA = 0.5522847498;

export function escapePdfText(value) {
  return value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
}

export function circlePath(x, y, radius) {
  const control = radius * KAPPA;
  return [
    `${(x - radius).toFixed(2)} ${y.toFixed(2)} m`,
    `${(x - radius).toFixed(2)} ${(y + control).toFixed(2)} ${(x - control).toFixed(2)} ${(y + radius).toFixed(2)} ${x.toFixed(2)} ${(y + radius).toFixed(2)} c`,
    `${(x + control).toFixed(2)} ${(y + radius).toFixed(2)} ${(x + radius).toFixed(2)} ${(y + control).toFixed(2)} ${(x + radius).toFixed(2)} ${y.toFixed(2)} c`,
    `${(x + radius).toFixed(2)} ${(y - control).toFixed(2)} ${(x + control).toFixed(2)} ${(y - radius).toFixed(2)} ${x.toFixed(2)} ${(y - radius).toFixed(2)} c`,
    `${(x - control).toFixed(2)} ${(y - radius).toFixed(2)} ${(x - radius).toFixed(2)} ${(y - control).toFixed(2)} ${(x - radius).toFixed(2)} ${y.toFixed(2)} c`,
  ].join('\n');
}

export function rectanglePath(x, y, width, height) {
  return `${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re`;
}

export function diamondPath(x, y, radius) {
  return [
    `${x.toFixed(2)} ${(y + radius).toFixed(2)} m`,
    `${(x + radius).toFixed(2)} ${y.toFixed(2)} l`,
    `${x.toFixed(2)} ${(y - radius).toFixed(2)} l`,
    `${(x - radius).toFixed(2)} ${y.toFixed(2)} l`,
    'h',
  ].join('\n');
}

export function buildPdfDocument(pages) {
  const objects = [];
  const addObject = (body = '') => {
    objects.push(body);
    return objects.length;
  };
  const setObject = (id, body) => {
    objects[id - 1] = body;
  };

  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const boldFontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pageIds = [];
  const contentIds = [];

  for (const page of pages) {
    const stream = page.trim();
    const contentId = addObject(`<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject();
    contentIds.push(contentId);
    pageIds.push(pageId);
  }

  const pagesId = addObject();
  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  for (let index = 0; index < pageIds.length; index += 1) {
    setObject(
      pageIds[index],
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAPER.width} ${PAPER.height}] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentIds[index]} 0 R >>`
    );
  }

  setObject(pagesId, `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>`);

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer << /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}
