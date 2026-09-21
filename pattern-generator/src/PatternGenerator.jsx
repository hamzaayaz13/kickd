import { useState, useMemo, useRef } from "react";
import { Download, Copy, Check, Shuffle, RotateCcw, Code } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  utils                                                              */
/* ------------------------------------------------------------------ */

const n = (v) => Math.round(v * 100) / 100;
const snap = (v, s) => Math.floor(v / s) * s;

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/*  palettes                                                           */
/* ------------------------------------------------------------------ */

const PALETTES = [
  { name: "Rosso Rosa", bg: "#B3202A", ink: "#E9A6C8", accent: "#F6E3EC" },
  { name: "Celeste", bg: "#7FB2DE", ink: "#1E3552", accent: "#DCEAF6" },
  { name: "Terrace", bg: "#E8DFC8", ink: "#1F2933", accent: "#B4472E" },
  { name: "Kit 74", bg: "#F1E7D6", ink: "#2F4858", accent: "#E0A526" },
  { name: "Sunday League", bg: "#DCD5C4", ink: "#3B4B2E", accent: "#C25E38" },
  { name: "Away Shirt", bg: "#101820", ink: "#F2EBD9", accent: "#D94F35" },
  { name: "Sticker Album", bg: "#F5EFE2", ink: "#1B4079", accent: "#D62828" },
  { name: "Copa", bg: "#EFE3D0", ink: "#6B2737", accent: "#4E6E58" },
  { name: "Newsprint", bg: "#E5E5E0", ink: "#23231F", accent: "#8A8A82" },
];

/* ------------------------------------------------------------------ */
/*  pattern generators                                                 */
/*  each returns a flat array of primitive descriptors                 */
/* ------------------------------------------------------------------ */

function arcQ(cx, cy, r, a0) {
  const rad = (d) => (d * Math.PI) / 180;
  const p0 = [cx + r * Math.cos(rad(a0)), cy + r * Math.sin(rad(a0))];
  const p1 = [cx + r * Math.cos(rad(a0 + 90)), cy + r * Math.sin(rad(a0 + 90))];
  return `M ${n(p0[0])} ${n(p0[1])} A ${n(r)} ${n(r)} 0 0 1 ${n(p1[0])} ${n(p1[1])}`;
}

