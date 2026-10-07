import { useEffect } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(onClose, toast.type === "error" ? 8000 : 3500);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  const isError = toast.type === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div role={isError ? "alert" : "status"} className="glass rise fixed bottom-6 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-start gap-3 rounded-2xl border border-line/80 px-4 py-3.5 shadow-2xl shadow-black/10">
      <Icon size={20} className="mt-0.5 shrink-0" style={{ color: isError ? "#bc4b51" : "#5b8e7d" }} />
      <p className="flex-1 text-[15px]">{toast.message}</p>
      <button onClick={onClose} aria-label="Dismiss" className="text-mute hover:text-ink"><X size={16} /></button>
    </div>
  );
}
