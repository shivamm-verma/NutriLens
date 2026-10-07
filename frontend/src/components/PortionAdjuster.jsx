import { SlidersHorizontal } from "lucide-react";

const QUICK = [0.5, 1, 1.5, 2];

export default function PortionAdjuster({ factor, onChange }) {
  return (
    <section className="card p-7">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><SlidersHorizontal size={18} /> Adjust portion</h3>
        <span className="text-lg font-semibold">{factor}x</span>
      </div>
      <input type="range" min="0.25" max="3" step="0.25" value={factor} onChange={(e) => onChange(Number(e.target.value))} aria-label="Portion multiplier" className="w-full" />
      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button key={q} onClick={() => onChange(q)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${factor === q ? "bg-ink text-white" : "bg-fog hover:bg-line/60"}`}>
            {q}x
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm text-mute">Ate more or less than shown? Every number updates instantly.</p>
    </section>
  );
}