const GENS = {
  hoops: (c) => {
    const { x0, y0, x1, y1, s, wt, pick } = c;
    const out = [];
    let i = 0;
    for (let y = snap(y0, s); y <= y1; y += s, i++)
      out.push({ k: "rect", x: x0, y, w: x1 - x0, h: s * wt, fill: pick(i) });
    return out;
  },

  stripes: (c) => {
    const { x0, y0, x1, y1, s, wt, pick } = c;
    const out = [];
    let i = 0;
    for (let x = snap(x0, s); x <= x1; x += s, i++)
      out.push({ k: "rect", x, y: y0, w: s * wt, h: y1 - y0, fill: pick(i) });
    return out;
  },

  pinstripe: (c) => {
    const { x0, y0, x1, y1, s, wt, pick } = c;
    const out = [];
    const t = Math.max(0.75, s * wt * 0.16);
    let i = 0;
    for (let x = snap(x0, s); x <= x1; x += s, i++) {
      out.push({ k: "rect", x, y: y0, w: t, h: y1 - y0, fill: pick(i) });
      out.push({ k: "rect", x: x + s * 0.22, y: y0, w: t, h: y1 - y0, fill: pick(i) });
    }
    return out;
  },

  chevron: (c) => {
    const { x0, y0, x1, y1, s, wt, pick } = c;
    const out = [];
    const amp = s * 0.5;
    const sw = Math.max(1, s * wt * 0.5);
    let i = 0;
    for (let y = snap(y0, s); y <= y1 + s; y += s, i++) {
      let d = `M ${n(x0)} ${n(y)}`;
      for (let x = x0; x <= x1; x += s)
        d += ` L ${n(x + s / 2)} ${n(y - amp)} L ${n(x + s)} ${n(y)}`;
      out.push({ k: "path", d, stroke: pick(i), sw, fill: "none" });
    }
    return out;
  },

  harlequin: (c) => {
    const { x0, y0, x1, y1, s, wt, ink, accent, every } = c;
    const out = [];
    const hx = (s / 2) * (0.45 + 0.55 * wt);
    const B = every > 0 ? accent : ink;
    const dia = (cx, cy, fill) =>
      out.push({
        k: "poly",
        points: `${n(cx)},${n(cy - hx)} ${n(cx + hx)},${n(cy)} ${n(cx)},${n(cy + hx)} ${n(cx - hx)},${n(cy)}`,
        fill,
      });
    for (let y = snap(y0, s); y <= y1 + s; y += s)
      for (let x = snap(x0, s); x <= x1 + s; x += s) {
        dia(x, y, ink);
        dia(x + s / 2, y + s / 2, B);
      }
    return out;
  },

  argyle: (c) => {
    const { x0, y0, x1, y1, s, wt, ink, accent, every } = c;
    const out = [];
    const hx = (s / 2) * (0.55 + 0.45 * wt);
    const sw = Math.max(0.75, s * wt * 0.08);
    let j = 0;
    for (let y = snap(y0, s); y <= y1 + s; y += s, j++) {
      let i = 0;
      for (let x = snap(x0, s); x <= x1 + s; x += s, i++) {
        if ((i + j) % 2) continue;
        out.push({
          k: "poly",
          points: `${n(x)},${n(y - hx)} ${n(x + hx)},${n(y)} ${n(x)},${n(y + hx)} ${n(x - hx)},${n(y)}`,
          fill: every > 0 && (i + j) % 4 === 0 ? accent : ink,
        });
      }
    }
    const span = x1 - x0;
    for (let k = -span; k <= y1 - y0 + span; k += s) {
      out.push({ k: "path", d: `M ${n(x0)} ${n(y0 + k)} L ${n(x1)} ${n(y0 + k - span)}`, stroke: ink, sw, fill: "none", dash: `${n(s * 0.18)} ${n(s * 0.18)}` });
      out.push({ k: "path", d: `M ${n(x0)} ${n(y0 + k)} L ${n(x1)} ${n(y0 + k + span)}`, stroke: ink, sw, fill: "none", dash: `${n(s * 0.18)} ${n(s * 0.18)}` });
    }
    return out;
  },

  blocks: (c) => {
    const { x0, y0, x1, y1, s, wt, ink, accent, every } = c;
    const out = [];
    const size = s * (0.5 + 0.5 * wt);
    let j = 0;
    for (let y = snap(y0, s); y <= y1; y += s, j++) {
      let i = 0;
      for (let x = snap(x0, s); x <= x1; x += s, i++) {
        if ((i + j) % 2) continue;
        out.push({ k: "rect", x, y, w: size, h: size, fill: every > 0 && (i * 3 + j) % (every * 2) === 0 ? accent : ink });
      }
    }
    return out;
  },

  hex: (c) => {
    const { x0, y0, x1, y1, s, wt, ink, accent, every, rng } = c;
    const out = [];
    const r = s / 2;
    const hw = Math.sqrt(3) * r;
    const vs = 1.5 * r;
    const sw = Math.max(0.75, s * wt * 0.14);
    let j = 0;
    for (let y = snap(y0, vs) - vs; y <= y1 + vs; y += vs, j++) {
      const off = j % 2 ? hw / 2 : 0;
      for (let x = snap(x0, hw) - hw + off; x <= x1 + hw; x += hw) {
        const pts = [];
        for (let k = 0; k < 6; k++) {
          const a = ((60 * k - 90) * Math.PI) / 180;
          pts.push(`${n(x + r * Math.cos(a))},${n(y + r * Math.sin(a))}`);
        }
        const roll = rng();
        const filled = roll < 0.22;
        const isAccent = every > 0 && roll > 0.93;
        out.push({
          k: "poly",
          points: pts.join(" "),
          fill: filled ? (isAccent ? accent : ink) : "none",
          stroke: isAccent && !filled ? accent : ink,
          sw,
        });
      }
    }
    return out;
  },

  net: (c) => {
    const { x0, y0, x1, y1, s, wt, ink, accent, every } = c;
    const out = [];
    const sw = Math.max(0.6, s * wt * 0.12);
    const span = x1 - x0;
    let i = 0;
    for (let k = -span; k <= y1 - y0 + span; k += s, i++) {
      const col = every > 0 && i % (every * 2) === 0 ? accent : ink;
      out.push({ k: "path", d: `M ${n(x0)} ${n(y0 + k)} L ${n(x1)} ${n(y0 + k - span)}`, stroke: col, sw, fill: "none" });
      out.push({ k: "path", d: `M ${n(x0)} ${n(y0 + k)} L ${n(x1)} ${n(y0 + k + span)}`, stroke: col, sw, fill: "none" });
    }
    return out;
  },

  dots: (c) => {
    const { x0, y0, x1, y1, s, wt, pick } = c;
    const out = [];
    const r = (s * wt) / 2;
    let j = 0;
    for (let y = snap(y0, s); y <= y1 + s; y += s, j++) {
      let i = 0;
      for (let x = snap(x0, s); x <= x1 + s; x += s, i++)
        out.push({ k: "circle", cx: x + s / 2, cy: y + s / 2, r, fill: pick(i + j) });
    }
    return out;
  },

  scarf: (c) => {
    const { x0, y0, x1, y1, s, ink, accent, bg } = c;
    const seq = [
      [0.3, ink], [0.05, bg], [0.05, accent], [0.05, bg],
      [0.16, ink], [0.05, bg], [0.05, accent], [0.05, bg], [0.24, ink],
    ];
    const out = [];
    for (let y = snap(y0, s); y <= y1 + s; y += s) {
      let acc = 0;
      for (const [frac, col] of seq) {
        out.push({ k: "rect", x: x0, y: y + acc * s, w: x1 - x0, h: frac * s + 0.5, fill: col });
        acc += frac;
      }
    }
    return out;
  },

  arcs: (c) => {
    const { x0, y0, x1, y1, s, wt, ink, accent, every, rng } = c;
    const out = [];
    const r = s / 2;
    const sw = Math.max(1, s * wt * 0.42);
    for (let y = snap(y0, s); y <= y1 + s; y += s)
      for (let x = snap(x0, s); x <= x1 + s; x += s) {
        const roll = rng();
        const col = every > 0 && roll > 0.86 ? accent : ink;
        if (roll < 0.5) {
          out.push({ k: "path", d: arcQ(x, y, r, 0), stroke: col, sw, fill: "none", cap: "butt" });
          out.push({ k: "path", d: arcQ(x + s, y + s, r, 180), stroke: col, sw, fill: "none", cap: "butt" });
        } else {
          out.push({ k: "path", d: arcQ(x + s, y, r, 90), stroke: col, sw, fill: "none", cap: "butt" });
          out.push({ k: "path", d: arcQ(x, y + s, r, 270), stroke: col, sw, fill: "none", cap: "butt" });
        }
      }
    return out;
  },
};

