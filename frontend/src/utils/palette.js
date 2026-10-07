export const BRAND_PALETTE = ["#f4e285", "#f4a259", "#5b8e7d", "#bc4b51", "#8cb369"];

const toHex = (r, g, b) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

export function textOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? "#1d1d1f" : "#ffffff";
}

/** Pull the dominant colours out of a photo (client-side, no network). */
export function extractPalette(src, count = 5) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = 72;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, size, size);
      const { data } = ctx.getImageData(0, 0, size, size);
      const buckets = new Map();
      for (let i = 0; i < data.length; i += 4) {
        const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
        if (data[i + 3] < 200) continue;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        if (max < 28 || min > 240) continue; // skip near-black / near-white
        const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
        const bk = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0, sat: 0 };
        bk.r += r; bk.g += g; bk.b += b; bk.n += 1; bk.sat += max - min;
        buckets.set(key, bk);
      }
      const ranked = [...buckets.values()]
        .map((b) => ({ r: b.r / b.n, g: b.g / b.n, b: b.b / b.n, score: b.n * (1 + b.sat / b.n / 128) }))
        .sort((a, b) => b.score - a.score);
      const picked = [];
      for (const c of ranked) {
        if (picked.every((p) => Math.hypot(p.r - c.r, p.g - c.g, p.b - c.b) > 55)) picked.push(c);
        if (picked.length === count) break;
      }
      const hexes = picked
        .sort((a, b) => b.r * 0.299 + b.g * 0.587 + b.b * 0.114 - (a.r * 0.299 + a.g * 0.587 + a.b * 0.114))
        .map((c) => toHex(c.r, c.g, c.b));
      while (hexes.length < count) hexes.push(BRAND_PALETTE[hexes.length % BRAND_PALETTE.length]);
      resolve(hexes);
    };
    img.onerror = () => resolve(BRAND_PALETTE);
    img.src = src;
  });
}
