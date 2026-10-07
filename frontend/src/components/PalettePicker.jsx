import { useState } from "react";
import { Check } from "lucide-react";
import { textOn } from "../utils/palette";

export default function PalettePicker({ colors, fromPhoto, onCopied }) {
  const [copied, setCopied] = useState(null);

  const copy = async (hex) => {
    try {
      await navigator.clipboard.writeText(hex.toUpperCase());
      setCopied(hex);
      onCopied?.(hex.toUpperCase());
      setTimeout(() => setCopied(null), 1400);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <section aria-label="Colour palette" className="w-full">
      <div className="flex h-28 w-full overflow-hidden sm:h-44">
        {colors.map((hex, i) => {
          const fg = textOn(hex);
          return (
            <button
              key={i}
              onClick={() => copy(hex)}
              style={{ backgroundColor: hex, color: fg, transitionDelay: `${i * 70}ms` }}
              className="group relative flex flex-[1_1_0%] items-end justify-center pb-4 transition-[flex-grow,background-color] duration-700 hover:flex-[2.2_1_0%] focus-visible:flex-[2.2_1_0%]"
              aria-label={`Copy ${hex}`}
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {copied === hex ? <Check size={15} /> : null}
                {copied === hex ? "Copied" : hex.slice(1)}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mx-auto mt-3 max-w-5xl px-5 text-xs text-mute">
        {fromPhoto ? "Colours pulled from your photo. Click a band to copy its hex code." : "NutriLens palette. Add a photo and these become the colours of your meal."}
      </p>
    </section>
  );
}