/* ------------------------------------------------------------------ */
/*  jersey-era helpers — batching keeps node counts low for Figma      */
/* ------------------------------------------------------------------ */

const par = (k, m) => ((k % m) + m) % m;
const hash2 = (i, j) => {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
};
const n1 = (v) => Math.round(v * 10) / 10;
const circleD = (cx, cy, r) =>
  `M${n1(cx - r)} ${n1(cy)}a${n1(r)} ${n1(r)} 0 1 0 ${n1(2 * r)} 0a${n1(r)} ${n1(r)} 0 1 0 ${n1(-2 * r)} 0`;

function batch() {
  const strokes = new Map();
  const fills = new Map();
  const add = (map, key, s) => {
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  };
  const pts2d = (pts) => "M" + pts.map((p) => `${n(p[0])} ${n(p[1])}`).join("L");
  return {
    line(x1, y1, x2, y2, col, sw) {
      add(strokes, `${col}|${n(sw)}`, `M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}`);
    },
    polyline(pts, col, sw) {
      add(strokes, `${col}|${n(sw)}`, pts2d(pts));
    },
    shape(pts, col, fo = 1) {
      add(fills, `${col}|${fo}`, pts2d(pts) + "Z");
    },
    dot(cx, cy, r, col, fo = 1) {
      if (r > 0.2) add(fills, `${col}|${fo}`, circleD(cx, cy, r));
    },
    flush(out) {
      for (const [k, parts] of fills) {
        const [col, fo] = k.split("|");
        out.push({ k: "path", d: parts.join(""), fill: col, ...(+fo < 1 ? { fo: +fo } : {}) });
      }
      for (const [k, parts] of strokes) {
        const [col, sw] = k.split("|");
        out.push({ k: "path", d: parts.join(""), fill: "none", stroke: col, sw: +sw });
      }
      return out;
    },
  };
}

