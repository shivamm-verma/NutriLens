import { useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_MB = 10;

export default function ImageUploader({ previewUrl, onSelect, onClear, onError, disabled }) {
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) return onError("Unsupported file. Choose a JPG, PNG, WEBP or GIF image.");
    if (file.size > MAX_MB * 1024 * 1024) return onError(`That image is over ${MAX_MB} MB. Choose a smaller one.`);
    onSelect(file);
  };

  const reset = (e) => {
    e.stopPropagation();
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
    onClear();
  };

  return (
    <div>
      <input ref={fileRef} type="file" accept={ACCEPTED.join(",")} className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />

      {previewUrl ? (
        <div className="card relative overflow-hidden p-2">
          <img src={previewUrl} alt="Your meal" className="max-h-[460px] w-full rounded-[22px] object-cover" />
          {!disabled && (
            <button onClick={reset} aria-label="Remove photo" className="glass absolute right-5 top-5 rounded-full p-2 text-ink hover:bg-white">
              <X size={18} />
            </button>
          )}
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => !disabled && fileRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !disabled && fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) handleFile(e.dataTransfer.files?.[0]); }}
          className={`card flex min-h-[280px] cursor-pointer flex-col items-center justify-center gap-3 px-6 text-center transition ${
            dragging ? "scale-[1.01] border-ink bg-fog" : "hover:bg-fog/60"
          }`}
        >
          <span className="rounded-full bg-fog p-4"><ImagePlus size={30} strokeWidth={1.6} /></span>
          <p className="text-2xl font-semibold tracking-tight">Drop a photo of your meal</p>
          <p className="text-[15px] text-mute">or click to choose one. JPG, PNG or WEBP, up to {MAX_MB} MB.</p>
          <button type="button" onClick={(e) => { e.stopPropagation(); cameraRef.current?.click(); }} className="btn-soft mt-1">
            <Camera size={16} /> Take a photo
          </button>
        </div>
      )}
    </div>
  );
}
