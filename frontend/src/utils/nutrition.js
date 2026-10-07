const r1 = (n) => Math.round(n * 10) / 10;

/** Scale a result by a portion factor (0.25x - 3x). */
export function scaleResult(result, factor) {
  const n = result.nutrition;
  return {
    ...result,
    portion_estimation: {
      ...result.portion_estimation,
      estimated_weight_grams: Math.round(result.portion_estimation.estimated_weight_grams * factor),
    },
    nutrition: {
      calories: Math.round(n.calories * factor),
      carbs: r1(n.carbs * factor),
      protein: r1(n.protein * factor),
      fat: r1(n.fat * factor),
      fiber: r1(n.fiber * factor),
    },
    items: (result.items || []).map((i) => ({
      ...i,
      grams: Math.round(i.grams * factor),
      calories: Math.round(i.calories * factor),
    })),
  };
}

/** Percentage of calories that come from each macro (Atwater factors). */
export function macroSplit({ carbs, protein, fat }) {
  const c = carbs * 4;
  const p = protein * 4;
  const f = fat * 9;
  const total = c + p + f || 1;
  return {
    carbs: Math.round((c / total) * 100),
    protein: Math.round((p / total) * 100),
    fat: Math.round((f / total) * 100),
  };
}

export function isToday(ts) {
  return new Date(ts).toDateString() === new Date().toDateString();
}

/** Small JPEG data-URL thumbnail so history stays light in localStorage. */
export function makeThumb(file, size = 96) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = size / Math.min(img.width, img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      canvas.getContext("2d").drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.6));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("thumb failed"));
    };
    img.src = url;
  });
}

export function downloadCsv(entries) {
  const head = ["Date", "Dish", "Weight (g)", "Calories", "Carbs (g)", "Protein (g)", "Fat (g)", "Fiber (g)"];
  const rows = entries.map((e) => [
    new Date(e.ts).toISOString(),
    `"${e.label.replace(/"/g, '""')}"`,
    e.weight,
    e.nutrition.calories,
    e.nutrition.carbs,
    e.nutrition.protein,
    e.nutrition.fat,
    e.nutrition.fiber,
  ]);
  const csv = [head, ...rows].map((r) => r.join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "nutrilens-log.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}