Object.assign(GENS, {
  /* Folded iso ribbon — solid rising facet, halftone-fading falling facet */
  ribbon: (c) => {
    const { x0, y0, x1, y1, s, wt, ink, accent, every } = c;
    const B = batch();
    const rise = s * 0.5;
    const t = s * (0.3 + 0.5 * wt);
    const g = Math.max(2.5, s / 9);
    let row = 0;
    for (let y = snap(y0, s) - s; y <= y1 + s; y += s, row++) {
      const col = every > 0 && par(row, every) === 0 ? accent : ink;
      for (let X = snap(x0, s) - s; X <= x1 + s; X += s) {
        const up = par(Math.round(X / s), 2) === 0;
        const ys = up ? y : y - rise;
        const dy = up ? -rise : rise;
        if (up) {
          B.shape([[X, ys], [X + s, ys + dy], [X + s, ys + dy + t], [X, ys + t]], col);
        } else {
          const nu = Math.max(4, Math.round(s / g));
          const nv = Math.max(2, Math.round(t / g));
          for (let iu = 0; iu < nu; iu++) {
            const u = (iu + 0.5) / nu;
            const r = g * 0.62 * Math.pow(1 - u, 0.85);
            for (let iv = 0; iv < nv; iv++) {
              const v = (iv + 0.5) / nv;
              B.dot(X + u * s, ys + u * dy + v * t, r, col);
            }
          }
        }
      }
    }
    return B.flush([]);
  },

  /* Mirrored diagonal pinstripes meeting at a centre seam */
  seam: (c) => {
    const { x0, y0, x1, y1, s, wt, ink, accent, every } = c;
    const B = batch();
    const P = s * 4;
    const h = P / 2;
    const d = Math.max(2.5, s / 6);
    const sw = d * (0.18 + 0.6 * wt);
    let idx = 0;
    const Rl = batch();
    for (let px = snap(x0, P) - P; px <= x1 + P; px += P, idx++) {
      const m = px + h;
      for (let yk = snap(y0, d) - P; yk <= y1 + P; yk += d) {
        B.line(px, yk - h, m, yk, ink, sw);
        B.line(m, yk, px + P, yk - h, ink, sw);
      }
      if (every > 0 && par(idx, every) === 0) Rl.line(m, y0, m, y1, accent, Math.max(1, d * 0.9));
    }
    return Rl.flush(B.flush([]));
  },

  /* Tonal marks revealed only by line direction changing inside them */
  watermark: (c) => {
    const { x0, y0, x1, y1, s, wt, ink, accent, every } = c;
    const B = batch();
    const G = s * 4;
    const R = s * 1.35;
    const d = Math.max(2.5, s / 7);
    const sw = d * (0.18 + 0.6 * wt);
    const offOf = (j) => (par(j, 2) ? G / 2 : 0);
    for (let y = snap(y0, d); y <= y1; y += d) {
      const iv = [];
      const jc = Math.round(y / G);
      for (let j = jc - 1; j <= jc + 1; j++) {
        const dy = y - j * G;
        if (Math.abs(dy) >= R) continue;
        const half = Math.sqrt(R * R - dy * dy);
        const off = offOf(j);
        for (let i = Math.floor((x0 - off) / G) - 1; i <= Math.ceil((x1 - off) / G) + 1; i++) {
          const cx = i * G + off;
          iv.push([cx - half, cx + half]);
        }
      }
      iv.sort((a, b) => a[0] - b[0]);
      let cur = x0;
      for (const [a, b] of iv) {
        if (b < cur) continue;
        if (a > cur) B.line(cur, y, a, y, ink, sw);
        cur = Math.max(cur, b);
      }
      if (cur < x1) B.line(cur, y, x1, y, ink, sw);
    }
    for (let j = Math.floor(y0 / G) - 1; j <= Math.ceil(y1 / G) + 1; j++) {
      const off = offOf(j);
      const cy = j * G;
      for (let i = Math.floor((x0 - off) / G) - 1; i <= Math.ceil((x1 - off) / G) + 1; i++) {
        const cx = i * G + off;
        const col = every > 0 && hash2(i, j) % every === 0 ? accent : ink;
        for (let x = Math.ceil((cx - R) / d) * d; x <= cx + R; x += d) {
          const dx = x - cx;
          if (Math.abs(dx) >= R) continue;
          const half = Math.sqrt(R * R - dx * dx);
          B.line(x, cy - half, x, cy + half, col, sw);
        }
      }
    }
    return B.flush([]);
  },

  /* Checkerboard made only from alternating hatch direction */
  tonalcheck: (c) => {
    const { x0, y0, x1, y1, s, wt, ink, accent, every } = c;
    const B = batch();
    const d = Math.max(2.5, s / 8);
    const sw = d * (0.18 + 0.6 * wt);
    for (let j = Math.floor(y0 / s); j * s <= y1; j++)
      for (let i = Math.floor(x0 / s); i * s <= x1; i++) {
        const x = i * s;
        const y = j * s;
        const col = every > 0 && hash2(i, j) % (every * 3) === 0 ? accent : ink;
        if (par(i + j, 2) === 0) for (let yy = y + d / 2; yy < y + s; yy += d) B.line(x, yy, x + s, yy, col, sw);
        else for (let xx = x + d / 2; xx < x + s; xx += d) B.line(xx, y, xx, y + s, col, sw);
      }
    return B.flush([]);
  },

  /* Tumbling iso cubes — solid face, hatched face, open face */
  cubes: (c) => {
    const { x0, y0, x1, y1, s, wt, ink, accent, every } = c;
    const F = batch();
    const L = batch();
    const r = s / 2;
    const hw = Math.sqrt(3) * r;
    const vs = 1.5 * r;
    const hs = Math.max(2, s / 11);
    const sw = hs * (0.2 + 0.55 * wt);
    const V = (cx, cy, k) => {
      const a = ((-90 + 60 * k) * Math.PI) / 180;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    };
    for (let j = Math.floor(y0 / vs) - 1; j * vs <= y1 + vs; j++) {
      const y = j * vs;
      const off = par(j, 2) ? hw / 2 : 0;
      for (let i = Math.floor((x0 - off) / hw) - 1; i * hw + off <= x1 + hw; i++) {
        const x = i * hw + off;
        const C = [x, y];
        const v = [0, 1, 2, 3, 4, 5].map((k) => V(x, y, k));
        F.shape([C, v[3], v[4], v[5]], ink);
        if (every > 0 && hash2(i, j) % every === 0) F.shape([C, v[5], v[0], v[1]], accent);
        const a = [v[1][0] - x, v[1][1] - y];
        const b = [v[3][0] - x, v[3][1] - y];
        const cnt = Math.max(2, Math.floor(r / hs));
        for (let q = 1; q <= cnt; q++) {
          const t = q / (cnt + 1);
          L.line(x + t * a[0], y + t * a[1], x + t * a[0] + b[0], y + t * a[1] + b[1], ink, sw);
        }
      }
    }
    return L.flush(F.flush([]));
  },

  /* Sublimation-style bands that dissolve through a dot screen */
  halftone: (c) => {
    const { x0, y0, x1, y1, s, wt, pick } = c;
    const B = batch();
    const g = Math.max(4, s / 6);
    const nv = Math.max(3, Math.floor(s / g));
    let idx = 0;
    for (let y = snap(y0, s) - s; y <= y1 + s; y += s, idx++) {
      const col = pick(idx);
      for (let iv = 0; iv < nv; iv++) {
        const v = iv / (nv - 1);
        const r = g * 0.62 * (0.35 + wt) * (1 - v);
        if (r < 0.3) continue;
        const yy = y + (iv + 0.5) * (s / nv);
        const off = iv % 2 ? g / 2 : 0;
        for (let xx = snap(x0, g) - g + off; xx <= x1 + g; xx += g) B.dot(xx, yy, r, col);
      }
    }
    return B.flush([]);
  },

  /* 90s keeper-kit shattered triangles in tonal steps */
  shards: (c) => {
    const { x0, y0, x1, y1, s, wt, ink, accent, every, rng } = c;
    const B = batch();
    const i0 = Math.floor(x0 / s) - 1;
    const i1 = Math.ceil(x1 / s) + 1;
    const j0 = Math.floor(y0 / s) - 1;
    const j1 = Math.ceil(y1 / s) + 1;
    const J = s * 0.34;
    const P = [];
    for (let j = j0; j <= j1; j++) {
      const row = [];
      for (let i = i0; i <= i1; i++) row.push([i * s + (rng() - 0.5) * 2 * J, j * s + (rng() - 0.5) * 2 * J]);
      P.push(row);
    }
    const k = 0.5 + wt;
    const fill = (tri) => {
      const roll = rng();
      if (roll < 0.3) return;
      if (every > 0 && roll > 0.94) return B.shape(tri, accent);
      const fo = roll < 0.55 ? 0.14 : roll < 0.78 ? 0.32 : roll < 0.9 ? 0.6 : 1;
      B.shape(tri, ink, Math.min(1, n(fo * k)));
    };
    for (let j = 0; j < P.length - 1; j++)
      for (let i = 0; i < P[j].length - 1; i++) {
        const a = P[j][i], b = P[j][i + 1], cc = P[j + 1][i + 1], d = P[j + 1][i];
        if (rng() < 0.5) { fill([a, b, cc]); fill([a, cc, d]); }
        else { fill([a, b, d]); fill([b, cc, d]); }
      }
    return B.flush([]);
  },

  /* Drifting sine linework — moiré-ish 90s training-top energy */
  waves: (c) => {
    const { x0, y0, x1, y1, s, wt, pick } = c;
    const B = batch();
    const d = Math.max(3, s / 5);
    const A = s * 0.6;
    const L = s * 5;
    const step = L / 24;
    const sw = d * (0.2 + 0.65 * wt);
    for (let j = Math.floor((y0 - A) / d); j * d <= y1 + A; j++) {
      const ph = j * 0.14;
      const amp = A * (0.55 + 0.45 * Math.sin(j * 0.09));
      const pts = [];
      for (let x = x0; x <= x1 + step; x += step) pts.push([x, j * d + amp * Math.sin((2 * Math.PI * x) / L + ph)]);
      B.polyline(pts, pick(j), sw);
    }
    return B.flush([]);
  },

  /* Radial rays — hero backgrounds, cup-final programme covers */
  sunburst: (c) => {
    const { x0, y0, x1, y1, s, wt, pick } = c;
    const B = batch();
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const R = (x1 - x0) * 1.2;
    const N = Math.max(8, Math.min(72, Math.round(900 / s)));
    const p = (2 * Math.PI) / N;
    for (let k = 0; k < N; k++) {
      const a0 = k * p - Math.PI / 2;
      const a1 = a0 + p * (0.15 + 0.7 * wt);
      B.shape([[cx, cy], [cx + R * Math.cos(a0), cy + R * Math.sin(a0)], [cx + R * Math.cos(a1), cy + R * Math.sin(a1)]], pick(k));
    }
    return B.flush([]);
  },

  /* Irregular zigzag bolts with an offset print shadow */
  voltage: (c) => {
    const { x0, y0, x1, y1, s, wt, ink, accent, every, rng } = c;
    const Sh = batch();
    const Bo = batch();
    const sw = Math.max(1.5, s * (0.07 + 0.22 * wt));
    const off = s * 0.09 + sw * 0.35;
    const step = s * 0.55;
    const amp = s * 0.28;
    for (let y = snap(y0, s) - s; y <= y1 + s; y += s) {
      const pts = [];
      let up = true;
      for (let x = x0 - step; x <= x1 + step; x += step * (0.7 + rng() * 0.6)) {
        pts.push([x, y + (up ? -amp : amp) * (0.6 + rng() * 0.5)]);
        up = !up;
      }
      if (every > 0) Sh.polyline(pts.map(([px, py]) => [px + off, py + off]), accent, sw);
      Bo.polyline(pts, ink, sw);
    }
    return Bo.flush(Sh.flush([]));
  },
});

