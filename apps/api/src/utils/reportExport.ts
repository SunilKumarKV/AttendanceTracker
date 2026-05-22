const escapeCsvValue = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value);
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n]/.test(safeText) ? `"${safeText.replace(/"/g, '""')}"` : safeText;
};

export const toCsv = (rows: Record<string, unknown>[]) => {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(',')),
  ];
  return `\uFEFF${lines.join('\n')}`;
};

const escapePdfText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

export const toSimplePdf = (title: string, lines: string[]) => {
  const pageLines = [title, '', ...lines].slice(0, 44);
  const content = [
    'BT',
    '/F1 12 Tf',
    '50 790 Td',
    ...pageLines.map((line, index) => `${index === 0 ? '' : '0 -16 Td'}(${escapePdfText(line)}) Tj`),
    'ET',
  ].join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream\nendobj\n`,
  ];

  let offset = '%PDF-1.4\n'.length;
  const xref = ['0000000000 65535 f '];
  const body = objects.map((object) => {
    xref.push(`${String(offset).padStart(10, '0')} 00000 n `);
    offset += Buffer.byteLength(object);
    return object;
  }).join('');
  const startXref = offset;
  const pdf = `%PDF-1.4\n${body}xref\n0 ${xref.length}\n${xref.join('\n')}\ntrailer\n<< /Size ${xref.length} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;

  return Buffer.from(pdf);
};
