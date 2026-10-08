/**
 * ELD Log Sheet drawing utilities.
 * Draws standard FMCSA 24-hour grid on HTML5 Canvas.
 */

export const STATUS_COLORS = {
  off_duty: '#10b981',
  sleeper_berth: '#6366f1',
  driving: '#ef4444',
  on_duty: '#f59e0b',
};

export const STATUS_LABELS = [
  { key: 'off_duty', label: '1. OFF DUTY' },
  { key: 'sleeper_berth', label: '2. SLEEPER BERTH' },
  { key: 'driving', label: '3. DRIVING' },
  { key: 'on_duty', label: '4. ON DUTY (NOT DRIVING)' },
];

/**
 * Draw the ELD daily log grid on a canvas.
 */
export function drawELDLog(canvas, entries, options = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const width = options.width || 860;
  const height = options.height || 230;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.scale(dpr, dpr);

  const marginLeft = 160;
  const marginRight = 30;
  const marginTop = 32;
  const gridWidth = width - marginLeft - marginRight;
  const rowHeight = 36;
  const numRows = 4;
  const gridHeight = rowHeight * numRows;
  const hourWidth = gridWidth / 24;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Row labels
  ctx.font = '600 10px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  STATUS_LABELS.forEach((status, i) => {
    const y = marginTop + i * rowHeight + rowHeight / 2;
    ctx.fillStyle = STATUS_COLORS[status.key];
    ctx.fillRect(10, y - 6, 12, 12);
    ctx.fillStyle = '#1f2937';
    ctx.fillText(status.label, marginLeft - 10, y);
  });

  // Grid background lines
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;

  // Horizontal row dividers
  for (let i = 0; i <= numRows; i++) {
    const y = marginTop + i * rowHeight;
    ctx.beginPath();
    ctx.moveTo(marginLeft, y);
    ctx.lineTo(marginLeft + gridWidth, y);
    ctx.stroke();
  }

  // Row middle dashed lines
  ctx.setLineDash([2, 2]);
  ctx.strokeStyle = '#f3f4f6';
  for (let i = 0; i < numRows; i++) {
    const y = marginTop + i * rowHeight + rowHeight / 2;
    ctx.beginPath();
    ctx.moveTo(marginLeft, y);
    ctx.lineTo(marginLeft + gridWidth, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Vertical hour markers
  for (let h = 0; h <= 24; h++) {
    const x = marginLeft + h * hourWidth;
    ctx.lineWidth = h % 6 === 0 ? 1.5 : 0.75;
    ctx.strokeStyle = h % 6 === 0 ? '#6b7280' : '#d1d5db';
    ctx.beginPath();
    ctx.moveTo(x, marginTop);
    ctx.lineTo(x, marginTop + gridHeight);
    ctx.stroke();
  }

  // 15-minute tick marks
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 0.5;
  for (let h = 0; h < 24; h++) {
    for (let q = 1; q <= 3; q++) {
      const x = marginLeft + (h + q / 4) * hourWidth;
      ctx.beginPath();
      ctx.moveTo(x, marginTop);
      ctx.lineTo(x, marginTop + gridHeight);
      ctx.stroke();
    }
  }

  // Hour labels on top & bottom
  ctx.font = '500 9px Inter, sans-serif';
  ctx.fillStyle = '#4b5563';
  ctx.textAlign = 'center';

  for (let h = 0; h <= 24; h++) {
    const x = marginLeft + h * hourWidth;
    const label = h === 0 ? 'Mid' : h === 12 ? 'Noon' : h === 24 ? 'Mid' : h > 12 ? `${h - 12}` : `${h}`;
    ctx.fillText(label, x, marginTop - 8);
    ctx.fillText(label, x, marginTop + gridHeight + 12);
  }

  if (!entries || entries.length === 0) return;

  const statusRowIndex = {
    off_duty: 0,
    sleeper_berth: 1,
    driving: 2,
    on_duty: 3,
  };

  const sortedEntries = [...entries].sort((a, b) => a.start_hour - b.start_hour);

  for (let i = 0; i < sortedEntries.length; i++) {
    const entry = sortedEntries[i];
    const rowIdx = statusRowIndex[entry.status];
    if (rowIdx === undefined) continue;

    const startX = marginLeft + Math.max(0, Math.min(24, entry.start_hour)) * hourWidth;
    const endH = entry.end_hour === 0 && entry.start_hour > 0 ? 24 : Math.max(0, Math.min(24, entry.end_hour));
    const endX = marginLeft + endH * hourWidth;
    const y = marginTop + rowIdx * rowHeight + rowHeight / 2;

    const color = STATUS_COLORS[entry.status];

    // Status horizontal line
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();

    // Transition vertical connector
    if (i > 0) {
      const prevEntry = sortedEntries[i - 1];
      const prevRowIdx = statusRowIndex[prevEntry.status];
      if (prevRowIdx !== undefined && prevRowIdx !== rowIdx) {
        const prevY = marginTop + prevRowIdx * rowHeight + rowHeight / 2;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(startX, prevY);
        ctx.lineTo(startX, y);
        ctx.stroke();
      }
    }
  }
}