const PATTERNS = [
  { id: "ribbon", label: "Ribbon", base: 0, group: "jersey" },
  { id: "seam", label: "Seam", base: 0, group: "jersey" },
  { id: "watermark", label: "Watermark", base: 45, group: "jersey" },
  { id: "tonalcheck", label: "Tonal check", base: 0, group: "jersey" },
  { id: "cubes", label: "Iso blocks", base: 0, group: "jersey" },
  { id: "halftone", label: "Halftone fade", base: 0, group: "jersey" },
  { id: "shards", label: "Shards", base: 0, group: "jersey" },
  { id: "waves", label: "Wavelines", base: 0, group: "jersey" },
  { id: "sunburst", label: "Sunburst", base: 0, group: "jersey" },
  { id: "voltage", label: "Voltage", base: 0, group: "jersey" },
  { id: "hoops", label: "Hoops", base: 0, group: "classic" },
  { id: "stripes", label: "Stripes", base: 0, group: "classic" },
  { id: "stripes", label: "Sash", base: 45, key: "sash", group: "classic" },
  { id: "pinstripe", label: "Pinstripe", base: 0, group: "classic" },
  { id: "chevron", label: "Chevron", base: 0, group: "classic" },
  { id: "harlequin", label: "Harlequin", base: 0, group: "classic" },
  { id: "argyle", label: "Argyle", base: 0, group: "classic" },
  { id: "blocks", label: "Blocks", base: 0, group: "classic" },
  { id: "hex", label: "Hex panels", base: 0, group: "classic" },
  { id: "net", label: "Goal net", base: 0, group: "classic" },
  { id: "dots", label: "Dots", base: 0, group: "classic" },
  { id: "scarf", label: "Scarf", base: 0, group: "classic" },
  { id: "arcs", label: "Arcs", base: 0, group: "classic" },
];

/* ------------------------------------------------------------------ */
/*  build + render                                                     */
/* ------------------------------------------------------------------ */

/* Distressed print grain as two single vector paths (knock-out + ink specks) */
function grainEls(W, H, density, seed, bg, ink) {
  if (!density || density <= 0) return [];
  const rng = mulberry32(seed * 7 + 13);
  const count = Math.min(14000, Math.round((density * W * H) / 220));
  const knock = [];
  const specks = [];
  for (let i = 0; i < count; i++) {
    const x = rng() * W;
    const y = rng() * H;
    const r = 0.35 + rng() ** 2 * 1.6;
    (rng() < 0.72 ? knock : specks).push(circleD(x, y, r));
  }
  return [
    { k: "path", d: knock.join(""), fill: bg },
    { k: "path", d: specks.join(""), fill: ink, fo: 0.55 },
  ];
}

