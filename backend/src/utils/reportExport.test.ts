import { describe, expect, it } from 'vitest';
import { toCsv, toSimplePdf } from './reportExport.js';

describe('reportExport utilities', () => {
  it('escapes CSV values', () => {
    const csv = toCsv([{ Name: 'Doe, Jane', Note: 'Needs "review"' }]);
    expect(csv).toContain('"Doe, Jane"');
    expect(csv).toContain('"Needs ""review"""');
  });

  it('creates a PDF buffer', () => {
    const pdf = toSimplePdf('AttendanceTracker', ['Line one']);
    expect(pdf.toString('utf8', 0, 5)).toBe('%PDF-');
  });
});
