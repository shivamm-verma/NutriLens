export default function DishHeader({ result }) {
  const c = result.confidence;
  const R = 26, C = 2 * Math.PI * R;
  const stroke = c >= 80 ? "#5b8e7d" : c >= 55 ? "#f4a259" : "#bc4b51";

  return (
    <section className="card p-7 sm:p-9">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-4xl font-semibold leading-[1.05] tracking-tighter2 sm:text-5xl">{result.label}</h2>
          {result.cuisine && <p className="mt-2 text-[17px] text-mute">{result.cuisine} cuisine</p>}
        </div>
        <div className="relative shrink-0" role="img" aria-label={`Confidence ${c} percent`}>
          <svg width="68" height="68" viewBox="0 0 68 68" className="-rotate-90">
            <circle cx="34" cy="34" r={R} fill="none" stroke="#f5f5f7" strokeWidth="7" />
            <circle cx="34" cy="34" r={R} fill="none" stroke={stroke} strokeWidth="7" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - c / 100)} style={{ transition: "stroke-dashoffset .9s ease" }} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold">{c}%</span>
        </div>
      </div>
      {result.description && <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-mute">{result.description}</p>}
      {result.tags.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {result.tags.map((t) => <span key={t} className="rounded-full bg-fog px-3.5 py-1.5 text-sm">{t}</span>)}
        </div>
      )}
      {result.alternatives.length > 0 && c < 90 && (
        <p className="mt-4 text-sm text-mute">Could also be {result.alternatives.join(", ")}.</p>
      )}
    </section>
  );
}