function build(pat, W, H, opts) {
  const { scale, weight, angle, bg, ink, accent, every, seed, grain = 0 } = opts;
  const rot = pat.base + angle;
  const cx = W / 2;
  const cy = H / 2;
  const R = rot % 180 === 0 ? Math.max(W, H) / 2 + scale : Math.hypot(W, H) / 2 + scale;
  const rng = mulberry32(seed);
  const pick = (i) => (every > 0 && ((i % every) + every) % every === 0 ? accent : ink);
  const ctx = {
    x0: cx - R, y0: cy - R, x1: cx + R, y1: cy + R,
    s: scale, wt: weight, ink, accent, bg, every, rng, pick,
  };
  return { els: GENS[pat.id](ctx), grain: grainEls(W, H, grain, seed, bg, ink), rot, cx, cy };
}

function elToProps(e, i) {
  const common = {
    key: i,
    fill: e.fill ?? "none",
    ...(e.fo !== undefined ? { fillOpacity: e.fo } : {}),
    ...(e.stroke ? { stroke: e.stroke, strokeWidth: e.sw } : {}),
    ...(e.dash ? { strokeDasharray: e.dash } : {}),
    ...(e.cap ? { strokeLinecap: e.cap } : {}),
  };
  if (e.k === "rect") return ["rect", { ...common, x: n(e.x), y: n(e.y), width: n(e.w), height: n(e.h) }];
  if (e.k === "circle") return ["circle", { ...common, cx: n(e.cx), cy: n(e.cy), r: n(e.r) }];
  if (e.k === "poly") return ["polygon", { ...common, points: e.points }];
  return ["path", { ...common, d: e.d }];
}

function elToString(e) {
  const a = [];
  const push = (k, v) => v !== undefined && v !== null && a.push(`${k}="${v}"`);
  push("fill", e.fill ?? "none");
  if (e.fo !== undefined) push("fill-opacity", e.fo);
  if (e.stroke) { push("stroke", e.stroke); push("stroke-width", n(e.sw)); }
  if (e.dash) push("stroke-dasharray", e.dash);
  if (e.cap) push("stroke-linecap", e.cap);
  if (e.k === "rect") return `<rect x="${n(e.x)}" y="${n(e.y)}" width="${n(e.w)}" height="${n(e.h)}" ${a.join(" ")}/>`;
  if (e.k === "circle") return `<circle cx="${n(e.cx)}" cy="${n(e.cy)}" r="${n(e.r)}" ${a.join(" ")}/>`;
  if (e.k === "poly") return `<polygon points="${e.points}" ${a.join(" ")}/>`;
  return `<path d="${e.d}" ${a.join(" ")}/>`;
}

