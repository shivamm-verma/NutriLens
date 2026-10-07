import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Sparkles, WifiOff } from "lucide-react";
import { analyzeFood, checkHealth } from "./api";
import useLocalStorage from "./hooks/useLocalStorage";
import { makeThumb, scaleResult } from "./utils/nutrition";
import { BRAND_PALETTE, extractPalette } from "./utils/palette";
import ImageUploader from "./components/ImageUploader";
import PalettePicker from "./components/PalettePicker";
import DishHeader from "./components/DishHeader";
import PortionBadge from "./components/PortionBadge";
import PortionAdjuster from "./components/PortionAdjuster";
import NutritionCard from "./components/NutritionCard";
import ItemsTable from "./components/ItemsTable";
import MealLog from "./components/MealLog";
import Toast from "./components/Toast";

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="11" fill="none" stroke="#1d1d1f" strokeWidth="3.5" />
      <circle cx="16" cy="16" r="4" fill="#f4a259" />
    </svg>
  );
}

export default function App() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [palette, setPalette] = useState(BRAND_PALETTE);
  const [fromPhoto, setFromPhoto] = useState(false);
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [factor, setFactor] = useState(1);
  const [logged, setLogged] = useState(false);
  const [toast, setToast] = useState(null);
  const [health, setHealth] = useState({ checked: false, data: null });
  const [log, setLog] = useLocalStorage("nutrilens.log", []);
  const [goal, setGoal] = useLocalStorage("nutrilens.goal", 2000);
  const resultsRef = useRef(null);

  const closeToast = useCallback(() => setToast(null), []);
  const showError = useCallback((message) => setToast({ type: "error", message }), []);

  useEffect(() => {
    checkHealth().then((data) => setHealth({ checked: true, data }));
  }, []);

  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);

  useEffect(() => {
    if (result && resultsRef.current) resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  const scaled = useMemo(() => (result ? scaleResult(result, factor) : null), [result, factor]);

  const handleSelect = (f) => {
    const url = URL.createObjectURL(f);
    setFile(f);
    setPreviewUrl(url);
    setResult(null);
    setFactor(1);
    setLogged(false);
    extractPalette(url).then((p) => {
      setPalette(p);
      setFromPhoto(true);
    });
  };

  const handleClear = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setHint("");
    setPalette(BRAND_PALETTE);
    setFromPhoto(false);
  };

  const handleAnalyze = async () => {
    if (!file || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await analyzeFood(file, hint);
      setResult(data);
      setFactor(1);
      setLogged(false);
      checkHealth().then((d) => d && setHealth({ checked: true, data: d }));
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLog = async () => {
    if (!scaled || logged) return;
    const thumb = await makeThumb(file).catch(() => null);
    setLog((prev) =>
      [{ id: `${Date.now()}`, ts: Date.now(), label: scaled.label, weight: scaled.portion_estimation.estimated_weight_grams, nutrition: scaled.nutrition, thumb }, ...prev].slice(0, 200)
    );
    setLogged(true);
    setToast({ type: "success", message: `${scaled.label} added to today's log.` });
  };

  const backendDown = health.checked && !health.data;
  const keyMissing = health.data && !health.data.api_key_configured;

  return (
    <div className="min-h-screen">
      <nav className="glass sticky top-0 z-40 border-b border-line/60">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="text-[17px] font-semibold tracking-tight">NutriLens</span>
          </div>
          {health.data && (
            <span className="flex items-center gap-2 text-xs text-mute">
              <span className="h-2 w-2 rounded-full" style={{ background: keyMissing ? "#f4a259" : "#8cb369" }} />
              {health.data.model}
            </span>
          )}
        </div>
      </nav>

      {(backendDown || keyMissing) && (
        <div className="bg-sun/60">
          <p className="mx-auto flex max-w-5xl items-center gap-2 px-5 py-3 text-sm">
            <WifiOff size={16} className="shrink-0" />
            {backendDown
              ? "The backend isn't reachable. Start it with: cd backend && python -m uvicorn app.main:app --reload --port 8000"
              : "The backend is running but GEMINI_API_KEY is missing. Add it to backend/.env and restart the backend."}
          </p>
        </div>
      )}

      <header className="mx-auto max-w-4xl px-5 pb-10 pt-16 text-center sm:pt-24">
        <h1 className="text-5xl font-semibold leading-[1.02] tracking-tighter2 sm:text-7xl">Know what's on your plate.</h1>
        <p className="mx-auto mt-5 max-w-xl text-xl leading-snug text-mute sm:text-2xl">
          Snap any meal. NutriLens names the dish, weighs the portion and counts the calories.
        </p>
      </header>

      <section className="mx-auto max-w-2xl space-y-4 px-5 pb-14">
        <ImageUploader previewUrl={previewUrl} onSelect={handleSelect} onClear={handleClear} onError={showError} disabled={loading} />
        <div>
          <label htmlFor="hint" className="mb-2 block px-1 text-sm text-mute">Anything we should know? Optional</label>
          <input id="hint" value={hint} onChange={(e) => setHint(e.target.value)} maxLength={300} disabled={loading}
            placeholder="homemade, made with ghee, 2 rotis"
            className="w-full rounded-2xl border border-line/80 bg-white px-5 py-3.5 text-[17px] placeholder:text-mute/60" />
        </div>
        <div className="flex justify-center pt-2">
          <button onClick={handleAnalyze} disabled={!file || loading} className="btn-dark min-w-[220px]">
            {loading ? <><Loader2 size={20} className="animate-spin" /> Analysing</> : <><Sparkles size={19} /> Analyse meal</>}
          </button>
        </div>
      </section>

      <PalettePicker colors={palette} fromPhoto={fromPhoto} onCopied={(hex) => setToast({ type: "success", message: `${hex} copied.` })} />

      <main ref={resultsRef} className="mx-auto max-w-5xl scroll-mt-20 px-5 py-14">
        {loading && (
          <div className="grid animate-pulse gap-5 lg:grid-cols-3" aria-live="polite">
            <div className="space-y-5 lg:col-span-2"><div className="h-48 rounded-[28px] bg-fog" /><div className="h-64 rounded-[28px] bg-fog" /></div>
            <div className="space-y-5"><div className="h-56 rounded-[28px] bg-fog" /><div className="h-40 rounded-[28px] bg-fog" /></div>
          </div>
        )}

        {!loading && scaled && (
          <div className="rise grid items-start gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <DishHeader result={scaled} />
              <NutritionCard nutrition={scaled.nutrition} healthScore={scaled.health_score} healthNotes={scaled.health_notes} />
              <ItemsTable items={scaled.items} />
            </div>
            <div className="space-y-5 lg:sticky lg:top-20">
              <PortionBadge portion={scaled.portion_estimation} />
              <PortionAdjuster factor={factor} onChange={setFactor} />
              <button onClick={handleLog} disabled={logged} className="btn-dark w-full">
                <Plus size={18} /> {logged ? "Added to log" : "Add to log"}
              </button>
              <p className="px-2 text-xs leading-relaxed text-mute">
                Estimates come from a photo and can be off by 20% or more. Use them as a guide, not medical advice.
              </p>
            </div>
          </div>
        )}

        <div className={scaled || loading ? "mt-14" : ""}>
          <MealLog entries={log} goal={goal} onGoalChange={setGoal} onDelete={(id) => setLog((p) => p.filter((e) => e.id !== id))} onClear={() => setLog([])} />
        </div>
      </main>

      <footer className="border-t border-line/60 py-8 text-center text-xs text-mute">NutriLens estimates nutrition from photos using Google Gemini.</footer>
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
