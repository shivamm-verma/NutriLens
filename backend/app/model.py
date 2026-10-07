"""Gemini-powered food analysis for NutriLens."""
import io
import json
import logging
import os
import re
import time
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import errors as genai_errors
from google.genai import types
from PIL import Image, ImageOps

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

logger = logging.getLogger("nutrilens")

# Preferred model (optional). If it is missing for your key (404), NutriLens automatically
# falls back to the best Flash model your key can actually use.
MODEL_NAME = (os.getenv("GEMINI_MODEL") or "").strip() or "gemini-3.8-flash"
FALLBACK_MODELS = [
    "gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash",
    "gemini-flash-latest", "gemini-2.5-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash-lite",
]
_SKIP = re.compile(r"image|tts|audio|live|embed|robotics|computer-use|imagen|veo|gemma|learnlm|aqa", re.I)
_active_model = None  # cached once a model has worked
MAX_SIDE = 1600  # px; keeps uploads fast without hurting recognition
MAX_RETRIES = 2

SYSTEM_PROMPT = """You are NutriLens, an expert dietitian and food-photo analyst with deep knowledge of Indian (regional and pan-Indian), South Asian and international cuisines.

Analyse the food photo and respond with RAW JSON ONLY. No markdown, no code fences, no commentary before or after.

TASKS
1. Identify the dish. Use the most specific common name (e.g. "Rajma Chawal", "Masala Dosa with Sambar", "Chicken Biryani"). Give an honest confidence score from 0 to 100.
2. Estimate the portion using visual cues: plate/bowl/katori/thali size, food height and spread, texture, density, visible oil/ghee/gravy, garnishes, cutlery or hands for scale. Estimate the COOKED, as-served weight of everything visible, in grams.
3. Compute nutrition for that whole visible portion (NOT per 100 g). Include cooking oil, ghee, butter, sugar and sauces you can reasonably infer. Use realistic reference values (for example: 1 plain roti ~ 30-40 g / ~100 kcal, 1 katori cooked dal ~ 150 g, 1 cup cooked rice ~ 150-180 g).
4. Break the meal into its visible components. The item weights should add up to the total weight and item calories to the total calories (small rounding is fine).
5. If the image contains no food or drink, return {"is_food": false} and nothing else.

REQUIRED JSON STRUCTURE (all numbers are plain numbers, never strings)
{
  "is_food": true,
  "label": "Dish Name",
  "cuisine": "North Indian",
  "confidence": 95,
  "description": "Visual analysis of dish items and toppings",
  "alternatives": ["Other plausible dish 1", "Other plausible dish 2"],
  "tags": ["high-protein", "fried", "vegetarian"],
  "items": [
    {"name": "Component name", "grams": 150, "calories": 180}
  ],
  "portion_estimation": {
    "estimated_weight_grams": 300,
    "portion_size": "1 medium plate (~1.5 servings)",
    "visual_reasoning": "Reasoning based on plate dimensions, item thickness, and visual volume."
  },
  "nutrition": {
    "calories": 350,
    "carbs": 40,
    "protein": 12,
    "fat": 15,
    "fiber": 5
  },
  "health_score": 7,
  "health_notes": "One or two short sentences on how balanced this meal is and one practical tweak."
}

RULES
- carbs, protein, fat, fiber are in grams; calories in kcal.
- health_score is an integer from 1 (very indulgent) to 10 (very balanced).
- alternatives has at most 3 entries and may be empty. tags has at most 5 short lowercase entries.
- The user may add a hint (e.g. "homemade", "2 rotis"). Treat it as helpful context, but trust what is visible.
- Output must parse with json.loads(). Nothing else."""


class NutriLensError(Exception):
    """An error that maps cleanly to an HTTP status code."""

    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


_client = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        key = (os.getenv("GEMINI_API_KEY") or "").strip()
        if not key or key.startswith("your_"):
            raise NutriLensError(
                "GEMINI_API_KEY is not set. Add your key to backend/.env and restart the server.",
                500,
            )
        _client = genai.Client(api_key=key, http_options=types.HttpOptions(timeout=60000))
    return _client


