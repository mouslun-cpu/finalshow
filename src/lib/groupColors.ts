// Fund Rush neon palette — one signature color per group.
// Each group gets a distinct neon hue so the whole Arena (numbers, column,
// glows, edges) can tint to whichever group is currently raising.

export interface GroupColor {
  tag: string;
  color: string; // oklch base color
}

const PALETTE: GroupColor[] = [
  { tag: 'NOVA',  color: 'oklch(0.80 0.15 195)' }, // cyan
  { tag: 'PULSE', color: 'oklch(0.70 0.17 250)' }, // blue
  { tag: 'ORBIT', color: 'oklch(0.70 0.18 292)' }, // violet
  { tag: 'EMBER', color: 'oklch(0.74 0.20 352)' }, // pink
  { tag: 'BLAZE', color: 'oklch(0.83 0.16 82)'  }, // gold
  { tag: 'VERDE', color: 'oklch(0.81 0.18 150)' }, // green
  { tag: 'FLUX',  color: 'oklch(0.72 0.19 35)'  }, // red-orange
  { tag: 'IRIS',  color: 'oklch(0.72 0.20 330)' }, // magenta
  { tag: 'AQUA',  color: 'oklch(0.80 0.15 175)' }, // teal
];

export function groupColor(id: string | number | null | undefined): string {
  return groupMeta(id).color;
}

export function groupMeta(id: string | number | null | undefined): GroupColor {
  const n = Number(id);
  if (!n || Number.isNaN(n)) return PALETTE[0];
  return PALETTE[(n - 1) % PALETTE.length];
}

/** color-mix helper — fade a color toward transparent by `amount`% opacity. */
export function fade(c: string, amount: number): string {
  return `color-mix(in oklch, ${c} ${amount}%, transparent)`;
}

export const SUCCESS = '#36d399';
