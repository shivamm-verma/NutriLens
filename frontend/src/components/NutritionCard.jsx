import { HeartPulse } from "lucide-react";
import { macroSplit } from "../utils/nutrition";

const MACROS = [
  { key: "carbs", label: "Carbs", bg: "bg-carbs/25", dot: "#f4a259" },
  { key: "protein", label: "Protein", bg: "bg-protein/25", dot: "#5b8e7d" },
  { key: "fat", label: "Fat", bg: "bg-fat/20", dot: "#bc4b51" },
  { key: "fiber", label: "Fiber", bg: "bg-fiber/30", dot: "#8cb369" },
];

export default function NutritionCard({ nutrition, healthScore, healthNotes }) {
  const split = macroSplit(nutrition);

  return (
    <section className="space-y-4">
      <div className="card bg-sun/60 p-7 sm:p-9">
        <p className="text-sm font-medium text-ink/60">Total for this portion</p>
        <p className="mt-1 flex items-end gap-2 text-[88px] font-semibold leading-none tracking-tighter2 sm:text-[112px]">
          {nutrition.calories}<span className="pb-3 text-2xl font-medium tracking-normal text-ink/60">kcal</span>
        </p>
        <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-white/60" aria-hidden="true">
          <div style={{ width: `${split.carbs}%`, background: "#f4a259" }} />
          <div style={{ width: `${split.protein}%`, background: "#5b8e7d" }} />
          <div style={{ width: `${split.fat}%`, background: "#bc4b51" }} />
        </div>
        <p className="mt-2 text-sm text-ink/65">
          Calories from carbs {split.carbs}%, protein {split.protein}%, fat {split.fat}%
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {MACROS.map(({ key, label, bg, dot }) => (
          <div key={key} className={`card ${bg} p-5`}>
            <p className="flex items-center gap-2 text-sm font-medium text-ink/70">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: dot }} /> {label}
            </p>
            <p className="mt-3 text-4xl font-semibold tracking-tighter2">
              {nutrition[key]}<span className="ml-0.5 text-lg tracking-normal text-ink/55">g</span>
            </p>
          </div>
        ))}
      </div>

      {(healthScore || healthNotes) && (
        <div className="card flex gap-4 p-6">
          <HeartPulse size={24} className="mt-0.5 shrink-0" strokeWidth={1.7} />
          <div>
            {healthScore && <p className="text-[17px] font-semibold">Balance score {healthScore} out of 10</p>}
            {healthScore && (
              <div className="mt-2 flex gap-1" aria-hidden="true">
                {Array.from({ length: 10 }, (_, i) => (
                  <span key={i} className="h-1.5 w-6 rounded-full" style={{ background: i < healthScore ? "#5b8e7d" : "#f5f5f7" }} />
                ))}
              </div>
            )}
            {healthNotes && <p className="mt-3 text-[15px] leading-relaxed text-mute">{healthNotes}</p>}
          </div>
        </div>
      )}
    </section>
  );
}