def api_key_configured() -> bool:
    key = (os.getenv("GEMINI_API_KEY") or "").strip()
    return bool(key) and not key.startswith("your_")


def _version_key(name: str):
    m = re.search(r"gemini-(\d+(?:\.\d+)?)", name)
    return float(m.group(1)) if m else 0.0


def _candidate_models(client) -> list:
    """Ordered list of models to try: cached -> configured -> known list -> discovered."""
    order = []
    for name in [_active_model, MODEL_NAME, *FALLBACK_MODELS]:
        if name and name not in order:
            order.append(name)
    return order


def _discover_models(client, exclude) -> list:
    """Ask the API which models this key can use; prefer the newest non-lite Flash."""
    found = []
    try:
        for m in client.models.list():
            name = (getattr(m, "name", "") or "").replace("models/", "")
            actions = getattr(m, "supported_actions", None) or []
            if "flash" not in name or _SKIP.search(name) or name in exclude:
                continue
            if actions and "generateContent" not in actions:
                continue
            found.append(name)
    except Exception as exc:
        logger.warning("Model discovery failed: %s", exc)
    return sorted(found, key=lambda n: (("lite" not in n), "preview" not in n, _version_key(n)), reverse=True)


def prepare_image(image_bytes: bytes) -> bytes:
    """Validate, orient, flatten and downscale the image; return JPEG bytes."""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.load()
        img = ImageOps.exif_transpose(img)
    except Exception:
        raise NutriLensError("The uploaded file is not a valid image.", 400)

    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGBA")
        background = Image.new("RGB", img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[-1])
        img = background
    elif img.mode != "RGB":
        img = img.convert("RGB")

    img.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def _extract_json(text: str) -> dict:
    """Parse JSON safely, tolerating stray code fences or surrounding text."""
    if not text:
        raise ValueError("empty response")
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start, end = cleaned.find("{"), cleaned.rfind("}")
        if start == -1 or end <= start:
            raise
        return json.loads(cleaned[start : end + 1])


def _num(value, default: float = 0.0) -> float:
    if isinstance(value, bool):
        return default
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        match = re.search(r"-?\d+(?:\.\d+)?", value.replace(",", ""))
        if match:
            return float(match.group())
    return default


def _round(value: float) -> float:
    return round(value, 1)


def _normalize(data: dict) -> dict:
    if not isinstance(data, dict):
        raise NutriLensError("The AI returned an unexpected response. Please try again.", 502)

    if data.get("is_food") is False:
        raise NutriLensError(
            "No food detected in this photo. Try a clearer, well-lit picture of your meal.", 422
        )

    portion = data.get("portion_estimation") or {}
    nutrition = data.get("nutrition") or {}

    weight = _num(portion.get("estimated_weight_grams"))
    result = {
        "label": str(data.get("label") or "Unknown dish").strip(),
        "cuisine": str(data.get("cuisine") or "").strip(),
        "confidence": int(max(0, min(100, round(_num(data.get("confidence"), 0))))),
        "description": str(data.get("description") or "").strip(),
        "alternatives": [str(a).strip() for a in (data.get("alternatives") or []) if str(a).strip()][:3],
        "tags": [str(t).strip().lower() for t in (data.get("tags") or []) if str(t).strip()][:5],
        "items": [],
        "portion_estimation": {
            "estimated_weight_grams": _round(weight),
            "portion_size": str(portion.get("portion_size") or "1 serving").strip(),
            "visual_reasoning": str(portion.get("visual_reasoning") or "").strip(),
        },
        "nutrition": {
            "calories": _round(_num(nutrition.get("calories"))),
            "carbs": _round(_num(nutrition.get("carbs"))),
            "protein": _round(_num(nutrition.get("protein"))),
            "fat": _round(_num(nutrition.get("fat"))),
            "fiber": _round(_num(nutrition.get("fiber"))),
        },
        "health_score": None,
        "health_notes": str(data.get("health_notes") or "").strip(),
    }

    for item in data.get("items") or []:
        if isinstance(item, dict) and item.get("name"):
            result["items"].append(
                {
                    "name": str(item["name"]).strip(),
                    "grams": _round(_num(item.get("grams"))),
                    "calories": _round(_num(item.get("calories"))),
                }
            )

    score = _num(data.get("health_score"), 0)
    if score:
        result["health_score"] = int(max(1, min(10, round(score))))

    n = result["nutrition"]
    if weight <= 0 and n["calories"] <= 0:
        raise NutriLensError("Couldn't estimate this meal. Please try another photo.", 502)
    if n["calories"] <= 0:  # derive from macros if the model skipped calories
        n["calories"] = _round(n["carbs"] * 4 + n["protein"] * 4 + n["fat"] * 9)

    return result


