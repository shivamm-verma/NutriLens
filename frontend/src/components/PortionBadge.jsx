import { Eye, Scale } from "lucide-react";

export default function PortionBadge({ portion }) {
  return (
    <section className="card bg-carbs/20 p-7">
      <div className="flex items-center gap-2 text-sm font-medium text-mute"><Scale size={16} /> Estimated portion</div>
      <p className="mt-2 text-6xl font-semibold tracking-tighter2">
        {portion.estimated_weight_grams}<span className="ml-1 text-2xl tracking-normal text-mute">g</span>
      </p>
      <p className="mt-1 text-[17px] font-medium">{portion.portion_size}</p>
      {portion.visual_reasoning && (
        <p className="mt-4 flex gap-2 border-t border-ink/10 pt-4 text-[15px] leading-relaxed text-ink/75">
          <Eye size={16} className="mt-1 shrink-0" /> <span>{portion.visual_reasoning}</span>
        </p>
      )}
    </section>
  );
}
