export function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Density peaks, in grid-local coordinates (x right, z toward camera before rotation).
const CENTERS = [
  { x: -1150, z: -250, r: 420, w: 1.0 },  // downtown (left display)
  { x: 150, z: -350, r: 300, w: 0.55 },   // secondary cluster (middle)
  { x: 1300, z: -150, r: 260, w: 0.35 },  // small cluster (right)
];

/**
 * Seeded street grid with buildings on subdivided lots. All coordinates are local to a
 * group rotated by `rotation` around Y.
 */
export function generateCity({ seed = 7, cols = 64, rows = 30, block = 56, street = 14, rotation = 0.55 } = {}) {
  const rnd = mulberry32(seed);
  const pitch = block + street;
  const ox = -(cols * pitch) / 2, oz = -(rows * pitch) / 2;
  const density = (x, z) => CENTERS.reduce((s, c) => s + c.w * Math.exp(-((x - c.x) ** 2 + (z - c.z) ** 2) / (2 * c.r * c.r)), 0);
  const buildings = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const bx = ox + i * pitch + street / 2, bz = oz + j * pitch + street / 2;
      const d0 = density(bx + block / 2, bz + block / 2);
      if (d0 < 0.3 && rnd() < 0.07) continue; // park / empty block
      const n = d0 > 0.55 ? 2 : rnd() < 0.5 ? 2 : 3;
      const lot = block / n;
      const district = Math.min(3, Math.floor((i / cols) * 4)) + 4 * (j >= rows / 2 ? 1 : 0);
      for (let a = 0; a < n; a++) {
        for (let b = 0; b < n; b++) {
          if (rnd() < 0.06) continue;
          const inset = 1.2 + rnd() * 2.3;
          const x = bx + a * lot + lot / 2, z = bz + b * lot + lot / 2;
          const d = density(x, z);
          const spike = rnd() < 0.08 + d * 0.3 ? 2.1 : 1;
          const h = 7 + rnd() * 10 + d * (50 + rnd() * 170) * spike;
          buildings.push({ x, z, w: lot - inset * 2, d: lot - inset * 2, h, seed: rnd(), district });
        }
      }
    }
  }
  const W = cols * pitch, D = rows * pitch;
  const highway = { ax: ox + W * 0.2, az: oz + D + 200, bx: ox + W + 200, bz: oz + D * 0.05, width: 22 };
  return { buildings, grid: { ox, oz, pitch, cols, rows, street, block }, highway, rotation };
}
