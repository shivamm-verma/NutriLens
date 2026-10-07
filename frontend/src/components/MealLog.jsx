import { Download, Target, Trash2 } from "lucide-react";
import { downloadCsv, isToday } from "../utils/nutrition";

export default function MealLog({ entries, goal, onGoalChange, onDelete, onClear }) {
  const today = entries.filter((e) => isToday(e.ts));
  const sum = (k) => Math.round(today.reduce((s, e) => s + e.nutrition[k], 0) * 10) / 10;
  const kcal = sum("calories");
  const pct = Math.min(100, Math.round((kcal / goal) * 100));
  const over = kcal > goal;

  return (
    <section className="card p-7 sm:p-9">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl font-semibold tracking-tighter2">Today's log</h2>
        {entries.length > 0 && (
          <div className="flex gap-2">
            <button onClick={() => downloadCsv(entries)} className="btn-soft"><Download size={15} /> Export CSV</button>
            <button onClick={() => window.confirm("Delete all logged meals?") && onClear()} className="btn-soft"><Trash2 size={15} /> Clear</button>
          </div>
        )}
      </div>

      <div className="mt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="text-5xl font-semibold tracking-tighter2" style={{ color: over ? "#bc4b51" : undefined }}>
            {kcal}<span className="ml-1 text-xl font-medium tracking-normal text-mute">of {goal} kcal</span>
          </p>
          <label className="flex items-center gap-2 text-sm text-mute">
            <Target size={15} /> Daily goal
            <input type="number" min="500" max="10000" step="50" value={goal} onChange={(e) => onGoalChange(Math.max(500, Number(e.target.value) || 2000))}
              className="w-24 rounded-full bg-fog px-3 py-1.5 text-right text-ink" />
          </label>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-fog">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: over ? "#bc4b51" : "#8cb369" }} />
        </div>
        <p className="mt-3 text-sm text-mute">Carbs {sum("carbs")} g, protein {sum("protein")} g, fat {sum("fat")} g, fiber {sum("fiber")} g</p>
      </div>

      {entries.length === 0 ? (
        <p className="mt-6 text-[15px] text-mute">Nothing logged yet. Analyse a meal, then choose "Add to log".</p>
      ) : (
        <ul className="mt-6 divide-y divide-line/70">
          {entries.slice(0, 20).map((e) => (
            <li key={e.id} className="flex items-center gap-4 py-3">
              {e.thumb ? <img src={e.thumb} alt="" className="h-14 w-14 rounded-2xl object-cover" /> : <div className="h-14 w-14 rounded-2xl bg-fog" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-medium">{e.label}</p>
                <p className="text-sm text-mute">{e.weight} g, {new Date(e.ts).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p>
              </div>
              <p className="text-[17px] font-semibold">{e.nutrition.calories} kcal</p>
              <button onClick={() => onDelete(e.id)} aria-label={`Delete ${e.label}`} className="rounded-full p-2 text-mute hover:bg-fog hover:text-fat"><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