def _is_model_unavailable(exc) -> bool:
    code = getattr(exc, "code", None)
    msg = str(getattr(exc, "message", "") or exc).lower()
    return code == 404 or "not found" in msg or "no longer available" in msg or "not supported" in msg


def _generate(client, model, contents, config):
    response = client.models.generate_content(model=model, contents=contents, config=config)
    return _normalize(_extract_json(response.text or ""))


def analyze_food_image(image_bytes: bytes, hint: str = "") -> dict:
    """Send a food photo to Gemini and return structured nutrition JSON."""
    global _active_model
    client = _get_client()
    jpeg = prepare_image(image_bytes)

    prompt = "Analyse this food photo and return the JSON described in the system instructions."
    hint = (hint or "").strip()[:300]
    if hint:
        prompt += f"\nUser hint: {hint}"

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        response_mime_type="application/json",
        max_output_tokens=8192,
        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
    )
    contents = [types.Part.from_bytes(data=jpeg, mime_type="image/jpeg"), prompt]

    queue = _candidate_models(client)
    tried, discovered, last_error = [], False, None
    transient_budget = MAX_RETRIES
    overload_passes = 1  # one extra sweep over all models if everything is busy

    while queue:
        model = queue.pop(0)
        tried.append(model)
        try:
            result = _generate(client, model, contents, config)
            if _active_model != model:
                logger.info("Using Gemini model: %s", model)
            _active_model = model
            return result
        except NutriLensError:
            raise
        except (json.JSONDecodeError, ValueError) as exc:
            logger.warning("JSON parse failed on %s: %s", model, exc)
            last_error = NutriLensError("The AI returned an unreadable answer. Please try again.", 502)
            if transient_budget > 0:
                transient_budget -= 1
                queue.insert(0, model)
        except genai_errors.APIError as exc:
            code = getattr(exc, "code", None) or 500
            msg = str(getattr(exc, "message", "") or exc)
            logger.warning("Gemini error %s on %s: %s", code, model, msg[:300])
            if _is_model_unavailable(exc):
                last_error = NutriLensError(
                    f"No usable Gemini model found for this API key (tried: {', '.join(tried)}).", 502
                )
                if not queue and not discovered:
                    discovered = True
                    queue.extend(_discover_models(client, set(tried)))
                continue
            if code in (401, 403) or (code == 400 and "api key" in msg.lower()):
                raise NutriLensError("Gemini rejected the API key. Check GEMINI_API_KEY in backend/.env.", 401)
            if code == 429:
                raise NutriLensError("Gemini rate limit reached. Wait a minute and try again.", 429)
            if code in (500, 502, 503, 504):
                # Overloaded model: don't hammer it, move straight to the next one.
                last_error = NutriLensError("Gemini is busy right now. Please try again in a minute.", 503)
                if not queue and overload_passes > 0:
                    overload_passes -= 1
                    time.sleep(2)
                    queue.extend(m for m in tried if m not in queue)
                    tried = []
                continue
            raise NutriLensError(f"Gemini request failed ({code}): {msg[:160]}", 502)
        except Exception as exc:  # network, timeouts, etc.
            logger.exception("Unexpected analysis failure")
            last_error = NutriLensError(f"Could not reach Gemini: {exc}", 502)
            if transient_budget > 0:
                transient_budget -= 1
                time.sleep(1.5)
                queue.insert(0, model)

    raise last_error or NutriLensError("Analysis failed. Please try again.", 502)