function toSVG(pat, W, H, opts) {
  const { els, grain, rot, cx, cy } = build(pat, W, H, opts);
  const body = els.map(elToString).join("\n      ");
  const grit = grain.map(elToString).join("\n    ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><clipPath id="frame"><rect width="${W}" height="${H}"/></clipPath></defs>
  <rect width="${W}" height="${H}" fill="${opts.bg}"/>
  <g clip-path="url(#frame)">
    <g transform="rotate(${n(rot)} ${n(cx)} ${n(cy)})" stroke-linejoin="miter">
      ${body}
    </g>
    ${grit}
  </g>
</svg>`;
}

/* ------------------------------------------------------------------ */
/*  UI                                                                 */
/* ------------------------------------------------------------------ */

const SIZES = [
  { label: "512 × 512", w: 512, h: 512 },
  { label: "1200 × 800", w: 1200, h: 800 },
  { label: "1440 × 480", w: 1440, h: 480 },
  { label: "1920 × 1080", w: 1920, h: 1080 },
];

export default function PatternGenerator() {
  const [patIdx, setPatIdx] = useState(0);
  const [grain, setGrain] = useState(0.35);
  const [scale, setScale] = useState(48);
  const [weight, setWeight] = useState(0.5);
  const [angle, setAngle] = useState(0);
  const [every, setEvery] = useState(4);
  const [seed, setSeed] = useState(7);
  const [pal, setPal] = useState(0);
  const [bg, setBg] = useState(PALETTES[0].bg);
  const [ink, setInk] = useState(PALETTES[0].ink);
  const [accent, setAccent] = useState(PALETTES[0].accent);
  const [sizeIdx, setSizeIdx] = useState(1);
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const codeRef = useRef(null);

  const pat = PATTERNS[patIdx];
  const size = SIZES[sizeIdx];
  const opts = { scale, weight, angle, bg, ink, accent, every, seed, grain };

  const { els, grain: grainEl, rot, cx, cy } = useMemo(
    () => build(pat, size.w, size.h, opts),
    [patIdx, scale, weight, angle, every, seed, bg, ink, accent, sizeIdx, grain]
  );

  const svgText = useMemo(
    () => (showCode ? toSVG(pat, size.w, size.h, opts) : ""),
    [showCode, patIdx, scale, weight, angle, every, seed, bg, ink, accent, sizeIdx, grain]
  );

  const minis = useMemo(
    () => PATTERNS.map((p) => build(p, 60, 40, { scale: 14, weight: 0.5, angle: 0, bg, ink, accent, every: 3, seed: 4 })),
    [bg, ink, accent]
  );

  const applyPalette = (i) => {
    setPal(i);
    setBg(PALETTES[i].bg);
    setInk(PALETTES[i].ink);
    setAccent(PALETTES[i].accent);
  };

  const legacyCopy = (text) => {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      ta.setAttribute("readonly", "");
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const copySVG = async () => {
    const text = toSVG(pat, size.w, size.h, opts);
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) ok = legacyCopy(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } else {
      // clipboard blocked by the sandbox — surface the code so it can be copied by hand
      setShowCode(true);
      setTimeout(() => codeRef.current?.select(), 60);
    }
  };

  const downloadSVG = () => {
    const text = toSVG(pat, size.w, size.h, opts);
    const name = `${pat.key || pat.id}-${scale}-${size.w}x${size.h}.svg`;
    try {
      const blob = new Blob([text], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch {
      try {
        const w = window.open("", "_blank");
        if (w) {
          w.document.write(text);
          w.document.close();
          return;
        }
        throw new Error("popup blocked");
      } catch {
        setShowCode(true);
        setTimeout(() => codeRef.current?.select(), 60);
      }
    }
  };

  const shuffle = () => {
    setPatIdx(Math.floor(Math.random() * PATTERNS.length));
    setScale(24 + Math.floor(Math.random() * 90));
    setWeight(0.2 + Math.random() * 0.6);
    setAngle([0, 0, 0, 15, 30, 45, -30][Math.floor(Math.random() * 7)]);
    setEvery([0, 2, 3, 4, 5][Math.floor(Math.random() * 5)]);
    setSeed(Math.floor(Math.random() * 9999));
    setGrain([0, 0.2, 0.35, 0.6][Math.floor(Math.random() * 4)]);
    applyPalette(Math.floor(Math.random() * PALETTES.length));
  };

  const reset = () => {
    setScale(48); setWeight(0.5); setAngle(0); setEvery(4); setSeed(7); setGrain(0.35); applyPalette(0);
  };

  const label = "text-[10px] uppercase tracking-[0.18em] opacity-55";
  const S = { fontFamily: "'Space Mono', 'Courier New', monospace" };
  const D = { fontFamily: "'Archivo', 'Helvetica Neue', sans-serif" };

  return (
    <div className="w-full min-h-screen" style={{ background: "#141310", color: "#EDE6D6", ...S }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800&family=Space+Mono:wght@400;700&display=swap');
        input[type=range]{-webkit-appearance:none;appearance:none;height:2px;background:#4a4640;outline:none}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;background:#EDE6D6;border-radius:0;cursor:pointer}
        input[type=range]::-moz-range-thumb{width:13px;height:13px;background:#EDE6D6;border:0;border-radius:0;cursor:pointer}
        input[type=color]{-webkit-appearance:none;appearance:none;border:none;padding:0;background:none;cursor:pointer}
        input[type=color]::-webkit-color-swatch-wrapper{padding:0}
        input[type=color]::-webkit-color-swatch{border:1px solid rgba(237,230,214,.35)}
      `}</style>

      {/* header */}
      <header className="border-b px-6 py-4 flex flex-wrap items-baseline gap-x-6 gap-y-2" style={{ borderColor: "#2e2b26" }}>
        <h1 className="text-[19px] font-extrabold uppercase tracking-[0.02em]" style={D}>
          Terrace<span style={{ color: "#D94F35" }}>/</span>Patterns
        </h1>
        <p className={label}>Geometric football pattern generator — SVG out, Figma ready</p>
        <div className="ml-auto flex gap-2">
          <button onClick={shuffle} className="flex items-center gap-2 px-3 py-2 text-[11px] uppercase tracking-[0.14em] border hover:bg-white/5" style={{ borderColor: "#413d36" }}>
            <Shuffle size={12} /> Shuffle
          </button>
          <button onClick={reset} className="flex items-center gap-2 px-3 py-2 text-[11px] uppercase tracking-[0.14em] border hover:bg-white/5" style={{ borderColor: "#413d36" }}>
            <RotateCcw size={12} /> Reset
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        {/* preview */}
        <main className="flex-1 p-6 lg:p-10 flex flex-col gap-4 min-w-0">
          <div className="border" style={{ borderColor: "#2e2b26" }}>
            <svg
              viewBox={`0 0 ${size.w} ${size.h}`}
              className="w-full h-auto block"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <clipPath id="live-frame">
                  <rect width={size.w} height={size.h} />
                </clipPath>
              </defs>
              <rect width={size.w} height={size.h} fill={bg} />
              <g clipPath="url(#live-frame)">
                <g transform={`rotate(${n(rot)} ${n(cx)} ${n(cy)})`} strokeLinejoin="miter">
                  {els.map((e, i) => {
                    const [Tag, props] = elToProps(e, i);
                    return <Tag {...props} />;
                  })}
                </g>
                {grainEl.map((e, i) => {
                  const [Tag, props] = elToProps(e, `g${i}`);
                  return <Tag {...props} />;
                })}
              </g>
            </svg>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span className={label}>
              {pat.label} · {size.w}×{size.h} · {els.length} shapes
            </span>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => {
                  setShowCode((v) => !v);
                  if (!showCode) setTimeout(() => codeRef.current?.select(), 60);
                }}
                className="flex items-center gap-2 px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] border hover:bg-white/5"
                style={{ borderColor: showCode ? "#D94F35" : "#413d36" }}
              >
                <Code size={13} /> {showCode ? "Hide code" : "Show code"}
              </button>
              <button onClick={copySVG} className="flex items-center gap-2 px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] border hover:bg-white/5" style={{ borderColor: "#413d36" }}>
                {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy SVG"}
              </button>
              <button onClick={downloadSVG} className="flex items-center gap-2 px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] font-bold" style={{ background: "#D94F35", color: "#141310" }}>
                <Download size={13} /> Download
              </button>
            </div>
          </div>

          {showCode && (
            <div className="flex flex-col gap-2">
              <span className={label}>
                SVG source — click the box, then ⌘A / ⌘C, and paste into Figma
              </span>
              <textarea
                ref={codeRef}
                readOnly
                onClick={(e) => e.currentTarget.select()}
                value={svgText}
                spellCheck={false}
                className="w-full h-56 p-3 text-[10px] leading-relaxed border resize-y"
                style={{ background: "#0d0c0a", borderColor: "#2e2b26", color: "#9d9688", ...S }}
              />
            </div>
          )}

          <p className="text-[10px] leading-relaxed opacity-45 max-w-xl">
            Paste the SVG straight into Figma (⌘V) and it lands as editable vectors inside a clipped frame.
            Geometry is expanded, not a &lt;pattern&gt; fill, so nothing gets dropped on import. If the buttons
            above are blocked by the preview sandbox, use Show code and copy by hand — or open the artifact in
            its own browser tab, where clipboard and downloads both work. Grain is exported as two vector
            speck paths (not an SVG filter), so it survives the Figma import — set it to off for crisp UI tiles.
          </p>
        </main>

        {/* controls */}
        <aside className="w-full lg:w-[330px] shrink-0 border-l p-6 flex flex-col gap-7" style={{ borderColor: "#2e2b26" }}>
          {/* patterns */}
          <section className="flex flex-col gap-3">
            {[
              ["jersey", "Jersey era — new"],
              ["classic", "Classics"],
            ].map(([grp, title]) => (
              <div key={grp} className="flex flex-col gap-2">
                <span className={label}>{title}</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {PATTERNS.map((p, i) => {
                    if (p.group !== grp) return null;
                    const mini = minis[i];
                    return (
                      <button
                        key={p.key || p.id}
                        onClick={() => setPatIdx(i)}
                        className="border p-1.5 flex items-center gap-2 hover:bg-white/5 text-left"
                        style={{ borderColor: i === patIdx ? "#D94F35" : "#332f29" }}
                      >
                        <svg viewBox="0 0 60 40" width="30" height="20" className="shrink-0">
                          <rect width="60" height="40" fill={bg} />
                          <g transform={`rotate(${n(mini.rot)} 30 20)`}>
                            {mini.els.slice(0, 240).map((e, k) => {
                              const [Tag, props] = elToProps(e, k);
                              return <Tag {...props} />;
                            })}
                          </g>
                        </svg>
                        <span className="text-[9px] uppercase tracking-[0.1em] truncate">{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>

          {/* sliders */}
          <section className="flex flex-col gap-5">
            <Slider label="Scale" value={scale} min={14} max={180} step={1} onChange={setScale} suffix="px" />
            <Slider label="Weight" value={weight} min={0.08} max={0.95} step={0.01} onChange={setWeight} fmt={(v) => `${Math.round(v * 100)}%`} />
            <div className="flex flex-col gap-2">
              <Slider label="Angle" value={angle} min={-90} max={90} step={1} onChange={setAngle} suffix="°" />
              <div className="flex gap-1">
                {[0, 15, 30, 45, 90].map((a) => (
                  <button key={a} onClick={() => setAngle(a)} className="flex-1 py-1 text-[9px] border hover:bg-white/5" style={{ borderColor: angle === a ? "#D94F35" : "#332f29" }}>
                    {a}°
                  </button>
                ))}
              </div>
            </div>
            <Slider label="Accent every" value={every} min={0} max={8} step={1} onChange={setEvery} fmt={(v) => (v === 0 ? "off" : `${v}`)} />
            <Slider label="Grain" value={grain} min={0} max={1} step={0.01} onChange={setGrain} fmt={(v) => (v === 0 ? "off" : `${Math.round(v * 100)}%`)} />
            <Slider label="Seed" value={seed} min={1} max={999} step={1} onChange={setSeed} fmt={(v) => `${v}`} />
          </section>

          {/* colour */}
          <section className="flex flex-col gap-3">
            <span className={label}>Palette</span>
            <div className="flex flex-col gap-1">
              {PALETTES.map((p, i) => (
                <button key={p.name} onClick={() => applyPalette(i)} className="flex items-center gap-2 px-2 py-1.5 border hover:bg-white/5" style={{ borderColor: pal === i ? "#D94F35" : "#332f29" }}>
                  <span className="flex">
                    {[p.bg, p.ink, p.accent].map((c) => (
                      <span key={c} className="w-4 h-4 border" style={{ background: c, borderColor: "#141310" }} />
                    ))}
                  </span>
                  <span className="text-[9px] uppercase tracking-[0.12em]">{p.name}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <Swatch label="Ground" value={bg} onChange={(v) => { setBg(v); setPal(-1); }} />
              <Swatch label="Ink" value={ink} onChange={(v) => { setInk(v); setPal(-1); }} />
              <Swatch label="Accent" value={accent} onChange={(v) => { setAccent(v); setPal(-1); }} />
            </div>
          </section>

          {/* export size */}
          <section className="flex flex-col gap-2">
            <span className={label}>Export size</span>
            <div className="grid grid-cols-2 gap-1.5">
              {SIZES.map((s, i) => (
                <button key={s.label} onClick={() => setSizeIdx(i)} className="py-2 text-[9px] uppercase tracking-[0.1em] border hover:bg-white/5" style={{ borderColor: sizeIdx === i ? "#D94F35" : "#332f29" }}>
                  {s.label}
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange, suffix = "", fmt }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] uppercase tracking-[0.18em] opacity-55">{label}</span>
        <span className="text-[10px] opacity-80">{fmt ? fmt(value) : `${value}${suffix}`}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full" />
    </div>
  );
}

function Swatch({ label, value, onChange }) {
  return (
    <label className="flex flex-col gap-1.5 cursor-pointer">
      <span className="text-[9px] uppercase tracking-[0.12em] opacity-55">{label}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-7" />
    </label>
  );
}
